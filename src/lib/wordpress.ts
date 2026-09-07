import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

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

interface InternalPostFilters extends PostFilters {
  authorId?: number;
}

const WORDPRESS_FETCH_TIMEOUT_MS = 10_000;

type WordPressErrorCategory =
  | 'timeout'
  | 'http'
  | 'invalid-json'
  | 'malformed-response'
  | 'incomplete-fetch'
  | 'network';

interface WordPressFetchResult {
  value: unknown;
  headers: Headers;
}

export interface PostListResult {
  posts: BlogPost[];
  currentPage: number;
  totalResults: number;
  totalPages: number;
}

class WordPressError extends Error {
  readonly category: WordPressErrorCategory;
  readonly status?: number;
  readonly failedPage?: number;

  constructor(
    category: WordPressErrorCategory,
    path: string,
    options: { status?: number; failedPage?: number } = {},
  ) {
    const resource = path.split('?', 1)[0] || '/';
    const detail = options.failedPage
      ? ` (page ${options.failedPage})`
      : options.status
        ? ` (${options.status})`
        : '';

    super(`WordPress ${category} error${detail}: ${resource}`);
    this.name = 'WordPressError';
    this.category = category;
    this.status = options.status;
    this.failedPage = options.failedPage;
  }
}

export function getWordPressErrorCategory(error: unknown): string {
  return error instanceof WordPressError
    ? error.category
    : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value
    : null;
}

function nullableString(value: unknown): string | null {
  return nonEmptyString(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function clampedPositiveInteger(
  value: number | undefined,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);

  if (!Number.isSafeInteger(integer)) {
    return fallback;
  }

  return Math.min(Math.max(integer, 1), maximum);
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => nonEmptyString(item) !== null,
      )
    : [];
}

function normalizeImage(value: unknown): WPImage | null {
  if (!isRecord(value)) return null;

  const id = nonNegativeInteger(value.id);
  const url = nonEmptyString(value.url);
  const width = finiteNumber(value.width);
  const height = finiteNumber(value.height);

  if (
    id === null ||
    url === null ||
    width === null ||
    width < 0 ||
    height === null ||
    height < 0
  ) {
    return null;
  }

  return {
    id,
    url,
    width,
    height,
    alt: typeof value.alt === 'string' ? value.alt : '',
    caption: nullableString(value.caption),
  };
}

function normalizeAuthor(value: unknown): WPAuthor | null {
  if (!isRecord(value)) return null;

  const id = positiveInteger(value.id);
  const name = nonEmptyString(value.name);
  const slug = nonEmptyString(value.slug);
  const avatarUrls = isRecord(value.avatar_urls)
    ? value.avatar_urls
    : {};

  if (id === null || name === null || slug === null) {
    return null;
  }

  return {
    id,
    name,
    slug,
    description: nonEmptyString(value.description) ?? undefined,
    url: nonEmptyString(value.url) ?? undefined,
    avatar:
      nullableString(value.avatar) ??
      nullableString(avatarUrls['96']) ??
      nullableString(avatarUrls['48']) ??
      nullableString(avatarUrls['24']),
  };
}

function normalizeTerm(value: unknown): WPTerm | null {
  if (!isRecord(value)) return null;

  const id = positiveInteger(value.id);
  const name = nonEmptyString(value.name);
  const slug = nonEmptyString(value.slug);

  return id !== null && name !== null && slug !== null
    ? { id, name, slug }
    : null;
}

function normalizeTerms(value: unknown): WPTerm[] {
  if (!Array.isArray(value)) return [];

  const terms: WPTerm[] = [];

  for (const item of value) {
    const term = normalizeTerm(item);
    if (term) terms.push(term);
  }

  return terms;
}

function normalizeIngredientGroups(value: unknown): IngredientGroup[] {
  if (!Array.isArray(value)) return [];

  const groups: IngredientGroup[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    groups.push({
      name: typeof item.name === 'string' ? item.name : '',
      items: stringArray(item.items),
    });
  }

  return groups;
}

function normalizeInstructions(value: unknown): InstructionStep[] {
  if (!Array.isArray(value)) return [];

  const instructions: InstructionStep[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    const position = positiveInteger(item.position);
    const text = nonEmptyString(item.text);

    if (position !== null && text !== null) {
      instructions.push({ position, text });
    }
  }

  return instructions;
}

function normalizeNutrition(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return { ...value };
}

function normalizeRecipe(value: unknown): CookeTricksData['recipe'] {
  const recipe = isRecord(value) ? value : {};
  const difficulty =
    recipe.difficulty === 'easy' ||
    recipe.difficulty === 'medium' ||
    recipe.difficulty === 'hard'
      ? recipe.difficulty
      : null;

  return {
    difficulty,
    prepTime: finiteNumber(recipe.prepTime),
    cookTime: finiteNumber(recipe.cookTime),
    additionalTime: finiteNumber(recipe.additionalTime),
    totalTime: finiteNumber(recipe.totalTime),
    servings: finiteNumber(recipe.servings),
    yield: nullableString(recipe.yield),
    ingredientGroups: normalizeIngredientGroups(recipe.ingredientGroups),
    ingredients: stringArray(recipe.ingredients),
    instructions: normalizeInstructions(recipe.instructions),
    equipment: stringArray(recipe.equipment),
    substitutions: stringArray(recipe.substitutions),
    storageNotes: nullableString(recipe.storageNotes),
    safetyNotes: nullableString(recipe.safetyNotes),
    testedDate: nullableString(recipe.testedDate),
    testedBy: nullableString(recipe.testedBy),
    testNotes: nullableString(recipe.testNotes),
    nutrition: normalizeNutrition(recipe.nutrition),
    nutritionVerified: recipe.nutritionVerified === true,
  };
}

function normalizeCookeTricksData(value: unknown): CookeTricksData {
  const data = isRecord(value) ? value : {};
  const taxonomies = isRecord(data.taxonomies)
    ? data.taxonomies
    : {};
  const transparency = isRecord(data.transparency)
    ? data.transparency
    : {};
  const seo = isRecord(data.seo) ? data.seo : {};

  return {
    contentType: data.contentType === 'recipe' ? 'recipe' : 'article',
    featuredImage: normalizeImage(data.featuredImage),
    socialImage: normalizeImage(data.socialImage),
    author: normalizeAuthor(data.author),
    taxonomies: {
      categories: normalizeTerms(taxonomies.categories),
      tags: normalizeTerms(taxonomies.tags),
      cuisines: normalizeTerms(taxonomies.cuisines),
      mealTypes: normalizeTerms(taxonomies.mealTypes),
      occasions: normalizeTerms(taxonomies.occasions),
      diets: normalizeTerms(taxonomies.diets),
    },
    recipe: normalizeRecipe(data.recipe),
    transparency: {
      imageCreator: nullableString(transparency.imageCreator),
      imageSource: nullableString(transparency.imageSource),
      aiDisclosure: nullableString(transparency.aiDisclosure),
    },
    seo: {
      title: nullableString(seo.title),
      description: nullableString(seo.description),
      canonicalUrl: nullableString(seo.canonicalUrl),
      focusTopic: nullableString(seo.focusTopic),
      searchIntent: nullableString(seo.searchIntent),
      sources: stringArray(seo.sources),
      informationGain: nullableString(seo.informationGain),
      lastReviewed: nullableString(seo.lastReviewed),
    },
  };
}

function decodeEntities(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function renderedString(value: unknown): string {
  return isRecord(value) && typeof value.rendered === 'string'
    ? value.rendered
    : '';
}

function normalizePost(raw: unknown): BlogPost | null {
  if (!isRecord(raw)) return null;

  const id = positiveInteger(raw.id);
  const slug = nonEmptyString(raw.slug);

  if (id === null || slug === null) return null;

  return {
    id,
    slug,
    status: typeof raw.status === 'string' ? raw.status : '',
    title: decodeEntities(renderedString(raw.title)),
    excerpt: decodeEntities(renderedString(raw.excerpt)),
    contentHtml: renderedString(raw.content),
    publishedAt: typeof raw.date === 'string' ? raw.date : '',
    modifiedAt: typeof raw.modified === 'string' ? raw.modified : '',
    data: normalizeCookeTricksData(raw.cooketricks),
  };
}

function normalizePostList(value: unknown, path: string): BlogPost[] {
  if (!Array.isArray(value)) {
    throw new WordPressError('malformed-response', path);
  }

  const posts: BlogPost[] = [];
  let skipped = 0;

  for (const item of value) {
    const post = normalizePost(item);

    if (post) posts.push(post);
    else skipped += 1;
  }

  if (skipped > 0) {
    const resource = path.split('?', 1)[0] || '/';
    console.warn(
      `[wordpress:malformed-response] Skipped ${skipped} post(s) from ${resource}.`,
    );
  }

  return posts;
}

function authHeader(): string | undefined {
  const user = process.env.WORDPRESS_PREVIEW_USER;
  const password = process.env.WORDPRESS_PREVIEW_PASSWORD;
  return user && password ? `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` : undefined;
}

async function wpFetchWithHeaders(path: string, options: { preview?: boolean; tags?: string[]; revalidate?: number } = {}): Promise<WordPressFetchResult> {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (options.preview) {
    const authorization = authHeader();
    if (!authorization) throw new Error('WordPress preview credentials are not configured.');
    headers.Authorization = authorization;
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    WORDPRESS_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers,
      signal: controller.signal,
      cache: options.preview ? 'no-store' : undefined,
      next: options.preview ? undefined : { revalidate: options.revalidate ?? 300, tags: options.tags ?? ['blog-index'] },
    });

    if (!response.ok) {
      throw new WordPressError('http', path, {
        status: response.status,
      });
    }

    try {
      return {
        value: await response.json() as unknown,
        headers: response.headers,
      };
    } catch {
      if (controller.signal.aborted) {
        throw new WordPressError('timeout', path);
      }

      throw new WordPressError('invalid-json', path);
    }
  } catch (error) {
    if (error instanceof WordPressError) throw error;

    if (controller.signal.aborted) {
      throw new WordPressError('timeout', path);
    }

    throw new WordPressError('network', path);
  } finally {
    clearTimeout(timeout);
  }
}

async function wpFetch(path: string, options: { preview?: boolean; tags?: string[]; revalidate?: number } = {}): Promise<unknown> {
  return (await wpFetchWithHeaders(path, options)).value;
}

function paginationTotal(
  headers: Headers,
  name: 'X-WP-Total' | 'X-WP-TotalPages',
  path: string,
): number {
  const rawValue = headers.get(name)?.trim();

  if (!rawValue || !/^\d+$/.test(rawValue)) {
    throw new WordPressError('malformed-response', path);
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value)) {
    throw new WordPressError('malformed-response', path);
  }

  return value;
}

async function termId(restBase: 'categories' | 'tags' | 'cuisine' | 'meal-type' | 'occasion' | 'diet', slug: string): Promise<number | null> {
  const path = `/${restBase}?slug=${encodeURIComponent(slug)}&per_page=1`;
  const value = await wpFetch(path, { tags: [`term:${restBase}:${slug}`], revalidate: 3600 });

  if (!Array.isArray(value)) {
    throw new WordPressError('malformed-response', path);
  }

  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = positiveInteger(item.id);
    if (id !== null) return id;
  }

  return null;
}

export async function getPaginatedPosts(filters: PostFilters = {}): Promise<PostListResult> {
  return getPaginatedPostsInternal(filters);
}

async function getPaginatedPostsInternal(filters: InternalPostFilters = {}): Promise<PostListResult> {
  const currentPage = clampedPositiveInteger(filters.page, 1);
  const perPage = clampedPositiveInteger(filters.perPage, 24, 100);
  const params = new URLSearchParams({ context: 'view', per_page: String(perPage), page: String(currentPage), orderby: 'date', order: 'desc' });
  if (filters.search) params.set('search', filters.search);
  if (filters.category) { const id = await termId('categories', filters.category); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('categories', String(id)); }
  if (filters.tag) { const id = await termId('tags', filters.tag); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('tags', String(id)); }
  if (filters.cuisine) { const id = await termId('cuisine', filters.cuisine); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('cuisine', String(id)); }
  if (filters.mealType) { const id = await termId('meal-type', filters.mealType); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('meal-type', String(id)); }
  if (filters.occasion) { const id = await termId('occasion', filters.occasion); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('occasion', String(id)); }
  if (filters.diet) { const id = await termId('diet', filters.diet); if (!id) return { posts: [], currentPage, totalResults: 0, totalPages: 0 }; params.set('diet', String(id)); }
  if (filters.authorId) params.set('author', String(filters.authorId));
  const path = `/posts?${params.toString()}`;
  const { value, headers } = await wpFetchWithHeaders(path, { tags: ['blog-index'], revalidate: 300 });

  return {
    posts: normalizePostList(value, path),
    currentPage,
    totalResults: paginationTotal(headers, 'X-WP-Total', path),
    totalPages: paginationTotal(headers, 'X-WP-TotalPages', path),
  };
}

export async function getPosts(filters: PostFilters = {}): Promise<BlogPost[]> {
  return (await getPaginatedPosts(filters)).posts;
}

export async function getAuthorBySlug(slug: string): Promise<WPAuthor | null> {
  const params = new URLSearchParams({
    slug,
    per_page: '1',
    context: 'view',
  });
  const path = `/users?${params.toString()}`;
  const value = await wpFetch(path, {
    tags: ['blog-index'],
    revalidate: 300,
  });

  if (!Array.isArray(value)) {
    throw new WordPressError('malformed-response', path);
  }

  for (const item of value) {
    const author = normalizeAuthor(item);
    if (author) return author;
  }

  if (value.length > 0) {
    throw new WordPressError('malformed-response', path);
  }

  return null;
}

export async function getPostBySlug(slug: string, preview = false): Promise<BlogPost | null> {
  const params = new URLSearchParams({ slug, per_page: '1', context: preview ? 'edit' : 'view' });
  if (preview) params.set('status', 'draft,pending,future,publish,private');
  const path = `/posts?${params.toString()}`;
  const value = await wpFetch(path, { preview, tags: ['post', `post:${slug}`], revalidate: 300 });
  return normalizePostList(value, path)[0] ?? null;
}

export async function getPreviewPostById(id: number): Promise<BlogPost | null> {
  try {
    const path = `/posts/${id}?context=edit`;
    const post = normalizePost(await wpFetch(path, { preview: true }));
    if (!post) throw new WordPressError('malformed-response', path);
    return post;
  }
  catch { return null; }
}

async function getAllPostPages(filters: InternalPostFilters = {}): Promise<BlogPost[]> {
  const firstPage = await getPaginatedPostsInternal({ ...filters, perPage: 100, page: 1 });
  const posts = [...firstPage.posts];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    try {
      const result = await getPaginatedPostsInternal({ ...filters, perPage: 100, page });
      posts.push(...result.posts);
    } catch {
      throw new WordPressError('incomplete-fetch', '/posts', {
        failedPage: page,
      });
    }
  }

  return posts;
}

export async function getPostsByAuthor(authorId: number): Promise<BlogPost[]> {
  const id = positiveInteger(authorId);
  if (id === null) return [];
  return getAllPostPages({ authorId: id });
}

export async function getAllPosts(): Promise<BlogPost[]> {
  return getAllPostPages();
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
