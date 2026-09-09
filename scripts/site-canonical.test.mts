import assert from "node:assert/strict";
import test from "node:test";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "https://www.cooketricks.com/";

const site = await import(
  new URL(
    `../src/lib/site.ts?canonical-test=${Date.now()}`,
    import.meta.url,
  ).href
);

if (originalSiteUrl === undefined) {
  delete process.env.NEXT_PUBLIC_SITE_URL;
} else {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
}

const CANONICAL_ORIGIN = "https://cooketricks.com";
const CANONICAL_AUTHOR_URL =
  `${CANONICAL_ORIGIN}/authors/cooke-tricks-editorial`;

test("www environment values normalize all canonical metadata to non-www", () => {
  assert.equal(site.SITE_URL, CANONICAL_ORIGIN);
  assert.equal(
    site.normalizeSiteUrl("https://www.cooketricks.com/some/path?x=1"),
    CANONICAL_ORIGIN,
  );
  assert.equal(
    site.normalizeSiteUrl("http://localhost:3000/"),
    "http://localhost:3000",
  );

  const metadata = site.createPageMetadata({
    title: "Homepage",
    description: "Homepage description",
    path: "/",
  });

  assert.equal(metadata.alternates?.canonical, `${CANONICAL_ORIGIN}/`);
  assert.equal(metadata.openGraph?.url, `${CANONICAL_ORIGIN}/`);

  const filteredMetadata = site.createPageMetadata({
    title: "Filtered listing",
    description: "Filtered listing description",
    path: "/blog?mealType=dinner&page=2",
  });

  assert.equal(
    filteredMetadata.alternates?.canonical,
    `${CANONICAL_ORIGIN}/blog?mealType=dinner&page=2`,
  );
});

test("robots always advertises the non-www sitemap and host", () => {
  const robots = site.createRobotsMetadata();

  assert.equal(robots.host, CANONICAL_ORIGIN);
  assert.equal(robots.sitemap, `${CANONICAL_ORIGIN}/sitemap.xml`);
});

test("sitemap uses non-www URLs and only the canonical editorial author", () => {
  const sitemap = site.createSitemapEntries([
    {
      slug: "example-recipe",
      modifiedAt: "2026-09-09T00:00:00.000Z",
      data: { contentType: "recipe" },
    },
  ]);
  const urls: string[] = sitemap.map(
    ({ url }: { url: string }) => url,
  );

  assert.equal(
    urls.every((url) => new URL(url).origin === CANONICAL_ORIGIN),
    true,
  );
  assert.equal(urls.some((url) => url.includes("www.cooketricks.com")), false);
  assert.equal(urls.some((url) => url.includes("aghouzaf19gmail-com")), false);
  assert.equal(
    urls.filter((url) => url === CANONICAL_AUTHOR_URL).length,
    1,
  );
});

test("www redirect is permanent and preserves every path segment", () => {
  const [redirect] = site.getCanonicalHostRedirects();

  assert.deepEqual(redirect, {
    source: "/:path*",
    has: [
      {
        type: "host",
        value: "www\\.cooketricks\\.com",
      },
    ],
    destination: `${CANONICAL_ORIGIN}/:path*`,
    permanent: true,
  });
});

test("redirect host matching excludes localhost, CMS, and unrelated hosts", () => {
  const [redirect] = site.getCanonicalHostRedirects();
  const hostPattern = redirect.has[0]?.value;
  assert.ok(hostPattern);
  const matchesHost = (host: string) =>
    new RegExp(`^(?:${hostPattern})$`, "i").test(host);

  assert.equal(matchesHost("www.cooketricks.com"), true);
  assert.equal(matchesHost("localhost:3000"), false);
  assert.equal(matchesHost("cms.cooketricks.com"), false);
  assert.equal(matchesHost("preview.example.com"), false);
});
