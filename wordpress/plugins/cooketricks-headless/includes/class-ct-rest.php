<?php
if (!defined('ABSPATH')) exit;

final class CT_REST {
    public static function boot(): void {
        add_action('rest_api_init', [self::class, 'register_fields']);
        add_filter('rest_post_query', [self::class, 'limit_public_queries'], 10, 2);
    }

    public static function register_fields(): void {
        register_rest_field('post', 'cooketricks', [
            'get_callback' => [self::class, 'payload'],
            'schema' => ['description' => 'Normalized CookeTricks content payload.', 'type' => 'object', 'context' => ['view', 'edit'], 'readonly' => true],
        ]);
    }

    public static function limit_public_queries(array $args, WP_REST_Request $request): array {
        if (!is_user_logged_in()) {
            $args['post_status'] = 'publish';
            $args['date_query'][] = ['before' => current_time('mysql'), 'inclusive' => true];
        }
        return $args;
    }

    /** @return array<int, array<string, mixed>> */
    private static function terms(int $post_id, string $taxonomy): array {
        $items = wp_get_post_terms($post_id, $taxonomy);
        if (is_wp_error($items)) return [];
        return array_map(static fn(WP_Term $term): array => ['id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug], $items);
    }

    private static function image(int $attachment_id): ?array {
        if (!$attachment_id) return null;
        $src = wp_get_attachment_image_src($attachment_id, 'full');
        if (!$src) return null;
        return ['id' => $attachment_id, 'url' => esc_url_raw($src[0]), 'width' => (int) $src[1], 'height' => (int) $src[2], 'alt' => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true), 'caption' => wp_get_attachment_caption($attachment_id) ?: null];
    }

    /** @return array<int, array{name:string,items:array<int,string>}> */
    private static function ingredient_groups(array $lines): array {
        $groups = [['name' => '', 'items' => []]];
        foreach ($lines as $line) {
            if (preg_match('/^\[(.+)\]$/', $line, $matches)) { $groups[] = ['name' => sanitize_text_field($matches[1]), 'items' => []]; continue; }
            $groups[array_key_last($groups)]['items'][] = sanitize_text_field($line);
        }
        return array_values(array_filter($groups, static fn(array $group): bool => !empty($group['items'])));
    }

    public static function payload(array $post): array {
        $post_id = absint($post['id'] ?? 0);
        $meta = static fn(string $key, $default = null) => get_post_meta($post_id, $key, true) ?: $default;
        $ingredients = (array) $meta('ct_ingredients', []);
        $instructions = (array) $meta('ct_instructions', []);
        $nutrition = json_decode((string) $meta('ct_nutrition_json', ''), true);
        $author_id = (int) get_post_field('post_author', $post_id);
        $author = get_userdata($author_id);
        $social_image_id = (int) $meta('ct_social_image_id', 0);
        $to_int_or_null = static fn($value): ?int => ($number = (int) $value) > 0 ? $number : null;

        return [
            'contentType' => $meta('ct_content_type', 'article'),
            'featuredImage' => self::image(get_post_thumbnail_id($post_id)),
            'socialImage' => self::image($social_image_id),
            'author' => $author ? ['id' => $author_id, 'name' => $author->display_name, 'slug' => $author->user_nicename, 'description' => get_the_author_meta('description', $author_id), 'url' => get_author_posts_url($author_id), 'avatar' => get_avatar_url($author_id, ['size' => 192]) ?: null] : null,
            'taxonomies' => [
                'categories' => self::terms($post_id, 'category'), 'tags' => self::terms($post_id, 'post_tag'),
                'cuisines' => self::terms($post_id, 'ct_cuisine'), 'mealTypes' => self::terms($post_id, 'ct_meal_type'),
                'occasions' => self::terms($post_id, 'ct_occasion'), 'diets' => self::terms($post_id, 'ct_diet'),
            ],
            'recipe' => [
                'difficulty' => $meta('ct_difficulty'), 'prepTime' => $to_int_or_null($meta('ct_prep_time', 0)),
                'cookTime' => $to_int_or_null($meta('ct_cook_time', 0)), 'additionalTime' => $to_int_or_null($meta('ct_additional_time', 0)),
                'totalTime' => $to_int_or_null(array_sum(array_map('intval', [$meta('ct_prep_time', 0), $meta('ct_cook_time', 0), $meta('ct_additional_time', 0)]))),
                'servings' => $to_int_or_null($meta('ct_servings', 0)), 'yield' => $meta('ct_recipe_yield'),
                'ingredientGroups' => self::ingredient_groups($ingredients),
                'ingredients' => array_values(array_filter($ingredients, static fn(string $line): bool => !preg_match('/^\[.+\]$/', $line))),
                'instructions' => array_map(static fn(string $text, int $index): array => ['position' => $index + 1, 'text' => $text], $instructions, array_keys($instructions)),
                'equipment' => (array) $meta('ct_equipment', []), 'substitutions' => (array) $meta('ct_substitutions', []),
                'storageNotes' => $meta('ct_storage_notes'), 'safetyNotes' => $meta('ct_safety_notes'),
                'testedDate' => $meta('ct_tested_date'), 'testedBy' => $meta('ct_tested_by'), 'testNotes' => $meta('ct_test_notes'),
                'nutrition' => is_array($nutrition) ? $nutrition : null, 'nutritionVerified' => (bool) $meta('ct_nutrition_verified', false),
            ],
            'transparency' => ['imageCreator' => $meta('ct_image_creator'), 'imageSource' => $meta('ct_image_source'), 'aiDisclosure' => $meta('ct_ai_disclosure')],
            'seo' => [
                'title' => $meta('ct_seo_title'), 'description' => $meta('ct_seo_description'), 'canonicalUrl' => $meta('ct_canonical_url'),
                'focusTopic' => $meta('ct_focus_topic'), 'searchIntent' => $meta('ct_search_intent'), 'sources' => (array) $meta('ct_sources', []),
                'informationGain' => $meta('ct_information_gain'), 'lastReviewed' => $meta('ct_last_reviewed'),
            ],
        ];
    }
}
