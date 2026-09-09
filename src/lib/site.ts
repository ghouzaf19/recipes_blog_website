import type { Metadata, MetadataRoute } from 'next';

export const CANONICAL_SITE_URL = 'https://cooketricks.com';

export function normalizeSiteUrl(configuredUrl?: string): string {
  const candidate = configuredUrl?.trim() || CANONICAL_SITE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return CANONICAL_SITE_URL;
    }

    if (
      url.hostname.toLowerCase() === 'cooketricks.com' ||
      url.hostname.toLowerCase() === 'www.cooketricks.com'
    ) {
      return CANONICAL_SITE_URL;
    }

    return url.origin;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
);

export const EDITORIAL_AUTHOR_SLUG = 'cooke-tricks-editorial';
export const LEGACY_EDITORIAL_AUTHOR_SLUG = 'cooketricks-editorial';

export function canonicalAuthorSlug(slug: string): string {
  return slug === LEGACY_EDITORIAL_AUTHOR_SLUG
    ? EDITORIAL_AUTHOR_SLUG
    : slug;
}

export function getCanonicalHostRedirects() {
  return [
    {
      source: '/:path*',
      has: [
        {
          type: 'host' as const,
          value: 'www\\.cooketricks\\.com',
        },
      ],
      destination: `${CANONICAL_SITE_URL}/:path*`,
      permanent: true,
    },
  ];
}

export function createRobotsMetadata(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/wp-admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

interface SitemapPost {
  slug: string;
  modifiedAt: string;
  data: {
    contentType: 'recipe' | 'article';
  };
}

export function createSitemapEntries(
  posts: SitemapPost[],
): MetadataRoute.Sitemap {
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

  const editorialAuthorPage: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/authors/${EDITORIAL_AUTHOR_SLUG}`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return [...staticPages, ...postPages, ...editorialAuthorPage];
}

export function createPageMetadata({
  title,
  description,
  path,
  socialTitle = `${title} | CookeTricks`,
}: {
  title: string;
  description: string;
  path: string;
  socialTitle?: string;
}): Metadata {
  const url = new URL(path, `${SITE_URL}/`).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: 'CookeTricks',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: socialTitle,
      description,
    },
  };
}
