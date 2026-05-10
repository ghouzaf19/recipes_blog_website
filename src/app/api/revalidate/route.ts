import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parseBody } from 'next-sanity/webhook';

const secret = process.env.SANITY_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
      slug?: { current: string };
    }>(req, secret);

    if (!isValidSignature) return new Response('Invalid Signature', { status: 401 });
    if (!body?._type) return new Response('Bad Request', { status: 400 });

    if (body.slug?.current) {
      revalidateTag(`${body._type}:${body.slug.current}`, 'default');
    }
    revalidateTag('blog-index', 'default');

    return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}