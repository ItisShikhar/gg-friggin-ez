import { screenText } from './api.js';
import { escapeHtml, formatLanguage, getTranslation } from './helpers.js';
import { VAL_AGENTS } from './state.js';

let strikes = 0;
let totalCost = 0;

export async function sendValMessage(customText) {
  const input = document.getElementById('val-chat-input');
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

  totalCost += result.costUsd || 0.000004;
  const cost = document.getElementById('val-total-cost');
  if (cost) cost.textContent = '$' + totalCost.toFixed(6);

  const logs = document.getElementById('val-chat-logs');
  const logMessage = document.createElement('div');
  logMessage.className = 'val-log-msg';

  const isBlocked = ['AUTO_BAN', 'AUTO_CENSOR'].includes(result.action);
  const isReview = result.action === 'SUSPICIOUS_REVIEW';
  const isClean = !isBlocked && !isReview;
  const agent = isClean ? 'itisshikhar' : VAL_AGENTS[Math.floor(Math.random() * VAL_AGENTS.length)];
  const translation = getTranslation(result.text, result.translation);
  const language = formatLanguage(result.language);
  const confidence = Math.round((result.languageConfidence || 0.8) * 100);
  const toxProb = result.isToxicProb ?? result.isProfaneProb ?? 0;
  const toxicity = (toxProb * 100).toFixed(1);
  const asciiArtClass = result.obfuscationType === 'ascii_art' || /\r?\n/.test(result.text)
    ? ' ascii-art'
    : '';

  if (isBlocked) {
    strikes += 1;
    const penalty = strikes >= 3 ? '⚠️ COMMS SUSPENDED (3 Strikes)' : `Strike ${strikes}/3 (Muted 3 rounds)`;
    logMessage.innerHTML = `
      <div class="val-log-row">
        <span class="val-log-channel team">(Team)</span>
        <span class="val-log-agent">${agent}:</span>
        <span class="val-log-content" style="color: #ff9ca4; font-style: italic;">
          &lt;CENSORED BY JEV: ${result.action}&gt;
        </span>
      </div>
      <div class="val-chat-inline-audit blocked">
        <div class="val-audit-headline">
          <span class="val-audit-badge blocked">🛡️ JEV ENFORCEMENT • ${result.action}</span>
          <span class="val-audit-latency">${result.latencyMs}ms</span>
        </div>
        <div class="val-audit-trans-box">
          <div class="val-trans-line">
            <span class="val-trans-tag orig">ORIGINAL</span>
            <span class="val-trans-text orig-text${asciiArtClass}">${escapeHtml(result.text)}</span>
          </div>
          <div class="val-trans-line">
            <span class="val-trans-tag trans">ENGLISH</span>
            <span class="val-trans-text trans-text">${escapeHtml(translation)}</span>
          </div>
        </div>
        <div class="val-audit-metrics">
          <span class="val-metric"><strong>Lang:</strong> ${language} [${confidence}%]</span>
          <span class="val-metric"><strong>Tox Prob:</strong> ${toxicity}%</span>
          <span class="val-metric"><strong>Severity:</strong> ${result.severityScore.toFixed(2)}/2.0 (${result.severityLabel})</span>
          <span class="val-metric"><strong>Evasion:</strong> ${result.obfuscationType}</span>
          <span class="val-metric penalty"><strong>Penalty:</strong> ${penalty}</span>
        </div>
      </div>
    `;
  } else if (isReview) {
    logMessage.innerHTML = `
      <div class="val-log-row">
        <span class="val-log-channel team">(Team)</span>
        <span class="val-log-agent">${agent}:</span>
        <span class="val-log-content${asciiArtClass}">${escapeHtml(result.text)}</span>
      </div>
      <div class="val-chat-inline-audit review">
        <div class="val-audit-headline">
          <span class="val-audit-badge review">⚠️ JEV AUDIT • LOW-CONFIDENCE REVIEW</span>
          <span class="val-audit-latency">${result.latencyMs}ms</span>
        </div>
        <div class="val-audit-trans-box">
          <div class="val-trans-line">
            <span class="val-trans-tag orig">ORIGINAL</span>
            <span class="val-trans-text orig-text${asciiArtClass}">${escapeHtml(result.text)}</span>
          </div>
          <div class="val-trans-line">
            <span class="val-trans-tag trans">ENGLISH</span>
            <span class="val-trans-text trans-text">${escapeHtml(translation)}</span>
          </div>
        </div>
        <div class="val-audit-metrics">
          <span class="val-metric"><strong>Lang:</strong> ${language}</span>
          <span class="val-metric"><strong>Tox Prob:</strong> ${toxicity}% (${result.severityLabel})</span>
          <span class="val-metric"><strong>Evasion:</strong> ${result.obfuscationType}</span>
          <span class="val-metric" style="color: #ffb800;"><strong>Policy:</strong> Gated / Human Review</span>
        </div>
      </div>
    `;
  } else {
    const hasTranslation = translation && translation.trim().toLowerCase() !== result.text.trim().toLowerCase();
    logMessage.innerHTML = `
      <div class="val-log-row">
        <span class="val-log-channel team">(Team)</span>
        <span class="val-log-agent">${agent}:</span>
        <span class="val-log-content${asciiArtClass}">${escapeHtml(result.text)}</span>
      </div>
      <div class="val-chat-inline-audit clean">
        <div class="val-audit-headline">
          <span class="val-audit-badge clean">✅ JEV AUDIT • ALLOW</span>
          <span class="val-audit-latency">${result.latencyMs}ms</span>
        </div>
        <div class="val-audit-trans-box">
          <div class="val-trans-line">
            <span class="val-trans-tag orig">ORIGINAL</span>
            <span class="val-trans-text orig-text${asciiArtClass}">${escapeHtml(result.text)}</span>
          </div>
          ${hasTranslation ? `
          <div class="val-trans-line">
            <span class="val-trans-tag trans">ENGLISH</span>
            <span class="val-trans-text trans-text">${escapeHtml(translation)}</span>
          </div>` : ''}
        </div>
        <div class="val-audit-metrics">
          <span class="val-metric"><strong>Lang:</strong> ${language}</span>
          <span class="val-metric"><strong>Tox Prob:</strong> ${toxicity}%</span>
          <span class="val-metric clean-tag">CLEAN COMM</span>
        </div>
      </div>
    `;
  }

  logs.appendChild(logMessage);
  logs.scrollTop = logs.scrollHeight;
}

const INITIAL_VALORANT_MESSAGES = [
  { type: 'broadcast', text: 'justinemastar (Reyna) spotted the SPIKE in Attacker Side Spawn' },
  { type: 'team', agent: 'Reyna', text: 'gg fuckin ez' },
  { type: 'team', agent: 'itisshikhar', text: 'bhai peeche dekh, flank aa raha hai' },
  { type: 'team', agent: 'Sova', text: 'machan pinnaadi paaru, smoke potrukaanga' },
  { type: 'broadcast', text: 'Rapkiko (Raze) thinks we should save Creds this round.' },
  { type: 'team', agent: 'Phoenix', text: 'bhai cover de, ami spike defuse korchi' },
  { type: 'broadcast', text: 'Rapkiko (Raze) wants Ghost!' },
];

export function renderInitialValorantMessages() {
  const logs = document.getElementById('val-chat-logs');
  INITIAL_VALORANT_MESSAGES.forEach((message) => {
    const element = document.createElement('div');
    element.className = 'val-log-msg';
    if (message.type === 'broadcast') {
      element.innerHTML = `
        <span class="val-log-channel broadcast">(Broadcast)</span>
        <span class="val-log-content">${escapeHtml(message.text)}</span>
      `;
    } else {
      element.innerHTML = `
        <span class="val-log-channel team">(Team)</span>
        <span class="val-log-agent">${message.agent}:</span>
        <span class="val-log-content">${escapeHtml(message.text)}</span>
      `;
    }
    logs.appendChild(element);
  });
}
