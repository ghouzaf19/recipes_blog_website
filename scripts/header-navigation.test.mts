import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

interface NavigationEntry {
  label: string;
  href: string;
}

const headerPath = new URL("../src/components/Header.tsx", import.meta.url);

function matches(
  source: string,
  pattern: RegExp,
): NavigationEntry[] {
  return [...source.matchAll(pattern)].map((match) => ({
    label: match[1] ?? "",
    href: match[2] ?? "",
  }));
}

test("header navigation keeps its approved destinations", async () => {
  const source = await readFile(headerPath, "utf8");
  const groups = matches(
    source,
    /name: "([^"]+)",\s+href: "([^"]+)"/g,
  );
  const submenuItems = matches(
    source,
    /\{ label: "([^"]+)", href: "([^"]+)" \}/g,
  );

  assert.deepEqual(groups, [
    { label: "Dinners", href: "/blog?mealType=dinner" },
    { label: "Meals", href: "/blog" },
    { label: "Ingredients", href: "/blog" },
    { label: "Occasions", href: "/blog" },
    { label: "Cuisines", href: "/blog" },
    { label: "Kitchen Tips", href: "/blog?category=kitchen-tips" },
  ]);
  assert.deepEqual(submenuItems, [
    { label: "Quick Dinners", href: "/blog?mealType=dinner" },
    { label: "Healthy Dinners", href: "/blog?category=healthy-dinners" },
    { label: "Kid-Friendly", href: "/blog?category=kid-friendly" },
    { label: "Breakfast", href: "/blog?mealType=breakfast" },
    { label: "Lunch", href: "/blog?mealType=lunch" },
    { label: "Appetizers", href: "/blog?mealType=appetizers" },
    { label: "Soups", href: "/blog?mealType=soups" },
    { label: "Chicken", href: "/blog?category=chicken" },
    { label: "Beef", href: "/blog?category=beef" },
    { label: "Seafood", href: "/blog?category=seafood" },
    { label: "Vegetarian", href: "/blog?diet=vegetarian" },
    { label: "Holidays", href: "/blog?occasion=holidays" },
    { label: "Party Recipes", href: "/blog?occasion=party-recipes" },
    { label: "Date Night", href: "/blog?occasion=date-night" },
    { label: "Italian", href: "/blog?cuisine=italian" },
    { label: "Mexican", href: "/blog?cuisine=mexican" },
    { label: "Asian", href: "/blog?cuisine=asian" },
    { label: "Indian", href: "/blog?cuisine=indian" },
  ]);
  assert.doesNotMatch(source, /category=quick-dinners/);
});
