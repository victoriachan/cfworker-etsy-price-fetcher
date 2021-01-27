# Etsy Price Fetcher Cloudflare Workers script

A simple [Cloudflare Workers](https://developers.cloudflare.com/workers/) script that augments Etsy product links on a webpage by adding price and quantity information to the link's title attribute.

The script finds all the `<a>` tags on the page with `class='etsy'` that links to an Etsy product, and adds `title` attribute to them with the product's Etsy price and quantity (fetched from Etsy API).

Example anchor link: `<a class="etsy external" href="https://www.etsy.com/uk/listing/826425463/puteh-original-drypoint-etching-print?ref=shop_home_active_1"></a>`

If the product is not found on Etsy API, then it is assumed that the product link is outdated, and will be removed from the page.

## To use:

- Define `ETSY_PRICES` Cloudflare Workers KV, and add bindings to the CF Worker.
- Register with [Etsy API](https://www.etsy.com/developers/register) and set the API key as `ETSYAPIKEY` env var for the CF Worker.
- Enable the Worker script in your Cloudflare zone.


## To develop:

- Deploy using [Wrangler cli](https://developers.cloudflare.com/workers/cli-wrangler) or Cloudflare Workers dashboard or [Github Action](https://developers.cloudflare.com/workers/platform/deploy-button)
