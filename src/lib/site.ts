import type { Metadata } from 'next';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cooketricks.com'
).replace(/\/$/, '');

export const EDITORIAL_AUTHOR_SLUG = 'cooke-tricks-editorial';
export const LEGACY_EDITORIAL_AUTHOR_SLUG = 'cooketricks-editorial';

export function canonicalAuthorSlug(slug: string): string {
  return slug === LEGACY_EDITORIAL_AUTHOR_SLUG
    ? EDITORIAL_AUTHOR_SLUG
    : slug;
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
