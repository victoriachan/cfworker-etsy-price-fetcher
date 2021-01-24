// A CF Worker that works as a middleman and replaces Etsy link elements
// in the response with info about the listing's price and stock count.
// Based on https://developers.cloudflare.com/workers/tutorials/localize-a-website

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

class EtsyLinkHandler {
  async element(element) {
    // Eg. https://www.etsy.com/uk/listing/826425463/puteh-original-drypoint-etching-print?ref=shop_home_active_1
    const etsyListingURL = element.getAttribute('href')
    if (etsyListingURL) {
      // Match /listing/<number>
      const match = etsyListingURL.match(/\/listing\/(\d+)\//)

      if (match) {
        const etsyListingID = match[1]
        // ETSY_PRICES is our KV namespace
        let etsyFound = await ETSY_PRICES.get(etsyListingID)

        // Fetch data from Etsy if we haven't looked up this product yet
        if (etsyFound === null) {
          // ETSYAPIKEY is set in wrangler secret
          const etsyAPIUrl = `https://openapi.etsy.com/v2/listings/${etsyListingID}?api_key=${ETSYAPIKEY}`

          try {
            const response = await fetch(etsyAPIUrl)
            const data = await response.json()
            const language_code = data.results[0].language // "en-US"
            const currency_code = data.results[0].currency_code // "GBP"
            console.log('Get from Etsy: ' + etsyListingID)

            etsyFound = {
              // Format to add £
              price: new Intl.NumberFormat(language_code, {
                style: 'currency',
                currency: currency_code,
              })
                .format(data.results[0].price)
                // Format to remove .00
                .replace(/\.00/g, ''),
              quantity: data.results[0].quantity,
            }
          } catch (err) {
            // If we can't find it on Etsy (perhaps product removed),
            // add this to KV so we don't keep asking Etsy for it.
            etsyFound = {}
          }
          // Store in KV for 18000 seconds (5hrs)
          await ETSY_PRICES.put(etsyListingID, JSON.stringify(etsyFound), {
            expirationTtl: 18000,
          })
        } else {
          console.log('Get from KV: ' + etsyListingID + ' => ' + etsyFound)
          etsyFound = JSON.parse(etsyFound)
        }

        // Only show prices if product can be found on API
        if (etsyFound.price) {
          const priceText = `From ${etsyFound.price}.`

          if (etsyFound.quantity > 0) {
            element.setAttribute(
              'title',
              `${priceText} Only ${etsyFound.quantity} left.`,
            )
            element.setAttribute('alt', 'Buy this on Etsy')
          } else {
            element.setAttribute('title', `${priceText} Sold Out.`)
            element.setAttribute('alt', 'View this on Etsy')
          }
        }
        // If not found on Etsy, perhaps this link is outdated. Just remove the link.
        else {
          element.remove()
        }
      }
    }
  }
}

async function handleRequest(event) {
  const request = event.request
  const cache = caches.default

  // Get page from CF cache
  let response = await cache.match(request)

  // If not in cache, fetch from server.
  if (!response) {
    response = await fetch(request)

    // Make sure we only modify text, not images.
    let type = response.headers.get('Content-Type') || ''
    if (type.startsWith('text/html')) {
      response = new HTMLRewriter()
        // Find the <a> tags on the page that has the class="etsy"
        .on('a[class^="etsy"]', new EtsyLinkHandler())
        .transform(response)
      // Put our modified response in the cache
      event.waitUntil(cache.put(request, response.clone()))
      console.log('Updated cache.')
    }
  }

  return response
}
