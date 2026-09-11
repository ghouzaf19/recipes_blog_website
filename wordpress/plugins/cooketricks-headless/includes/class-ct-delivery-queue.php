<?php
if (!defined('ABSPATH')) exit;

final class CT_Delivery_Queue {
    private const DB_VERSION = '1';
    private const DB_VERSION_OPTION = 'ct_headless_queue_db_version';
    private const MIGRATION_RETRY_OPTION = 'ct_headless_queue_migration_retry_at';
    private const CRON_HOOK = 'ct_headless_process_delivery_queue';
    private const CRON_SCHEDULE = 'ct_headless_minute';
    private const MAX_STORED_EVENTS = 2048;
    private const MAX_PAYLOAD_BYTES = 1024;
    private const MAX_ATTEMPTS = 6;
    private const MAX_BATCH = 4;
    private const HTTP_TIMEOUT_SECONDS = 4;
    private const WORKER_BUDGET_SECONDS = 20;
    private const LOCK_TIMEOUT_SECONDS = 10 * MINUTE_IN_SECONDS;
    private const MAX_DELIVERY_AGE_SECONDS = 7 * DAY_IN_SECONDS;
    private const TERMINAL_RETENTION_SECONDS = 30 * DAY_IN_SECONDS;
    private const MIGRATION_RETRY_SECONDS = 5 * MINUTE_IN_SECONDS;
    private const MIN_RETRY_AFTER_SECONDS = 60;
    private const MAX_RETRY_AFTER_SECONDS = 4 * HOUR_IN_SECONDS;
    private const REPLAY_RESPONSE_LIMIT_BYTES = 1024;
    private const REPLAY_RESPONSE_CODE = 'replayed-event';
    private const RECONCILIATION_OPTION = 'ct_headless_reconciliation_marker';
    private const RECONCILIATION_LOCK_TIMEOUT_SECONDS = 1;
    private const RECONCILIATION_BODY = '{"event":"reconcile","scope":"all-content"}';
    private const EVENTS = ['create', 'update', 'delete', 'status-change'];
    private const STATUSES = ['draft', 'pending', 'future', 'publish', 'private', 'trash'];

    public static function boot(): void {
        add_filter('cron_schedules', [self::class, 'cron_schedules']);
        add_action('plugins_loaded', [self::class, 'maybe_migrate']);
        add_action('init', [self::class, 'ensure_scheduled']);
        add_action(self::CRON_HOOK, [self::class, 'process']);
    }

    public static function activate(): void {
        if (self::migrate(true)) self::ensure_scheduled();
    }

    public static function deactivate(): void {
        wp_clear_scheduled_hook(self::CRON_HOOK);
    }

    /** @param array<string,array<string,int|string>> $schedules */
    public static function cron_schedules(array $schedules): array {
        $schedules[self::CRON_SCHEDULE] = [
            'interval' => MINUTE_IN_SECONDS,
            'display' => 'Every minute (CookeTricks delivery queue)',
        ];
        return $schedules;
    }

    public static function maybe_migrate(): void {
        if ((string) get_option(self::DB_VERSION_OPTION, '') === self::DB_VERSION) return;
        $retry_at = (int) get_option(self::MIGRATION_RETRY_OPTION, 0);
        if ($retry_at > time()) return;
        self::migrate(false);
    }

    public static function ensure_scheduled(): bool {
        if ((string) get_option(self::DB_VERSION_OPTION, '') !== self::DB_VERSION) return false;
        if (wp_next_scheduled(self::CRON_HOOK)) {
            CT_Integration::clear_operational_diagnostic('scheduling');
            return true;
        }
        $scheduled = wp_schedule_event(
            time() + MINUTE_IN_SECONDS,
            self::CRON_SCHEDULE,
            self::CRON_HOOK,
            [],
            true
        );
        if ($scheduled === true) {
            CT_Integration::clear_operational_diagnostic('scheduling');
            return true;
        }
        CT_Integration::record_operational_diagnostic('scheduling', 'schedule_failed');
        return false;
    }

    public static function migrate(bool $force = false): bool {
        global $wpdb;
        if (!$force && (int) get_option(self::MIGRATION_RETRY_OPTION, 0) > time()) return false;
        try {
            require_once ABSPATH . 'wp-admin/includes/upgrade.php';
            $table = self::table();
            $charset = $wpdb->get_charset_collate();
            $sql = "CREATE TABLE {$table} (
                event_id char(36) NOT NULL,
                payload longtext NOT NULL,
                status varchar(20) NOT NULL DEFAULT 'queued',
                attempts tinyint unsigned NOT NULL DEFAULT 0,
                next_attempt_at datetime NOT NULL,
                locked_at datetime NULL,
                lock_token char(36) NULL,
                last_error varchar(64) NOT NULL DEFAULT '',
                created_at datetime NOT NULL,
                updated_at datetime NOT NULL,
                PRIMARY KEY  (event_id),
                KEY due_events (status, next_attempt_at),
                KEY retention (status, updated_at),
                KEY active_age (status, created_at)
            ) ENGINE=InnoDB {$charset};";
            dbDelta($sql);
            if (self::table_exists() && !self::table_uses_innodb()) {
                $wpdb->query("ALTER TABLE {$table} ENGINE=InnoDB");
            }
            if (!self::schema_is_valid()) {
                self::migration_failed('schema_incomplete');
                return false;
            }
            update_option(self::DB_VERSION_OPTION, self::DB_VERSION, false);
            delete_option(self::MIGRATION_RETRY_OPTION);
            CT_Integration::clear_operational_diagnostic('migration');
            return true;
        } catch (Throwable $error) {
            self::migration_failed('migration_exception');
            return false;
        }
    }

    /** @param array<string,mixed> $body */
    public static function enqueue(array $body): bool|WP_Error {
        global $wpdb;
        $normalized = self::normalize_body($body);
        if (is_wp_error($normalized)) return $normalized;
        $payload = wp_json_encode($normalized, JSON_UNESCAPED_SLASHES);
        if (!is_string($payload)) return self::queue_error('encoding_failed');
        if (strlen($payload) > self::MAX_PAYLOAD_BYTES) return self::queue_error('payload_too_large');
        if ((string) get_option(self::DB_VERSION_OPTION, '') !== self::DB_VERSION) {
            return self::queue_error('schema_unavailable');
        }

        $lock = self::acquire_capacity_lock();
        if (is_wp_error($lock)) return $lock;
        try {
            self::transition_expired_active();
            self::cleanup_terminal();
            $table = self::table();
            $stored = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
            if ($stored === null && $wpdb->last_error !== '') return self::queue_error('count_failed');
            if ((int) $stored >= self::MAX_STORED_EVENTS) {
                self::remove_oldest_completed_for_capacity();
                $stored = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
                if ($stored === null && $wpdb->last_error !== '') return self::queue_error('count_failed');
            }
            if ((int) $stored >= self::MAX_STORED_EVENTS) return self::queue_error('capacity');

            $event_id = wp_generate_uuid4();
            $now = current_time('mysql', true);
            $inserted = $wpdb->insert($table, [
                'event_id' => $event_id,
                'payload' => $payload,
                'status' => 'queued',
                'attempts' => 0,
                'next_attempt_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ], ['%s', '%s', '%s', '%d', '%s', '%s', '%s']);
            return $inserted === 1 ? true : self::queue_error('insert_failed');
        } catch (Throwable $error) {
            return self::queue_error('enqueue_exception');
        } finally {
            self::release_capacity_lock();
        }
    }

    /**
     * Records only a generation and timestamp: no post, slug, payload, or secret.
     * @return bool|WP_Error
     */
    public static function request_reconciliation(): bool|WP_Error {
        global $wpdb;
        $marker = [
            'generation' => wp_generate_uuid4(),
            'created_at' => time(),
        ];
        $encoded = wp_json_encode($marker, JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) return self::queue_error('reconciliation_encoding_failed');
        $options = $wpdb->options;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $current = $wpdb->get_var($wpdb->prepare(
                "SELECT option_value FROM {$options} WHERE option_name = %s LIMIT 1",
                self::RECONCILIATION_OPTION
            ));
            if ($current === null) {
                if (add_option(self::RECONCILIATION_OPTION, $encoded, '', false)) {
                    wp_cache_delete(self::RECONCILIATION_OPTION, 'options');
                    CT_Integration::record_operational_diagnostic('reconciliation', 'requested');
                    return true;
                }
                continue;
            }
            $updated = $wpdb->query($wpdb->prepare(
                "UPDATE {$options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
                $encoded,
                self::RECONCILIATION_OPTION,
                (string) $current
            ));
            if ($updated === 1) {
                wp_cache_delete(self::RECONCILIATION_OPTION, 'options');
                CT_Integration::record_operational_diagnostic('reconciliation', 'requested');
                return true;
            }
            if ($updated === false) return self::queue_error('reconciliation_marker_failed');
        }
        return self::queue_error('reconciliation_marker_race');
    }

    public static function process(): void {
        $started_at = hrtime(true);
        self::process_reconciliation();
        if ((string) get_option(self::DB_VERSION_OPTION, '') !== self::DB_VERSION) return;
        self::recover_stale_locks();
        self::transition_expired_active();
        self::cleanup_terminal();
        for ($index = 0; $index < self::MAX_BATCH; $index++) {
            $elapsed_seconds = (hrtime(true) - $started_at) / 1_000_000_000;
            if ($elapsed_seconds >= self::WORKER_BUDGET_SECONDS - self::HTTP_TIMEOUT_SECONDS) break;
            $row = self::claim();
            if (is_wp_error($row)) {
                CT_Integration::record_operational_diagnostic('delivery', $row->get_error_code());
                break;
            }
            if ($row === null) break;
            self::deliver($row);
        }
    }

    /** @return object|WP_Error|null */
    private static function claim(): ?object {
        global $wpdb;
        $table = self::table();
        $now = current_time('mysql', true);
        $event_id = $wpdb->get_var($wpdb->prepare(
            "SELECT event_id FROM {$table} WHERE status IN ('queued','retry') AND next_attempt_at <= %s ORDER BY created_at ASC LIMIT 1",
            $now
        ));
        if ($event_id === null && $wpdb->last_error !== '') return self::queue_error('claim_select_failed');
        if (!is_string($event_id) || $event_id === '') return null;
        $lock_token = wp_generate_uuid4();
        $updated = $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET status = 'processing', locked_at = %s, lock_token = %s, updated_at = %s WHERE event_id = %s AND status IN ('queued','retry') AND next_attempt_at <= %s",
            $now, $lock_token, $now, $event_id, $now
        ));
        if ($updated === false) return self::queue_error('claim_update_failed');
        if ($updated !== 1) return null;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT event_id, payload, attempts, lock_token FROM {$table} WHERE event_id = %s AND lock_token = %s LIMIT 1",
            $event_id, $lock_token
        ));
        if ($row === null && $wpdb->last_error !== '') return self::queue_error('claim_read_failed');
        return is_object($row) ? $row : self::queue_error('claim_missing');
    }

    private static function process_reconciliation(): void {
        $marker = self::reconciliation_marker();
        if ($marker === null) return;
        $lock = self::acquire_reconciliation_lock();
        if (is_wp_error($lock)) {
            CT_Integration::record_operational_diagnostic('reconciliation', $lock->get_error_code());
            return;
        }
        try {
            $marker = self::reconciliation_marker();
            if ($marker === null) return;
            $configuration = CT_Integration::revalidation_configuration();
            if ($configuration === null) {
                CT_Integration::record_operational_diagnostic('reconciliation', 'configuration');
                return;
            }
            $response = self::send_v2_request(
                $configuration,
                self::RECONCILIATION_BODY,
                wp_generate_uuid4()
            );
            if (is_wp_error($response)) {
                CT_Integration::record_operational_diagnostic('reconciliation', 'network');
                return;
            }
            $status = (int) wp_remote_retrieve_response_code($response);
            if ($status !== 200 && !($status === 409 && self::is_verified_replay_response($response))) {
                CT_Integration::record_operational_diagnostic('reconciliation', 'http_' . $status);
                return;
            }
            if (self::clear_reconciliation_marker($marker['raw'])) {
                CT_Integration::clear_operational_diagnostic('reconciliation');
            } else {
                CT_Integration::record_operational_diagnostic('reconciliation', 'marker_changed');
            }
        } catch (Throwable $error) {
            CT_Integration::record_operational_diagnostic('reconciliation', 'worker_exception');
        } finally {
            self::release_reconciliation_lock();
        }
    }

    private static function deliver(object $row): void {
        $configuration = CT_Integration::revalidation_configuration();
        if ($configuration === null) {
            self::defer_configuration($row);
            return;
        }
        try {
            $response = self::send_v2_request($configuration, (string) $row->payload, (string) $row->event_id);
        } catch (Throwable $error) {
            self::retry_or_dead_letter($row, 'network_exception');
            return;
        }
        if (is_wp_error($response)) {
            self::retry_or_dead_letter($row, 'network');
            return;
        }
        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status === 200 || ($status === 409 && self::is_verified_replay_response($response))) {
            self::mark_completed($row);
            CT_Integration::clear_operational_diagnostic('delivery');
            return;
        }
        if ($status === 409) {
            self::retry_or_dead_letter($row, 'unverified_409');
            return;
        }
        if (self::is_retryable_status($status)) {
            $retry_after = in_array($status, [429, 503], true)
                ? self::retry_after_seconds($response, time())
                : null;
            self::retry_or_dead_letter($row, 'http_' . $status, $retry_after);
            return;
        }
        self::mark_permanent_failure($row, 'http_' . $status);
    }

    /** @param array{url:string,secret:string} $configuration */
    private static function send_v2_request(array $configuration, string $body, string $event_id): array|WP_Error {
        $timestamp = time();
        $signature_payload = "revalidate:v2\n{$timestamp}\n{$event_id}\n{$body}";
        $signature = hash_hmac('sha256', $signature_payload, $configuration['secret']);
        $filters = self::register_local_safe_request_filters($configuration['url']);
        try {
            return wp_safe_remote_post($configuration['url'], [
                'timeout' => self::HTTP_TIMEOUT_SECONDS,
                'redirection' => 0,
                'blocking' => true,
                'limit_response_size' => self::REPLAY_RESPONSE_LIMIT_BYTES,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-CookeTricks-Version' => '2',
                    'X-CookeTricks-Timestamp' => (string) $timestamp,
                    'X-CookeTricks-Event-ID' => $event_id,
                    'X-CookeTricks-Signature' => 'v1=' . $signature,
                ],
                'body' => $body,
            ]);
        } finally {
            self::remove_local_safe_request_filters($filters);
        }
    }

    /**
     * @return array{external:callable,ports:callable}|null
     */
    private static function register_local_safe_request_filters(string $url): ?array {
        if (!CT_Integration::allows_local_safe_revalidation_request($url)) return null;
        $parts = wp_parse_url($url);
        if (!is_array($parts)) return null;
        $expected_host = strtolower(trim((string) ($parts['host'] ?? ''), '[]'));
        $expected_port = (int) ($parts['port'] ?? 0);
        if ($expected_port < 1 || $expected_port > 65535) return null;

        $matches_exact_destination = static function(string $host, string $request_url) use ($url, $expected_host): bool {
            return hash_equals($url, $request_url)
                && hash_equals($expected_host, strtolower(trim($host, '[]')));
        };
        $external = static function(bool $is_external, string $host, string $request_url) use ($matches_exact_destination): bool {
            return $matches_exact_destination($host, $request_url) ? true : $is_external;
        };
        $ports = static function(array $allowed_ports, string $host, string $request_url) use ($matches_exact_destination, $expected_port): array {
            if (!$matches_exact_destination($host, $request_url)) return $allowed_ports;
            if (!in_array($expected_port, $allowed_ports, true)) $allowed_ports[] = $expected_port;
            return $allowed_ports;
        };
        add_filter('http_request_host_is_external', $external, PHP_INT_MAX, 3);
        add_filter('http_allowed_safe_ports', $ports, PHP_INT_MAX, 3);
        return ['external' => $external, 'ports' => $ports];
    }

    /** @param array{external:callable,ports:callable}|null $filters */
    private static function remove_local_safe_request_filters(?array $filters): void {
        if ($filters === null) return;
        remove_filter('http_request_host_is_external', $filters['external'], PHP_INT_MAX);
        remove_filter('http_allowed_safe_ports', $filters['ports'], PHP_INT_MAX);
    }

    public static function is_retryable_status(int $status): bool {
        return in_array($status, [408, 425, 429], true) || ($status >= 500 && $status <= 599);
    }

    public static function backoff_seconds(int $attempt): int {
        $delays = [60, 300, 900, 3600, 14400];
        $index = max(0, min(count($delays) - 1, $attempt - 1));
        return $delays[$index];
    }

    /** @param array<string,mixed> $response */
    private static function retry_after_seconds(array $response, int $now): ?int {
        $header = wp_remote_retrieve_header($response, 'retry-after');
        if (!is_string($header)) return null;
        $header = trim($header);
        if ($header === '' || strlen($header) > 128) return null;
        if (strlen($header) <= 10 && ctype_digit($header)) {
            $delay = (int) $header;
        } else {
            $date = DateTimeImmutable::createFromFormat(
                'D, d M Y H:i:s \G\M\T',
                $header,
                new DateTimeZone('GMT')
            );
            if (!$date || $date->format('D, d M Y H:i:s \G\M\T') !== $header) return null;
            $delay = $date->getTimestamp() - $now;
        }
        if ($delay <= 0) return null;
        return max(self::MIN_RETRY_AFTER_SECONDS, min(self::MAX_RETRY_AFTER_SECONDS, $delay));
    }

    private static function retry_or_dead_letter(object $row, string $diagnostic, ?int $retry_after = null): void {
        $attempt = (int) $row->attempts + 1;
        if ($attempt >= self::MAX_ATTEMPTS) {
            self::update_claimed($row, 'dead-letter', $attempt, null, 'attempts_exhausted');
            CT_Integration::record_operational_diagnostic('delivery', 'attempts_exhausted');
            return;
        }
        $delay = self::backoff_seconds($attempt);
        if ($retry_after !== null) $delay = max($delay, $retry_after);
        $next = gmdate('Y-m-d H:i:s', time() + $delay);
        self::update_claimed($row, 'retry', $attempt, $next, $diagnostic);
        CT_Integration::record_operational_diagnostic('delivery', $diagnostic);
    }

    private static function mark_permanent_failure(object $row, string $diagnostic): void {
        self::update_claimed($row, 'permanent-failure', (int) $row->attempts + 1, null, $diagnostic);
        CT_Integration::record_operational_diagnostic('delivery', $diagnostic);
    }

    private static function defer_configuration(object $row): void {
        $next = gmdate('Y-m-d H:i:s', time() + HOUR_IN_SECONDS);
        self::update_claimed($row, 'retry', (int) $row->attempts, $next, 'configuration');
        CT_Integration::record_operational_diagnostic('delivery', 'configuration');
    }

    private static function mark_completed(object $row): void {
        self::update_claimed($row, 'completed', (int) $row->attempts, null, '');
    }

    private static function update_claimed(object $row, string $status, int $attempts, ?string $next, string $diagnostic): bool {
        global $wpdb;
        $data = [
            'status' => $status,
            'attempts' => $attempts,
            'locked_at' => null,
            'lock_token' => null,
            'last_error' => substr(sanitize_key($diagnostic), 0, 64),
            'updated_at' => current_time('mysql', true),
        ];
        $formats = ['%s', '%d', '%s', '%s', '%s', '%s'];
        if ($next !== null) {
            $data['next_attempt_at'] = $next;
            $formats[] = '%s';
        }
        $updated = $wpdb->update(self::table(), $data, [
            'event_id' => (string) $row->event_id,
            'status' => 'processing',
            'lock_token' => (string) $row->lock_token,
        ], $formats, ['%s', '%s', '%s']);
        if ($updated === false) CT_Integration::record_operational_diagnostic('delivery', 'state_update_failed');
        return $updated === 1;
    }

    private static function recover_stale_locks(): void {
        global $wpdb;
        $table = self::table();
        $cutoff = gmdate('Y-m-d H:i:s', time() - self::LOCK_TIMEOUT_SECONDS);
        $now = current_time('mysql', true);
        $updated = $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET status = 'retry', locked_at = NULL, lock_token = NULL, next_attempt_at = %s, last_error = 'stale_lock', updated_at = %s WHERE status = 'processing' AND locked_at < %s",
            $now, $now, $cutoff
        ));
        if ($updated === false) CT_Integration::record_operational_diagnostic('delivery', 'stale_recovery_failed');
    }

    private static function transition_expired_active(): void {
        global $wpdb;
        $table = self::table();
        $cutoff = gmdate('Y-m-d H:i:s', time() - self::MAX_DELIVERY_AGE_SECONDS);
        $now = current_time('mysql', true);
        $updated = $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET status = 'dead-letter', last_error = 'delivery_age', updated_at = %s WHERE status IN ('queued','retry') AND created_at < %s",
            $now, $cutoff
        ));
        if ($updated === false) CT_Integration::record_operational_diagnostic('delivery', 'age_transition_failed');
    }

    private static function cleanup_terminal(): void {
        global $wpdb;
        $table = self::table();
        $cutoff = gmdate('Y-m-d H:i:s', time() - self::TERMINAL_RETENTION_SECONDS);
        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$table} WHERE status IN ('completed','permanent-failure','dead-letter') AND updated_at < %s",
            $cutoff
        ));
        if ($deleted === false) CT_Integration::record_operational_diagnostic('delivery', 'terminal_cleanup_failed');
    }

    private static function remove_oldest_completed_for_capacity(): void {
        global $wpdb;
        $table = self::table();
        $wpdb->query("DELETE FROM {$table} WHERE status = 'completed' ORDER BY updated_at ASC LIMIT 1");
    }

    /** @param array<string,mixed> $body @return array<string,int|string>|WP_Error */
    private static function normalize_body(array $body): array|WP_Error {
        if (($body['event'] ?? null) === 'reconcile') {
            if (array_keys($body) !== ['event', 'scope'] || ($body['scope'] ?? null) !== 'all-content') {
                return self::queue_error('invalid_reconciliation');
            }
            return ['event' => 'reconcile', 'scope' => 'all-content'];
        }
        $has_previous = array_key_exists('previousSlug', $body);
        $expected_keys = $has_previous
            ? ['event', 'postId', 'previousSlug', 'slug', 'status']
            : ['event', 'postId', 'slug', 'status'];
        $actual_keys = array_keys($body);
        sort($actual_keys);
        sort($expected_keys);
        if ($actual_keys !== $expected_keys) return self::queue_error('invalid_keys');
        if (!is_string($body['event']) || !in_array($body['event'], self::EVENTS, true)) {
            return self::queue_error('invalid_event');
        }
        if (!is_int($body['postId']) || $body['postId'] < 1) return self::queue_error('invalid_post_id');
        if (!is_string($body['slug']) || !self::valid_slug($body['slug'])) return self::queue_error('invalid_slug');
        if (!is_string($body['status']) || !in_array($body['status'], self::STATUSES, true)) {
            return self::queue_error('invalid_status');
        }
        if ($has_previous && (!is_string($body['previousSlug']) || !self::valid_slug($body['previousSlug']))) {
            return self::queue_error('invalid_previous_slug');
        }
        $normalized = [
            'event' => $body['event'],
            'postId' => $body['postId'],
            'slug' => $body['slug'],
        ];
        if ($has_previous) $normalized['previousSlug'] = $body['previousSlug'];
        $normalized['status'] = $body['status'];
        return $normalized;
    }

    private static function valid_slug(string $slug): bool {
        return strlen($slug) <= 200 && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) === 1;
    }

    /** @param array<string,mixed> $response */
    private static function is_verified_replay_response(array $response): bool {
        $content_type = wp_remote_retrieve_header($response, 'content-type');
        if (!is_string($content_type)) return false;
        if (strtolower(trim(explode(';', $content_type, 2)[0])) !== 'application/json') return false;
        $body = wp_remote_retrieve_body($response);
        if (!is_string($body) || strlen($body) > self::REPLAY_RESPONSE_LIMIT_BYTES) return false;
        $decoded = json_decode($body, true);
        return json_last_error() === JSON_ERROR_NONE
            && is_array($decoded)
            && array_keys($decoded) === ['code']
            && ($decoded['code'] ?? null) === self::REPLAY_RESPONSE_CODE;
    }

    /** @return array{generation:string,raw:string}|null */
    private static function reconciliation_marker(): ?array {
        global $wpdb;
        $raw = $wpdb->get_var($wpdb->prepare(
            "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s LIMIT 1",
            self::RECONCILIATION_OPTION
        ));
        if (!is_string($raw) || strlen($raw) > 256) return null;
        $marker = json_decode($raw, true);
        if (!is_array($marker) || array_keys($marker) !== ['generation', 'created_at']) return null;
        if (!is_string($marker['generation']) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $marker['generation'])) return null;
        if (!is_int($marker['created_at']) || $marker['created_at'] < 1) return null;
        return ['generation' => $marker['generation'], 'raw' => $raw];
    }

    private static function clear_reconciliation_marker(string $raw): bool {
        global $wpdb;
        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
            self::RECONCILIATION_OPTION,
            $raw
        ));
        if ($deleted === 1) wp_cache_delete(self::RECONCILIATION_OPTION, 'options');
        return $deleted === 1;
    }

    private static function acquire_reconciliation_lock(): bool|WP_Error {
        global $wpdb;
        $result = $wpdb->get_var($wpdb->prepare(
            'SELECT GET_LOCK(%s, %d)',
            self::reconciliation_lock_name(),
            self::RECONCILIATION_LOCK_TIMEOUT_SECONDS
        ));
        return (string) $result === '1' ? true : self::queue_error('reconciliation_lock_failed');
    }

    private static function release_reconciliation_lock(): void {
        global $wpdb;
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', self::reconciliation_lock_name()));
    }

    private static function reconciliation_lock_name(): string {
        return substr('ctr_' . hash('sha256', self::RECONCILIATION_OPTION . self::table()), 0, 64);
    }

    private static function acquire_capacity_lock(): bool|WP_Error {
        global $wpdb;
        $result = $wpdb->get_var($wpdb->prepare(
            'SELECT GET_LOCK(%s, %d)',
            self::capacity_lock_name(),
            1
        ));
        return (string) $result === '1' ? true : self::queue_error('lock_failed');
    }

    private static function release_capacity_lock(): void {
        global $wpdb;
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', self::capacity_lock_name()));
    }

    private static function capacity_lock_name(): string {
        return substr('ctq_' . hash('sha256', self::table()), 0, 64);
    }

    private static function queue_error(string $code): WP_Error {
        return new WP_Error('ct_queue_' . sanitize_key($code), 'CookeTricks queue operation failed.');
    }

    private static function migration_failed(string $code): void {
        update_option(self::MIGRATION_RETRY_OPTION, time() + self::MIGRATION_RETRY_SECONDS, false);
        CT_Integration::record_operational_diagnostic('migration', $code);
    }

    private static function table_exists(): bool {
        global $wpdb;
        $table = self::table();
        $found = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table)));
        return $found === $table;
    }

    private static function table_uses_innodb(): bool {
        $status = self::table_status();
        return is_array($status) && strtolower((string) ($status['Engine'] ?? '')) === 'innodb';
    }

    /** @return array<string,mixed>|null */
    private static function table_status(): ?array {
        global $wpdb;
        $table = self::table();
        $status = $wpdb->get_row($wpdb->prepare(
            'SHOW TABLE STATUS LIKE %s',
            $wpdb->esc_like($table)
        ), ARRAY_A);
        return is_array($status) ? $status : null;
    }

    private static function schema_is_valid(): bool {
        global $wpdb;
        if (!self::table_exists()) return false;
        $table = self::table();
        $columns = $wpdb->get_results("SHOW FULL COLUMNS FROM {$table}", ARRAY_A);
        $indexes = $wpdb->get_results("SHOW INDEX FROM {$table}", ARRAY_A);
        $status = self::table_status();
        if (!is_array($columns) || !is_array($indexes) || !is_array($status)) return false;
        if (strtolower((string) ($status['Engine'] ?? '')) !== 'innodb') return false;
        $collation = (string) ($status['Collation'] ?? '');
        if ($collation === '') return false;
        if ($wpdb->collate !== '' && strtolower($collation) !== strtolower($wpdb->collate)) return false;
        if ($wpdb->charset !== '' && !str_starts_with(strtolower($collation), strtolower($wpdb->charset) . '_')) return false;

        $by_name = [];
        foreach ($columns as $column) $by_name[(string) ($column['Field'] ?? '')] = $column;
        $expected_columns = [
            'event_id' => ['/^char\(36\)$/i', 'NO', null],
            'payload' => ['/^longtext$/i', 'NO', null],
            'status' => ['/^varchar\(20\)$/i', 'NO', 'queued'],
            'attempts' => ['/^tinyint(?:\(\d+\))? unsigned$/i', 'NO', '0'],
            'next_attempt_at' => ['/^datetime$/i', 'NO', null],
            'locked_at' => ['/^datetime$/i', 'YES', null],
            'lock_token' => ['/^char\(36\)$/i', 'YES', null],
            'last_error' => ['/^varchar\(64\)$/i', 'NO', ''],
            'created_at' => ['/^datetime$/i', 'NO', null],
            'updated_at' => ['/^datetime$/i', 'NO', null],
        ];
        foreach ($expected_columns as $name => [$type, $nullable, $default]) {
            $column = $by_name[$name] ?? null;
            if (!is_array($column) || preg_match($type, (string) ($column['Type'] ?? '')) !== 1) return false;
            if ((string) ($column['Null'] ?? '') !== $nullable) return false;
            if (($column['Default'] ?? null) !== $default) return false;
        }

        $index_map = [];
        $unique_map = [];
        foreach ($indexes as $index) {
            $name = (string) ($index['Key_name'] ?? '');
            $sequence = (int) ($index['Seq_in_index'] ?? 0);
            $index_map[$name][$sequence] = (string) ($index['Column_name'] ?? '');
            $unique_map[$name] = (int) ($index['Non_unique'] ?? 1) === 0;
        }
        foreach ($index_map as &$parts) {
            ksort($parts);
            $parts = array_values($parts);
        }
        unset($parts);
        return ($unique_map['PRIMARY'] ?? false)
            && ($index_map['PRIMARY'] ?? []) === ['event_id']
            && ($index_map['due_events'] ?? []) === ['status', 'next_attempt_at']
            && ($index_map['retention'] ?? []) === ['status', 'updated_at']
            && ($index_map['active_age'] ?? []) === ['status', 'created_at'];
    }

    private static function table(): string {
        global $wpdb;
        return $wpdb->prefix . 'cooketricks_delivery_queue';
    }
}
