import { draftMode } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import {
  createPreviewSession,
  parseStrictBoolean,
  PREVIEW_SESSION_COOKIE,
  type PreviewGrant,
  type SecurityResult,
  verifyLegacyPreview,
  verifyPreviewV2,
} from '@/lib/cooketricks-security';
import { SITE_URL } from '@/lib/site';
import {
  getPreviewPostById,
  getWordPressErrorCategory,
  getWordPressErrorStatus,
} from '@/lib/wordpress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREVIEW_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const;

function previewResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: PREVIEW_RESPONSE_HEADERS,
  });
}

export function createPreviewSuccessResponse(
  post: { id: number; slug: string },
  grant: PreviewGrant,
  secret: string,
  secure: boolean,
): NextResponse {
  const response = NextResponse.redirect(
    `${SITE_URL}/blog/${encodeURIComponent(post.slug)}?preview=1`,
    {
      status: 307,
      headers: PREVIEW_RESPONSE_HEADERS,
    },
  );
  response.cookies.set(
    PREVIEW_SESSION_COOKIE,
    createPreviewSession(post.id, grant.expiresAt, secret),
    {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: new Date(grant.expiresAt * 1_000),
    },
  );
  return response;
}

function previewAuthorization(
  request: Request,
): SecurityResult<PreviewGrant> {
  const searchParams = new URL(request.url).searchParams;
  const secret = process.env.COOKETRICKS_PREVIEW_SECRET ?? '';

  if (searchParams.has('version')) {
    return verifyPreviewV2(searchParams, secret);
  }

  const legacyEnabled = parseStrictBoolean(
    process.env.COOKETRICKS_ACCEPT_LEGACY_PREVIEW,
    true,
  );

  return verifyLegacyPreview(
    searchParams,
    secret,
    legacyEnabled,
  );
}

export interface PreviewDependencies {
  authorize: (request: Request) => SecurityResult<PreviewGrant>;
  enableDraftMode: () => void | Promise<void>;
  fetchPost: (postId: number) => Promise<{ id: number; slug: string } | null>;
  previewSecret: string;
  secureCookie: boolean;
}

export async function handlePreviewRequest(
  request: Request,
  dependencies: PreviewDependencies,
): Promise<Response> {
  let authorization: SecurityResult<PreviewGrant>;

  try {
    authorization = dependencies.authorize(request);
  } catch {
    return previewResponse('Preview is temporarily unavailable.', 503);
  }

  if (!authorization.ok) {
    return previewResponse(authorization.message, authorization.status);
  }

  let post;

  try {
    post = await dependencies.fetchPost(authorization.value.postId);
  } catch (error) {
    const status = getWordPressErrorStatus(error);

    if (status === 404) {
      return previewResponse('Post not found.', 404);
    }

    const category = getWordPressErrorCategory(error);
    const upstreamStatus =
      category === 'timeout' || category === 'network' ? 503 : 502;

    console.error(`[preview:wordpress:${category}] Preview fetch failed.`);
    return previewResponse('Preview is temporarily unavailable.', upstreamStatus);
  }

  if (!post || post.id !== authorization.value.postId) {
    return previewResponse('Preview is temporarily unavailable.', 502);
  }

  await dependencies.enableDraftMode();
  return createPreviewSuccessResponse(
    post,
    authorization.value,
    dependencies.previewSecret,
    dependencies.secureCookie,
  );
}

export async function GET(request: NextRequest) {
  return handlePreviewRequest(request, {
    authorize: previewAuthorization,
    enableDraftMode: async () => { (await draftMode()).enable(); },
    fetchPost: getPreviewPostById,
    previewSecret: process.env.COOKETRICKS_PREVIEW_SECRET ?? '',
    secureCookie: process.env.NODE_ENV === 'production',
  });
}
