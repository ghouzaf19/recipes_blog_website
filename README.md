# CookeTricks

Next.js 16 frontend for `cooketricks.com`, powered by a headless WordPress installation at `cms.cooketricks.com`.

## Local setup

1. Copy `.env.example` to `.env.local` and set every value.
2. Run `npm install`.
3. Run `npm run dev`.
4. Before deployment, run `npm run check`.

The frontend reads only published content for public pages. WordPress previews use an Application Password, HMAC-signed preview links, and `no-store` requests. Publishing or updating a post calls the protected revalidation endpoint.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Hostinger and WordPress setup.

## Content model

The companion `cooketricks-headless` WordPress plugin adds recipe fields, taxonomies, SEO controls, authorship data, transparency fields, normalized REST output, publishing validation, preview links, and cache revalidation.
