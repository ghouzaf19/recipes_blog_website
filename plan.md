Project: Extreme SEO Blog Engine (Next.js + Sanity.io)

Target Environment: Hostinger Business (Node.js)
Goal: 100/100 Lighthouse SEO & Performance, 0-Code Client Management.

1. The Strategy (Architecture)

To deliver "Powerhouse SEO," we will use Next.js (App Router) for the frontend and Sanity.io as the Headless CMS.

Next.js: Provides Server-Side Rendering (SSR) and Incremental Static Regeneration (ISR). This ensures Google sees a full HTML page instantly, not a blank div.

Sanity.io: A cloud-based content studio where the client logs in. It has no impact on site speed because we fetch data via an API.

2. Implementation Checklist for the AI Agent

A. Sanity Schema (The Client Interface)

Create an seo object in Sanity to give the client direct control over search results.

metaTitle: String (Max 60 chars).

metaDescription: Text (140-160 chars).

shareImage: Image (for OpenGraph/Twitter).

canonicalUrl: URL (to prevent duplicate content).

B. Next.js SEO Logic (The Engine)

Use the Metadata API in app/blog/[slug]/page.tsx:

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription,
    openGraph: {
      images: [post.seo?.shareImage?.url],
    },
    alternates: {
      canonical: post.seo?.canonicalUrl || `https://site.com/blog/${post.slug}`,
    },
  };
}


C. Structured Data (The "CEO" Secret Sauce)

Inject JSON-LD into every blog post. This helps Google create "Rich Snippets."

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify({
    "@context": "[https://schema.org](https://schema.org)",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": post.mainImage.url,
    "author": { "@type": "Person", "name": post.author.name },
    "datePublished": post.publishedAt
  })}}
/>


3. Deployment Plan: Hostinger Business (Node.js)

Hostinger Business supports Node.js via their hPanel. Use the Standalone Build for maximum performance.

Next.js Config: Set output: 'standalone' in next.config.js.

Build: Run npm run build. This generates a .next/standalone folder.

Transfer: Upload the contents of standalone, your public folder, and .next/static to Hostinger.

Hostinger hPanel:

Go to Websites -> Node.js.

Set the Entry File to server.js.

Install dependencies.

Start the application.

4. Directives for the AI Assistant

"Assistant, you are acting as my Senior Engineer. Follow these rules:"

Prioritize Core Web Vitals: Use next/image for all blog assets with specific sizes to avoid Layout Shift (CLS).

Automate Sitemaps: Setup next-sitemap to automatically ping Google whenever a new post is published.

Implement ISR: Use revalidate = 3600 on blog routes so the site remains a static HTML speed-demon while updating in the background.

Error Handling: If the Sanity API fails, ensure the page falls back to a graceful stale cache rather than a 404.

Final Handover Note: Once the code is live, the client only needs the Sanity Studio URL. They write, hit publish, and your "SEO Machine" does the rest.