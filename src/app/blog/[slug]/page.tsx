import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Header from '@/components/Header';
import { RecipeCard } from '@/components/RecipeCard';
import { SafeHtml } from '@/components/SafeHtml';

import {
  getPostBySlug,
  getPreviewPostById,
  safeJsonLd,
  SITE_URL,
  validPreviewToken,
  type BlogPost,
} from '@/lib/wordpress';

export const revalidate = 300;

type PageParams = Promise<{
  slug: string;
}>;

type PageSearchParams = Promise<{
  preview_id?: string;
  preview_token?: string;
}>;

interface LoadedPost {
  post: BlogPost | null;
  isPreview: boolean;
}

/**
 * Public requests only load published WordPress posts.
 *
 * Drafts are returned only when:
 * 1. Preview parameters are present.
 * 2. Next.js Draft Mode is enabled.
 * 3. The preview ID is valid.
 * 4. The signed preview token is valid.
 */
async function loadPost(
  slug: string,
  previewIdValue?: string,
  previewTokenValue?: string,
): Promise<LoadedPost> {
  const previewRequested =
    previewIdValue !== undefined ||
    previewTokenValue !== undefined;

  /*
   * Normal public request.
   * Never request draft content from WordPress.
   */
  if (!previewRequested) {
    const post = await getPostBySlug(slug, false);

    return {
      post,
      isPreview: false,
    };
  }

  /*
   * Preview parameters exist, so Draft Mode must also
   * have been enabled by /api/preview.
   */
  const previewModeEnabled = (await draftMode()).isEnabled;

  if (!previewModeEnabled) {
    return {
      post: null,
      isPreview: true,
    };
  }

  const previewId = Number(previewIdValue);
  const previewToken = previewTokenValue ?? '';

  const previewIsValid =
    Number.isInteger(previewId) &&
    previewId > 0 &&
    validPreviewToken(previewId, previewToken);

  if (!previewIsValid) {
    return {
      post: null,
      isPreview: true,
    };
  }

  const post = await getPreviewPostById(previewId);

  /*
   * Prevent a valid preview token for one post from being
   * reused with an unrelated slug.
   */
 if (
  post &&
  slug !== 'preview' &&
  post.slug !== slug
) {
  return {
    post: null,
    isPreview: true,
  };
}

  return {
    post,
    isPreview: true,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const { preview_id, preview_token } = await searchParams;

  let loaded: LoadedPost;

  try {
    loaded = await loadPost(
      slug,
      preview_id,
      preview_token,
    );
  } catch (error) {
    console.error(
      'WordPress metadata fetch failed:',
      error,
    );

    return {
      title: 'Page Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { post, isPreview } = loaded;

  if (!post) {
    return {
      title: 'Page Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const image =
    post.data.socialImage ??
    post.data.featuredImage;

  const title =
    post.data.seo.title ||
    post.title;

  const description =
    post.data.seo.description ||
    post.excerpt ||
    post.title;

  const canonical =
    post.data.seo.canonicalUrl ||
    `${SITE_URL}/blog/${post.slug}`;

  return {
    title,
    description,

    alternates: {
      canonical,
    },

    robots: isPreview
      ? {
          index: false,
          follow: false,
          noarchive: true,
          nosnippet: true,
          noimageindex: true,
        }
      : undefined,

    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,

      authors: post.data.author?.name
        ? [post.data.author.name]
        : undefined,

      images: image
        ? [
            {
              url: image.url,
              width: image.width,
              height: image.height,
              alt: image.alt || post.title,
            },
          ]
        : [],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image.url] : [],
    },
  };
}

function minutes(
  value: number | null,
): string | undefined {
  return value && value > 0
    ? `PT${value}M`
    : undefined;
}

function structuredData(post: BlogPost) {
  const image = post.data.featuredImage;

  const author = post.data.author
    ? {
        '@type': 'Person',
        name: post.data.author.name,
        url: `${SITE_URL}/authors/${post.data.author.slug}`,
      }
    : undefined;

  const common = {
    '@context': 'https://schema.org',
    headline: post.title,
    name: post.title,
    description: post.excerpt || post.title,
    url: `${SITE_URL}/blog/${post.slug}`,
    image: image ? [image.url] : undefined,
    author,
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,

    publisher: {
      '@type': 'Organization',
      name: 'CookeTricks',
      url: SITE_URL,
    },
  };

  if (post.data.contentType !== 'recipe') {
    return {
      ...common,
      '@type': 'BlogPosting',
    };
  }

  const recipe = post.data.recipe;

  return {
    ...common,
    '@type': 'Recipe',

    prepTime: minutes(recipe.prepTime),
    cookTime: minutes(recipe.cookTime),
    totalTime: minutes(recipe.totalTime),

    recipeYield:
      recipe.yield ||
      (recipe.servings
        ? `${recipe.servings} servings`
        : undefined),

    recipeCuisine:
      post.data.taxonomies.cuisines
        .map((term) => term.name)
        .join(', ') || undefined,

    recipeCategory:
      post.data.taxonomies.mealTypes
        .map((term) => term.name)
        .join(', ') || undefined,
    keywords: [
      post.title,
      ...post.data.taxonomies.categories.map((term) => term.name),
      ...post.data.taxonomies.mealTypes.map((term) => term.name),
      ...post.data.taxonomies.cuisines.map((term) => term.name),
    ].filter(Boolean).join(', '),

    recipeIngredient: recipe.ingredients,

    recipeInstructions:
      recipe.instructions.map((step) => ({
        '@type': 'HowToStep',
        position: step.position,
        name: `Step ${step.position}`,
        text: step.text,
      })),

    nutrition:
      recipe.nutritionVerified &&
      recipe.nutrition
        ? {
            ...recipe.nutrition,
            '@type': 'NutritionInformation',
          }
        : undefined,
  };
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const { slug } = await params;
  const { preview_id, preview_token } =
    await searchParams;

  let loaded: LoadedPost;

  try {
    loaded = await loadPost(
      slug,
      preview_id,
      preview_token,
    );
  } catch (error) {
    console.error(
      'WordPress post fetch failed:',
      error,
    );

    notFound();
  }

  const { post, isPreview } = loaded;

  if (!post) {
    notFound();
  }

  const recipe = post.data.recipe;

  const showRecipeCard =
    post.data.contentType === 'recipe' &&
    recipe.ingredientGroups.length > 0 &&
    recipe.instructions.length > 0;

  const hasTestedNotes =
    Boolean(recipe.testNotes) ||
    Boolean(recipe.storageNotes) ||
    Boolean(recipe.safetyNotes);

  const wasUpdated =
    Number.isFinite(Date.parse(post.modifiedAt)) &&
    Number.isFinite(Date.parse(post.publishedAt)) &&
    Math.abs(
      Date.parse(post.modifiedAt) -
        Date.parse(post.publishedAt),
    ) > 60_000;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',

    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Recipes & Guides',
        item: `${SITE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <>
      {/*
       * Do not expose Recipe or Article structured data
       * for unpublished WordPress previews.
       */}
      {!isPreview && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(
                structuredData(post),
              ),
            }}
          />

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(breadcrumb),
            }}
          />
        </>
      )}

      <Header />

      <article className="w-full pb-20">
        <header className="mx-auto max-w-4xl px-4 pb-12 pt-16 text-center">
          <nav
            className="mb-8"
            aria-label="Breadcrumb"
          >
            <Link
              href="/blog"
              className="text-sm font-medium uppercase tracking-widest text-primary"
            >
              CookeTricks
            </Link>
          </nav>

          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">
            {post.data.contentType === 'recipe'
              ? 'Recipe'
              : 'Cooking Guide'}
          </p>

          <h1 className="mb-6 text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mx-auto mb-10 max-w-3xl text-xl font-light leading-relaxed text-gray-600 md:text-2xl">
              {post.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium uppercase tracking-widest text-gray-500">
            {post.data.author && (
              <Link
                className="text-gray-900 hover:text-primary"
                href={`/authors/${post.data.author.slug}`}
              >
                By {post.data.author.name}
              </Link>
            )}

            {isPreview ? (
              <span className="font-bold text-primary">
                Draft preview
              </span>
            ) : (
              <>
                <time dateTime={post.publishedAt}>
                  Published {formatDate(post.publishedAt)}
                </time>

                {wasUpdated && (
                  <time dateTime={post.modifiedAt}>
                    Updated {formatDate(post.modifiedAt)}
                  </time>
                )}
              </>
            )}
          </div>

          {isPreview && (
  <div
    role="status"
    className="mx-auto mt-10 max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-5 text-left text-base leading-relaxed text-amber-950"
  >
    {post.data.contentType === 'recipe' ? (
      <>
        <strong>
          ⚠️ Editorial draft — needs testing.
        </strong>{' '}
        Do not publish until ingredient quantities,
        cooking times, yield, flavor, photos, and
        nutrition have been verified.
      </>
    ) : (
      <>
        <strong>
          ⚠️ Editorial draft — fact-check required.
        </strong>{' '}
        Verify factual claims, food-safety guidance,
        sources, internal links, and visuals before
        publishing.
      </>
    )}
  </div>
)}
        </header>

        {post.data.featuredImage && (
          <figure className="mx-auto mb-16 w-full max-w-4xl px-4 sm:px-6">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl md:aspect-[16/9]">
              <Image
                src={
                  post.data.featuredImage.url
                }
                alt={
                  post.data.featuredImage.alt ||
                  post.title
                }
                fill
                priority
                sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 896px) calc(100vw - 48px), 896px"
                className="object-cover"
              />
            </div>

            {(post.data.transparency
              .imageCreator ||
              post.data.featuredImage.caption) && (
              <figcaption className="mt-3 text-center text-sm text-gray-500">
                {post.data.featuredImage.caption ||
                  `Image by ${post.data.transparency.imageCreator}`}
              </figcaption>
            )}
          </figure>
        )}

        <div className="mx-auto max-w-3xl px-4 sm:px-6">

{post.contentHtml && (
  <SafeHtml
    html={post.contentHtml}
    className="wp-content mb-16"
  />
)}
          {showRecipeCard && (
            <RecipeCard
              title={post.title}
              servings={recipe.servings}
              yieldText={recipe.yield}
              groups={recipe.ingredientGroups}
              instructions={recipe.instructions}
              prepTime={recipe.prepTime}
              cookTime={recipe.cookTime}
              totalTime={recipe.totalTime}
            />
          )}

          {hasTestedNotes && (
            <section className="mt-12 space-y-6 rounded-2xl bg-white p-8">
              <h2 className="text-3xl">
                Tested notes
              </h2>

              {recipe.testNotes && (
                <p>{recipe.testNotes}</p>
              )}

              {recipe.storageNotes && (
                <div>
                  <h3 className="mb-2 text-xl">
                    Storage and reheating
                  </h3>

                  <p>{recipe.storageNotes}</p>
                </div>
              )}

              {recipe.safetyNotes && (
                <div>
                  <h3 className="mb-2 text-xl">
                    Safety and allergens
                  </h3>

                  <p>{recipe.safetyNotes}</p>
                </div>
              )}
            </section>
          )}

          {post.data.seo.sources.length > 0 && (
            <section className="mt-12 border-t border-gray-200 pt-8">
              <h2 className="mb-4 text-2xl">
                Sources
              </h2>

              <ul className="list-disc space-y-2 pl-6">
                {post.data.seo.sources.map(
                  (source) => (
                    <li key={source}>
                      <a
                        href={source}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="break-all text-primary hover:underline"
                      >
                        {source}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}

          {post.data.transparency.aiDisclosure && (
            <p className="mt-10 rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
              <strong>
                Editorial disclosure:
              </strong>{' '}
              {
                post.data.transparency
                  .aiDisclosure
              }
            </p>
          )}
        </div>
      </article>
    </>
  );
}