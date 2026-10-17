# Microsoft approval for administrator accounts

This optional second factor keeps the existing Firebase account and TOTP recovery path. It does not change customer login. Microsoft controls the MFA prompt; number matching occurs when Microsoft Authenticator push is the selected method. Security defaults do not guarantee a new push on every sign-in. An application-specific Conditional Access policy is needed for stronger control of MFA frequency and allowed methods, subject to Microsoft licensing.

## Microsoft configuration

Register a single-tenant app. Under Authentication, add a **Single-page application** redirect URI:

`https://drixelsa.co.za/za/member/microsoft-approval`

Use authorization code flow with PKCE; do not enable implicit grants or create a browser client secret. No Microsoft Graph permissions are requested. The implementation uses MSAL Browser. In the app manifest, merge these ID-token optional claims into any existing optionalClaims entries:

```json
"optionalClaims": {
  "idToken": [
    {"name": "amr", "essential": false},
    {"name": "auth_time", "essential": false}
  ]
}
```

Enable Microsoft Authenticator for the linked identities, register their phones, and enforce MFA. Confirm that issued app ID tokens include `amr` containing `mfa`; missing proof is denied, never treated as success. A guest account may need resource-tenant MFA registration and appropriate cross-tenant settings. Never infer MFA from a completed redirect or a username.

## Worker configuration

Set the server-side `MICROSOFT_ADMIN_CONFIG` value, preferably through `wrangler secret put MICROSOFT_ADMIN_CONFIG`, to JSON:

```json
{"tenant":"YOUR_TENANT_ID","clientId":"YOUR_APPLICATION_CLIENT_ID","accounts":{"verified-owner@example.com":"YOUR_MICROSOFT_USER_OBJECT_ID"}}
```

Each mapping must be explicitly authorised. It binds an existing verified Firebase administrator email to an immutable Microsoft user Object ID in the specified tenant. No mapping is committed into public source. Anelisa and additional administrators require their own mapping and phone setup. Setting up one owner never enables Microsoft access for every administrator.

Deploy the Worker, Firestore rules and frontend. Deploy the changed Functions only if legacy Firebase callable endpoints are used. First enrol the existing account in TOTP. At the admin verification gate choose **Approve with Microsoft Authenticator**. Sign into the mapped Microsoft account and complete Microsoft's MFA prompt.

The first successful Microsoft proof rotates the account security policy version and records the link. TOTP remains available. Microsoft sessions use the same 15-minute proof expiry and grant revocation checks; owner access changes still require proof within five minutes.

## Validation and limits

The Worker checks RS256 signature against tenant-specific Microsoft keys, exact issuer/tenant/audience, mapped Object ID, nonce, token lifetime, recent issued/authentication time, and signed `mfa` evidence. A five-minute one-use challenge is bound to the Firebase UID, primary sign-in time, production origin, policy version and configured tenant/application/account. Callback state and PKCE are handled by MSAL. Tokens are not placed in application logs or URLs. OAuth callback is private, noindex and excluded from the sitemap.

Removing a mapping prevents new Microsoft verification. Existing proofs expire within fifteen minutes; rotate the account's server security version to revoke them immediately. Managed administrator grant removal also rotates that version. Changing server credentials still requires the separate TOTP encryption-key migration described in ADMIN_AUTHENTICATOR.md.

Local tests exercise signed-token rejection, wrong identities and nonce, expired/replayed challenges, policy changes, Firestore access, server authorisation and a mocked browser redirect. They do not prove live tenant MFA issuance or receipt of a production phone prompt. Complete a live test before relying on Microsoft approval.
