# Ozow One API — DRIXEL integration preparation

**Status: code preparation only; not enabled and not live.**

Use Ozow's current **One API Hosted Checkout**, not the deprecated Payments API.

## Server-side credentials (do not commit actual values)

- `OZOW_MODE=staging` or `live`
- `OZOW_CLIENT_ID`
- `OZOW_CLIENT_SECRET`
- `OZOW_SITE_CODE`
- `OZOW_WEBHOOK_SECRET`

These belong in Cloudflare Worker encrypted secrets. Credentials are not yet connected. The checkout option is deliberately hidden.

## Work required before enabling

1. Implement OAuth client-credentials token acquisition at `/v1/token`.
2. Create authenticated payment requests with `POST /v1/payments`; redirect only to the URL returned by Ozow.
3. Register and cryptographically verify Svix webhook signatures; reject replays and mismatched events.
4. Confirm successful provider transaction via server-side One API transaction queries and independently verify amount, currency, order reference, provider payment ID and merchant site.
5. Commit each successful payment idempotently in Firestore alongside a *single* paid-order email job.
6. Keep cart and pending orders unchanged on failed, cancelled or unverified payments; never dispatch or send purchase confirmations for them.
7. Test staging, including duplicate and spoofed webhooks, before enabling any live payments.

**Never trust the customer's return redirect as payment confirmation.**

Official integration guide: https://hub.ozow.com/integration-methods/apis/money-in/hosted-checkout/
