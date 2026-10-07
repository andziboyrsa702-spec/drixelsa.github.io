# Automatic international pricing

The Cloudflare Worker serves IP country detection from `request.cf.country` and automatic ZAR-to-selected-currency rates from Frankfurter v2. Frankfurter supplies daily reference rates from central banks and official sources, not transaction-specific bank rates. No API key or paid exchange-rate plan is needed.

The country/currency selector now has 36 markets (35 individual countries plus the shared euro market). The euro-country mapping adds 20 country codes. An explicit saved selection overrides IP detection. Unknown locations fall back to South Africa. VPNs can affect IP location. No raw IP address is stored by this feature. Admin/account/payment pages are not automatically relocated based on IP.

Rates are validated for the requested pair, positive finite value and an observation no more than seven days old, allowing weekends and public holidays. Requests time out, coalesce within an isolate and cache for one hour in memory and Cloudflare edge cache. Unavailable rates show explicitly labelled ZAR prices and a retry button; foreign values are never made up. Market changes cannot reuse another currency's old rate.

All active garments can be viewed in other display currencies. A product whose delivery markets exclude the selected country cannot be added from its product page. The existing server still validates stock, product markets, checkout enablement, shipping fees and ZAR totals. Browsing does not enable shipping worldwide. New delivery countries require administrator configuration. Payments remain charged in ZAR, with a clear checkout notice.

The Worker adapter also applies automatic rates to order display snapshots and extends its country configuration to the shared catalogue. Firebase-only deployments retain their legacy manual rate setup; this rollout targets the production Cloudflare backend.

Deploy from the project root after pulling:

```powershell
npm --prefix worker run deploy
```

GitHub Pages separately builds and publishes the frontend. Test `/api/market` and `/api/exchange-rates?base=ZAR&to=USD` on the deployed Worker, then switch the storefront between ZAR, USD and NGN. Provider calls could not be verified from the restricted development network; mock and bundled backend checks do not prove production connectivity.

Sources: https://frankfurter.dev/ and https://developers.cloudflare.com/workers/runtime-apis/request/
