import { state } from './state.js';

const TRANSLATION_MAP = {
  'nee oru p00da paithiyakaara da, 5colo nadatha': 'You are a crazy idiot, go stream solo',
  'dei loosu, enna comedy pandra da, semma pass ah irundhuchu haha': 'Hey crazy bro, what comedy you are doing, that was an awesome pass haha',
  'aajke match e oder team ke puro ura dilo, kono chance i dilo na': "In today's match their team got blown away, gave them zero chance",
  'nuvvu oka pichi vaadivi ra, buddi ledu asalu stream cheyaku': 'You are a crazy guy with no brain, do not even stream',
  'nin thal3 k3ttidiya guru, d0dda hu$ha nee': 'Has your head gone bad bro, you are a big madman',
  'bsdk sh1tter chup kar b4kwaas mat kar game khel': 'You idiot sh1tter shut up, do not talk nonsense and just play',
  'semma stream bro, gameplay vera level today, keep it up!': 'Awesome stream bro, gameplay is on another level today, keep it up!',
  'gg wp bro! can you play one more match before ending stream?': 'Good game well played bro! Can you play one more match before ending stream?',
  'dei bot loosu surrender panitu po da, unaku aim eh illa': 'Hey bot fool just surrender and leave, you have zero aim',
  'n e e  o r u  b o t  n a a y e': 'y o u  a r e  a  b o t  d o g',
  'abe andhe defuse kar na bsdk kyu dekh raha hai round harwa diya': 'Hey blind idiot defuse it, why are you just staring, made us lose the round',
  'un1n5tall v4lorant dog sh1t player, zero kills in 15 rounds': 'Uninstall Valorant dog sh1t player, zero kills in 15 rounds',
  'drop vandal please, let us smoke garage and rush a together': 'Drop Vandal please, let us smoke garage and rush A together',
  'tui eto baje keno khele bhai, matha nosto puro surrender kor': 'Why do you play so poorly bro, completely brain dead, just surrender',
  'guru mid push madona baa, naanu flash hakteeni a site alli': 'Bro let us push mid, I will flash on A site',
  'let us go reyna! that ace was absolutely filthy clutch!': 'LET US GO REYNA! That ace was absolutely filthy clutch!',

  // 24 Realtime Chat Presets
  'dei p00da paithiyakaara, ivanuku aim eh varla': 'Hey idiot madman, he cannot even aim',
  'abe bsdk sh1t noob, alt+f4 kar aur so ja': 'Hey idiot sh1t noob, press alt+f4 and go sleep',
  'tui ekdom boka shala, tor dara kichu hobe na': 'You are completely foolish idiot, you cannot do anything',
  'pichi vedhava laga aadaku, stream apesey ra': 'Do not play like a mad idiot, shut down the stream',
  'nin thale ketta nan magane, bot tara adtiya': 'Son of a crazy person, playing like a bot',
  'n a a y e  k a d a s i  v a r a i k u m  b o t  t h a a n': 'd o g  y o u  a r e  a  b o t  t i l l  t h e  e n d',
  'chup kar saale sh1tter bsdk 0-10 sharam kar': 'Shut up you sh1tter idiot 0-10 have some shame',
  'dei panni madri aada koodadhu da, ff podu': 'Do not play like a pig, vote forfeit',
  'tor moto kuttar baccha player konodin dekhini': 'I have never seen a dog child player like you',
  'dhedamogudu laaga aadtunnav, zero brain gameplay': 'Playing like a senseless fool, zero brain gameplay',
  'huccha naye, $hit gameplay guru ninna': 'Crazy dog, sh1t gameplay of yours bro',
  'andhe sh1t blind player, teri wajah se match har gaye': 'Blind sh1t player, because of you we lost the match',
  'vera level aim bro, semma headshot with vandal!': 'Awesome aim bro, great headshot with Vandal!',
  'kya shot mara bhai, ekdum op clutch tha round 12 mein!': 'What a shot brother, that was an absolutely overpowered clutch in round 12!',
  'darun khelcho dada, ei match ta puro amader jite jao!': 'Playing splendidly brother, this match is completely ours go win it!',
  'super ra macha, crosshair placement keka undi keep it up!': 'Super bro, crosshair placement is awesome keep it up!',
  'chindi gameplay guru, ace agide nodi vera level!': 'Fantastic gameplay bro, look you got an ace on another level!',
  'a site clear bro, plant panlam vaanga safe ah!': 'A site is clear bro, come let us plant safely!',
  'arre bhai kya mast comedy round tha haha, clean pass!': 'Oh brother what a fun comedy round haha, clean pass!',
  'tor sheriff one-tap gulo puro agun bhai, insane reaction!': 'Your Sheriff one-taps are pure fire brother, insane reaction!',
  'insane 1v3 clutch bro, you are carrying so hard today!': 'Insane 1v3 clutch bro, you are carrying so hard today!',
  'mid lo smoke vestunna, cover teesukondi rush cheyandi!': 'Deploying smoke in mid, take cover and rush together!',
  'full support nimge bro, daily stream madi super agide!': 'Full support to you bro, stream daily it is awesome!',
  'gg wp bhai! today your aim is looking super crisp, keep grinding!': 'Good game well played brother! Today your aim is looking super crisp, keep grinding!',
  'gg fuckin ez': 'Good game, excessively easy',
};

export function getTranslation(text, apiTranslation) {
  if (apiTranslation) return apiTranslation;
  const key = (text || '').trim().toLowerCase();
  if (TRANSLATION_MAP[key]) return TRANSLATION_MAP[key];
  const found = state.presetsList.find((preset) => (preset.text || '').trim().toLowerCase() === key);
  return found?.translation || text;
}

export function formatLanguage(lang) {
  const value = (lang || 'unknown').toLowerCase();
  if (value.includes('tamil')) return 'Tamil';
  if (value.includes('hinglish')) return 'Hinglish';
  if (value.includes('hindi')) return 'Hindi';
  if (value.includes('bengali')) return 'Bengali';
  if (value.includes('french')) return 'French';
  if (value.includes('japanese')) return 'Japanese';
  if (value.includes('spanish')) return 'Spanish';
  if (value.includes('german')) return 'German';
  if (value.includes('russian')) return 'Russian';
  if (value.includes('telugu')) return 'Telugu';
  if (value.includes('kannada')) return 'Kannada';
  if (value.includes('marathi')) return 'Marathi';
  if (value.includes('bhojpuri')) return 'Bhojpuri';
  if (value.includes('english')) return 'English';
  return lang.toUpperCase();
}

export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
