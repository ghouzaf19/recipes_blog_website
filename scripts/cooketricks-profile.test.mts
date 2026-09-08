import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileUrl = new URL("../cooketricks_profile.json", import.meta.url);
const rawProfile = readFileSync(profileUrl, "utf8");
const CANONICAL_URL = "https://cooketricks.com";

const EXPECTED_MENUS = [
  "Dinners: Quick Dinners, Healthy Dinners, Kid-Friendly",
  "Meals: Breakfast, Lunch, Appetizers, Soups",
  "Ingredients: Chicken, Beef, Seafood, Vegetarian",
  "Occasions: Holidays, Party Recipes, Date Night",
  "Cuisines: Italian, Mexican, Asian, Indian",
  "Kitchen Tips",
];

function parseProfile(): unknown {
  return JSON.parse(rawProfile) as unknown;
}

function assertRecord(
  value: unknown,
  name: string,
): asserts value is Record<string, unknown> {
  assert.equal(
    typeof value === "object" && value !== null && !Array.isArray(value),
    true,
    `${name} must be an object`,
  );
}

function collectKeyPaths(
  value: unknown,
  path = "$",
  paths: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectKeyPaths(item, `${path}[${index}]`, paths)
    );
    return paths;
  }

  if (typeof value !== "object" || value === null) {
    return paths;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    paths.push(childPath);
    collectKeyPaths(child, childPath, paths);
  }

  return paths;
}

function isCredentialField(path: string): boolean {
  const key = path.split(".").at(-1)?.replace(/\[\d+\]/g, "") ?? "";
  const normalized = key.replace(/[-_]/g, "").toLowerCase();
  return [
    "password",
    "applicationpassword",
    "secret",
    "token",
    "apikey",
    "credential",
    "credentials",
    "username",
  ].includes(normalized);
}

function requireRule(checklist: unknown[], pattern: RegExp): void {
  assert.equal(
    checklist.some((item) => typeof item === "string" && pattern.test(item)),
    true,
    `Missing approved profile rule: ${pattern}`,
  );
}

test("profile is valid JSON with the required structure", () => {
  assert.doesNotThrow(() => parseProfile());
  const profile = parseProfile();
  assertRecord(profile, "profile");

  for (const field of [
    "pName",
    "pRegion",
    "pNiche",
    "pTheme",
    "pReadability",
    "pStory",
    "pAddress",
    "pGSC",
    "pSocialStrat",
    "pSearch",
  ]) {
    assert.equal(typeof profile[field], "string", `${field} must be a string`);
  }

  assertRecord(profile.appData, "appData");
  for (const field of [
    "menus",
    "socials",
    "mediaLinks",
    "sitemap",
    "affiliates",
    "competitors",
    "qaChecklist",
    "authors",
    "colors",
  ]) {
    assert.equal(Array.isArray(profile.appData[field]), true, `${field} must be an array`);
  }
  assert.equal(typeof profile.appData.sitemapDescription, "string");
  assertRecord(profile.appData.sourceOfTruth, "appData.sourceOfTruth");
  assert.equal(typeof profile.appData.sourceOfTruth.projectRules, "string");
  assert.equal(typeof profile.appData.sourceOfTruth.contentRegistry, "string");
  assert.equal(typeof profile.appData.sourceOfTruth.runtimeBehavior, "string");
});

test("profile uses the canonical CookeTricks identity and routes", () => {
  const profile = parseProfile();
  assertRecord(profile, "profile");
  assert.equal(profile.pName, "CookeTricks");
  assert.equal(profile.pAddress, CANONICAL_URL);
  assert.doesNotMatch(rawProfile, /https:\/\/www\.cooketricks\.com/i);

  assertRecord(profile.appData, "appData");
  assert.deepEqual(profile.appData.menus, EXPECTED_MENUS);
  assert.equal(Array.isArray(profile.appData.sitemap), true);
  for (const route of profile.appData.sitemap as unknown[]) {
    assert.equal(typeof route, "string");
    const url = new URL(route as string);
    assert.equal(url.origin, CANONICAL_URL);
  }

  const authors = profile.appData.authors;
  assert.ok(Array.isArray(authors));
  assert.equal(authors.length, 1);
  const author = authors[0];
  assertRecord(author, "appData.authors[0]");
  assert.equal(author.name, "CookeTricks Editorial");
  assert.equal(typeof author.bio, "string");
});

test("profile contains no legacy brands or credential fields", () => {
  assert.doesNotMatch(
    rawProfile,
    /meat\s*lovers\s*hub|meatlovers|juicy\s*joe|grill\s*master/i,
  );

  const credentialFields = collectKeyPaths(parseProfile()).filter(
    isCredentialField,
  );
  assert.deepEqual(credentialFields, []);
  assert.equal(
    collectKeyPaths(parseProfile()).some((path) =>
      /\.authors(?:\[|$)|\.authorship(?:\.|$)/i.test(path)
    ),
    true,
  );
});

test("profile enforces approved editorial and publishing rules", () => {
  const profile = parseProfile();
  assertRecord(profile, "profile");
  assertRecord(profile.appData, "appData");
  assert.equal(Array.isArray(profile.appData.qaChecklist), true);
  const checklist = profile.appData.qaChecklist as unknown[];

  requireRule(checklist, /workflowStatus: "idea".*Needs testing/i);
  requireRule(checklist, /physically tested at least twice.*approved binding internal standard/i);
  requireRule(checklist, /original food photography.*production standard.*recipe publication/i);
  requireRule(checklist, /illustrative or AI-assisted imagery is not evidence.*physically tested/i);
  requireRule(checklist, /WordPress drafts only when authorized/i);
  requireRule(checklist, /direct publishing requires explicit approval/i);
  assert.match(
    profile.appData.sitemapDescription as string,
    /curated list.*not a complete copy.*generated XML sitemap/i,
  );

  assertRecord(profile.appData.sourceOfTruth, "appData.sourceOfTruth");
  assert.match(
    profile.appData.sourceOfTruth.projectRules as string,
    /brand, audience, editorial, testing, SEO, and publishing rules/i,
  );
  assert.match(
    profile.appData.sourceOfTruth.contentRegistry as string,
    /src\/content\/content-registry\.ts.*pillars, clusters, articles, and ContentLink records/i,
  );
  assert.match(
    profile.appData.sourceOfTruth.runtimeBehavior as string,
    /application code.*src\/components\/Header\.tsx.*navigation destinations and runtime behavior/i,
  );
  assert.doesNotMatch(
    rawProfile,
    /cluster_weeknight_dinners_by_method|article_quick_weeknight_dinners/,
  );
});
