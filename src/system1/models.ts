/** System 1 model registry and cost calculation. */

export interface System1ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd?: number;
}

export interface System1ModelConfig {
  id: string;
  baseUrl: string;
  model: string;
  pricing?: System1ModelPricing;
}

export const JEV_TYPESAFE_MODEL: System1ModelConfig = {
  id: "jev-typesafe",
  baseUrl: "https://api.typesafe.ai/v1/systemone",
  model: "jev-latest",
  pricing: { inputPerMillionUsd: 0.042 },
};

export const JEV_OPENROUTER_MODEL: System1ModelConfig = {
  id: "jev-openrouter",
  baseUrl: "https://openrouter.ai/api/alpha/decisions",
  model: "typesafe/jev-1.13",
  pricing: { inputPerMillionUsd: 0.042 },
};

/** Self-hosted Laya model configuration (ConvAI Innovations). */
export const LAYA_LOCAL_MODEL: System1ModelConfig = {
  id: "laya-local",
  baseUrl: "http://localhost:8000/v1/decisions",
  model: "convaiinnovations/laya",
  pricing: { inputPerMillionUsd: 0 },
};

export const BUNDLED_SYSTEM1_MODELS = {
  jevTypeSafe: JEV_TYPESAFE_MODEL,
  jevOpenRouter: JEV_OPENROUTER_MODEL,
  layaLocal: LAYA_LOCAL_MODEL,
} as const;

/** @deprecated Use BUNDLED_SYSTEM1_MODELS instead. */
export const BUILT_IN_SYSTEM1_MODELS = BUNDLED_SYSTEM1_MODELS;

export function resolveDefaultSystem1Model(apiKey: string): System1ModelConfig {
  return apiKey.startsWith("sk-or-") ? JEV_OPENROUTER_MODEL : JEV_TYPESAFE_MODEL;
}

export function estimateCostUsd(
  usage: { input_tokens?: number; cost?: number } | undefined,
  pricing: System1ModelPricing | undefined,
): number | undefined {
  if (typeof usage?.cost === "number") {
    return usage.cost;
  }
  if (typeof usage?.input_tokens === "number" && pricing) {
    return Number((usage.input_tokens * (pricing.inputPerMillionUsd / 1_000_000)).toFixed(7));
  }
  return undefined;
}
