# Fit and community rollout

Routes: `/za/size-guide`, `/za/community`, `/za/feedback`, `/za/customize` (also available under each supported market prefix).

After pulling this change, deploy the new client access rules:

```powershell
npx firebase deploy --only firestore:rules --project drixel-sa
```

Use Admin > Products > Product size guide to enter actual flat garment dimensions in centimetres and supplier-confirmed regional labels. Only Drixel product measurements are published. No external brand charts or competitor sizing links are displayed. Do not invent garment measurements or country conversions.

Admin > Reviews & Feedback contains submitted reviews and private customer concerns. Reviews start pending, require moderation and do not claim verified purchase. Moderate negative and positive reviews consistently; retain genuine criticism. Changing a feedback status does not email the customer. Follow up using the customer account contact details.

Community account creation and marketing-list consent remain separate. The community page uses the existing subscription endpoint; this change does not resolve email provider or campaign queue issues.

Custom Studio is an interactive, rotating front/back concept preview, with garment and logo colour controls. Fabric and logo artwork remain fixed. It is not a volumetric garment simulator and cannot place an order. Future accessories are labelled unavailable.

Verification: `node tests/community-fit-browser.cjs` against a running Vite server tests mobile/desktop page widths, unit conversion, colour/rotation controls, pending review saves, private feedback saves and admin measurement editing with mocked Firebase. `npm run test:rules` checks real emulator access rules, including private feedback and prevention of self-published reviews; Java 21 is required. The branch workflow runs both.
