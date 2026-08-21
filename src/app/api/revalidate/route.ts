import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const expected = process.env.COOKETRICKS_REVALIDATE_SECRET;
  if (!expected || request.headers.get('x-cooketricks-secret') !== expected) return new Response('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => null) as { slug?: string; event?: string } | null;
  if (!body) return new Response('Bad Request', { status: 400 });
  revalidateTag('blog-index', 'max'); revalidateTag('post', 'max');
  revalidatePath('/'); revalidatePath('/blog'); revalidatePath('/sitemap.xml');
  if (body.slug) { revalidateTag(`post:${body.slug}`, 'max'); revalidatePath(`/blog/${body.slug}`); }
  return NextResponse.json({ revalidated: true, event: body.event ?? 'update' });
}
