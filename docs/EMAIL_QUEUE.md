# Email queue delay repair

From the project root after pulling react-v3-migration:

```powershell
powershell -ExecutionPolicy Bypass -File .\worker\setup-email-queue.ps1
```

The script changes only the five-minute cron to every minute in your local Worker config, preserving your live payment settings, installs dependencies and deploys. It does not change sender credentials or send a test message. Both order mail and campaigns now receive a turn; errors in either queue cannot skip the other queue. Each queue remains bounded and the existing daily/monthly free email allowance guard remains in place. A large campaign still takes multiple ticks; this change is not bulk instant delivery.

Check Resend > Emails for the expected recipient, subject, status and timestamp. Accepted by Resend is not confirmed inbox delivery; Delivered means the recipient server accepted it, and spam placement is still possible. Check sender-domain verification if rejected. Test emails use the direct send endpoint and do not wait for the campaign cron.

Campaign delivery_unknown and order needs_review records are not automatically resent. Inspect provider records first; reconcile uncertain campaign batches in Marketing with the provider IDs/evidence. Repeated clicks can otherwise create duplicates. If no record exists in Resend, inspect Cloudflare Worker logs and Firestore operations_health/campaignWorker and operations_health/orderMail.

The operator needs to confirm the live Resend sender domain, API key access, webhook configuration and actual delivery. Repository tests cannot confirm receipt in a private inbox.
