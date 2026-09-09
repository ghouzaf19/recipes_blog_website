import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { COOKETRICKS_CONTENT_REGISTRY } from "../src/content/content-registry.ts";
import {
  HOMEPAGE_INGREDIENT_DESTINATIONS,
  HOMEPAGE_PILLAR_DESTINATIONS,
  selectHomepageContent,
} from "../src/app/homepage-content.ts";

const homepagePath = new URL("../src/app/page.tsx", import.meta.url);
const headerPath = new URL("../src/components/Header.tsx", import.meta.url);
const footerPath = new URL("../src/components/Footer.tsx", import.meta.url);
const sitemapPath = new URL("../src/app/sitemap.ts", import.meta.url);
const stylesPath = new URL("../src/app/homepage.module.css", import.meta.url);
const retiredRouteName = ["theme", "preview"].join("-");
const retiredPagePath = new URL(`../src/app/${retiredRouteName}/page.tsx`, import.meta.url);

test("production homepage is canonical and the isolated review route is retired", async () => {
  const [homepage, header, footer, sitemap] = await Promise.all([
    readFile(homepagePath, "utf8"),
    readFile(headerPath, "utf8"),
    readFile(footerPath, "utf8"),
    readFile(sitemapPath, "utf8"),
  ]);

  await assert.rejects(access(retiredPagePath));
  assert.match(homepage, /path: "\/"/);
  assert.match(homepage, /title: "Practical Recipes & Cooking Guides \| CookeTricks"/);
  assert.match(homepage, /<Header \/>/);
  assert.doesNotMatch(homepage, /index: false|follow: false|noarchive|nosnippet|noimageindex/);
  assert.doesNotMatch(header, new RegExp(retiredRouteName));
  assert.doesNotMatch(footer, new RegExp(retiredRouteName));
  assert.doesNotMatch(sitemap, new RegExp(retiredRouteName));
});

test("homepage destinations use current working filters and all canonical pillars", () => {
  assert.deepEqual(
    HOMEPAGE_PILLAR_DESTINATIONS.map(({ id, href }) => ({ id, href })),
    [
      { id: "pillar_weeknight_dinners", href: "/blog?mealType=dinner" },
      { id: "pillar_chicken", href: "/blog?category=chicken" },
      { id: "pillar_cooking_techniques", href: "/blog?category=kitchen-tips" },
      { id: "pillar_air_fryer", href: "/blog?q=air+fryer" },
      { id: "pillar_meal_prep", href: "/blog?q=meal+prep" },
    ],
  );
});

test("homepage only presents published WordPress records as content", async () => {
  const page = await readFile(homepagePath, "utf8");
  const ideas = COOKETRICKS_CONTENT_REGISTRY.articles.filter(
    ({ workflowStatus }) => workflowStatus === "idea",
  );

  assert.match(page, /post\.status === "publish"/);
  assert.doesNotMatch(page, /COOKETRICKS_CONTENT_REGISTRY/);
  for (const idea of ideas) {
    assert.doesNotMatch(page, new RegExp(idea.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(page, new RegExp(idea.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(page, new RegExp(idea.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("search stays functional and the homepage makes no invented proof claims", async () => {
  const page = await readFile(homepagePath, "utf8");

  assert.match(page, /<form\s+action="\/blog"\s+method="get"\s+role="search"/);
  assert.match(page, /name="q"\s+type="search"/);
  assert.doesNotMatch(page, /ratingValue|reviewCount|aggregateRating/i);
  assert.doesNotMatch(page, /\b[1-5](?:\.\d)?\s*(?:stars?|\/\s*5)\b/i);
  assert.doesNotMatch(page, /<form[^>]*newsletter/i);
});

test("hero, quick dinners, and latest published content never repeat a post", () => {
  const post = (slug: string, contentType: string, featuredImage: boolean) => ({
    slug,
    data: { contentType, featuredImage: featuredImage ? { url: `/${slug}.jpg` } : null },
  });
  const airFryer = post("air-fryer-chicken-breast", "recipe", true);
  const grilled = post("grilled-chicken-breast", "recipe", true);
  const panSeared = post("pan-seared-chicken-breast", "recipe", true);
  const marinade = post("chicken-breast-marinade", "guide", true);
  const seasoning = post("chicken-breast-seasoning", "guide", true);
  const measurement = post("kitchen-measurement-conversion-chart", "guide", true);
  const mushrooms = post("how-to-saute-mushrooms-golden-brown", "guide", true);

  const selection = selectHomepageContent(
    [airFryer, grilled, panSeared, marinade, seasoning, measurement, mushrooms],
    [airFryer, grilled, panSeared, marinade, seasoning],
  );
  const displayedSlugs = [
    selection.hero?.slug,
    ...selection.quickDinners.map(({ slug }) => slug),
    ...selection.latestPublished.map(({ slug }) => slug),
  ].filter((slug): slug is string => Boolean(slug));

  assert.equal(selection.hero, airFryer);
  assert.equal(selection.hero?.data.contentType, "recipe");
  assert.ok(selection.hero?.data.featuredImage);
  assert.deepEqual(selection.quickDinners.map(({ slug }) => slug), [
    "grilled-chicken-breast",
    "pan-seared-chicken-breast",
    "chicken-breast-marinade",
    "chicken-breast-seasoning",
  ]);
  assert.deepEqual(selection.latestPublished.map(({ slug }) => slug), [
    "kitchen-measurement-conversion-chart",
    "how-to-saute-mushrooms-golden-brown",
  ]);
  assert.equal(new Set(displayedSlugs).size, displayedSlugs.length);
});

test("production header retains accessible desktop, mobile, and search controls", async () => {
  const header = await readFile(headerPath, "utf8");

  assert.match(header, /aria-label="Main navigation"/);
  assert.match(header, /aria-label="Mobile navigation"/);
  assert.match(header, /aria-label=\{isMenuOpen \? "Close menu" : "Open menu"\}/);
  assert.match(header, /aria-label="Search recipes"/);
  assert.match(header, /\{ label: "Quick Dinners", href: "\/blog\?mealType=dinner" \}/);
});

test("ingredient discovery uses four visual variants and links only populated Chicken", async () => {
  const [page, styles] = await Promise.all([
    readFile(homepagePath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);
  const linked = HOMEPAGE_INGREDIENT_DESTINATIONS.filter((item) => "href" in item);
  const future = HOMEPAGE_INGREDIENT_DESTINATIONS.filter((item) => !("href" in item));

  assert.equal(HOMEPAGE_INGREDIENT_DESTINATIONS.length, 4);
  assert.deepEqual(
    HOMEPAGE_INGREDIENT_DESTINATIONS.map(({ title, variant }) => ({ title, variant })),
    [
      { title: "Chicken", variant: "chicken" },
      { title: "Beef", variant: "beef" },
      { title: "Seafood", variant: "seafood" },
      { title: "Vegetarian", variant: "vegetarian" },
    ],
  );
  assert.deepEqual(linked, [
    {
      title: "Chicken",
      href: "/blog?category=chicken",
      status: "Browse collection",
      variant: "chicken",
    },
  ]);
  assert.deepEqual(future.map(({ title }) => title), ["Beef", "Seafood", "Vegetarian"]);
  assert.ok(future.every(({ status }) => status === "Coming soon"));
  assert.match(page, /"href" in item \? \(/);
  assert.match(page, /<Link[\s\S]*?className=\{`\$\{styles\.ingredientCard\} \$\{styles\.ingredientCardLink\}/);
  assert.match(page, /<div[\s\S]*?className=\{`\$\{styles\.ingredientCard\} \$\{styles\.ingredientCardFuture\}/);
  assert.doesNotMatch(page, /tabIndex|onClick/);
  assert.doesNotMatch(
    JSON.stringify(HOMEPAGE_INGREDIENT_DESTINATIONS),
    /category=(?:beef|seafood|vegetarian)/,
  );
  for (const className of [
    "ingredientChicken",
    "ingredientBeef",
    "ingredientSeafood",
    "ingredientVegetarian",
  ]) {
    assert.match(styles, new RegExp(`\\.${className} \\{`));
  }
  assert.match(styles, /\.ingredientCardFuture \{ cursor: default; \}/);
  assert.match(styles, /\.ingredientCardLink:hover/);
  assert.match(styles, /\.ingredientCardLink:focus-visible/);
});

test("newsletter is an honest static coming-soon module", async () => {
  const page = await readFile(homepagePath, "utf8");
  const newsletter = page.slice(page.indexOf("styles.newsletter"), page.indexOf("</main>"));

  assert.match(newsletter, /email updates are coming soon/i);
  assert.match(newsletter, /There is no signup form yet/);
  assert.match(newsletter, /No email address is being collected/);
  assert.doesNotMatch(newsletter, /<form|<input|<button/);
});

test("dark-section contrast and responsive card grids use the approved homepage rules", async () => {
  const styles = await readFile(stylesPath, "utf8");

  assert.match(styles, /--home-on-dark: #fff8ea;/);
  assert.match(styles, /--home-on-dark-muted: #e7ded0;/);
  assert.match(styles, /\.pillarSection \.eyebrow \{ color: #f4c761; \}/);
  assert.match(styles, /\.pillarSection \.sectionHeading h2 \{ color: var\(--home-on-dark\); \}/);
  assert.match(styles, /\.pillarCard h3 \{[\s\S]*?color: var\(--home-on-dark\);/);
  assert.match(styles, /\.techniqueIntro h2 \{ color: var\(--home-on-dark\); \}/);
  assert.match(styles, /\.techniqueIntro > a \{ color: #f4c761; \}/);
  assert.match(styles, /\.techniqueLink strong \{[\s\S]*?color: var\(--home-on-dark\);/);
  assert.match(
    styles,
    /@media \(max-width: 740px\) \{[\s\S]*?\.featureGrid, \.latestGrid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 560px\) \{[\s\S]*?\.featureGrid, \.latestGrid \{ grid-template-columns: 1fr;/,
  );
  assert.match(styles, /\.homepage ~ :global\(footer\) :is\(p, a\) \{ font-size: \.9rem;/);
});

test("homepage exposes direct editorial and recipe-testing policy links", async () => {
  const page = await readFile(homepagePath, "utf8");

  assert.match(page, /href="\/editorial-policy"/);
  assert.match(page, /href="\/recipe-testing"/);
  assert.match(page, /href="\/authors\/cooke-tricks-editorial"/);
});

async function sourceFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: URL[] = [];

  for (const entry of entries) {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (/\.(?:ts|tsx|css|mts)$/.test(entry.name)) files.push(target);
  }

  return files;
}

test("retired review-route identifiers are absent from application and test sources", async () => {
  const files = [
    ...await sourceFiles(new URL("../src/", import.meta.url)),
    ...await sourceFiles(new URL("./", import.meta.url)),
  ];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, new RegExp(retiredRouteName, "i"), file.pathname);
  }
});
