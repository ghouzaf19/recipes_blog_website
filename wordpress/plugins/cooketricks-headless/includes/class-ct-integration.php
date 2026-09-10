<?php
if (!defined('ABSPATH')) exit;

final class CT_Integration {
    public const PROTOCOL_VERSION = '2';
    private const PRODUCTION_ORIGIN = 'https://cooketricks.com';
    private const PRODUCTION_HOSTS = ['cooketricks.com', 'www.cooketricks.com', 'cms.cooketricks.com'];
    private const MINIMUM_SECRET_BYTES = 32;
    private const DIAGNOSTIC_OPTION = 'ct_headless_operational_diagnostic';
    private const DIAGNOSTIC_CATEGORIES = ['migration', 'scheduling', 'enqueue', 'delivery', 'reconciliation'];

    public static function boot(): void {
        add_action('admin_notices', [self::class, 'configuration_notice']);
    }

    public static function setting(string $name): string {
        if (defined($name)) return trim((string) constant($name));
        return trim((string) getenv($name));
    }

    public static function protocol_is_v2(): bool {
        return hash_equals(self::PROTOCOL_VERSION, self::setting('COOKETRICKS_PROTOCOL_VERSION'));
    }

    /** @return array{url:string,secret:string}|null */
    public static function preview_configuration(): ?array {
        $configuration = self::configuration();
        return $configuration === null ? null : [
            'url' => $configuration['frontend_url'],
            'secret' => $configuration['preview_secret'],
        ];
    }

    /** @return array{url:string,secret:string}|null */
    public static function revalidation_configuration(): ?array {
        $configuration = self::configuration();
        return $configuration === null ? null : [
            'url' => $configuration['revalidation_url'],
            'secret' => $configuration['revalidation_secret'],
        ];
    }

    public static function record_operational_diagnostic(string $category, string $code): void {
        if (!in_array($category, self::DIAGNOSTIC_CATEGORIES, true)) return;
        update_option(self::DIAGNOSTIC_OPTION, [
            'category' => $category,
            'code' => substr(sanitize_key($code), 0, 48),
            'recorded_at' => time(),
        ], false);
    }

    public static function clear_operational_diagnostic(string $category): void {
        $diagnostic = get_option(self::DIAGNOSTIC_OPTION);
        if (is_array($diagnostic) && ($diagnostic['category'] ?? '') === $category) {
            delete_option(self::DIAGNOSTIC_OPTION);
        }
    }

    public static function configuration_notice(): void {
        if (!current_user_can('manage_options')) return;
        $issue = self::configuration_issue();
        if ($issue !== null) {
            $labels = [
                'environment' => 'environment selection',
                'protocol' => 'protocol selection',
                'frontend_origin' => 'frontend origin',
                'preview_secret' => 'preview secret',
                'revalidation_secret' => 'revalidation secret',
                'secret_separation' => 'secret separation',
            ];
            $label = $labels[$issue] ?? 'server';
            printf(
                '<div class="notice notice-error"><p><strong>CookeTricks:</strong> The %s configuration is invalid. Headless integration is disabled.</p></div>',
                esc_html($label)
            );
            return;
        }

        $diagnostic = get_option(self::DIAGNOSTIC_OPTION);
        if (!is_array($diagnostic)) return;
        $category = (string) ($diagnostic['category'] ?? '');
        if (!in_array($category, self::DIAGNOSTIC_CATEGORIES, true)) return;
        printf(
            '<div class="notice notice-warning"><p><strong>CookeTricks:</strong> The headless %s subsystem needs attention. No sensitive details are displayed.</p></div>',
            esc_html($category)
        );
    }

    /** @return array{frontend_url:string,revalidation_url:string,preview_secret:string,revalidation_secret:string}|null */
    private static function configuration(): ?array {
        $settings = self::environment_settings();
        if ($settings === null || self::configuration_issue() !== null) return null;
        $frontend_url = self::validated_origin($settings['origin'], $settings['environment']);
        if ($frontend_url === null) return null;
        return [
            'frontend_url' => $frontend_url,
            'revalidation_url' => $frontend_url . '/api/revalidate',
            'preview_secret' => self::setting($settings['preview_secret']),
            'revalidation_secret' => self::setting($settings['revalidation_secret']),
        ];
    }

    private static function configuration_issue(): ?string {
        $settings = self::environment_settings();
        if ($settings === null) return 'environment';
        if (!self::protocol_is_v2()) return 'protocol';
        if (self::validated_origin($settings['origin'], $settings['environment']) === null) return 'frontend_origin';
        $preview_secret = self::setting($settings['preview_secret']);
        $revalidation_secret = self::setting($settings['revalidation_secret']);
        if (strlen($preview_secret) < self::MINIMUM_SECRET_BYTES) return 'preview_secret';
        if (strlen($revalidation_secret) < self::MINIMUM_SECRET_BYTES) return 'revalidation_secret';
        if (hash_equals($preview_secret, $revalidation_secret)) return 'secret_separation';
        return null;
    }

    /** @return array{environment:string,origin:string,preview_secret:string,revalidation_secret:string}|null */
    private static function environment_settings(): ?array {
        $environment = wp_get_environment_type();
        if ($environment === 'production') {
            return [
                'environment' => 'production',
                'origin' => self::PRODUCTION_ORIGIN,
                'preview_secret' => 'COOKETRICKS_PREVIEW_SECRET',
                'revalidation_secret' => 'COOKETRICKS_REVALIDATE_SECRET',
            ];
        }
        if ($environment === 'staging') {
            return [
                'environment' => 'staging',
                'origin' => self::setting('COOKETRICKS_STAGING_FRONTEND_ORIGIN'),
                'preview_secret' => 'COOKETRICKS_STAGING_PREVIEW_SECRET',
                'revalidation_secret' => 'COOKETRICKS_STAGING_REVALIDATE_SECRET',
            ];
        }
        if (in_array($environment, ['local', 'development'], true)) {
            return [
                'environment' => 'local',
                'origin' => self::setting('COOKETRICKS_LOCAL_FRONTEND_ORIGIN'),
                'preview_secret' => 'COOKETRICKS_LOCAL_PREVIEW_SECRET',
                'revalidation_secret' => 'COOKETRICKS_LOCAL_REVALIDATE_SECRET',
            ];
        }
        return null;
    }

    private static function validated_origin(string $origin, string $environment): ?string {
        $origin = untrailingslashit($origin);
        if ($origin === '') return null;
        $parts = wp_parse_url($origin);
        if (!is_array($parts)) return null;
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower(trim((string) ($parts['host'] ?? ''), '[]'));
        $path = untrailingslashit((string) ($parts['path'] ?? ''));
        if ($path !== '' || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) return null;

        if ($environment === 'production') {
            if (!wp_http_validate_url($origin) || $origin !== self::PRODUCTION_ORIGIN || $scheme !== 'https' || $host !== 'cooketricks.com' || isset($parts['port'])) return null;
            return self::PRODUCTION_ORIGIN;
        }
        if ($environment === 'staging') {
            if (!wp_http_validate_url($origin) || $scheme !== 'https' || isset($parts['port']) || $host === '' || in_array($host, self::PRODUCTION_HOSTS, true)) return null;
            return esc_url_raw($origin);
        }
        if ($environment === 'local') {
            if ($scheme !== 'http' || !in_array($host, ['localhost', '127.0.0.1', '::1'], true)) return null;
            return esc_url_raw($origin);
        }
        return null;
    }
}
