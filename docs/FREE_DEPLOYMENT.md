# Drixel: deploy without Firebase Blaze

This backend runs on Cloudflare Workers Free. Firebase Spark still provides Auth and Firestore. Cloudinary provides signed media uploads; Resend provides mail. The code alone does not deploy or configure provider secrets.

## 1. Get the branch in VS Code

Finish any existing Git merge first. Then, from the project directory:

```powershell
git status
git pull --no-rebase --no-edit origin react-v3-migration
npm install
npm --prefix worker ci
```

If Git reports conflicts, resolve those before proceeding. Do not discard local changes.

## 2. Firebase service account (no Blaze upgrade)

In Google Cloud Console, select **drixel-sa**, open **IAM & Admin → Service Accounts**, and create a dedicated `drixel-worker` service account. Grant **Cloud Datastore User** (`roles/datastore.user`) on this project. Do not grant Owner or Editor. Enable the Cloud Firestore API if it is disabled.

Under that service account's **Keys**, create a JSON key. Save it **outside this Git repository**, for example in your Downloads folder. This key gives server access to Firestore; never upload it to GitHub or send it in chat. The Worker checks Firebase user tokens separately before allowing admin operations.

Log in to Firebase CLI with an account that can administer drixel-sa, then deploy the Spark-compatible rules and campaign index:

```powershell
npx firebase login
npx firebase deploy --only "firestore:rules,firestore:indexes" --project drixel-sa
```

This free setup does not deploy Firebase Functions or Storage. The indexes file no longer enables paid TTL deletion. API rate-limit and quota records need occasional admin cleanup once expired; deleting quota keys for active campaigns can break quota deduplication.

## 3. Cloudinary signed upload preset

In Cloudinary product environment **mxuxx9kn**, open **Settings → Upload → Upload presets**, and create a preset named **drixel_signed**:

- Signing mode: **Signed**.
- Allowed formats: `jpg,jpeg,png,webp,mp4,webm`.
- Maximum file size: **100 MB** (images are limited to 10 MB in the app and by the free account).
- Do not enable unsigned uploading or automatic expensive transformations.

Under **API Keys**, find the API key and API secret. You will enter them in terminal prompts, not in React environment variables.

## 4. Resend API key

The verified sending domain is **sales.drixelsa.co.za**. The configured sender is `Drixel SA <hello@sales.drixelsa.co.za>`.

In Resend → API Keys, create a **Sending access** key scoped to this domain when available. Keep it private. Domain verification permits sending; it does not create a mailbox for replies. Configure a real reply mailbox separately if needed.

## 5. Upload secrets and deploy

Wrangler already has access to the Drixelsa account `89605ad9729e5860c860760bc8e3b743`.

From the repository root, create the Worker first (its API will report missing configuration until secrets are entered):

```powershell
npm --prefix worker run deploy
powershell -ExecutionPolicy Bypass -File .\worker\setup-secrets.ps1
```

Supply the private Firebase JSON path, then enter the Resend and Cloudinary credentials when Wrangler prompts. The script reads the Firebase JSON directly and passes it through stdin without printing it. If Wrangler asks to create `drixel-api`, accept.

Then:

```powershell
npm --prefix worker test
npm --prefix worker run check
npm --prefix worker run deploy
```

Wrangler prints a URL such as `https://drixel-api.YOUR-SUBDOMAIN.workers.dev`. Copy the exact URL; do not assume the Cloudflare email determines the subdomain.

Set that URL for unsubscribe links:

```powershell
cd worker
npx wrangler secret put PUBLIC_SITE_URL
```

At the prompt, enter the Worker URL without a trailing slash. This value is public; it uses the secret command to avoid editing configuration for each environment.

## 6. Delivery webhook

Resend → Webhooks → Add endpoint:

`https://YOUR-WORKER-URL/api/email-webhook`

Select `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`, and `email.failed`. Copy the signing secret beginning `whsec_`, then:

```powershell
npx wrangler secret put RESEND_WEBHOOK_SECRET
npm run deploy
cd ..
```

Enter the webhook secret at the hidden prompt. Delivery counts cannot be verified until the webhook is configured.

## 7. Connect local frontend and GitHub Pages

Create/update `.env.local` at the repository root:

```dotenv
VITE_API_BASE_URL=https://YOUR-WORKER-URL
VITE_USE_FIREBASE_EMULATORS=false
```

Restart Vite:

```powershell
npm run dev -- --force
```

For live API testing from localhost, explicitly enable localhost access:

```powershell
cd worker
npx wrangler secret put ALLOW_LOCAL_ORIGINS
```

Enter `true`. This flag only enables development origins; they do not change which Firebase database is used. Restart/deploy if needed. Remove the flag when no longer needed with `npx wrangler secret delete ALLOW_LOCAL_ORIGINS`.

In GitHub repository **Settings → Secrets and variables → Actions → Variables**, add **VITE_API_BASE_URL** with the same Worker URL. This is a public URL, not an API key. Re-run **React V3 Quality Gate** so GitHub Pages rebuilds with the URL.

## 8. Verify before opening the store

Open `/api/health` on the Worker URL. `firebase`, `email`, `media`, `webhook`, and `apiUrl` should all show true. This only checks that values exist, not that provider credentials work.

Then verify:

1. Newsletter signup appears in admin Subscribers; duplicate signup does not duplicate records.
2. Admin uploads a small front image and back image; product saves and storefront hover switches them.
3. Signed-in customer adds a real product, reloads the bag, and places a bank-transfer order. Confirm stock falls once and repeated checkout attempts do not duplicate orders.
4. Wait for the scheduled order receipt. Check mail_jobs and Resend logs if it is not received.
5. Send one campaign to a controlled test subscriber only. Confirm accepted status, actual delivery, webhook counts, and unsubscribe. Do not test against your customer list.
6. Cancel the test order through admin and confirm stock restores once.

Card/Yoco payments remain disabled until their separate setup is complete. Bank orders still need payment verification by admin. Non-ZAR markets require verified exchange rates and enabled shipping settings; the API returns unavailable instead of inventing prices.

## Free-plan constraints

The backend reserves at most **100 email recipients/day** and **3,000/month**, shared by order mail and campaigns. Resend usage from other apps on the same account also consumes that allowance, so these counters cannot guarantee the provider has remaining capacity. Reservations stay counted after uncertain sends to avoid exceeding limits. Campaigns pause for quota reset; provider errors retain diagnostics/reconciliation requirements.

Campaigns use one recipient per scheduled run and support up to 1,000 records in an audience query. Order receipts receive priority. Larger lists need an incremental audience worker before use. A free checkout request supports eight distinct product selections; quantities can be greater than one.

Cloudflare has a 100,000 requests/day free allowance and limited CPU/subrequests. Cloudinary's free credits are shared across storage, transformations and bandwidth. Keep images compressed and videos short; reaching a quota can interrupt service. No automatic paid upgrade is configured by this repository.

Firebase Spark still has its own Firestore quotas. Periodically check provider dashboards. Real deployed smoke tests are required; local tests cannot verify real credentials, DNS, inbox placement, or production free CPU limits.
