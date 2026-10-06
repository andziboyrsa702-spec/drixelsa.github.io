# Drixel payments: bank transfer and Yoco

This checkout uses the Cloudflare Worker, Firebase Spark and a hosted Yoco checkout. No Firebase Blaze deployment is needed. Yoco charges its applicable transaction fees on real payments; check your merchant plan. The implementation supports South African ZAR card orders. Other markets can use bank transfer once receiving-account details and any international transfer arrangements are confirmed by the store.

## 1. Update the code and deploy the backend

In the project folder, finish any existing merge first; never reset local work to get this update. Then:

```powershell
git pull --no-rebase --no-edit origin react-v3-migration
npm install
npm --prefix worker install
npm --prefix worker run deploy
```

Keep `.env.local` with exactly one `VITE_API_BASE_URL=https://drixel-api.drixelsa.workers.dev` and `VITE_USE_FIREBASE_EMULATORS=false`. Restart `npm run dev`. For the public website, set the GitHub Actions repository variable `VITE_API_BASE_URL` to that Worker URL and run the React deployment workflow. A backend deployment does not rebuild the storefront.

## 2. Bank transfers

Open Admin > Store settings. Fill in Bank name, Account holder, Account number, Branch code and Account type. Check these against your bank statement. Enable bank transfer and save.

Checkout displays those public receiving-account details. A created order stores a copy so changing future instructions does not change existing orders. The order confirmation, customer order page and receipt show the reference and the ZAR amount owed. International customers see the ZAR settlement amount as well as their display-currency total; confirm that your bank can receive their transfer before accepting international orders. No international account or SWIFT instructions are supplied by this implementation.

Place a small controlled order. Verify that it appears in Admin > Orders and that stock was reserved once. Only use **Mark manual payment paid** after checking that cleared funds reached your account; a screenshot of a payment instruction is not confirmation of funds. Dispatch is blocked until payment is verified. Unpaid bank orders can be cancelled to restore stock once.

## 3. Yoco test setup

Activate your Yoco merchant profile. In Yoco's e-Commerce integrations > Checkout API, add the real storefront domain to Verified Domains. Use a TEST secret key while live access is being reviewed. Do not paste private keys into chat, commit them, or put them in a frontend VITE variable.

After deploying the new Worker, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\worker\setup-yoco-test.ps1
npm --prefix worker run deploy
```

The script prompts for the test secret with hidden input, registers the test webhook (or reuses the encrypted signing secret saved for this Windows user), saves both keys as Worker secrets, and enables **test mode** in `worker/wrangler.jsonc`. It never enables real payments. Yoco only returns a new webhook's signing secret once. The script saves the webhook signing secret encrypted with Windows account protection under `%LOCALAPPDATA%\Drixel`, outside the repository, so a failed upload can be retried. If that local saved secret is unavailable, enter your securely saved signing secret or remove that particular unused webhook in Yoco before registering again. Do not repeatedly register duplicate webhooks.

Sign in with your verified administrator account and refresh checkout; test cards are restricted to administrators. Select **Card payment · TEST MODE**. Use Yoco's documented test card details. Complete payment, wait for the signed webhook, and confirm the same order reads `test_paid` / `payment_test`, with no dispatch action. A success redirect alone never marks an order paid. Repeat cancellation and failed-payment tests: the bag must stay saved, the existing checkout can be reopened from the customer order page, and another attempt must not reserve stock twice. Never use a real card to test.

`GET /api/health` reports whether cards have sufficient configuration. `GET /api/payments/config` reports available choices without private keys. Configuration presence does not prove the credentials work. Check Worker logs and Yoco webhook delivery if confirmation stays pending.

## 4. Live activation, after testing

Confirm your merchant account, receiving bank account and storefront domain are approved by Yoco. Add the LIVE secret key through `npx wrangler secret put YOCO_SECRET_KEY` inside `worker`. Register a LIVE webhook at `https://drixel-api.drixelsa.workers.dev/api/payments/yoco/webhook` with the live key using Yoco's API; save its signing secret using `npx wrangler secret put YOCO_WEBHOOK_SECRET`. Do not use the test setup script for live keys.

In `worker/wrangler.jsonc`, set `YOCO_MODE` to `live` and `CARD_PAYMENTS_ENABLED` to `true`, then deploy. Both the key prefix and webhook must belong to the intended mode. Test and live webhook secrets differ; finish pending test sessions before switching. Perform one controlled real transaction, check the signed webhook, exact amount/currency, order payment status and Yoco merchant record before opening card checkout to customers. Changing the deployed Worker mode does not change old test orders into real orders.

## Operational limits

Card refunds, disputes and automatic reservation expiration are not implemented here. Reconcile them through Yoco. Pending card stock stays reserved because a checkout may still complete; the admin cannot release it through the generic unpaid cancellation button. Do not manually mark a card order paid or create a replacement payment while its result is uncertain. If payment arrives after stock was restored, the order becomes `payment_review` and must not dispatch. Orders with unconfirmed provider setup keep their original attempt and reservation for safe retry. The customer order page can resume the same card order without reserving stock again. An existing checkout cannot be resumed under a different test/live mode. Order receipts share the existing free email allowance; actual delivery must be checked in Resend.

## Primary references

- https://developer.yoco.com/guides/online-payments/accepting-a-payment
- https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
- https://developer.yoco.com/api-reference/checkout-api/webhooks/register-webhook
- https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events
- https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification
