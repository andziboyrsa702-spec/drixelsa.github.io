# Storefront HTTPS and header repair

The October 13 live check found that the apex HTTP URL returned 200, HTTP www redirected to HTTP apex, and HTTPS responses lacked the headers reported by Sucuri. The responses identify GitHub Pages behind Cloudflare. Headers in `firebase.json` therefore do not affect this current hosting path. A `_headers` file is also not applied by GitHub Pages.

The separate `edge-security` Worker operates on only the apex and www hostnames. It redirects HTTP/www straight to the canonical HTTPS URL, preserves paths and queries, prevents origin redirects from downgrading the store, and adds headers while streaming the original response body. It keeps origin status, caching, cookies and media range responses intact. The API and help Worker are separate.

From the signed-in Cloudflare machine, with this repository pulled:

```powershell
npm run deploy:security
```

This requires the active proxied Cloudflare zone and Worker-route permission. It does not alter the origin DNS, mail records, products or customers. Review any existing Workers already assigned to these same routes before replacing a route. The workspace preparing this release had no Cloudflare login, so the live deployment is not performed here.

The CSP permits the store's bundled scripts, configured sign-in providers, payment frames, media and upload service. Inline styles remain allowed for existing components and email previews; arbitrary inline scripts and eval are blocked. Production output uses an external module entry. If introducing another provider, update the appropriate directive deliberately. Verify sign-in, Microsoft admin approval, email previews and checkout after activation. A successful scanner result does not constitute a complete security audit.

HSTS starts at one day and does not include subdomains or preload, because all existing/future subdomains have not been verified. Keep HTTPS and its certificates active. Cloudflare's Always Use HTTPS can also be enabled under SSL/TLS → Edge Certificates for zone-wide enforcement after verifying other hosts.

Check these after deployment:

```powershell
curl.exe -I http://drixelsa.co.za/
curl.exe -I http://www.drixelsa.co.za/
curl.exe -I https://drixelsa.co.za/
```

Both HTTP URLs should redirect directly to HTTPS apex. The HTTPS response should include CSP, X-Frame-Options, X-Content-Type-Options and Strict-Transport-Security. Re-scan with Sucuri after deployment/caches refresh. Rollback is removing only the `drixel-store-security` route assignments in Cloudflare, leaving the Pages origin and other Workers intact.
