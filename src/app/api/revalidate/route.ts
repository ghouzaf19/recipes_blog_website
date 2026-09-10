import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import {
  InMemoryReplayStore,
  parseStrictBoolean,
  readBoundedRequestBody,
  RequestBodyError,
  type SecurityResult,
  type ReplayStore,
  type VerifiedRevalidation,
  verifyLegacyRevalidation,
  verifyRevalidationV2,
} from '@/lib/cooketricks-security';

export const runtime = 'nodejs';

/*
 * Transitional, best-effort replay protection. This store is intentionally
 * replaceable: it is process-local and cannot coordinate multiple instances.
 */
const replayStore = new InMemoryReplayStore();
export const REVALIDATION_REPLAY_CODE = 'replayed-event';

export interface RevalidationDependencies {
  replayStore: ReplayStore;
  authorize: (
    request: Request,
    rawBody: string,
    replayStore: ReplayStore,
  ) => SecurityResult<VerifiedRevalidation>;
  invalidate: (verified: VerifiedRevalidation) => void | Promise<void>;
}

function authorization(
  request: Request,
  rawBody: string,
  store: ReplayStore,
): SecurityResult<VerifiedRevalidation> {
  const secret = process.env.COOKETRICKS_REVALIDATE_SECRET ?? '';
  const hasV2Header = [
    'x-cooketricks-version',
    'x-cooketricks-timestamp',
    'x-cooketricks-event-id',
    'x-cooketricks-signature',
  ].some((name) => request.headers.has(name));

  if (hasV2Header) {
    return verifyRevalidationV2(
      request.headers,
      rawBody,
      secret,
      store,
    );
  }

  const legacyEnabled = parseStrictBoolean(
    process.env.COOKETRICKS_ACCEPT_LEGACY_REVALIDATION,
    true,
  );

  return verifyLegacyRevalidation(
    request.headers,
    rawBody,
    secret,
    legacyEnabled,
  );
}

export function getRevalidationTargets(verified: VerifiedRevalidation): {
  paths: string[];
  routePatterns: string[];
  tags: string[];
} {
  const { body } = verified;
  if (body.event === 'reconcile') {
    return {
      tags: ['blog-index', 'post'],
      paths: ['/', '/blog', '/sitemap.xml'],
      routePatterns: ['/blog/[slug]'],
    };
  }
  const slugs = new Set<string>();
  if (body.slug) slugs.add(body.slug);
  if (body.previousSlug) slugs.add(body.previousSlug);

  return {
    tags: [
      'blog-index',
      'post',
      ...[...slugs].map((slug) => `post:${slug}`),
    ],
    paths: [
      '/',
      '/blog',
      '/sitemap.xml',
      ...[...slugs].map((slug) => `/blog/${slug}`),
    ],
    routePatterns: [],
  };
}

function invalidateWordPressContent(verified: VerifiedRevalidation): void {
  const targets = getRevalidationTargets(verified);

  for (const tag of targets.tags) revalidateTag(tag, 'max');
  for (const path of targets.paths) revalidatePath(path);
  for (const pattern of targets.routePatterns) revalidatePath(pattern, 'page');
}

const defaultDependencies: RevalidationDependencies = {
  replayStore,
  authorize: authorization,
  invalidate: invalidateWordPressContent,
};

function unavailableResponse(retryAfter?: number): Response {
  const headers = retryAfter
    ? { 'Retry-After': String(retryAfter) }
    : undefined;
  return new Response('Revalidation is temporarily unavailable.', {
    status: 503,
    headers,
  });
}

export async function handleRevalidationRequest(
  request: Request,
  dependencies: RevalidationDependencies = defaultDependencies,
): Promise<Response> {
  let rawBody: string;

  try {
    rawBody = await readBoundedRequestBody(request);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return new Response('Invalid revalidation request.', { status: 400 });
    }

    return unavailableResponse();
  }

  let verified: SecurityResult<VerifiedRevalidation>;

  try {
    verified = dependencies.authorize(
      request,
      rawBody,
      dependencies.replayStore,
    );
  } catch {
    return unavailableResponse();
  }

  if (!verified.ok) {
    if (verified.code === REVALIDATION_REPLAY_CODE) {
      return NextResponse.json(
        { code: REVALIDATION_REPLAY_CODE },
        { status: 409 },
      );
    }
    const headers = verified.code === 'replay-capacity'
      ? { 'Retry-After': '5' }
      : undefined;
    return new Response(verified.message, {
      status: verified.status,
      headers,
    });
  }

  const { body, eventId, protocol } = verified.value;

  try {
    await dependencies.invalidate(verified.value);
    if (eventId) dependencies.replayStore.complete(eventId);
  } catch {
    if (eventId) dependencies.replayStore.release(eventId);
    console.error('[revalidate:invalidation] Cache invalidation failed.');
    return unavailableResponse(5);
  }

  return NextResponse.json({
    revalidated: true,
    event: body.event,
    eventId,
    protocol,
  });
}

export async function POST(request: NextRequest) {
  return handleRevalidationRequest(request);
}
