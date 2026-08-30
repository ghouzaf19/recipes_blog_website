import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Search, UtensilsCrossed } from "lucide-react";
import Header from "@/components/Header";
import type { Metadata } from "next";
import {
  getPosts,
  safeJsonLd,
  type BlogPost,
} from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "CookeTricks - Practical Recipes & Cooking Guides",
  description:
    "Practical recipes and cooking guides with clear instructions, timing, temperatures, and troubleshooting for everyday home cooks.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 300;

type PostCard = BlogPost;

function imageUrl(post: PostCard) {
  return post.data.featuredImage?.url;
}

function imageAlt(post: PostCard) {
  return post.data.featuredImage?.alt || post.title;
}

function contentLabel(post: PostCard) {
  if (post.data.contentType === "recipe") return "Recipe";
  return "Cooking Guide";
}

function PostImage({
  post,
  priority = false,
  sizes,
  className = "",
}: {
  post: PostCard;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  const src = imageUrl(post);

  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#f6f1eb]">
        <UtensilsCrossed className="h-10 w-10 text-[#A94F2B]/50" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={imageAlt(post)}
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover ${className}`}
    />
  );
}

function RecipeCard({ post }: { post: PostCard }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block"
    >
      <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-gray-100">
        <PostImage
          post={post}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#A94F2B]">
        {contentLabel(post)}
      </p>

      <h3 className="text-xl font-semibold leading-snug text-gray-900 transition-colors group-hover:text-[#A94F2B]">
        {post.title}
      </h3>

      {post.excerpt && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}

function SectionHeading({
  title,
  description,
  href,
  linkText = "View all",
}: {
  title: string;
  description?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 border-b border-gray-200 pb-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-gray-600">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-[#A94F2B] hover:underline sm:flex"
        >
          {linkText}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default async function Home() {
  let latestPosts: PostCard[] = [];
  let chickenPosts: PostCard[] = [];
  let dinnerPosts: PostCard[] = [];
  let airFryerPosts: PostCard[] = [];
  let guides: PostCard[] = [];

  try {
    const [
      latest,
      chicken,
      dinner,
      airFryer,
      guidePool,
    ] = await Promise.all([
      getPosts({ perPage: 9 }),
      getPosts({ category: "chicken", perPage: 8 }),
      getPosts({ mealType: "dinner", perPage: 8 }),
      getPosts({ search: "air fryer", perPage: 8 }),
      getPosts({ perPage: 30 }),
    ]);

    latestPosts = latest;
    chickenPosts = chicken;
    dinnerPosts = dinner;
    airFryerPosts = airFryer;

    guides = guidePool
      .filter((post) => post.data.contentType === "article")
      .slice(0, 4);
  } catch (error) {
    console.error("Homepage WordPress fetch failed:", error);
  }

  const featuredPost = latestPosts[0] ?? chickenPosts[0] ?? null;
  const latestGrid = latestPosts
    .filter((post) => post.id !== featuredPost?.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CookeTricks",
    url: "https://cooketricks.com",
    description:
      "Practical recipes and cooking guides for everyday home cooks.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://cooketricks.com/blog?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(jsonLd),
        }}
      />

      <Header />

      {/* HERO INTRO */}
      <section className="border-b border-[#eadfd6] bg-[#fbf7f3]">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2B]">
              Practical home cooking
            </p>

            <h1 className="font-serif text-[2.35rem] sm:text-5xl md:text-6xl font-semibold leading-[1.08] text-gray-900">
              Recipes that tell you how, why, and what can go wrong.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Clear recipes, cooking times, temperatures, techniques, and
              troubleshooting for everyday home cooks.
            </p>

            <form
              action="/blog"
              method="GET"
              className="relative mt-8 max-w-xl"
            >
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type="search"
                name="q"
                placeholder="Search recipes and cooking guides..."
                className="w-full rounded-full border border-gray-300 bg-white py-4 pl-13 pr-28 text-base shadow-sm outline-none transition focus:border-[#A94F2B] focus:ring-2 focus:ring-[#A94F2B]/20"
              />

              <button
                type="submit"
                className="absolute right-2 top-2 rounded-full bg-[#A94F2B] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#873d22]"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">

        {/* FEATURED + LATEST */}
        {featuredPost && (
          <section className="py-14 md:py-18">
            <div className="grid gap-10 lg:grid-cols-12">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group lg:col-span-7"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <PostImage
                    post={featuredPost}
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>

                <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#A94F2B]">
                  Featured {contentLabel(featuredPost)}
                </p>

                <h2 className="mt-2 font-serif text-[2rem] sm:text-4xl md:text-5xl font-semibold leading-[1.1] transition-colors group-hover:text-[#A94F2B]">
                  {featuredPost.title}
                </h2>

                {featuredPost.excerpt && (
                  <p className="mt-4 max-w-2xl text-lg leading-7 text-gray-600">
                    {featuredPost.excerpt}
                  </p>
                )}
              </Link>

              <div className="lg:col-span-5">
                <h2 className="mb-6 font-serif text-3xl font-semibold">
                  Latest Recipes
                </h2>

                <div className="divide-y divide-gray-200 border-t border-gray-200">
                  {latestGrid.map((post) => (
                    <Link
                      href={`/blog/${post.slug}`}
                      key={post.id}
                      className="group grid grid-cols-[110px_1fr] gap-4 py-5"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <PostImage
                          post={post}
                          sizes="110px"
                          className="transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      <div className="flex flex-col justify-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A94F2B]">
                          {contentLabel(post)}
                        </p>

                        <h3 className="mt-1 font-semibold leading-snug transition-colors group-hover:text-[#A94F2B]">
                          {post.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BROWSE */}
        <section className="pb-16">
          <SectionHeading
            title="Browse CookeTricks"
            description="Find recipes and guides by what you want to cook or learn."
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              {
                name: "Chicken",
                href: "/blog?category=chicken",
              },
              {
                name: "Quick Dinners",
                href: "/blog?mealType=dinner",
              },
              {
                name: "Air Fryer",
                href: "/blog?q=air+fryer",
              },
              {
                name: "Cooking Guides",
                href: "/blog",
              },
              {
                name: "All Recipes",
                href: "/blog",
              },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex min-h-24 sm:min-h-28 items-center justify-center rounded-2xl border border-[#e9ddd4] bg-[#fbf7f3] px-4 text-center font-serif text-xl font-semibold transition hover:-translate-y-1 hover:border-[#A94F2B] hover:text-[#A94F2B]"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </section>

        {/* CHICKEN */}
        {chickenPosts.length > 0 && (
          <section className="pb-18">
            <SectionHeading
              title="Chicken Tonight"
              description="Reliable chicken recipes and practical guides for getting the timing, temperature, and texture right."
              href="/blog?category=chicken"
              linkText="Explore chicken"
            />

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {chickenPosts.slice(0, 4).map((post) => (
                <RecipeCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* DINNER */}
        {dinnerPosts.length > 0 && (
          <section className="py-16">
            <SectionHeading
              title="Dinner Tonight"
              description="Practical dinner ideas for busy evenings without complicated techniques."
              href="/blog?mealType=dinner"
              linkText="More dinners"
            />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {dinnerPosts.slice(0, 4).map((post) => (
                <RecipeCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* AIR FRYER */}
        {airFryerPosts.length > 0 && (
          <section className="-mx-4 bg-[#f5eee8] px-4 py-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <SectionHeading
              title="Air Fryer Favorites"
              description="Air fryer recipes with practical timing, temperature, and troubleshooting guidance."
              href="/blog?q=air+fryer"
              linkText="Explore air fryer"
            />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {airFryerPosts.slice(0, 4).map((post) => (
                <RecipeCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* COOKING GUIDES */}
        {guides.length > 0 && (
          <section className="py-18">
            <SectionHeading
              title="Practical Cooking Guides"
              description="Understand the technique, not just the recipe."
              href="/blog"
              linkText="Browse guides"
            />

            <div className="grid gap-6 md:grid-cols-2">
              {guides.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex gap-5 border-b border-gray-200 pb-6"
                >
                  <div className="relative h-32 w-36 shrink-0 overflow-hidden bg-gray-100 sm:w-44">
                    <PostImage
                      post={post}
                      sizes="176px"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A94F2B]">
                      Cooking Guide
                    </p>

                    <h3 className="mt-2 font-serif text-xl font-semibold leading-snug transition-colors group-hover:text-[#A94F2B] md:text-2xl">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ABOUT */}
        <section className="pb-18">
          <div className="grid overflow-hidden rounded-3xl bg-[#A94F2B] text-white md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/75">
                About CookeTricks
              </p>

              <h2 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
                Practical cooking, explained clearly.
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">
                CookeTricks focuses on recipes and guides that explain how to
                cook something, why the method works, and what to do when things
                do not go as planned.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/about"
                  className="rounded-full bg-white px-6 py-3 font-bold text-[#A94F2B] transition hover:bg-[#f8ede7]"
                >
                  About CookeTricks
                </Link>

                <Link
                  href="/editorial-policy"
                  className="rounded-full border border-white/40 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  Editorial Policy
                </Link>
              </div>
            </div>

            <div className="flex min-h-[320px] items-center justify-center bg-[#8c3f25] p-10">
              <div className="max-w-sm text-center">
                <UtensilsCrossed className="mx-auto h-16 w-16 text-white/80" />

                <p className="mt-6 font-serif text-2xl font-semibold">
                  How + Why + What Can Go Wrong
                </p>

                <p className="mt-3 leading-7 text-white/80">
                  That is the practical framework behind CookeTricks recipes
                  and cooking guides.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="pb-20">
          <div className="rounded-3xl border border-[#e9ddd4] bg-[#fbf7f3] px-6 py-12 text-center md:px-12 md:py-16">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A94F2B]">
              Find your next recipe
            </p>

            <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl font-semibold md:text-5xl">
              What are you cooking today?
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
              Browse recipes, chicken guides, cooking methods, and practical
              kitchen answers.
            </p>

            <Link
              href="/blog"
              className="mt-8 inline-flex rounded-full bg-[#A94F2B] px-8 py-4 font-bold text-white transition hover:bg-[#873d22]"
            >
              Browse all recipes
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}