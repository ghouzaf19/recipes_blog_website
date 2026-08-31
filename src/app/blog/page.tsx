import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import { getPosts, safeJsonLd, SITE_URL, type BlogPost } from '@/lib/wordpress';

export const revalidate = 300;

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function label(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleFor(params: SearchParams): string {
  const q = first(params.q);
  const category = first(params.category);
  const cuisine = first(params.cuisine);
  const mealType = first(params.mealType);
  const occasion = first(params.occasion);
  const diet = first(params.diet);
  const tag = first(params.tag);
  if (q) return `Search Results for “${q}”`;
  if (category === 'kitchen-tips') return 'Kitchen Tips';
  if (category) return `${label(category)} Recipes`;
  if (cuisine) return `${label(cuisine)} Cuisine`;
  if (mealType) return label(mealType);
  if (occasion) return `${label(occasion)} Recipes`;
  if (diet) return `${label(diet)} Recipes`;
  if (tag) return label(tag);
  return 'All Recipes & Guides';
}

export async function generateMetadata({ searchParams }: { searchParams?: Promise<SearchParams> }): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const title = titleFor(params);
  const description = 'Browse CookeTricks recipes, tested cooking notes, and practical kitchen guides.';
  const filtered = Boolean(first(params.q) || first(params.category) || first(params.cuisine) || first(params.tag) || first(params.mealType) || first(params.occasion) || first(params.diet));
  return {
    title,
    description,
    robots: filtered ? { index: false, follow: true } : undefined,
    alternates: { canonical: `${SITE_URL}/blog` },
    openGraph: { title, description, url: `${SITE_URL}/blog`, type: 'website' },
  };
}

function PostCard({ post }: { post: BlogPost }) {
  const image = post.data.featuredImage;
  const cuisine = post.data.taxonomies.cuisines[0]?.name;
  const recipe = post.data.recipe;
  return (
    <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-48 w-full bg-gray-100">
        {image ? <Image src={image.url} alt={image.alt || post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-4xl">🍳</div>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.data.author && <div className="mb-3 text-sm"><p className="font-medium text-gray-900">{post.data.author.name}</p><time className="text-xs text-gray-500" dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time></div>}
        <h2 className="mb-3 line-clamp-2 flex-grow text-xl font-medium text-gray-900 transition-colors group-hover:text-primary">{post.title}</h2>
        {post.excerpt && <p className="mb-4 line-clamp-3 text-gray-600">{post.excerpt}</p>}
        <div className="mt-auto flex flex-wrap gap-2">
          {recipe.totalTime && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">🕒 {recipe.totalTime} min</span>}
          {recipe.servings && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">🍽️ {recipe.servings} servings</span>}
          {cuisine && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">{cuisine}</span>}
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">{post.data.contentType === 'recipe' ? 'Recipe' : 'Guide'}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogIndex({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const filters = { search: first(params.q), category: first(params.category), cuisine: first(params.cuisine), tag: first(params.tag), mealType: first(params.mealType), occasion: first(params.occasion), diet: first(params.diet), perPage: 48 };
  let posts: BlogPost[] = [];
  try { posts = await getPosts(filters); } catch (error) { console.error('WordPress fetch failed:', error); }
  const displayTitle = titleFor(params);
  const itemList = { '@context': 'https://schema.org', '@type': 'ItemList', name: displayTitle, itemListElement: posts.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}/blog/${post.slug}` })) };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <Header />
      <main className="min-h-[calc(100vh-64px)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-center text-4xl font-medium tracking-tight text-gray-900">{displayTitle}</h1>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-gray-600">Recipes and cooking guides from CookeTricks.</p>
          {posts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div> : <div className="py-20 text-center"><span className="mb-6 block text-5xl">🔍</span><p className="text-lg text-gray-500">No content found. Try a different filter.</p><Link href="/blog" className="mt-6 inline-block font-medium text-primary">← Browse everything</Link></div>}
        </div>
      </main>
    </>
  );
}
