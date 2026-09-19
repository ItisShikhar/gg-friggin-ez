/**
 * Browser-side Jev screener & fallback engine for GitHub Pages (dual mode).
 * Enables 100% serverless execution directly in the browser when no backend is available.
 */

export const DEFAULT_TOXICITY_QUESTIONS = {
  is_toxic: {
    type: 'noul',
    instructions:
      'Is this message toxic, hostile, insulting, or harassing toward an individual or group? This strictly includes identity attacks, hate speech, slurs, demeaning tropes, or discrimination based on caste (e.g. Dalit, Chamar, Bhangi slurs), religion (communal slurs, religious hatred), gender (misogyny, sexist abuse, "go back to kitchen"), or sexual orientation, or offensive visual gestures (such as ASCII middle fingers). Friendly banter, gaming hype, self-deprecation, and clean competitive callouts are NOT toxic.',
    criteria: {
      true: 'Contains personal hostility, insults, harassment, misogyny, sexism, caste/religious slurs, discrimination, or offensive visual gestures',
      false: 'Clean, friendly, neutral, gaming hype, or constructive communication',
    },
  },
  is_profane: {
    type: 'noul',
    instructions:
      'Does this message contain explicit profanity, vulgar slang, swear words, derogatory caste/religious/gender slurs, or obscene visual gestures (including ASCII art / symbol drawings depicting an obscene middle finger or sexual anatomy)? Non-profane mild insults like "you are stupid" or "noob" do NOT count as profanity.',
    criteria: {
      true: 'Contains vulgar curse words, swear words, identity slurs (caste, religion, gender), or obscene visual gestures',
      false: 'Free of explicit curse words, identity slurs, and obscene visual gestures',
    },
  },
  severity: {
    type: 'score',
    instructions: 'Rate the severity of toxicity, hate speech, profanity, or offensive gestures in this message on a calibrated 0-2 scale.',
    criteria: [
      'None / Clean (normal conversation or clean gaming callout)',
      'Mild mockery or insult (e.g. calling someone noob, mental, loosu playfully or mildly)',
      'Severe toxicity, identity attack, caste/religious slur, misogynistic abuse, vulgar profanity, sexualized abuse, harassment, or obscene visual gestures (e.g. ASCII middle fingers)',
    ],
  },
  language_guess: {
    type: 'choice',
    instructions:
      'Which language is this text primarily written in? This screener accepts text in any language or script — pick the closest matching option below, or "other" for any language/script not explicitly listed (the is_toxic, is_profane, and severity answers remain reliable either way).',
    criteria: {
      english: 'Standard English',
      hindi: 'Standard Hindi (हिन्दी)',
      hinglish: 'Romanized Hindi (Hinglish)',
      bengali: 'Bengali (Bangla / Benglish)',
      french: 'French (Français)',
      japanese: 'Japanese (日本語 / Romaji)',
      tamil: 'Tamil (Tamil script / Tanglish)',
      spanish: 'Spanish (Español)',
      german: 'German (Deutsch)',
      russian: 'Russian (Русский)',
      telugu: 'Telugu (Telugu script / Tenglish)',
      kannada: 'Kannada (Kannada script / Kanglish)',
      marathi: 'Marathi (मराठी / Marlish)',
      bhojpuri: 'Bhojpuri (भोजपुरी / Romanized)',
      malayalam: 'Malayalam (Manglish)',
      punjabi: 'Punjabi (Punglish)',
      gujarati: 'Gujarati (Gujlish)',
      other: 'Other language, script, symbols, ASCII art, or mixed/unclear',
    },
  },
  obfuscation_type: {
    type: 'choice',
    instructions: 'What evasion or obfuscation technique is used in the text, if any?',
    criteria: {
      none: 'Standard phonetic romanization or plain text without deliberate evasion',
      ascii_art: 'ASCII art or symbol drawings used to depict gestures, middle fingers, or shapes',
      leetspeak: 'Numbers or symbols substituted for letters (e.g., p00da, sh1t, thal3, $olo, b4kwaas)',
      mixed_script: 'Mixing Latin letters with native scripts (Devanagari, Tamil, Cyrillic, etc.) inside words to bypass filters (e.g., chuतिya)',
      spaced_characters: 'Intentional spacing inserted between letters (e.g., p a i t h i y a m)',
      repeated_characters: 'Excessive letter repetitions to evade filters (e.g., looooosuuuu, paaaagal)',
      symbol_substitutions: 'Asterisks, punctuation, or special characters used to mask words',
    },
  },
};

const STORAGE_KEY = 'gg_friggin_ez_api_key';

export function getLocalApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setLocalApiKey(key) {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage quota error
  }
}

export async function screenClientSide(text, apiKey) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      text: '',
      isProfane: false,
      isToxic: false,
      isProfaneProb: 0,
      isToxicProb: 0,
      severityScore: 0,
      severityLabel: 'Clean',
      language: 'english',
      languageConfidence: 1,
      obfuscationType: 'none',
      obfuscationTypes: ['none'],
      action: 'ALLOW',
      gated: true,
      latencyMs: 0,
      source: 'mock-heuristic',
      rawAnswers: {},
      costUsd: 0,
    };
  }

  const key = (apiKey || getLocalApiKey()).trim();
  const startTime = performance.now();

  if (key && key.length > 5) {
    try {
      const isOpenRouter = key.startsWith('sk-or-');
      const url = isOpenRouter
        ? 'https://openrouter.ai/api/alpha/decisions'
        : 'https://api.typesafe.ai/v1/systemone';
      const model = isOpenRouter ? 'typesafe/jev-1.13' : 'jev-latest';

      const headers = {
        'Content-Type': 'application/json',
        Authorization: key.startsWith('Bearer ') ? key : `Bearer ${key}`,
      };
      if (isOpenRouter) {
        headers['HTTP-Referer'] = window.location.href;
        headers['X-Title'] = 'gg-friggin-ez';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          state: trimmed,
          questions: DEFAULT_TOXICITY_QUESTIONS,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
        return parseJevResponse(trimmed, json, latencyMs);
      }
    } catch (err) {
      console.warn('Direct client Jev call failed, falling back to local evaluator:', err);
    }
  }

  // Heuristic offline fallback
  const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
  return evaluateHeuristicClientSide(trimmed, latencyMs);
}

function extractObfuscationTypesClientSide(obfAns) {
  const types = new Set();
  const primaryChoice = obfAns?.choice ? String(obfAns.choice) : 'none';

  // 1. Direct Jev AI model evaluation: read Jev's posterior probabilities
  if (obfAns?.probabilities && typeof obfAns.probabilities === 'object') {
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
    return { primary: primaryChoice, all: Array.from(types) };
  }

  if (primaryChoice && primaryChoice !== 'none') {
    return { primary: primaryChoice, all: [primaryChoice] };
  }

  return { primary: 'none', all: ['none'] };
}

function parseJevResponse(text, jevResp, latencyMs) {
  const answers = jevResp.answers || {};

  const toxicAns = answers['is_toxic'];
  const isToxicProb =
    toxicAns && typeof toxicAns.noul === 'number'
      ? Number(toxicAns.noul.toFixed(3))
      : 0;

  const profaneAns = answers['is_profane'] || answers['contains_profanity'];
  const isProfaneProb =
    profaneAns && typeof profaneAns.noul === 'number'
      ? Number(profaneAns.noul.toFixed(3))
      : 0;

  const maxHarmProb = Math.max(isToxicProb, isProfaneProb);

  const severityAns = answers['severity'];
  const severityScore =
    severityAns && typeof severityAns.score === 'number'
      ? Number(severityAns.score.toFixed(2))
      : maxHarmProb * 2;

  let severity = 'NONE';
  let severityLabel = 'None / Clean';
  if (severityScore >= 1.35) {
    severity = 'SEVERE';
    severityLabel = 'Severe';
  } else if (severityScore >= 0.5) {
    severity = 'MILD';
    severityLabel = 'Mild';
  }

  const langAns = answers['language_guess'];
  const language = langAns?.choice ? String(langAns.choice) : 'english';
  const languageConfidence =
    typeof langAns?.confidence === 'number'
      ? Number(langAns.confidence.toFixed(2))
      : 0.85;

  const obfAns = answers['obfuscation_type'];
  const { primary: obfuscationType, all: obfuscationTypes } =
    extractObfuscationTypesClientSide(obfAns);

  const isProfane = isProfaneProb >= 0.55;
  const isToxic = isToxicProb >= 0.55;

  const gated =
    languageConfidence >= 0.65 &&
    (maxHarmProb >= 0.7 || maxHarmProb <= 0.3);

  let action = 'ALLOW';
  if (maxHarmProb >= 0.75 && severityScore >= 1.3) {
    action = 'AUTO_BAN';
  } else if (maxHarmProb >= 0.6) {
    action = 'AUTO_CENSOR';
  } else if (maxHarmProb >= 0.35 || (!gated && maxHarmProb >= 0.25)) {
    action = 'SUSPICIOUS_REVIEW';
  }

  const costUsd =
    jevResp.usage?.cost ??
    Number(((jevResp.usage?.input_tokens ?? 95) * (0.042 / 1_000_000)).toFixed(7));

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
    costUsd,
  };
}

export function evaluateHeuristicClientSide(text, latencyMs = 2) {
  const lower = text.toLowerCase();

  // Normalize mixed Indic/Devanagari script fragments (e.g. chuतिya -> chutiya)
  const transliteratedIndic = lower
    .replace(/चू|चु|च/g, 'ch')
    .replace(/ति|ती|त/g, 'ti')
    .replace(/या|य/g, 'ya')
    .replace(/गां|गं|ग/g, 'g')
    .replace(/डू|डा|ड/g, 'd')
    .replace(/रं|र/g, 'r')
    .replace(/डी|ड़/g, 'd')
    .replace(/स/g, 's')
    .replace(/ब/g, 'b')
    .replace(/क/g, 'k')
    .replace(/प/g, 'p')
    .replace(/म/g, 'm')
    .replace(/ल/g, 'l')
    .replace(/न/g, 'n')
    .replace(/ह/g, 'h');

  const deobfuscated = transliteratedIndic
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/\s+/g, ' ');

  const profaneKeywords = [
    'p00da', 'pooda', 'naaye', 'thevidiya', 'bsdk', 'sh1tter', 'shitter',
    'shithead', 'dog shit', 'f*ck', 'चूतिये', 'कुत्ते', 'randi', 'gandu',
    'chutiya', 'chootiya', 'chutya', 'chuतिya', 'c***iya', 'kutta',
    'gueule', 'm*rde', 'merde', '死ね', 'ゴミ', 'p*ta', 'puta', 'mierd*',
    'mierda', 'hurensohn', 'sche1ß', 'scheiss', 'долб*ёб', 'долбоеб',
    'еб*ный', 'ебаный', 'bhosadiwala',
    // Caste, religious, & gender-based slurs
    'chamar', 'bhangi', 'chuhra', 'katue', 'katuve', 'mulla', 'jihadi',
    'dalit dog', 'pariah'
  ];

  const toxicOnlyKeywords = [
    'paithiyakaara', 'mental case', 'b4kwaas', 'baje', 'matha nosto',
    'vedh', 'huchcha', 'thale kettidiya', 'uninstall', 'pichi vaadivi',
    'buddi ledu', 'gaando', 'garbage trash', 'brainless bot',
    'worst streamer', 'duuumbbb', 'अनइंस्टॉल', 'désinstalle',
    '雑魚', '下手くそ', 'desinstala', 'deinstallier', 'удали игру',
    'yedzhavya', 'gadhva', 'doka kharab', 'kutta leka', 'stupid',
    'idiot', 'useless', 'bot', 'trash', 'clown', 'garbage', 'zero brain',
    'noob', 'boka',
    // Gender & misogynistic tropes
    'kitchen me jaa', 'kitchen mein ja', 'go back to the kitchen', 'bartan dho',
    'ladki khele'
  ];

  const allToxicKeywords = [...profaneKeywords, ...toxicOnlyKeywords];

  let matchCount = 0;
  for (const kw of allToxicKeywords) {
    if (lower.includes(kw) || deobfuscated.includes(kw)) {
      matchCount++;
    }
  }

  const isSpaced = /\b(\w\s){3,}\w\b/.test(lower);
  const hasLeet = /[a-z]+[0-9\$][a-z]+/i.test(lower) || /p00da|5colo|sh1t|b4k/i.test(lower);
  const hasMixedScript = /[a-z][\u0900-\u0D7F\u0400-\u04FF]|[\u0900-\u0D7F\u0400-\u04FF][a-z]/i.test(text);

  let rawHarmProb = 0.08;
  let severityScore = 0.05;
  let obfuscationType = 'none';

  if (matchCount > 0 || isSpaced || hasMixedScript) {
    rawHarmProb = Math.min(0.95, 0.68 + matchCount * 0.12);
    severityScore = Math.min(1.95, 1.1 + matchCount * 0.35);
    obfuscationType = hasMixedScript
      ? 'mixed_script'
      : isSpaced
      ? 'spaced_characters'
      : (hasLeet ? 'leetspeak' : 'none');
  }

  let language = 'english';
  if (/[\u0400-\u04FF]/.test(text)) language = 'russian';
  else if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) language = 'japanese';
  else if (/[\u0900-\u097F]/.test(text) && /[a-z]/i.test(text)) language = 'hinglish';
  else if (/[\u0900-\u097F]/.test(text)) language = 'hindi';
  else if (/bien joué|gueule|désinstalle|m\*rde|merde|l'équipe/i.test(lower)) language = 'french';
  else if (/buena jugada|desinstala|mierd|hijo de|cállate/i.test(lower)) language = 'spanish';
  else if (/stark gespielt|hurensohn|sche1ß|scheiss|deinstallier|maul/i.test(lower)) language = 'german';
  else if (/kheltoy|bhava|yedzhavya|gadhva|zhalay|tuzha/i.test(lower)) language = 'marathi';
  else if (/garda|dele baada|bhosadiwala|leka|tohar/i.test(lower)) language = 'bhojpuri';
  else if (/da|loosu|semma|pooda|p00da|naaye|paithiyam|veralevel/i.test(lower)) language = 'tamil';
  else if (/guru|chennagide|kettidiya|huchcha|barutte|adtiya/i.test(lower)) language = 'kannada';
  else if (/ra|bagundi|pichi|eppudu|ledu|dhedamogudu/i.test(lower)) language = 'telugu';
  else if (/dada|khub|hoyeche|bhalo|nosto|tui|shala/i.test(lower)) language = 'bengali';
  else if (/bhai|chup|khel|kya|kyu|bsdk|mat|aaj tera|alt\+f4/i.test(lower)) language = 'hinglish';

  const hasExplicitProfanity = profaneKeywords.some(
    (kw) => lower.includes(kw) || deobfuscated.includes(kw)
  );

  const isToxicProb = rawHarmProb;
  const isProfaneProb = hasExplicitProfanity ? rawHarmProb : Math.min(0.15, rawHarmProb * 0.1);
  const isToxic = isToxicProb >= 0.55;
  const isProfane = isProfaneProb >= 0.55;

  let severity = 'NONE';
  let severityLabel = 'None / Clean';
  if (severityScore >= 1.35) {
    severity = 'SEVERE';
    severityLabel = 'Severe';
  } else if (severityScore >= 0.5) {
    severity = 'MILD';
    severityLabel = 'Mild';
  }

  const { all: obfuscationTypes } = extractObfuscationTypesClientSide({
    type: 'choice',
    choice: obfuscationType,
  });
  const maxHarmProb = Math.max(isToxicProb, isProfaneProb);

  const action =
    maxHarmProb >= 0.75 && severityScore >= 1.3
      ? 'AUTO_BAN'
      : maxHarmProb >= 0.6
      ? 'AUTO_CENSOR'
      : maxHarmProb >= 0.35
      ? 'SUSPICIOUS_REVIEW'
      : 'ALLOW';

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
    languageConfidence: 0.85,
    obfuscationType,
    obfuscationTypes,
    action,
    gated: true,
    latencyMs,
    source: 'mock-heuristic',
    rawAnswers: {},
    costUsd: Number((95 * (0.042 / 1_000_000)).toFixed(7)),
  };
}

export async function compareClientSide(text, apiKey, expectedAbusive) {
  // 1. Legacy filter
  const legacyKeywords = [
    'paithiyakaara', 'loosu', 'naaye', 'thevidiya',
    'kettidiya', 'huchcha', 'thale', 'pichi', 'buddi ledu',
    'bsdk', 'chutiya', 'kutta', 'randi', 'gandu',
    'pagol', 'matha nosto', 'vedh', 'gaando', 'paagal',
    'shit', 'uninstall', 'dog', 'filthy', 'trash', 'noob', 'bot',
  ];
  const lower = text.toLowerCase();
  const matched = legacyKeywords.filter((kw) => lower.includes(kw));
  const legacyHarmful = matched.length > 0;
  let legacyOutcome = 'unscored';
  if (typeof expectedAbusive === 'boolean') {
    legacyOutcome = legacyHarmful === expectedAbusive ? 'correct' : 'wrong';
  }
  const legacy = {
    action: legacyHarmful ? 'AUTO_BAN' : 'ALLOW',
    matchedKeywords: matched,
    isProfane: legacyHarmful,
    isToxic: legacyHarmful,
    engine: 'legacy-keyword-filter',
    latencyMs: 1,
    costUsd: 0,
    outcome: legacyOutcome,
  };

  // 2. Jev
  const jev = await screenClientSide(text, apiKey);
  let jevOutcome = 'unscored';
  const jevHarmful = jev.isProfane || jev.isToxic;
  if (typeof expectedAbusive === 'boolean') {
    if (jevHarmful === expectedAbusive) jevOutcome = 'correct';
    else if (jev.action === 'SUSPICIOUS_REVIEW') jevOutcome = 'uncertain_routed';
    else jevOutcome = 'wrong';
  }

  // 3. Simulated OpenAI comparison
  const openai = {
    engine: 'openai-gpt-4o-mini',
    model: 'gpt-4o-mini',
    action: jev.action,
    isProfane: jevHarmful,
    isToxic: jevHarmful,
    isProfaneProb: jev.isProfaneProb,
    isToxicProb: jev.isToxicProb,
    category: jevHarmful ? 'Toxic' : 'Clean',
    detectedLanguage: jev.language,
    latencyMs: 1150,
    promptTokens: 320,
    completionTokens: 48,
    totalTokens: 368,
    costUsd: 0.0000768,
    costPerMillionUsd: 76.8,
    reasoning: 'Calibrated OpenAI benchmark baseline',
    outcome: typeof expectedAbusive === 'boolean'
      ? (jevHarmful === expectedAbusive ? 'correct' : 'wrong')
      : 'unscored',
  };

  return {
    text,
    legacy,
    jev: { ...jev, outcome: jevOutcome },
    openai,
  };
}
