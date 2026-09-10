=== CookeTricks Headless CMS ===
Contributors: cooketricks
Tags: headless, rest-api, preview, revalidation
Requires at least: 6.4
Requires PHP: 8.0
Stable tag: 2.4.0
License: GPLv2 or later

Headless WordPress support for the CookeTricks Next.js application.

== Description ==

Version 2.4.0 sends signed preview links and signed revalidation events using
the CookeTricks v2 integration protocol. Revalidation delivery is persisted in
a bounded database queue and processed outside editor save requests by WP-Cron.

This release does not change recipe fields, public REST fields, taxonomies,
authors, or publication rules.

== Required server configuration ==

Define these values outside the plugin source, preferably in wp-config.php or
the hosting environment:

* COOKETRICKS_PROTOCOL_VERSION: must be exactly 2.
* COOKETRICKS_FRONTEND_URL: the HTTPS CookeTricks frontend origin.
* COOKETRICKS_PREVIEW_SECRET: at least 32 random bytes, shared only with the Next.js preview receiver.
* COOKETRICKS_REVALIDATE_URL: the full HTTPS /api/revalidate endpoint.
* COOKETRICKS_REVALIDATE_SECRET: a different at-least-32-byte random secret, shared only with the Next.js revalidation receiver.

The plugin fails closed when the protocol or required configuration is missing
or invalid. Administrators see a generic configuration notice; secret values
are never included in notices, logs, URLs other than the short-lived signed
preview URL, or queued records. The plugin accepts only the exact HTTPS
`cooketricks.com` frontend origin and `/api/revalidate` webhook endpoint, with
no alternate host, port, credentials, query, fragment, or redirect.

== Environment isolation ==

Set WP_ENVIRONMENT_TYPE to production, staging, development, or local.

Production always uses https://cooketricks.com and
https://cooketricks.com/api/revalidate. It ignores staging and local override
values.

Staging requires COOKETRICKS_STAGING_FRONTEND_ORIGIN plus separate
COOKETRICKS_STAGING_PREVIEW_SECRET and
COOKETRICKS_STAGING_REVALIDATE_SECRET values. The staging origin must be one
exact HTTPS origin and cannot be cooketricks.com, www.cooketricks.com, or
cms.cooketricks.com. This creates an isolated path:

staging WordPress -> staging Next.js receiver

Development and local environments require COOKETRICKS_LOCAL_FRONTEND_ORIGIN
and separate local secrets. Only explicit HTTP loopback origins are accepted:
localhost, 127.0.0.1, or ::1. Missing or invalid configuration fails closed;
the plugin produces no signed preview URL and sends no webhook.

== Protocol selection ==

Version 2.4.0 supports only the explicitly selected v2 sender protocol. Set
COOKETRICKS_PROTOCOL_VERSION to exactly 2 after the dual-compatible Next.js
receiver and its secrets are deployed. There is no automatic downgrade and no
legacy authentication header is sent by this release.

Keep the Next.js legacy compatibility flags enabled during rollout. Disable
them only after the 2.4.0 sender has been deployed and preview and revalidation
have been verified end to end.

== Preview v2 ==

Preview links contain version, postId, issuedAt, expiresAt, nonce, and signature
query parameters. The nonce is 32 cryptographically random bytes encoded as
canonical unpadded base64url. Links live for 15 minutes. The signature is a
lowercase hexadecimal HMAC-SHA256 over this exact payload:

preview:v2\npostId\nissuedAt\nexpiresAt\nnonce

== Revalidation v2 ==

The queued JSON body contains only event, postId, slug, optional previousSlug,
and status. Its exact encoded bytes are signed at delivery time with a UUID v4
event ID and Unix timestamp. Requests contain only the v2 headers documented in
DEPLOYMENT.md. Signatures and authorization values are never stored in the queue.

== Delivery queue ==

The queue stores at most 2,048 events and processes up to four events within a
20-second worker budget, using four-second HTTP requests. Workers claim records
with an event-specific lock so two workers cannot deliver the same record
concurrently. Network errors and HTTP 408, 425, 429, and 5xx responses are
retried using bounded delays of 1 minute, 5 minutes, 15 minutes, 1 hour, and 4
hours. `Retry-After` is used only for HTTP 429 and 503 and is capped at four
hours. Delivery stops after six attempts. HTTP 200 is success; an authenticated
HTTP 409 response whose bounded JSON body is exactly `{\"code\":\"replayed-event\"}`
is treated as already delivered. Other 4xx responses are permanent failures.

Only sanitized operational categories are retained. Response bodies, secrets,
signatures, private notes, credentials, and authorization headers are neither
stored nor logged. Active records older than seven days become dead letters;
completed, permanent-failure, and dead-letter records are retained for 30 days.

WP-Cron must be functioning for timely delivery. A real system cron invoking
wp-cron.php is recommended on sites where traffic is intermittent.

== Reconciliation marker ==

When a content-event queue insert cannot be persisted, the editor save still
succeeds and the plugin writes one bounded option marker containing only a
generation and timestamp. A later worker sends the strict signed body
{"event":"reconcile","scope":"all-content"} directly, including when the custom
queue table is unavailable or full. The marker is retained after configuration,
network, authentication, schema, capacity, and server errors. It is cleared
only by HTTP 200 or the exact authenticated replay 409 response, using
compare-and-swap semantics so a newer failure cannot be cleared by an older
worker.

The expected recovery delay is one WP-Cron interval. If both the custom queue
table and WordPress options table are unavailable, the plugin cannot durably
record the recovery need; it records only a sanitized administrator diagnostic.

== Activation, deactivation, and rollback ==

Activation performs an idempotent InnoDB queue-table migration, verifies the
expected schema, and schedules the worker. It does not modify posts, users,
terms, or post metadata. Network activation is unsupported and fails safely.
Deactivation unschedules the worker but deliberately preserves queued data.
This plugin has no data-deleting uninstall routine.

The annotated Git tag cooketricks-headless-v2.3.0 is the immutable rollback
baseline. Before rolling back, deactivate 2.4.0, restore the tagged 2.3.0 files,
and use the documented Next.js legacy compatibility flags. Queue data remains
in place and must not be deleted without separate authorization. Returning to
2.4.0 resumes processing after activation.

== Changelog ==

= 2.4.0 =
* Added explicit v2-only preview and revalidation senders.
* Added signed, expiring preview links.
* Added signed and timestamped strict revalidation events.
* Added a bounded persistent WP-Cron delivery queue with retries and locking.
* Preserved the 2.3.0 tag as the rollback baseline.
