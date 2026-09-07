import assert from "node:assert/strict";
import test from "node:test";

import {
  createTopicalAuthorityDryRun,
  DryRunImportError,
  parseTopicalAuthorityJson,
} from "./dry-run-topical-authority.mts";

function classicExport(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    step: 2,
    niche: "Chicken Breast Cooking Methods",
    subniches: [
      {
        title: "Baked Chicken Breast",
        description: "A baking guide.",
        urlSlug: "baked-chicken-breast",
      },
    ],
    ...extra,
  };
}

test("creates a dry-run plan for valid supported input", () => {
  const report = createTopicalAuthorityDryRun(
    classicExport(),
    "project-Chicken Breast Cooking Methods.json",
  );

  assert.equal(report.detectedFormat, "classic");
  assert.equal(report.targetPillar.id, "pillar_chicken");
  assert.equal(report.proposedClusters.length, 1);
  assert.equal(report.proposedArticles.length, 1);
  assert.equal(report.proposedArticles[0]?.slug, "baked-chicken-breast");
});

test("reports invalid JSON without echoing its contents", () => {
  const unsafeText = "private-value";

  assert.throws(
    () => parseTopicalAuthorityJson(`{\"secret\":\"${unsafeText}\"`, "broken.json"),
    (error: unknown) =>
      error instanceof DryRunImportError &&
      error.message === 'Invalid JSON in "broken.json".' &&
      !error.message.includes(unsafeText),
  );
});

test("rejects unsupported export structures", () => {
  assert.throws(
    () => createTopicalAuthorityDryRun({ unrelated: [] }, "unsupported.json"),
    /Unsupported Topical Authority Generator structure/,
  );
});

test("omits credential values from the dry-run report", () => {
  const apiKey = "api-key-must-not-appear";
  const appPassword = "app-password-must-not-appear";
  const report = createTopicalAuthorityDryRun(
    classicExport({
      userApiKey: apiKey,
      wpConfig: { appPassword },
    }),
    "credential-test.json",
  );
  const serialized = JSON.stringify(report);

  assert.equal(report.omittedSensitiveFieldCount, 2);
  assert.equal(serialized.includes(apiKey), false);
  assert.equal(serialized.includes(appPassword), false);
});

test("flags step-2 child mappings for manual review", () => {
  const report = createTopicalAuthorityDryRun(
    classicExport(),
    "ambiguous.json",
  );

  assert.equal(
    report.manualReview.some(
      ({ code, slug }) =>
        code === "ambiguous-mapping" && slug === "baked-chicken-breast",
    ),
    true,
  );
});
