import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { COOKETRICKS_CONTENT_REGISTRY } from "../src/content/content-registry.ts";
import {
  THEME_PREVIEW_INGREDIENT_DESTINATIONS,
  THEME_PREVIEW_PILLAR_DESTINATIONS,
  selectThemePreviewContent,
} from "../src/app/theme-preview/content.ts";

const pagePath = new URL("../src/app/theme-preview/page.tsx", import.meta.url);
const homepagePath = new URL("../src/app/page.tsx", import.meta.url);
const headerPath = new URL("../src/components/Header.tsx", import.meta.url);
const footerPath = new URL("../src/components/Footer.tsx", import.meta.url);
const sitemapPath = new URL("../src/app/sitemap.ts", import.meta.url);
const stylesPath = new URL("../src/app/theme-preview/theme-preview.module.css", import.meta.url);

test("theme preview is isolated and explicitly noindex, nofollow", async () => {
  const [page, homepage, header, footer, sitemap] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(homepagePath, "utf8"),
    readFile(headerPath, "utf8"),
    readFile(footerPath, "utf8"),
    readFile(sitemapPath, "utf8"),
  ]);

  assert.match(page, /path: "\/theme-preview"/);
  assert.match(page, /robots:\s*\{[\s\S]*?index: false,[\s\S]*?follow: false,/);
  assert.doesNotMatch(homepage, /theme-preview/);
  assert.doesNotMatch(header, /theme-preview/);
  assert.doesNotMatch(footer, /theme-preview/);
  assert.doesNotMatch(sitemap, /theme-preview/);
});

test("preview destinations use current working filters and all canonical pillars", () => {
  assert.deepEqual(
    THEME_PREVIEW_PILLAR_DESTINATIONS.map(({ id, href }) => ({ id, href })),
    [
      { id: "pillar_weeknight_dinners", href: "/blog?mealType=dinner" },
      { id: "pillar_chicken", href: "/blog?category=chicken" },
      { id: "pillar_cooking_techniques", href: "/blog?category=kitchen-tips" },
      { id: "pillar_air_fryer", href: "/blog?q=air+fryer" },
      { id: "pillar_meal_prep", href: "/blog?q=meal+prep" },
    ],
  );
});

test("preview treats registry ideas as planning data, not published content", async () => {
  const page = await readFile(pagePath, "utf8");
  const ideas = COOKETRICKS_CONTENT_REGISTRY.articles.filter(
    ({ workflowStatus }) => workflowStatus === "idea",
  );

  assert.match(page, /post\.status === "publish"/);
  assert.match(page, /currently remain at “Needs testing.”/);
  for (const idea of ideas) {
    assert.doesNotMatch(page, new RegExp(idea.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(page, new RegExp(idea.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(page, new RegExp(idea.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("search stays functional and the preview makes no invented proof claims", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /<form action="\/blog" method="get" role="search"/);
  assert.match(page, /name="q" type="search"/);
  assert.doesNotMatch(page, /ratingValue|reviewCount|aggregateRating/i);
  assert.doesNotMatch(page, /\b[1-5](?:\.\d)?\s*(?:stars?|\/\s*5)\b/i);
  assert.doesNotMatch(page, /<form[^>]*newsletter/i);
});

test("hero, quick dinners, and latest content never repeat the same post", () => {
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

  const selection = selectThemePreviewContent(
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

test("preview-only mobile navigation is accessible and keeps production links intact", async () => {
  const [page, header] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(headerPath, "utf8"),
  ]);

  assert.match(page, /<details className=\{styles\.mobileMenu\}>/);
  assert.match(page, /<summary>Menu<\/summary>/);
  assert.match(page, /aria-label="Theme preview mobile navigation"/);
  assert.match(page, /href="\/blog\?mealType=dinner">Quick Dinners/);
  assert.match(page, /href="\/blog\?category=kitchen-tips">Kitchen Tips/);
  assert.match(page, /className=\{styles\.mobileSearch\}/);
  assert.doesNotMatch(header, /Theme preview mobile navigation|theme-preview-mobile-search/);
});

test("ingredient discovery exposes only collections verified as populated", () => {
  const linked = THEME_PREVIEW_INGREDIENT_DESTINATIONS.filter((item) => "href" in item);
  const future = THEME_PREVIEW_INGREDIENT_DESTINATIONS.filter((item) => !("href" in item));

  assert.deepEqual(linked, [
    { title: "Chicken", href: "/blog?category=chicken", status: "Browse published recipes" },
  ]);
  assert.deepEqual(future.map(({ title }) => title), ["Beef", "Seafood", "Vegetarian"]);
  assert.ok(future.every(({ status }) => status.includes("coming")));
});

test("newsletter is an honest static coming-soon module", async () => {
  const page = await readFile(pagePath, "utf8");
  const newsletter = page.slice(page.indexOf("styles.newsletter"), page.indexOf("</main>"));

  assert.match(newsletter, /email updates are coming soon/i);
  assert.match(newsletter, /There is no signup form yet/);
  assert.match(newsletter, /No email address is being collected/);
  assert.doesNotMatch(newsletter, /<form|<input|<button/);
});

test("dark-section contrast and responsive card grids use the approved preview rules", async () => {
  const styles = await readFile(stylesPath, "utf8");

  assert.match(styles, /--preview-on-dark: #fff8ea;/);
  assert.match(styles, /--preview-on-dark-muted: #e7ded0;/);
  assert.match(styles, /\.pillarSection \.eyebrow \{ color: #f4c761; \}/);
  assert.match(styles, /\.pillarSection \.sectionHeading h2 \{ color: var\(--preview-on-dark\); \}/);
  assert.match(styles, /\.pillarCard h3 \{[\s\S]*?color: var\(--preview-on-dark\);/);
  assert.match(styles, /\.techniqueIntro h2 \{ color: var\(--preview-on-dark\); \}/);
  assert.match(styles, /\.techniqueIntro > a \{ color: #f4c761; \}/);
  assert.match(styles, /\.techniqueLink strong \{[\s\S]*?color: var\(--preview-on-dark\);/);
  assert.match(
    styles,
    /@media \(max-width: 740px\) \{[\s\S]*?\.featureGrid, \.latestGrid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    styles,
    /@media \(max-width: 560px\) \{[\s\S]*?\.featureGrid, \.latestGrid \{ grid-template-columns: 1fr;/,
  );
  assert.match(styles, /\.preview ~ :global\(footer\) :is\(p, a\) \{ font-size: \.9rem;/);
});
