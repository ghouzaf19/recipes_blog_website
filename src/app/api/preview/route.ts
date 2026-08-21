import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { getPreviewPostById, validPreviewToken } from '@/lib/wordpress';

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('id'));
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!validPreviewToken(id, token)) return new Response('Invalid preview link', { status: 401 });
  const post = await getPreviewPostById(id);
  if (!post) return new Response('Post not found', { status: 404 });
  (await draftMode()).enable();
  redirect(`/blog/preview?preview_id=${post.id}&preview_token=${encodeURIComponent(token)}`);
}
