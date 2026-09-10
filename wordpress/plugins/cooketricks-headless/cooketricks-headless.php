<?php
/**
 * Plugin Name: CookeTricks Headless CMS
 * Description: Structured recipes, editorial checks, REST payloads, previews, and Next.js revalidation for CookeTricks.
 * Version: 2.3.0
 * Author: CookeTricks
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Text Domain: cooketricks-headless
 */

if (!defined('ABSPATH')) exit;

define('CT_HEADLESS_VERSION', '2.3.0');
define('CT_HEADLESS_FILE', __FILE__);
define('CT_HEADLESS_DIR', plugin_dir_path(__FILE__));

require_once CT_HEADLESS_DIR . 'includes/class-ct-content.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-admin.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-rest.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-webhooks.php';

final class CookeTricks_Headless_CMS {
    public static function boot(): void {
        CT_Content::boot();
        CT_Admin::boot();
        CT_REST::boot();
        CT_Webhooks::boot();
    }

    public static function activate(): void {
        CT_Content::register_taxonomies();
        CT_Content::seed_terms();
        flush_rewrite_rules();
    }

    public static function deactivate(): void { flush_rewrite_rules(); }
}

register_activation_hook(__FILE__, ['CookeTricks_Headless_CMS', 'activate']);
register_deactivation_hook(__FILE__, ['CookeTricks_Headless_CMS', 'deactivate']);
CookeTricks_Headless_CMS::boot();
