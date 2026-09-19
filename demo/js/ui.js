import { fetchHealth, updateApiKey } from './api.js';
import { getLocalApiKey } from './client-screener.js';
import { state } from './state.js';

export function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach((section) => section.classList.remove('active'));
  document.getElementById(`tab-${viewName}`).classList.add('active');
  document.getElementById(`view-${viewName}`).classList.add('active');
}

let outsideClickListenerAttached = false;

export function dismissApiKeyTooltip(event) {
  if (event) event.stopPropagation();
  const tooltip = document.getElementById('api-key-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

export function initApiKeyTooltip() {
  const tooltip = document.getElementById('api-key-tooltip');
  if (!tooltip) return;
  tooltip.style.display = 'block';

  if (!outsideClickListenerAttached) {
    outsideClickListenerAttached = true;
    document.addEventListener('click', (event) => {
      const currentTooltip = document.getElementById('api-key-tooltip');
      const wrapper = document.getElementById('api-key-btn-wrapper');
      if (!currentTooltip || currentTooltip.style.display === 'none') return;
      if (wrapper && !wrapper.contains(event.target)) {
        dismissApiKeyTooltip();
      }
    });
  }
}

export async function loadHealth() {
  try {
    const data = await fetchHealth();
    if (data.model) document.getElementById('model-label').textContent = data.model;
  } catch (error) {
    console.warn('Health check failed', error);
  }
}

export function openApiKeyModal() {
  dismissApiKeyTooltip();
  const input = document.getElementById('custom-api-key-input');
  if (input && !input.value) {
    try {
      input.value = localStorage.getItem('gg_friggin_ez_api_key') || '';
    } catch {}
  }
  document.getElementById('settings-modal').classList.add('open');
}

export function closeApiKeyModal() {
  document.getElementById('settings-modal').classList.remove('open');
}

export async function saveApiKey() {
  const key = document.getElementById('custom-api-key-input').value.trim();
  if (!key) {
    alert('Please enter a key or close.');
    return;
  }
  try {
    const data = await updateApiKey(key);
    if (data.ok) {
      alert(`API Key updated successfully! Active Model: ${data.model}`);
      dismissApiKeyTooltip();
      closeApiKeyModal();
      loadHealth();
    }
  } catch (error) {
    alert('Failed to update config: ' + error.message);
  }
}
