/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Retry Utility
 * ──────────────────────────────────────────────────────────────────────────────
 * Generic retry wrapper with exponential backoff + jitter.
 * Used by every network operation in the pipeline (LLM calls, image gen,
 * Sanity uploads) to gracefully handle transient failures.
 */

import { logger } from './logger';
import { config } from './config';

export interface RetryOptions {
  /** Human-readable label for log messages */
  label: string;
  /** Number of retry attempts (defaults to config.pipeline.maxRetries) */
  maxRetries?: number;
  /** Base delay in ms (defaults to config.pipeline.retryBaseDelayMs) */
  baseDelayMs?: number;
}

/**
 * Executes `fn` with exponential backoff retries.
 * Delay formula: baseDelay * 2^attempt + random jitter (0-500ms)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const maxRetries = options.maxRetries ?? config.pipeline.maxRetries;
  const baseDelay = options.baseDelayMs ?? config.pipeline.retryBaseDelayMs;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxRetries) {
        logger.error('Retry', `${options.label} failed after ${maxRetries + 1} attempts`, lastError.message);
        break;
      }

      const jitter = Math.random() * 500;
      const delay = baseDelay * Math.pow(2, attempt) + jitter;

      logger.warn(
        'Retry',
        `${options.label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms…`,
        lastError.message
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/** Promise-based sleep */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
