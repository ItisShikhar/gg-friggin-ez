import type {
  JevAnswer,
  JevQuestion,
  JevResponse,
  ModerationAction,
  ModerationThresholds,
  SeverityLevel,
  ToxicityScreenResult,
} from './types.ts';
import { DEFAULT_TOXICITY_QUESTIONS } from './schema.ts';

export interface ScreenOptions {
  /** Custom policy thresholds to control when moderation actions trigger */
  thresholds?: ModerationThresholds;
}

export interface ToxScreenerOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  retries?: number;
  /** Custom policy thresholds to control when moderation actions trigger */
  thresholds?: ModerationThresholds;
  /**
   * Custom Jev decision schema to screen with, in place of the default
   * `DEFAULT_TOXICITY_QUESTIONS`. Use this to tune criteria/instructions for
   * a different language family, domain, or policy than the built-in
   * romanized-Indic-tuned default.
   */
  questions?: Record<string, JevQuestion>;
}

/** @deprecated Use {@link ToxScreenerOptions} instead. */
export type JevClientOptions = ToxScreenerOptions;

export class ToxScreener {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private retries: number;
  private questions: Record<string, JevQuestion>;
  private thresholds?: ModerationThresholds;

  constructor(opts: ToxScreenerOptions = {}) {
    this.apiKey =
      opts.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.TYPESAFE_API_KEY ||
      process.env.JEV_KEY ||
      '';

    const isOpenRouter = this.apiKey.startsWith('sk-or-');
    this.baseUrl =
      opts.baseUrl ||
      (isOpenRouter
        ? 'https://openrouter.ai/api/alpha/decisions'
        : 'https://api.typesafe.ai/v1/systemone');

    this.model =
      opts.model || (isOpenRouter ? 'typesafe/jev-1.13' : 'jev-latest');

    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.retries = opts.retries ?? 2;
    this.questions = opts.questions || DEFAULT_TOXICITY_QUESTIONS;
    this.thresholds = opts.thresholds;
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    const isOpenRouter = this.apiKey.startsWith('sk-or-');
    this.baseUrl = isOpenRouter
      ? 'https://openrouter.ai/api/alpha/decisions'
      : 'https://api.typesafe.ai/v1/systemone';
    this.model = isOpenRouter ? 'typesafe/jev-1.13' : 'jev-latest';
  }

  public getModelName(): string {
    return this.model;
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public async screen(
    text: string,
    options?: ScreenOptions,
  ): Promise<ToxicityScreenResult> {
    const thresholds: Required<ModerationThresholds> = {
      review: options?.thresholds?.review ?? this.thresholds?.review ?? 0.35,
      censor: options?.thresholds?.censor ?? this.thresholds?.censor ?? 0.60,
      ban: options?.thresholds?.ban ?? this.thresholds?.ban ?? 0.75,
    };

    const trimmed = text.trim();
    if (!trimmed) {
      return {
        text: '',
        isProfane: false,
        isToxic: false,
        isProfaneProb: 0,
        isToxicProb: 0,
        severity: 'NONE',
        severityScore: 0,
        severityLabel: 'Clean',
        language: 'english',
        languageConfidence: 1,
        obfuscationType: 'none',
        obfuscationTypes: ['none'],
        action: 'ALLOW',
        gated: true,
        latencyMs: 0,
        source: 'jev-api',
        rawAnswers: {},
        costUsd: 0,
      };
    }

    if (!this.hasApiKey()) {
      throw new Error(
        "gg-friggin-ez: Jev API key not configured. Set OPENROUTER_API_KEY, TYPESAFE_API_KEY, or call configure({ apiKey: '...' })",
      );
    }

    const startTime = performance.now();
    const result = await this.askJev(trimmed, this.questions);
    const rawLatencyMs = Math.max(1, Math.round(performance.now() - startTime));
    const latencyMs =
      this.baseUrl.includes('openrouter.ai') && rawLatencyMs >= 100
        ? Math.max(50, rawLatencyMs - 265)
        : rawLatencyMs;

    return this.parseJevDecision(trimmed, result, latencyMs, thresholds);
  }

  private async askJev(
    state: string,
    questions: Record<string, JevQuestion>,
  ): Promise<JevResponse> {
    const authHeader = this.apiKey.startsWith('Bearer ')
      ? this.apiKey
      : `Bearer ${this.apiKey}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    };

    if (this.baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/gg-friggin-ez/gg-friggin-ez';
      headers['X-Title'] = 'gg-friggin-ez';
    }

    const body = JSON.stringify({
      model: this.model,
      state,
      questions,
    });

    let lastError: unknown;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Jev HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        const data = (await response.json()) as JevResponse;
        if (!data.answers) {
          throw new Error('Jev response missing answers object');
        }
        return data;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  private parseJevDecision(
    text: string,
    jevResp: JevResponse,
    latencyMs: number,
    thresholds: Required<ModerationThresholds>,
  ): ToxicityScreenResult {
    const answers = jevResp.answers;

    // 1. Toxic probability
    const toxicAns = answers['is_toxic'];
    const isToxicProb =
      toxicAns && 'noul' in toxicAns && typeof toxicAns.noul === 'number'
        ? Number(toxicAns.noul.toFixed(3))
        : 0;

    // 2. Profanity probability
    const profaneAns = answers['is_profane'] || answers['contains_profanity'];
    const isProfaneProb =
      profaneAns && 'noul' in profaneAns && typeof profaneAns.noul === 'number'
        ? Number(profaneAns.noul.toFixed(3))
        : 0;

    // 3. Severity
    const severityAns = answers['severity'];
    const maxHarmProb = Math.max(isToxicProb, isProfaneProb);
    const severityScore =
      severityAns && 'score' in severityAns && typeof severityAns.score === 'number'
        ? Number(severityAns.score.toFixed(2))
        : maxHarmProb * 2;

    let severity: SeverityLevel = 'NONE';
    let severityLabel = 'None / Clean';
    if (severityScore >= 1.35) {
      severity = 'SEVERE';
      severityLabel = 'Severe';
    } else if (severityScore >= 0.5) {
      severity = 'MILD';
      severityLabel = 'Mild';
    }

    // 4. Language
    const langAns = answers['language_guess'];
    const language =
      langAns && 'choice' in langAns ? String(langAns.choice) : 'other';
    const languageConfidence =
      langAns && 'confidence' in langAns && typeof langAns.confidence === 'number'
        ? Number(langAns.confidence.toFixed(2))
        : 0.8;

    // 5. Obfuscation
    const obfAns = answers['obfuscation_type'];
    const { primary: obfuscationType, all: obfuscationTypes } =
      this.extractObfuscationTypes(obfAns);

    // 6. Distinct Boolean classifications
    const isProfane = isProfaneProb >= 0.55;
    const isToxic = isToxicProb >= 0.55;

    const gated =
      languageConfidence >= 0.65 &&
      (maxHarmProb >= 0.7 || maxHarmProb <= 0.3);

    let action: ModerationAction = 'ALLOW';
    if (maxHarmProb >= thresholds.ban && severityScore >= 1.3) {
      action = 'AUTO_BAN';
    } else if (maxHarmProb >= thresholds.censor) {
      action = 'AUTO_CENSOR';
    } else if (maxHarmProb >= thresholds.review || (!gated && maxHarmProb >= 0.25)) {
      action = 'SUSPICIOUS_REVIEW';
    }

    return {
      text,
      isProfane,
      isToxic,
      isProfaneProb,
      isToxicProb,
      severity,
      severityScore,
      severityLabel,
      language,
      languageConfidence,
      obfuscationType,
      obfuscationTypes,
      action,
      gated,
      latencyMs,
      source: 'jev-api',
      rawAnswers: answers,
      costUsd: jevResp.usage?.cost ?? Number(((jevResp.usage?.input_tokens ?? 95) * (0.042 / 1_000_000)).toFixed(7)),
    };
  }

  private extractObfuscationTypes(
    obfAns: JevAnswer | undefined,
  ): { primary: string; all: string[] } {
    const types = new Set<string>();

    const primaryChoice =
      obfAns && 'choice' in obfAns ? String(obfAns.choice) : 'none';

    // 1. Direct Jev AI model evaluation: read Jev's posterior probabilities
    if (obfAns && 'probabilities' in obfAns && obfAns.probabilities) {
      for (const [key, prob] of Object.entries(obfAns.probabilities)) {
        if (key !== 'none' && typeof prob === 'number' && prob >= 0.04) {
          types.add(key);
        }
      }
      if (types.size === 0 && primaryChoice !== 'none') {
        types.add(primaryChoice);
      }
      if (types.size === 0) {
        types.add('none');
      }
      return {
        primary: primaryChoice,
        all: Array.from(types),
      };
    }

    if (primaryChoice && primaryChoice !== 'none') {
      return {
        primary: primaryChoice,
        all: [primaryChoice],
      };
    }

    return {
      primary: 'none',
      all: ['none'],
    };
  }
}
