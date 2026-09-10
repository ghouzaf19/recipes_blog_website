import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

const BASELINE_TAG = "cooketricks-headless-v2.3.0";
const BASELINE_COMMIT = "ebc02ce24f00c7feecbcaf9e62a84c9c92014435";
const PLUGIN_ROOT = "wordpress/plugins/cooketricks-headless";
const ARCHIVE_SHA256 =
  "6f56310b2d428b699edcd49805e30d50d959cc79c02a76f1e10cb54faa799d8b";

const EXPECTED_FILES = {
  "README.txt":
    "dfc4fddc8baaf3ff57ba4d9941496b07af7f9b8731e3b03dbfe1633fbba29647",
  "cooketricks-headless.php":
    "e57d50986d3ec64eed7261607e8a05eac664f095e0e642452f44467d9e309540",
  "includes/class-ct-admin.php":
    "082993803eb327829bc11063875161a1b0f04e818b81b96e9a7df4aef55786a3",
  "includes/class-ct-content.php":
    "e80921ce8bc8aeb44b8d6eff4064c5d6a69fe892df26695590f689b47aceb560",
  "includes/class-ct-rest.php":
    "a5b2267a6ecaa78a0e6452de92cb4770ccb473e27373b0e6ddcd802a40d04a21",
  "includes/class-ct-webhooks.php":
    "6a7b4094cf3b80c8f5f351d6d355aa08c26abbddbb046fc420c6ef9bef6477a2",
} as const;

function git(...args: string[]): Buffer {
  return execFileSync("git", args, { encoding: "buffer" });
}

function taggedFile(path: keyof typeof EXPECTED_FILES): Buffer {
  return git("show", `${BASELINE_TAG}:${PLUGIN_ROOT}/${path}`);
}

function taggedText(path: keyof typeof EXPECTED_FILES): string {
  return taggedFile(path).toString("utf8");
}

test("immutable tag identifies the recovered 2.3.0 rollback commit", () => {
  assert.equal(
    git("rev-list", "-n", "1", BASELINE_TAG).toString("utf8").trim(),
    BASELINE_COMMIT,
  );
  assert.equal(ARCHIVE_SHA256.length, 64);
});

test("tag contains exactly the checksum-verified ZIP files", () => {
  const files = git("ls-tree", "-r", "--name-only", BASELINE_TAG, PLUGIN_ROOT)
    .toString("utf8")
    .trim()
    .split(/\r?\n/)
    .map((path) => path.slice(`${PLUGIN_ROOT}/`.length))
    .sort();

  assert.deepEqual(files, Object.keys(EXPECTED_FILES).sort());
  for (const [path, expectedHash] of Object.entries(EXPECTED_FILES)) {
    assert.equal(
      createHash("sha256")
        .update(taggedFile(path as keyof typeof EXPECTED_FILES))
        .digest("hex"),
      expectedHash,
      `${path} must match the recovered 2.3.0 ZIP entry`,
    );
  }
});

test("tag preserves the 2.3.0 version and required WordPress hooks", () => {
  const main = taggedText("cooketricks-headless.php");
  const readme = taggedText("README.txt");
  const content = taggedText("includes/class-ct-content.php");
  const admin = taggedText("includes/class-ct-admin.php");
  const rest = taggedText("includes/class-ct-rest.php");
  const webhooks = taggedText("includes/class-ct-webhooks.php");

  assert.match(main, /^ \* Version: 2\.3\.0$/m);
  assert.match(main, /define\('CT_HEADLESS_VERSION', '2\.3\.0'\);/);
  assert.match(readme, /^CookeTricks Headless CMS 2\.3\.0$/m);
  assert.doesNotMatch(`${main}\n${readme}`, /2\.4\.0/);
  assert.match(main, /register_activation_hook\(__FILE__/);
  assert.match(main, /register_deactivation_hook\(__FILE__/);
  assert.match(content, /add_action\('init'.+'register_taxonomies'/);
  assert.match(admin, /add_filter\('wp_insert_post_data'.+'protect_incomplete_recipe'/);
  assert.match(rest, /register_rest_field\('post', 'cooketricks'/);
  assert.match(webhooks, /add_filter\('preview_post_link'.+'preview_link'/);
  assert.match(webhooks, /wp_remote_post\(/);
});

test("tag contains environment lookups, not embedded real credentials", () => {
  const source = (Object.keys(EXPECTED_FILES) as Array<keyof typeof EXPECTED_FILES>)
    .map(taggedText)
    .join("\n");

  for (const pattern of [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    /define\(\s*['"](?:COOKETRICKS_(?:PREVIEW|REVALIDATE)_SECRET|WORDPRESS_PREVIEW_PASSWORD)['"]\s*,\s*['"][^<'"][^'"]*['"]\s*\)/i,
  ]) {
    assert.doesNotMatch(source, pattern);
  }
});
