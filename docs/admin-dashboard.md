# Drixel store management

Open `/za/admin/dashboard` after signing in. The country prefix remains in admin navigation and login redirects. Access follows the existing Firestore and Functions policy: a Firebase admin claim, the admin role claim, or one of the existing verified owner accounts. A profile document cannot grant administrator access.

## Dashboard and operations

The overview displays paid revenue in base ZAR, recent orders, pending payments, stock risk and fulfilment work. Orders and payments have search and status filters. Tables keep horizontal scrolling inside the table at small screen widths; the complete admin navigation is available from Menu.

The product editor supports prices, public image URLs, markets, size/colour/SKU variants and stock. It protects unsaved edits, rejects invalid stock and prices, and checks stock again in a Firestore transaction before saving. Reopen a product if its stock changed during editing. Use Inventory for audited quantity adjustments and supply a reason.

Order details show the customer, delivery address, items and totals. Only supported manual-payment methods can be marked paid. Online payment verification stays with the payment provider. Paid orders move through processing, packing, shipping and delivery. The Functions endpoint validates every action.

Settings editors load once so background updates cannot replace fields being edited. Failed reads and writes are visible rather than appearing to be successful or empty.

## Marketing

Save draft updates the currently opened draft; loading a sent campaign makes a new copy. The email preview uses a sandboxed frame, public absolute image URLs and responsive typography. Sending requires an explicit confirmation in the application. Counts mean accepted by the email provider, not verified delivery.

The updated `sendCampaign` Function binds the existing `RESEND_API_KEY` secret, claims campaign records in a transaction to prevent concurrent duplicate sends, and treats SDK errors as failures. If sending ends unexpectedly, the record is marked `delivery_unknown`; inspect provider logs before resending. The production Function must be deployed for these server safeguards to apply:

```sh
npx firebase deploy --only functions:sendCampaign --project drixel-sa
```

No campaigns are sent by the automated checks.

## Local testing with Firebase emulators

Vite forwards `/api` requests to Functions on port 5001. For an isolated local store, create `.env.local` in the repository root:

```dotenv
VITE_USE_FIREBASE_EMULATORS=true
```

Restart Vite after changing this file. This connects browser Authentication and Firestore to ports 9099 and 8080 in development only. Without this opt-in, browser Authentication and Firestore use deployed Firebase services. Avoid mixing production browser records with a local Functions database.

Start the emulators from the project root in a separate terminal:

```sh
npm --prefix functions install
npx firebase emulators:start --only "functions,firestore,auth" --project drixel-sa
```

Java 21 or later must be on PATH for the current Firestore emulator. Local users and store data are separate from production. Create an emulator account and give it an admin custom claim using the Admin SDK connected to the Auth emulator, or import an existing emulator dataset. Production credentials and secrets are not copied into the emulator by these changes.

## Validation

```sh
npm run build
npm run dev -- --host 127.0.0.1
```

With Vite running, use another terminal:

```sh
npm run test:admin
npm run test:layout
node --test tests/admin-campaign.cjs
```

Browser checks use isolated Firebase/API fixtures. They cover every admin route at 320, 390, 768, 1024, 1362 and 1440 pixels, plus navigation, product saves and failure states, stale inventory, unsaved changes, sequential inventory prompts, access denial and login return paths. Campaign checks simulate provider responses and concurrent requests without contacting an email provider.
