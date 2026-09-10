import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const PREVIEW_MAX_LIFETIME_SECONDS = 15 * 60;
export const PREVIEW_MAX_FUTURE_SKEW_SECONDS = 60;
export const REVALIDATION_MAX_SKEW_SECONDS = 5 * 60;
export const REVALIDATION_BODY_LIMIT_BYTES = 16 * 1024;
export const PREVIEW_SESSION_COOKIE = 'cooketricks-preview-session';

const PREVIEW_NONCE_MIN_LENGTH = 16;
const PREVIEW_NONCE_MIN_BYTES = 16;
const PREVIEW_NONCE_MAX_BYTES = 64;
const REVALIDATION_REPLAY_MAX_ENTRIES = 2_048;

type FailureStatus = 400 | 401 | 409 | 503;
export type ReplayClaimResult = 'claimed' | 'replayed' | 'capacity';

export type SecurityResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      status: FailureStatus;
      code: string;
      message: string;
    };

export interface PreviewGrant {
  postId: number;
  expiresAt: number;
  protocol: 'v2' | 'legacy';
}

export interface RevalidationBody {
  event: 'create' | 'update' | 'delete' | 'status-change';
  postId: number;
  slug: string;
  previousSlug?: string;
  status:
    | 'auto-draft'
    | 'draft'
    | 'pending'
    | 'future'
    | 'publish'
    | 'private'
    | 'trash';
}

export interface VerifiedRevalidation {
  body: RevalidationBody;
  eventId?: string;
  protocol: 'v2' | 'legacy';
}

export interface ReplayStore {
  claim(eventId: string, nowSeconds: number): ReplayClaimResult;
  complete(eventId: string): void;
  release(eventId: string): void;
}

export class SecurityConfigurationError extends Error {
  constructor() {
    super('CookeTricks security configuration is invalid.');
    this.name = 'SecurityConfigurationError';
  }
}

export class RequestBodyError extends Error {
  constructor() {
    super('Request body is invalid.');
    this.name = 'RequestBodyError';
  }
}

export class InMemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<
    string,
    { expiresAt: number; state: 'reserved' | 'completed' }
  >();
  private readonly ttlSeconds: number;
  private readonly maxEntries: number;

  constructor(
    ttlSeconds = REVALIDATION_MAX_SKEW_SECONDS,
    maxEntries = REVALIDATION_REPLAY_MAX_ENTRIES,
  ) {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
      throw new SecurityConfigurationError();
    }

    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new SecurityConfigurationError();
    }

    this.ttlSeconds = ttlSeconds;
    this.maxEntries = maxEntries;
  }

  claim(eventId: string, nowSeconds: number): ReplayClaimResult {
    this.removeExpired(nowSeconds);

    if (this.entries.has(eventId)) {
      return 'replayed';
    }

    if (this.entries.size >= this.maxEntries) {
      return 'capacity';
    }

    this.entries.set(eventId, {
      expiresAt: nowSeconds + this.ttlSeconds,
      state: 'reserved',
    });
    return 'claimed';
  }

  complete(eventId: string): void {
    const entry = this.entries.get(eventId);
    if (entry) entry.state = 'completed';
  }

  release(eventId: string): void {
    const entry = this.entries.get(eventId);
    if (entry?.state === 'reserved') this.entries.delete(eventId);
  }

  get size(): number {
    return this.entries.size;
  }

  private removeExpired(nowSeconds: number): void {
    for (const [eventId, entry] of this.entries) {
      if (entry.expiresAt <= nowSeconds) this.entries.delete(eventId);
    }
  }
}

function failure(
  status: FailureStatus,
  code: string,
  message: string,
): SecurityResult<never> {
  return { ok: false, status, code, message };
}

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function positiveInteger(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function unixSeconds(value: string | null): number | null {
  if (!value || !/^(?:0|[1-9]\d*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function hasExactQueryKeys(
  searchParams: URLSearchParams,
  expectedKeys: readonly string[],
): boolean {
  const expected = new Set(expectedKeys);
  const actual = new Set(searchParams.keys());

  if (actual.size !== expected.size) return false;

  for (const key of expected) {
    if (!actual.has(key) || searchParams.getAll(key).length !== 1) return false;
  }

  return true;
}

function validNonce(value: string | null): value is string {
  if (
    !value ||
    value.length < PREVIEW_NONCE_MIN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64url');
  return (
    decoded.byteLength >= PREVIEW_NONCE_MIN_BYTES &&
    decoded.byteLength <= PREVIEW_NONCE_MAX_BYTES &&
    decoded.toString('base64url') === value
  );
}

function validSignature(value: string | null): value is string {
  return Boolean(value && /^[a-fA-F0-9]{64}$/.test(value));
}

function validUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function validSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function parseStrictBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new SecurityConfigurationError();
}

export function previewV2Payload(input: {
  postId: number;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}): string {
  return [
    'preview:v2',
    input.postId,
    input.issuedAt,
    input.expiresAt,
    input.nonce,
  ].join('\n');
}

export function signPreviewV2(
  input: {
    postId: number;
    issuedAt: number;
    expiresAt: number;
    nonce: string;
  },
  secret: string,
): string {
  return hmac(previewV2Payload(input), secret);
}

export function verifyPreviewV2(
  searchParams: URLSearchParams,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): SecurityResult<PreviewGrant> {
  if (!secret) {
    return failure(503, 'configuration', 'Preview is temporarily unavailable.');
  }

  if (
    !hasExactQueryKeys(searchParams, [
      'version',
      'postId',
      'issuedAt',
      'expiresAt',
      'nonce',
      'signature',
    ]) ||
    searchParams.get('version') !== '2'
  ) {
    return failure(400, 'malformed-preview', 'Invalid preview request.');
  }

  const postId = positiveInteger(searchParams.get('postId'));
  const issuedAt = unixSeconds(searchParams.get('issuedAt'));
  const expiresAt = unixSeconds(searchParams.get('expiresAt'));
  const nonce = searchParams.get('nonce');
  const signature = searchParams.get('signature');

  if (
    postId === null ||
    issuedAt === null ||
    expiresAt === null ||
    !validNonce(nonce)
  ) {
    return failure(400, 'malformed-preview', 'Invalid preview request.');
  }

  if (!validSignature(signature)) {
    return failure(401, 'invalid-preview', 'Preview authorization failed.');
  }

  if (
    expiresAt <= nowSeconds ||
    issuedAt > nowSeconds + PREVIEW_MAX_FUTURE_SKEW_SECONDS ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > PREVIEW_MAX_LIFETIME_SECONDS
  ) {
    return failure(401, 'invalid-preview-window', 'Preview authorization failed.');
  }

  const expected = signPreviewV2(
    { postId, issuedAt, expiresAt, nonce },
    secret,
  );

  if (!safeEqual(signature.toLowerCase(), expected)) {
    return failure(401, 'invalid-preview', 'Preview authorization failed.');
  }

  return {
    ok: true,
    value: { postId, expiresAt, protocol: 'v2' },
  };
}

export function verifyLegacyPreview(
  searchParams: URLSearchParams,
  secret: string,
  enabled: boolean,
  nowSeconds = Math.floor(Date.now() / 1_000),
): SecurityResult<PreviewGrant> {
  if (!enabled) {
    return failure(401, 'legacy-preview-disabled', 'Preview authorization failed.');
  }

  if (!secret) {
    return failure(503, 'configuration', 'Preview is temporarily unavailable.');
  }

  if (!hasExactQueryKeys(searchParams, ['id', 'token'])) {
    return failure(400, 'malformed-preview', 'Invalid preview request.');
  }

  const postId = positiveInteger(searchParams.get('id'));
  const token = searchParams.get('token');

  if (postId === null || !validSignature(token)) {
    return failure(400, 'malformed-preview', 'Invalid preview request.');
  }

  const expected = hmac(String(postId), secret);
  if (!safeEqual(token.toLowerCase(), expected)) {
    return failure(401, 'invalid-preview', 'Preview authorization failed.');
  }

  return {
    ok: true,
    value: {
      postId,
      expiresAt: nowSeconds + PREVIEW_MAX_LIFETIME_SECONDS,
      protocol: 'legacy',
    },
  };
}

function previewSessionPayload(postId: number, expiresAt: number): string {
  return ['preview-session:v1', postId, expiresAt].join('\n');
}

export function createPreviewSession(
  postId: number,
  expiresAt: number,
  secret: string,
): string {
  if (
    !secret ||
    !Number.isSafeInteger(postId) ||
    postId < 1 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt < 1
  ) {
    throw new SecurityConfigurationError();
  }

  const signature = hmac(previewSessionPayload(postId, expiresAt), secret);
  return `v1.${postId}.${expiresAt}.${signature}`;
}

export function verifyPreviewSession(
  value: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): PreviewGrant | null {
  if (!value || !secret) return null;

  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;

  const postId = positiveInteger(parts[1]);
  const expiresAt = unixSeconds(parts[2]);
  const signature = parts[3];

  if (
    postId === null ||
    expiresAt === null ||
    expiresAt <= nowSeconds ||
    !validSignature(signature)
  ) {
    return null;
  }

  const expected = hmac(previewSessionPayload(postId, expiresAt), secret);
  if (!safeEqual(signature.toLowerCase(), expected)) return null;

  return { postId, expiresAt, protocol: 'v2' };
}

export function previewSessionMatchesPost(
  session: PreviewGrant,
  post: { id: number; slug: string },
  requestedSlug: string,
): boolean {
  return session.postId === post.id && post.slug === requestedSlug;
}

export function revalidationV2Payload(
  timestamp: number,
  eventId: string,
  rawBody: string,
): string {
  return ['revalidate:v2', timestamp, eventId, rawBody].join('\n');
}

export function signRevalidationV2(
  timestamp: number,
  eventId: string,
  rawBody: string,
  secret: string,
): string {
  return hmac(revalidationV2Payload(timestamp, eventId, rawBody), secret);
}

function customCookeTricksHeaders(headers: Headers): string[] {
  return [...headers.keys()].filter((name) =>
    name.toLowerCase().startsWith('x-cooketricks-'),
  );
}

function hasJsonContentType(headers: Headers): boolean {
  return (
    headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ===
    'application/json'
  );
}

function parseRevalidationBody(rawBody: string): SecurityResult<RevalidationBody> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return failure(400, 'malformed-body', 'Invalid revalidation request.');
  }

  if (
    !isRecord(parsed) ||
    !hasOnlyKeys(parsed, [
      'event',
      'postId',
      'slug',
      'previousSlug',
      'status',
    ])
  ) {
    return failure(400, 'malformed-body', 'Invalid revalidation request.');
  }

  const events = ['create', 'update', 'delete', 'status-change'] as const;
  const statuses = [
    'draft',
    'pending',
    'future',
    'publish',
    'private',
    'trash',
  ] as const;
  const postId = parsed.postId;

  if (
    !events.includes(parsed.event as (typeof events)[number]) ||
    typeof postId !== 'number' ||
    !Number.isSafeInteger(postId) ||
    postId < 1 ||
    !validSlug(parsed.slug) ||
    !statuses.includes(parsed.status as (typeof statuses)[number]) ||
    (parsed.previousSlug !== undefined && !validSlug(parsed.previousSlug))
  ) {
    return failure(400, 'malformed-body', 'Invalid revalidation request.');
  }

  const body: RevalidationBody = {
    event: parsed.event as RevalidationBody['event'],
    postId,
    slug: parsed.slug,
    status: parsed.status as RevalidationBody['status'],
  };

  if (parsed.previousSlug !== undefined) {
    body.previousSlug = parsed.previousSlug;
  }

  return { ok: true, value: body };
}

export function verifyRevalidationV2(
  headers: Headers,
  rawBody: string,
  secret: string,
  replayStore: ReplayStore,
  nowSeconds = Math.floor(Date.now() / 1_000),
): SecurityResult<VerifiedRevalidation> {
  if (!secret) {
    return failure(503, 'configuration', 'Revalidation is temporarily unavailable.');
  }

  const allowedHeaders = new Set([
    'x-cooketricks-version',
    'x-cooketricks-timestamp',
    'x-cooketricks-event-id',
    'x-cooketricks-signature',
  ]);
  const customHeaders = customCookeTricksHeaders(headers);

  if (
    customHeaders.some((name) => !allowedHeaders.has(name.toLowerCase())) ||
    headers.get('x-cooketricks-version') !== '2' ||
    !hasJsonContentType(headers)
  ) {
    return failure(400, 'malformed-headers', 'Invalid revalidation request.');
  }

  const timestamp = unixSeconds(headers.get('x-cooketricks-timestamp'));
  const eventId = headers.get('x-cooketricks-event-id');
  const signatureHeader = headers.get('x-cooketricks-signature');
  const signature = signatureHeader?.startsWith('v1=')
    ? signatureHeader.slice(3)
    : null;

  if (timestamp === null || !validUuid(eventId)) {
    return failure(400, 'malformed-headers', 'Invalid revalidation request.');
  }

  if (!validSignature(signature)) {
    return failure(401, 'invalid-signature', 'Revalidation authorization failed.');
  }

  if (Math.abs(nowSeconds - timestamp) > REVALIDATION_MAX_SKEW_SECONDS) {
    return failure(401, 'invalid-timestamp', 'Revalidation authorization failed.');
  }

  const expected = signRevalidationV2(timestamp, eventId, rawBody, secret);
  if (!safeEqual(signature.toLowerCase(), expected)) {
    return failure(401, 'invalid-signature', 'Revalidation authorization failed.');
  }

  const body = parseRevalidationBody(rawBody);
  if (!body.ok) return body;

  const claim = replayStore.claim(eventId, nowSeconds);
  if (claim === 'replayed') {
    return failure(409, 'replayed-event', 'Revalidation event was already accepted.');
  }
  if (claim === 'capacity') {
    return failure(503, 'replay-capacity', 'Revalidation is temporarily unavailable.');
  }

  return {
    ok: true,
    value: { body: body.value, eventId, protocol: 'v2' },
  };
}

export function verifyLegacyRevalidation(
  headers: Headers,
  rawBody: string,
  secret: string,
  enabled: boolean,
): SecurityResult<VerifiedRevalidation> {
  if (!enabled) {
    return failure(
      401,
      'legacy-revalidation-disabled',
      'Revalidation authorization failed.',
    );
  }

  if (!secret) {
    return failure(503, 'configuration', 'Revalidation is temporarily unavailable.');
  }

  const customHeaders = customCookeTricksHeaders(headers);
  if (
    customHeaders.length !== 1 ||
    customHeaders[0].toLowerCase() !== 'x-cooketricks-secret' ||
    !hasJsonContentType(headers)
  ) {
    return failure(400, 'malformed-headers', 'Invalid revalidation request.');
  }

  const supplied = headers.get('x-cooketricks-secret') ?? '';
  if (!supplied || !safeEqual(supplied, secret)) {
    return failure(401, 'invalid-secret', 'Revalidation authorization failed.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return failure(400, 'malformed-body', 'Invalid revalidation request.');
  }

  if (
    !isRecord(parsed) ||
    !hasOnlyKeys(parsed, ['event', 'id', 'slug', 'status']) ||
    !['create', 'update', 'delete'].includes(String(parsed.event)) ||
    typeof parsed.id !== 'number' ||
    !Number.isSafeInteger(parsed.id) ||
    parsed.id < 1 ||
    (parsed.slug !== '' && !validSlug(parsed.slug)) ||
    !['auto-draft', 'draft', 'pending', 'future', 'publish', 'private', 'trash'].includes(
      String(parsed.status),
    )
  ) {
    return failure(400, 'malformed-body', 'Invalid revalidation request.');
  }

  return {
    ok: true,
    value: {
      protocol: 'legacy',
      body: {
        event: parsed.event as RevalidationBody['event'],
        postId: parsed.id,
        slug: parsed.slug,
        status: parsed.status as RevalidationBody['status'],
      },
    },
  };
}

export async function readBoundedRequestBody(
  request: Request,
  maximumBytes = REVALIDATION_BODY_LIMIT_BYTES,
): Promise<string> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (
      !/^\d+$/.test(contentLength) ||
      !Number.isSafeInteger(parsedLength) ||
      parsedLength > maximumBytes
    ) {
      throw new RequestBodyError();
    }
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytesRead = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) throw new RequestBodyError();
      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError();
  } finally {
    reader.releaseLock();
  }
}
