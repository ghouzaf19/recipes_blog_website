/**
 * Migration planning skeleton for legacy Topical Authority Generator exports.
 *
 * This module performs no file, network, or WordPress I/O. It extracts only
 * non-sensitive planning fields into a review plan; a later migration can map
 * approved candidates into the normalized content registry.
 */

export type LegacyExportFormat = "classic" | "semantic-map" | "unknown";
export type SuggestedEntity = "pillar" | "cluster-or-article" | "needs-review";

export interface LegacyImportCandidate {
  sourcePath: string;
  suggestedEntity: SuggestedEntity;
  title: string;
  description?: string;
  slug: string;
  searchIntent?: string;
  primaryEntity?: string;
  funnelStage?: string;
}

export interface LegacyImportPlan {
  sourceName: string;
  format: LegacyExportFormat;
  requiresReview: true;
  candidates: LegacyImportCandidate[];
  omittedSensitiveFields: string[];
  warnings: string[];
}

const SENSITIVE_FIELD_NAMES = new Set([
  "userApiKey",
  "username",
  "password",
  "appPassword",
  "applicationPassword",
  "apiKey",
  "token",
  "secret",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findSensitiveFieldNames(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      findSensitiveFieldNames(item, found);
    }
    return found;
  }

  if (!isRecord(value)) {
    return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELD_NAMES.has(key)) {
      found.add(key);
      continue;
    }
    findSensitiveFieldNames(child, found);
  }

  return found;
}

function readCandidate(
  value: unknown,
  sourcePath: string,
  suggestedEntity: SuggestedEntity,
): LegacyImportCandidate | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = optionalString(value.title);
  const slug = optionalString(value.urlSlug);
  if (!title || !slug) {
    return null;
  }

  return {
    sourcePath,
    suggestedEntity,
    title,
    slug,
    description: optionalString(value.description),
    searchIntent: optionalString(value.searchIntent),
    primaryEntity: optionalString(value.primaryEntity),
    funnelStage: optionalString(value.funnelStage),
  };
}

function detectFormat(value: Record<string, unknown>): LegacyExportFormat {
  if (typeof value.seedEntity === "string" && Array.isArray(value.semanticPillars)) {
    return "semantic-map";
  }
  if (typeof value.niche === "string" && Array.isArray(value.subniches)) {
    return "classic";
  }
  return "unknown";
}

export function planTopicalAuthorityImport(
  input: unknown,
  sourceName: string,
): LegacyImportPlan {
  const omittedSensitiveFields = [...findSensitiveFieldNames(input)].sort();
  const candidates: LegacyImportCandidate[] = [];
  const warnings = [
    "Legacy exports have no stable entity IDs; every candidate requires review before insertion.",
    "Legacy child items may represent clusters or articles; the importer does not guess that distinction.",
    "UI, generation, agent, scheduling, and WordPress connection state are intentionally ignored.",
  ];

  if (!isRecord(input)) {
    return {
      sourceName,
      format: "unknown",
      requiresReview: true,
      candidates,
      omittedSensitiveFields,
      warnings: [...warnings, "The export root is not a JSON object."],
    };
  }

  const format = detectFormat(input);
  const parents =
    format === "semantic-map"
      ? input.semanticPillars
      : format === "classic"
        ? input.subniches
        : undefined;

  if (!Array.isArray(parents)) {
    return {
      sourceName,
      format,
      requiresReview: true,
      candidates,
      omittedSensitiveFields,
      warnings: [...warnings, "No recognized topic collection was found."],
    };
  }

  const hasNestedClusters = parents.some(
    (parent) => isRecord(parent) && Array.isArray(parent.clusters),
  );

  parents.forEach((parent, parentIndex) => {
    const parentPath = `${
      format === "semantic-map" ? "semanticPillars" : "subniches"
    }[${parentIndex}]`;
    const parentCandidate = readCandidate(
      parent,
      parentPath,
      format === "semantic-map" || hasNestedClusters ? "pillar" : "needs-review",
    );
    if (parentCandidate) {
      candidates.push(parentCandidate);
    }

    if (!isRecord(parent) || !Array.isArray(parent.clusters)) {
      return;
    }

    parent.clusters.forEach((child, childIndex) => {
      const childCandidate = readCandidate(
        child,
        `${parentPath}.clusters[${childIndex}]`,
        "cluster-or-article",
      );
      if (childCandidate) {
        candidates.push(childCandidate);
      }
    });
  });

  return {
    sourceName,
    format,
    requiresReview: true,
    candidates,
    omittedSensitiveFields,
    warnings,
  };
}
