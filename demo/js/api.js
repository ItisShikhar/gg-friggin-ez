import { PRESETS_DATA } from './data/presets-data.js';
import {
  screenClientSide,
  compareClientSide,
  getLocalApiKey,
  setLocalApiKey,
} from './client-screener.js';
import { resolveDefaultSystem1Model } from './models.js';

let isServerAvailable = null;

async function checkServer() {
  if (isServerAvailable !== null) return isServerAvailable;
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    isServerAvailable = false;
    return false;
  }
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    isServerAvailable = res.ok;
  } catch {
    isServerAvailable = false;
  }
  return isServerAvailable;
}

export async function fetchHealth() {
  if (await checkServer()) {
    try {
      const response = await fetch('/api/health');
      if (response.ok) return await response.json();
    } catch {
      // fall through to client-side
    }
  }
  return {
    status: 'ok',
    model: resolveDefaultSystem1Model(getLocalApiKey() || '').model,
    hasApiKey: Boolean(getLocalApiKey()),
    presetsCount: PRESETS_DATA.length,
    timestamp: new Date().toISOString(),
    mode: 'client-side',
  };
}

export async function fetchPresets() {
  if (await checkServer()) {
    try {
      const response = await fetch('/api/presets');
      if (response.ok) return await response.json();
    } catch {
      // fall through to client-side
    }
  }
  return { presets: PRESETS_DATA };
}

export async function screenText(text) {
  if (await checkServer()) {
    try {
      const response = await fetch('/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (response.ok) return await response.json();
    } catch {
      // fall through to client-side
    }
  }
  return screenClientSide(text, getLocalApiKey());
}

export async function updateApiKey(apiKey) {
  setLocalApiKey(apiKey);
  if (await checkServer()) {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (response.ok) return await response.json();
    } catch {
      // fall through
    }
  }
  return { ok: true, model: resolveDefaultSystem1Model(apiKey || '').model, hasApiKey: Boolean(apiKey) };
}

export async function compareText(text, expectedAbusive) {
  if (await checkServer()) {
    try {
      const body = { text };
      if (typeof expectedAbusive === 'boolean') body.expectedAbusive = expectedAbusive;
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) return await response.json();
    } catch {
      // fall through to client-side
    }
  }
  return compareClientSide(text, getLocalApiKey(), expectedAbusive);
}
