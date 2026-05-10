import { sanityFetch } from '@/sanity/lib/fetch';
import { notFound } from 'next/navigation';
import { CustomPortableText } from '@/components/CustomPortableText';
import Image from 'next/image';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Link from 'next/link';
import { createClient } from 'next-sanity';
import { urlFor } from '@/sanity/lib/image';

// ─── Types ────────────────────────────────────────────────────────────────────

type SanityImageRef = { _ref: string; _type: string };
type SanityAsset = { _ref: string; _type: string; url?: string };

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  mainImage?: {
    asset: SanityAsset;
    alt?: string;
    metadata?: { dimensions?: { width: number; height: number } };
  };
  body?: unknown[];
  author?: { name: string; image?: { asset: SanityImageRef } };
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    shareImage?: { asset?: { url: string } };
    canonicalUrl?: string;
  };
}

export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cooketricks.com';

// ─── Static Params (pre-render all blog slugs for SEO) ────────────────────────

const sitemapClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-03-01',
  useCdn: true,
});

export async function generateStaticParams() {
  const slugs: { slug: string }[] = await sitemapClient.fetch(
    `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`
  );
  return slugs.map(({ slug }) => ({ slug }));
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getPost(slug: string): Promise<Post | null> {
  return sanityFetch<Post | null>({
    query: `*[_type == "post" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      mainImage { asset, alt, metadata },
      body,
      author->{ name, image { asset } },
      cuisine,
      prepTime,
      cookTime,
      difficulty,
      servings,
      ingredients,
      seo
    }`,
    params: { slug },
    tags: ['post', `post:${slug}`],
  });
}

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Page Not Found' };

  const totalTime = (post.prepTime ?? 0) + (post.cookTime ?? 0);
  const postImageUrl = post.seo?.shareImage?.asset?.url
    ?? (post.mainImage ? urlFor(post.mainImage).url() : undefined);

  return {
    title: post.seo?.metaTitle ?? `${post.title}${post.cuisine ? ` - ${post.cuisine} Recipe` : ' Recipe'}`,
    description:
      post.seo?.metaDescription ??
      `${post.excerpt ?? post.title}. ${totalTime > 0 ? `Ready in ${totalTime} minutes. ` : ''}${post.servings ? `Serves ${post.servings}.` : ''}`.trim(),
    openGraph: {
      title: post.seo?.metaTitle ?? post.title,
      description: post.seo?.metaDescription ?? post.excerpt ?? post.title,
      url: `${SITE_URL}/blog/${post.slug.current}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: postImageUrl
        ? [{ url: postImageUrl, width: 1200, height: 630, alt: post.mainImage?.alt ?? post.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo?.metaTitle ?? post.title,
      description: post.seo?.metaDescription ?? post.excerpt ?? post.title,
      images: postImageUrl ? [postImageUrl] : [],
    },
    alternates: {
      canonical:
        post.seo?.canonicalUrl ??
        `${SITE_URL}/blog/${post.slug.current}`,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function getFallbackImage(slug: string) {
  const map: Record<string, string> = {
    'chicken-tikka-masala': '/blog-images/chicken-tikka-masala.png',
    'classic-french-onion-soup': '/blog-images/classic-french-onion-soup.png',
    'classic-margherita-pizza': '/blog-images/classic-margherita-pizza.png',
    'creamy-tuscan-chicken': '/blog-images/creamy-tuscan-chicken.png',
    'easy-weeknight-beef-tacos': '/blog-images/easy-weeknight-beef-tacos.png',
    'garlic-butter-shrimp-pasta': '/blog-images/garlic-butter-shrimp-pasta.png',
  };
  return map[slug] || null;
}

function difficultyColor(d?: string) {
  if (d === 'easy') return 'bg-green-100 text-green-800';
  if (d === 'medium') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: Post | null = null;
  let errorMsg: string | null = null;

  try {
    post = await getPost(slug);
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error("Sanity fetch failed:", error);
    if (error.code === 'EAI_AGAIN' || error?.message?.includes('fetch failed')) {
      errorMsg = "Network error: Unable to reach the database (Sanity API). Please check your internet connection.";
    } else {
      errorMsg = "An error occurred while loading the post.";
    }
  }

  // Let the component fall through to the notFound() state gracefully instead of throwing a scary error.

  if (!post) notFound();

  const totalTime = (post.prepTime ?? 0) + (post.cookTime ?? 0);

  // ─── JSON-LD Structured Data (Recipe Schema) ──────────────────────────────
  const postImage = post.mainImage?.asset?._ref
    ? urlFor(post.mainImage).url()
    : getFallbackImage(post.slug.current) ?? undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: post.title,
    description: post.excerpt ?? post.title,
    ...(postImage && { image: [postImage] }),
    ...(post.author?.name && { author: { '@type': 'Person', name: post.author.name } }),
    ...(post.publishedAt && { datePublished: post.publishedAt }),
    ...(post.prepTime && { prepTime: `PT${post.prepTime}M` }),
    ...(post.cookTime && { cookTime: `PT${post.cookTime}M` }),
    ...(totalTime > 0 && { totalTime: `PT${totalTime}M` }),
    ...(post.servings && { recipeYield: `${post.servings} servings` }),
    ...(post.cuisine && { recipeCuisine: post.cuisine }),
    ...(post.difficulty && { keywords: post.difficulty }),
    ...(post.ingredients && post.ingredients.length > 0 && {
      recipeIngredient: post.ingredients,
    }),
    ...(post.instructions && post.instructions.length > 0 && {
      recipeInstructions: post.instructions.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step,
      })),
    }),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug.current}` },
    ],
  };

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <article className="w-full pb-20">
        {/* Editorial Header */}
        <header className="pt-16 pb-12 px-4 text-center max-w-4xl mx-auto">
          <nav className="mb-8 flex justify-center" aria-label="Breadcrumb">
            <Link href="/blog" className="text-primary hover:text-secondary font-medium text-sm tracking-widest uppercase transition-colors">
              CookeTricks Recipes
            </Link>
          </nav>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-dark mb-6 leading-[1.1] tracking-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl md:text-2xl font-light text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm tracking-widest uppercase font-medium text-gray-500">
            {post.author?.name && (
              <span className="text-gray-900">By {post.author.name}</span>
            )}
            {post.author?.name && <span className="text-accent">•</span>}
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
            )}
          </div>
        </header>

        {/* Hero Image */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-16">
          {post.mainImage?.asset?._ref ? (
            <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={urlFor(post.mainImage).url()}
                alt={post.mainImage.alt ?? post.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          ) : getFallbackImage(post.slug?.current) && (
            <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={getFallbackImage(post.slug.current)!}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Intro Body */}
          {post.body && post.body.length > 0 && (
            <div className="prose prose-lg md:prose-xl prose-stone max-w-none mb-16 prose-headings:font-serif prose-headings:font-semibold prose-a:text-primary hover:prose-a:text-secondary">
              <CustomPortableText value={post.body} />
            </div>
          )}

          {/* Editorial Recipe Card */}
          <div id="recipe-card" className="bg-white border border-accent p-8 md:p-12 shadow-sm rounded-lg relative mt-20">
            {/* Decorative Top Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-primary rounded-b-full"></div>
            
            <div className="text-center mb-10">
              <h2 className="text-4xl font-serif text-dark mb-4">{post.title}</h2>
              <div className="flex flex-wrap justify-center gap-6 text-sm uppercase tracking-widest text-gray-500 font-medium border-y border-gray-100 py-4">
                {post.prepTime != null && <span>Prep: {post.prepTime} mins</span>}
                {post.cookTime != null && <span>Cook: {post.cookTime} mins</span>}
                {totalTime > 0 && <span className="text-primary font-bold">Total: {totalTime} mins</span>}
                {post.servings != null && <span>Yield: {post.servings}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Ingredients */}
              {post.ingredients && post.ingredients.length > 0 && (
                <div>
                  <h3 className="text-2xl font-serif text-dark border-b border-gray-200 pb-2 mb-6">Ingredients</h3>
                  <ul className="space-y-3">
                    {post.ingredients.map((ing, index) => (
                      <li key={index} className="flex items-start text-base text-gray-700 leading-relaxed">
                        <span className="text-primary mr-3">•</span>
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {post.instructions && post.instructions.length > 0 && (
                <div>
                  <h3 className="text-2xl font-serif text-dark border-b border-gray-200 pb-2 mb-6">Instructions</h3>
                  <ol className="space-y-6">
                    {post.instructions.map((step, index) => (
                      <li key={index} className="text-base text-gray-700 leading-relaxed">
                        <span className="block font-serif font-bold text-dark text-lg mb-1">Step {index + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}