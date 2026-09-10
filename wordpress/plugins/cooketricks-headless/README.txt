CookeTricks Headless CMS 2.3.0

Install the ZIP from WordPress Admin > Plugins > Add New Plugin > Upload Plugin.
Keep permalinks set to Post name. Use real WordPress users for authors.

NEXT.JS ENVIRONMENT
NEXT_PUBLIC_SITE_URL=https://cooketricks.com
WORDPRESS_API_URL=https://cms.cooketricks.com/wp-json/wp/v2
WORDPRESS_PREVIEW_USER=<application-password-user>
WORDPRESS_PREVIEW_PASSWORD=<application-password>
COOKETRICKS_PREVIEW_SECRET=<long-random-secret>
COOKETRICKS_REVALIDATE_SECRET=<different-long-random-secret>

WORDPRESS SERVER ENVIRONMENT
COOKETRICKS_FRONTEND_URL=https://cooketricks.com
COOKETRICKS_REVALIDATE_URL=https://cooketricks.com/api/revalidate
COOKETRICKS_PREVIEW_SECRET=<same-preview-secret>
COOKETRICKS_REVALIDATE_SECRET=<same-revalidate-secret>

Never expose application passwords or secrets in NEXT_PUBLIC variables.
