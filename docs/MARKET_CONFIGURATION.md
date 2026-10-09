# Drixel market configuration

React V3 uses ISO-style two-letter market paths such as `/za`, `/us`, `/ng`, `/bw` and `/gb`.

## Pricing
ZAR is the accounting/base currency. International display prices require a verified server-side FX value. Configure Cloud Functions environment values using:
- `FX_ZAR_USD`
- `FX_ZAR_NGN`
- `FX_ZAR_BWP`
- `FX_ZAR_GBP`
- `FX_ZAR_EUR`

If a required rate is absent, the storefront does not invent a conversion and checkout is unavailable for that currency.

## Delivery markets
Delivery eligibility and ZAR shipping charges are controlled by `SHIPPING_MARKETS` in `functions/index.js`. A market must be explicitly enabled before the backend will quote or create an order.

Current migration defaults intentionally enable South Africa and Botswana only. The other market URLs can exist for browsing/testing but checkout remains closed until a real shipping service/rate is configured.

## Product availability
Products may optionally contain:
`availableMarkets: ["za","bw"]`

When the field is absent or empty, the product is treated as globally visible. When populated, both the React catalogue and trusted checkout enforce the list.

## Order accounting
Orders retain:
- base totals in ZAR
- market code
- display currency
- exchange-rate snapshot
- converted display totals
- shipping country/country code

This preserves the customer-facing amount while keeping a stable accounting base.
