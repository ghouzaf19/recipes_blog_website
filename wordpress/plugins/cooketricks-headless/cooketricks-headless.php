<?php
/**
 * Plugin Name: CookeTricks Headless CMS
 * Description: Structured recipes, editorial checks, REST payloads, previews, and Next.js revalidation for CookeTricks.
 * Version: 2.4.0
 * Author: CookeTricks
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Text Domain: cooketricks-headless
 */

if (!defined('ABSPATH')) exit;

define('CT_HEADLESS_VERSION', '2.4.0');
define('CT_HEADLESS_FILE', __FILE__);
define('CT_HEADLESS_DIR', plugin_dir_path(__FILE__));

require_once CT_HEADLESS_DIR . 'includes/class-ct-content.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-admin.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-rest.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-integration.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-delivery-queue.php';
require_once CT_HEADLESS_DIR . 'includes/class-ct-webhooks.php';

final class CookeTricks_Headless_CMS {
    public static function boot(): void {
        if (self::is_network_active()) {
            add_action('network_admin_notices', [self::class, 'network_notice']);
            return;
        }
        CT_Content::boot();
        CT_Admin::boot();
        CT_REST::boot();
        CT_Integration::boot();
        CT_Delivery_Queue::boot();
        CT_Webhooks::boot();
    }

    public static function activate(bool $network_wide = false): void {
        if ($network_wide) {
            wp_die(esc_html__('CookeTricks Headless CMS does not support network activation.', 'cooketricks-headless'));
        }
        CT_Content::register_taxonomies();
        CT_Content::seed_terms();
        CT_Delivery_Queue::activate();
        flush_rewrite_rules();
    }

    public static function deactivate(): void {
        CT_Delivery_Queue::deactivate();
        flush_rewrite_rules();
    }

    public static function network_notice(): void {
        echo '<div class="notice notice-error"><p><strong>CookeTricks:</strong> Network activation is unsupported, so the plugin is disabled.</p></div>';
    }

    private static function is_network_active(): bool {
        if (!is_multisite()) return false;
        $active = get_site_option('active_sitewide_plugins', []);
        return is_array($active) && isset($active[plugin_basename(CT_HEADLESS_FILE)]);
    }
}

register_activation_hook(__FILE__, ['CookeTricks_Headless_CMS', 'activate']);
register_deactivation_hook(__FILE__, ['CookeTricks_Headless_CMS', 'deactivate']);
CookeTricks_Headless_CMS::boot();
