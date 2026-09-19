import type { JevQuestion } from './types.ts';

/**
 * Default toxicity decision schema passed to Jev. This is language-agnostic
 * by design — it works on plain English, any other language, or mixed-script
 * text — but its instructions are specifically tuned (evasion patterns,
 * criteria wording, language enum) for the hardest case most moderation
 * tooling ignores: romanized/transliterated, code-mixed Indic languages
 * (Tanglish, Hinglish, Benglish, Tenglish, Kanglish, Manglish, etc.), where
 * spellings vary wildly and classic keyword lists fail. Bring your own
 * `questions` (see `ToxScreenerOptions.questions`) to tune for a different
 * language family instead of using this default.
 */
export const DEFAULT_TOXICITY_QUESTIONS: Record<string, JevQuestion> = {
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
