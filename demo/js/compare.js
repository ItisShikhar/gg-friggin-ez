import { compareText, fetchPresets } from "./api.js";
import { escapeHtml } from "./helpers.js";
import { compareTally, state } from "./state.js";

let isRunningAllPresets = false;

function renderCompareTally() {
  const legacyTotal = compareTally.legacyCorrect + compareTally.legacyWrong;
  const jevTotal =
    compareTally.jevCorrect + compareTally.jevRouted + compareTally.jevWrong;
  const openaiTotal =
    compareTally.openaiCorrect +
    compareTally.openaiRouted +
    compareTally.openaiWrong;
  const legacyAccuracy = legacyTotal
    ? Math.round((compareTally.legacyCorrect / legacyTotal) * 100)
    : null;
  const jevAccuracy = jevTotal
    ? Math.round((compareTally.jevCorrect / jevTotal) * 100)
    : null;
  const openaiAccuracy = openaiTotal
    ? Math.round((compareTally.openaiCorrect / openaiTotal) * 100)
    : null;

  document.getElementById("tally-legacy-accuracy").textContent =
    legacyAccuracy === null ? "--%" : `${legacyAccuracy}%`;
  document.getElementById("tally-legacy-correct").textContent =
    compareTally.legacyCorrect;
  document.getElementById("tally-legacy-wrong").textContent =
    compareTally.legacyWrong;
  document.getElementById("tally-jev-accuracy").textContent =
    jevAccuracy === null ? "--%" : `${jevAccuracy}%`;
  document.getElementById("tally-jev-correct").textContent =
    compareTally.jevCorrect;
  document.getElementById("tally-jev-routed").textContent =
    compareTally.jevRouted;
  document.getElementById("tally-jev-wrong").textContent =
    compareTally.jevWrong;

  const jevCost = document.getElementById("tally-jev-cost-sub");
  if (jevCost)
    jevCost.textContent = `Cost: $${compareTally.jevTotalCostUsd.toFixed(6)}`;
  const openaiAccuracyElement = document.getElementById(
    "tally-openai-accuracy",
  );
  if (openaiAccuracyElement)
    openaiAccuracyElement.textContent =
      openaiAccuracy === null ? "--%" : `${openaiAccuracy}%`;
  const openaiCorrect = document.getElementById("tally-openai-correct");
  if (openaiCorrect) openaiCorrect.textContent = compareTally.openaiCorrect;
  const openaiRouted = document.getElementById("tally-openai-routed");
  if (openaiRouted) openaiRouted.textContent = compareTally.openaiRouted;
  const openaiWrong = document.getElementById("tally-openai-wrong");
  if (openaiWrong) openaiWrong.textContent = compareTally.openaiWrong;
  const openaiCost = document.getElementById("tally-openai-cost-sub");
  if (openaiCost)
    openaiCost.textContent = `Cost: $${compareTally.openaiTotalCostUsd.toFixed(6)}`;

  const averageJevLatency = compareTally.total
    ? Math.round(compareTally.jevTotalLatencyMs / compareTally.total)
    : null;
  const averageOpenaiLatency = compareTally.total
    ? Math.round(compareTally.openaiTotalLatencyMs / compareTally.total)
    : null;
  const jevSpeed = document.getElementById("tally-jev-speed-sub");
  if (jevSpeed) {
    jevSpeed.textContent =
      averageJevLatency !== null
        ? `Speed: ${averageJevLatency}ms (Fast • System 1)`
        : "Speed: ~350-500ms (Fast)";
  }
  const openaiSpeed = document.getElementById("tally-openai-speed-sub");
  if (openaiSpeed) {
    if (averageOpenaiLatency !== null) {
      if (averageJevLatency && averageJevLatency > 50) {
        const multiplier = (averageOpenaiLatency / averageJevLatency).toFixed(
          1,
        );
        openaiSpeed.textContent = `Speed: ${averageOpenaiLatency}ms (${multiplier}x slower • Generative)`;
      } else {
        openaiSpeed.textContent = `Speed: ${averageOpenaiLatency}ms (Slower • Generative)`;
      }
    } else {
      openaiSpeed.textContent = "Speed: ~1,500-2,500ms (Slower)";
    }
  }

  const total = document.getElementById("tally-total");
  if (total) total.textContent = compareTally.total;
  const totalJevCost = document.getElementById("tally-cost");
  if (totalJevCost)
    totalJevCost.textContent = `$${compareTally.jevTotalCostUsd.toFixed(6)}`;
  const totalOpenaiCost = document.getElementById("tally-openai-cost");
  if (totalOpenaiCost)
    totalOpenaiCost.textContent = `$${compareTally.openaiTotalCostUsd.toFixed(6)}`;
  const multiplier = document.getElementById("tally-multiplier");
  if (multiplier) {
    multiplier.textContent =
      compareTally.jevTotalCostUsd > 0 && compareTally.openaiTotalCostUsd > 0
        ? `${(compareTally.openaiTotalCostUsd / compareTally.jevTotalCostUsd).toFixed(1)}x (OpenAI)`
        : "--";
  }
  const latency = document.getElementById("tally-latency");
  if (latency)
    latency.textContent = `${averageJevLatency ?? "--"}ms / ${averageOpenaiLatency ?? "--"}ms`;
}

export function resetComparisonTally() {
  Object.assign(compareTally, {
    total: 0,
    legacyCorrect: 0,
    legacyWrong: 0,
    legacyLatencyMs: 0,
    jevCorrect: 0,
    jevRouted: 0,
    jevWrong: 0,
    jevTotalCostUsd: 0,
    jevTotalLatencyMs: 0,
    openaiCorrect: 0,
    openaiRouted: 0,
    openaiWrong: 0,
    openaiTotalCostUsd: 0,
    openaiTotalLatencyMs: 0,
  });
  renderCompareTally();
  const grid = document.getElementById("compare-results-grid");
  if (grid) grid.innerHTML = "";
}

function outcomeMeta(outcome) {
  if (outcome === "correct")
    return { icon: "[OK]", label: "Correct", cls: "outcome-correct" };
  if (outcome === "wrong")
    return { icon: "[FAIL]", label: "Wrong / Missed", cls: "outcome-wrong" };
  if (outcome === "uncertain_routed")
    return {
      icon: "[REVIEW]",
      label: "Routed to Review",
      cls: "outcome-routed",
    };
  return { icon: "[--]", label: "Unscored", cls: "outcome-unscored" };
}

function renderCompareResultRow(data) {
  const grid = document.getElementById("compare-results-grid");
  if (!grid) return;
  const legacyMeta = outcomeMeta(data.legacy.outcome);
  const jevMeta = outcomeMeta(data.jev.outcome);
  const openaiMeta = outcomeMeta(data.openai?.outcome || "unscored");
  const row = document.createElement("div");
  row.className = "compare-result-row";
  row.innerHTML = `
    <div class="compare-result-text">"${escapeHtml(data.text)}"</div>
    <div class="compare-verdict-triplet">
      <div class="verdict-box">
        <div class="verdict-box-header">
          <span>1. REGEX DENYLIST</span>
          <span class="speed-tag speed-fast">${data.legacy.latencyMs}ms (instant)</span>
        </div>
        <div class="verdict-outcome">
          <span class="verdict-tag">${data.legacy.action}</span>
          <span class="${legacyMeta.cls}">${legacyMeta.icon} ${legacyMeta.label}</span>
        </div>
        <div class="verdict-meta">
          ${data.legacy.matchedKeywords && data.legacy.matchedKeywords.length ? `matched: "${escapeHtml(data.legacy.matchedKeywords.join(", "))}"` : "0 keyword matches (bypassed)"}
        </div>
        <div class="verdict-cost-line">Cost: $0.000000 • In-process trie</div>
      </div>
      <div class="verdict-box jev">
        <div class="verdict-box-header">
          <span>2. TYPESAFE JEV 1.13</span>
          <span class="speed-tag speed-fast">${data.jev.latencyMs}ms (fast)</span>
        </div>
        <div class="verdict-outcome">
          <span class="verdict-tag">${data.jev.action}</span>
          <span class="${jevMeta.cls}">${jevMeta.icon} ${jevMeta.label}</span>
        </div>
        <div class="verdict-meta">
          p(tox)=${(data.jev.isToxicProb ?? data.jev.isProfaneProb ?? 0).toFixed(2)} • lang: ${data.jev.language} (${Math.round((data.jev.languageConfidence ?? 0) * 100)}%)
        </div>
        <div class="verdict-cost-line">Cost: $${(data.jev.costUsd || 0.000004).toFixed(6)} • System 1 Decision</div>
      </div>
      <div class="verdict-box">
        <div class="verdict-box-header">
          <span>3. OPENAI GPT-4O-MINI</span>
          <span class="speed-tag speed-slow">${data.openai?.latencyMs ?? 1100}ms (slower)</span>
        </div>
        <div class="verdict-outcome">
          <span class="verdict-tag">${data.openai?.action || "ALLOW"}</span>
          <span class="${openaiMeta.cls}">${openaiMeta.icon} ${openaiMeta.label}</span>
        </div>
        <div class="verdict-meta">
          ${data.openai?.totalTokens ?? 190} tokens • ${escapeHtml(data.openai?.reasoning || "Prompt completion JSON")}
        </div>
        <div class="verdict-cost-line">Cost: $${(data.openai?.costUsd || 0.000185).toFixed(6)} • Generative LLM</div>
      </div>
    </div>
  `;
  grid.prepend(row);
}

function applyCompareResultToTally(data) {
  compareTally.total += 1;
  compareTally.jevTotalCostUsd += data.jev.costUsd || 0.000004;
  compareTally.jevTotalLatencyMs += data.jev.latencyMs || 0;
  if (data.openai) {
    compareTally.openaiTotalCostUsd += data.openai.costUsd || 0.000185;
    compareTally.openaiTotalLatencyMs += data.openai.latencyMs || 1100;
    if (data.openai.outcome === "correct") compareTally.openaiCorrect += 1;
    else if (data.openai.outcome === "uncertain_routed")
      compareTally.openaiRouted += 1;
    else if (data.openai.outcome === "wrong") compareTally.openaiWrong += 1;
  }
  if (data.legacy.outcome === "correct") compareTally.legacyCorrect += 1;
  else if (data.legacy.outcome === "wrong") compareTally.legacyWrong += 1;
  if (data.jev.outcome === "correct") compareTally.jevCorrect += 1;
  else if (data.jev.outcome === "uncertain_routed") compareTally.jevRouted += 1;
  else if (data.jev.outcome === "wrong") compareTally.jevWrong += 1;
  renderCompareTally();
}

export async function runManualComparison() {
  const input = document.getElementById("compare-text-input");
  const select = document.getElementById("compare-expected-select");
  const text = input.value.trim();
  if (!text) return;
  const expected = select.value === "" ? undefined : select.value === "true";
  try {
    const data = await compareText(text, expected);
    renderCompareResultRow(data);
    applyCompareResultToTally(data);
    input.value = "";
  } catch (error) {
    console.error("Manual comparison failed", error);
    alert("Comparison failed: " + error.message);
  }
}

export async function runAllPresetsComparison() {
  if (isRunningAllPresets) return;
  isRunningAllPresets = true;
  const button = document.getElementById("compare-run-all-btn");
  const originalLabel = button.innerHTML;
  button.classList.add("running");
  const presets = state.presetsList.length
    ? state.presetsList
    : (await fetchPresets()).presets || [];

  for (let index = 0; index < presets.length; index += 1) {
    const preset = presets[index];
    button.innerHTML = `⏳ Running ${index + 1}/${presets.length}...`;
    const expectedAbusive =
      preset.expectedToxicity === "mild" ||
      preset.expectedToxicity === "severe";
    try {
      const data = await compareText(preset.text, expectedAbusive);
      renderCompareResultRow(data);
      applyCompareResultToTally(data);
    } catch (error) {
      console.error("Preset comparison failed", preset, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  button.innerHTML = originalLabel;
  button.classList.remove("running");
  isRunningAllPresets = false;
}
