/**
 * gg-friggin-ez — drop-in, obfuscation-proof profanity & toxicity screener
 * for Node.js, powered by TypeSafe AI Jev.
 *
 * Works out of the box on any language or script. Features built-in
 * evasion and code-mixing rules specifically tuned for challenging
 * transliterated text that classic keyword/regex filters miss.
 *
 * @example Simplest usage
 * ```ts
 * import { isProfane } from 'gg-friggin-ez';
 *
 * // reads OPENROUTER_API_KEY / TYPESAFE_API_KEY from env, or call configure()
 * const bad = await isProfane('you are absolute dog sh1t');
 * ```
 *
 * @example Full detail + a custom API key
 * ```ts
 * import { createScreener } from 'gg-friggin-ez';
 *
 * const screener = createScreener({ apiKey: 'sk-or-...' });
 * const result = await screener.screen('some text');
 * console.log(result.isProfane, result.severity, result.action);
 * ```
 */
import { ToxScreener } from './jev/client.ts';
import type { ToxScreenerOptions, ScreenOptions } from './jev/client.ts';
import type { ToxicityScreenResult } from './jev/types.ts';

export * from './jev/types.ts';
export * from './jev/schema.ts';
export { ToxScreener } from './jev/client.ts';
export type { ToxScreenerOptions, JevClientOptions, ScreenOptions } from './jev/client.ts';
export { legacyKeywordFilter } from './jev/legacyFilter.ts';

let defaultScreener: ToxScreener | undefined;

function getDefaultScreener(): ToxScreener {
  if (!defaultScreener) defaultScreener = new ToxScreener();
  return defaultScreener;
}

/**
 * Configure the shared default screener used by `isProfane()` and `screen()`.
 * Call this once at startup, or just set the `OPENROUTER_API_KEY` (or
 * `TYPESAFE_API_KEY`) environment variable instead.
 */
export function configure(opts: ToxScreenerOptions): void {
  defaultScreener = new ToxScreener(opts);
}

/**
 * Create an independent screener instance — useful for per-tenant API keys,
 * custom language/domain schemas (via `questions`), or isolated configuration.
 */
export function createScreener(opts?: ToxScreenerOptions): ToxScreener {
  return new ToxScreener(opts);
}

/**
 * Full screening result: profanity probability, severity enum & score,
 * detected language, evasion techniques, and a recommended moderation action.
 */
export async function screen(
  text: string,
  options?: ScreenOptions,
): Promise<ToxicityScreenResult> {
  return getDefaultScreener().screen(text, options);
}

/**
 * Convenience check — resolves `true` if the text contains explicit
 * profanity, swear words, vulgar slang, or slurs.
 *
 * ```ts
 * const bad = await isProfane("you are absolute dog sh1t");
 * ```
 */
export async function isProfane(text: string, options?: ScreenOptions): Promise<boolean> {
  const result = await screen(text, options);
  return result.isProfane;
}

/**
 * Convenience check — resolves `true` if the text contains hostile,
 * insulting, or harassing behavior directed at a person (even without profanity).
 *
 * ```ts
 * const bad = await isToxic("you are completely brainless and useless");
 * ```
 */
export async function isToxic(text: string, options?: ScreenOptions): Promise<boolean> {
  const result = await screen(text, options);
  return result.isToxic;
}

export default { isProfane, isToxic, screen, configure, createScreener, ToxScreener };
