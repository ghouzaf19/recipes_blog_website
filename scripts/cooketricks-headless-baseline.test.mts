import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(
  new URL("../wordpress/plugins/cooketricks-headless/", import.meta.url),
);

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

function listFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(path));
    } else if (entry.isFile()) {
      files.push(relative(pluginRoot, path).split(sep).join("/"));
    }
  }

  return files.sort();
}

function readPluginFile(path: keyof typeof EXPECTED_FILES): string {
  return readFileSync(join(pluginRoot, path), "utf8");
}

test("recovered plugin contains exactly the checksum-verified ZIP files", () => {
  assert.deepEqual(listFiles(pluginRoot), Object.keys(EXPECTED_FILES).sort());

  for (const [path, expectedHash] of Object.entries(EXPECTED_FILES)) {
    const actualHash = createHash("sha256")
      .update(readFileSync(join(pluginRoot, path)))
      .digest("hex");

    assert.equal(actualHash, expectedHash, `${path} must match the 2.3.0 ZIP`);
  }
});

test("plugin header, constant, and readme preserve version 2.3.0", () => {
  const main = readPluginFile("cooketricks-headless.php");
  const readme = readPluginFile("README.txt");

  assert.match(main, /^ \* Version: 2\.3\.0$/m);
  assert.match(main, /define\('CT_HEADLESS_VERSION', '2\.3\.0'\);/);
  assert.match(readme, /^CookeTricks Headless CMS 2\.3\.0$/m);
  assert.doesNotMatch(`${main}\n${readme}`, /2\.4\.0/);
});

test("baseline includes required files and expected WordPress hooks", () => {
  const main = readPluginFile("cooketricks-headless.php");
  const content = readPluginFile("includes/class-ct-content.php");
  const admin = readPluginFile("includes/class-ct-admin.php");
  const rest = readPluginFile("includes/class-ct-rest.php");
  const webhooks = readPluginFile("includes/class-ct-webhooks.php");

  for (const requiredFile of [
    "class-ct-content.php",
    "class-ct-admin.php",
    "class-ct-rest.php",
    "class-ct-webhooks.php",
  ]) {
    assert.match(main, new RegExp(`require_once.+${requiredFile.replace(".", "\\.")}`));
  }

  assert.match(main, /register_activation_hook\(__FILE__/);
  assert.match(main, /register_deactivation_hook\(__FILE__/);
  assert.match(content, /add_action\('init'.+'register_taxonomies'/);
  assert.match(content, /add_action\('init'.+'register_meta'/);
  assert.match(admin, /add_action\('add_meta_boxes'/);
  assert.match(admin, /add_action\('save_post_post'.+'save_fields'/);
  assert.match(admin, /add_filter\('wp_insert_post_data'.+'protect_incomplete_recipe'/);
  assert.match(rest, /add_action\('rest_api_init'.+'register_fields'/);
  assert.match(rest, /register_rest_field\('post', 'cooketricks'/);
  assert.match(rest, /add_filter\('rest_post_query'.+'limit_public_queries'/);
  assert.match(webhooks, /add_action\('save_post_post'.+'on_save'/);
  assert.match(webhooks, /add_action\('before_delete_post'.+'on_delete'/);
  assert.match(webhooks, /add_filter\('preview_post_link'.+'preview_link'/);
  assert.match(webhooks, /wp_remote_post\(/);
});

test("baseline contains placeholders and environment lookups, not credentials", () => {
  const files = Object.keys(EXPECTED_FILES) as Array<keyof typeof EXPECTED_FILES>;
  const source = files.map(readPluginFile).join("\n");

  for (const credentialPattern of [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    /define\(\s*['"](?:COOKETRICKS_(?:PREVIEW|REVALIDATE)_SECRET|WORDPRESS_PREVIEW_PASSWORD)['"]\s*,\s*['"][^<'"][^'"]*['"]\s*\)/i,
  ]) {
    assert.doesNotMatch(source, credentialPattern);
  }

  const sensitiveAssignments = source
    .split(/\r?\n/)
    .filter((line) =>
      /^(?:WORDPRESS_PREVIEW_PASSWORD|COOKETRICKS_(?:PREVIEW|REVALIDATE)_SECRET)=/i.test(
        line,
      )
    );

  assert.equal(sensitiveAssignments.length, 5);
  for (const assignment of sensitiveAssignments) {
    assert.match(assignment, /=<[^>]+>$/);
  }
});
