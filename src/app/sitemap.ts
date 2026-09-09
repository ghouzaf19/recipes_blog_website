import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/wordpress';
import { createSitemapEntries } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof getAllPosts>> = [];

  try {
    posts = await getAllPosts();
  } catch (error) {
    console.error('Sitemap WordPress fetch failed:', error);
  }

  return createSitemapEntries(posts);
}
