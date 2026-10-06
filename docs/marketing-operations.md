> For the current no-Blaze deployment, follow [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md). Firebase Functions/Storage deployment notes below describe the previous paid-provider option.

# Marketing operations and rollout

## Update the local copy

Work on `react-v3-migration`. If `git status` says a merge is unfinished, resolve the reported files and run `git add <resolved-files>` followed by `git commit --no-edit` first. Do not reset or discard source changes.

```powershell
git pull --no-rebase --no-edit origin react-v3-migration
npm install
npm --prefix functions install
npm run dev -- --force
```

The frontend development proxy expects Functions on port 5001. In a second terminal run `npx firebase emulators:start --only "functions,firestore,auth,storage" --project drixel-sa`. Use Java 21; after installation close and reopen VS Code so its terminal inherits the updated PATH. `VITE_USE_FIREBASE_EMULATORS=true` connects Firebase browser SDKs to the local emulators. Do not mix production SDK writes with local emulator API calls.

## Production setup

Deployment needs an authenticated Firebase account with project access, billing for scheduled Functions, and a verified Resend sender. These steps were not performed by the source update. Never put email-provider secrets in `VITE_*` variables or public Firestore settings.

```powershell
npx firebase functions:secrets:set RESEND_API_KEY --project drixel-sa
npx firebase functions:secrets:set RESEND_WEBHOOK_SECRET --project drixel-sa
npm run build
npx firebase deploy --only "hosting,firestore,storage,functions" --project drixel-sa
```

Review the Functions deployment plan before confirming deletions of any unrelated existing Functions. The deployment includes the queue endpoints, scheduled worker, signed email webhook, checkout reservation fixes, and existing API endpoints. Deploy rules and indexes before enabling the queue UI. Wait for the campaign_jobs status/dueAt index to become ready. Pages publishing only updates the frontend; it does not deploy this backend.

Register `https://drixel-sa.web.app/api/email-events` in Resend for `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`, and `email.failed`. Set its signing secret as `RESEND_WEBHOOK_SECRET`, then redeploy the webhook Function. The receiver verifies the raw body, signature and timestamp; duplicate events do not inflate totals. Bounced and complained addresses are suppressed from subsequent queued mail.

For managed artwork, first verify all nine files `/assets/campaigns/campaign-01.jpeg` through `campaign-09.jpeg` return image content on Firebase Hosting. Then set `VITE_EMAIL_ASSET_BASE_URL=https://drixel-sa.web.app` in the frontend build environment and rebuild/publish. Until verified, outgoing emails retain the pinned public GitHub image fallback. `VITE_SITE_URL` controls the canonical storefront origin; set it to the verified production domain. Preview hosts are noindex. Product sitemap generation from the live catalogue remains a deployment follow-up.

## Using campaigns

Marketing → Email campaigns provides advertisement templates; Marketing → Service updates provides outage, stock, delivery, payment and emergency notices. Edit factual details, dates and links; send a preview to an address you control before selecting the audience.

Audience filters include signup source, recorded market and purchase history. Unknown-market records are excluded when a specific market is selected. Updates can select affected order customers by order status. This option does not require newsletter opt-in and must only carry factual information about those orders; advertisement campaigns cannot use it. Marketing recipients are checked for current consent again at send time.

Scheduling uses SAST (UTC+2). Leave the send time blank to queue now. The worker runs every five minutes; schedules are earliest-send times, not guarantees of second-level delivery. A campaign supports up to 50,000 recipients in persisted batches of 100. Each worker invocation examines up to 100 due batches. The browser may be closed after successful queueing.

History distinguishes provider acceptance from inbox delivery. Cancel remaining send stops unsent work and cannot recall mail already accepted by the provider. A timeout or interrupted worker produces `delivery_unknown`; remaining batches pause. Review provider logs and use Reconcile batch with the batch index and evidence. Resume only when none were accepted, or provide all provider email IDs in recipient order when every submitted message was accepted. Mixed or uncertain outcomes must remain blocked for manual investigation. An explicit retry keeps the original idempotency key; if the recipient payload changed, provider conflict must be investigated rather than bypassed.

Operations → Service health shows the last completed worker run and campaigns awaiting reconciliation. A green worker status does not prove email delivery or payment readiness.

## Backups and alerts

Use a project administrator account to enable daily Firestore backups with 30-day retention:

```powershell
gcloud firestore backups schedules create --database="(default)" --recurrence=daily --retention=30d --project=drixel-sa
gcloud firestore backups schedules list --database="(default)" --project=drixel-sa
```

Backups have separate billing. Record a restore drill to a separate database before relying on them. Keep Firestore rules, indexes and deployment configuration in Git; backups do not replace configuration versioning. In Cloud Monitoring, configure notifications to an owner-selected channel for campaignWorker failures and sustained lack of scheduler executions. No notification recipient is assumed or configured by this change.

## Acceptance checks after deployment

1. Join the newsletter using a controlled address; verify one active record, source/market and duplicate handling. Unsubscribe and confirm the queued worker excludes it.
2. Send a preview, confirm sender authentication and the actual inbox rendering. Queue a small campaign only to controlled test addresses; verify accepted and delivered counts using the signed webhook. Confirm bounce suppression with a provider-supported test address.
3. Schedule a controlled campaign, confirm SAST conversion, cancel it, and verify no unsent batch runs. Check worker health and provider logs.
4. Use bank/manual checkout with a test product to verify trusted prices, single stock reservation, duplicate-request protection and cancellation restoration. Card checkout remains disabled pending provider setup and an end-to-end verification.
5. Test direct Pages/Hosting links, mobile layouts, administrator access and customer isolation using deployed rules. Do not send a production-audience campaign as a smoke test.

## Product and studio media

Products → Edit product now has separate Front view and Back view upload buttons. Front is the shop cover; back appears on pointer hover and keyboard focus. On touch devices both are available on the product page. Gallery images can also be uploaded. Blank variant-price overrides inherit the base product price. Products without variants have an explicit stock field.

Content → Media stores uploaded studio images and videos. Storefront editor has a hero video upload; Campaign Content and Campaign Studio have artwork uploads. Uploaded assets persist in Firebase Storage and metadata in the administrator-only media_assets collection. Uploads do not publish a product or message automatically: save/publish the editor afterward.

Enable Storage for drixel-sa in Firebase Console, confirm the configured bucket drixel-sa.firebasestorage.app, and deploy storage.rules and firestore.rules before uploading. Rules permit public reading of admin-media assets and restrict creation to administrators in their own path; images are limited to JPEG/PNG/WebP at 15 MB and MP4/WebM videos to 150 MB. Other Storage paths remain denied by this rules file; review any pre-existing paths before deployment. Local emulator mode also needs the Storage emulator on port 9199.

The live API routes returned 404 during the source check. Frontend publication cannot repair this. Deploy Functions and Firebase Hosting, then verify /api/market returns JSON. Set VITE_API_BASE_URL only to a verified deployed backend when running locally without emulators. Never silently redirect local checkout writes to production.
