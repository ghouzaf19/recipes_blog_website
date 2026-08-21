# CookeTricks deployment guide

## 1. Install the WordPress plugin

In `cms.cooketricks.com/wp-admin`, open **Plugins → Add New Plugin → Upload Plugin**, upload `cooketricks-headless-2.0.0.zip`, and activate it. Keep **Settings → Permalinks → Post name** selected.

Add these constants to `wp-config.php` above the “stop editing” line. Generate two different long random secrets; do not reuse the example values.

```php
define('COOKETRICKS_FRONTEND_URL', 'https://cooketricks.com');
define('COOKETRICKS_REVALIDATE_URL', 'https://cooketricks.com/api/revalidate');
define('COOKETRICKS_PREVIEW_SECRET', 'YOUR_LONG_PREVIEW_SECRET');
define('COOKETRICKS_REVALIDATE_SECRET', 'YOUR_DIFFERENT_LONG_REVALIDATE_SECRET');
```

Create one WordPress **Application Password** under **Users → Profile** for the preview integration. It is not the normal WordPress login password.

## 2. Configure the Next.js application

Set the six variables from `.env.example` in Hostinger's Node.js environment. The two secrets must exactly match the WordPress constants. Never prefix a password or secret with `NEXT_PUBLIC_`.

```bash
npm ci
npm run check
npm run build
npm run start
```

Use Node.js 20 or newer. Configure the production start command as `npm run start` and the application port supplied by Hostinger.

## 3. WordPress content workflow

1. Create a real WordPress user for every writer and complete the public biography.
2. Create a post and choose **Article** or **Recipe** in the CookeTricks panel.
3. Recipes require an excerpt, featured image, servings, ingredients, and instructions before publication.
4. Enter test, nutrition, image-source, disclosure, source, and review fields only when the information is accurate.
5. Use **Preview** for drafts. Publish when the post is ready; WordPress then asks Next.js to refresh the affected pages.

## 4. Verification

- Open `https://cms.cooketricks.com/wp-json/wp/v2/posts` and confirm JSON is returned.
- Publish a small test post and confirm it appears at `https://cooketricks.com/blog`.
- Confirm its canonical URL, author page, dates, Open Graph metadata, and JSON-LD.
- Test draft Preview while logged into WordPress.
- Submit `https://cooketricks.com/sitemap.xml` in Google Search Console.

## Security notes

- Keep WordPress, PHP, and plugins updated.
- Restrict WordPress admin accounts and enable two-factor authentication where possible.
- Rotate the Application Password and both integration secrets if they are exposed.
- Do not install a second recipe-schema plugin unless duplicate JSON-LD is disabled.
