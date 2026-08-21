import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cooketricks.com').replace(/\/$/, '');
const API_URL = (process.env.WORDPRESS_API_URL ?? 'https://cms.cooketricks.com/wp-json/wp/v2').replace(/\/$/, '');

export interface WPTerm { id: number; name: string; slug: string }
export interface WPImage { id: number; url: string; width: number; height: number; alt: string; caption?: string | null }
export interface WPAuthor { id: number; name: string; slug: string; description?: string; url?: string; avatar?: string | null }
export interface IngredientGroup { name: string; items: string[] }
export interface InstructionStep { position: number; text: string }

export interface CookeTricksData {
  contentType: 'recipe' | 'article';
  featuredImage: WPImage | null;
  socialImage: WPImage | null;
  author: WPAuthor | null;
  taxonomies: {
    categories: WPTerm[]; tags: WPTerm[]; cuisines: WPTerm[];
    mealTypes: WPTerm[]; occasions: WPTerm[]; diets: WPTerm[];
  };
  recipe: {
    difficulty: 'easy' | 'medium' | 'hard' | null;
    prepTime: number | null; cookTime: number | null; additionalTime: number | null;
    totalTime: number | null; servings: number | null; yield: string | null;
    ingredientGroups: IngredientGroup[]; ingredients: string[]; instructions: InstructionStep[];
    equipment: string[]; substitutions: string[]; storageNotes: string | null; safetyNotes: string | null;
    testedDate: string | null; testedBy: string | null; testNotes: string | null;
    nutrition: Record<string, unknown> | null; nutritionVerified: boolean;
  };
  transparency: { imageCreator: string | null; imageSource: string | null; aiDisclosure: string | null };
  seo: {
    title: string | null; description: string | null; canonicalUrl: string | null;
    focusTopic: string | null; searchIntent: string | null; sources: string[];
    informationGain: string | null; lastReviewed: string | null;
  };
}

interface RawPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string; protected: boolean };
  cooketricks?: CookeTricksData;
}

export interface BlogPost {
  id: number;
  slug: string;
  status: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  publishedAt: string;
  modifiedAt: string;
  data: CookeTricksData;
}

export interface PostFilters {
  search?: string;
  category?: string;
  tag?: string;
  cuisine?: string;
  mealType?: string;
  occasion?: string;
  diet?: string;
  perPage?: number;
  page?: number;
}

const EMPTY_DATA: CookeTricksData = {
  contentType: 'article', featuredImage: null, socialImage: null, author: null,
  taxonomies: { categories: [], tags: [], cuisines: [], mealTypes: [], occasions: [], diets: [] },
  recipe: { difficulty: null, prepTime: null, cookTime: null, additionalTime: null, totalTime: null, servings: null, yield: null, ingredientGroups: [], ingredients: [], instructions: [], equipment: [], substitutions: [], storageNotes: null, safetyNotes: null, testedDate: null, testedBy: null, testNotes: null, nutrition: null, nutritionVerified: false },
  transparency: { imageCreator: null, imageSource: null, aiDisclosure: null },
  seo: { title: null, description: null, canonicalUrl: null, focusTopic: null, searchIntent: null, sources: [], informationGain: null, lastReviewed: null },
};

function decodeEntities(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function normalize(raw: RawPost): BlogPost {
  return {
    id: raw.id, slug: raw.slug, status: raw.status,
    title: decodeEntities(raw.title?.rendered ?? ''),
    excerpt: decodeEntities(raw.excerpt?.rendered ?? ''),
    contentHtml: raw.content?.rendered ?? '',
    publishedAt: raw.date, modifiedAt: raw.modified,
    data: raw.cooketricks ?? EMPTY_DATA,
  };
}

function authHeader(): string | undefined {
  const user = process.env.WORDPRESS_PREVIEW_USER;
  const password = process.env.WORDPRESS_PREVIEW_PASSWORD;
  return user && password ? `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` : undefined;
}

async function wpFetch<T>(path: string, options: { preview?: boolean; tags?: string[]; revalidate?: number } = {}): Promise<T> {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (options.preview) {
    const authorization = authHeader();
    if (!authorization) throw new Error('WordPress preview credentials are not configured.');
    headers.Authorization = authorization;
  }
  const response = await fetch(`${API_URL}${path}`, {
    headers,
    cache: options.preview ? 'no-store' : undefined,
    next: options.preview ? undefined : { revalidate: options.revalidate ?? 300, tags: options.tags ?? ['blog-index'] },
  });
  if (!response.ok) throw new Error(`WordPress API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

async function termId(restBase: 'categories' | 'tags' | 'cuisine' | 'meal-type' | 'occasion' | 'diet', slug: string): Promise<number | null> {
  const terms = await wpFetch<Array<{ id: number }>>(`/${restBase}?slug=${encodeURIComponent(slug)}&per_page=1`, { tags: [`term:${restBase}:${slug}`], revalidate: 3600 });
  return terms[0]?.id ?? null;
}

export async function getPosts(filters: PostFilters = {}): Promise<BlogPost[]> {
  const params = new URLSearchParams({ context: 'view', per_page: String(Math.min(filters.perPage ?? 24, 100)), page: String(filters.page ?? 1), orderby: 'date', order: 'desc' });
  if (filters.search) params.set('search', filters.search);
  if (filters.category) { const id = await termId('categories', filters.category); if (!id) return []; params.set('categories', String(id)); }
  if (filters.tag) { const id = await termId('tags', filters.tag); if (!id) return []; params.set('tags', String(id)); }
  if (filters.cuisine) { const id = await termId('cuisine', filters.cuisine); if (!id) return []; params.set('cuisine', String(id)); }
  if (filters.mealType) { const id = await termId('meal-type', filters.mealType); if (!id) return []; params.set('meal-type', String(id)); }
  if (filters.occasion) { const id = await termId('occasion', filters.occasion); if (!id) return []; params.set('occasion', String(id)); }
  if (filters.diet) { const id = await termId('diet', filters.diet); if (!id) return []; params.set('diet', String(id)); }
  const posts = await wpFetch<RawPost[]>(`/posts?${params.toString()}`, { tags: ['blog-index'], revalidate: 300 });
  return posts.map(normalize);
}

export async function getPostBySlug(slug: string, preview = false): Promise<BlogPost | null> {
  const params = new URLSearchParams({ slug, per_page: '1', context: preview ? 'edit' : 'view' });
  if (preview) params.set('status', 'draft,pending,future,publish,private');
  const posts = await wpFetch<RawPost[]>(`/posts?${params.toString()}`, { preview, tags: ['post', `post:${slug}`], revalidate: 300 });
  return posts[0] ? normalize(posts[0]) : null;
}

export async function getPreviewPostById(id: number): Promise<BlogPost | null> {
  try { return normalize(await wpFetch<RawPost>(`/posts/${id}?context=edit`, { preview: true })); }
  catch { return null; }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];
  for (let page = 1; page <= 20; page += 1) {
    let batch: BlogPost[];
    try { batch = await getPosts({ perPage: 100, page }); }
    catch (error) {
      if (page === 1) throw error;
      break;
    }
    posts.push(...batch);
    if (batch.length < 100) break;
  }
  return posts;
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function validPreviewToken(id: number, token: string): boolean {
  const secret = process.env.COOKETRICKS_PREVIEW_SECRET ?? '';
  if (!Number.isInteger(id) || id < 1 || !secret || !token) return false;
  const expected = createHmac('sha256', secret).update(String(id)).digest('hex');
  const left = Buffer.from(token); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
