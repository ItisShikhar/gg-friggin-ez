import type { ModerationAction } from './types.ts';

/**
 * Simulates the brittle keyword/regex-based filters that most platforms
 * (Indian co-op forums, older Twitch bots, in-house game chat filters) still run today.
 *
 * Intentionally naive: exact substring matching only, no leetspeak/number/symbol
 * normalization, no spacing-collapse, and zero context awareness (can't tell
 * "you're playing like trash" banter apart from a personal slur). This is the
 * baseline Jev is meant to outperform, not a strawman — these are genuinely
 * the mechanics of a `if (text.includes(word))` rule table.
 */

// Deliberately plain-spelling only. A real ops team keeps lists like this too,
// which is exactly why leetspeak/spacing/symbol evasion defeats them.
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
