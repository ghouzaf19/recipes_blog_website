import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import {
  getPosts,
  getWordPressErrorCategory,
  safeJsonLd,
  type BlogPost,
} from "@/lib/wordpress";
import { createPageMetadata, SITE_URL } from "@/lib/site";
import {
  HOMEPAGE_INGREDIENT_DESTINATIONS,
  HOMEPAGE_PILLAR_DESTINATIONS,
  selectHomepageContent,
} from "./homepage-content";
import styles from "./homepage.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Practical Recipes & Cooking Guides | CookeTricks",
  socialTitle: "CookeTricks - Practical Recipes & Cooking Guides",
  description:
    "Practical recipes and cooking guides with clear instructions, timing, temperatures, and troubleshooting for everyday home cooks.",
  path: "/",
});

export const revalidate = 300;

type SectionName = "latest" | "quick-dinners" | "kitchen-tips";

function published(posts: BlogPost[]) {
  return posts.filter(
    (post) => post.status === "publish" && post.title.trim().length > 0,
  );
}

function publicPosts(
  result: PromiseSettledResult<BlogPost[]>,
  section: SectionName,
) {
  if (result.status === "fulfilled") return published(result.value);

  console.error("[homepage:wordpress-section-failed]", {
    section,
    category: getWordPressErrorCategory(result.reason),
  });
  return [];
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function ArticleCard({
  post,
  compact = false,
}: {
  post: BlogPost;
  compact?: boolean;
}) {
  const image = post.data.featuredImage;
  const kind =
    post.data.contentType === "recipe"
      ? "Published recipe"
      : "Published cooking guide";

  return (
    <article
      className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ""}`}
    >
      <Link
        href={`/blog/${post.slug}`}
        className={styles.cardImageLink}
        aria-label={`Read ${post.title}`}
      >
        <div className={styles.cardImage}>
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || post.title}
              fill
              sizes={
                compact
                  ? "(max-width: 560px) calc(100vw - 36px), (max-width: 1000px) calc(50vw - 26px), 31vw"
                  : "(max-width: 560px) calc(100vw - 36px), (max-width: 1000px) calc(50vw - 26px), (max-width: 1100px) 50vw, 31vw"
              }
              className={styles.coverImage}
            />
          ) : (
            <div className={styles.imageFallback} aria-hidden="true">
              CT
            </div>
          )}
        </div>
      </Link>
      <div className={styles.cardBody}>
        <p className={styles.eyebrow}>{kind}</p>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt ? <p>{plainText(post.excerpt)}</p> : null}
      </div>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return <p className={styles.emptyState}>{message}</p>;
}

const ingredientVariantClasses = {
  chicken: styles.ingredientChicken,
  beef: styles.ingredientBeef,
  seafood: styles.ingredientSeafood,
  vegetarian: styles.ingredientVegetarian,
} as const;

export default async function Home() {
  const [latestResult, dinnersResult, tipsResult] = await Promise.allSettled([
    getPosts({ perPage: 16 }),
    getPosts({ mealType: "dinner", perPage: 8 }),
    getPosts({ category: "kitchen-tips", perPage: 6 }),
  ]);

  const latest = publicPosts(latestResult, "latest");
  const dinners = publicPosts(dinnersResult, "quick-dinners");
  const tips = publicPosts(tipsResult, "kitchen-tips");
  const { hero: heroPost, quickDinners, latestPublished } =
    selectHomepageContent(latest, dinners);
  const dinnerCollectionIsChickenFocused =
    quickDinners.length > 0 &&
    quickDinners.every((post) =>
      post.data.taxonomies.categories.some(({ slug }) => slug === "chicken"),
    );
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CookeTricks",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
      />
      <Header />
      <main className={styles.homepage}>
        <section className={styles.hero} aria-labelledby="homepage-hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Practical recipes. Useful techniques.</p>
            <h1 id="homepage-hero-title">Cook dinner with more confidence.</h1>
            <p className={styles.heroLead}>
              Find clear recipes and cooking guides designed for busy home
              cooks—not an endless scroll of guesswork.
            </p>
            <form
              action="/blog"
              method="get"
              role="search"
              className={styles.heroSearch}
            >
              <label className={styles.srOnly} htmlFor="homepage-hero-search">
                Search recipes and cooking guides
              </label>
              <input
                id="homepage-hero-search"
                name="q"
                type="search"
                placeholder="What would you like to cook?"
              />
              <button type="submit">Find a recipe</button>
            </form>
            <div className={styles.quickLinks} aria-label="Popular searches">
              <Link href="/blog?mealType=dinner">Quick dinners</Link>
              <Link href="/blog?category=chicken">Chicken</Link>
              <Link href="/blog?category=kitchen-tips">Kitchen tips</Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            {heroPost?.data.featuredImage ? (
              <Link
                href={`/blog/${heroPost.slug}`}
                className={styles.heroImage}
                aria-label={`Read ${heroPost.title}`}
              >
                <Image
                  src={heroPost.data.featuredImage.url}
                  alt={heroPost.data.featuredImage.alt || heroPost.title}
                  fill
                  preload
                  sizes="(max-width: 760px) 100vw, 56vw"
                  className={styles.coverImage}
                />
              </Link>
            ) : (
              <div className={styles.heroImage}>
                <div className={styles.imageFallback} aria-hidden="true">
                  CT
                </div>
              </div>
            )}
            <div className={styles.heroCaption}>
              <span>
                {heroPost
                  ? "From the published collection"
                  : "CookeTricks"}
              </span>
              <strong>
                {heroPost?.title ?? "Published content temporarily unavailable"}
              </strong>
              {heroPost ? (
                <Link
                  href={`/blog/${heroPost.slug}`}
                  className={styles.heroArticleLink}
                >
                  Read the featured recipe <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <aside
          className={styles.adSlot}
          aria-label="Reserved future advertisement space"
        >
          <span>Reserved future ad space</span>
        </aside>

        <section id="quick-dinners" className={styles.section}>
          <SectionHeading
            eyebrow="Start with tonight"
            title="Quick dinners for busy evenings"
            copy="Browse the existing public Dinner collection by method, then build confidence with practical technique guides."
          />
          {quickDinners.length ? (
            <div className={styles.featureGrid}>
              {quickDinners.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptySection message="The public Dinner collection is temporarily unavailable." />
          )}
          <div className={styles.sectionAction}>
            <Link href="/blog?mealType=dinner">
              See all quick dinners <span aria-hidden="true">→</span>
            </Link>
          </div>
          {dinnerCollectionIsChickenFocused ? (
            <p className={styles.inventoryNote}>
              The current published Dinner collection is focused on chicken.
              Broader weeknight recipes remain in development and will appear
              only after testing and publication.
            </p>
          ) : null}
        </section>

        <section id="explore" className={`${styles.section} ${styles.pillarSection}`}>
          <SectionHeading
            eyebrow="Explore CookeTricks"
            title="Five ways into a better meal"
            copy="These are the canonical subject areas guiding the CookeTricks editorial roadmap."
          />
          <div className={styles.pillarGrid}>
            {HOMEPAGE_PILLAR_DESTINATIONS.map((pillar, index) => (
              <Link href={pillar.href} key={pillar.id} className={styles.pillarCard}>
                <span className={styles.pillarNumber}>0{index + 1}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
                <strong>
                  Explore <span aria-hidden="true">→</span>
                </strong>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="Fresh from the kitchen"
            title="Latest published recipes and guides"
            copy="A direct route into the newest publicly available CookeTricks content."
          />
          {latestPublished.length ? (
            <div className={styles.latestGrid}>
              {latestPublished.map((post) => (
                <ArticleCard key={post.id} post={post} compact />
              ))}
            </div>
          ) : (
            <EmptySection message="Latest public content is temporarily unavailable." />
          )}
          <div className={styles.sectionAction}>
            <Link href="/blog">
              Browse all published content <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section
          id="techniques"
          className={`${styles.section} ${styles.techniqueSection}`}
        >
          <div className={styles.techniqueIntro}>
            <p className={styles.eyebrow}>Kitchen confidence</p>
            <h2>Small techniques that change the whole meal.</h2>
            <p>
              Clear explanations help home cooks understand what is happening
              in the pan—and what to adjust next time.
            </p>
            <Link href="/blog?category=kitchen-tips">
              Visit Kitchen Tips <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.techniqueList}>
            {tips.length ? (
              tips.slice(0, 4).map((post, index) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  className={styles.techniqueLink}
                >
                  <span>0{index + 1}</span>
                  <strong>{post.title}</strong>
                  <i aria-hidden="true">→</i>
                </Link>
              ))
            ) : (
              <EmptySection message="Kitchen Tips are temporarily unavailable." />
            )}
          </div>
        </section>

        <aside
          className={`${styles.adSlot} ${styles.adSlotShort}`}
          aria-label="Reserved future advertisement space"
        >
          <span>Reserved future ad space</span>
        </aside>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="Cook with what you have"
            title="Discover by main ingredient"
            copy="Move quickly from an ingredient in the fridge to the most relevant public collection."
          />
          <div className={styles.ingredientGrid}>
            {HOMEPAGE_INGREDIENT_DESTINATIONS.map((item) =>
              "href" in item ? (
                <Link
                  href={item.href}
                  key={item.title}
                  className={`${styles.ingredientCard} ${styles.ingredientCardLink} ${ingredientVariantClasses[item.variant]}`}
                >
                  <span aria-hidden="true">✦</span>
                  <strong>{item.title}</strong>
                  <small>{item.status}</small>
                </Link>
              ) : (
                <div
                  key={item.title}
                  className={`${styles.ingredientCard} ${styles.ingredientCardFuture} ${ingredientVariantClasses[item.variant]}`}
                  aria-label={`${item.title}: Coming soon. This collection is not available yet.`}
                >
                  <span aria-hidden="true">✦</span>
                  <strong>{item.title}</strong>
                  <small>{item.status}</small>
                </div>
              ),
            )}
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.trustSection}`}
          aria-labelledby="trust-title"
        >
          <div>
            <p className={styles.eyebrow}>Why trust CookeTricks</p>
            <h2 id="trust-title">Editorial care you can see.</h2>
            <p>
              CookeTricks is building a practical cooking library around
              original writing, original food photography, careful sourcing,
              and recipes that are physically tested at least twice before
              final approval.
            </p>
            <div className={styles.trustLinks}>
              <Link href="/authors/cooke-tricks-editorial">
                Meet CookeTricks Editorial <span aria-hidden="true">→</span>
              </Link>
              <Link href="/editorial-policy">Editorial policy</Link>
              <Link href="/recipe-testing">Recipe testing standards</Link>
            </div>
          </div>
          <ul className={styles.trustList}>
            <li>
              <strong>Test before approval</strong>
              <span>
                Recipe ideas stay clearly marked as needing testing until the
                standard is met.
              </span>
            </li>
            <li>
              <strong>Original, useful detail</strong>
              <span>
                Expect practical checkpoints, failure cases, and
                troubleshooting—not borrowed claims.
              </span>
            </li>
            <li>
              <strong>Transparent authorship</strong>
              <span>
                Published guidance has an accountable editorial identity and
                visible review context.
              </span>
            </li>
          </ul>
        </section>

        <section
          className={`${styles.section} ${styles.newsletter}`}
          aria-labelledby="newsletter-title"
        >
          <div>
            <p className={styles.eyebrow}>A calmer cooking inbox</p>
            <h2 id="newsletter-title">
              CookeTricks email updates are coming soon.
            </h2>
            <p>
              We are preparing a useful, occasional email for new recipes and
              practical cooking guides. There is no signup form yet.
            </p>
          </div>
          <div className={styles.newsletterStatus} role="note">
            <strong>Coming soon</strong>
            <span>No email address is being collected yet.</span>
          </div>
        </section>
      </main>
    </>
  );
}
