# Drixel ID sign-in for Drixel SA

This change adds Firebase OpenID Connect sign-in and an explicit link flow. Existing email/password and Google sign-in remain available.

## Firebase setup

Firebase's custom OIDC provider requires **Firebase Authentication with Identity Platform**. In the Firebase console:

1. Upgrade the project's Authentication configuration to Identity Platform.
2. Add an OpenID Connect provider with provider ID `oidc.drixel`.
3. Set its issuer to the public HTTPS Drixel ID realm URL, for example `https://id.example.com/realms/drixel`.
4. Use the Keycloak client ID `drixel-sa-firebase` and its generated client secret. Store the secret only in Firebase Console.
5. Use authorization code flow. Add Firebase's displayed redirect handler URL to the Keycloak client's redirect URI allowlist. For the current `authDomain`, this is expected to be `https://drixel-sa.firebaseapp.com/__/auth/handler`; verify the exact value shown by Firebase.

The local Keycloak service in Drixel Platform is not publicly reachable by Firebase and must not be used as the production issuer. It is only for local development.

## Sign in and link existing accounts

- Signed-out customers can select **Continue with Drixel ID**.
- A customer already signed into Firebase can open `auth.html`; the button changes to **Link Drixel ID** and links the provider to the current Firebase UID.
- Existing email/password or Google users should sign in with their existing method first, then link Drixel ID. If Firebase reports an email/provider conflict, do not create a second account or merge records by email alone.
- A new Firebase user receives a customer profile. The client never assigns an administrator role through this flow.

The provider's email and profile scopes are requested. Keep the Keycloak registration closed to the public until Drixel account verification and recovery rules are configured.

## Scope

This connects authentication through Drixel ID and preserves the Firebase UID when an existing customer links their account. Orders and product data remain in Firebase. The central Drixel directory does not yet receive the user's service membership from this login; service authorization still needs a server-side integration with the directory API.


## Sync customer accounts to Drixel's directory

After Drixel ID sign-in or linking, the website calls the authenticated syncDrixelAccount Firebase callable. The callable reads the linked OIDC subject from Firebase Admin and sends it to the central API from the function environment. DRIXEL_SYNC_KEY is a Firebase Secret Manager secret and is never included in website JavaScript. The function grants only the registered Drixel SA Store customer role; store orders and profiles remain in Firebase.

Merge the Drixel Platform service-sync API change first. Configure the API key for application slug drixel-sa-store, then set DRIXEL_API_URL in functions/.env and create the secret:

firebase functions:secrets:set DRIXEL_SYNC_KEY
firebase deploy --only functions:syncDrixelAccount

Enter the Drixel SA Store service key at the prompt. Never commit functions/.env, the service key, or Firebase service-account credentials. The callable refuses accounts without the linked oidc.drixel identity and does not grant administrator claims. A directory sync failure leaves the user signed in and displays that directory access is pending; suspended or ended memberships need an administrator to restore them.
