# CookeTricks Headless CMS 2.3.0 baseline

This is the recovered production baseline of the CookeTricks Headless CMS
plugin. Its source was imported unchanged from
`cooketricks-headless-2.3.0.zip` on 2026-09-10.

- Archive SHA-256: `6f56310b2d428b699edcd49805e30d50d959cc79c02a76f1e10cb54faa799d8b`
- Repository source: `wordpress/plugins/cooketricks-headless/`
- Plugin header version: `2.3.0`
- `CT_HEADLESS_VERSION`: `2.3.0`

The archive was checksum-verified before extraction. Each repository file was
then compared with the corresponding ZIP entry by SHA-256. The static baseline
test preserves that six-file manifest so later edits cannot be mistaken for
the recovered production source.

## Baseline file manifest

| File | SHA-256 |
| --- | --- |
| `cooketricks-headless.php` | `e57d50986d3ec64eed7261607e8a05eac664f095e0e642452f44467d9e309540` |
| `README.txt` | `dfc4fddc8baaf3ff57ba4d9941496b07af7f9b8731e3b03dbfe1633fbba29647` |
| `includes/class-ct-rest.php` | `a5b2267a6ecaa78a0e6452de92cb4770ccb473e27373b0e6ddcd802a40d04a21` |
| `includes/class-ct-webhooks.php` | `6a7b4094cf3b80c8f5f351d6d355aa08c26abbddbb046fc420c6ef9bef647a2` |
| `includes/class-ct-content.php` | `e80921ce8bc8aeb44b8d6eff4064c5d6a69fe892df26695590f689b47aceb560` |
| `includes/class-ct-admin.php` | `082993803eb327829bc11063875161a1b0f04e818b81b96e9a7df4aef55786a3` |

## Responsibilities in 2.3.0

The recovered plugin:

- registers CookeTricks taxonomies and post metadata;
- supplies the CookeTricks editorial meta box;
- keeps incomplete recipes as drafts using the 2.3.0 minimum-field gate;
- exposes the normalized `cooketricks` REST field;
- limits unauthenticated post queries to published, non-future content;
- creates signed Next.js preview URLs; and
- requests Next.js revalidation when posts are saved or deleted.

## Baseline status

This import does not install, activate, deploy, or change the production
plugin. It does not represent a 2.4.0 implementation. Known future hardening
work—including the approved two-test publication gate, canonical editorial
author mapping, expiring preview authorization, and stronger webhook
observability—must be designed, reviewed, and implemented separately.

## Static verification

Run the immutable baseline checks from the repository root:

```bash
node --experimental-strip-types --test scripts/cooketricks-headless-baseline.test.mts
```
