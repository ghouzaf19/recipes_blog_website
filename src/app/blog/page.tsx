import { sanityFetch } from '@/sanity/lib/fetch';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cooketricks.com';

export async function generateMetadata(
  props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const tag = searchParams?.tag as string | undefined;
  const category = searchParams?.category as string | undefined;
  const q = searchParams?.q as string | undefined;

  let title = 'All Recipes';
  let description = 'Browse our full collection of delicious recipes, cooking tips, and kitchen tricks on CookeTricks.';

  if (q) {
    title = `Search Results for "${q}"`;
    description = `Find recipes matching "${q}" on CookeTricks.`;
  } else if (category) {
    const name = category.charAt(0).toUpperCase() + category.slice(1);
    title = `${name} Recipes`;
    description = `Explore our best ${name.toLowerCase()} recipes and cooking ideas on CookeTricks.`;
  } else if (tag) {
    const name = tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    title = `${name} Recipes`;
    description = `Discover ${name.toLowerCase()} recipes, tips, and inspiration on CookeTricks.`;
  }

  return {
    title,
    description,
    openGraph: {
      title: `${title} | CookeTricks`,
      description,
      url: `${SITE_URL}/blog`,
      type: 'website',
    },
    alternates: {
      canonical: `${SITE_URL}/blog`,
    },
  };
}

export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

type SanityAsset = { _ref: string };

interface PostCard {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt?: string;
  excerpt?: string;
  mainImage?: { asset: SanityAsset; alt?: string };
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  servings?: number;
  cuisine?: string;
  author?: { name: string; image?: { asset: SanityAsset } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

function imageUrl(assetRef: string, width = 800) {
  const cleaned = assetRef
    .replace("image-", "")
    .replace(/-([a-z]+)$/, ".$1")
    .replace(/-(\d+x\d+)-/, "-$1-");
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${cleaned}?w=${width}&fit=crop&auto=format`;
}

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

function difficultyStyle(d?: string) {
  if (d === 'easy') return 'bg-green-50 text-green-800';
  if (d === 'medium') return 'bg-yellow-50 text-yellow-800';
  return 'bg-red-50 text-red-800';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogIndex(
  props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q as string | undefined;
  const category = searchParams?.category as string | undefined;
  const cuisine = searchParams?.cuisine as string | undefined;
  const tag = searchParams?.tag as string | undefined;

  let displayTitle = "All Recipes";
  if (q) {
    displayTitle = `Search Results for "${q}"`;
  } else if (category) {
    displayTitle = category.charAt(0).toUpperCase() + category.slice(1);
  } else if (cuisine) {
    displayTitle = `${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} Cuisine`;
  } else if (tag) {
    const formattedTag = tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    displayTitle = formattedTag;
  }

  let queryFilter = `_type == "post" && defined(slug.current)`;
  
  if (q) {
    queryFilter += ` && (title match "*${q}*" || excerpt match "*${q}*")`;
  }
  if (category) {
    queryFilter += ` && category->title match "*${category}*"`;
  }
  if (cuisine) {
    queryFilter += ` && cuisine match "*${cuisine}*"`;
  }
  if (tag) {
    const formattedTag = tag.replace('-', ' ');
    queryFilter += ` && (title match "*${formattedTag}*" || excerpt match "*${formattedTag}*" || "${formattedTag}" in ingredients[])`;
  }

  const query = `*[${queryFilter}] | order(publishedAt desc) {
    _id, title, slug, publishedAt, excerpt,
    mainImage { asset, alt },
    prepTime, cookTime, difficulty, servings, cuisine,
    author->{ name, image { asset } }
  }`;

  let posts: PostCard[] = [];
  let errorMsg: string | null = null;

  try {
    posts = await sanityFetch<PostCard[]>({
      query,
      tags: ['blog-index'],
    });
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error("Sanity fetch failed:", error);
    if (error.code === 'EAI_AGAIN' || error.message.includes('fetch failed')) {
      errorMsg = "Network error: Unable to reach the database (Sanity API). Please check your internet connection.";
    } else {
      errorMsg = "An error occurred while loading posts.";
    }
  }

  // Let the component fall through to the empty state gracefully instead of throwing a scary error.
  if (!posts || posts.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] py-12 flex flex-col items-center justify-center">
          <span className="text-5xl mb-6 block">🔍</span>
          <p className="text-center text-gray-500 text-lg">
            No recipes found matching your search. Try a different filter!
          </p>
          <Link href="/blog" className="mt-6 text-[#1a73e8] hover:text-blue-600 font-medium">
            ← Browse all recipes
          </Link>
        </main>
      </>
    );
  }
  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: displayTitle,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/blog/${post.slug.current}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
      />
      <Header />
      <main className="min-h-[calc(100vh-64px)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-medium text-gray-900 mb-6 text-center tracking-tight">{displayTitle}</h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto text-lg">
          Browse our collection of delicious recipes, cooking tips, and kitchen tricks
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => {
            const totalTime = (post.prepTime ?? 0) + (post.cookTime ?? 0);
            return (
              <Link
                key={post._id}
                href={`/blog/${post.slug.current}`}
                className="group flex flex-col h-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative h-48 w-full flex-shrink-0 bg-gray-100">
                  {post.mainImage?.asset?._ref ? (
                    <Image
                      src={imageUrl(post.mainImage.asset._ref)}
                      alt={post.mainImage.alt ?? post.title}
                      fill
                      className="object-cover"
                    />
                  ) : getFallbackImage(post.slug.current) ? (
                    <Image
                      src={getFallbackImage(post.slug.current)!}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                      <span className="text-4xl">🍳</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col">
                  {post.author && (
                    <div className="flex items-center mb-3 gap-2">
                      {post.author.image?.asset?._ref && (
                        <Image
                          src={imageUrl(post.author.image.asset._ref)}
                          alt={post.author.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                        {post.publishedAt && (
                          <p className="text-xs text-gray-500">
                           <time dateTime={post.publishedAt}>
                            {new Date(post.publishedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </time>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <h2 className="flex-grow text-xl font-medium text-gray-900 mb-3 line-clamp-2 group-hover:text-[#1a73e8] transition-colors">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="text-gray-600 line-clamp-3 mb-4">{post.excerpt}</p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {totalTime > 0 && (
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full">
                        🕒 {totalTime} min
                      </span>
                    )}
                    {post.servings && (
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full">
                        🍽️ {post.servings} servings
                      </span>
                    )}
                    {post.cuisine && (
                      <span className="bg-blue-50 text-[#1a73e8] text-xs font-medium px-3 py-1 rounded-full capitalize">
                        {post.cuisine}
                      </span>
                    )}
                    {post.difficulty && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyStyle(post.difficulty)}`}
                      >
                        {post.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      </main>
    </>
  );
}