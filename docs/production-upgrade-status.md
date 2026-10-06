# Production recovery changes

## Implemented

- Checkout, payment verification, market detection, exchange rates and admin actions use the same `VITE_API_BASE_URL` contract as marketing. Development uses Vite's proxy; production defaults to Firebase Hosting.
- Commerce Functions now answer approved cross-origin requests and preflight requests. Authentication and server-side validation still apply.
- Checkout disables ordering until a valid quote exists, provides quote retry and preserves entered delivery fields while quoting. Failed saved-address reads show a message. Form data is captured before asynchronous token retrieval.
- Shop and Search show loading, retryable failures and honest empty states. Obsolete catalogue requests cannot overwrite a newer market.
- Saved carts reject malformed records and constrain quantities; blocked storage does not crash the cart.
- A built GitHub Pages 404 fallback restores direct React URLs through the entry page.
- Product/search imagery supports lazy loading and descriptive alternatives; Shop search has an accessible label.
- Updated storefront files are formatted for review. CI includes cart resilience and cross-origin handler tests.

## Local update

Finish any existing merge before pulling. Inspect `git status` and `git diff --name-only --diff-filter=U`; resolve each conflict before committing. Do not discard local source edits or reset the branch.

Then pull `react-v3-migration`, install dependencies and restart Vite. For isolated Firebase development, set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` and run Functions, Firestore and Auth emulators in another terminal. Java must be available in that terminal.

## Production rollout

The frontend workflow publishes Pages after checks. This does not deploy Functions. With Firebase project access, build and deploy Hosting and the changed Functions:

```powershell
npm install
npm --prefix functions install
npm run build
npx firebase deploy --only "hosting,functions:market,functions:exchangeRates,functions:checkoutQuote,functions:createOrder,functions:verifyYocoPayment,functions:adminInventoryAdjust,functions:adminOrderAction,functions:subscribeNewsletter,functions:unsubscribeNewsletter,functions:sendCampaign,functions:sendEmail,functions:newsletterPreferences,functions:orderNotifications" --project drixel-sa
```

Check deployed rules and indexes independently before testing production admin access. Verify signup, duplicate signup, unsubscribe and a test email to an address you control. Never send a campaign to the audience as a deployment smoke test. Confirm the sender domain and Firebase secret configuration using the marketing studio guide.

## Remaining work

Real inbox delivery, production order flow, deployed permissions and live API routing are not verified by fixture tests. Card payments remain unavailable in checkout pending provider setup and end-to-end verification. No production deployment or real emails were performed during this source change.

Campaign scheduling, segmentation, operational customer targeting, delivery/bounce/complaint webhooks, resumable campaigns above 5,000 recipients, managed email artwork hosting, comprehensive accessibility review, bundle reduction, monitoring and database backups remain separate work. These features are not implemented by this commit. Do not describe the store as production-verified until the deployed checks pass.
