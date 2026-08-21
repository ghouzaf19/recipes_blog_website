import { createHmac, timingSafeEqual } from 'node:crypto';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { getPreviewPostById } from '@/lib/wordpress';

function validToken(id: number, token: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(String(id)).digest('hex');
  const left = Buffer.from(token); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('id'));
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const secret = process.env.COOKETRICKS_PREVIEW_SECRET ?? '';
  if (!Number.isInteger(id) || id < 1 || !secret || !validToken(id, token, secret)) return new Response('Invalid preview link', { status: 401 });
  const post = await getPreviewPostById(id);
  if (!post) return new Response('Post not found', { status: 404 });
  (await draftMode()).enable();
  redirect(`/blog/${post.slug}`);
}
