export const HOMEPAGE_PILLAR_DESTINATIONS = [
  {
    id: "pillar_weeknight_dinners",
    title: "Quick & Easy Weeknight Dinners",
    description: "Find practical dinner ideas by the time and method you have available.",
    href: "/blog?mealType=dinner",
  },
  {
    id: "pillar_chicken",
    title: "Chicken Recipes & Cooking Guides",
    description: "Reliable recipes and technique-first guidance for cooking chicken well.",
    href: "/blog?category=chicken",
  },
  {
    id: "pillar_cooking_techniques",
    title: "Essential Cooking Techniques",
    description: "Build everyday kitchen confidence with useful, repeatable methods.",
    href: "/blog?category=kitchen-tips",
  },
  {
    id: "pillar_air_fryer",
    title: "Air Fryer Recipes & Guides",
    description: "Explore crisp, efficient cooking with air-fryer recipes and advice.",
    href: "/blog?q=air+fryer",
  },
  {
    id: "pillar_meal_prep",
    title: "Meal Prep & Make-Ahead Cooking",
    description: "Plan ahead with useful prep strategies and make-ahead inspiration.",
    href: "/blog?q=meal+prep",
  },
] as const;

export const HOMEPAGE_INGREDIENT_DESTINATIONS = [
  {
    title: "Chicken",
    href: "/blog?category=chicken",
    status: "Browse collection",
    variant: "chicken",
  },
  { title: "Beef", status: "Coming soon", variant: "beef" },
  { title: "Seafood", status: "Coming soon", variant: "seafood" },
  { title: "Vegetarian", status: "Coming soon", variant: "vegetarian" },
] as const;

interface HomepagePostCandidate {
  slug: string;
  data: {
    contentType: string;
    featuredImage: unknown;
  };
}

export function selectHomepageContent<T extends HomepagePostCandidate>(
  latest: T[],
  dinners: T[],
) {
  const hero = latest.find(
    (post) => post.data.contentType === "recipe" && post.data.featuredImage,
  ) ?? latest.find((post) => post.data.featuredImage) ?? latest[0];
  const usedSlugs = new Set(hero ? [hero.slug] : []);
  const quickDinners = dinners
    .filter((post) => !usedSlugs.has(post.slug))
    .slice(0, 4);

  for (const post of quickDinners) usedSlugs.add(post.slug);

  const latestPublished = latest
    .filter((post) => !usedSlugs.has(post.slug))
    .slice(0, 6);

  return { hero, quickDinners, latestPublished };
}
