# Drixel administrator security

This change implements device passkeys using SimpleWebAuthn, server-side verification and signed Firebase session proof. It does not perform webcam face matching or store face photographs. Compatible devices offer Face ID, Windows Hello, fingerprints or a device PIN. The site requires user verification; the device chooses the method.

## Activate safely

From the repository root in Windows PowerShell, after pulling the working branch:

```powershell
powershell -ExecutionPolicy Bypass -File .\worker\setup-security.ps1
```

Firebase CLI must already be signed into an account with permission to deploy the drixel-sa rules. If it is not, run `npx firebase login` first. Wrangler must be signed into the Drixel Cloudflare account. The existing FIREBASE_SERVICE_ACCOUNT secret must contain the service-account private key for drixel-sa. Keep the current live payment configuration in your local Worker config.

The script deploys Firestore rules first, installs Worker dependencies, enables enrollment with ADMIN_PASSKEYS_ENABLED and deploys the Worker. Before that flag is enabled, the new frontend retains existing admin access for migration. Do not enable it before the rules are deployed. GitHub Pages deploys the frontend separately; wait for its successful job before enrolling.

Use https://drixelsa.co.za (not localhost or www) for passkey registration and verification. Sign out and sign in again immediately before first enrollment. The sign-in must be less than five minutes old. The first successful enrollment turns on mandatory passkey verification for all administrators, including administrators who have not enrolled yet. Only accounts already authorized as administrators can enroll.

Save the eight one-time recovery codes privately before continuing. They are shown once, hashed on the server, and never logged. A recovery code also requires a fresh successful account sign-in. Using a code invalidates previous administrator proof sessions. Do not paste codes into chat or put them in the repository.

## Enforcement

- Admin proof expires after 15 minutes and is bound to the current security-key version. Refreshing a Firebase token does not extend that proof.
- The dashboard signs out after 15 minutes without interaction. Password reset remains available during a password-sign-in pause.
- Registration and authentication challenges expire after five minutes, are bound to the account, original sign-in and canonical origin, and can be redeemed only once.
- Registered devices store credential public keys, counters and transports. They do not store biometric images or private keys.
- Server admin handlers, campaign actions and Cloudinary signatures require verified proof after enrollment is activated.
- Firestore rules apply the same proof requirement to direct admin reads and writes. Browsers cannot edit security policies, challenges or recovery hashes.
- Discount codes cannot be enumerated through public database reads, and the unused public contact write route is closed.
- Admin API actions have persistent per-account rate limits. Passkey/recovery endpoints have separate limits. API responses use no-store, nosniff, frame denial and restricted origin/method handling.
- Optional legacy Firebase Storage rules now require recent admin proof. If you use Firebase Storage, also deploy `npx firebase deploy --only storage --project drixel-sa`. Current studio uploads use Cloudinary instead.

## Password attempts: actual scope

The login screen pauses password attempts after three incorrect credentials for 15 minutes in that browser. It remembers the pause across reloads and does not count network failures. This is a usability control, not an account-wide lockout: browser storage can be cleared and Firebase's public authentication endpoint can be called directly. Firebase's provider protection remains necessary. Avoid permanent account-wide lockouts, which let attackers deny access to somebody else's account.

In Firebase Authentication settings, enable email enumeration protection and a password policy (at least 12 characters for new passwords; do not lock existing users out during rollout). Tighten Identity Toolkit sign-in quotas in Google Cloud. These console changes cannot be activated merely by committing frontend code. Apply API-key restrictions compatible with your Firebase services and allow only the actual production auth domains and any localhost domain still needed for development.

## Recovery and operations

There is no password-only button to bypass an enrolled admin passkey. Use one of the saved recovery codes from the device gate after signing in again. Keep a backup device/passkey where practical. The server supports up to five credentials, but a dedicated device management screen is not yet included. Support must not disable passkeys on an unverified email request. Last-resort recovery requires an operator with service-account access, identity verification and an audit record; no public reset endpoint exists.

Review Cloudflare logs for 403/429 errors and Firestore quotas. Security rate records use fixed documents per account/bucket. Challenge records should be cleaned by a trusted operator when expired; expired records cannot be redeemed even if retained. Do not log credential response bodies, ID/custom tokens, recovery codes or passwords.

This release does not claim a complete penetration test. GitHub Pages does not let this repository set arbitrary HTTP security headers for the storefront. The added HTTP headers protect the Worker API. A Cloudflare proxy/hosting migration is needed for a storefront HTTP CSP and frame-ancestors policy. Turnstile bot challenges and account-wide password-attempt enforcement are separate provider/server integration work, not silently enabled here.
