import { DEFAULT_TOXICITY_QUESTIONS } from "./schema.ts";
import {
  estimateCostUsd,
  resolveDefaultSystem1Model,
  type System1ModelConfig,
  type System1ModelPricing,
} from "./models.ts";
import type {
  JevAnswer,
  JevQuestion,
  JevResponse,
  ModerationAction,
  ModerationThresholds,
  SeverityLevel,
  ToxicityScreenResult,
} from "./types.ts";

export interface ScreenOptions {
  thresholds?: ModerationThresholds;
  /** Overrides the Jev question schema for this call only. Answer keys must match the schema (see {@link DEFAULT_TOXICITY_QUESTIONS}). */
  questions?: Record<string, JevQuestion>;
}

export interface ToxScreenerOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  /** Custom System 1 model configuration. */
  system1?: System1ModelConfig;
  timeoutMs?: number;
  /** Retries for transient HTTP errors after initial failure. Defaults to 2. */
  retries?: number;
  thresholds?: ModerationThresholds;
  questions?: Record<string, JevQuestion>;
}

/** @deprecated Use {@link ToxScreenerOptions} instead. */
export type JevClientOptions = ToxScreenerOptions;

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504, 524, 529]);

class JevHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "JevHttpError";
  }
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof JevHttpError) {
    return RETRYABLE_STATUS_CODES.has(err.status);
  }
  return true;
}

export class ToxScreener {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private pricing?: System1ModelPricing;
  private timeoutMs: number;
  private retries: number;
  private questions: Record<string, JevQuestion>;
  private thresholds?: ModerationThresholds;
  private readonly hasCustomBaseUrl: boolean;
  private readonly hasCustomModel: boolean;
  private readonly hasCustomSystem1: boolean;

  constructor(opts: ToxScreenerOptions = {}) {
    this.apiKey =
      opts.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.TYPESAFE_API_KEY ||
      process.env.JEV_KEY ||
      "";

    this.hasCustomBaseUrl = Boolean(opts.baseUrl);
    this.hasCustomModel = Boolean(opts.model);
    this.hasCustomSystem1 = Boolean(opts.system1);

    const activeModel = opts.system1 ?? resolveDefaultSystem1Model(this.apiKey);
    this.baseUrl = opts.baseUrl || activeModel.baseUrl;
    this.model = opts.model || activeModel.model;
    this.pricing = activeModel.pricing;

    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.retries = Number.isFinite(opts.retries)
      ? Math.max(0, Math.floor(opts.retries as number))
      : 2;
    this.questions = opts.questions || DEFAULT_TOXICITY_QUESTIONS;
    this.thresholds = opts.thresholds;
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    if (this.hasCustomSystem1) return;

    const resolved = resolveDefaultSystem1Model(this.apiKey);
    if (!this.hasCustomBaseUrl) {
      this.baseUrl = resolved.baseUrl;
    }
    if (!this.hasCustomModel) {
      this.model = resolved.model;
    }
    this.pricing = resolved.pricing;
  }

  public getModelName(): string {
    return this.model;
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public async screen(
    text: string,
    options?: ScreenOptions,
  ): Promise<ToxicityScreenResult> {
    const thresholds: Required<ModerationThresholds> = {
      review: options?.thresholds?.review ?? this.thresholds?.review ?? 0.35,
      censor: options?.thresholds?.censor ?? this.thresholds?.censor ?? 0.6,
      ban: options?.thresholds?.ban ?? this.thresholds?.ban ?? 0.75,
    };

    const trimmed = text.trim();
    if (!trimmed) {
      return {
        text: "",
        isProfane: false,
        isToxic: false,
        isProfaneProb: 0,
        isToxicProb: 0,
        severity: "NONE",
        severityScore: 0,
        severityLabel: "Clean",
        language: "english",
        languageConfidence: 1,
        obfuscationType: "none",
        obfuscationTypes: ["none"],
        action: "ALLOW",
        gated: true,
        latencyMs: 0,
        source: "mock-heuristic",
        rawAnswers: {},
        costUsd: 0,
      };
    }

    if (!this.hasApiKey()) {
      throw new Error(
        "gg-friggin-ez: Jev API key not configured. Set OPENROUTER_API_KEY, TYPESAFE_API_KEY, or pass { apiKey: '...' } to createScreener()",
      );
    }

    const startTime = performance.now();
    const result = await this.askJev(trimmed, options?.questions ?? this.questions);
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

    return this.parseJevDecision(trimmed, result, latencyMs, thresholds);
  }

  private async askJev(
    state: string,
    questions: Record<string, JevQuestion>,
  ): Promise<JevResponse> {
    const authHeader = this.apiKey.startsWith("Bearer ")
      ? this.apiKey
      : `Bearer ${this.apiKey}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: authHeader,
    };

    if (this.baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://github.com/itisshikhar/gg-friggin-ez";
      headers["X-Title"] = "gg-friggin-ez";
    }

    const body = JSON.stringify({
      model: this.model,
      state,
      questions,
    });

    const maxAttempts = this.retries + 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new JevHttpError(
            response.status,
            `Jev HTTP ${response.status}: ${errText.slice(0, 300)}`,
          );
        }

        const data = (await response.json()) as JevResponse;
        if (!data.answers) {
          throw new Error("Jev response missing answers object");
        }
        return data;
      } catch (err) {
        lastError = err;
        const isLastAttempt = attempt === maxAttempts - 1;
        if (isLastAttempt || !isRetryableError(err)) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }

    // Unreachable: the loop above always returns or throws.
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
    const toxicAns = answers["is_toxic"];
    const isToxicProb =
      toxicAns && "noul" in toxicAns && typeof toxicAns.noul === "number"
        ? Number(toxicAns.noul.toFixed(3))
        : 0;

    // 2. Profanity probability
    const profaneAns = answers["is_profane"] || answers["contains_profanity"];
    const isProfaneProb =
      profaneAns && "noul" in profaneAns && typeof profaneAns.noul === "number"
        ? Number(profaneAns.noul.toFixed(3))
        : 0;

    // 3. Severity
    const severityAns = answers["severity"];
    const maxHarmProb = Math.max(isToxicProb, isProfaneProb);
    const severityScore =
      severityAns &&
      "score" in severityAns &&
      typeof severityAns.score === "number"
        ? Number(severityAns.score.toFixed(2))
        : maxHarmProb * 2;

    let severity: SeverityLevel = "NONE";
    let severityLabel = "None / Clean";
    if (severityScore >= 1.35) {
      severity = "SEVERE";
      severityLabel = "Severe";
    } else if (severityScore >= 0.5) {
      severity = "MILD";
      severityLabel = "Mild";
    }

    // 4. Language
    const langAns = answers["language_guess"];
    const language =
      langAns && "choice" in langAns ? String(langAns.choice) : "other";
    const languageConfidence =
      langAns &&
      "confidence" in langAns &&
      typeof langAns.confidence === "number"
        ? Number(langAns.confidence.toFixed(2))
        : 0.8;

    // 5. Obfuscation
    const obfAns = answers["obfuscation_type"];
    const { primary: obfuscationType, all: obfuscationTypes } =
      this.extractObfuscationTypes(obfAns);

    // 6. Distinct Boolean classifications
    const isProfane = isProfaneProb >= 0.55;
    const isToxic = isToxicProb >= 0.55;

    const gated =
      languageConfidence >= 0.65 && (maxHarmProb >= 0.7 || maxHarmProb <= 0.3);

    let action: ModerationAction = "ALLOW";
    if (maxHarmProb >= thresholds.ban && severityScore >= 1.3) {
      action = "AUTO_BAN";
    } else if (maxHarmProb >= thresholds.censor) {
      action = "AUTO_CENSOR";
    } else if (
      maxHarmProb >= thresholds.review ||
      (!gated && maxHarmProb >= 0.25)
    ) {
      action = "SUSPICIOUS_REVIEW";
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
      source: "jev-api",
      rawAnswers: answers,
      costUsd: estimateCostUsd(jevResp.usage, this.pricing),
    };
  }

  private extractObfuscationTypes(obfAns: JevAnswer | undefined): {
    primary: string;
    all: string[];
  } {
    const types = new Set<string>();

    const primaryChoice =
      obfAns && "choice" in obfAns ? String(obfAns.choice) : "none";

    if (obfAns && "probabilities" in obfAns && obfAns.probabilities) {
      for (const [key, prob] of Object.entries(obfAns.probabilities)) {
        if (key !== "none" && typeof prob === "number" && prob >= 0.04) {
          types.add(key);
        }
      }
      if (types.size === 0 && primaryChoice !== "none") {
        types.add(primaryChoice);
      }
      if (types.size === 0) {
        types.add("none");
      }
      return {
        primary: primaryChoice,
        all: Array.from(types),
      };
    }

    if (primaryChoice && primaryChoice !== "none") {
      return {
        primary: primaryChoice,
        all: [primaryChoice],
      };
    }

    return {
      primary: "none",
      all: ["none"],
    };
  }
}
