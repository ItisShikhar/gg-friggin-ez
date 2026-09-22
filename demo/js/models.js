/** System 1 model registry for the demo interface. */

export const JEV_TYPESAFE_MODEL = {
  id: 'jev-typesafe',
  baseUrl: 'https://api.typesafe.ai/v1/systemone',
  model: 'jev-latest',
  pricing: { inputPerMillionUsd: 0.042 },
};

export const JEV_OPENROUTER_MODEL = {
  id: 'jev-openrouter',
  baseUrl: 'https://openrouter.ai/api/alpha/decisions',
  model: 'typesafe/jev-1.13',
  pricing: { inputPerMillionUsd: 0.042 },
};

export const LAYA_LOCAL_MODEL = {
  id: 'laya-local',
  baseUrl: 'http://localhost:8000/v1/decisions',
  model: 'convaiinnovations/laya',
  pricing: { inputPerMillionUsd: 0 },
};

export const BUNDLED_SYSTEM1_MODELS = {
  jevTypeSafe: JEV_TYPESAFE_MODEL,
  jevOpenRouter: JEV_OPENROUTER_MODEL,
  layaLocal: LAYA_LOCAL_MODEL,
};

export const BUILT_IN_SYSTEM1_MODELS = BUNDLED_SYSTEM1_MODELS;

export function resolveDefaultSystem1Model(apiKey) {
  return apiKey && apiKey.startsWith('sk-or-') ? JEV_OPENROUTER_MODEL : JEV_TYPESAFE_MODEL;
}

export function estimateCostUsd(usage, pricing) {
  if (usage && typeof usage.cost === 'number') {
    return usage.cost;
  }
  if (usage && typeof usage.input_tokens === 'number' && pricing) {
    return Number((usage.input_tokens * (pricing.inputPerMillionUsd / 1_000_000)).toFixed(7));
  }
  return undefined;
}
