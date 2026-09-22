import { DEFAULT_TOXICITY_QUESTIONS } from "./schema.ts";
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
  /** Custom policy thresholds to control when moderation actions trigger */
  thresholds?: ModerationThresholds;
}

export interface ToxScreenerOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  /**
   * Number of retries to attempt after an initial failed request (so
   * `retries: 2` means up to 3 total attempts). Only transient failures
   * (429, 408, 5xx, network errors, timeouts) are retried; non-transient
   * HTTP errors (4xx other than 408/429) fail immediately. Clamped to a
   * minimum of 0. Defaults to 2.
   */
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

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/alpha/decisions";
const TYPESAFE_BASE_URL = "https://api.typesafe.ai/v1/systemone";
const OPENROUTER_MODEL = "typesafe/jev-1.13";
const TYPESAFE_MODEL = "jev-latest";

/** HTTP statuses considered transient and safe to retry. */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504, 524, 529]);

/** Error raised for non-2xx Jev HTTP responses, carrying the status code so callers/retry logic can distinguish transient failures from permanent ones (e.g. 401/403). */
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
  // Network failures, aborts, and timeouts are transient by nature.
  return true;
}

export class ToxScreener {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private retries: number;
  private questions: Record<string, JevQuestion>;
  private thresholds?: ModerationThresholds;
  /** Tracks whether baseUrl/model were explicitly provided so setApiKey() doesn't clobber them. */
  private readonly hasCustomBaseUrl: boolean;
  private readonly hasCustomModel: boolean;

  constructor(opts: ToxScreenerOptions = {}) {
    this.apiKey =
      opts.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.TYPESAFE_API_KEY ||
      process.env.JEV_KEY ||
      "";

    const isOpenRouter = this.apiKey.startsWith("sk-or-");
    this.hasCustomBaseUrl = Boolean(opts.baseUrl);
    this.hasCustomModel = Boolean(opts.model);

    this.baseUrl =
      opts.baseUrl || (isOpenRouter ? OPENROUTER_BASE_URL : TYPESAFE_BASE_URL);

    this.model = opts.model || (isOpenRouter ? OPENROUTER_MODEL : TYPESAFE_MODEL);

    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.retries = Number.isFinite(opts.retries)
      ? Math.max(0, Math.floor(opts.retries as number))
      : 2;
    this.questions = opts.questions || DEFAULT_TOXICITY_QUESTIONS;
    this.thresholds = opts.thresholds;
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    const isOpenRouter = this.apiKey.startsWith("sk-or-");
    // Only fall back to provider defaults when the user hasn't explicitly
    // pinned a custom baseUrl/model — otherwise we'd silently discard their
    // configuration on every key rotation.
    if (!this.hasCustomBaseUrl) {
      this.baseUrl = isOpenRouter ? OPENROUTER_BASE_URL : TYPESAFE_BASE_URL;
    }
    if (!this.hasCustomModel) {
      this.model = isOpenRouter ? OPENROUTER_MODEL : TYPESAFE_MODEL;
    }
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
        // No Jev request was made for empty input, so this isn't a real
        // "jev-api" decision — it's a trivial local short-circuit.
        source: "mock-heuristic",
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
    // Report actual end-to-end request latency — no artificial adjustment.
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

    // `retries` is the number of retries after the initial attempt, so
    // `retries: 2` means up to 3 total attempts; `retries: 0` means exactly
    // one attempt (never zero attempts, which would throw `undefined`).
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
      costUsd: this.computeCostUsd(jevResp.usage),
    };
  }

  /**
   * Prefer the provider-reported cost (OpenRouter). If unavailable, derive
   * cost from the *actual* reported `input_tokens` at Jev's published price
   * — never a fabricated token count. Returns `undefined` if neither is
   * available, rather than inventing a number.
   */
  private computeCostUsd(usage: JevResponse["usage"]): number | undefined {
    if (typeof usage?.cost === "number") {
      return usage.cost;
    }
    if (typeof usage?.input_tokens === "number") {
      return Number((usage.input_tokens * (0.042 / 1_000_000)).toFixed(7));
    }
    return undefined;
  }

  private extractObfuscationTypes(obfAns: JevAnswer | undefined): {
    primary: string;
    all: string[];
  } {
    const types = new Set<string>();

    const primaryChoice =
      obfAns && "choice" in obfAns ? String(obfAns.choice) : "none";

    // 1. Direct Jev AI model evaluation: read Jev's posterior probabilities
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
