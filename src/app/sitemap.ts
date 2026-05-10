import { MetadataRoute } from 'next';
import { createClient } from 'next-sanity';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_API_CONTRIBUTOR ?? process.env.SANITY_API_READ_TOKEN,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cooketricks.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all published blog post slugs + their last-modified dates
  const posts: { slug: string; updatedAt: string }[] = await client.fetch(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
      "slug": slug.current,
      "updatedAt": coalesce(_updatedAt, publishedAt)
    }`
  );

  const blogPostUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...blogPostUrls,
  ];
}
