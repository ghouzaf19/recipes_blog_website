import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { getAllPosts, safeJsonLd, SITE_URL } from '@/lib/wordpress';

export const revalidate = 600;

export async function generateStaticParams() {
  try { return Array.from(new Set((await getAllPosts()).map((post) => post.data.author?.slug).filter(Boolean))).map((slug) => ({ slug: slug! })); }
  catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = (await getAllPosts()).find((post) => post.data.author?.slug === slug)?.data.author;
  if (!author) return { title: 'Author Not Found' };
  return { title: author.name, description: author.description || `Recipes and cooking guides by ${author.name}.`, alternates: { canonical: `${SITE_URL}/authors/${author.slug}` } };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = (await getAllPosts()).filter((post) => post.data.author?.slug === slug);
  const author = posts[0]?.data.author;
  if (!author) notFound();
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name: author.name, description: author.description || undefined, image: author.avatar || undefined, url: `${SITE_URL}/authors/${author.slug}` };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} /><Header /><main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-16"><section className="mb-14 flex flex-col items-center gap-6 text-center">{author.avatar && <Image src={author.avatar} alt={author.name} width={160} height={160} className="rounded-full" />}<div><p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">CookeTricks author</p><h1 className="mb-4 text-5xl">{author.name}</h1>{author.description && <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">{author.description}</p>}</div></section><h2 className="mb-8 text-3xl">Articles and recipes by {author.name}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <Link key={post.id} href={`/blog/${post.slug}`} className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-md"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{post.data.contentType}</p><h3 className="mb-3 text-2xl">{post.title}</h3><p className="line-clamp-3 text-gray-600">{post.excerpt}</p></Link>)}</div></main></>;
}
