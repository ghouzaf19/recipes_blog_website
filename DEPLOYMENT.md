# CookeTricks deployment guide

## 1. Install the WordPress plugin

In `cms.cooketricks.com/wp-admin`, open **Plugins → Add New Plugin → Upload Plugin**, upload the checksum-verified `cooketricks-headless-2.3.0.zip`, and activate it. Keep **Settings → Permalinks → Post name** selected.

Add these constants to `wp-config.php` above the “stop editing” line. Generate two different long random secrets; do not reuse the example values.

```php
define('COOKETRICKS_FRONTEND_URL', 'https://cooketricks.com');
define('COOKETRICKS_REVALIDATE_URL', 'https://cooketricks.com/api/revalidate');
define('COOKETRICKS_PREVIEW_SECRET', 'YOUR_LONG_PREVIEW_SECRET');
define('COOKETRICKS_REVALIDATE_SECRET', 'YOUR_DIFFERENT_LONG_REVALIDATE_SECRET');
```

Create one WordPress **Application Password** under **Users → Profile** for the preview integration. It is not the normal WordPress login password.

## 2. Configure the Next.js application

Set the variables from `.env.example` in Hostinger's Node.js environment. The two secrets must exactly match the WordPress constants. Never prefix a password or secret with `NEXT_PUBLIC_`.

During the 2.4 security rollout, also set both temporary compatibility flags exactly as shown. Only the lowercase values `true` and `false` are accepted; an invalid value fails closed.

```text
COOKETRICKS_ACCEPT_LEGACY_PREVIEW=true
COOKETRICKS_ACCEPT_LEGACY_REVALIDATION=true
```

These defaults preserve compatibility while the 2.3 plugin remains deployed. Deploy the dual-compatible Next.js receiver first, then upgrade WordPress to plugin 2.4. After 2.4 preview and revalidation have been verified, set both flags to `false` and redeploy. Rolling Next.js back while WordPress 2.3 is still active is safe; rolling WordPress back to 2.3 requires the dual receiver or both legacy flags to remain enabled.

```bash
npm ci
npm run check
npm run build
npm run start
```

Use Node.js 20 or newer. Configure the production start command as `npm run start` and the application port supplied by Hostinger.

## 3. WordPress content workflow

1. Create a real WordPress user for every writer and complete the public biography.
2. Create a post and choose **Article** or **Recipe** in the CookeTricks panel.
3. Recipes require an excerpt, featured image, servings, ingredients, and instructions before publication.
4. Enter test, nutrition, image-source, disclosure, source, and review fields only when the information is accurate.
5. Use **Preview** for drafts. Publish when the post is ready; WordPress then asks Next.js to refresh the affected pages.

## 4. Verification

- Open `https://cms.cooketricks.com/wp-json/wp/v2/posts` and confirm JSON is returned.
- Publish a small test post and confirm it appears at `https://cooketricks.com/blog`.
- Confirm its canonical URL, author page, dates, Open Graph metadata, and JSON-LD.
- Test draft Preview while logged into WordPress.
- Submit `https://cooketricks.com/sitemap.xml` in Google Search Console.

## Security notes

- Keep WordPress, PHP, and plugins updated.
- Restrict WordPress admin accounts and enable two-factor authentication where possible.
- Rotate the Application Password and both integration secrets if they are exposed.
- Do not install a second recipe-schema plugin unless duplicate JSON-LD is disabled.

## 2.4 receiver protocols

### Preview v2

Preview v2 accepts `version`, `postId`, `issuedAt`, `expiresAt`, `nonce`, and `signature`. The signature is an HMAC-SHA256 hex digest over this exact UTF-8 payload, with literal newline separators:

```text
preview:v2
<postId>
<issuedAt>
<expiresAt>
<nonce>
```

The preview lifetime is limited to 15 minutes with at most 60 seconds of future clock skew. The v2 nonce must be canonical unpadded base64url that decodes to 16 through 64 bytes. After authorization, Next.js creates a signed, HttpOnly, post-bound session that expires no later than the preview credential and redirects to `/blog/<slug>?preview=1`. The credential, signature, nonce, and timestamps are not retained in the article URL. Legacy 2.3 `id` and `token` links remain available only while `COOKETRICKS_ACCEPT_LEGACY_PREVIEW=true`; their resulting browser session is also limited to 15 minutes.

The Draft Mode cookie and CookeTricks preview-session cookie are short-lived bearer credentials. A complete stolen cookie pair can be used until it expires; this is an explicitly accepted Phase 1 residual risk. The session is protected by HMAC integrity and restricted to one post ID and its matching slug, but is intentionally not bound to IP addresses, User-Agent strings, fingerprints, or other unstable client attributes. Stronger copied-session revocation requires a durable server-side session store and is deferred.

The application removes preview credentials from the redirect and does not log them itself. The initial preview request necessarily carries credentials in its URL, so a reverse proxy, CDN, or hosting access log could retain them. Repository code cannot verify infrastructure log redaction. The short expiration reduces but does not eliminate this risk; access-log redaction remains a deployment requirement.

### Revalidation v2

Revalidation v2 requires `X-CookeTricks-Version: 2`, a Unix timestamp, a UUID event ID, and `X-CookeTricks-Signature: v1=<hex HMAC>`. The HMAC-SHA256 signature covers the exact raw JSON body:

```text
revalidate:v2
<timestamp>
<event-id>
<raw JSON body>
```

Requests outside the five-minute window are rejected. V2 `slug` and `previousSlug` values are limited to 200 characters and must contain only lowercase ASCII letters and digits separated by single hyphens. The transitional receiver reserves authenticated, schema-valid event IDs before invalidation, marks them completed afterward, and releases a reservation if invalidation fails so the sender can retry. It remembers accepted event IDs for five minutes and rejects a replay with HTTP 409. The ledger never evicts an unexpired event; if its 2,048-entry bound is reached, it returns HTTP 503 with `Retry-After`. This in-memory store is best-effort only: it is lost on process restart and does not coordinate multiple Next.js instances. It must be replaced by a shared durable store before strict cross-instance replay protection can be claimed. The legacy 2.3 `X-CookeTricks-Secret` path remains isolated and is accepted only while `COOKETRICKS_ACCEPT_LEGACY_REVALIDATION=true`. Authenticated 2.3 `auto-draft` events with an empty `post_name` trigger global invalidation only and never construct a post-specific path or tag.
