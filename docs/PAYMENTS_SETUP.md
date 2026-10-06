# Drixel payments: bank transfer, Yoco and SnapScan

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

## 5. SnapScan merchant checkout

SnapScan is an additional **South African ZAR** payment choice. Customers receive an order-specific QR code and a payment link. The server generates the amount from the saved order, uses its unique Firestore order ID as the merchant reference, and enables strict payment mode. It never takes the amount from a browser request.

You need a SnapScan **merchant** account and merchant SnapCode; a personal app account alone is not merchant API access. Find the public SnapCode in your merchant QR link (`https://pos.snapscan.io/qr/YOUR_CODE`). Save just `YOUR_CODE` under Admin > Settings > Store > SnapScan merchant SnapCode. If you only have a static printed QR code, ask SnapScan merchant support for your merchant SnapCode and API access.

Request your **merchant API key** and **Webhook Authentication Key**, and ask SnapScan to configure this webhook:

`https://drixel-api.drixelsa.workers.dev/api/payments/snapscan/webhook`

Upload the private keys through hidden Wrangler prompts:

```powershell
powershell -ExecutionPolicy Bypass -File .\worker\setup-snapscan.ps1
npm --prefix worker run deploy
```

Do not put private SnapScan keys in Store Settings, a VITE variable, a screenshot or chat. The script does not register a webhook through an invented endpoint: SnapScan merchant support must configure it for the account. After they confirm the webhook is configured, enable SnapScan in Store Settings and save. Checkout hides SnapScan if its code, enable switch or backend secrets are missing. The presence of keys cannot confirm that the webhook has been activated.

If you request SnapScan's optional Secure QR Payload feature, store its separate merchant validation key with `npx wrangler secret put SNAPSCAN_QR_VALIDATION_KEY` inside `worker`, then deploy. The signing key is never sent to the frontend; only its signature is included in the QR URL. Without this optional feature, standard strict links are used and the backend still verifies the exact amount and reference independently.

Perform one controlled merchant payment before advertising this payment choice. SnapScan does not have a test mode implemented in this integration; merchant test arrangements must be confirmed with SnapScan, otherwise this is a **real payment**. Confirm that the amount, merchant, reference, order, signed webhook and merchant API record agree. The order should become `paid` once, with one payment receipt. Use **Check payment status** if webhook confirmation is delayed. The customer's bag stays saved until their pending order is confirmed. QR image failure offers a payment-link fallback; refreshing the order reuses the same reference.

Webhook form payloads are authenticated with their raw-body HMAC, then the payment is fetched again through the merchant API. Only completed payments with the matching saved SnapCode, order reference, ZAR amount and payment transaction type can mark the order paid. Duplicate notifications are recorded once. An extra payment or payment after stock was restored puts the order into `payment_review`, which blocks fulfilment. Manual payment marking and generic unpaid cancellation are blocked for SnapScan orders; reconcile outstanding payments through the merchant account before releasing stock. Automatic QR expiration, merchant refunds and dispute handling are not implemented.

Primary SnapScan documentation:

- https://developer.snapscan.co.za/docs/creating-a-url/
- https://developer.snapscan.co.za/docs/generating-qr-code/
- https://developer.snapscan.co.za/docs/authentication/
- https://developer.snapscan.co.za/docs/webhooks/
- https://developer.snapscan.co.za/docs/get-payment/
- https://developer.snapscan.co.za/docs/get-all-payments/
- https://developer.snapscan.co.za/docs/qr-secure-url-format/
