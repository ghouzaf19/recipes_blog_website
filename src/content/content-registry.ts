import { SITE_URL } from "../lib/site.ts";

export const ARTICLE_WORKFLOW_STATUSES = [
  "idea",
  "brief",
  "drafting",
  "review",
  "approved",
  "published",
] as const;

export const CONTENT_TYPES = [
  "recipe",
  "guide",
  "pillar",
  "comparison",
] as const;

export const CONTENT_LINK_RELATIONSHIPS = [
  "parent-pillar",
  "sibling-cluster",
  "related-recipe",
  "related-guide",
] as const;

export const WORDPRESS_SYNC_STATUSES = [
  "not-synced",
  "draft",
  "scheduled",
  "published",
  "sync-error",
] as const;

export type ArticleWorkflowStatus =
  (typeof ARTICLE_WORKFLOW_STATUSES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentLinkRelationship =
  (typeof CONTENT_LINK_RELATIONSHIPS)[number];
export type WordPressSyncStatus =
  (typeof WORDPRESS_SYNC_STATUSES)[number];

export interface Project {
  id: string;
  schemaVersion: 1;
  name: string;
  slug: string;
  siteUrl: string;
  language: string;
}

export interface Niche {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  description?: string;
}

export interface Pillar {
  id: string;
  nicheId: string;
  title: string;
  slug: string;
  description?: string;
  primaryEntity?: string;
  searchIntent?: string;
}

export interface Cluster {
  id: string;
  pillarId: string;
  title: string;
  slug: string;
  description?: string;
  searchIntent?: string;
  funnelStage?: string;
}

export interface ArticleSeo {
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  tags: string[];
}

export interface Article {
  id: string;
  projectId: string;
  pillarId: string;
  clusterId: string;
  title: string;
  slug: string;
  brief?: string;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  searchIntent?: string;
  contentType: ContentType;
  seo: ArticleSeo;
  workflowStatus: ArticleWorkflowStatus;
}

export interface ContentLink {
  id: string;
  sourceArticleId: string;
  targetType: "pillar" | "article";
  targetId: string;
  relationship: ContentLinkRelationship;
  anchorText?: string;
  placement?: "introduction" | "body" | "related-content";
  status: "suggested" | "approved" | "inserted" | "removed";
}

/**
 * CMS state is deliberately separate from Article. This record contains IDs and
 * sync state only; credentials belong in server-side secret storage.
 */
export interface WordPressBinding {
  id: string;
  articleId: string;
  siteId: string;
  postId: number | null;
  postType: "post" | "page";
  status: WordPressSyncStatus;
  wordpressSlug?: string;
  categoryIds: number[];
  tagIds: number[];
  customTaxonomies: Record<string, number[]>;
  featuredMediaId?: number;
  lastSyncedAt?: string;
  contentChecksum?: string;
  idempotencyKey: string;
}

export interface PublicationSchedule {
  id: string;
  articleId: string;
  mode: "manual" | "drip";
  scheduledFor?: string;
  timezone: string;
  sequence?: number;
}

export interface ContentRegistry {
  projects: Project[];
  niches: Niche[];
  pillars: Pillar[];
  clusters: Cluster[];
  articles: Article[];
  contentLinks: ContentLink[];
  wordpressBindings: WordPressBinding[];
  publicationSchedules: PublicationSchedule[];
}

export const COOKETRICKS_PROJECT_ID = "project_cooketricks";
export const COOKETRICKS_NICHE_ID = "niche_practical_recipes";

export const COOKETRICKS_CONTENT_REGISTRY = {
  projects: [
    {
      id: COOKETRICKS_PROJECT_ID,
      schemaVersion: 1,
      name: "CookeTricks",
      slug: "cooketricks",
      siteUrl: SITE_URL,
      language: "en-US",
    },
  ],
  niches: [
    {
      id: COOKETRICKS_NICHE_ID,
      projectId: COOKETRICKS_PROJECT_ID,
      title: "Practical Recipes & Cooking Guides",
      slug: "practical-recipes-cooking-guides",
    },
  ],
  pillars: [
    {
      id: "pillar_chicken",
      nicheId: COOKETRICKS_NICHE_ID,
      title: "Chicken Recipes & Cooking Guides",
      slug: "chicken-recipes-cooking-guides",
    },
    {
      id: "pillar_weeknight_dinners",
      nicheId: COOKETRICKS_NICHE_ID,
      title: "Quick & Easy Weeknight Dinners",
      slug: "quick-easy-weeknight-dinners",
    },
    {
      id: "pillar_cooking_techniques",
      nicheId: COOKETRICKS_NICHE_ID,
      title: "Essential Cooking Techniques",
      slug: "essential-cooking-techniques",
    },
    {
      id: "pillar_air_fryer",
      nicheId: COOKETRICKS_NICHE_ID,
      title: "Air Fryer Recipes & Guides",
      slug: "air-fryer-recipes-guides",
    },
    {
      id: "pillar_meal_prep",
      nicheId: COOKETRICKS_NICHE_ID,
      title: "Meal Prep & Make-Ahead Cooking",
      slug: "meal-prep-make-ahead-cooking",
    },
  ],
  clusters: [],
  articles: [],
  contentLinks: [],
  wordpressBindings: [],
  publicationSchedules: [],
} satisfies ContentRegistry;

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function validateSiblingSlugs(
  errors: string[],
  entityName: string,
  records: Array<{ id: string; parentId: string; slug: string }>,
): void {
  const keys = records.map(
    ({ parentId, slug }) => `${parentId}\u0000${slug.toLowerCase()}`,
  );

  for (const duplicate of findDuplicates(keys)) {
    const [parentId, slug] = duplicate.split("\u0000");
    errors.push(
      `Duplicate ${entityName} slug "${slug}" under parent "${parentId}".`,
    );
  }
}

export function validateContentRegistry(
  registry: ContentRegistry,
): RegistryValidationResult {
  const errors: string[] = [];
  const collections = [
    ...registry.projects.map(({ id }) => ({ id, type: "project" })),
    ...registry.niches.map(({ id }) => ({ id, type: "niche" })),
    ...registry.pillars.map(({ id }) => ({ id, type: "pillar" })),
    ...registry.clusters.map(({ id }) => ({ id, type: "cluster" })),
    ...registry.articles.map(({ id }) => ({ id, type: "article" })),
    ...registry.contentLinks.map(({ id }) => ({ id, type: "content link" })),
    ...registry.wordpressBindings.map(({ id }) => ({
      id,
      type: "WordPress binding",
    })),
    ...registry.publicationSchedules.map(({ id }) => ({
      id,
      type: "publication schedule",
    })),
  ];

  for (const record of collections) {
    if (!hasValue(record.id)) {
      errors.push(`A ${record.type} has an empty ID.`);
    }
  }

  for (const duplicate of findDuplicates(collections.map(({ id }) => id))) {
    errors.push(`Duplicate registry ID "${duplicate}".`);
  }

  const projects = new Map(registry.projects.map((item) => [item.id, item]));
  const niches = new Map(registry.niches.map((item) => [item.id, item]));
  const pillars = new Map(registry.pillars.map((item) => [item.id, item]));
  const clusters = new Map(registry.clusters.map((item) => [item.id, item]));
  const articles = new Map(registry.articles.map((item) => [item.id, item]));

  const sluggedRecords = [
    ...registry.projects.map(({ id, slug }) => ({ type: "project", id, slug })),
    ...registry.niches.map(({ id, slug }) => ({ type: "niche", id, slug })),
    ...registry.pillars.map(({ id, slug }) => ({ type: "pillar", id, slug })),
    ...registry.clusters.map(({ id, slug }) => ({ type: "cluster", id, slug })),
    ...registry.articles.map(({ id, slug }) => ({ type: "article", id, slug })),
  ];

  for (const { type, id, slug } of sluggedRecords) {
    if (!SLUG_PATTERN.test(slug)) {
      errors.push(`${type} "${id}" has invalid canonical slug "${slug}".`);
    }
  }

  validateSiblingSlugs(
    errors,
    "niche",
    registry.niches.map(({ id, projectId, slug }) => ({
      id,
      parentId: projectId,
      slug,
    })),
  );
  validateSiblingSlugs(
    errors,
    "pillar",
    registry.pillars.map(({ id, nicheId, slug }) => ({
      id,
      parentId: nicheId,
      slug,
    })),
  );
  validateSiblingSlugs(
    errors,
    "cluster",
    registry.clusters.map(({ id, pillarId, slug }) => ({
      id,
      parentId: pillarId,
      slug,
    })),
  );
  validateSiblingSlugs(
    errors,
    "article",
    registry.articles.map(({ id, clusterId, slug }) => ({
      id,
      parentId: clusterId,
      slug,
    })),
  );

  for (const niche of registry.niches) {
    if (!projects.has(niche.projectId)) {
      errors.push(`Niche "${niche.id}" references a missing project.`);
    }
  }

  for (const pillar of registry.pillars) {
    if (!niches.has(pillar.nicheId)) {
      errors.push(`Pillar "${pillar.id}" references a missing niche.`);
    }
  }

  for (const cluster of registry.clusters) {
    if (!pillars.has(cluster.pillarId)) {
      errors.push(`Cluster "${cluster.id}" references a missing pillar.`);
    }
  }

  for (const article of registry.articles) {
    const pillar = pillars.get(article.pillarId);
    const cluster = clusters.get(article.clusterId);

    if (!projects.has(article.projectId)) {
      errors.push(`Article "${article.id}" references a missing project.`);
    }
    if (!pillar) {
      errors.push(`Article "${article.id}" references a missing pillar.`);
    }
    if (!cluster) {
      errors.push(`Article "${article.id}" references a missing cluster.`);
    } else if (cluster.pillarId !== article.pillarId) {
      errors.push(
        `Article "${article.id}" has a cluster outside its assigned pillar.`,
      );
    }
  }

  const edgeKeys: string[] = [];
  for (const link of registry.contentLinks) {
    const source = articles.get(link.sourceArticleId);
    edgeKeys.push(
      [
        link.sourceArticleId,
        link.targetType,
        link.targetId,
        link.relationship,
      ].join("\u0000"),
    );

    if (!source) {
      errors.push(`Content link "${link.id}" has a missing source article.`);
      continue;
    }

    if (link.targetType === "pillar") {
      if (!pillars.has(link.targetId)) {
        errors.push(`Content link "${link.id}" has a missing target pillar.`);
      }
      if (link.relationship !== "parent-pillar") {
        errors.push(
          `Content link "${link.id}" uses a pillar target for a non-parent relationship.`,
        );
      } else if (link.targetId !== source.pillarId) {
        errors.push(
          `Content link "${link.id}" does not target its source article's pillar.`,
        );
      }
      continue;
    }

    const target = articles.get(link.targetId);
    if (!target) {
      errors.push(`Content link "${link.id}" has a missing target article.`);
      continue;
    }
    if (target.id === source.id) {
      errors.push(`Content link "${link.id}" links an article to itself.`);
    }
    if (link.relationship === "parent-pillar") {
      errors.push(
        `Content link "${link.id}" uses an article target for a parent-pillar relationship.`,
      );
    }
    if (
      link.relationship === "sibling-cluster" &&
      target.clusterId !== source.clusterId
    ) {
      errors.push(
        `Content link "${link.id}" targets an article outside the source cluster.`,
      );
    }
    if (
      link.relationship === "related-recipe" &&
      target.contentType !== "recipe"
    ) {
      errors.push(`Content link "${link.id}" does not target a recipe.`);
    }
    if (
      link.relationship === "related-guide" &&
      target.contentType !== "guide"
    ) {
      errors.push(`Content link "${link.id}" does not target a guide.`);
    }
  }

  for (const duplicate of findDuplicates(edgeKeys)) {
    const [sourceId, targetType, targetId, relationship] =
      duplicate.split("\u0000");
    errors.push(
      `Duplicate content link edge: ${sourceId} -> ${targetType}:${targetId} (${relationship}).`,
    );
  }

  for (const binding of registry.wordpressBindings) {
    if (!articles.has(binding.articleId)) {
      errors.push(
        `WordPress binding "${binding.id}" references a missing article.`,
      );
    }
  }
  for (const articleId of findDuplicates(
    registry.wordpressBindings.map(({ articleId }) => articleId),
  )) {
    errors.push(`Article "${articleId}" has multiple WordPress bindings.`);
  }

  for (const schedule of registry.publicationSchedules) {
    if (!articles.has(schedule.articleId)) {
      errors.push(
        `Publication schedule "${schedule.id}" references a missing article.`,
      );
    }
    if (schedule.mode === "drip" && !schedule.scheduledFor) {
      errors.push(
        `Drip publication schedule "${schedule.id}" has no scheduled date.`,
      );
    }
  }
  for (const articleId of findDuplicates(
    registry.publicationSchedules.map(({ articleId }) => articleId),
  )) {
    errors.push(`Article "${articleId}" has multiple active schedules.`);
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidContentRegistry(
  registry: ContentRegistry,
): asserts registry is ContentRegistry {
  const result = validateContentRegistry(registry);

  if (!result.valid) {
    throw new Error(`Invalid content registry:\n${result.errors.join("\n")}`);
  }
}

assertValidContentRegistry(COOKETRICKS_CONTENT_REGISTRY);
