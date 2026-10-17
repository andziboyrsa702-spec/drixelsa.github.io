# Product emails and shopping reminders

Order receipt and update emails include product images, names, selected colour/size/SKU, quantities, prices, delivery, discount (when present) and total, taken from the stored order snapshot. Pending-payment messages stay clearly distinguished from confirmed payment.

## Customer controls

- On Bag and Wishlist pages, a signed-in customer with a verified email can separately opt in to each reminder. Neither option is preselected. An email-verification button is available where needed.
- Bag reminders become eligible after 24 hours; wishlists after seven days. At most one shopping reminder per customer is attempted in a seven-day period, with one reminder per unchanged selection. The existing five-minute Worker schedule handles eligible selections one at a time; delays can occur when the queue or allowance is full.
- Removing saved items clears the reminder. Creating an order cancels its bag reminder in the checkout transaction. The sender also checks matching paid or pending orders, current stock, active products and market availability.
- Each email has a stop link and a one-click unsubscribe header. GET displays the form without changing consent; POST disables both reminder types. Existing newsletter opt-outs and bounce/complaint suppression also block reminders.
- The email links to the bag/wishlist recovery screen. Sign in to the same account and explicitly restore the saved selection. Restoration replaces that device's current list. A new account on a shared device cannot silently adopt another account's reminder selections.
- Up to 20 items can be saved per reminder list. Anonymous shoppers and unverified email accounts receive no reminders. Prices are shown in ZAR in reminder emails and recalculated at checkout.

## Operations

Deploy the updated frontend and Worker. No new secrets, Firestore rules, indexes or paid services are required; reminder collections remain server-only under the existing deny-by-default rules.

```powershell
git pull --no-rebase --no-edit origin react-v3-migration
npm --prefix worker ci --no-audit --no-fund
npm --prefix worker run deploy
```

Service Health includes the shopping reminder queue. Records in `shopping_reminders` with `status: needs_review` require provider-log review; uncertain sends are not retried automatically. Provider idempotency keys protect repeated attempts. Quota deferrals are safe to retry. Reminders stop at the shared 80/day or 2,400/month usage level, leaving some of the existing 100/day and 3,000/month allowance for other messages; this is not a guarantee of email delivery.

Saved snapshots contain product IDs/options and are tied to authenticated account IDs. Emails are never taken from client request bodies. Opt-out clears saved item snapshots; no browser code can directly read other customers' reminder records or unsubscribe tokens. Reminder consent does not enrol anyone in the newsletter.

Development tests use fake customers, mocked APIs and a mocked email sender. They do not send real reminders, charge cards or change live customer records. Real inbox delivery and the deployed schedule must be checked after deployment with an account that opts in.
