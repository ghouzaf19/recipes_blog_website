import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

import {
  COOKETRICKS_CONTENT_REGISTRY,
  type ContentRegistry,
  type Pillar,
} from "../src/content/content-registry.ts";
import {
  planTopicalAuthorityImport,
  type LegacyImportCandidate,
} from "./import-topical-authority.ts";

interface ProposedCluster {
  proposedId: string;
  title: string;
  slug: string;
  targetPillarId: string;
  sourcePath: string;
  searchIntent: string | null;
  primaryEntity: string | null;
}

interface ProposedArticle {
  proposedId: string;
  title: string;
  slug: string;
  targetPillarId: string;
  proposedClusterId: string;
  sourcePath: string;
  searchIntent: string | null;
  primaryEntity: string | null;
  funnelStage: string | null;
}

interface ManualReviewItem {
  code: "target-pillar" | "root-cluster" | "ambiguous-mapping";
  slug: string | null;
  message: string;
}

export interface TopicalAuthorityDryRunReport {
  sourceFile: string;
  detectedFormat: "classic" | "semantic-map";
  targetPillar: Pick<Pillar, "id" | "title" | "slug">;
  proposedClusters: ProposedCluster[];
  proposedArticles: ProposedArticle[];
  manualReview: ManualReviewItem[];
  duplicateOrOverlapWarnings: string[];
  omittedSensitiveFieldCount: number;
  totals: {
    clusters: number;
    articles: number;
    manualReviewItems: number;
    duplicateOrOverlapWarnings: number;
  };
}

export class DryRunImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DryRunImportError";
  }
}

const MATCH_STOP_WORDS = new Set([
  "and",
  "cooking",
  "easy",
  "guide",
  "guides",
  "make",
  "recipes",
  "the",
  "with",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tokens(value: string): Set<string> {
  return new Set(
    slugify(value)
      .split("-")
      .filter((token) => token && !MATCH_STOP_WORDS.has(token)),
  );
}

function sharedTokenCount(left: string, right: string): number {
  const leftTokens = tokens(left);
  return [...tokens(right)].filter((token) => leftTokens.has(token)).length;
}

function getRootTopic(input: Record<string, unknown>): string {
  const root = input.niche ?? input.seedEntity;
  if (typeof root !== "string" || !root.trim()) {
    throw new DryRunImportError(
      "Supported export is missing a non-empty niche or seed entity.",
    );
  }
  return root.trim();
}

function selectTargetPillar(rootTopic: string, registry: ContentRegistry): Pillar {
  const ranked = registry.pillars
    .map((pillar) => ({
      pillar,
      score: sharedTokenCount(rootTopic, `${pillar.title} ${pillar.slug}`),
    }))
    .sort((left, right) => right.score - left.score);

  if (!ranked[0] || ranked[0].score === 0) {
    throw new DryRunImportError(
      "No CookeTricks pillar matches this export; manual target selection is required.",
    );
  }

  return ranked[0].pillar;
}

function proposedId(prefix: "cluster" | "article", slug: string): string {
  return `proposed_${prefix}_${slug.replaceAll("-", "_")}`;
}

function findParentIndex(sourcePath: string): number | null {
  const match = sourcePath.match(/^(?:subniches|semanticPillars)\[(\d+)]/);
  return match ? Number(match[1]) : null;
}

function duplicateValues(values: string[]): string[] {
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

function createOverlapWarnings(
  clusters: ProposedCluster[],
  articles: ProposedArticle[],
  targetPillar: Pillar,
  registry: ContentRegistry,
): string[] {
  const warnings: string[] = [];
  const proposedSlugs = [
    ...clusters.map(({ slug }) => slug),
    ...articles.map(({ slug }) => slug),
  ];

  for (const slug of duplicateValues(proposedSlugs)) {
    warnings.push(`Duplicate proposed slug: ${slug}.`);
  }

  const existingClusterSlugs = new Set(
    registry.clusters
      .filter(({ pillarId }) => pillarId === targetPillar.id)
      .map(({ slug }) => slug),
  );
  for (const cluster of clusters) {
    if (existingClusterSlugs.has(cluster.slug)) {
      warnings.push(
        `Proposed cluster "${cluster.slug}" already exists under ${targetPillar.id}.`,
      );
    }
  }

  const otherPillars = registry.pillars.filter(({ id }) => id !== targetPillar.id);
  for (const article of articles) {
    for (const pillar of otherPillars) {
      if (sharedTokenCount(article.title, pillar.title) >= 2) {
        warnings.push(
          `Article "${article.slug}" overlaps the separate pillar "${pillar.slug}".`,
        );
      }
    }
  }

  return warnings;
}

function mapCandidateToArticle(
  candidate: LegacyImportCandidate,
  targetPillar: Pillar,
  proposedClusterId: string,
): ProposedArticle {
  return {
    proposedId: proposedId("article", candidate.slug),
    title: candidate.title,
    slug: candidate.slug,
    targetPillarId: targetPillar.id,
    proposedClusterId,
    sourcePath: candidate.sourcePath,
    searchIntent: candidate.searchIntent ?? null,
    primaryEntity: candidate.primaryEntity ?? null,
    funnelStage: candidate.funnelStage ?? null,
  };
}

export function parseTopicalAuthorityJson(
  json: string,
  sourceName: string,
): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new DryRunImportError(`Invalid JSON in "${basename(sourceName)}".`);
  }
}

export function createTopicalAuthorityDryRun(
  input: unknown,
  sourceName: string,
  registry: ContentRegistry = COOKETRICKS_CONTENT_REGISTRY,
): TopicalAuthorityDryRunReport {
  const plan = planTopicalAuthorityImport(input, basename(sourceName));
  if (plan.format === "unknown") {
    throw new DryRunImportError(
      `Unsupported Topical Authority Generator structure in "${basename(sourceName)}".`,
    );
  }
  if (!isRecord(input)) {
    throw new DryRunImportError("The export root must be a JSON object.");
  }

  const rootTopic = getRootTopic(input);
  const targetPillar = selectTargetPillar(rootTopic, registry);
  const legacyParents = plan.candidates.filter(
    ({ suggestedEntity }) => suggestedEntity === "pillar",
  );
  const ambiguousParents = plan.candidates.filter(
    ({ suggestedEntity }) => suggestedEntity === "needs-review",
  );
  const legacyChildren = plan.candidates.filter(
    ({ suggestedEntity }) => suggestedEntity === "cluster-or-article",
  );
  const manualReview: ManualReviewItem[] = [
    {
      code: "target-pillar",
      slug: targetPillar.slug,
      message: `Confirm that this export belongs under "${targetPillar.title}".`,
    },
  ];

  const proposedClusters: ProposedCluster[] = [];
  const proposedArticles: ProposedArticle[] = [];

  if (legacyParents.length === 0) {
    const clusterSlug = slugify(rootTopic);
    const clusterId = proposedId("cluster", clusterSlug);
    proposedClusters.push({
      proposedId: clusterId,
      title: rootTopic,
      slug: clusterSlug,
      targetPillarId: targetPillar.id,
      sourcePath: plan.format === "classic" ? "niche" : "seedEntity",
      searchIntent: null,
      primaryEntity: null,
    });
    manualReview.push({
      code: "root-cluster",
      slug: clusterSlug,
      message: `Confirm that the root topic should become a cluster under "${targetPillar.title}".`,
    });

    for (const candidate of ambiguousParents) {
      proposedArticles.push(
        mapCandidateToArticle(candidate, targetPillar, clusterId),
      );
      manualReview.push({
        code: "ambiguous-mapping",
        slug: candidate.slug,
        message: `Confirm that legacy item "${candidate.slug}" is an article, not another cluster.`,
      });
    }
  } else {
    const clustersByParentIndex = new Map<number, ProposedCluster>();
    legacyParents.forEach((candidate) => {
      const cluster: ProposedCluster = {
        proposedId: proposedId("cluster", candidate.slug),
        title: candidate.title,
        slug: candidate.slug,
        targetPillarId: targetPillar.id,
        sourcePath: candidate.sourcePath,
        searchIntent: candidate.searchIntent ?? null,
        primaryEntity: candidate.primaryEntity ?? null,
      };
      proposedClusters.push(cluster);
      const parentIndex = findParentIndex(candidate.sourcePath);
      if (parentIndex !== null) {
        clustersByParentIndex.set(parentIndex, cluster);
      }
    });

    for (const candidate of legacyChildren) {
      const parentIndex = findParentIndex(candidate.sourcePath);
      const cluster =
        parentIndex === null ? undefined : clustersByParentIndex.get(parentIndex);
      if (!cluster) {
        manualReview.push({
          code: "ambiguous-mapping",
          slug: candidate.slug,
          message: `No unambiguous parent cluster was found for "${candidate.slug}".`,
        });
        continue;
      }
      proposedArticles.push(
        mapCandidateToArticle(candidate, targetPillar, cluster.proposedId),
      );
      manualReview.push({
        code: "ambiguous-mapping",
        slug: candidate.slug,
        message: `Confirm that legacy child "${candidate.slug}" is an article, not a subcluster.`,
      });
    }
  }

  const duplicateOrOverlapWarnings = createOverlapWarnings(
    proposedClusters,
    proposedArticles,
    targetPillar,
    registry,
  );

  return {
    sourceFile: basename(sourceName),
    detectedFormat: plan.format,
    targetPillar: {
      id: targetPillar.id,
      title: targetPillar.title,
      slug: targetPillar.slug,
    },
    proposedClusters,
    proposedArticles,
    manualReview,
    duplicateOrOverlapWarnings,
    omittedSensitiveFieldCount: plan.omittedSensitiveFields.length,
    totals: {
      clusters: proposedClusters.length,
      articles: proposedArticles.length,
      manualReviewItems: manualReview.length,
      duplicateOrOverlapWarnings: duplicateOrOverlapWarnings.length,
    },
  };
}

function display(value: string | null): string {
  return value ?? "not provided";
}

export function formatTopicalAuthorityDryRun(
  report: TopicalAuthorityDryRunReport,
): string {
  const lines = [
    "CookeTricks topical-authority dry run",
    `Source: ${report.sourceFile}`,
    `Detected format: ${report.detectedFormat}`,
    `Target pillar: ${report.targetPillar.title} (${report.targetPillar.id}, ${report.targetPillar.slug})`,
    "",
    `Proposed clusters (${report.proposedClusters.length})`,
  ];

  for (const cluster of report.proposedClusters) {
    lines.push(
      `- ${cluster.title}`,
      `  slug: ${cluster.slug}`,
      `  search intent: ${display(cluster.searchIntent)}`,
      `  entity: ${display(cluster.primaryEntity)}`,
    );
  }

  lines.push("", `Proposed articles (${report.proposedArticles.length})`);
  for (const article of report.proposedArticles) {
    lines.push(
      `- ${article.title}`,
      `  slug: ${article.slug}`,
      `  cluster: ${article.proposedClusterId}`,
      `  search intent: ${display(article.searchIntent)}`,
      `  entity: ${display(article.primaryEntity)}`,
      `  funnel stage: ${display(article.funnelStage)}`,
    );
  }

  lines.push("", `Manual review (${report.manualReview.length})`);
  for (const item of report.manualReview) {
    lines.push(`- ${item.message}`);
  }

  lines.push(
    "",
    `Duplicate/overlap warnings (${report.duplicateOrOverlapWarnings.length})`,
  );
  if (report.duplicateOrOverlapWarnings.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const warning of report.duplicateOrOverlapWarnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push(
    "",
    `Sensitive fields omitted: ${report.omittedSensitiveFieldCount}`,
    "Totals",
    `- clusters: ${report.totals.clusters}`,
    `- articles: ${report.totals.articles}`,
    `- manual review items: ${report.totals.manualReviewItems}`,
    `- duplicate/overlap warnings: ${report.totals.duplicateOrOverlapWarnings}`,
    "",
    "Dry run only: no registry, source-file, WordPress, or network writes were performed.",
  );

  return lines.join("\n");
}

export async function runTopicalAuthorityDryRun(filePath: string): Promise<void> {
  let json: string;
  try {
    json = await readFile(filePath, "utf8");
  } catch (error) {
    const code = isRecord(error) ? error.code : undefined;
    if (code === "ENOENT") {
      throw new DryRunImportError(`Export file not found: ${filePath}`);
    }
    throw new DryRunImportError(`Unable to read export file: ${filePath}`);
  }

  const input = parseTopicalAuthorityJson(json, filePath);
  const report = createTopicalAuthorityDryRun(input, filePath);
  process.stdout.write(`${formatTopicalAuthorityDryRun(report)}\n`);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write(
      "Usage: npm run content:dry-run -- <path-to-project-export.json>\n",
    );
    process.exitCode = 1;
  } else {
    runTopicalAuthorityDryRun(filePath).catch((error: unknown) => {
      const message =
        error instanceof DryRunImportError
          ? error.message
          : "Unexpected dry-run import failure.";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
  }
}
