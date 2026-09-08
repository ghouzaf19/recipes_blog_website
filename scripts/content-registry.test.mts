import assert from "node:assert/strict";
import test from "node:test";

import {
  COOKETRICKS_CONTENT_REGISTRY,
  validateContentRegistry,
} from "../src/content/content-registry.ts";

const PILLAR_ID = "pillar_weeknight_dinners";
const CLUSTER_ID = "cluster_weeknight_dinners_by_method";
const HUB_ID = "article_quick_weeknight_dinners";
const RECIPE_IDS = [
  "article_one_pot_zucchini_tomato_penne",
  "article_garlic_butter_shrimp_rice_skillet",
  "article_ground_beef_broccoli_stir_fry",
  "article_sheet_pan_sausage_peppers_onions",
  "article_black_bean_sweet_potato_taco_skillet",
  "article_sheet_pan_salmon_green_beans_potatoes",
  "article_crispy_tofu_mushroom_stir_fry",
] as const;

test("weeknight dinner cluster is complete and valid", () => {
  const registry = COOKETRICKS_CONTENT_REGISTRY;
  const cluster = registry.clusters.find(({ id }) => id === CLUSTER_ID);
  const clusterArticles = registry.articles.filter(
    ({ clusterId }) => clusterId === CLUSTER_ID,
  );
  const hub = clusterArticles.find(({ id }) => id === HUB_ID);
  const pasta = clusterArticles.find(
    ({ id }) => id === "article_one_pot_zucchini_tomato_penne",
  );
  const recipes = clusterArticles.filter(({ contentType }) =>
    contentType === "recipe"
  );

  assert.equal(cluster?.pillarId, PILLAR_ID);
  assert.equal(cluster?.slug, "quick-weeknight-dinners-by-method");
  assert.equal(clusterArticles.length, 8);
  assert.equal(hub?.contentType, "guide");
  assert.equal(hub?.workflowStatus, "idea");
  assert.deepEqual(pasta, {
    id: "article_one_pot_zucchini_tomato_penne",
    projectId: "project_cooketricks",
    pillarId: PILLAR_ID,
    clusterId: CLUSTER_ID,
    title: "One-Pot Zucchini Tomato Penne for Busy Weeknights",
    slug: "one-pot-zucchini-tomato-penne",
    primaryKeyword: "one-pot zucchini tomato penne",
    secondaryKeywords: [],
    searchIntent: "transactional",
    contentType: "recipe",
    seo: { tags: [] },
    workflowStatus: "idea",
  });
  assert.deepEqual(
    new Set(recipes.map(({ id }) => id)),
    new Set(RECIPE_IDS),
  );
  assert.equal(
    clusterArticles.every(
      ({ pillarId, clusterId }) =>
        pillarId === PILLAR_ID && clusterId === CLUSTER_ID,
    ),
    true,
  );

  // "idea" is the registry's supported pre-draft equivalent of Needs testing.
  assert.equal(
    recipes.every(
      (article) =>
        article.workflowStatus === "idea" &&
        !("testedDate" in article) &&
        !("testedBy" in article) &&
        !("testNotes" in article),
    ),
    true,
  );

  const allIds = [
    ...registry.projects,
    ...registry.niches,
    ...registry.pillars,
    ...registry.clusters,
    ...registry.articles,
    ...registry.contentLinks,
    ...registry.wordpressBindings,
    ...registry.publicationSchedules,
  ].map(({ id }) => id);
  const allSlugs = [
    ...registry.projects,
    ...registry.niches,
    ...registry.pillars,
    ...registry.clusters,
    ...registry.articles,
  ].map(({ slug }) => slug);

  assert.equal(new Set(allIds).size, allIds.length);
  assert.equal(new Set(allSlugs).size, allSlugs.length);

  const hubLinks = registry.contentLinks.filter(
    ({ sourceArticleId, targetId }) =>
      sourceArticleId === HUB_ID || targetId === HUB_ID,
  );
  assert.equal(hubLinks.length, RECIPE_IDS.length * 2);
  for (const recipeId of RECIPE_IDS) {
    assert.equal(
      hubLinks.some(
        ({ sourceArticleId, targetId, relationship }) =>
          sourceArticleId === HUB_ID &&
          targetId === recipeId &&
          relationship === "sibling-cluster",
      ),
      true,
    );
    assert.equal(
      hubLinks.some(
        ({ sourceArticleId, targetId, relationship }) =>
          sourceArticleId === recipeId &&
          targetId === HUB_ID &&
          relationship === "sibling-cluster",
      ),
      true,
    );
  }

  assert.deepEqual(registry.wordpressBindings, []);
  assert.deepEqual(registry.publicationSchedules, []);
  assert.deepEqual(validateContentRegistry(registry), {
    valid: true,
    errors: [],
  });
});
