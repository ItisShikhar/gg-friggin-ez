import { screenText } from './api.js';
import { getTranslation, escapeHtml } from './helpers.js';
import { state, TWITCH_USERS, twitchStats } from './state.js';
import { INITIAL_TWITCH_MESSAGES, SIMULATION_MESSAGES } from './data/twitch-messages.js';

let messageCount = 0;
let isSimulating = false;
let simulationTimeout = null;
let simMessageIndex = 0;
let isBurstMode = false;

export async function sendTwitchMessage(customText, customUser) {
  const input = document.getElementById('twitch-chat-input');
  const text = customText || input.value.trim();
  if (!text) return;
  if (!customText) input.value = '';

  const startTime = performance.now();
  let result;
  try {
    result = await screenText(text);
  } catch (error) {
    console.error('Screening error', error);
    result = {
      text,
      isProfane: false,
      isToxic: false,
      isProfaneProb: 0,
      isToxicProb: 0,
      severityScore: 0,
      severityLabel: 'Clean',
      language: 'unknown',
      languageConfidence: 0.5,
      obfuscationType: 'none',
      obfuscationTypes: ['none'],
      action: 'ALLOW',
      gated: true,
      latencyMs: Math.round(performance.now() - startTime),
      source: 'mock-heuristic',
    };
  }

  const isHarmful = result.isProfane || result.isToxic;
  const isClean = !isHarmful && result.action === 'ALLOW';
  const user = customUser || (isClean
    ? { name: 'itisshikhar', color: '#00f0ff', badges: ['sub', 'diamond'] }
    : TWITCH_USERS[Math.floor(Math.random() * TWITCH_USERS.length)]);

  const latency = document.getElementById('twitch-latency-indicator');
  if (latency) latency.textContent = `Jev Latency: ${result.latencyMs} ms`;
  updateTwitchStats(result);
  appendTwitchMessageElement(user, result);
}

function updateTwitchStats(result) {
  const isBlocked = ['AUTO_BAN', 'AUTO_CENSOR', 'AUTO_MUTE'].includes(result.action);
  const isReview = result.action === 'SUSPICIOUS_REVIEW';
  twitchStats.total += 1;
  if (isBlocked) twitchStats.blocked += 1;
  if (isReview) twitchStats.flagged += 1;
  twitchStats.totalCostUsd += result.costUsd || 0.000004;
  twitchStats.totalLatencyMs += result.latencyMs || 0;

  const total = document.getElementById('twitch-stat-total');
  if (total) total.textContent = twitchStats.total;
  const blocked = document.getElementById('twitch-stat-blocked');
  if (blocked) blocked.textContent = twitchStats.blocked;
  const flagged = document.getElementById('twitch-stat-flagged');
  if (flagged) flagged.textContent = twitchStats.flagged;
  const cost = document.getElementById('twitch-stat-cost');
  if (cost) cost.textContent = `$${twitchStats.totalCostUsd.toFixed(6)}`;
  const latency = document.getElementById('twitch-stat-latency');
  if (latency) {
    latency.textContent = twitchStats.total
      ? `${Math.round(twitchStats.totalLatencyMs / twitchStats.total)} ms`
      : '-- ms';
  }

  // Live Jev Telemetry Bar in Twitch Chat
  const twitchTotalCostEl = document.getElementById('twitch-total-cost');
  if (twitchTotalCostEl) {
    twitchTotalCostEl.textContent = `$${twitchStats.totalCostUsd.toFixed(6)}`;
  }
  const twitchLatencyEl = document.getElementById('twitch-latency-val');
  if (twitchLatencyEl) {
    twitchLatencyEl.textContent = `${result.latencyMs} ms`;
  }
}

function renderTwitchBadgeIcons(badges) {
  if (!badges || !badges.length) return '';
  return badges.map((badge) => {
    if (badge === 'sub') {
      return `<span class="chat-badge-icon" title="Subscriber"><svg width="15" height="15" viewBox="0 0 20 20" fill="#9146ff"><path d="M10 2l2.5 5.5L18 8.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L10 2z"/></svg></span>`;
    }
    if (badge === 'diamond') {
      return `<span class="chat-badge-icon" title="Bits"><svg width="15" height="15" viewBox="0 0 20 20" fill="#00b5e2"><path d="M10 2l6 8-6 8-6-8 6-8z"/></svg></span>`;
    }
    if (badge === 'diamond-pink') {
      return `<span class="chat-badge-icon" title="Bits"><svg width="15" height="15" viewBox="0 0 20 20" fill="#d946ef"><path d="M10 2l6 8-6 8-6-8 6-8z"/></svg></span>`;
    }
    if (badge === 'triangle') {
      return `<span class="chat-badge-icon" title="Prime Gaming"><svg width="15" height="15" viewBox="0 0 20 20" fill="#38bdf8"><path d="M10 3L3 17h14L10 3z"/></svg></span>`;
    }
    if (badge === 'vip') {
      return `<span class="chat-badge-icon" title="VIP"><svg width="15" height="15" viewBox="0 0 20 20" fill="#e005b9"><path d="M10 2l6 8-6 8-6-8 6-8z"/></svg></span>`;
    }
    return '';
  }).join('');
}

export function appendTwitchMessageElement(user, result) {
  const container = document.getElementById('twitch-chat-messages');
  const message = document.createElement('div');
  const isBlocked = ['AUTO_BAN', 'AUTO_CENSOR', 'AUTO_MUTE'].includes(result.action);
  const isReview = result.action === 'SUSPICIOUS_REVIEW';
  message.className = `chat-message ${isBlocked ? 'toxic-blocked' : isReview ? 'review-flagged' : ''}`;

  let badgeHtml = '';
  if (user.badges && Array.isArray(user.badges)) {
    badgeHtml = renderTwitchBadgeIcons(user.badges);
  } else if (user.badge) {
    badgeHtml = `<span class="badge ${user.badge}">${user.badgeText}</span>`;
  }

  const obfuscationTag = result.obfuscationType && result.obfuscationType !== 'none'
    ? ` [${result.obfuscationType}]`
    : '';
  const isAsciiArt = result.obfuscationType === 'ascii_art' || /\r?\n/.test(result.text);
  const chatTextClass = isAsciiArt ? 'chat-text ascii-art' : 'chat-text';
  let moderationTags = '';
  const isFlaggedOrBlocked = isBlocked || isReview;
  const translation = isFlaggedOrBlocked ? getTranslation(result.text, result.translation) : '';
  const isDifferent = Boolean(
    translation && translation.trim().toLowerCase() !== result.text.trim().toLowerCase()
  );
  const translated = isDifferent
    ? ` <span class="mod-trans-text" title="English Translation">→ "${escapeHtml(translation)}"</span>`
    : '';
  const revealedText = isAsciiArt
    ? `<span class="mod-revealed-text ascii-art">${escapeHtml(result.text)}</span>`
    : `<span class="mod-revealed-text">"${escapeHtml(result.text)}"</span>`;
  let body = '';

  const harmProb = result.isToxicProb ?? result.isProfaneProb ?? 0;

  if (isBlocked) {
    const actionNote = result.action === 'AUTO_BAN'
      ? 'Message deleted by AutoMod · user timed out'
      : 'Message deleted by AutoMod';
    moderationTags = `
      <span class="toxic-tag">${result.action}</span>
      <span class="lang-tag">${result.language.toUpperCase()} (${Math.round(harmProb * 100)}%)${obfuscationTag}</span>
    `;
    body = `
      <span class="deleted-message-note">${actionNote}</span>
      <button class="mod-reveal-btn" onclick="this.nextElementSibling.classList.toggle('shown')">👁 View</button>
      ${revealedText}${translated}
    `;
  } else if (isReview) {
    moderationTags = `
      <span class="toxic-tag" style="background: var(--warn-yellow); color: #000;">FLAGGED: REVIEW</span>
      <span class="lang-tag">${result.language.toUpperCase()} (${Math.round(harmProb * 100)}%)${obfuscationTag}</span>
    `;
    body = `<span class="${chatTextClass}">${escapeHtml(result.text)}</span>${translated}`;
  } else {
    body = `<span class="${chatTextClass}">${escapeHtml(result.text)}</span>`;
  }

  message.innerHTML = `
    ${badgeHtml}
    <span class="chat-username" style="color: ${user.color || '#efeff1'};">${user.name}:</span>
    ${moderationTags}
    ${body}
  `;
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;

  messageCount += 1;
  const count = document.getElementById('twitch-msg-count');
  if (count) count.textContent = `${messageCount} messages`;
}

export function renderInitialTwitchMessages() {
  INITIAL_TWITCH_MESSAGES.forEach((message) => {
    appendTwitchMessageElement(message.user, {
      text: message.text,
      isProfane: message.isProfane ?? false,
      isToxic: message.isToxic ?? false,
      isProfaneProb: message.isProfaneProb || 0.05,
      isToxicProb: message.isToxicProb || 0.05,
      language: message.lang,
      obfuscationType: 'none',
      obfuscationTypes: ['none'],
      action: message.action,
      severityScore: 0.0,
      severityLabel: 'Clean',
      languageConfidence: 0.95,
      gated: true,
      latencyMs: 1,
      translation: message.translation,
      source: 'demo-fixture',
    });
  });
}

export function clearTwitchChat() {
  document.getElementById('twitch-chat-messages').innerHTML = '';
  messageCount = 0;
  const count = document.getElementById('twitch-msg-count');
  if (count) count.textContent = '0 messages';

  Object.assign(twitchStats, {
    total: 0,
    blocked: 0,
    flagged: 0,
    totalCostUsd: 0,
    totalLatencyMs: 0,
  });
  const values = {
    'twitch-stat-total': '0',
    'twitch-stat-blocked': '0',
    'twitch-stat-flagged': '0',
    'twitch-stat-cost': '$0.000000',
    'twitch-stat-latency': '-- ms',
    'twitch-total-cost': '$0.000000',
    'twitch-latency-val': '-- ms',
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function scheduleNextSimulationMessage() {
  if (!isSimulating) return;
  // Natural live stream cadence: 1.4s to 2.8s between messages (or 0.6s in burst mode)
  const delay = isBurstMode ? 600 : Math.floor(Math.random() * 1400) + 1400;
  simulationTimeout = setTimeout(async () => {
    if (!isSimulating) return;
    const twitchPresets = state.presetsList.filter((preset) => preset.category === 'twitch');
    const pool = twitchPresets.length ? twitchPresets : SIMULATION_MESSAGES;
    const preset = pool[simMessageIndex % pool.length];
    simMessageIndex += 1;
    const user = TWITCH_USERS[Math.floor(Math.random() * TWITCH_USERS.length)];
    await sendTwitchMessage(preset.text, user);
    scheduleNextSimulationMessage();
  }, delay);
}

export function toggleTwitchBurstMode() {
  isBurstMode = !isBurstMode;
  const button = document.getElementById('twitch-burst-btn');
  if (!button) return;
  button.innerHTML = isBurstMode ? '⚡ Burst Mode: On' : '⚡ Burst Mode: Off';
  button.style.background = isBurstMode ? '#ffb800' : '';
  button.style.color = isBurstMode ? '#000' : '';
  if (isSimulating) {
    if (simulationTimeout) clearTimeout(simulationTimeout);
    scheduleNextSimulationMessage();
  }
}

export function toggleTwitchSimulation() {
  const simBtn = document.getElementById('twitch-sim-btn');
  const autoBtn = document.getElementById('twitch-auto-sim-btn');

  if (isSimulating) {
    isSimulating = false;
    if (simulationTimeout) clearTimeout(simulationTimeout);

    if (simBtn) {
      simBtn.classList.remove('running');
      simBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Simulate Realtime Chat</span>
      `;
    }
    if (autoBtn) {
      autoBtn.innerHTML = '▶️ Start Chat Stream Simulation';
      autoBtn.style.background = '';
    }
  } else {
    isSimulating = true;

    if (simBtn) {
      simBtn.classList.add('running');
      simBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>Stop Realtime Chat</span>
      `;
    }
    if (autoBtn) {
      autoBtn.innerHTML = '⏸️ Stop Stream Simulation';
      autoBtn.style.background = '#eb0400';
    }

    scheduleNextSimulationMessage();
  }
}
