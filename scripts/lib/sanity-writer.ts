/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Sanity Writer
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles all write operations to Sanity CMS:
 *   1. Uploading image buffers to the Sanity Asset pipeline
 *   2. Querying for existing author/category references
 *   3. Creating the final blog post document
 *
 * Uses the SANITY_API_CONTRIBUTOR token for write access.
 */

import { createClient, type SanityClient } from '@sanity/client';
import { config } from './config';
import { logger } from './logger';
import { withRetry } from './retry';

// ─── Client ─────────────────────────────────────────────────────────────────

const client: SanityClient = createClient({
  projectId: config.sanity.projectId,
  dataset: config.sanity.dataset,
  apiVersion: config.sanity.apiVersion,
  token: config.sanity.token,
  useCdn: false,
});

// ─── Image Upload ───────────────────────────────────────────────────────────

/**
 * Uploads an image buffer to Sanity's Asset API.
 * Returns an asset reference object ready to embed in a document.
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string
): Promise<{ _type: 'image'; asset: { _type: 'reference'; _ref: string } }> {
  return withRetry(
    async () => {
      logger.info('Sanity', `Uploading image: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)…`);

      const asset = await client.assets.upload('image', buffer, {
        filename,
        contentType: 'image/jpeg',
      });

      logger.success('Sanity', `Image uploaded → ${asset._id}`);

      return {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      };
    },
    { label: `Sanity Image Upload (${filename})` }
  );
}

// ─── Reference Lookups ──────────────────────────────────────────────────────

/**
 * Finds or creates an author document by name.
 * Returns a Sanity reference object.
 */
export async function getOrCreateAuthor(
  name: string
): Promise<{ _type: 'reference'; _ref: string }> {
  // Try to find existing author
  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "author" && name == $name][0]{ _id }`,
    { name }
  );

  if (existing) {
    logger.info('Sanity', `Found existing author: "${name}" → ${existing._id}`);
    return { _type: 'reference', _ref: existing._id };
  }

  // Create a new author
  logger.info('Sanity', `Creating new author: "${name}"…`);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const created = await client.create({
    _type: 'author',
    name,
    slug: { current: slug, _type: 'slug' },
    role: 'AI Recipe Creator',
    bio: 'Recipes crafted by artificial intelligence, reviewed and curated by the CookeTricks editorial team.',
  });

  logger.success('Sanity', `Author created → ${created._id}`);
  return { _type: 'reference', _ref: created._id };
}

/**
 * Finds or creates a category by title.
 * Returns a Sanity reference object.
 */
export async function getOrCreateCategory(
  title: string
): Promise<{ _type: 'reference'; _ref: string }> {
  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "category" && title == $title][0]{ _id }`,
    { title }
  );

  if (existing) {
    logger.info('Sanity', `Found existing category: "${title}" → ${existing._id}`);
    return { _type: 'reference', _ref: existing._id };
  }

  logger.info('Sanity', `Creating new category: "${title}"…`);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const created = await client.create({
    _type: 'category',
    title,
    slug: { current: slug, _type: 'slug' },
    description: `Recipes in the ${title} category.`,
  });

  logger.success('Sanity', `Category created → ${created._id}`);
  return { _type: 'reference', _ref: created._id };
}

// ─── Duplicate Check ────────────────────────────────────────────────────────

/**
 * Fetches all existing post slugs to prevent duplicates.
 */
export async function getExistingSlugs(): Promise<string[]> {
  const results = await client.fetch<{ slug: string }[]>(
    `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`
  );
  return results.map((r) => r.slug);
}

// ─── Post Creation ──────────────────────────────────────────────────────────

export interface SanityPostDocument {
  _type: 'post';
  title: string;
  slug: { current: string; _type: 'slug' };
  excerpt: string;
  author: { _type: 'reference'; _ref: string };
  category: { _type: 'reference'; _ref: string };
  mainImage: { _type: 'image'; asset: { _type: 'reference'; _ref: string }; alt: string };
  publishedAt: string;
  body: unknown[];
  cuisine: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: string[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    shareImage: { _type: 'image'; asset: { _type: 'reference'; _ref: string } };
  };
}

/**
 * Creates the final blog post document in Sanity.
 */
export async function createPost(doc: SanityPostDocument): Promise<string> {
  return withRetry(
    async () => {
      logger.info('Sanity', `Creating post: "${doc.title}"…`);

      const result = await client.create(doc);

      logger.success('Sanity', `Post published → ${result._id}`);
      logger.info('Sanity', `Live URL: ${config.siteUrl}/blog/${doc.slug.current}`);

      return result._id;
    },
    { label: 'Sanity Post Creation' }
  );
}
