# Administrator authenticator login

The admin gate defaults to authenticator setup for an account without a TOTP enrolment. Each authorised account enrols independently. A new browser/device uses that account's existing authenticator entry and must supply a current code; it does not replace the account's secret. Ordinary customer accounts cannot enrol as administrators.

Use manual, time-based setup in an authenticator app. The private setup key appears only during an authenticated five-minute enrolment flow. A valid code is required before activation. Save the eight one-use recovery codes before continuing. Every verified admin session expires after 15 minutes; inactivity also signs the user out.

An existing passkey-protected account must verify its existing passkey or use its saved recovery code once before migration. Password-only login cannot overwrite an existing second factor. After migration, old passkeys and old proof versions cannot unlock that account. The first authenticator enrolment enables the store-wide authenticator requirement for backend actions and Firestore administration.

Deploy the updated Worker and Firestore rules before using the new frontend. No new vendor, subscription or API key is required. The existing server service-account private key derives a purpose-specific AES-256-GCM encryption key for stored authenticator secrets. Account UID is authenticated as associated data. Preserve the current credential when redeploying. Rotating that private key requires an explicit secret re-encryption migration before retiring it; replacing it without migration would prevent verification of enrolled authenticators. Never put service-account credentials or setup keys in source control.

Code checking uses RFC 6238 SHA-1, six digits, 30-second steps, a one-step clock tolerance, transactional replay prevention and a persistent five-attempt limit per account per five minutes. Setup challenges are bound to UID, original sign-in time, origin, expiry and policy version. Recovery codes are hashed, consumed transactionally, and rotate the proof version. Secrets, recovery records and challenges remain inaccessible through client Firestore rules.
