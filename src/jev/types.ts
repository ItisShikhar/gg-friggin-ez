export type NoulCriterion = {
  true: string;
  false: string;
};

export type NoulQuestion = {
  type: 'noul';
  instructions: string;
  criteria: NoulCriterion;
};

export type ScoreQuestion = {
  type: 'score';
  instructions: string;
  criteria: string[];
};

export type ChoiceQuestion = {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
};

export type JevQuestion = NoulQuestion | ScoreQuestion | ChoiceQuestion;

export type NoulAnswer = {
  type: 'noul';
  noul: number;
  confidence?: number;
};

export type ScoreAnswer = {
  type: 'score';
  score: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  confidence?: number;
};

export type ChoiceAnswer = {
  type: 'choice';
  choice: string;
  probabilities?: Record<string, number>;
  confidence?: number;
};

export type JevAnswer = NoulAnswer | ScoreAnswer | ChoiceAnswer;

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: {
    input_tokens: number;
    output_tokens?: number;
    cost?: number;
  };
  id?: string;
  provider?: string;
}

export type ModerationAction = 'ALLOW' | 'SUSPICIOUS_REVIEW' | 'AUTO_CENSOR' | 'AUTO_BAN';

export type SeverityLevel = 'NONE' | 'MILD' | 'SEVERE';

export interface ModerationThresholds {
  /** Probability threshold above which to route to human review (default: 0.35) */
  review?: number;
  /** Probability threshold above which to auto-censor (default: 0.60) */
  censor?: number;
  /** Probability threshold above which to auto-ban (default: 0.75) */
  ban?: number;
}

export interface ToxicityScreenResult {
  text: string;
  translation?: string;
  /** True if the message contains explicit curse words, swear words, slurs, or vulgarities */
  isProfane: boolean;
  /** True if the message contains hostile, insulting, or harassing behavior directed at a person (even without profanity) */
  isToxic: boolean;
  /** Confidence probability of explicit profanity (0.0 to 1.0) */
  isProfaneProb: number;
  /** Confidence probability of toxicity / personal hostility (0.0 to 1.0) */
  isToxicProb: number;
  /** Typed severity enum: NONE (<0.5), MILD (0.5-1.34), or SEVERE (>=1.35) */
  severity: SeverityLevel;
  /** Continuous calibrated severity score on a 0.0 to 2.0 scale */
  severityScore: number;
  /** Human-readable severity label */
  severityLabel: string;
  /** Detected language code/name */
  language: string;
  languageConfidence: number;
  /** Primary / dominant obfuscation technique */
  obfuscationType: string;
  /** All detected evasion techniques present (e.g. ['leetspeak', 'spaced_characters']) */
  obfuscationTypes: string[];
  action: ModerationAction;
  gated: boolean;
  latencyMs: number;
  source: 'jev-api' | 'fallback-cache' | 'mock-heuristic';
  rawAnswers: Record<string, JevAnswer>;
  costUsd?: number;
}
