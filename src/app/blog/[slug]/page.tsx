import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { RecipeCard } from '@/components/RecipeCard';
import { SafeHtml } from '@/components/SafeHtml';
import { getAllPosts, getPostBySlug, safeJsonLd, SITE_URL, type BlogPost } from '@/lib/wordpress';

export const revalidate = 300;

export async function generateStaticParams() {
  try { return (await getAllPosts()).map((post) => ({ slug: post.slug })); }
  catch (error) { console.error('Static params could not load from WordPress:', error); return []; }
}

async function loadPost(slug: string): Promise<BlogPost | null> {
  const preview = (await draftMode()).isEnabled;
  return getPostBySlug(slug, preview);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Page Not Found' };
  const image = post.data.socialImage ?? post.data.featuredImage;
  const title = post.data.seo.title || post.title;
  const description = post.data.seo.description || post.excerpt || post.title;
  const canonical = post.data.seo.canonicalUrl || `${SITE_URL}/blog/${post.slug}`;
  return {
    title, description, alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article', publishedTime: post.publishedAt, modifiedTime: post.modifiedAt, authors: post.data.author?.name ? [post.data.author.name] : undefined, images: image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt || post.title }] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image.url] : [] },
  };
}

function minutes(value: number | null): string | undefined { return value ? `PT${value}M` : undefined; }

function structuredData(post: BlogPost) {
  const image = post.data.featuredImage;
  const author = post.data.author ? { '@type': 'Person', name: post.data.author.name, url: `${SITE_URL}/authors/${post.data.author.slug}` } : undefined;
  const common = { '@context': 'https://schema.org', headline: post.title, name: post.title, description: post.excerpt || post.title, url: `${SITE_URL}/blog/${post.slug}`, image: image ? [image.url] : undefined, author, datePublished: post.publishedAt, dateModified: post.modifiedAt, publisher: { '@type': 'Organization', name: 'CookeTricks', url: SITE_URL } };
  if (post.data.contentType !== 'recipe') return { ...common, '@type': 'BlogPosting' };
  const recipe = post.data.recipe;
  return {
    ...common, '@type': 'Recipe', prepTime: minutes(recipe.prepTime), cookTime: minutes(recipe.cookTime), totalTime: minutes(recipe.totalTime),
    recipeYield: recipe.yield || (recipe.servings ? `${recipe.servings} servings` : undefined),
    recipeCuisine: post.data.taxonomies.cuisines.map((term) => term.name).join(', ') || undefined,
    recipeCategory: post.data.taxonomies.mealTypes.map((term) => term.name).join(', ') || undefined,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((step) => ({ '@type': 'HowToStep', position: step.position, text: step.text })),
    nutrition: recipe.nutritionVerified && recipe.nutrition ? { ...recipe.nutrition, '@type': 'NutritionInformation' } : undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: BlogPost | null = null;
  try { post = await loadPost(slug); } catch (error) { console.error('WordPress post fetch failed:', error); }
  if (!post) notFound();
  const recipe = post.data.recipe;
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Recipes & Guides', item: `${SITE_URL}/blog` }, { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` }] };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData(post)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <Header />
      <article className="w-full pb-20">
        <header className="mx-auto max-w-4xl px-4 pb-12 pt-16 text-center">
          <nav className="mb-8" aria-label="Breadcrumb"><Link href="/blog" className="text-sm font-medium uppercase tracking-widest text-primary">CookeTricks</Link></nav>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">{post.data.contentType === 'recipe' ? 'Recipe' : 'Cooking Guide'}</p>
          <h1 className="mb-6 text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">{post.title}</h1>
          {post.excerpt && <p className="mx-auto mb-10 max-w-3xl text-xl font-light leading-relaxed text-gray-600 md:text-2xl">{post.excerpt}</p>}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium uppercase tracking-widest text-gray-500">
            {post.data.author && <Link className="text-gray-900 hover:text-primary" href={`/authors/${post.data.author.slug}`}>By {post.data.author.name}</Link>}
            <time dateTime={post.publishedAt}>Published {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
            {Math.abs(Date.parse(post.modifiedAt) - Date.parse(post.publishedAt)) > 60_000 && <time dateTime={post.modifiedAt}>Updated {new Date(post.modifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>}
          </div>
        </header>
        {post.data.featuredImage && <figure className="mx-auto mb-16 w-full max-w-4xl px-4 sm:px-6"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl md:aspect-[16/9]"><Image src={post.data.featuredImage.url} alt={post.data.featuredImage.alt || post.title} fill priority sizes="(max-width: 896px) 100vw, 896px" className="object-cover" /></div>{(post.data.transparency.imageCreator || post.data.featuredImage.caption) && <figcaption className="mt-3 text-center text-sm text-gray-500">{post.data.featuredImage.caption || `Image by ${post.data.transparency.imageCreator}`}</figcaption>}</figure>}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {post.contentHtml && <SafeHtml html={post.contentHtml} className="wp-content mb-16" />}
          {post.data.contentType === 'recipe' && recipe.ingredientGroups.length > 0 && recipe.instructions.length > 0 && <RecipeCard title={post.title} servings={recipe.servings} yieldText={recipe.yield} groups={recipe.ingredientGroups} instructions={recipe.instructions} prepTime={recipe.prepTime} cookTime={recipe.cookTime} totalTime={recipe.totalTime} />}
          {(recipe.testNotes || recipe.storageNotes || recipe.safetyNotes) && <section className="mt-12 space-y-6 rounded-2xl bg-white p-8"><h2 className="text-3xl">Tested notes</h2>{recipe.testNotes && <p>{recipe.testNotes}</p>}{recipe.storageNotes && <div><h3 className="mb-2 text-xl">Storage and reheating</h3><p>{recipe.storageNotes}</p></div>}{recipe.safetyNotes && <div><h3 className="mb-2 text-xl">Safety and allergens</h3><p>{recipe.safetyNotes}</p></div>}</section>}
          {post.data.seo.sources.length > 0 && <section className="mt-12 border-t border-gray-200 pt-8"><h2 className="mb-4 text-2xl">Sources</h2><ul className="list-disc space-y-2 pl-6">{post.data.seo.sources.map((source) => <li key={source}><a href={source} rel="noreferrer noopener" className="break-all text-primary hover:underline">{source}</a></li>)}</ul></section>}
          {post.data.transparency.aiDisclosure && <p className="mt-10 rounded-lg bg-gray-100 p-4 text-sm text-gray-600"><strong>Editorial disclosure:</strong> {post.data.transparency.aiDisclosure}</p>}
        </div>
      </article>
    </>
  );
}
