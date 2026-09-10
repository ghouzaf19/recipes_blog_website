# CookeTricks deployment guide

## 1. Install or upgrade the WordPress plugin

The tagged `cooketricks-headless-v2.3.0` source is the checksum-verified rollback
baseline. Version 2.4.0 must be reviewed, packaged from
`wordpress/plugins/cooketricks-headless/`, and explicitly approved before it is
uploaded. Keep **Settings → Permalinks → Post name** selected.

Add these constants to `wp-config.php` above the “stop editing” line. Generate
two distinct random secrets of at least 32 bytes; do not reuse the example
values.

```php
define('COOKETRICKS_PROTOCOL_VERSION', '2');
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

These defaults preserve compatibility while the 2.3 plugin remains deployed. Deploy the dual-compatible Next.js receiver first, then configure `COOKETRICKS_PROTOCOL_VERSION` to exactly `2` and upgrade WordPress to plugin 2.4. Version 2.4 fails closed if the protocol or v2 endpoint configuration is missing or invalid; it never falls back to legacy authentication. After 2.4 preview and revalidation have been verified, set both flags to `false` and redeploy. Rolling Next.js back while WordPress 2.3 is still active is safe; rolling WordPress back to 2.3 requires the dual receiver or both legacy flags to remain enabled.

```bash
npm ci
npm run check
npm run build
npm run start
```

Use Node.js 20 or newer. Configure the production start command as `npm run start` and the application port supplied by Hostinger.

## Environment-isolated plugin configuration

Set WP_ENVIRONMENT_TYPE to exactly production, staging, development, or local.
The plugin fails closed for every other value.

- **Production** ignores staging and local overrides. It always signs only for
  https://cooketricks.com and sends revalidation only to
  https://cooketricks.com/api/revalidate.
- **Staging** requires COOKETRICKS_STAGING_FRONTEND_ORIGIN, an exact HTTPS
  origin that is not cooketricks.com, www.cooketricks.com, or
  cms.cooketricks.com. It also requires separate
  COOKETRICKS_STAGING_PREVIEW_SECRET and
  COOKETRICKS_STAGING_REVALIDATE_SECRET values. There is no fallback to
  production values or hosts.
- **Development/local** requires COOKETRICKS_LOCAL_FRONTEND_ORIGIN and
  separate local preview and revalidation secrets. The origin must use HTTP and
  an explicit loopback host: localhost, 127.0.0.1, or ::1.

Origins cannot include a path, query, fragment, credentials, wildcard, or
production-alternate host. Staging must use the isolated topology:

    staging WordPress → staging Next.js receiver

Deploy the staging Next.js receiver and its staging-only secrets first, then
the staging WordPress plugin. A failed/missing configuration creates no signed
preview URL and sends no webhook.

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

## 2.4 delivery queue and rollback

Version 2.4 writes strict revalidation event bodies to a bounded WordPress
database queue and delivers them asynchronously through WP-Cron. The queue
holds no secret or signature; those are read and calculated only when a worker
sends an event. Confirm that WP-Cron runs at least once per minute, preferably
through a hosting system cron on low-traffic sites.

Successful HTTP 200 responses and authenticated replay HTTP 409 responses mark
the event completed. Network failures and HTTP 408, 425, 429, and 5xx responses
retry with bounded exponential delays; `Retry-After` is used only for 429 and
503 and is capped at four hours. Other 4xx responses become permanent failures.
Events have six delivery attempts, active work older than seven days becomes a
dead letter, and terminal records are retained for 30 days. The table holds at
most 2,048 records. Each worker processes at most four events within a
20-second budget, using four-second HTTP requests. Operational diagnostics are
sanitized and never contain response bodies, credentials, headers, signatures,
or private editorial notes.

Activation creates or upgrades the InnoDB queue table idempotently, verifies its
columns and indexes, then schedules its worker. The plugin only accepts the
exact HTTPS `cooketricks.com` frontend and `/api/revalidate` endpoint; hosts,
ports, credentials, queries, fragments, and redirects are rejected. Deactivation
unschedules the worker without deleting queue data. Network activation is not
supported. There is no data-deleting uninstall routine. To roll back,
deactivate 2.4, restore the exact `cooketricks-headless-v2.3.0` tag, keep both
Next.js legacy flags enabled, and activate 2.3. Queue data stays preserved for
a later 2.4 return.

### Reconciliation after an enqueue failure

If a content-event queue insert fails, the editor save still succeeds. The
plugin writes one bounded WordPress option marker containing only a generation
and timestamp—never post content, slugs, payloads, credentials, signatures, or
private metadata. The next cron worker sends the strict signed V2
{"event":"reconcile","scope":"all-content"} request directly and clears only
the matching marker after HTTP 200 or the authenticated replay HTTP 409 marker.

The marker is normally retried on the next one-minute worker run. It remains
pending after configuration, network, authentication, schema, capacity, or
server failures. If both the custom queue table and the WordPress options table
cannot be written, no durable recovery record can be made; administrators see
only a sanitized diagnostic and must trigger a later reconciliation after the
database recovers.

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
