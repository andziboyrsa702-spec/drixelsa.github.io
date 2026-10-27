# Payfast setup for Drixel

The code uses Payfast hosted checkout for South African ZAR orders. Existing payment methods remain available. Payfast is hidden until explicitly enabled and configured. Browser redirects never mark orders paid. The backend checks the signature, connecting IP against Payfast DNS, merchant, amount and Payfast server confirmation; duplicate notifications do not send extra receipts. Test payments cannot be dispatched. The bag remains until verified payment, and a changed bag is never cleared by an older order.

## Configure privately

Use Settings → Integrations in your Payfast dashboard to locate your Merchant ID and Merchant Key, and configure your security passphrase. Keep the passphrase out of chat, screenshots and Git. Use your own sandbox account first; its credentials and passphrase differ from live credentials.

From the repository root in PowerShell:

```powershell
git pull --no-rebase --no-edit origin react-v3-migration
npm --prefix worker ci
npx --prefix worker wrangler secret put PAYFAST_MERCHANT_ID --config worker/wrangler.jsonc
npx --prefix worker wrangler secret put PAYFAST_MERCHANT_KEY --config worker/wrangler.jsonc
npx --prefix worker wrangler secret put PAYFAST_PASSPHRASE --config worker/wrangler.jsonc
npx --prefix worker wrangler secret put PAYFAST_MODE --config worker/wrangler.jsonc
npx --prefix worker wrangler secret put PAYFAST_ENABLED --config worker/wrangler.jsonc
npm --prefix worker run deploy
npm run deploy:security
```

Each `secret put` prompts privately. For initial testing, enter `sandbox` for mode and `true` for enabled. Only authenticated administrators can see/use sandbox Payfast. Security-worker deployment is required so the browser can POST to Payfast. GitHub deploys the frontend separately after its checks pass.

Notification URL (sent automatically with each checkout):

`https://drixel-api.drixelsa.workers.dev/api/payments/payfast/webhook`

The integration supplies return/cancel URLs automatically. Cancellation returns to the order and does not release reserved stock automatically, because a payment may still complete.

## Verify before live use

1. Sign into Drixel as an administrator, create a small sandbox order and select Payfast.
2. Complete sandbox payment. Use “Check payment status” on the confirmation page if the notification is still pending. The order must show `test_paid`, never `paid`.
3. Confirm the notification succeeded in Payfast. If it failed, resolve configuration/network problems before accepting customers. Do not mark it paid manually.
4. Test cancellation and retry; the bag and same order must remain.
5. Replace the three credentials with the live account credentials, set `PAYFAST_MODE` to `live` and deploy the Worker again. Keep old sandbox orders separate; they cannot be paid in live mode.
6. Make a genuine low-value live purchase you control and verify notification, paid status, receipt and order total. This is not performed automatically by Codex.

To hide new Payfast checkouts, set `PAYFAST_ENABLED` to `false`. Keep the same mode and credentials in place so existing payment notifications can still settle. Do not switch merchant accounts or mode while real payments remain pending.

Documentation: https://developers.payfast.co.za/
