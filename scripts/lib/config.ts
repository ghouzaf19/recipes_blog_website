/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pipeline Configuration
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every environment variable and constant
 * used by the blog generation pipeline. Fails fast with clear error
 * messages if any required value is missing.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root (two levels up from scripts/lib/)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// ─── Validation Helper ──────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[Config] Missing required environment variable: ${key}\n` +
      `  → Add it to .env.local or set it in your CI/CD secrets.`
    );
  }
  return value.trim();
}

// ─── Exported Configuration ─────────────────────────────────────────────────

export const config = {
  // AI Config (Groq for Text, Pollinations for Images)
  ai: {
    groqApiKey: requireEnv('GROQ_API_KEY'),
    textModel: 'llama-3.3-70b-versatile',
  },

  // Sanity CMS
  sanity: {
    projectId: requireEnv('NEXT_PUBLIC_SANITY_PROJECT_ID'),
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-03-01',
    token: requireEnv('SANITY_API_EDITOR'),
  },

  // Site
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cooketricks.com',

  // Pipeline tuning
  pipeline: {
    /** Max retries for any network operation */
    maxRetries: 3,
    /** Base delay between retries in ms (doubles each attempt) */
    retryBaseDelayMs: 2_000,
    /** Timeout for individual LLM calls in ms */
    llmTimeoutMs: 60_000,
    /** Delay after image generation to let APIs settle */
    postImageDelayMs: 1_500,
  },
} as const;
