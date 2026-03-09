// === species.js ===
/**
 * species.js — Baumart-Definitionen
 *
 * Farben (Pastell-Palette), Defaults, Kronentypen.
 * Jede Art hat:
 *   c   = Hauptfarbe Front (Pastell)
 *   cs  = Strichfarbe Front
 *   cd  = Dunklere Variante (Schatten/Textur)
 *   ct  = Hauptfarbe Top (Vogelperspektive, etwas heller)
 *   cts = Strichfarbe Top
 *   crown = Kronentyp-Key (verweist auf crownFront.js / crownBird.js)
 *   d   = Default-Parameter {h, cw, kl, ka, bhd}
 *
 * Abhängigkeiten: keine (wird nach config.js geladen)
 */

const SPECIES = {
  Bu: {
    name: 'Buche',
    lat: 'Fagus sylvatica',
    c: '#8bc68b', cs: '#6da86d', cd: '#5a9a5a',
    ct: '#a0d8a0', cts: '#7aba7a',
    crown: 'dome',
    deciduous: true,
    d: { h: 35, cw: 12, kl: 20, ka: 15, bhd: 50 }
  },
  Ta: {
    name: 'Weisstanne',
    lat: 'Abies alba',
    c: '#5b9b8b', cs: '#488878', cd: '#3a7a6a',
    ct: '#72b0a0', cts: '#5a9888',
    crown: 'layered',
    deciduous: false,
    d: { h: 40, cw: 8, kl: 16, ka: 24, bhd: 55 }
  },
  Fi: {
    name: 'Fichte',
    lat: 'Picea abies',
    c: '#7a9ec8', cs: '#6088b0', cd: '#5078a0',
    ct: '#90b0d8', cts: '#7098c0',
    crown: 'spire',
    deciduous: false,
    d: { h: 38, cw: 6, kl: 13, ka: 25, bhd: 45 }
  },
  Ei: {
    name: 'Eiche (ssp.)',
    lat: 'Quercus ssp.',
    c: '#c8b86a', cs: '#b0a050', cd: '#98883a',
    ct: '#d8c87a', cts: '#c0a860',
    crown: 'spreading',
    deciduous: true,
    d: { h: 30, cw: 14, kl: 18, ka: 12, bhd: 55 }
  },
  BAh: {
    name: 'Ahorn (ssp.)',
    lat: 'Acer ssp.',
    c: '#d4a0b0', cs: '#c08898', cd: '#a87080',
    ct: '#e0b0c0', cts: '#c898a8',
    crown: 'round',
    deciduous: true,
    d: { h: 30, cw: 10, kl: 18, ka: 12, bhd: 40 }
  },
  WFoe: {
    name: 'Waldföhre',
    lat: 'Pinus sylvestris',
    c: '#c8a87a', cs: '#b09060', cd: '#98784a',
    ct: '#d8b88a', cts: '#c0a070',
    crown: 'umbrella',
    deciduous: false,
    d: { h: 28, cw: 8, kl: 9, ka: 19, bhd: 40 }
  },
  Lae: {
    name: 'Lärche',
    lat: 'Larix decidua',
    c: '#b8d080', cs: '#a0b868', cd: '#88a050',
    ct: '#c8e090', cts: '#b0c878',
    crown: 'lightcone',
    deciduous: true,  // Sommergrün!
    d: { h: 35, cw: 7, kl: 12, ka: 23, bhd: 40 }
  },
  Es: {
    name: 'Esche',
    lat: 'Fraxinus excelsior',
    c: '#a8b8d0', cs: '#90a0b8', cd: '#7888a0',
    ct: '#b8c8e0', cts: '#a0b0c8',
    crown: 'vase',
    deciduous: true,
    d: { h: 32, cw: 10, kl: 18, ka: 14, bhd: 45 }
  },
  Dou: {
    name: 'Douglasie',
    lat: 'Pseudotsuga menziesii',
    c: '#6aaa6a', cs: '#508850', cd: '#387838',
    ct: '#80c080', cts: '#609860',
    crown: 'spire',
    deciduous: false,
    d: { h: 42, cw: 7, kl: 14, ka: 28, bhd: 55 }
  },
};

// Default active species and percentages (8a Schutzwald)
const DEFAULT_MIX = { Bu: 65, Ta: 15, Fi: 10, BAh: 10 };

// === v5-Kompatibilitäts-Aliase ===
const SP = SPECIES;
const iP = DEFAULT_MIX;

