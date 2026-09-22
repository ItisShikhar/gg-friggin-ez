<div align="center">

<img width="240" src="./docs/images/logo.svg" alt="gg-friggin-ez logo">

<h1>gg-friggin-ez</h1>

<p><strong>Fast, drop-in profanity and toxicity screener for Node.js, powered by <a href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe AI Jev</a>.
</strong>
</p>

<p>
<strong>
Fast. Cheap. Catches the friggin crap.
</strong>
</p>

<p>
  <a href="https://itisshikhar.github.io/gg-friggin-ez/">Live Demo</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#create-custom-screener">Create Custom Screener</a> |
  <a href="#install">Install</a> |
  <a href="#the-problem--the-solution">The Problem & The Solution</a> |  
  <a href="#custom-schemas">Custom Schemas</a> |
  <a href="#interactive-browser-demos">Demos</a>
</p>

[![npm version](https://img.shields.io/npm/v/gg-friggin-ez?style=flat-square)](https://www.npmjs.com/package/gg-friggin-ez)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-View%20Launch-DA552F?style=flat-square&logo=producthunt&logoColor=white)](https://www.producthunt.com/posts/gg-friggin-ez/)

<a href="https://www.producthunt.com/products/gg-friggin-ez?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-gg-friggin-ez" target="_blank" rel="noopener noreferrer"><img alt="gg-friggin-ez - Fast &amp; cheap profanity and toxicity screening via Jev | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1255875&amp;theme=light&amp;t=1790038052883"></a>

⭐ _Help us reach more developers and grow the community. Star this repo!_

</div>

<p align="center">
  <img src="./docs/images/banner.png" alt="gg-friggin-ez banner" width="100%">
</p>

Works across languages and scripts, with zero training required.

Real-world chat isn't clean. Users switch scripts, write regional languages in Latin characters, add spaces between letters, and turn profanity into leetspeak. **gg-friggin-ez** is built for exactly these cases - detecting romanized profanity, code-mixed text, leetspeak, and character spacing across Indic languages like Bengali, Malayalam, Hindi, Tamil, Telugu, Kannada, etc.

All at ~50-500ms latency, making it suitable for real-time chat and game moderation without reaching for a general-purpose LLM.

## The Problem

Static keyword denylists and generic moderation APIs fail on real-world user-generated content (social posts, comments, reviews, live chat, and in game text comms):

- **Evasion & Leetspeak**: Common obfuscation tricks bypass static keyword denylists.

| Technique                  | Examples                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Symbol / number swaps**  | `$hitt3r` · `p00da` · `b$dk` · `m1erda` · `c0nnard` · `傻x / c*m` · `死○ね / sh1ne`         |
| **Spaced characters**      | `p a i t h i y a m` · `b s d k` · `m i e r d a`                                             |
| **Character stretching**   | `looooosuuu` · `paaaagal` · `菜逼逼逼` · `死ねぇぇぇ`                                       |
| **Mixed-script**           | `chuतिya` · Latin + native-script characters                                                |
| **ASCII / visual evasion** | Hostile gestures rendered with punctuation, e.g. ASCII middle fingers, that even LLMs miss. |

> Examples span English, Tamil, Hindi, Spanish, French, Chinese, Japanese, and other languages.

- **Romanized & Code-Mixed Languages**: Transliterated text has no standard spelling and freely blends multiple languages.

| Language               | Example                                                      | Variations                                    |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| **English**            | `you are an absolute piece of <ins>sh1t</ins>, stop talking` | `shit` · `$hit` · `sh*t`                      |
| **Hindi / Hinglish**   | `abe <ins>chutiya</ins> chup kar na`                         | `chootiya` · `chutya` · `chuतिya` · `c***iya` |
| **Tamil / Tanglish**   | `nee oru <ins>pooda</ins> paithiyakaara da`                  | `p00da` · `puda` · `puuda`                    |
| **Kannada / Kanglish** | `nin <ins>huccha</ins> naye tara adtiya`                     | `huchcha` · `hu$ha` · `hucha`                 |
| **Japanese / Romaji**  | `omae hontou ni <ins>shine</ins> yo gomi`                    | `shiИe` · `sh1ne` · `死ね` · `死○ね`          |

- **Regional sparsity:** Non-Hindi regional languages suffer from limited training data and dialectal variation, challenging keyword lists and off-the-shelf classifiers ([DravidianCodeMix](https://doi.org/10.1007/s10579-022-09583-7)).

- **Identity-Based Hate Speech:** Regional caste, gender, and religious harassment can be difficult for English-centric moderation systems to detect, especially in transliterated or code-mixed text - e.g. _"kitchen me jaake khana bana ladki, games tere bas ka nahi"_.

- **False-Positive Traps**: Harmless friendly banter, cultural idioms, or casual slang get wrongly flagged as severe abuse by blunt keyword matchers.
- **LLMs are slow & expensive:** General-purpose LLMs can take 1-3s just to produce the first token, making real-time moderation slow and costly at scale.

## The Solution

`gg-friggin-ez` is built around **System 1 decision models** - reflex-speed classifiers that return calibrated probabilities instead of generating conversational text. It ships with **TypeSafe AI Jev** configured as the default model, but Jev isn't hardcoded: swap in a different System 1 classifier, or bring your own via the [`system1` option](#bring-your-own-system-1-model).

With Jev as the default model:

- **Reflex Speed**: ~50-500ms end-to-end response time.
- **Low Cost**: $0.042 / 1M input tokens, and no charge for output tokens.
- **Evasion-Aware**: Handles common obfuscation patterns including leetspeak, character spacing, romanization, and code-mixing.
- **Multilingual**: Supports English and Indic languages, including romanized/transliterated input.
- **Drop-In & Pluggable**: Simple Node.js API (`isProfane()`, `isToxic()`, `screen()`), with built-in screening rules, or bring your own custom schema - and your own System 1 model.
- **Human Review Path**: Ambiguous/context-dependent cases can be routed for human review rather than forcing a binary decision.

## Install

```bash
npm install gg-friggin-ez
```

> Requires Node.js `18+` (or Bun). Ships as both ESM and CommonJS with bundled TypeScript types.

<details>
<summary>Other package managers</summary>

```bash
yarn add gg-friggin-ez
```

```bash
pnpm add gg-friggin-ez
```

```bash
bun add gg-friggin-ez
```

</details>

## Quick Start

```ts
import { isProfane, isToxic } from "gg-friggin-ez";

process.env.OPENROUTER_API_KEY = "sk-or-..."; // or pass { apiKey } to createScreener() instead

// Fast boolean convenience checks
const profane = await isProfane("you are absolute dog sh1t"); // true
const toxic = await isToxic("you are completely brainless and useless"); // true

// Works with transliterated, code-mixed, and obfuscated text
const indic = await isProfane("Nee oru p00da paithiyakaara da, 5colo nadatha"); // true
```

Or `require()` it from plain CommonJS Node:

```js
const { isProfane, isToxic } = require("gg-friggin-ez");

const bad = await isProfane("you are absolute dog sh1t");
```

> [!TIP]
> **Performance tip**: `isProfane()` and `isToxic()` each trigger an inference request. If you need multiple moderation signals, call `screen()` once.

### Full detail

```ts
import { screen } from "gg-friggin-ez";

// Multi-vector adversarial evasion: spacing, leetspeak, repeated chars, symbols, & mixed script
const result = await screen(
  "Nee oru p 0 0 d a daaaa, b*dk chuतिya 5colo nadatha",
);

console.log(result);
// {
//   isProfane: true,
//   isToxic: true,
//   severity: "SEVERE",
//   severityScore: 1.95,
//   language: "tamil",
//   obfuscationType: "mixed_script",
//   obfuscationTypes: [
//     "mixed_script",
//     "spaced_characters",
//     "leetspeak",
//     "repeated_characters",
//   ],
//   action: "AUTO_BAN",
// }
```

`screen()`, `isProfane()`, and `isToxic()` all accept the same optional second argument - see [Create custom screener](#create-custom-screener) below for the full list of what you can configure and pass in. `screen()` returns the complete moderation result:

- `isProfane` - `true` / `false` - explicit profanity or slurs
- `isToxic` - `true` / `false` - hostility, harassment, or personal attacks
- `severity` - `"NONE"` / `"MILD"` / `"SEVERE"`
- `severityScore` - continuous `0.0-2.0` score, e.g. `1.95`
- `language` - detected language, e.g. `"tamil"`
- `obfuscationType` - primary evasion technique, e.g. `"mixed_script"`
- `obfuscationTypes` - all detected evasion techniques, e.g. `["mixed_script", "spaced_characters", "leetspeak", "repeated_characters", "symbol_substitutions"]`
- `action` - `"ALLOW"` / `"SUSPICIOUS_REVIEW"` / `"AUTO_CENSOR"` / `"AUTO_BAN"`
- `latencyMs` - actual measured end-to-end request latency (no artificial adjustment)
- `costUsd` - inference cost in USD, derived from the provider's reported cost or actual token usage; `undefined` if neither is available (never a fabricated estimate)

> [!NOTE]
> **Where does `action` actually come from?** The configured System 1 model (Jev by default) only returns calibrated probabilities/scores for toxicity, profanity, severity, language, and obfuscation type - it never decides an outcome. `gg-friggin-ez` then applies deterministic policy thresholds on the client side to turn those probabilities into `ALLOW` / `SUSPICIOUS_REVIEW` / `AUTO_CENSOR` / `AUTO_BAN`. This keeps the AI model narrowly scoped to classification while your application (or this library's default thresholds) owns the moderation policy.

### Visual Evasion & ASCII Art Screening

Standard keyword denylists and traditional NLP models process text as 1D token streams, and may miss 2D ASCII drawings. `gg-friggin-ez` detects ASCII-art evasion as a distinct moderation signal.

```ts
const asciiMiddleFinger = `
....................../´¯/) 
....................,/¯../ 
.................../..../ 
............./´¯/'...'/´¯¯\`·¸ 
........../'/.../..../......./¨¯\\ 
........('(...´...´.... ¯~/'...') 
.........\\.................'...../ 
..........''...\\.......... _.·´ 
............\\..............( 
..............\\.............\\...
`;

const res = await screen(asciiMiddleFinger);

console.log(res.obfuscationType); // "ascii_art"
console.log(res.obfuscationTypes); // ["ascii_art"]
console.log(res.severityScore); // 1.30
console.log(res.action); // "SUSPICIOUS_REVIEW"
```

### Create custom screener

```ts
import { createScreener, DEFAULT_TOXICITY_QUESTIONS } from "gg-friggin-ez";

const screener = createScreener({
  apiKey: "sk-or-...", // default: OPENROUTER_API_KEY, TYPESAFE_API_KEY, or JEV_KEY env var
  system1: undefined, // swap the whole System 1 model (endpoint + model id + pricing); see "Bring your own System 1 model"
  baseUrl: undefined, // override just the endpoint (rarely needed - use `system1` instead)
  model: undefined, // override just the model id (rarely needed - use `system1` instead)
  timeoutMs: 15000, // per-request timeout in ms
  retries: 2, // retries after the initial attempt, for transient errors only (clamped to >= 0)
  thresholds: { review: 0.35, censor: 0.6, ban: 0.75 }, // action decision thresholds
  questions: DEFAULT_TOXICITY_QUESTIONS, // Jev question schema; see "Custom schemas"
});

// thresholds and questions can also be passed per-call, overriding the screener's
// defaults for that call only - the rest of the options above are constructor-only.
await screener.screen("some borderline text", {
  thresholds: { censor: 0.5 },
  questions: DEFAULT_TOXICITY_QUESTIONS,
});
```

| Option       | Type                          | Default                                                       | Per-call override |
| ------------ | ----------------------------- | ------------------------------------------------------------- | ----------------- |
| `apiKey`     | `string`                      | `OPENROUTER_API_KEY` / `TYPESAFE_API_KEY` / `JEV_KEY` env var | No                |
| `system1`    | `System1ModelConfig`          | Jev (auto-picks TypeSafe or OpenRouter based on the key)      | No                |
| `baseUrl`    | `string`                      | from the active `system1` model                               | No                |
| `model`      | `string`                      | from the active `system1` model                               | No                |
| `timeoutMs`  | `number`                      | `15000`                                                       | No                |
| `retries`    | `number`                      | `2`                                                           | No                |
| `thresholds` | `{ review?, censor?, ban? }`  | `{ review: 0.35, censor: 0.6, ban: 0.75 }`                    | Yes               |
| `questions`  | `Record<string, JevQuestion>` | `DEFAULT_TOXICITY_QUESTIONS`                                  | Yes               |

> [!NOTE]
> Every option lives on `createScreener()`. `screen()`, `isProfane()`, and `isToxic()` accept the same `thresholds` and `questions` as a second argument, scoped to that one call only.

### Configurable policy thresholds

You can customize the decision action thresholds per-call or across the shared screener.

```ts
const result = await screen("some borderline text", {
  thresholds: {
    review: 0.3, // route to review at >= 30% confidence
    censor: 0.55, // auto-censor at >= 55%
    ban: 0.7, // auto-ban at >= 70%
  },
});
```

### Retries & timeouts

```ts
const screener = createScreener({
  timeoutMs: 10000, // per-request timeout in ms (default: 15000)
  retries: 2, // retries *after* the initial attempt (default: 2 → up to 3 total attempts)
});
```

Only transient failures are retried - HTTP `408`/`429`/`5xx`, network errors, and timeouts - with backoff between attempts. Non-transient errors (e.g. `401 Unauthorized`, `403 Forbidden`, `404 Not Found`) fail immediately instead of being retried. `retries` is clamped to a minimum of `0` (one attempt, no retries).

### API key configuration

`gg-friggin-ez` reads the API key from environment variables (in order): `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `JEV_KEY`. You can also pass it explicitly to `createScreener()`.

```ts
import { createScreener } from "gg-friggin-ez";

const screener = createScreener({ apiKey: "sk-or-..." });
```

If no key is configured, `screen()` throws an error - a real API key is required to reach Jev. (The browser demo in [`demo/`](./demo) has its own offline heuristic fallback for exploring the UI without a key, but the `gg-friggin-ez` package itself does not.)

### Custom schemas

Bring your own Jev question schema - useful for a different language family, domain, or moderation policy. Set it once on a screener instance, or override it for a single call.

```ts
import { createScreener, isProfane } from "gg-friggin-ez";

// Per-instance: every screen() call on this screener uses myCustomQuestions
const screener = createScreener({
  apiKey: "sk-or-...",
  questions: myCustomQuestions, // same shape as DEFAULT_TOXICITY_QUESTIONS
});

const result = await screener.screen("some text");

// Per-call: override the schema for a single check without a dedicated instance
await isProfane("some text", { questions: myCustomQuestions });
```

### Bring your own System 1 model

`gg-friggin-ez` ships with Jev (TypeSafe AI) configured as the default System 1 decision model, but the client isn't hardwired to it. Every provider detail - endpoint, model id, and published pricing - lives in one place ([`src/system1/models.ts`](./src/system1/models.ts)), so you can point the screener at a different System 1 classifier, or even a plain LLM that returns the same `{ noul, choice, score, usage }` shape, without touching any request/parsing logic:

```ts
import { createScreener, BUNDLED_SYSTEM1_MODELS } from "gg-friggin-ez";

// Example 1: Use pre-bundled local Laya (ConvAI Innovations)
// Run Laya via Python (`pip install laya`) behind an HTTP endpoint
const screener = createScreener({
  system1: BUNDLED_SYSTEM1_MODELS.layaLocal, // http://localhost:8000/v1/decisions
});

// Example 2: Use custom System 1 endpoint
const customScreener = createScreener({
  apiKey: "your-provider-api-key",
  system1: {
    id: "my-custom-model",
    baseUrl: "https://my-provider.example.com/v1/decisions",
    model: "my-model-id",
    pricing: { inputPerMillionUsd: 0.1 }, // optional - omit if the provider reports usage.cost
  },
});
```

> [!NOTE]
> Hugging Face model repository URLs (such as `https://huggingface.co/convaiinnovations/laya`) host raw model weights and documentation, not HTTP JSON decision endpoints. To use open-source models like Laya, serve the model locally or in your VPC (for example with FastAPI calling `laya.predict(state, questions)`), then pass that server's decision URL in `baseUrl`.

<details>
<summary><b>Self-hosting Laya with FastAPI (Python code & steps)</b></summary>

#### 1. Install dependencies

```bash
pip install fastapi uvicorn laya
```

#### 2. Create the decision server (`server.py`)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any, Optional
import laya

app = FastAPI()

# Load English (laya) or multilingual (laya-multilingual for Indic languages)
agent = laya.load("convaiinnovations/laya-multilingual")

class DecisionRequest(BaseModel):
    model: Optional[str] = "convaiinnovations/laya"
    state: Dict[str, Any]
    questions: Dict[str, Any]

@app.post("/v1/decisions")
async def handle_decisions(req: DecisionRequest):
    answers = agent.predict(req.state, req.questions)
    return {
        "answers": answers,
        "usage": {
            "input_tokens": len(req.state.get("text", "")),
            "cost": 0.0,
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### 3. Start the server

```bash
python server.py
```

#### 4. Connect `gg-friggin-ez`

```typescript
import { createScreener, BUNDLED_SYSTEM1_MODELS } from "gg-friggin-ez";

const screener = createScreener({
  system1: BUNDLED_SYSTEM1_MODELS.layaLocal, // http://localhost:8000/v1/decisions
});

const result = await screener.screen("Teri maa ki c**t");
console.log(result.action); // AUTO_BAN or AUTO_CENSOR
console.log(result.costUsd); // 0 (self-hosted)
```

</details>

A custom `system1` config is pinned for the lifetime of the screener instance - calling `setApiKey()` to rotate credentials never resets it back to Jev's defaults. If you only need to point at a different Jev-compatible deployment (e.g. a self-hosted proxy), the simpler `baseUrl`/`model` string options are still supported and behave the same as before.

## Interactive Browser Demos

> **Live Demo:** Try the interactive simulations live in your browser at **[https://itisshikhar.github.io/gg-friggin-ez/](https://itisshikhar.github.io/gg-friggin-ez/)**.

The repository includes two interactive simulations - **Twitch live chat** and **Valorant text comms** - showcasing real-time code-mixed toxicity detection. Test it directly online on **[GitHub Pages](https://itisshikhar.github.io/gg-friggin-ez/)**, or run it locally with Bun. Add an OpenRouter or TypeSafe AI API key via the **API Keys** modal, or use the built-in offline heuristic evaluator without a key.

### Twitch Live Stream Chat UI

<p align="center">
  <img src="./docs/images/demo-twitch.png" alt="Twitch Live Stream Chat Demo" width="100%">
  <br>
  <sub>Live Twitch chat moderation with AutoMod timeout, language detection, and moderator reveal.</sub>
</p>

### Valorant Realtime Comms

<p align="center">
  <img src="./docs/images/demo-valorant.png" alt="Valorant Realtime Comms Demo" width="100%">
  <br>
  <sub>In-game tactical comms HUD with real-time censorship, 3-strike penalty system, and inline telemetry cards.</sub>
</p>

### Running the demo locally

Requires [Bun](https://bun.sh) (v1.1+).

```bash
git clone https://github.com/ItisShikhar/gg-friggin-ez.git
cd gg-friggin-ez
bun install

bun run demo
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
bun test
```

### Building the npm package

```bash
npm run build
```

Emits `dist/index.js` (ESM), `dist/index.cjs` (CJS), and `dist/index.d.ts` (types).

## Use cases

`gg-friggin-ez` fits real-time (and passive) text moderation pipelines. Below are illustrative use cases and examples:

- **Games & platforms** - lobby chat, team comms, live game chat (Valorant, Counter-Strike: Global Offensive (CS:GO), Counter-Strike 2 (CS2), League of Legends (LoL)), Discord/Telegram community bots, gaming platforms, and similar online multiplayer or live platforms
- **Chat & messaging surfaces** - live chat (Twitch chat, TikTok Live comments), group chat, live customer support chat widgets, marketplace buyer-seller chat (Alibaba chat), dating app messaging (Tinder or Hinge chat), and other user-generated messages (Uber user/driver chat), including multilingual and obfuscated abuse
- **Moderation use cases** - game profanity filter, toxic chat filter, multiplayer chat moderation API, real-time toxicity detection, AI content moderation, automated harassment detection, AI agent/chatbot output screening, and player trust-and-safety tooling for esports and gaming communities
- **Multilingual & Indic-language support** - works across languages broadly, with especially strong coverage for Indic and code-mixed text - a gap most moderation packages don't handle well: Bengali text censoring, Malayalam chat moderation, Hindi/Hinglish, Tamil/Tanglish, Telugu/Tenglish, Kannada/Kanglish, Marathi/Marlish, Punjabi/Punglish, Gujarati/Gujlish, Bhojpuri, and other code-mixed Indian languages

## How It Compares

How `gg-friggin-ez` compares on latency, multilingual coverage, and real-world evasion handling.

| Moderation Approach                                       | Latency       | Strengths                                                                                                                                            | Trade-offs                                                                                                          |
| :-------------------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **`gg-friggin-ez`** (default model: TypeSafe AI Jev)      | **~50-500ms** | Multilingual, including romanized/transliterated Indic languages (Tamil, Telugu, Kannada, Bengali, Hindi, etc.), evasion tricks (leetspeak, spacing) | Limited conversational context (routes to human review)                                                             |
| **Perspective API** (Google Jigsaw)                       | ~80-120ms     | Monolingual English, Spanish, standard Hindi (`hi`)                                                                                                  | Unsupported on Dravidian & regional Indic languages. Scheduled to sunset end of 2026.                               |
| **OpenAI Moderation Endpoint** (`omni-moderation-latest`) | ~150-350ms    | Multilingual standard text (40 languages supported with major gains in Telugu, Bengali, Marathi)                                                     | Fixed 13 harm categories rather than custom policy schemas; higher false-positive rate on casual colloquial banter. |
| **Custom BERT / FastText**                                | ~15-30ms      | Extremely fast; performance depends on training data                                                                                                 | Requires training data + maintenance.                                                                               |
| **General LLMs (GPT-4o)**                                 | 1,000-3,500ms | Has multilingual world knowledge                                                                                                                     | 10x to 30x latency, plus 100x inference cost.                                                                       |

## Benchmark Results

Results from 42 curated test cases across 14 languages, covering multilingual, romanized, and obfuscated text.

| Metric                            | `gg-friggin-ez` (default model: Jev) | OpenAI (`omni-moderation`) | Perspective API                    | Legacy Keyword Filter |
| :-------------------------------- | :----------------------------------- | :------------------------- | :--------------------------------- | :-------------------- |
| **Overall Accuracy**              | **97.6%** (41 / 42)                  | 88.1% (37 / 42)            | 38.1% (16 / 42) _(18 unsupported)_ | 61.9% (26 / 42)       |
| **Romanized Indic Accuracy**      | **94.4%**                            | 77.8%                      | 16.7%                              | 66.7%                 |
| **Global Languages Accuracy**     | **100%**                             | 100%                       | 72.2%                              | 55.6%                 |
| **Obfuscated Evasion Catch Rate** | **100%**                             | 71.4%                      | 28.6%                              | 35.7%                 |
| **Inference Cost**                | **~$0.000052 / msg**                 | Free                       | Free _(sunset 2026)_               | $0.00                 |

> _Note on API language coverage:_ According to Google's official [Perspective API documentation](https://github.com/conversationai/perspectiveapi), its `TOXICITY` model officially supports only 18 languages - with standard Hindi (`hi`) and experimental Hinglish (`hi-Latn`) being its only Indic coverage. Tamil, Telugu, Kannada, Bengali, Marathi, and Bhojpuri are unsupported.

> For complete itemized data across all 42 tests, individual scores, and latency logs, see [raw-benchmarks.md](./raw-benchmarks.md).

## Contributing

Contributions are welcome, whether they improve performance, fix bugs, add
presets, components or effects, expand examples and tests, or improve documentation.
See [Contributing](CONTRIBUTING.md) before opening a pull request.

## Author

Built by [Shikhar Srivastava](https://www.linkedin.com/in/itisshikhar/).

[GitHub](https://github.com/ItisShikhar) ·
[LinkedIn](https://www.linkedin.com/in/itisshikhar/)

## License

gg-friggin-ez is released under the [MIT License](LICENSE).
