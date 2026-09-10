<?php
if (!defined('ABSPATH')) exit;

final class CT_Webhooks {
    public static function boot(): void {
        add_action('save_post_post', [self::class, 'on_save'], 20, 3);
        add_action('before_delete_post', [self::class, 'on_delete']);
        // Run last so themes and hosting helpers cannot restore the WordPress frontend URL.
        add_filter('preview_post_link', [self::class, 'preview_link'], PHP_INT_MAX, 2);
    }

    public static function on_save(int $post_id, WP_Post $post, bool $update): void {
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
        self::notify($post, $update ? 'update' : 'create');
    }

    public static function on_delete(int $post_id): void {
        $post = get_post($post_id);
        if ($post instanceof WP_Post && $post->post_type === 'post') self::notify($post, 'delete');
    }

    private static function env_or_constant(string $name): string {
        if (defined($name)) return trim((string) constant($name));
        return trim((string) getenv($name));
    }

    private static function notify(WP_Post $post, string $event): void {
        $url = self::env_or_constant('COOKETRICKS_REVALIDATE_URL');
        $secret = self::env_or_constant('COOKETRICKS_REVALIDATE_SECRET');
        if ($url === '' || $secret === '') return;
        wp_remote_post($url, ['timeout' => 5, 'blocking' => false, 'headers' => ['Content-Type' => 'application/json', 'X-CookeTricks-Secret' => $secret], 'body' => wp_json_encode(['event' => $event, 'id' => $post->ID, 'slug' => $post->post_name, 'status' => $post->post_status])]);
    }

    public static function preview_link(string $link, WP_Post $post): string {
        $frontend_link = self::frontend_preview_url($post);
        return $frontend_link !== '' ? $frontend_link : $link;
    }

    public static function frontend_preview_url(WP_Post $post): string {
        $site_url = untrailingslashit(self::env_or_constant('COOKETRICKS_FRONTEND_URL') ?: 'https://cooketricks.com');
        $secret = self::env_or_constant('COOKETRICKS_PREVIEW_SECRET');
        if ($post->post_type !== 'post' || $secret === '') return '';
        return add_query_arg(['id' => $post->ID, 'token' => hash_hmac('sha256', (string) $post->ID, $secret)], $site_url . '/api/preview');
    }
}
