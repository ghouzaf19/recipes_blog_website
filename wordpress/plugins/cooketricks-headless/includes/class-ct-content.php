<?php
if (!defined('ABSPATH')) exit;

final class CT_Content {
    public const TAXONOMIES = [
        'ct_cuisine' => ['Cuisine', 'Cuisines', 'cuisine'],
        'ct_meal_type' => ['Meal Type', 'Meal Types', 'meal-type'],
        'ct_occasion' => ['Occasion', 'Occasions', 'occasion'],
        'ct_diet' => ['Diet', 'Diets', 'diet'],
    ];

    /** @return array<string, array<string, mixed>> */
    public static function fields(): array {
        $string = static fn(string $default = ''): array => ['type' => 'string', 'default' => $default];
        $integer = static fn(): array => ['type' => 'integer'];
        $boolean = static fn(): array => ['type' => 'boolean', 'default' => false];
        $strings = static fn(): array => ['type' => 'array', 'default' => [], 'show_in_rest' => ['schema' => ['type' => 'array', 'items' => ['type' => 'string']]]];
        return [
            'ct_content_type' => $string('article'), 'ct_difficulty' => $string(),
            'ct_prep_time' => $integer(), 'ct_cook_time' => $integer(), 'ct_additional_time' => $integer(),
            'ct_servings' => $integer(), 'ct_recipe_yield' => $string(),
            'ct_ingredients' => $strings(), 'ct_instructions' => $strings(), 'ct_equipment' => $strings(),
            'ct_substitutions' => $strings(), 'ct_storage_notes' => $string(), 'ct_safety_notes' => $string(),
            'ct_tested_date' => $string(), 'ct_tested_by' => $string(), 'ct_test_notes' => $string(),
            'ct_nutrition_json' => $string(), 'ct_nutrition_verified' => $boolean(),
            'ct_image_creator' => $string(), 'ct_image_source' => $string(), 'ct_ai_disclosure' => $string(),
            'ct_seo_title' => $string(), 'ct_seo_description' => $string(), 'ct_canonical_url' => $string(),
            'ct_social_image_id' => $integer(), 'ct_focus_topic' => $string(), 'ct_search_intent' => $string(),
            'ct_sources' => $strings(), 'ct_information_gain' => $string(), 'ct_last_reviewed' => $string(),
        ];
    }

    public static function boot(): void {
        add_action('init', [self::class, 'register_taxonomies']);
        add_action('init', [self::class, 'register_meta']);
    }

    public static function register_taxonomies(): void {
        foreach (self::TAXONOMIES as $name => [$singular, $plural, $slug]) {
            register_taxonomy($name, ['post'], [
                'labels' => ['name' => $plural, 'singular_name' => $singular, 'search_items' => "Search {$plural}", 'all_items' => "All {$plural}", 'edit_item' => "Edit {$singular}", 'update_item' => "Update {$singular}", 'add_new_item' => "Add New {$singular}", 'new_item_name' => "New {$singular} Name", 'menu_name' => $plural],
                'public' => true, 'hierarchical' => true, 'show_admin_column' => true, 'show_in_rest' => true,
                'rest_base' => $slug, 'rewrite' => ['slug' => $slug],
            ]);
        }
    }

    public static function register_meta(): void {
        foreach (self::fields() as $key => $definition) {
            $type = $definition['type'];
            $args = [
                'single' => true, 'type' => $type,
                'show_in_rest' => $definition['show_in_rest'] ?? true,
                'auth_callback' => static fn(): bool => current_user_can('edit_posts'),
                'sanitize_callback' => static fn($value) => CT_Content::sanitize_value($key, $type, $value),
            ];
            if (array_key_exists('default', $definition)) $args['default'] = $definition['default'];
            register_post_meta('post', $key, $args);
        }
    }

    public static function sanitize_value(string $key, string $type, $value) {
        if ($type === 'integer') return absint($value);
        if ($type === 'boolean') return rest_sanitize_boolean($value);
        if ($type === 'array') return array_values(array_filter(array_map('sanitize_text_field', is_array($value) ? $value : [])));
        if (in_array($key, ['ct_canonical_url', 'ct_image_source'], true)) return esc_url_raw((string) $value);
        if (in_array($key, ['ct_seo_description', 'ct_storage_notes', 'ct_safety_notes', 'ct_test_notes', 'ct_information_gain', 'ct_ai_disclosure'], true)) return sanitize_textarea_field((string) $value);
        if ($key === 'ct_nutrition_json') {
            $decoded = json_decode((string) $value, true);
            return is_array($decoded) ? wp_json_encode($decoded) : '';
        }
        return sanitize_text_field((string) $value);
    }

    /** @return string[] */
    public static function parse_lines(string $value): array {
        return array_values(array_filter(array_map('trim', preg_split('/\R/', sanitize_textarea_field(wp_unslash($value))) ?: [])));
    }

    public static function seed_terms(): void {
        $groups = [
            'ct_cuisine' => ['American', 'Asian', 'French', 'Indian', 'Italian', 'Mediterranean', 'Mexican', 'Middle Eastern'],
            'ct_meal_type' => ['Appetizers', 'Breakfast', 'Dinner', 'Drinks', 'Lunch', 'Snacks', 'Soups'],
            'ct_occasion' => ['Date Night', 'Holidays', 'Party Recipes', 'Weeknight'],
            'ct_diet' => ['Dairy Free', 'Gluten Free', 'Vegan', 'Vegetarian'],
        ];
        foreach ($groups as $taxonomy => $terms) foreach ($terms as $term) if (!term_exists($term, $taxonomy)) wp_insert_term($term, $taxonomy);
    }
}
