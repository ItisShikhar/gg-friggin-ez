import { fetchPresets } from './api.js';
import { runAllPresetsComparison, resetComparisonTally, runManualComparison } from './compare.js';
import { escapeHtml } from './helpers.js';
import { state } from './state.js';
import {
  clearTwitchChat,
  renderInitialTwitchMessages,
  sendTwitchMessage,
  toggleTwitchBurstMode,
  toggleTwitchSimulation,
} from './twitch.js';
import {
  closeApiKeyModal,
  dismissApiKeyTooltip,
  initApiKeyTooltip,
  loadHealth,
  openApiKeyModal,
  saveApiKey,
  switchView,
} from './ui.js';
import { renderInitialValorantMessages, sendValMessage } from './valorant.js';

function renderPresetRibbons() {
  const valorantBar = document.getElementById('val-presets-bar');
  const twitchPresets = state.presetsList.filter((preset) => preset.category === 'twitch' || preset.category === 'all');
  const valorantPresets = state.presetsList.filter((preset) => preset.category === 'valorant' || preset.category === 'all');

  const twitchVerticalList = document.getElementById('twitch-presets-vertical-list');
  if (twitchVerticalList) {
    twitchVerticalList.innerHTML = '';
    twitchPresets.forEach((preset) => {
      const button = document.createElement('button');
      const isClean = preset.expectedToxicity.includes('clean');
      button.className = `twitch-preset-item ${isClean ? 'clean' : 'toxic'}`;
      button.innerHTML = `
        <div class="twitch-preset-top">
          <span class="twitch-preset-tag ${isClean ? 'clean' : 'toxic'}">${isClean ? 'PASS' : 'TOXIC'}</span>
          <span class="twitch-preset-lang">${escapeHtml(preset.language.split(' ')[0])}</span>
        </div>
        <div class="twitch-preset-name">${escapeHtml(preset.label)}</div>
      `;
      button.title = `"${preset.text}"\n→ ${preset.translation || ''}\n(${preset.explanation})`;
      button.onclick = () => {
        document.getElementById('twitch-chat-input').value = preset.text;
        sendTwitchMessage();
      };
      twitchVerticalList.appendChild(button);
    });
  }

  const container = document.getElementById('val-presets-list') || valorantBar;
  if (container) {
    container.innerHTML = '';
    valorantPresets.forEach((preset) => {
      const button = document.createElement('button');
      const isClean = preset.expectedToxicity.includes('clean');
      button.className = `val-preset-item ${isClean ? 'clean' : 'toxic'}`;
      button.innerHTML = `
        <span class="val-preset-tag ${isClean ? 'clean' : 'toxic'}">${isClean ? 'PASS' : 'TOXIC'}</span>
        <span class="val-preset-lang" style="font-size: 10px; opacity: 0.75; margin-right: 4px;">[${escapeHtml(preset.language.split(' ')[0])}]</span>
        <span class="val-preset-name">${escapeHtml(preset.label)}</span>
      `;
      button.title = `"${preset.text}"\n→ ${preset.translation || ''}\n(${preset.explanation})`;
      button.onclick = () => {
        document.getElementById('val-chat-input').value = preset.text;
        sendValMessage();
      };
      container.appendChild(button);
    });
  }
}

async function loadPresets() {
  try {
    const data = await fetchPresets();
    state.presetsList = data.presets || [];
    renderPresetRibbons();
  } catch (error) {
    console.warn('Failed to load presets', error);
  }
}

Object.assign(window, {
  switchView,
  openApiKeyModal,
  closeApiKeyModal,
  saveApiKey,
  dismissApiKeyTooltip,
  initApiKeyTooltip,
  sendTwitchMessage,
  sendValMessage,
  runAllPresetsComparison,
  resetComparisonTally,
  runManualComparison,
  clearTwitchChat,
  toggleTwitchBurstMode,
  toggleTwitchSimulation,
});

document.addEventListener('DOMContentLoaded', async () => {
  initApiKeyTooltip();
  await loadHealth();
  await loadPresets();
  renderInitialTwitchMessages();
  renderInitialValorantMessages();
});
