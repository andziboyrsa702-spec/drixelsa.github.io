# Yoco checkout configuration

Drixel's Yoco integration is server-side. Never commit a Yoco secret key to this repository or expose it through Vite/React environment variables.

## Required server configuration

Set these only in the deployed Firebase Functions environment / secret manager:

- YOCO_SECRET_KEY — use the Yoco test secret while testing; replace with the live secret only after Yoco enables the verified live domain.
- PUBLIC_APP_URL — canonical HTTPS storefront origin, for example the production Drixel domain.

The React application does not require the Yoco secret key. The backend creates the hosted checkout and returns only the redirect URL.

## Test flow

1. Sign in as a customer.
2. Add an in-stock product.
3. Complete a South African checkout.
4. Drixel creates a pending order and reserves inventory.
5. The backend creates the Yoco checkout in ZAR.
6. The browser redirects to Yoco.
7. On return, Drixel asks the backend to verify the checkout directly with Yoco.
8. Only a provider-confirmed successful status marks the order paid.

Do not fulfil an order merely because the browser reached the success URL.

## Before live launch

Configure the live secret outside GitHub, verify the production domain in Yoco, register and verify Yoco webhooks, test successful/failed/cancelled payments, test idempotency, and test refund/cancellation inventory behaviour.
