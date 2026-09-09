import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COOKETRICKS_CONTENT_REGISTRY } from "@/content/content-registry";
import {
  getPosts,
  getWordPressErrorCategory,
  type BlogPost,
} from "@/lib/wordpress";
import { createPageMetadata } from "@/lib/site";
import {
  THEME_PREVIEW_INGREDIENT_DESTINATIONS,
  THEME_PREVIEW_PILLAR_DESTINATIONS,
  selectThemePreviewContent,
} from "./content";
import styles from "./theme-preview.module.css";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Homepage Theme Preview",
    socialTitle: "CookeTricks Homepage Theme Preview",
    description: "An isolated, non-indexable preview of a possible CookeTricks homepage direction.",
    path: "/theme-preview",
  }),
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const revalidate = 300;

type SectionName = "latest" | "quick-dinners" | "kitchen-tips";

function published(posts: BlogPost[]) {
  return posts.filter((post) => post.status === "publish" && post.title.trim().length > 0);
}

function publicPosts(result: PromiseSettledResult<BlogPost[]>, section: SectionName) {
  if (result.status === "fulfilled") return published(result.value);

  console.error("[theme-preview:wordpress-section-failed]", {
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

function ArticleCard({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  const image = post.data.featuredImage;
  const kind = post.data.contentType === "recipe" ? "Published recipe" : "Published cooking guide";

  return (
    <article className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ""}`}>
      <Link href={`/blog/${post.slug}`} className={styles.cardImageLink} aria-label={`Read ${post.title}`}>
        <div className={styles.cardImage}>
          {image ? (
            <Image
              src={image.url}
              alt={image.alt || post.title}
              fill
              sizes={compact ? "(max-width: 700px) 100vw, 31vw" : "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 31vw"}
              className={styles.coverImage}
            />
          ) : (
            <div className={styles.imageFallback} aria-hidden="true">CT</div>
          )}
        </div>
      </Link>
      <div className={styles.cardBody}>
        <p className={styles.eyebrow}>{kind}</p>
        <h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>
        {post.excerpt ? <p>{plainText(post.excerpt)}</p> : null}
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
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

export default async function ThemePreviewPage() {
  const [latestResult, dinnersResult, tipsResult] = await Promise.allSettled([
    getPosts({ perPage: 16 }),
    getPosts({ mealType: "dinner", perPage: 8 }),
    getPosts({ category: "kitchen-tips", perPage: 6 }),
  ]);

  const latest = publicPosts(latestResult, "latest");
  const dinners = publicPosts(dinnersResult, "quick-dinners");
  const tips = publicPosts(tipsResult, "kitchen-tips");
  const { hero: heroPost, quickDinners, latestPublished } = selectThemePreviewContent(
    latest,
    dinners,
  );
  const dinnerCollectionIsChickenFocused = quickDinners.length > 0 && quickDinners.every(
    (post) => post.data.taxonomies.categories.some(({ slug }) => slug === "chicken"),
  );
  const plannedRecipeCount = COOKETRICKS_CONTENT_REGISTRY.articles.filter(
    (article) => article.contentType === "recipe" && article.workflowStatus === "idea",
  ).length;

  return (
    <main className={styles.preview}>
      <div className={styles.previewNotice} role="note">
        <span>Theme preview</span>
        <p>This review route is separate from the live homepage and is not indexed.</p>
      </div>

      <header className={styles.localHeader}>
        <Link href="/theme-preview" className={styles.wordmark} aria-label="CookeTricks theme preview home">
          Cooke<span>Tricks</span>
        </Link>
        <nav aria-label="Theme preview sections">
          <a href="#quick-dinners">Quick dinners</a>
          <a href="#explore">Explore</a>
          <a href="#techniques">Kitchen tips</a>
          <Link href="/authors/cooke-tricks-editorial">About</Link>
        </nav>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <div className={styles.mobileMenuPanel}>
            <nav aria-label="Theme preview mobile navigation">
              <Link href="/blog?mealType=dinner">Quick Dinners</Link>
              <Link href="/blog">Recipes/Blog</Link>
              <Link href="/blog?category=kitchen-tips">Kitchen Tips</Link>
              <Link href="/authors/cooke-tricks-editorial">About</Link>
            </nav>
            <form action="/blog" method="get" role="search" className={styles.mobileSearch}>
              <label className={styles.srOnly} htmlFor="theme-preview-mobile-search">Search CookeTricks</label>
              <input id="theme-preview-mobile-search" name="q" type="search" placeholder="Search recipes…" />
              <button type="submit">Search</button>
            </form>
          </div>
        </details>
        <form action="/blog" method="get" role="search" className={styles.headerSearch}>
          <label className={styles.srOnly} htmlFor="theme-preview-search">Search CookeTricks</label>
          <input id="theme-preview-search" name="q" type="search" placeholder="Search recipes…" />
          <button type="submit">Search</button>
        </form>
      </header>

      <section className={styles.hero} aria-labelledby="preview-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Practical recipes. Useful techniques.</p>
          <h1 id="preview-hero-title">Cook dinner with more confidence.</h1>
          <p className={styles.heroLead}>Find clear recipes and cooking guides designed for busy home cooks—not an endless scroll of guesswork.</p>
          <form action="/blog" method="get" role="search" className={styles.heroSearch}>
            <label className={styles.srOnly} htmlFor="theme-preview-hero-search">Search recipes and cooking guides</label>
            <input id="theme-preview-hero-search" name="q" type="search" placeholder="What would you like to cook?" />
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
            <Link href={`/blog/${heroPost.slug}`} className={styles.heroImage} aria-label={`Read ${heroPost.title}`}>
              <Image
                src={heroPost.data.featuredImage.url}
                alt={heroPost.data.featuredImage.alt || heroPost.title}
                fill
                preload
                sizes="(max-width: 760px) 100vw, 52vw"
                className={styles.coverImage}
              />
            </Link>
          ) : (
            <div className={styles.heroImage}>
              <Image src="/hero-image.png" alt="A table set with colorful food" fill preload sizes="(max-width: 760px) 100vw, 52vw" className={styles.coverImage} />
            </div>
          )}
          <div className={styles.heroCaption}>
            <span>{heroPost ? "From the published collection" : "CookeTricks visual preview"}</span>
            <strong>{heroPost?.title ?? "Everyday food, presented with warmth"}</strong>
            {heroPost ? <Link href={`/blog/${heroPost.slug}`} className={styles.heroArticleLink}>Read the featured recipe <span aria-hidden="true">→</span></Link> : null}
            {!heroPost ? <small>Visual presentation only; imagery is not evidence of recipe testing.</small> : null}
          </div>
        </div>
      </section>

      <aside className={styles.adSlot} aria-label="Reserved future advertisement space">
        <span>Reserved future ad space</span>
      </aside>

      <section id="quick-dinners" className={styles.section}>
        <SectionHeading eyebrow="Start with tonight" title="Quick dinners for busy evenings" copy="Browse the existing public Dinner collection by method, then build confidence with practical technique guides." />
        {quickDinners.length ? (
          <div className={styles.featureGrid}>{quickDinners.map((post) => <ArticleCard key={post.id} post={post} />)}</div>
        ) : <EmptySection message="The public Dinner collection is temporarily unavailable." />}
        <div className={styles.sectionAction}><Link href="/blog?mealType=dinner">See all quick dinners <span aria-hidden="true">→</span></Link></div>
        {dinnerCollectionIsChickenFocused ? <p className={styles.inventoryNote}>The current published Dinner collection is focused on chicken. Broader weeknight recipes remain in development and will appear only after testing and publication.</p> : null}
        <p className={styles.planningNote}>{plannedRecipeCount} registry recipe ideas currently remain at “Needs testing.” They are intentionally not presented here as published content.</p>
      </section>

      <section id="explore" className={`${styles.section} ${styles.pillarSection}`}>
        <SectionHeading eyebrow="Explore CookeTricks" title="Five ways into a better meal" copy="These are the canonical subject areas guiding the CookeTricks editorial roadmap." />
        <div className={styles.pillarGrid}>
          {THEME_PREVIEW_PILLAR_DESTINATIONS.map((pillar, index) => (
            <Link href={pillar.href} key={pillar.id} className={styles.pillarCard}>
              <span className={styles.pillarNumber}>0{index + 1}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
              <strong>Explore <span aria-hidden="true">→</span></strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading eyebrow="Fresh from the kitchen" title="Latest published recipes and guides" copy="A direct route into the newest publicly available CookeTricks content." />
        {latestPublished.length ? (
          <div className={styles.latestGrid}>{latestPublished.map((post) => <ArticleCard key={post.id} post={post} compact />)}</div>
        ) : <EmptySection message="Latest public content is temporarily unavailable." />}
        <div className={styles.sectionAction}><Link href="/blog">Browse all published content <span aria-hidden="true">→</span></Link></div>
      </section>

      <section id="techniques" className={`${styles.section} ${styles.techniqueSection}`}>
        <div className={styles.techniqueIntro}>
          <p className={styles.eyebrow}>Kitchen confidence</p>
          <h2>Small techniques that change the whole meal.</h2>
          <p>Clear explanations help home cooks understand what is happening in the pan—and what to adjust next time.</p>
          <Link href="/blog?category=kitchen-tips">Visit Kitchen Tips <span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.techniqueList}>
          {tips.length ? tips.slice(0, 4).map((post, index) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className={styles.techniqueLink}>
              <span>0{index + 1}</span><strong>{post.title}</strong><i aria-hidden="true">→</i>
            </Link>
          )) : <EmptySection message="Kitchen Tips are temporarily unavailable." />}
        </div>
      </section>

      <aside className={`${styles.adSlot} ${styles.adSlotShort}`} aria-label="Reserved future advertisement space">
        <span>Reserved future ad space</span>
      </aside>

      <section className={styles.section}>
        <SectionHeading eyebrow="Cook with what you have" title="Discover by main ingredient" copy="Move quickly from an ingredient in the fridge to the most relevant public collection." />
        <div className={styles.ingredientGrid}>
          {THEME_PREVIEW_INGREDIENT_DESTINATIONS.map((item) => "href" in item ? (
            <Link href={item.href} key={item.title} className={styles.ingredientCard}>
              <span aria-hidden="true">✦</span><strong>{item.title}</strong><small>{item.status}</small>
            </Link>
          ) : (
            <div key={item.title} className={`${styles.ingredientCard} ${styles.ingredientCardFuture}`}>
              <span aria-hidden="true">✦</span><strong>{item.title}</strong><small>{item.status}</small>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.trustSection}`} aria-labelledby="trust-title">
        <div>
          <p className={styles.eyebrow}>Why trust CookeTricks</p>
          <h2 id="trust-title">Editorial care you can see.</h2>
          <p>CookeTricks is building a practical cooking library around original writing, original food photography, careful sourcing, and recipes that are physically tested at least twice before final approval.</p>
          <Link href="/authors/cooke-tricks-editorial">Meet CookeTricks Editorial <span aria-hidden="true">→</span></Link>
        </div>
        <ul className={styles.trustList}>
          <li><strong>Test before approval</strong><span>Recipe ideas stay clearly marked as needing testing until the standard is met.</span></li>
          <li><strong>Original, useful detail</strong><span>Expect practical checkpoints, failure cases, and troubleshooting—not borrowed claims.</span></li>
          <li><strong>Transparent authorship</strong><span>Published guidance has an accountable editorial identity and visible review context.</span></li>
        </ul>
      </section>

      <section className={`${styles.section} ${styles.newsletter}`} aria-labelledby="newsletter-title">
        <div>
          <p className={styles.eyebrow}>A calmer cooking inbox</p>
          <h2 id="newsletter-title">CookeTricks email updates are coming soon.</h2>
          <p>We are preparing a useful, occasional email for new recipes and practical cooking guides. There is no signup form yet.</p>
        </div>
        <div className={styles.newsletterStatus} role="note">
          <strong>Coming soon</strong>
          <span>No email address is being collected on this preview.</span>
        </div>
      </section>
    </main>
  );
}
