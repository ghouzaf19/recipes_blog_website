import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { register } from 'node:module';
import test from 'node:test';
import type { ReplayStore } from '../src/lib/cooketricks-security.ts';

const securityModuleUrl = new URL(
  '../src/lib/cooketricks-security.ts',
  import.meta.url,
).href;
const siteModuleUrl = new URL('../src/lib/site.ts', import.meta.url).href;
const wordpressModuleUrl = new URL('../src/lib/wordpress.ts', import.meta.url).href;

const loaderSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return {
      url: 'data:text/javascript,export%20default%20%7B%7D',
      shortCircuit: true,
    };
  }

  const aliases = ${JSON.stringify({
    '@/lib/cooketricks-security': 'SECURITY_MODULE_URL',
    '@/lib/site': 'SITE_MODULE_URL',
    '@/lib/wordpress': 'WORDPRESS_MODULE_URL',
  })};
  const targets = {
    SECURITY_MODULE_URL: ${JSON.stringify(securityModuleUrl)},
    SITE_MODULE_URL: ${JSON.stringify(siteModuleUrl)},
    WORDPRESS_MODULE_URL: ${JSON.stringify(wordpressModuleUrl)},
  };
  if (specifier in aliases) {
    return { url: targets[aliases[specifier]], shortCircuit: true };
  }

  if (['next/cache', 'next/headers', 'next/server'].includes(specifier)) {
    return nextResolve(specifier + '.js', context);
  }

  return nextResolve(specifier, context);
}
`;

register(
  `data:text/javascript,${encodeURIComponent(loaderSource)}`,
  import.meta.url,
);

const security = await import('../src/lib/cooketricks-security.ts');
const wordpress = await import('../src/lib/wordpress.ts');
const previewRoute = await import('../src/app/api/preview/route.ts');
const revalidationRoute = await import('../src/app/api/revalidate/route.ts');

const NOW = 2_000_000_000;
const SECRET = 'test-only-preview-secret-that-is-not-a-real-credential';
const REVALIDATION_SECRET =
  'test-only-revalidation-secret-that-is-not-a-real-credential';
const NONCE = 'AbCdEfGhIjKlMnOpQrStUg';
const EVENT_ID = '123e4567-e89b-42d3-a456-426614174000';

function previewParams(
  overrides: Partial<{
    version: string;
    postId: string;
    issuedAt: string;
    expiresAt: string;
    nonce: string;
    signature: string;
  }> = {},
): URLSearchParams {
  const input = {
    version: '2',
    postId: '42',
    issuedAt: String(NOW - 30),
    expiresAt: String(NOW + 600),
    nonce: NONCE,
    ...overrides,
  };
  const signature =
    overrides.signature ??
    security.signPreviewV2(
      {
        postId: Number(input.postId),
        issuedAt: Number(input.issuedAt),
        expiresAt: Number(input.expiresAt),
        nonce: input.nonce,
      },
      SECRET,
    );

  return new URLSearchParams({ ...input, signature });
}

const validRevalidationBody = JSON.stringify({
  event: 'update',
  postId: 42,
  slug: 'safe-recipe-slug',
  previousSlug: 'previous-recipe-slug',
  status: 'publish',
});

function revalidationHeaders(
  rawBody = validRevalidationBody,
  overrides: Record<string, string> = {},
): Headers {
  const timestamp = overrides['X-CookeTricks-Timestamp'] ?? String(NOW);
  const eventId = overrides['X-CookeTricks-Event-ID'] ?? EVENT_ID;
  const signature = security.signRevalidationV2(
    Number(timestamp),
    eventId,
    rawBody,
    REVALIDATION_SECRET,
  );

  return new Headers({
    'Content-Type': 'application/json',
    'X-CookeTricks-Version': '2',
    'X-CookeTricks-Timestamp': timestamp,
    'X-CookeTricks-Event-ID': eventId,
    'X-CookeTricks-Signature': `v1=${signature}`,
    ...overrides,
  });
}

function revalidationRequest(
  rawBody = validRevalidationBody,
  headers = revalidationHeaders(rawBody),
): Request {
  return new Request('https://cooketricks.com/api/revalidate', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

function routeAuthorization(
  request: Request,
  rawBody: string,
  store: ReplayStore,
) {
  return security.verifyRevalidationV2(
    request.headers,
    rawBody,
    REVALIDATION_SECRET,
    store,
    NOW,
  );
}

test('canonical v2 payloads use literal newline separators', () => {
  assert.equal(
    security.previewV2Payload({
      postId: 42,
      issuedAt: NOW - 30,
      expiresAt: NOW + 600,
      nonce: NONCE,
    }),
    `preview:v2\n42\n${NOW - 30}\n${NOW + 600}\n${NONCE}`,
  );
  assert.equal(
    security.revalidationV2Payload(NOW, EVENT_ID, validRevalidationBody),
    `revalidate:v2\n${NOW}\n${EVENT_ID}\n${validRevalidationBody}`,
  );
});

test('valid preview v2 signature is accepted', () => {
  const result = security.verifyPreviewV2(previewParams(), SECRET, NOW);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, {
      postId: 42,
      expiresAt: NOW + 600,
      protocol: 'v2',
    });
  }
});

test('preview v2 rejects invalid and length-mismatched signatures without throwing', () => {
  const invalid = security.verifyPreviewV2(
    previewParams({ signature: '0'.repeat(64) }),
    SECRET,
    NOW,
  );
  const short = security.verifyPreviewV2(
    previewParams({ signature: 'abcd' }),
    SECRET,
    NOW,
  );

  assert.equal(invalid.ok, false);
  assert.equal(invalid.ok ? 0 : invalid.status, 401);
  assert.equal(short.ok, false);
  assert.equal(short.ok ? 0 : short.status, 401);
});

test('preview v2 rejects expired, future-issued, and excessive lifetimes', () => {
  const expired = security.verifyPreviewV2(
    previewParams({ issuedAt: String(NOW - 600), expiresAt: String(NOW - 1) }),
    SECRET,
    NOW,
  );
  const future = security.verifyPreviewV2(
    previewParams({ issuedAt: String(NOW + 61), expiresAt: String(NOW + 300) }),
    SECRET,
    NOW,
  );
  const excessive = security.verifyPreviewV2(
    previewParams({ issuedAt: String(NOW), expiresAt: String(NOW + 901) }),
    SECRET,
    NOW,
  );

  for (const result of [expired, future, excessive]) {
    assert.equal(result.ok, false);
    assert.equal(result.ok ? 0 : result.status, 401);
  }
});

test('preview v2 rejects malformed nonce and timestamps', () => {
  const nonce = security.verifyPreviewV2(
    previewParams({ nonce: 'not valid!' }),
    SECRET,
    NOW,
  );
  const timestamp = security.verifyPreviewV2(
    previewParams({ issuedAt: '20.5' }),
    SECRET,
    NOW,
  );

  assert.equal(nonce.ok, false);
  assert.equal(nonce.ok ? 0 : nonce.status, 400);
  assert.equal(timestamp.ok, false);
  assert.equal(timestamp.ok ? 0 : timestamp.status, 400);
});

test('preview v2 requires canonical unpadded base64url nonces with 16-64 decoded bytes', () => {
  const validMinimum = Buffer.alloc(16, 1).toString('base64url');
  const validMaximum = Buffer.alloc(64, 2).toString('base64url');
  for (const nonce of [validMinimum, validMaximum]) {
    assert.equal(
      security.verifyPreviewV2(previewParams({ nonce }), SECRET, NOW).ok,
      true,
    );
  }

  for (const nonce of [
    Buffer.alloc(15, 1).toString('base64url'),
    Buffer.alloc(65, 1).toString('base64url'),
    `${validMinimum}=`,
    'A',
    'AbCdEfGhIjKlMnOpQrStUv',
    'invalid+base64url/value',
  ]) {
    const result = security.verifyPreviewV2(
      previewParams({ nonce }),
      SECRET,
      NOW,
    );
    assert.equal(result.ok, false, nonce);
    assert.equal(result.ok ? 0 : result.status, 400, nonce);
  }
});

test('legacy preview can be explicitly enabled or disabled', () => {
  const id = 42;
  const token = createHmac('sha256', SECRET).update(String(id)).digest('hex');
  const params = new URLSearchParams({ id: String(id), token });

  assert.equal(
    security.verifyLegacyPreview(params, SECRET, true, NOW).ok,
    true,
  );
  const disabled = security.verifyLegacyPreview(params, SECRET, false, NOW);
  assert.equal(disabled.ok, false);
  assert.equal(disabled.ok ? 0 : disabled.status, 401);
});

test('environment compatibility flags use strict boolean parsing', () => {
  assert.equal(security.parseStrictBoolean(undefined, true), true);
  assert.equal(security.parseStrictBoolean('true', false), true);
  assert.equal(security.parseStrictBoolean('false', true), false);
  assert.throws(
    () => security.parseStrictBoolean('TRUE', true),
    security.SecurityConfigurationError,
  );
  assert.throws(
    () => security.parseStrictBoolean('yes', true),
    security.SecurityConfigurationError,
  );
});

test('preview session is HMAC protected and bound to one post ID', () => {
  const value = security.createPreviewSession(42, NOW + 600, SECRET);
  const session = security.verifyPreviewSession(value, SECRET, NOW);

  assert.equal(session?.postId, 42);
  assert.equal(session?.expiresAt, NOW + 600);
  assert.equal(
    security.verifyPreviewSession(value.replace('.42.', '.43.'), SECRET, NOW),
    null,
  );
  assert.equal(
    security.verifyPreviewSession(value, SECRET, NOW + 601),
    null,
  );
});

test('valid signed revalidation request is accepted with its previous slug', () => {
  const result = security.verifyRevalidationV2(
    revalidationHeaders(),
    validRevalidationBody,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.body.previousSlug, 'previous-recipe-slug');
    assert.equal(result.value.protocol, 'v2');
  }
});

test('raw-body modification invalidates a revalidation signature', () => {
  const headers = revalidationHeaders(validRevalidationBody);
  const modified = validRevalidationBody.replace('update', 'delete');
  const result = security.verifyRevalidationV2(
    headers,
    modified,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 401);
});

test('revalidation v2 rejects expired timestamps and invalid event IDs', () => {
  const oldTimestamp = String(NOW - security.REVALIDATION_MAX_SKEW_SECONDS - 1);
  const expired = security.verifyRevalidationV2(
    revalidationHeaders(validRevalidationBody, {
      'X-CookeTricks-Timestamp': oldTimestamp,
    }),
    validRevalidationBody,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );
  const invalidId = security.verifyRevalidationV2(
    revalidationHeaders(validRevalidationBody, {
      'X-CookeTricks-Event-ID': 'not-a-uuid',
    }),
    validRevalidationBody,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );

  assert.equal(expired.ok, false);
  assert.equal(expired.ok ? 0 : expired.status, 401);
  assert.equal(invalidId.ok, false);
  assert.equal(invalidId.ok ? 0 : invalidId.status, 400);
});

test('revalidation v2 rejects unknown body properties after authentication', () => {
  const body = JSON.stringify({
    event: 'update',
    postId: 42,
    slug: 'safe-recipe-slug',
    status: 'publish',
    unexpected: true,
  });
  const result = security.verifyRevalidationV2(
    revalidationHeaders(body),
    body,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 400);
});

test('revalidation v2 rejects unknown CookeTricks protocol headers', () => {
  const headers = revalidationHeaders();
  headers.set('X-CookeTricks-Unexpected', 'value');
  const result = security.verifyRevalidationV2(
    headers,
    validRevalidationBody,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 400);
});

test('accepted revalidation event IDs return 409 when replayed', () => {
  const store = new security.InMemoryReplayStore();
  const first = security.verifyRevalidationV2(
    revalidationHeaders(),
    validRevalidationBody,
    REVALIDATION_SECRET,
    store,
    NOW,
  );
  const replay = security.verifyRevalidationV2(
    revalidationHeaders(),
    validRevalidationBody,
    REVALIDATION_SECRET,
    store,
    NOW,
  );

  assert.equal(first.ok, true);
  assert.equal(replay.ok, false);
  assert.equal(replay.ok ? 0 : replay.status, 409);
});

test('replay claims complete, release, expire, and never evict live entries', () => {
  const expiring = new security.InMemoryReplayStore(5, 2);
  assert.equal(expiring.claim('event-a', 100), 'claimed');
  expiring.complete('event-a');
  assert.equal(expiring.claim('event-a', 104), 'replayed');
  assert.equal(expiring.claim('event-a', 105), 'claimed');
  expiring.release('event-a');
  assert.equal(expiring.claim('event-a', 105), 'claimed');

  const bounded = new security.InMemoryReplayStore(300, 2);
  assert.equal(bounded.claim('event-a', 100), 'claimed');
  bounded.complete('event-a');
  assert.equal(bounded.claim('event-b', 100), 'claimed');
  assert.equal(bounded.claim('event-c', 100), 'capacity');
  assert.equal(bounded.size, 2);
  assert.equal(bounded.claim('event-a', 100), 'replayed');
  assert.equal(bounded.claim('event-c', 400), 'claimed');
});

test('the 2,048-entry replay boundary preserves the oldest event', () => {
  const store = new security.InMemoryReplayStore();
  for (let index = 0; index < 2_048; index += 1) {
    assert.equal(store.claim(`event-${index}`, NOW), 'claimed');
    store.complete(`event-${index}`);
  }
  assert.equal(store.size, 2_048);
  assert.equal(store.claim('overflow', NOW), 'capacity');
  assert.equal(store.claim('event-0', NOW), 'replayed');
});

test('v2 slugs are canonical and rejected values never obtain a replay claim', () => {
  for (const slug of ['a', 'recipe-2', '123', 'a'.repeat(200)]) {
    const body = JSON.stringify({
      event: 'update', postId: 42, slug, status: 'publish',
    });
    const result = security.verifyRevalidationV2(
      revalidationHeaders(body, {
        'X-CookeTricks-Event-ID': randomUUID(),
      }),
      body,
      REVALIDATION_SECRET,
      new security.InMemoryReplayStore(),
      NOW,
    );
    assert.equal(result.ok, true, slug);
  }

  const invalid = [
    '', '.', '..', '-start', 'end-', 'two--hyphens', 'UPPER', 'a:b',
    'a%20b', 'a b', 'a/b', 'a\\b', 'a?b', 'a#b', 'a\u0000b',
    'a'.repeat(201),
  ];
  for (const slug of invalid) {
    const store = new security.InMemoryReplayStore();
    const body = JSON.stringify({
      event: 'update', postId: 42, slug, status: 'publish',
    });
    const result = security.verifyRevalidationV2(
      revalidationHeaders(body),
      body,
      REVALIDATION_SECRET,
      store,
      NOW,
    );
    assert.equal(result.ok, false, JSON.stringify(slug));
    assert.equal(store.size, 0, JSON.stringify(slug));
  }
});

test('legacy revalidation can be explicitly enabled or disabled', () => {
  const body = JSON.stringify({
    event: 'update',
    id: 42,
    slug: 'safe-recipe-slug',
    status: 'publish',
  });
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-CookeTricks-Secret': REVALIDATION_SECRET,
  });

  assert.equal(
    security.verifyLegacyRevalidation(
      headers,
      body,
      REVALIDATION_SECRET,
      true,
    ).ok,
    true,
  );
  const disabled = security.verifyLegacyRevalidation(
    headers,
    body,
    REVALIDATION_SECRET,
    false,
  );
  assert.equal(disabled.ok, false);
  assert.equal(disabled.ok ? 0 : disabled.status, 401);
});

test('legacy 2.3 auto-draft with an empty slug remains isolated from v2', () => {
  const body = JSON.stringify({
    event: 'create', id: 42, slug: '', status: 'auto-draft',
  });
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-CookeTricks-Secret': REVALIDATION_SECRET,
  });
  assert.equal(
    security.verifyLegacyRevalidation(
      headers, body, REVALIDATION_SECRET, true,
    ).ok,
    true,
  );

  const v2 = security.verifyRevalidationV2(
    revalidationHeaders(body),
    body,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );
  assert.equal(v2.ok, false);
  assert.equal(v2.ok ? 0 : v2.status, 400);
});

test('request body limits count UTF-8 bytes below, at, and above 16 KiB', async () => {
  const limit = security.REVALIDATION_BODY_LIMIT_BYTES;
  for (const bytes of [limit - 1, limit]) {
    const body = `${'é'.repeat(Math.floor(bytes / 2))}${bytes % 2 ? 'a' : ''}`;
    const request = new Request('https://cooketricks.com/api/revalidate', {
      method: 'POST', body,
    });
    assert.equal(
      Buffer.byteLength(await security.readBoundedRequestBody(request)),
      bytes,
    );
  }

  const oversized = new Request('https://cooketricks.com/api/revalidate', {
    method: 'POST', body: `${'é'.repeat(limit / 2)}a`,
  });
  await assert.rejects(
    () => security.readBoundedRequestBody(oversized),
    security.RequestBodyError,
  );
});

test('preview session integrity and post/slug restrictions fail closed', () => {
  const value = security.createPreviewSession(42, NOW + 600, SECRET);
  const session = security.verifyPreviewSession(value, SECRET, NOW);
  assert.ok(session);
  assert.equal(
    security.previewSessionMatchesPost(
      session, { id: 42, slug: 'expected-slug' }, 'expected-slug',
    ),
    true,
  );
  assert.equal(
    security.previewSessionMatchesPost(
      session, { id: 43, slug: 'expected-slug' }, 'expected-slug',
    ),
    false,
  );
  assert.equal(
    security.previewSessionMatchesPost(
      session, { id: 42, slug: 'other-slug' }, 'expected-slug',
    ),
    false,
  );
  assert.equal(security.verifyPreviewSession(`${value}x`, SECRET, NOW), null);
  assert.equal(security.verifyPreviewSession(value, SECRET, NOW + 601), null);
});

test('preview responses are no-store and successful redirects have secure cookies', async () => {
  let wordpressCalls = 0;
  let draftModeCalls = 0;
  const invalidRequest = new Request(
    'https://cooketricks.com/api/preview?version=2',
  );
  const invalidResponse = await previewRoute.handlePreviewRequest(
    invalidRequest,
    {
      authorize: (request) => security.verifyPreviewV2(
        new URL(request.url).searchParams, SECRET, NOW,
      ),
      enableDraftMode: () => { draftModeCalls += 1; },
      fetchPost: async () => {
        wordpressCalls += 1;
        return null;
      },
      previewSecret: SECRET,
      secureCookie: true,
    },
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidResponse.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(wordpressCalls, 0);
  assert.equal(draftModeCalls, 0);

  const response = await previewRoute.handlePreviewRequest(
    new Request(
      `https://cooketricks.com/api/preview?${previewParams().toString()}`,
    ),
    {
      authorize: (request) => security.verifyPreviewV2(
        new URL(request.url).searchParams, SECRET, NOW,
      ),
      enableDraftMode: () => { draftModeCalls += 1; },
      fetchPost: async (postId) => ({
        id: postId,
        slug: 'safe-recipe-slug',
      }),
      previewSecret: SECRET,
      secureCookie: true,
    },
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://cooketricks.com/blog/safe-recipe-slug?preview=1');
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  const cookie = response.headers.get('set-cookie') ?? '';
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=lax', 'Path=/', 'Expires=']) {
    assert.match(cookie, new RegExp(attribute, 'i'));
  }
  assert.equal(draftModeCalls, 1);
  assert.doesNotMatch(response.headers.get('location') ?? '', /signature|nonce|token|issuedAt|expiresAt/);
});

test('preview route distinguishes confirmed 404 from upstream failures', async () => {
  const grant = () => ({
    ok: true as const,
    value: { postId: 42, expiresAt: NOW + 600, protocol: 'v2' as const },
  });
  const cases = [
    { error: new wordpress.WordPressError('http', '/posts/42', { status: 404 }), status: 404 },
    { error: new wordpress.WordPressError('timeout', '/posts/42'), status: 503 },
    { error: new wordpress.WordPressError('network', '/posts/42'), status: 503 },
    { error: new wordpress.WordPressError('http', '/posts/42', { status: 401 }), status: 502 },
    { error: new wordpress.WordPressError('http', '/posts/42', { status: 403 }), status: 502 },
    { error: new wordpress.WordPressError('http', '/posts/42', { status: 429 }), status: 502 },
    { error: new wordpress.WordPressError('http', '/posts/42', { status: 500 }), status: 502 },
    { error: new wordpress.WordPressError('invalid-json', '/posts/42'), status: 502 },
    { error: new wordpress.WordPressError('malformed-response', '/posts/42'), status: 502 },
  ];
  for (const current of cases) {
    let draftModeCalls = 0;
    const response = await previewRoute.handlePreviewRequest(
      new Request('https://cooketricks.com/api/preview'),
      {
        authorize: grant,
        enableDraftMode: () => { draftModeCalls += 1; },
        fetchPost: async () => { throw current.error; },
        previewSecret: SECRET,
        secureCookie: true,
      },
    );
    assert.equal(response.status, current.status);
    assert.equal(draftModeCalls, 0);
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.equal((await response.text()).includes(current.error.message), false);
  }
});

test('preview never enables Draft Mode when WordPress returns the wrong post', async () => {
  let draftModeCalls = 0;
  const response = await previewRoute.handlePreviewRequest(
    new Request('https://cooketricks.com/api/preview'),
    {
      authorize: () => ({
        ok: true,
        value: { postId: 42, expiresAt: NOW + 600, protocol: 'v2' },
      }),
      enableDraftMode: () => { draftModeCalls += 1; },
      fetchPost: async () => ({ id: 43, slug: 'wrong-post' }),
      previewSecret: SECRET,
      secureCookie: true,
    },
  );
  assert.equal(response.status, 502);
  assert.equal(draftModeCalls, 0);
});

test('revalidation targets include safe global, current, and previous entries', () => {
  assert.deepEqual(
    revalidationRoute.getRevalidationTargets({
      protocol: 'v2',
      eventId: EVENT_ID,
      body: {
        event: 'update', postId: 42, slug: 'new-slug',
        previousSlug: 'old-slug', status: 'publish',
      },
    }),
    {
      tags: ['blog-index', 'post', 'post:new-slug', 'post:old-slug'],
      paths: ['/', '/blog', '/sitemap.xml', '/blog/new-slug', '/blog/old-slug'],
    },
  );

  const legacyEmpty = revalidationRoute.getRevalidationTargets({
    protocol: 'legacy',
    body: {
      event: 'create', postId: 42, slug: '', status: 'auto-draft',
    },
  });
  assert.deepEqual(legacyEmpty.tags, ['blog-index', 'post']);
  assert.deepEqual(legacyEmpty.paths, ['/', '/blog', '/sitemap.xml']);
});

test('revalidation completes successful claims and rejects a replay', async () => {
  const store = new security.InMemoryReplayStore();
  let invalidations = 0;
  const dependencies = {
    replayStore: store,
    authorize: routeAuthorization,
    invalidate: () => { invalidations += 1; },
  };
  const first = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  const replay = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  assert.equal(first.status, 200);
  assert.equal(replay.status, 409);
  assert.equal(invalidations, 1);
});

test('concurrent duplicate revalidation cannot execute invalidation twice', async () => {
  const store = new security.InMemoryReplayStore();
  let invalidations = 0;
  let releaseInvalidation!: () => void;
  const gate = new Promise<void>((resolve) => { releaseInvalidation = resolve; });
  const dependencies = {
    replayStore: store,
    authorize: routeAuthorization,
    invalidate: async () => {
      invalidations += 1;
      await gate;
    },
  };

  const firstPromise = revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  await new Promise((resolve) => setImmediate(resolve));
  const duplicate = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  assert.equal(duplicate.status, 409);
  assert.equal(invalidations, 1);
  releaseInvalidation();
  assert.equal((await firstPromise).status, 200);
});

test('failed invalidation releases its reservation for a successful retry', async () => {
  const store = new security.InMemoryReplayStore();
  let attempts = 0;
  const dependencies = {
    replayStore: store,
    authorize: routeAuthorization,
    invalidate: () => {
      attempts += 1;
      if (attempts === 1) throw new Error('test-only invalidation failure');
    },
  };
  const failed = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  const retry = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(), dependencies,
  );
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get('retry-after'), '5');
  assert.equal(retry.status, 200);
  assert.equal(attempts, 2);
});

test('full replay ledger returns safe 503 and Retry-After', async () => {
  const store = new security.InMemoryReplayStore(300, 1);
  assert.equal(store.claim('already-present', NOW), 'claimed');
  store.complete('already-present');
  let invalidations = 0;
  const response = await revalidationRoute.handleRevalidationRequest(
    revalidationRequest(),
    {
      replayStore: store,
      authorize: routeAuthorization,
      invalidate: () => { invalidations += 1; },
    },
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '5');
  assert.equal(await response.text(), 'Revalidation is temporarily unavailable.');
  assert.equal(invalidations, 0);
});

test('rejected, ambiguous, or mixed protocol requests never invalidate caches', async () => {
  const cases: Request[] = [];
  const badSignature = revalidationHeaders();
  badSignature.set('X-CookeTricks-Signature', `v1=${'0'.repeat(64)}`);
  cases.push(revalidationRequest(validRevalidationBody, badSignature));

  const wrongType = revalidationHeaders();
  wrongType.set('Content-Type', 'text/plain');
  cases.push(revalidationRequest(validRevalidationBody, wrongType));

  const combined = revalidationHeaders();
  combined.set('X-CookeTricks-Version', '2, 2');
  cases.push(revalidationRequest(validRevalidationBody, combined));

  const mixed = revalidationHeaders();
  mixed.set('X-CookeTricks-Secret', REVALIDATION_SECRET);
  cases.push(revalidationRequest(validRevalidationBody, mixed));

  let invalidations = 0;
  for (const request of cases) {
    const store = new security.InMemoryReplayStore();
    const response = await revalidationRoute.handleRevalidationRequest(
      request,
      {
        replayStore: store,
        authorize: routeAuthorization,
        invalidate: () => { invalidations += 1; },
      },
    );
    assert.notEqual(response.status, 200);
    assert.equal(store.size, 0);
  }
  assert.equal(invalidations, 0);
});

test('duplicate preview security query parameters fail closed', () => {
  const params = previewParams();
  params.append('nonce', NONCE);
  const result = security.verifyPreviewV2(params, SECRET, NOW);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? 0 : result.status, 400);
});

test('only a confirmed WordPress 404 resolves to not found', async () => {
  const missing = new wordpress.WordPressError(
    'http', '/posts/42', { status: 404 },
  );
  assert.equal(
    await wordpress.resolveWordPressPost(() => Promise.reject(missing)),
    null,
  );

  const infrastructureErrors = [
    new wordpress.WordPressError('timeout', '/posts/42'),
    new wordpress.WordPressError('network', '/posts/42'),
    new wordpress.WordPressError('invalid-json', '/posts/42'),
    new wordpress.WordPressError('malformed-response', '/posts/42'),
    new wordpress.WordPressError('http', '/posts/42', { status: 401 }),
    new wordpress.WordPressError('http', '/posts/42', { status: 403 }),
    new wordpress.WordPressError('http', '/posts/42', { status: 429 }),
    new wordpress.WordPressError('http', '/posts/42', { status: 500 }),
    new wordpress.WordPressError('http', '/posts/42', { status: 503 }),
  ];
  for (const error of infrastructureErrors) {
    await assert.rejects(
      () => wordpress.resolveWordPressPost(() => Promise.reject(error)),
      (received) => received === error,
    );
  }
});

test('security failures do not contain supplied credentials or bodies', () => {
  const signature = 'f'.repeat(64);
  const preview = security.verifyPreviewV2(
    previewParams({ signature }),
    SECRET,
    NOW,
  );
  const revalidation = security.verifyRevalidationV2(
    revalidationHeaders(),
    `${validRevalidationBody} `,
    REVALIDATION_SECRET,
    new security.InMemoryReplayStore(),
    NOW,
  );
  const output = JSON.stringify({ preview, revalidation });

  for (const sensitive of [
    SECRET,
    REVALIDATION_SECRET,
    signature,
    validRevalidationBody,
  ]) {
    assert.equal(output.includes(sensitive), false);
  }
});
