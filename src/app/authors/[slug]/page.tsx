import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Header from '@/components/Header';

import {
  getAllPosts,
  safeJsonLd,
  SITE_URL,
  type BlogPost,
  type WPAuthor,
} from '@/lib/wordpress';

export const revalidate = 600;

type PageParams = Promise<{
  slug: string;
}>;

interface AuthorPageData {
  author: WPAuthor;
  posts: BlogPost[];
}

/*
 * Editorial profiles that must remain available even
 * before their first WordPress post is published.
 *
 * Both slug variants are supported to avoid breaking
 * existing WordPress author links.
 */
const EDITORIAL_AUTHOR: WPAuthor = {
  id: 0,
  name: 'CookeTricks Editorial',
  slug: 'cooketricks-editorial',
  description:
    'CookeTricks Editorial creates practical recipes and cooking guides for busy home cooks. Our content focuses on clear instructions, food safety, useful substitutions, storage guidance, and realistic cooking times. Recipes labeled as tested are prepared and reviewed before publication, while untested drafts remain clearly marked and unpublished.',
  url: `${SITE_URL}/authors/cooketricks-editorial`,
  avatar: null,
};

const FALLBACK_AUTHORS: Record<string, WPAuthor> = {
  'cooketricks-editorial': EDITORIAL_AUTHOR,

  'cooke-tricks-editorial': {
    ...EDITORIAL_AUTHOR,
    slug: 'cooke-tricks-editorial',
    url: `${SITE_URL}/authors/cooke-tricks-editorial`,
  },
};

async function loadAuthorPageData(
  slug: string,
): Promise<AuthorPageData | null> {
  let allPosts: BlogPost[] = [];

  try {
    allPosts = await getAllPosts();
  } catch (error) {
    console.error(
      'WordPress author posts could not load:',
      error,
    );
  }

  const posts = allPosts.filter(
    (post) => post.data.author?.slug === slug,
  );

  const wordpressAuthor =
    posts[0]?.data.author ?? null;

  const fallbackAuthor =
    FALLBACK_AUTHORS[slug] ?? null;

  const author =
    wordpressAuthor ?? fallbackAuthor;

  if (!author) {
    return null;
  }

  return {
    author,
    posts,
  };
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadAuthorPageData(slug);

  if (!data) {
    return {
      title: 'Author Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { author } = data;

  const description =
    author.description ||
    `Recipes and cooking guides by ${author.name}.`;

  const canonical =
    `${SITE_URL}/authors/${author.slug}`;

  return {
    title: author.name,
    description,

    alternates: {
      canonical,
    },

    openGraph: {
      title: author.name,
      description,
      url: canonical,
      type: 'profile',

      images: author.avatar
        ? [
            {
              url: author.avatar,
              alt: author.name,
            },
          ]
        : [],
    },

    twitter: {
      card: author.avatar
        ? 'summary_large_image'
        : 'summary',
      title: author.name,
      description,
      images: author.avatar
        ? [author.avatar]
        : [],
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: PageParams;
}) {
  const { slug } = await params;
  const data = await loadAuthorPageData(slug);

  if (!data) {
    notFound();
  }

  const { author, posts } = data;

  const authorUrl =
    `${SITE_URL}/authors/${author.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: authorUrl,

    mainEntity: {
      '@type': 'Person',
      name: author.name,
      description:
        author.description || undefined,
      image: author.avatar || undefined,
      url: authorUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(jsonLd),
        }}
      />

      <Header />

      <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-16">
        <section className="mb-14 flex flex-col items-center gap-6 text-center">
          {author.avatar ? (
            <Image
              src={author.avatar}
              alt={author.name}
              width={160}
              height={160}
              className="aspect-square rounded-full object-cover"
              priority
            />
          ) : (
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full bg-primary text-4xl font-bold text-white"
              aria-hidden="true"
            >
              CT
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">
              CookeTricks author
            </p>

            <h1 className="mb-4 text-5xl">
              {author.name}
            </h1>

            {author.description && (
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
                {author.description}
              </p>
            )}
          </div>
        </section>

        <section
          className="mb-14 grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 sm:grid-cols-3"
          aria-label="Editorial standards"
        >
          <div>
            <h2 className="mb-2 text-xl">
              Practical guidance
            </h2>

            <p className="text-gray-600">
              Clear instructions, substitutions,
              timing guidance and storage information
              for home cooks.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl">
              Recipe testing
            </h2>

            <p className="text-gray-600">
              Untested recipes remain clearly marked
              as editorial drafts and are not
              published as tested recipes.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl">
              Transparency
            </h2>

            <p className="text-gray-600">
              Sources, image information and
              AI-assisted editing are disclosed when
              relevant.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-8 text-3xl">
            Articles and recipes by {author.name}
          </h2>

          {posts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                    {post.data.contentType ===
                    'recipe'
                      ? 'Recipe'
                      : 'Cooking guide'}
                  </p>

                  <h3 className="mb-3 text-2xl">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="line-clamp-3 text-gray-600">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <h3 className="mb-3 text-2xl">
                Recipes are being prepared
              </h3>

              <p className="mx-auto max-w-2xl text-gray-600">
                CookeTricks Editorial is currently
                preparing and reviewing its first
                collection of practical recipes and
                cooking guides.
              </p>

              <Link
                href="/blog"
                className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Browse recipes and guides
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}