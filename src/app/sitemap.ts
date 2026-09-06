import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/wordpress';
import { canonicalAuthorSlug, SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getAllPosts>> = [];

  try {
    posts = await getAllPosts();
  } catch (error) {
    console.error('Sitemap WordPress fetch failed:', error);
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/editorial-policy`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/recipe-testing`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.modifiedAt),
    changeFrequency: 'weekly',
    priority: post.data.contentType === 'recipe' ? 0.8 : 0.7,
  }));

  const authors = new Map(
    posts
      .filter((post) => post.data.author)
      .map((post) => [
        canonicalAuthorSlug(post.data.author!.slug),
        {
          ...post.data.author!,
          slug: canonicalAuthorSlug(post.data.author!.slug),
        },
      ]),
  );

  const authorPages: MetadataRoute.Sitemap = Array.from(
    authors.values(),
  ).map((author) => ({
    url: `${SITE_URL}/authors/${author.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticPages, ...postPages, ...authorPages];
}
