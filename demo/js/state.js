export const state = {
  currentView: 'twitch',
  presetsList: [],
};

export const TWITCH_USERS = [
  { name: 'Raptor_Aim', color: '#ff4655', badge: 'badge-vip', badgeText: 'VIP' },
  { name: 'Karthik_99', color: '#00f59b', badge: 'badge-sub', badgeText: 'SUB' },
  { name: 'SnehaPlays', color: '#c99bf7', badge: 'badge-sub', badgeText: 'SUB' },
  { name: 'Mod_Arjun', color: '#00ad03', badge: 'badge-mod', badgeText: 'MOD' },
  { name: 'BotMaster_X', color: '#ffb800', badge: '', badgeText: '' },
  { name: 'DesiGamer_99', color: '#00f0ff', badge: 'badge-sub', badgeText: 'SUB' },
  { name: 'Rohan_VCT', color: '#e005b9', badge: 'badge-vip', badgeText: 'VIP' },
];

export const VAL_AGENTS = ['Reyna', 'Jett', 'Sova', 'Brimstone', 'Cypher', 'Phoenix', 'Killjoy', 'Omen'];

export const compareTally = {
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
};

export const twitchStats = {
  total: 0,
  blocked: 0,
  flagged: 0,
  totalCostUsd: 0,
  totalLatencyMs: 0,
};
