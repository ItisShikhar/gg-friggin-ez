import type { ModerationAction } from './types.ts';

/** Basic substring keyword filter used as a naive baseline in demo comparisons. */
const KEYWORD_DENYLIST: string[] = [
  // Tamil / Tanglish
  'paithiyakaara', 'loosu', 'naaye', 'thevidiya',
  // Kannada / Kanglish
  'kettidiya', 'huchcha', 'thale',
  // Telugu / Tenglish
  'pichi', 'buddi ledu',
  // Hindi / Hinglish
  'bsdk', 'chutiya', 'kutta', 'randi', 'gandu',
  // Bengali / Benglish
  'pagol', 'matha nosto',
  // Marathi / Gujarati / Punjabi
  'vedh', 'gaando', 'paagal',
  // English (common over-eager matches: catches gaming slang too)
  'shit', 'uninstall', 'dog', 'filthy', 'trash', 'noob', 'bot',
];

export interface LegacyFilterResult {
  action: ModerationAction;
  matchedKeywords: string[];
  isProfane: boolean;
  isToxic: boolean;
  engine: 'legacy-keyword-filter';
}

export function legacyKeywordFilter(text: string): LegacyFilterResult {
  const lower = text.toLowerCase();
  const matched = KEYWORD_DENYLIST.filter((kw) => lower.includes(kw));

  const isMatched = matched.length > 0;

  return {
    action: isMatched ? 'AUTO_BAN' : 'ALLOW',
    matchedKeywords: matched,
    isProfane: isMatched,
    isToxic: isMatched,
    engine: 'legacy-keyword-filter',
  };
}
