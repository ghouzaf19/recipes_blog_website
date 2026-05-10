#!/usr/bin/env npx tsx
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CookeTricks — AI Blog Generation Pipeline
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Fully autonomous blog post generator powered by Google Gemini.
 * Generates a complete, SEO-optimized recipe blog post every run:
 *
 *   1. Queries Sanity for existing slugs (deduplication)
 *   2. Asks Gemini 2.0 Flash to write a full recipe post (JSON output)
 *   3. Generates a professional cover image via Imagen 3
 *   4. Uploads the image to Sanity's Asset pipeline
 *   5. Converts the markdown body to Portable Text blocks
 *   6. Publishes the complete document to Sanity CMS
 *
 * Usage:
 *   npx tsx scripts/generate-blog.ts           # Generate one post
 *   npx tsx scripts/generate-blog.ts --dry-run  # Preview without publishing
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { config } from './lib/config';
import { logger } from './lib/logger';
import { sleep } from './lib/retry';
import { generateText, generateImage } from './lib/gemini';
import { markdownToPortableText } from './lib/markdown-to-portable-text';
import {
  SYSTEM_PROMPT,
  buildContentPrompt,
  buildPart2Prompt,
  enhanceImagePrompt,
  VALID_CUISINES,
  VALID_DIFFICULTIES,
} from './lib/prompts';
import {
  getExistingSlugs,
  getOrCreateAuthor,
  getOrCreateCategory,
  uploadImage,
  createPost,
  type SanityPostDocument,
} from './lib/sanity-writer';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape of the JSON object returned by the LLM */
interface LLMBlogOutput {
  title: string;
  slug: string;
  excerpt: string;
  categoryTitle: string;
  cuisine: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: string[];
  body: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  imagePrompt: string;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validates the LLM output against schema constraints.
 * Throws with a clear message if any field is invalid.
 */
function validateLLMOutput(data: LLMBlogOutput, existingSlugs: string[]): void {
  const errors: string[] = [];

  if (!data.title || data.title.length < 10 || data.title.length > 80) {
    errors.push(`title must be 10-80 chars (got ${data.title?.length ?? 0})`);
  }
  if (!data.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
    errors.push(`slug must be kebab-case (got "${data.slug}")`);
  }
  if (existingSlugs.includes(data.slug)) {
    errors.push(`slug "${data.slug}" already exists — duplicate detected`);
  }
  if (!data.excerpt || data.excerpt.length > 300) {
    errors.push(`excerpt must be ≤300 chars (got ${data.excerpt?.length ?? 0})`);
  }
  if (!data.body || data.body.length < 500) {
    errors.push(`body seems too short (${data.body?.length ?? 0} chars, expected 1200+ words)`);
  }
  if (!data.ingredients || data.ingredients.length < 3) {
    errors.push(`ingredients must have at least 3 items (got ${data.ingredients?.length ?? 0})`);
  }
  if (!data.seo?.metaTitle || data.seo.metaTitle.length > 60) {
    errors.push(`seo.metaTitle must be ≤60 chars (got ${data.seo?.metaTitle?.length ?? 0})`);
  }
  if (!data.seo?.metaDescription || data.seo.metaDescription.length > 160) {
    errors.push(`seo.metaDescription must be ≤160 chars (got ${data.seo?.metaDescription?.length ?? 0})`);
  }
  if (data.prepTime == null || data.prepTime < 0 || data.prepTime > 1440) {
    errors.push(`prepTime must be 0-1440 (got ${data.prepTime})`);
  }
  if (data.cookTime == null || data.cookTime < 0 || data.cookTime > 1440) {
    errors.push(`cookTime must be 0-1440 (got ${data.cookTime})`);
  }
  if (data.servings == null || data.servings < 1 || data.servings > 100) {
    errors.push(`servings must be 1-100 (got ${data.servings})`);
  }
  if (!data.imagePrompt) {
    errors.push('imagePrompt is missing');
  }

  if (errors.length > 0) {
    throw new Error(
      `LLM output validation failed:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`
    );
  }
}

/**
 * Coerces LLM string values to match Sanity schema enums.
 * Falls back to safe defaults if the AI returns an unexpected value.
 */
function coerceLLMOutput(data: LLMBlogOutput): LLMBlogOutput {
  // Normalize cuisine to match schema enum
  const normalizedCuisine = VALID_CUISINES.find(
    (c) => c.toLowerCase() === data.cuisine?.toLowerCase()
  );
  data.cuisine = normalizedCuisine ?? 'Other';

  // Normalize difficulty
  const normalizedDifficulty = VALID_DIFFICULTIES.find(
    (d) => d === data.difficulty?.toLowerCase()
  );
  data.difficulty = normalizedDifficulty ?? 'medium';

  // Ensure slug is clean
  data.slug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/(^-|-$)/g, '');

  return data;
}

// ─── CLI Flags ──────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');

// ─── Main Pipeline ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🍳 CookeTricks — AI Blog Generation Pipeline          ║');
  console.log('║     Powered by Groq (LLaMA 3) + Pollinations AI         ║');
  console.log(`║     Mode: ${isDryRun ? '🧪 DRY RUN (no publish)' : '🚀 LIVE (will publish)'}${''.padEnd(isDryRun ? 12 : 11)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Step 1: Deduplication ──────────────────────────────────────────────
  logger.step(1, 'Checking existing posts for deduplication');

  const existingSlugs = await getExistingSlugs();
  logger.info('Dedup', `Found ${existingSlugs.length} existing posts in Sanity`);

  // ── Step 2: Content generation (Part 1) ─────────────────────────────────
  logger.step(2, 'Generating blog content (Part 1) with Groq (LLaMA 3)');

  const prompt = buildContentPrompt(existingSlugs);
  let blogData = await generateText<LLMBlogOutput>(prompt, SYSTEM_PROMPT);

  // Coerce
  blogData = coerceLLMOutput(blogData);

  logger.info('Groq', 'Part 1 output generated:', {
    title: blogData.title,
    part1BodyLength: `${blogData.body.length} chars`,
  });

  // ── Step 2.5: Content generation (Part 2) ───────────────────────────────
  logger.step(2.5, 'Generating blog content (Part 2) to create a massive article');
  
  const promptPart2 = buildPart2Prompt(blogData.title, blogData.body);
  const part2Data = await generateText<{ part2Body: string }>(promptPart2, SYSTEM_PROMPT);

  // Combine the bodies
  blogData.body = blogData.body + "\n\n" + part2Data.part2Body;

  logger.info('Groq', 'Combined raw output summary:', {
    title: blogData.title,
    slug: blogData.slug,
    cuisine: blogData.cuisine,
    difficulty: blogData.difficulty,
    totalBodyLength: `${blogData.body.length} chars`,
    ingredients: `${blogData.ingredients.length} items`,
    seoTitle: blogData.seo.metaTitle,
  });

  validateLLMOutput(blogData, existingSlugs);
  logger.success('Validate', 'All fields passed schema validation ✓');

  // ── Step 3: Image generation ───────────────────────────────────────────
  logger.step(3, 'Generating cover image with Pollinations AI');

  const imagePrompt = enhanceImagePrompt(blogData.imagePrompt);
  const generatedImage = await generateImage(imagePrompt);

  // Allow the API to settle before proceeding
  logger.info('Imagen', `Waiting ${config.pipeline.postImageDelayMs}ms for API to settle…`);
  await sleep(config.pipeline.postImageDelayMs);

  if (isDryRun) {
    logger.step(4, 'Dry run — Skipping publish');
    logger.info('DryRun', 'Generated blog post preview:', {
      title: blogData.title,
      slug: blogData.slug,
      excerpt: blogData.excerpt,
      cuisine: blogData.cuisine,
      difficulty: blogData.difficulty,
      prepTime: `${blogData.prepTime} min`,
      cookTime: `${blogData.cookTime} min`,
      servings: blogData.servings,
      ingredientsCount: blogData.ingredients.length,
      bodyWordCount: blogData.body.split(/\s+/).length,
      seo: blogData.seo,
      imageSize: `${(generatedImage.buffer.length / 1024).toFixed(1)} KB`,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.success('DryRun', `Pipeline completed in ${elapsed}s (no post published)`);
    return;
  }

  // ── Step 4: Upload image to Sanity ─────────────────────────────────────
  logger.step(4, 'Uploading image to Sanity');

  const imageFilename = `${blogData.slug}-cover.jpg`;
  const imageRef = await uploadImage(generatedImage.buffer, imageFilename);

  // ── Step 5: Resolve references ─────────────────────────────────────────
  logger.step(5, 'Resolving author & category references');

  const authorRef = await getOrCreateAuthor('AI Chef');
  const categoryRef = await getOrCreateCategory(blogData.categoryTitle);

  // ── Step 6: Convert body & materialize inline images ─────────────────
  logger.step(6, 'Converting markdown to Portable Text & materializing inline images');

  const portableTextBody = markdownToPortableText(blogData.body);
  logger.info('Converter', `Generated ${portableTextBody.length} Portable Text blocks`);

  // Download external images from Pollinations and upload them to Sanity
  // so they load instantly from CDN instead of slow dynamic generation
  let inlineImageCount = 0;
  for (let i = 0; i < portableTextBody.length; i++) {
    const block = portableTextBody[i] as any;
    if (block._type === 'externalImage' && block.url) {
      inlineImageCount++;
      
      // Wait between image downloads to avoid Pollinations rate limiting (429)
      if (inlineImageCount > 1) {
        logger.info('Inline Image', `Waiting 5s before next image to avoid rate limiting…`);
        await sleep(5000);
      }
      
      logger.info('Inline Image', `Downloading image ${inlineImageCount}: ${block.url.slice(0, 80)}…`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout — Pollinations generates on-the-fly
        const imgResponse = await fetch(block.url, { signal: controller.signal, redirect: 'follow' });
        clearTimeout(timeout);

        if (imgResponse.ok) {
          const contentType = imgResponse.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
            if (imgBuffer.length > 5000) {
              const imgFilename = `${blogData.slug}-inline-${inlineImageCount}.jpg`;
              const imgRef = await uploadImage(imgBuffer, imgFilename);
              // Replace the externalImage block with a proper Sanity image block
              (portableTextBody as any)[i] = {
                _type: 'image',
                _key: block._key,
                asset: imgRef.asset,
                alt: block.alt || `${blogData.title} - inline image ${inlineImageCount}`,
              };
              logger.success('Inline Image', `Image ${inlineImageCount} uploaded to Sanity (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
            } else {
              logger.warn('Inline Image', `Image ${inlineImageCount} too small (${imgBuffer.length} bytes), removing block`);
              (portableTextBody as any)[i] = null;
            }
          } else {
            logger.warn('Inline Image', `Image ${inlineImageCount} returned non-image content-type: ${contentType}, removing block`);
            (portableTextBody as any)[i] = null;
          }
        } else {
          logger.warn('Inline Image', `Image ${inlineImageCount} download failed: ${imgResponse.status}, removing block`);
          (portableTextBody as any)[i] = null;
        }
      } catch (err) {
        logger.warn('Inline Image', `Image ${inlineImageCount} failed to download, removing block: ${(err as Error).message}`);
        (portableTextBody as any)[i] = null;
      }
    }
  }
  
  // Filter out any blocks that were nullified due to image download failures
  const finalPortableTextBody = portableTextBody.filter(Boolean);

  if (inlineImageCount > 0) {
    logger.success('Inline Image', `Processed ${inlineImageCount} inline images`);
  }

  const document: SanityPostDocument = {
    _type: 'post',
    title: blogData.title,
    slug: { current: blogData.slug, _type: 'slug' },
    excerpt: blogData.excerpt,
    author: authorRef,
    category: categoryRef,
    mainImage: {
      ...imageRef,
      alt: `${blogData.title} - CookeTricks recipe photo`,
    },
    publishedAt: new Date().toISOString(),
    body: finalPortableTextBody,
    cuisine: blogData.cuisine,
    difficulty: blogData.difficulty as 'easy' | 'medium' | 'hard',
    prepTime: blogData.prepTime,
    cookTime: blogData.cookTime,
    servings: blogData.servings,
    ingredients: blogData.ingredients,
    seo: {
      metaTitle: blogData.seo.metaTitle,
      metaDescription: blogData.seo.metaDescription,
      canonicalUrl: `${config.siteUrl}/blog/${blogData.slug}`,
      shareImage: imageRef,
    },
  };

  const postId = await createPost(document);

  // ── Done ───────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🎉 Blog post published successfully!                   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  📝 Title: ${blogData.title.slice(0, 44).padEnd(44)} ║`);
  console.log(`║  🔗 Slug:  ${blogData.slug.slice(0, 44).padEnd(44)} ║`);
  console.log(`║  🆔 ID:    ${postId.slice(0, 44).padEnd(44)} ║`);
  console.log(`║  ⏱️  Time:  ${(elapsed + 's').padEnd(44)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

// ─── Entry Point ────────────────────────────────────────────────────────────

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    logger.error('Pipeline', 'Fatal error — pipeline aborted', err.message);
    console.error(err.stack);
    process.exit(1);
  });
