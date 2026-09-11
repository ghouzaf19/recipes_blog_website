import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const pluginRoot = join(repositoryRoot, "wordpress/plugins/cooketricks-headless");
const loaderSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: 'data:text/javascript,export%20default%20%7B%7D', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(loaderSource)}`, import.meta.url);
const security = await import("../src/lib/cooketricks-security.ts");

function source(path: string): string {
  return readFileSync(join(pluginRoot, path), "utf8");
}

const main = source("cooketricks-headless.php");
const readme = source("README.txt");
const integration = source("includes/class-ct-integration.php");
const webhooks = source("includes/class-ct-webhooks.php");
const queue = source("includes/class-ct-delivery-queue.php");
const receiver = readFileSync(
  join(repositoryRoot, "src/app/api/revalidate/route.ts"),
  "utf8",
);
const allCurrentSource = [main, readme, integration, webhooks, queue].join("\n");

test("current plugin is version 2.4.0 with an exact release file set", () => {
  assert.match(main, /^ \* Version: 2\.4\.0$/m);
  assert.match(main, /define\('CT_HEADLESS_VERSION', '2\.4\.0'\);/);
  assert.match(readme, /^Stable tag: 2\.4\.0$/m);
  assert.deepEqual(readdirSync(pluginRoot).sort(), [
    "README.txt",
    "cooketricks-headless.php",
    "includes",
  ]);
  assert.deepEqual(readdirSync(join(pluginRoot, "includes")).sort(), [
    "class-ct-admin.php",
    "class-ct-content.php",
    "class-ct-delivery-queue.php",
    "class-ct-integration.php",
    "class-ct-rest.php",
    "class-ct-webhooks.php",
  ]);
});

test("2.4 leaves recipe, admin, and REST modules byte-for-byte at baseline", () => {
  for (const path of [
    "includes/class-ct-admin.php",
    "includes/class-ct-content.php",
    "includes/class-ct-rest.php",
  ]) {
    const baseline = execFileSync(
      "git",
      ["show", `cooketricks-headless-v2.3.0:wordpress/plugins/cooketricks-headless/${path}`],
      { encoding: "buffer" },
    );
    assert.deepEqual(readFileSync(join(pluginRoot, path)), baseline);
  }
});

test("preview v2 payload and HMAC exactly match the Next.js receiver", () => {
  const input = {
    postId: 42,
    issuedAt: 2_000_000_000,
    expiresAt: 2_000_000_900,
    nonce: "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA",
  };
  const secret = "test-only-preview-key-with-at-least-32-bytes";
  const exactPayload = `preview:v2\n${input.postId}\n${input.issuedAt}\n${input.expiresAt}\n${input.nonce}`;
  const expected = createHmac("sha256", secret).update(exactPayload).digest("hex");

  assert.equal(security.previewV2Payload(input), exactPayload);
  assert.equal(security.signPreviewV2(input, secret), expected);
  assert.match(webhooks, /implode\("\\n", \['preview:v2', \$post->ID, \$issued_at, \$expires_at, \$nonce\]\)/);
  assert.match(webhooks, /random_bytes\(32\)/);
  assert.match(webhooks, /15 \* MINUTE_IN_SECONDS/);
  assert.match(webhooks, /rtrim\(strtr\(base64_encode\(\$bytes\), '\+\/', '-_'\), '='\)/);
  for (const parameter of ["version", "postId", "issuedAt", "expiresAt", "nonce", "signature"]) {
    assert.match(webhooks, new RegExp(`'${parameter}'\\s*=>`));
  }
  assert.doesNotMatch(webhooks, /['"](?:id|token)['"]\s*=>/);
});

test("revalidation signs exact raw JSON bytes and sends only v2 headers", () => {
  const timestamp = 2_000_000_000;
  const eventId = "123e4567-e89b-42d3-a456-426614174000";
  const rawBody =
    '{"event":"update","postId":42,"slug":"new-slug","previousSlug":"old-slug","status":"publish"}';
  const secret = "test-only-revalidation-key-with-at-least-32-bytes";
  const exactPayload = `revalidate:v2\n${timestamp}\n${eventId}\n${rawBody}`;
  const expected = createHmac("sha256", secret).update(exactPayload).digest("hex");

  assert.equal(security.revalidationV2Payload(timestamp, eventId, rawBody), exactPayload);
  assert.equal(security.signRevalidationV2(timestamp, eventId, rawBody, secret), expected);
  assert.match(queue, /"revalidate:v2\\n\{\$timestamp\}\\n\{\$event_id\}\\n\{\$body\}"/);
  assert.match(queue, /private static function send_v2_request/);
  assert.match(queue, /'body'\s*=>\s*\$body/);
  for (const header of ["Content-Type", "X-CookeTricks-Version", "X-CookeTricks-Timestamp", "X-CookeTricks-Event-ID", "X-CookeTricks-Signature"]) {
    assert.match(queue, new RegExp(`'${header}'\\s*=>`));
  }
  assert.doesNotMatch(queue, /X-CookeTricks-Secret/);
});

type Schema = {
  columns: Set<string>;
  primary: string[];
  indexes: Record<string, string[]>;
  engine: string;
  collation: string;
};

function schemaShadowIsValid(schema: Schema): boolean {
  const columns = ["event_id", "payload", "status", "attempts", "next_attempt_at", "locked_at", "lock_token", "last_error", "created_at", "updated_at"];
  return columns.every((column) => schema.columns.has(column))
    && schema.engine === "InnoDB"
    && schema.collation.length > 0
    && schema.primary.join(",") === "event_id"
    && schema.indexes.due_events?.join(",") === "status,next_attempt_at"
    && schema.indexes.retention?.join(",") === "status,updated_at"
    && schema.indexes.active_age?.join(",") === "status,created_at";
}

test("schema shadow model rejects missing columns, primary keys, and indexes", () => {
  const valid: Schema = {
    columns: new Set(["event_id", "payload", "status", "attempts", "next_attempt_at", "locked_at", "lock_token", "last_error", "created_at", "updated_at"]),
    primary: ["event_id"],
    indexes: {
      due_events: ["status", "next_attempt_at"],
      retention: ["status", "updated_at"],
      active_age: ["status", "created_at"],
    },
    engine: "InnoDB",
    collation: "utf8mb4_unicode_ci",
  };
  assert.equal(schemaShadowIsValid(valid), true);
  assert.equal(schemaShadowIsValid({ ...valid, columns: new Set([...valid.columns].filter((value) => value !== "payload")) }), false);
  assert.equal(schemaShadowIsValid({ ...valid, primary: [] }), false);
  assert.equal(schemaShadowIsValid({ ...valid, indexes: { ...valid.indexes, active_age: [] } }), false);
  assert.match(queue, /SHOW FULL COLUMNS FROM/);
  assert.match(queue, /SHOW INDEX FROM/);
  assert.match(queue, /SHOW TABLE STATUS LIKE/);
  assert.match(queue, /ENGINE=InnoDB/);
});

test("migration version advances only after complete verification and failures are throttled", () => {
  const verifyPosition = queue.indexOf("if (!self::schema_is_valid())");
  const versionPosition = queue.indexOf("update_option(self::DB_VERSION_OPTION");
  assert.ok(verifyPosition >= 0 && versionPosition > verifyPosition);
  assert.match(queue, /MIGRATION_RETRY_SECONDS = 5 \* MINUTE_IN_SECONDS/);
  assert.match(queue, /MIGRATION_RETRY_OPTION/);
  assert.match(queue, /record_operational_diagnostic\('migration'/);
  assert.match(integration, /headless %s subsystem needs attention/);
});

function normalizeBodyShadow(body: Record<string, unknown>): Record<string, unknown> | null {
  const allowed = new Set(["event", "postId", "slug", "previousSlug", "status"]);
  const required = ["event", "postId", "slug", "status"];
  const slug = (value: unknown) => typeof value === "string" && value.length <= 200 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  if (Object.keys(body).some((key) => !allowed.has(key)) || required.some((key) => !(key in body))) return null;
  if (!["create", "update", "delete", "status-change"].includes(String(body.event))) return null;
  if (!Number.isSafeInteger(body.postId) || Number(body.postId) < 1) return null;
  if (!slug(body.slug) || (body.previousSlug !== undefined && !slug(body.previousSlug))) return null;
  if (!["draft", "pending", "future", "publish", "private", "trash"].includes(String(body.status))) return null;
  return body;
}

test("queue input shadow model rejects unknown, malformed, and oversized inputs", () => {
  const valid = { event: "update", postId: 42, slug: "safe-slug", status: "publish" };
  assert.deepEqual(normalizeBodyShadow(valid), valid);
  assert.equal(normalizeBodyShadow({ ...valid, secret: "not-allowed" }), null);
  assert.equal(normalizeBodyShadow({ ...valid, postId: 0 }), null);
  assert.equal(normalizeBodyShadow({ ...valid, slug: "Unsafe Slug" }), null);
  assert.equal(normalizeBodyShadow({ ...valid, status: "auto-draft" }), null);
  assert.match(queue, /MAX_PAYLOAD_BYTES = 1024/);
  assert.match(queue, /strlen\(\$payload\) > self::MAX_PAYLOAD_BYTES/);
  assert.match(queue, /actual_keys !== \$expected_keys/);
});

class CapacityShadow {
  private count = 0;
  private tail = Promise.resolve();
  private readonly maximum: number;

  constructor(maximum: number) {
    this.maximum = maximum;
  }
  enqueue(): Promise<boolean> {
    const operation = this.tail.then(() => {
      if (this.count >= this.maximum) return false;
      this.count += 1;
      return true;
    });
    this.tail = operation.then(() => undefined);
    return operation;
  }
  get size(): number { return this.count; }
}

test("capacity concurrency shadow model serializes inserts at 2,048", async () => {
  const model = new CapacityShadow(2_048);
  const results = await Promise.all(Array.from({ length: 2_100 }, () => model.enqueue()));
  assert.equal(results.filter(Boolean).length, 2_048);
  assert.equal(model.size, 2_048);
  assert.match(queue, /SELECT GET_LOCK/);
  assert.match(queue, /SELECT RELEASE_LOCK/);
  assert.match(queue, /finally \{\s*self::release_capacity_lock\(\)/);
  assert.doesNotMatch(queue, /add_option\(self::ENQUEUE_LOCK_OPTION|delete_option\(self::ENQUEUE_LOCK_OPTION/);
  assert.match(queue, /PRIMARY KEY  \(event_id\)/);
});

test("webhooks handle typed enqueue failures without breaking post saves", () => {
  assert.match(queue, /public static function enqueue\(array \$body\): bool\|WP_Error/);
  assert.match(webhooks, /try \{[\s\S]*?CT_Delivery_Queue::enqueue\(\$body\)[\s\S]*?catch \(Throwable \$error\)/);
  assert.match(webhooks, /if \(is_wp_error\(\$result\)\)/);
  assert.match(webhooks, /record_operational_diagnostic\('enqueue'/);
  const enqueuePosition = webhooks.indexOf("CT_Delivery_Queue::enqueue($body)");
  const emittedPosition = webhooks.indexOf("self::$emitted[$fingerprint] = true");
  assert.ok(enqueuePosition >= 0 && emittedPosition > enqueuePosition);
});

test("source-only reconciliation model preserves the newest marker and never stores content", () => {
  type Marker = { generation: string; created_at: number };
  let marker: Marker | null = null;
  const request = (next: Marker) => { marker = next; };
  const older = { generation: "123e4567-e89b-42d3-a456-426614174000", created_at: 100 };
  const newer = { generation: "123e4567-e89b-42d3-a456-426614174001", created_at: 101 };
  request(older);
  const oldSnapshot = JSON.stringify(marker);
  request(newer);
  assert.notEqual(JSON.stringify(marker), oldSnapshot);
  assert.equal(JSON.stringify(marker), JSON.stringify(newer));
  const clearIfCurrent = (snapshot: string) => {
    if (marker !== null && JSON.stringify(marker) === snapshot) marker = null;
  };
  clearIfCurrent(oldSnapshot);
  assert.deepEqual(marker, newer);
  clearIfCurrent(JSON.stringify(newer));
  assert.equal(marker, null);
  assert.match(queue, /RECONCILIATION_OPTION/);
  assert.match(queue, /SELECT option_value FROM \{\$options\}/);
  assert.match(queue, /WHERE option_name = %s AND option_value = %s/);
  assert.match(queue, /DELETE FROM \{\$wpdb->options\} WHERE option_name = %s AND option_value = %s/);
  assert.match(queue, /process_reconciliation\(\)/);
  assert.match(queue, /RECONCILIATION_BODY = '\{"event":"reconcile","scope":"all-content"\}'/);
  assert.match(queue, /'generation' => wp_generate_uuid4\(\),[\s\S]*?'created_at' => time\(\)/);
  assert.match(webhooks, /request_reconciliation_after_enqueue_failure/);
  assert.match(webhooks, /CT_Delivery_Queue::request_reconciliation\(\)/);
});

test("reconciliation transport retains its marker except for 200 or exact replay 409", () => {
  assert.match(queue, /\$status !== 200 && !\(\$status === 409 && self::is_verified_replay_response\(\$response\)\)/);
  assert.match(queue, /clear_reconciliation_marker\(\$marker\['raw'\]\)/);
  assert.match(queue, /acquire_reconciliation_lock\(\)/);
  assert.match(queue, /finally \{\s*self::release_reconciliation_lock\(\)/);
  assert.match(queue, /if \(\(string\) get_option\(self::DB_VERSION_OPTION, ''\) !== self::DB_VERSION\) return;/);
  assert.match(receiver, /revalidatePath\(pattern, 'page'\)/);
  assert.match(receiver, /routePatterns: \['\/blog\/\[slug\]'\]/);
});

test("dead-letter shadow rules preserve active work and clean only terminals", () => {
  assert.match(queue, /status = 'dead-letter'.+status IN \('queued','retry'\)/);
  assert.match(queue, /DELETE FROM \{\$table\} WHERE status IN \('completed','permanent-failure','dead-letter'\)/);
  assert.doesNotMatch(queue, /DELETE FROM.+status IN \('queued','retry'/);
  assert.match(queue, /WHERE status = 'processing' AND locked_at < %s/);
  assert.match(queue, /'status' => 'processing',[\s\S]*?'lock_token'/);
  assert.match(queue, /MAX_DELIVERY_AGE_SECONDS = 7 \* DAY_IN_SECONDS/);
  assert.match(queue, /TERMINAL_RETENTION_SECONDS = 30 \* DAY_IN_SECONDS/);
});

function retryDelayShadow(attempt: number, retryAfter: number | null): number | null {
  const delays = [60, 300, 900, 3600, 14400];
  if (attempt >= 6) return null;
  const normal = delays[Math.max(0, Math.min(delays.length - 1, attempt - 1))];
  return retryAfter === null ? normal : Math.max(normal, Math.max(60, Math.min(14400, retryAfter)));
}

test("retry shadow model keeps six attempts and bounded Retry-After", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((attempt) => retryDelayShadow(attempt, null)), [60, 300, 900, 3600, 14400]);
  assert.equal(retryDelayShadow(6, null), null);
  assert.equal(retryDelayShadow(1, 5), 60);
  assert.equal(retryDelayShadow(2, 600), 600);
  assert.equal(retryDelayShadow(3, 100_000), 14400);
  assert.match(queue, /wp_remote_retrieve_header\(\$response, 'retry-after'\)/);
  assert.match(queue, /DateTimeImmutable::createFromFormat/);
  assert.match(queue, /in_array\(\$status, \[429, 503\], true\)/);
});

test("only the exact bounded JSON replay marker completes HTTP 409", () => {
  const marker = (contentType: string, body: string) => {
    if (contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json") return false;
    if (Buffer.byteLength(body) > 1024) return false;
    try {
      const parsed = JSON.parse(body) as unknown;
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        && Object.keys(parsed).length === 1
        && (parsed as { code?: unknown }).code === "replayed-event";
    } catch { return false; }
  };
  assert.equal(marker("application/json; charset=utf-8", '{"code":"replayed-event"}'), true);
  assert.equal(marker("text/html", '{"code":"replayed-event"}'), false);
  assert.equal(marker("application/json", '{"code":"other"}'), false);
  assert.equal(marker("application/json", '{"code":"replayed-event","extra":true}'), false);
  assert.match(queue, /\$status === 409 && self::is_verified_replay_response\(\$response\)/);
  assert.match(queue, /'limit_response_size' => self::REPLAY_RESPONSE_LIMIT_BYTES/);
  assert.match(receiver, /\{ code: REVALIDATION_REPLAY_CODE \}/);
});

function destinationShadowIsValid(environment: string, raw: string): boolean {
  try {
    const url = new URL(raw);
    const clean = url.username === "" && url.password === "" && url.search === "" && url.hash === "" && url.pathname.replace(/\/$/, "") === "";
    if (environment === "production") return clean && raw === "https://cooketricks.com";
    if (environment === "staging") return clean && url.protocol === "https:" && url.port === "" && !["cooketricks.com", "www.cooketricks.com", "cms.cooketricks.com"].includes(url.hostname);
    if (environment === "local") return clean && url.protocol === "http:" && url.port !== "" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return false;
  } catch { return false; }
}

test("source-only environment destination model isolates production, staging, and local", () => {
  assert.equal(destinationShadowIsValid("production", "https://cooketricks.com"), true);
  assert.equal(destinationShadowIsValid("production", "https://www.cooketricks.com"), false);
  assert.equal(destinationShadowIsValid("production", "https://cooketricks.com:443"), false);
  assert.equal(destinationShadowIsValid("staging", "https://staging.example.test"), true);
  for (const url of ["https://cooketricks.com", "https://www.cooketricks.com", "https://cms.cooketricks.com", "http://staging.example.test", "https://staging.example.test:8443", "https://user:pass@staging.example.test", "https://staging.example.test?x=1"]) {
    assert.equal(destinationShadowIsValid("staging", url), false, url);
  }
  assert.equal(destinationShadowIsValid("local", "http://localhost:3000"), true);
  assert.equal(destinationShadowIsValid("local", "http://127.0.0.1:3000"), true);
  assert.equal(destinationShadowIsValid("local", "http://127.0.0.1"), false);
  assert.equal(destinationShadowIsValid("local", "https://localhost:3000"), false);
  assert.equal(destinationShadowIsValid("local", "http://example.test:3000"), false);
  assert.equal(destinationShadowIsValid("invalid", "https://staging.example.test"), false);
  assert.match(integration, /wp_get_environment_type\(\)/);
  assert.match(integration, /COOKETRICKS_STAGING_FRONTEND_ORIGIN/);
  assert.match(integration, /COOKETRICKS_STAGING_PREVIEW_SECRET/);
  assert.match(integration, /COOKETRICKS_LOCAL_FRONTEND_ORIGIN/);
  assert.match(integration, /PRODUCTION_ORIGIN = 'https:\/\/cooketricks\.com'/);
  assert.match(integration, /isset\(\$parts\['port'\]\)/);
  assert.match(queue, /wp_safe_remote_post/);
  assert.match(queue, /'redirection' => 0/);
});

function localSafeRequestShadow(
  environment: string,
  configuredUrl: string,
  requestUrl: string,
): boolean {
  if (!['local', 'development'].includes(environment) || configuredUrl !== requestUrl) return false;
  try {
    const url = new URL(requestUrl);
    return url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && url.port !== ''
      && url.pathname === '/api/revalidate'
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === '';
  } catch {
    return false;
  }
}

test("local safe HTTP exception accepts only the exact configured loopback revalidation URL", () => {
  const configured = 'http://127.0.0.1:3100/api/revalidate';
  assert.equal(localSafeRequestShadow('local', configured, configured), true);
  assert.equal(localSafeRequestShadow('development', configured, configured), true);
  for (const request of [
    'http://localhost:3100/api/revalidate',
    'http://127.0.0.1:3101/api/revalidate',
    'http://127.0.0.1:3100/other',
    'http://127.0.0.1:3100/api/revalidate?next=x',
    'http://127.0.0.1:3100/api/revalidate#fragment',
    'http://user:pass@127.0.0.1:3100/api/revalidate',
    'http://192.168.1.10:3100/api/revalidate',
  ]) {
    assert.equal(localSafeRequestShadow('local', configured, request), false, request);
  }
  assert.equal(localSafeRequestShadow('production', configured, configured), false);
  assert.equal(localSafeRequestShadow('staging', configured, configured), false);
  assert.match(integration, /allows_local_safe_revalidation_request/);
  assert.match(integration, /in_array\(wp_get_environment_type\(\), \['local', 'development'\], true\)/);
  assert.match(integration, /hash_equals\(\$configuration\['url'\], \$url\)/);
  assert.match(integration, /\(\$parts\['path'\] \?\? ''\) === '\/api\/revalidate'/);
});

test("local safe HTTP filters are request-scoped and preserve safe POST delivery", () => {
  let registered = 0;
  const request = (result: 'success' | 'wp-error') => {
    registered += 2;
    try {
      return result;
    } finally {
      registered -= 2;
    }
  };
  assert.equal(request('success'), 'success');
  assert.equal(registered, 0);
  assert.equal(request('wp-error'), 'wp-error');
  assert.equal(registered, 0);
  assert.match(queue, /register_local_safe_request_filters\(\$configuration\['url'\]\)/);
  assert.match(queue, /add_filter\('http_request_host_is_external', \$external, PHP_INT_MAX, 3\)/);
  assert.match(queue, /add_filter\('http_allowed_safe_ports', \$ports, PHP_INT_MAX, 3\)/);
  assert.match(queue, /finally \{\s*self::remove_local_safe_request_filters\(\$filters\);\s*\}/);
  assert.match(queue, /remove_filter\('http_request_host_is_external', \$filters\['external'\], PHP_INT_MAX\)/);
  assert.match(queue, /remove_filter\('http_allowed_safe_ports', \$filters\['ports'\], PHP_INT_MAX\)/);
  assert.match(queue, /return wp_safe_remote_post\(\$configuration\['url'\], \[/);
  assert.match(queue, /'redirection' => 0/);
});

test("secret shadow requirements enforce length and separation", () => {
  const valid = (preview: string, revalidation: string) =>
    Buffer.byteLength(preview) >= 32
    && Buffer.byteLength(revalidation) >= 32
    && preview !== revalidation;
  assert.equal(valid("a".repeat(32), "b".repeat(32)), true);
  assert.equal(valid("a".repeat(31), "b".repeat(32)), false);
  assert.equal(valid("a".repeat(32), "a".repeat(32)), false);
  assert.match(integration, /MINIMUM_SECRET_BYTES = 32/);
  assert.match(integration, /hash_equals\(\$preview_secret, \$revalidation_secret\)/);
  assert.match(integration, /secret_separation/);
});

test("worker and scheduling are bounded and observable", () => {
  assert.match(queue, /MAX_BATCH = 4/);
  assert.match(queue, /HTTP_TIMEOUT_SECONDS = 4/);
  assert.match(queue, /WORKER_BUDGET_SECONDS = 20/);
  assert.match(queue, /hrtime\(true\)/);
  assert.match(queue, /elapsed_seconds >= self::WORKER_BUDGET_SECONDS - self::HTTP_TIMEOUT_SECONDS/);
  assert.match(queue, /wp_next_scheduled\(self::CRON_HOOK\)/);
  assert.match(queue, /wp_schedule_event\([\s\S]*?\[\],[\s\S]*?true[\s\S]*?\)/);
  assert.match(queue, /record_operational_diagnostic\('scheduling'/);
});

test("lifecycle preserves data, rejects network activation, and keeps rollback", () => {
  assert.match(main, /activate\(bool \$network_wide = false\)/);
  assert.match(main, /if \(\$network_wide\)/);
  assert.match(main, /does not support network activation/);
  assert.match(main, /is_network_active\(\)/);
  assert.match(main, /CT_Delivery_Queue::activate\(\)/);
  assert.match(main, /CT_Delivery_Queue::deactivate\(\)/);
  assert.match(queue, /dbDelta\(\$sql\)/);
  assert.match(queue, /wp_clear_scheduled_hook\(self::CRON_HOOK\)/);
  assert.doesNotMatch(`${main}\n${queue}`, /DROP TABLE|register_uninstall_hook/i);
  assert.match(readme, /cooketricks-headless-v2\.3\.0/);
});

test("release stores and logs no credentials, signatures, or response bodies", () => {
  assert.doesNotMatch(queue, /error_log|Authorization/i);
  assert.doesNotMatch(queue, /(?:secret|signature|header|private_notes?)\s+(?:long)?text/i);
  assert.doesNotMatch(allCurrentSource, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(allCurrentSource, /\bAKIA[0-9A-Z]{16}\b/);
  assert.doesNotMatch(allCurrentSource, /\bgh[pousr]_[A-Za-z0-9]{20,}\b/);
  assert.doesNotMatch(allCurrentSource, /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/);
  assert.doesNotMatch(queue, /last_error.+wp_remote_retrieve_body/);
  assert.match(integration, /substr\(sanitize_key\(\$code\), 0, 48\)/);
});
