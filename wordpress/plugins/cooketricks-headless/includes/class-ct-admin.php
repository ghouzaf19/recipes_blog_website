<?php
if (!defined('ABSPATH')) exit;

final class CT_Admin {
    private const NONCE_ACTION = 'cooketricks_save_post_fields';
    private const NONCE_NAME = 'cooketricks_fields_nonce';

    public static function boot(): void {
        add_action('add_meta_boxes', [self::class, 'add_meta_boxes']);
        add_action('save_post_post', [self::class, 'save_fields'], 10, 2);
        add_filter('wp_insert_post_data', [self::class, 'protect_incomplete_recipe'], 20, 2);
        add_action('admin_notices', [self::class, 'show_validation_notice']);
    }

    public static function add_meta_boxes(): void {
        add_meta_box('cooketricks_recipe', 'CookeTricks Recipe & Editorial Data', [self::class, 'render'], 'post', 'normal', 'high');
    }

    private static function value(int $post_id, string $key, $default = '') {
        $value = get_post_meta($post_id, $key, true);
        return $value === '' ? $default : $value;
    }

    private static function input(int $post_id, string $key, string $label, string $type = 'text', string $help = ''): void {
        $value = self::value($post_id, $key);
        printf('<div class="ct-field"><label for="%1$s">%2$s</label><input type="%3$s" id="%1$s" name="%1$s" value="%4$s">%5$s</div>', esc_attr($key), esc_html($label), esc_attr($type), esc_attr((string) $value), $help ? '<p class="description">' . esc_html($help) . '</p>' : '');
    }

    private static function textarea(int $post_id, string $key, string $label, int $rows = 5, bool $lines = false, string $help = ''): void {
        $value = self::value($post_id, $key);
        if ($lines && is_array($value)) $value = implode("\n", $value);
        printf('<div class="ct-field ct-wide"><label for="%1$s">%2$s</label><textarea rows="%3$d" id="%1$s" name="%1$s">%4$s</textarea>%5$s</div>', esc_attr($key), esc_html($label), $rows, esc_textarea((string) $value), $help ? '<p class="description">' . esc_html($help) . '</p>' : '');
    }

    public static function render(WP_Post $post): void {
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);
        $type = self::value($post->ID, 'ct_content_type', 'article');
        $difficulty = self::value($post->ID, 'ct_difficulty');
        $frontend_preview = CT_Webhooks::frontend_preview_url($post);
        ?>
        <style>.ct-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ct-field label{display:block;font-weight:600;margin-bottom:5px}.ct-field input,.ct-field select,.ct-field textarea{width:100%}.ct-wide{grid-column:1/-1}.ct-section{grid-column:1/-1;border-top:1px solid #dcdcde;margin-top:8px;padding-top:10px}.ct-check{display:flex;align-items:center;gap:8px}.ct-check input{width:auto}.ct-preview{grid-column:1/-1;background:#f0f6fc;border-left:4px solid #2271b1;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.ct-preview p{margin:0}@media(max-width:900px){.ct-grid{grid-template-columns:1fr}.ct-wide,.ct-section,.ct-preview{grid-column:auto}.ct-preview{align-items:flex-start;flex-direction:column}}</style>
        <div class="ct-grid">
            <?php if ($frontend_preview !== ''): ?><div class="ct-preview"><p><strong>Headless preview:</strong> Save the draft, then open it on the Next.js site.</p><a class="button button-primary" target="_blank" rel="noopener noreferrer" href="<?php echo esc_url($frontend_preview); ?>">Open Next.js Preview</a></div><?php endif; ?>
            <div class="ct-field"><label for="ct_content_type">Content type *</label><select id="ct_content_type" name="ct_content_type"><option value="article" <?php selected($type, 'article'); ?>>Article / Guide</option><option value="recipe" <?php selected($type, 'recipe'); ?>>Recipe</option></select></div>
            <div class="ct-field"><label for="ct_difficulty">Difficulty</label><select id="ct_difficulty" name="ct_difficulty"><option value="">Not applicable</option><?php foreach (['easy','medium','hard'] as $item): ?><option value="<?php echo esc_attr($item); ?>" <?php selected($difficulty, $item); ?>><?php echo esc_html(ucfirst($item)); ?></option><?php endforeach; ?></select></div>
            <?php self::input($post->ID, 'ct_recipe_yield', 'Recipe yield', 'text', 'Example: 12 cookies or 1 loaf.'); ?>
            <?php self::input($post->ID, 'ct_prep_time', 'Prep time (minutes)', 'number'); ?>
            <?php self::input($post->ID, 'ct_cook_time', 'Cook time (minutes)', 'number'); ?>
            <?php self::input($post->ID, 'ct_additional_time', 'Additional time (minutes)', 'number'); ?>
            <?php self::input($post->ID, 'ct_servings', 'Servings', 'number'); ?>
            <?php self::textarea($post->ID, 'ct_ingredients', 'Ingredients - one item per line', 8, true, 'Use [Group name] on its own line to start a group.'); ?>
            <?php self::textarea($post->ID, 'ct_instructions', 'Instructions - one step per line', 8, true); ?>
            <?php self::textarea($post->ID, 'ct_equipment', 'Equipment - one item per line', 4, true); ?>
            <?php self::textarea($post->ID, 'ct_substitutions', 'Substitutions - one item per line', 4, true); ?>
            <?php self::textarea($post->ID, 'ct_storage_notes', 'Storage, freezing & reheating', 4); ?>
            <?php self::textarea($post->ID, 'ct_safety_notes', 'Safety & allergen notes', 4); ?>
            <h3 class="ct-section">Testing, nutrition & image transparency</h3>
            <?php self::input($post->ID, 'ct_tested_date', 'Tested date', 'date'); ?>
            <?php self::input($post->ID, 'ct_tested_by', 'Tested by'); ?>
            <?php self::input($post->ID, 'ct_last_reviewed', 'Last reviewed', 'date'); ?>
            <?php self::textarea($post->ID, 'ct_test_notes', 'First-hand test notes', 5); ?>
            <?php self::textarea($post->ID, 'ct_nutrition_json', 'Nutrition JSON', 5, false, 'Optional. Add only calculated and reviewed values.'); ?>
            <div class="ct-field ct-check"><input type="checkbox" id="ct_nutrition_verified" name="ct_nutrition_verified" value="1" <?php checked((bool) self::value($post->ID, 'ct_nutrition_verified')); ?>><label for="ct_nutrition_verified">Nutrition reviewed</label></div>
            <?php self::input($post->ID, 'ct_image_creator', 'Image creator'); ?>
            <?php self::input($post->ID, 'ct_image_source', 'Image source URL', 'url'); ?>
            <?php self::textarea($post->ID, 'ct_ai_disclosure', 'AI/editing disclosure', 3); ?>
            <h3 class="ct-section">SEO, sources & editorial quality</h3>
            <?php self::input($post->ID, 'ct_seo_title', 'SEO title'); ?>
            <?php self::textarea($post->ID, 'ct_seo_description', 'SEO description', 3); ?>
            <?php self::input($post->ID, 'ct_canonical_url', 'Custom canonical URL', 'url', 'Leave empty unless the canonical must point elsewhere.'); ?>
            <?php self::input($post->ID, 'ct_social_image_id', 'Social image attachment ID', 'number'); ?>
            <?php self::input($post->ID, 'ct_focus_topic', 'Focus topic'); ?>
            <?php self::input($post->ID, 'ct_search_intent', 'Search intent'); ?>
            <?php self::textarea($post->ID, 'ct_sources', 'Sources - one URL per line', 5, true); ?>
            <?php self::textarea($post->ID, 'ct_information_gain', 'Original information / information gain', 5); ?>
        </div>
        <?php
    }

    public static function save_fields(int $post_id, WP_Post $post): void {
        if (!isset($_POST[self::NONCE_NAME]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])), self::NONCE_ACTION)) return;
        if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
        foreach (CT_Content::fields() as $key => $definition) {
            if ($key === 'ct_nutrition_verified') { update_post_meta($post_id, $key, isset($_POST[$key])); continue; }
            $raw = $_POST[$key] ?? '';
            if ($definition['type'] === 'array') { update_post_meta($post_id, $key, CT_Content::parse_lines((string) $raw)); continue; }
            if ($raw === '') { delete_post_meta($post_id, $key); continue; }
            update_post_meta($post_id, $key, CT_Content::sanitize_value($key, $definition['type'], wp_unslash($raw)));
        }
    }

    public static function protect_incomplete_recipe(array $data, array $postarr): array {
        if (($data['post_type'] ?? '') !== 'post' || ($data['post_status'] ?? '') !== 'publish') return $data;
        $post_id = absint($postarr['ID'] ?? 0);
        $type = sanitize_text_field(wp_unslash($_POST['ct_content_type'] ?? '')) ?: ($post_id ? (string) get_post_meta($post_id, 'ct_content_type', true) : 'article');
        if ($type !== 'recipe') return $data;
        $lines = static fn(string $key): string => trim((string) wp_unslash($_POST[$key] ?? ($post_id ? implode("\n", (array) get_post_meta($post_id, $key, true)) : '')));
        $servings = absint($_POST['ct_servings'] ?? ($post_id ? get_post_meta($post_id, 'ct_servings', true) : 0));
        if ($lines('ct_ingredients') === '' || $lines('ct_instructions') === '' || $servings < 1 || empty($data['post_excerpt']) || !$post_id || !get_post_thumbnail_id($post_id)) {
            $data['post_status'] = 'draft';
            set_transient('ct_validation_' . get_current_user_id(), true, 60);
        }
        return $data;
    }

    public static function show_validation_notice(): void {
        $key = 'ct_validation_' . get_current_user_id();
        if (!get_transient($key)) return;
        delete_transient($key);
        echo '<div class="notice notice-error is-dismissible"><p><strong>CookeTricks:</strong> Recipe kept as draft. Excerpt, featured image, servings, ingredients, and instructions are required.</p></div>';
    }
}
