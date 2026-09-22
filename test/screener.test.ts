import { describe, it, expect } from 'bun:test';
import {
  ToxScreener,
  DEFAULT_TOXICITY_QUESTIONS,
  isProfane,
  isToxic,
  screen,
  createScreener,
  BUNDLED_SYSTEM1_MODELS,
  BUILT_IN_SYSTEM1_MODELS,
  LAYA_LOCAL_MODEL,
  JEV_TYPESAFE_MODEL,
  JEV_OPENROUTER_MODEL,
} from '../src/index.ts';
import { PRESET_COMMENTS } from '../src/demo/presets.ts';
import { evaluateWithOpenAi } from '../src/demo/openaiCompare.ts';

describe('gg-friggin-ez toxicity screener', () => {
  it('exports convenient top-level isProfane and isToxic helpers', async () => {
    const isBad = await isProfane('You are absolute dog sh1t');
    expect(isBad).toBe(true);

    const isToxicSwear = await isToxic('You are absolute dog sh1t');
    expect(isToxicSwear).toBe(true);

    // Non-profane insult: toxic but not profane
    const isCleanSwear = await isProfane('You are completely brainless and useless');
    expect(isCleanSwear).toBe(false);

    const isToxicInsult = await isToxic('You are completely brainless and useless');
    expect(isToxicInsult).toBe(true);

    const isClean = await isProfane('GG WP team, that was an incredible clutch round!');
    expect(isClean).toBe(false);
    expect(await isToxic('GG WP team, that was an incredible clutch round!')).toBe(false);

    const detailed = await screen('You are absolute dog sh1t');
    expect(detailed).toHaveProperty('isProfane');
    expect(detailed).toHaveProperty('isToxic');
    expect(detailed).toHaveProperty('isProfaneProb');
    expect(detailed).toHaveProperty('isToxicProb');
    expect(detailed).toHaveProperty('severity');
    expect(detailed).toHaveProperty('severityScore');
    expect(detailed).toHaveProperty('obfuscationTypes');
    expect(detailed).toHaveProperty('action');
    expect(detailed.isProfane).toBe(true);
    expect(detailed.isToxic).toBe(true);
    expect(['NONE', 'MILD', 'SEVERE']).toContain(detailed.severity);
    expect(Array.isArray(detailed.obfuscationTypes)).toBe(true);
  });

  it('supports configurable policy thresholds in screen()', async () => {
    // With ultra-strict ban threshold (0.4), a moderately toxic message triggers AUTO_BAN
    const strictResult = await screen('Tui ekdom boka shala, tor dara kichu hobe na', {
      thresholds: { ban: 0.4 },
    });
    expect(['AUTO_BAN', 'AUTO_CENSOR', 'SUSPICIOUS_REVIEW']).toContain(strictResult.action);
  });

  it('supports overriding the question schema per call via ScreenOptions', async () => {
    const result = await isProfane('You are absolute dog sh1t', {
      questions: DEFAULT_TOXICITY_QUESTIONS,
    });
    expect(result).toBe(true);
  });

  it('supports creating independent screener instances with custom options', async () => {
    const customScreener = createScreener({
      timeoutMs: 8000,
      retries: 1,
    });
    expect(customScreener).toBeInstanceOf(ToxScreener);
    const res = await customScreener.screen('test clean message');
    expect(res.action).toBe('ALLOW');
  });

  it('has valid Jev schema questions defined without deprecated is_abusive', () => {
    expect(DEFAULT_TOXICITY_QUESTIONS).toHaveProperty('is_toxic');
    expect(DEFAULT_TOXICITY_QUESTIONS).toHaveProperty('is_profane');
    expect(DEFAULT_TOXICITY_QUESTIONS).not.toHaveProperty('is_abusive');
    expect(DEFAULT_TOXICITY_QUESTIONS).toHaveProperty('severity');
    expect(DEFAULT_TOXICITY_QUESTIONS).toHaveProperty('language_guess');
    expect(DEFAULT_TOXICITY_QUESTIONS).toHaveProperty('obfuscation_type');

    expect(DEFAULT_TOXICITY_QUESTIONS.is_toxic.type).toBe('noul');
    expect(DEFAULT_TOXICITY_QUESTIONS.is_profane.type).toBe('noul');
    expect(DEFAULT_TOXICITY_QUESTIONS.severity.type).toBe('score');
    expect(DEFAULT_TOXICITY_QUESTIONS.language_guess.type).toBe('choice');
  });

  it('contains categorized test presets for both Twitch and Valorant', () => {
    expect(PRESET_COMMENTS.length).toBe(46);
    const twitchPresets = PRESET_COMMENTS.filter((p) => p.category === 'twitch' || p.category === 'all');
    const valPresets = PRESET_COMMENTS.filter((p) => p.category === 'valorant' || p.category === 'all');

    expect(twitchPresets.length).toBeGreaterThanOrEqual(14);
    expect(valPresets.length).toBeGreaterThanOrEqual(14);
  });

  it('exports bundled System 1 models including Jev and Laya', () => {
    expect(BUNDLED_SYSTEM1_MODELS.jevTypeSafe).toBe(JEV_TYPESAFE_MODEL);
    expect(BUNDLED_SYSTEM1_MODELS.jevOpenRouter).toBe(JEV_OPENROUTER_MODEL);
    expect(BUNDLED_SYSTEM1_MODELS.layaLocal).toBe(LAYA_LOCAL_MODEL);
    expect(BUILT_IN_SYSTEM1_MODELS).toBe(BUNDLED_SYSTEM1_MODELS);

    expect(LAYA_LOCAL_MODEL.id).toBe('laya-local');
    expect(LAYA_LOCAL_MODEL.model).toBe('convaiinnovations/laya');
    expect(LAYA_LOCAL_MODEL.baseUrl).toBe('http://localhost:8000/v1/decisions');
    expect(LAYA_LOCAL_MODEL.pricing?.inputPerMillionUsd).toBe(0);

    const layaScreener = createScreener({ system1: LAYA_LOCAL_MODEL });
    expect(layaScreener.getModelName()).toBe('convaiinnovations/laya');
  });

  it('handles empty input gracefully', async () => {
    const screener = new ToxScreener();
    const result = await screener.screen('');
    expect(result.action).toBe('ALLOW');
    expect(result.isProfane).toBe(false);
    expect(result.isToxic).toBe(false);
    expect(result.isProfaneProb).toBe(0);
    expect(result.isToxicProb).toBe(0);
  });

  it('throws a clear error if no API key is configured and non-empty text is screened', async () => {
    const screener = createScreener({ apiKey: '' });
    screener.setApiKey('');
    await expect(screener.screen('some message')).rejects.toThrow(
      'gg-friggin-ez: Jev API key not configured',
    );
  });

  it('correctly screens an obfuscated romanized abuse message', async () => {
    const screener = new ToxScreener();
    const result = await screener.screen('Nee oru p00da paithiyakaara da, 5colo nadatha');

    expect(result.isProfane).toBe(true);
    expect(result.isProfaneProb).toBeGreaterThanOrEqual(0.6);
    expect(result.language).toBe('tamil');
    expect(['AUTO_CENSOR', 'AUTO_BAN']).toContain(result.action);
  }, 20000);

  it('correctly leaves friendly banter / trap case unblocked', async () => {
    const screener = new ToxScreener();
    const result = await screener.screen('Dei loosu, enna comedy pandra da, semma pass ah irundhuchu haha');

    expect(result.action).not.toBe('AUTO_BAN');
    // Friendly banter should not be severely abusive
    expect(result.severityScore).toBeLessThan(1.2);
  }, 20000);

  it('always hits the API and does not cache decisions', async () => {
    const screener = new ToxScreener();
    const text = 'Nee oru p00da paithiyakaara da, 5colo nadatha';
    const first = await screener.screen(text);
    const second = await screener.screen(text);

    expect(second.source).not.toBe('fallback-cache');
    expect(second.isProfaneProb).toBeGreaterThanOrEqual(0.6);
    expect(Math.abs(second.isProfaneProb - first.isProfaneProb)).toBeLessThanOrEqual(0.1);
  }, 20000);

  it('evaluates with OpenAI gpt-4o-mini and computes cost and tokens', async () => {
    const res = await evaluateWithOpenAi('p00da dei loose', '');
    expect(res.model).toBe('gpt-4o-mini');
    expect(res.costUsd).toBeGreaterThan(0);
    expect(res.totalTokens).toBeGreaterThan(0);
    expect(res.costPerMillionUsd).toBeGreaterThan(0);
  });
});
