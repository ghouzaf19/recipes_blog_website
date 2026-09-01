import Image from "next/image";
import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import Header from "@/components/Header";
import HeroSearchTrigger from "@/components/HeroSearchTrigger";
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
  quality = 75,
}: {
  post: PostCard;
  priority?: boolean;
  sizes: string;
  className?: string;
  quality?: number;
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
      fetchPriority={priority ? "high" : undefined}
      quality={quality}
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

      <h3 className="text-base sm:text-lg lg:text-xl font-semibold leading-snug text-gray-900 transition-colors group-hover:text-[#A94F2B] line-clamp-3">
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
  <div className="mx-auto max-w-[1200px] px-4 py-9 sm:px-6 md:py-11 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#A94F2B] sm:text-sm">
        Practical Home Cooking
      </p>

      <h1 className="font-serif text-[2.05rem] font-semibold leading-[1.08] text-gray-900 sm:text-5xl md:text-6xl">
        Recipes that tell you how, why, and what can go wrong.
      </h1>

      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
        Clear recipes, cooking times, temperatures, techniques, and troubleshooting for everyday home cooks.
      </p>

     <HeroSearchTrigger />
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
  quality={70}
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
  className="group grid grid-cols-[120px_1fr] gap-4 py-5"
>
  <div className="relative aspect-square overflow-hidden bg-gray-100">
    <PostImage
      post={post}
      sizes="120px"
      className="transition-transform duration-500 group-hover:scale-105"
    />
  </div>

  <div className="flex flex-col justify-center">
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A94F2B]">
      {contentLabel(post)}
    </p>

    <h3 className="mt-1 font-semibold text-sm sm:text-base leading-snug transition-colors group-hover:text-[#A94F2B] line-clamp-3">
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

        {/* BROWSE COOKETRICKS */}
<section className="pb-16">
  <SectionHeading
    title="Browse CookeTricks"
    description="Find recipes and cooking guides by what you want to cook or learn."
  />

  <div className="grid grid-cols-6 gap-x-4 gap-y-8 sm:grid-cols-5 sm:gap-6">
    {[
      {
        name: "Chicken",
        href: "/blog?category=chicken",
        img: "/categories/meals.png",
      },
      {
        name: "Quick Dinners",
        href: "/blog?mealType=dinner",
        img: "/categories/dinners.png",
      },
      {
        name: "Air Fryer",
        href: "/blog?q=air+fryer",
        img: "/categories/tips.png",
      },
      {
        name: "Cooking Guides",
        href: "/blog",
        img: "/categories/ingredients.png",
      },
      {
        name: "All Recipes",
        href: "/blog",
        img: "/categories/cuisines.png",
      },
    ].map((item, index) => (
      <Link
        key={item.name}
        href={item.href}
        className={`group col-span-2 flex min-h-[165px] flex-col items-center text-center sm:col-span-1 ${
  index === 3 ? "col-start-2 sm:col-start-auto" : ""
} ${
  index === 4 ? "col-start-4 sm:col-start-auto" : ""
}`}
      >
        <div className="relative aspect-square w-full max-w-[135px] overflow-hidden rounded-full bg-[#f5eee8] ring-1 ring-[#eadfd6] transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-[#A94F2B] group-hover:shadow-md sm:max-w-[155px]">
          <Image
            src={item.img}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 30vw, 155px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <h3 className="mt-3 min-h-[44px] max-w-[140px] font-serif text-sm font-semibold leading-tight text-gray-900 transition-colors group-hover:text-[#A94F2B] sm:text-base">
          {item.name}
        </h3>
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

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

                    <h3 className="mt-2 font-serif text-xl font-semibold leading-snug transition-colors group-hover:text-[#A94F2B] md:text-2xl line-clamp-3">
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

  {/* ABOUT COOKETRICKS */}
<section className="pb-16">
  <div className="overflow-hidden rounded-3xl bg-[#A94F2B] text-white">
    <div className="grid gap-0 md:grid-cols-[1.25fr_0.75fr]">
      <div className="p-8 sm:p-10 md:p-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/75 sm:text-sm">
          About CookeTricks
        </p>

        <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Practical cooking, explained clearly.
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
          CookeTricks focuses on recipes and cooking guides that explain how to
          cook something, why the method works, and what to do when things do
          not go as planned.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/about"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#A94F2B] transition hover:bg-[#f8ede7]"
          >
            About CookeTricks
          </Link>

          <Link
            href="/editorial-policy"
            className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Editorial Policy
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#8c3f25] px-8 py-10 md:px-10">
        <div className="max-w-xs text-center">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-white/80" />

          <p className="mt-5 font-serif text-xl font-semibold sm:text-2xl">
            How + Why + What Can Go Wrong
          </p>

          <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
            The practical framework behind CookeTricks recipes and cooking guides.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

       {/* FINAL CTA */}
<section className="pb-16">
  <div className="rounded-3xl border border-[#e9ddd4] bg-[#fbf7f3] px-6 py-10 text-center sm:px-10 md:py-12">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94F2B] sm:text-sm">
      Keep Cooking
    </p>

    <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
      Find your next recipe or cooking guide.
    </h2>

    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
      Browse practical recipes, chicken guides, air fryer ideas, and everyday cooking techniques.
    </p>

    <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/blog"
        className="inline-flex rounded-full bg-[#A94F2B] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#873d22]"
      >
        Browse All Recipes
      </Link>

      <Link
        href="/blog?category=chicken"
        className="inline-flex rounded-full border border-[#A94F2B]/30 bg-white px-7 py-3 text-sm font-bold text-[#A94F2B] transition hover:border-[#A94F2B]"
      >
        Explore Chicken
      </Link>
    </div>
  </div>
</section>
      </div>
    </main>
  );
}