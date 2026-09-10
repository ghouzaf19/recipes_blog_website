<?php
if (!defined('ABSPATH')) exit;

final class CT_Webhooks {
    private const PREVIEW_LIFETIME_SECONDS = 15 * MINUTE_IN_SECONDS;
    private const V2_STATUSES = ['draft', 'pending', 'future', 'publish', 'private', 'trash'];
    /** @var array<int,array{slug:string,status:string}> */
    private static array $before_update = [];
    /** @var array<string,bool> */
    private static array $emitted = [];

    public static function boot(): void {
        add_action('pre_post_update', [self::class, 'capture_before_update'], 10, 2);
        add_action('save_post_post', [self::class, 'on_save'], 20, 3);
        add_action('before_delete_post', [self::class, 'on_delete']);
        // Run last so themes and hosting helpers cannot restore the WordPress frontend URL.
        add_filter('preview_post_link', [self::class, 'preview_link'], PHP_INT_MAX, 2);
    }

    public static function capture_before_update(int $post_id, array $data): void {
        if (($data['post_type'] ?? '') !== 'post') return;
        $post = get_post($post_id);
        if (!($post instanceof WP_Post) || $post->post_type !== 'post') return;
        self::$before_update[$post_id] = [
            'slug' => (string) $post->post_name,
            'status' => (string) $post->post_status,
        ];
    }

    public static function on_save(int $post_id, WP_Post $post, bool $update): void {
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
        $before = self::$before_update[$post_id] ?? null;
        unset(self::$before_update[$post_id]);
        $event = !$update ? 'create' : (($before['status'] ?? $post->post_status) !== $post->post_status ? 'status-change' : 'update');
        $previous_slug = $before !== null && $before['slug'] !== $post->post_name ? $before['slug'] : null;
        self::enqueue_post_event($post, $event, $previous_slug);
    }

    public static function on_delete(int $post_id): void {
        $post = get_post($post_id);
        if ($post instanceof WP_Post && $post->post_type === 'post') {
            self::enqueue_post_event($post, 'delete', null);
        }
    }

    public static function preview_link(string $link, WP_Post $post): string {
        return self::frontend_preview_url($post);
    }

    public static function frontend_preview_url(WP_Post $post): string {
        $configuration = CT_Integration::preview_configuration();
        if ($post->post_type !== 'post' || $post->ID < 1 || $configuration === null) return '';
        try {
            $nonce = self::base64url(random_bytes(32));
        } catch (Throwable $error) {
            return '';
        }
        $issued_at = time();
        $expires_at = $issued_at + self::PREVIEW_LIFETIME_SECONDS;
        $payload = implode("\n", ['preview:v2', $post->ID, $issued_at, $expires_at, $nonce]);
        $signature = hash_hmac('sha256', $payload, $configuration['secret']);
        return add_query_arg([
            'version' => '2',
            'postId' => $post->ID,
            'issuedAt' => $issued_at,
            'expiresAt' => $expires_at,
            'nonce' => $nonce,
            'signature' => $signature,
        ], untrailingslashit($configuration['url']) . '/api/preview');
    }

    private static function base64url(string $bytes): string {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private static function valid_slug(string $slug): bool {
        return strlen($slug) <= 200 && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) === 1;
    }

    private static function enqueue_post_event(WP_Post $post, string $event, ?string $previous_slug): void {
        $slug = (string) $post->post_name;
        $status = (string) $post->post_status;
        if (!in_array($event, ['create', 'update', 'delete', 'status-change'], true)) return;
        if (!self::valid_slug($slug) || !in_array($status, self::V2_STATUSES, true)) return;
        $body = [
            'event' => $event,
            'postId' => (int) $post->ID,
            'slug' => $slug,
        ];
        if ($previous_slug !== null && self::valid_slug($previous_slug) && $previous_slug !== $slug) {
            $body['previousSlug'] = $previous_slug;
        }
        $body['status'] = $status;
        $encoded = wp_json_encode($body, JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            self::request_reconciliation_after_enqueue_failure('encoding_failed');
            return;
        }
        $fingerprint = hash('sha256', $encoded);
        if (isset(self::$emitted[$fingerprint])) return;
        try {
            $result = CT_Delivery_Queue::enqueue($body);
        } catch (Throwable $error) {
            self::request_reconciliation_after_enqueue_failure('enqueue_exception');
            return;
        }
        if (is_wp_error($result)) {
            self::request_reconciliation_after_enqueue_failure($result->get_error_code());
            return;
        }
        self::$emitted[$fingerprint] = true;
        CT_Integration::clear_operational_diagnostic('enqueue');
    }

    private static function request_reconciliation_after_enqueue_failure(string $queue_code): void {
        CT_Integration::record_operational_diagnostic('enqueue', $queue_code);
        try {
            $marker = CT_Delivery_Queue::request_reconciliation();
        } catch (Throwable $error) {
            CT_Integration::record_operational_diagnostic('reconciliation', 'marker_exception');
            return;
        }
        if (is_wp_error($marker)) {
            CT_Integration::record_operational_diagnostic('reconciliation', $marker->get_error_code());
        }
    }
}
