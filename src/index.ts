import { ToxScreener } from './system1/client.ts';
import type { ToxScreenerOptions, ScreenOptions } from './system1/client.ts';
import type { ToxicityScreenResult } from './system1/types.ts';

export * from './system1/types.ts';
export * from './system1/schema.ts';
export { ToxScreener } from './system1/client.ts';
export type { ToxScreenerOptions, JevClientOptions, ScreenOptions } from './system1/client.ts';
export {
  JEV_TYPESAFE_MODEL,
  JEV_OPENROUTER_MODEL,
  LAYA_LOCAL_MODEL,
  BUNDLED_SYSTEM1_MODELS,
  BUILT_IN_SYSTEM1_MODELS,
  resolveDefaultSystem1Model,
  estimateCostUsd,
} from './system1/models.ts';
export type { System1ModelConfig, System1ModelPricing } from './system1/models.ts';

let defaultScreener: ToxScreener | undefined;

function getDefaultScreener(): ToxScreener {
  if (!defaultScreener) defaultScreener = new ToxScreener();
  return defaultScreener;
}

/** Configures the shared default screener. */
export function configure(opts: ToxScreenerOptions): void {
  defaultScreener = new ToxScreener(opts);
}

/** Creates an independent screener instance. */
export function createScreener(opts?: ToxScreenerOptions): ToxScreener {
  return new ToxScreener(opts);
}

/** Screens text for toxicity, profanity, language, and evasion. */
export async function screen(
  text: string,
  options?: ScreenOptions,
): Promise<ToxicityScreenResult> {
  return getDefaultScreener().screen(text, options);
}

/** Returns true if the text contains explicit profanity or slurs. */
export async function isProfane(text: string, options?: ScreenOptions): Promise<boolean> {
  const result = await screen(text, options);
  return result.isProfane;
}

/** Returns true if the text contains hostile or harassing content. */
export async function isToxic(text: string, options?: ScreenOptions): Promise<boolean> {
  const result = await screen(text, options);
  return result.isToxic;
}

export default { isProfane, isToxic, screen, configure, createScreener, ToxScreener };
