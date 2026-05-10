/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Structured Logger
 * ──────────────────────────────────────────────────────────────────────────────
 * Minimal, zero-dependency structured logger for the generation pipeline.
 * Prefixes every line with a timestamp and severity tag for easy debugging.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';

const ICONS: Record<LogLevel, string> = {
  INFO: '📋',
  WARN: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  DEBUG: '🔍',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  const prefix = `[${timestamp()}] ${ICONS[level]} ${level.padEnd(7)} [${context}]`;
  console.log(`${prefix} ${message}`);
  if (data !== undefined) {
    console.log(`${''.padEnd(35)} └─`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
}

export const logger = {
  info: (ctx: string, msg: string, data?: unknown) => log('INFO', ctx, msg, data),
  warn: (ctx: string, msg: string, data?: unknown) => log('WARN', ctx, msg, data),
  error: (ctx: string, msg: string, data?: unknown) => log('ERROR', ctx, msg, data),
  success: (ctx: string, msg: string, data?: unknown) => log('SUCCESS', ctx, msg, data),
  debug: (ctx: string, msg: string, data?: unknown) => log('DEBUG', ctx, msg, data),

  /** Logs a section divider for pipeline steps */
  step(stepNumber: number, title: string): void {
    console.log('');
    console.log(`${'═'.repeat(60)}`);
    console.log(`  STEP ${stepNumber}: ${title.toUpperCase()}`);
    console.log(`${'═'.repeat(60)}`);
  },
};
