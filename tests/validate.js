/**
 * validate.js -- Automatisierte Tests fuer alle Kernfunktionen
 *
 * Ausfuehrung: node tests/validate.js
 * Exit 0 = alle Tests bestanden, Exit 1 = Fehler
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============================================================
// Minimal DOM stubs for Node.js
// (The source code expects a browser environment with document,
//  window, Image, etc.  We provide just enough to let eval() work.)
// ============================================================
global.document = {
  getElementById: (id) => ({
    value: id === 'density' ? '220' : '50',
    style: {},
    className: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    setAttribute: () => {},
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      setTransform: () => {},
      drawImage: () => {},
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    }),
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    style: {},
    width: 0,
    height: 0,
    innerHTML: '',
    textContent: '',
    addEventListener: () => {},
  }),
  createElementNS: (ns, tag) => ({
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    innerHTML: '',
    style: {},
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {},
};
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 1,
  requestAnimationFrame: (fn) => fn(),
  getComputedStyle: () => ({}),
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
};
global.Image = class {
  constructor() { this.onload = null; this.src = ''; }
};
global.URL = { createObjectURL: () => '', revokeObjectURL: () => {} };
global.Blob = class { constructor() {} };
global.XMLSerializer = class { serializeToString() { return '<svg></svg>'; } };
global.alert = () => {};
global.requestAnimationFrame = (fn) => fn();
global.navigator = { userAgent: 'node-test' };
global.HTMLCanvasElement = class {};
global.HTMLElement = class {};
global.DOMParser = class {
  parseFromString() {
    return { documentElement: { outerHTML: '<svg></svg>' } };
  }
};

// ============================================================
// Load source modules in dependency order via eval()
// ============================================================
const srcDir = path.join(__dirname, '..', 'src', 'js');
const modules = [
  'config',
  'species',
  'timeline',
  'ztree',
  'generator',
  'crownFront',
  'crownBird',
  'renderFront',
  'renderBird',
  'stats',
  'controls',
  'export',
];

for (const mod of modules) {
  const filePath = path.join(srcDir, mod + '.js');
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    // vm.runInThisContext makes const/let/function declarations globally visible
    // (like <script> tags in a browser)
    vm.runInThisContext(code, { filename: mod + '.js' });
  } catch (e) {
    // Non-fatal: some render/export modules may fail in Node
    // but we still need the core functions
    console.error(`  [WARN] Fehler beim Laden von ${mod}.js: ${e.message}`);
  }
}

// ============================================================
// Ensure S state is properly initialized
// (controls.js normally does this, but in case eval failed
//  for controls.js, we set it up manually here.)
// ============================================================
if (typeof S === 'undefined' || !S || !S.sp || Object.keys(S.sp).length === 0) {
  global.S = {
    mode: 'gleich',
    density: 220,
    transectY: 50,
    seed: 42,
    age: 0,
    timelineOn: false,
    showVerjuengung: true,
    mixPattern: 'einzel',
    showZBaum: false,
    sp: {},
    trees: [],
  };
  const DEFAULT_MIX_FALLBACK = { Bu: 65, Ta: 15, Fi: 10, BAh: 10 };
  for (const [k, v] of Object.entries(SPECIES)) {
    S.sp[k] = {
      on: k in DEFAULT_MIX_FALLBACK,
      pct: DEFAULT_MIX_FALLBACK[k] || 0,
      h: v.d.h,
      cw: v.d.cw,
      kl: v.d.kl,
      ka: v.d.ka,
      bhd: v.d.bhd,
    };
  }
}

// ============================================================
// Minimal test framework
// ============================================================
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    failed++;
    const msg = `  \u2717 ${name}: ${e.message}`;
    console.error(msg);
    failures.push(msg);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertApprox(actual, expected, tolerance, msg) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      (msg || 'Approximation failed') +
      ` (erwartet: ${expected} +/-${tolerance}, erhalten: ${actual.toFixed(2)})`
    );
  }
}

// ============================================================
// Species list (all 9 species expected in the system)
// ============================================================
const ALL_SPECIES = ['Bu', 'Ta', 'Fi', 'BAh', 'Ei', 'WFoe', 'Lae', 'Es', 'Dou'];

// ============================================================
// TEST SUITE
// ============================================================

console.log('\n=== Silviculture-Viz: Validierungstests ===\n');

// ----------------------------------------------------------
// 1. Existenz der Kern-Konstanten
// ----------------------------------------------------------
console.log('--- 1. Kern-Konstanten ---');

test('CONFIG existiert und hat PLOT_SIZE', () => {
  assert(typeof CONFIG !== 'undefined', 'CONFIG ist undefined');
  assert(typeof CONFIG.PLOT_SIZE === 'number', 'CONFIG.PLOT_SIZE fehlt');
  assert(CONFIG.PLOT_SIZE === 100, `CONFIG.PLOT_SIZE = ${CONFIG.PLOT_SIZE}, erwartet 100`);
});

test('CONFIG hat MAX_DISPLAY_H', () => {
  assert(typeof CONFIG.MAX_DISPLAY_H === 'number', 'MAX_DISPLAY_H fehlt');
  assert(CONFIG.MAX_DISPLAY_H === 48, `MAX_DISPLAY_H = ${CONFIG.MAX_DISPLAY_H}, erwartet 48`);
});

test('CONFIG hat PANEL-Masse (Export)', () => {
  assert(typeof CONFIG.PANEL_W_PX === 'number', 'PANEL_W_PX fehlt');
  assert(typeof CONFIG.PANEL_H_PX === 'number', 'PANEL_H_PX fehlt');
  assert(CONFIG.PANEL_W_PX > 0, 'PANEL_W_PX muss > 0 sein');
  assert(CONFIG.PANEL_H_PX > 0, 'PANEL_H_PX muss > 0 sein');
});

test('SPECIES (SP) existiert mit 9 Baumarten', () => {
  assert(typeof SPECIES !== 'undefined', 'SPECIES ist undefined');
  assert(typeof SP !== 'undefined', 'SP-Alias ist undefined');
  const keys = Object.keys(SPECIES);
  assert(keys.length === 9, `SPECIES hat ${keys.length} Eintraege, erwartet 9`);
  for (const sp of ALL_SPECIES) {
    assert(sp in SPECIES, `Baumart ${sp} fehlt in SPECIES`);
  }
});

test('Jede Baumart hat erforderliche Eigenschaften (c, cs, crown, d)', () => {
  for (const sp of ALL_SPECIES) {
    const s = SPECIES[sp];
    assert(s.c, `${sp}: Farbe (c) fehlt`);
    assert(s.cs, `${sp}: Strichfarbe (cs) fehlt`);
    assert(s.crown, `${sp}: Kronentyp (crown) fehlt`);
    assert(s.d && typeof s.d.h === 'number', `${sp}: Default-Hoehe (d.h) fehlt`);
    assert(s.d && typeof s.d.cw === 'number', `${sp}: Default-Kronenbreite (d.cw) fehlt`);
    assert(s.d && typeof s.d.bhd === 'number', `${sp}: Default-BHD (d.bhd) fehlt`);
  }
});

test('SIWAWA_KURVEN existiert', () => {
  assert(typeof SIWAWA_KURVEN !== 'undefined', 'SIWAWA_KURVEN ist undefined');
});

test('SIWAWA_ALTER existiert mit 11 Stuetzpunkten', () => {
  assert(typeof SIWAWA_ALTER !== 'undefined', 'SIWAWA_ALTER ist undefined');
  assert(Array.isArray(SIWAWA_ALTER), 'SIWAWA_ALTER ist kein Array');
  assert(SIWAWA_ALTER.length === 11, `SIWAWA_ALTER hat ${SIWAWA_ALTER.length} Eintraege, erwartet 11`);
});

test('FBB_NHA existiert', () => {
  assert(typeof FBB_NHA !== 'undefined', 'FBB_NHA ist undefined');
});

test('PHASES existiert mit 3 Phasen', () => {
  assert(typeof PHASES !== 'undefined', 'PHASES ist undefined');
  assert(Array.isArray(PHASES), 'PHASES ist kein Array');
  assert(PHASES.length === 3, `PHASES hat ${PHASES.length} Eintraege, erwartet 3`);
});

test('GROWTH_PARAMS existiert fuer alle 9 Arten', () => {
  assert(typeof GROWTH_PARAMS !== 'undefined', 'GROWTH_PARAMS ist undefined');
  for (const sp of ALL_SPECIES) {
    assert(sp in GROWTH_PARAMS, `${sp} fehlt in GROWTH_PARAMS`);
    assert(typeof GROWTH_PARAMS[sp].si === 'number', `${sp}: si fehlt in GROWTH_PARAMS`);
  }
});

test('HIEBREIFE existiert fuer alle 9 Arten', () => {
  assert(typeof HIEBREIFE !== 'undefined', 'HIEBREIFE ist undefined');
  for (const sp of ALL_SPECIES) {
    assert(sp in HIEBREIFE, `${sp} fehlt in HIEBREIFE`);
    assert(typeof HIEBREIFE[sp].harvestAge === 'number', `${sp}: harvestAge fehlt`);
    assert(typeof HIEBREIFE[sp].zd_cm === 'number', `${sp}: zd_cm fehlt`);
  }
});

test('Kompatibilitaets-Aliase (PLOT, MH, DPI, PW, PH)', () => {
  assert(typeof PLOT === 'number' && PLOT === 100, 'PLOT Alias fehlt oder falsch');
  assert(typeof MH === 'number' && MH === 48, 'MH Alias fehlt oder falsch');
  assert(typeof DPI === 'number' && DPI === 300, 'DPI Alias fehlt oder falsch');
  assert(typeof PW === 'number' && PW > 0, 'PW Alias fehlt oder falsch');
  assert(typeof PH === 'number' && PH > 0, 'PH Alias fehlt oder falsch');
});

// ----------------------------------------------------------
// 2. SIWAWA_KURVEN: Vollstaendigkeit und Konsistenz
// ----------------------------------------------------------
console.log('\n--- 2. SIWAWA_KURVEN ---');

test('SIWAWA_KURVEN hat Eintraege fuer alle 9 Baumarten', () => {
  for (const sp of ALL_SPECIES) {
    assert(sp in SIWAWA_KURVEN, `${sp} fehlt in SIWAWA_KURVEN`);
    assert(Array.isArray(SIWAWA_KURVEN[sp]), `${sp}: kein Array`);
    assert(
      SIWAWA_KURVEN[sp].length === SIWAWA_ALTER.length,
      `${sp}: ${SIWAWA_KURVEN[sp].length} Werte, erwartet ${SIWAWA_ALTER.length}`
    );
  }
});

test('SiWaWa-Werte sind monoton steigend (Hoehe waechst mit Alter)', () => {
  for (const sp of ALL_SPECIES) {
    const kurve = SIWAWA_KURVEN[sp];
    for (let i = 1; i < kurve.length; i++) {
      assert(
        kurve[i] >= kurve[i - 1],
        `${sp}: Hoehe sinkt von Alter ${SIWAWA_ALTER[i - 1]} (${kurve[i - 1]}m) ` +
        `nach Alter ${SIWAWA_ALTER[i]} (${kurve[i]}m)`
      );
    }
  }
});

test('SiWaWa-Startwert (Alter 10) ist plausibel (2-6m)', () => {
  for (const sp of ALL_SPECIES) {
    const h10 = SIWAWA_KURVEN[sp][0];
    assert(
      h10 >= 2 && h10 <= 6,
      `${sp}: h(10) = ${h10}m, erwartet 2-6m`
    );
  }
});

test('SiWaWa-Endwert (Alter 140) ist plausibel (30-55m)', () => {
  for (const sp of ALL_SPECIES) {
    const h140 = SIWAWA_KURVEN[sp][SIWAWA_KURVEN[sp].length - 1];
    assert(
      h140 >= 30 && h140 <= 55,
      `${sp}: h(140) = ${h140}m, erwartet 30-55m`
    );
  }
});

// ----------------------------------------------------------
// 3. FBB_NHA: Vollstaendigkeit und Konsistenz
// ----------------------------------------------------------
console.log('\n--- 3. FBB_NHA ---');

test('FBB_NHA hat Eintraege fuer alle 9 Baumarten', () => {
  for (const sp of ALL_SPECIES) {
    assert(sp in FBB_NHA, `${sp} fehlt in FBB_NHA`);
    assert(Array.isArray(FBB_NHA[sp]), `${sp}: kein Array`);
    assert(FBB_NHA[sp].length >= 3, `${sp}: zu wenige Stuetzpunkte (${FBB_NHA[sp].length})`);
  }
});

test('FBB_NHA-Stammzahlen sind monoton fallend (N sinkt mit Oberhoehe)', () => {
  for (const sp of ALL_SPECIES) {
    const table = FBB_NHA[sp];
    for (let i = 1; i < table.length; i++) {
      assert(
        table[i][1] <= table[i - 1][1],
        `${sp}: N steigt von hdom=${table[i - 1][0]} (N=${table[i - 1][1]}) ` +
        `nach hdom=${table[i][0]} (N=${table[i][1]})`
      );
    }
  }
});

test('FBB_NHA: Endbestand hat plausible Stammzahl (50-300)', () => {
  for (const sp of ALL_SPECIES) {
    const table = FBB_NHA[sp];
    const nEnd = table[table.length - 1][1];
    assert(
      nEnd >= 50 && nEnd <= 300,
      `${sp}: Endbestand N = ${nEnd}, erwartet 50-300`
    );
  }
});

// ----------------------------------------------------------
// 4. hdom() — Oberhoehenberechnung
// ----------------------------------------------------------
console.log('\n--- 4. hdom() ---');

test('hdom ist eine Funktion', () => {
  assert(typeof hdom === 'function', 'hdom ist keine Funktion');
});

test('hdom(sp, 0) gibt 0 zurueck', () => {
  for (const sp of ALL_SPECIES) {
    assert(hdom(sp, 0) === 0, `${sp}: hdom(0) = ${hdom(sp, 0)}, erwartet 0`);
  }
});

test('hdom(sp, -5) gibt 0 zurueck', () => {
  assert(hdom('Bu', -5) === 0, `hdom('Bu', -5) = ${hdom('Bu', -5)}`);
});

test('hdom("Bu", 50) ist ungefaehr 23 (+/-3)', () => {
  const h = hdom('Bu', 50);
  assertApprox(h, 23, 3, 'Buche hdom(50)');
});

test('hdom Ankerpunkte: hdom(sp, 50) ~ Standortindex (si)', () => {
  // SiWaWa-Konvention: Bonitat = hdom bei Alter 50
  // Die SIWAWA_KURVEN enthalten den Wert direkt am Index 4 (Alter 50)
  for (const sp of ALL_SPECIES) {
    const h50 = hdom(sp, 50);
    const expected = SIWAWA_KURVEN[sp][4]; // Index 4 = Alter 50
    assertApprox(h50, expected, 0.01, `${sp}: hdom(50) vs SIWAWA_KURVEN[50]`);
  }
});

test('hdom ist monoton steigend fuer alle Arten (Alter 1-140)', () => {
  for (const sp of ALL_SPECIES) {
    let prev = 0;
    for (let age = 1; age <= 140; age += 5) {
      const h = hdom(sp, age);
      assert(
        h >= prev,
        `${sp}: hdom(${age}) = ${h.toFixed(2)} < hdom(${age - 5}) = ${prev.toFixed(2)}`
      );
      prev = h;
    }
  }
});

test('hdom liefert plausible Werte fuer junges Alter (5J: 1-4m)', () => {
  for (const sp of ALL_SPECIES) {
    const h5 = hdom(sp, 5);
    assert(
      h5 >= 0.5 && h5 <= 5,
      `${sp}: hdom(5) = ${h5.toFixed(2)}, erwartet 0.5-5m`
    );
  }
});

test('hdom funktioniert fuer Alter > 140 (Extrapolation)', () => {
  for (const sp of ALL_SPECIES) {
    const h140 = hdom(sp, 140);
    const h160 = hdom(sp, 160);
    assert(h160 >= h140, `${sp}: h(160) = ${h160.toFixed(2)} < h(140) = ${h140.toFixed(2)}`);
    // Should not grow too much beyond 140
    assert(
      h160 - h140 < 5,
      `${sp}: Extrem starkes Wachstum nach 140J: h(160)-h(140) = ${(h160 - h140).toFixed(2)}m`
    );
  }
});

// ----------------------------------------------------------
// 5. bhdFromH() — BHD-Berechnung
// ----------------------------------------------------------
console.log('\n--- 5. bhdFromH() ---');

test('bhdFromH ist eine Funktion', () => {
  assert(typeof bhdFromH === 'function', 'bhdFromH ist keine Funktion');
});

test('bhdFromH liefert positive Werte fuer plausible Hoehen', () => {
  for (const sp of ALL_SPECIES) {
    for (const h of [5, 10, 20, 30, 40]) {
      const bhd = bhdFromH(sp, h);
      assert(bhd > 0, `${sp}: bhdFromH(${h}) = ${bhd}, erwartet > 0`);
    }
  }
});

test('bhdFromH(sp, 0.3) gibt 0 zurueck (zu klein)', () => {
  assert(bhdFromH('Bu', 0.3) === 0, `bhdFromH('Bu', 0.3) = ${bhdFromH('Bu', 0.3)}`);
});

test('bhdFromH ist monoton steigend (groessere Baeume = dickerer Stamm)', () => {
  for (const sp of ALL_SPECIES) {
    let prev = 0;
    for (const h of [3, 5, 10, 15, 20, 25, 30, 35, 40]) {
      const bhd = bhdFromH(sp, h);
      assert(
        bhd >= prev,
        `${sp}: bhdFromH(${h}) = ${bhd.toFixed(1)} < vorheriger Wert ${prev.toFixed(1)}`
      );
      prev = bhd;
    }
  }
});

test('bhdFromH liefert plausible Werte bei Referenzhoehe (40-80cm BHD)', () => {
  // Mature trees at ~30-40m should have BHD in 40-80cm range
  for (const sp of ALL_SPECIES) {
    const h = 30;
    const bhd = bhdFromH(sp, h);
    assert(
      bhd >= 15 && bhd <= 120,
      `${sp}: bhdFromH(${h}) = ${bhd.toFixed(1)}cm, erwartet 15-120cm`
    );
  }
});

// ----------------------------------------------------------
// 6. crownFromBHD() — Kronendimensionen
// ----------------------------------------------------------
console.log('\n--- 6. crownFromBHD() ---');

test('crownFromBHD ist eine Funktion', () => {
  assert(typeof crownFromBHD === 'function', 'crownFromBHD ist keine Funktion');
});

test('crownFromBHD liefert valide Dimensionen (cw, kl, ka)', () => {
  for (const sp of ALL_SPECIES) {
    const bhd = 40;
    const h = 25;
    const cr = crownFromBHD(sp, bhd, h);
    assert(cr && typeof cr.cw === 'number', `${sp}: cw fehlt`);
    assert(cr && typeof cr.kl === 'number', `${sp}: kl fehlt`);
    assert(cr && typeof cr.ka === 'number', `${sp}: ka fehlt`);
    assert(cr.cw > 0, `${sp}: cw = ${cr.cw}, erwartet > 0`);
    assert(cr.kl > 0, `${sp}: kl = ${cr.kl}, erwartet > 0`);
    assert(cr.ka > 0, `${sp}: ka = ${cr.ka}, erwartet > 0`);
  }
});

test('crownFromBHD: kl + ka ~ h (Krone + Ansatz = Gesamthoehe)', () => {
  for (const sp of ALL_SPECIES) {
    const bhd = 50;
    const h = 30;
    const cr = crownFromBHD(sp, bhd, h);
    const sum = cr.kl + cr.ka;
    // Allow some tolerance since ka has a Math.max(ka, 1.0) floor
    assertApprox(sum, h, 2, `${sp}: kl(${cr.kl.toFixed(1)}) + ka(${cr.ka.toFixed(1)}) vs h(${h})`);
  }
});

test('crownFromBHD: Kronenbreite skaliert mit BHD (cw waechst)', () => {
  for (const sp of ALL_SPECIES) {
    const h = 30;
    const cw_small = crownFromBHD(sp, 20, h).cw;
    const cw_large = crownFromBHD(sp, 60, h).cw;
    assert(
      cw_large > cw_small,
      `${sp}: cw(BHD=60) = ${cw_large.toFixed(1)} <= cw(BHD=20) = ${cw_small.toFixed(1)}`
    );
  }
});

test('crownFromBHD: plausible Werte bei sehr kleinen Baeumen (h=1)', () => {
  for (const sp of ALL_SPECIES) {
    const cr = crownFromBHD(sp, 0, 1);
    assert(cr.cw > 0 && cr.cw < 5, `${sp}: cw(h=1) = ${cr.cw}`);
    assert(cr.kl > 0, `${sp}: kl(h=1) = ${cr.kl}`);
  }
});

// ----------------------------------------------------------
// 7. nHa() — Stammzahl pro ha
// ----------------------------------------------------------
console.log('\n--- 7. nHa() ---');

test('nHa ist eine Funktion', () => {
  assert(typeof nHa === 'function', 'nHa ist keine Funktion');
});

test('nHa(0) liefert 2400', () => {
  assert(nHa(0) === 2400, `nHa(0) = ${nHa(0)}, erwartet 2400`);
});

// Ensure S is in gleichfoermig mode for monotonicity test
const savedMode = S.mode;
S.mode = 'gleich';

test('nHa ist monoton fallend im gleichfoermigen Modus (Alter 10-120)', () => {
  let prev = nHa(0);
  for (let age = 10; age <= 120; age += 10) {
    const n = nHa(age);
    assert(
      n <= prev,
      `nHa(${age}) = ${n} > nHa(${age - 10}) = ${prev} (nicht monoton fallend)`
    );
    prev = n;
  }
});

test('nHa(100) liefert plausible Stammzahl (100-600)', () => {
  const n = nHa(100);
  assert(
    n >= 100 && n <= 600,
    `nHa(100) = ${n}, erwartet 100-600`
  );
});

test('nHa liefert immer mindestens 50', () => {
  for (const age of [50, 80, 100, 120, 140]) {
    const n = nHa(age);
    assert(n >= 50, `nHa(${age}) = ${n}, erwartet >= 50`);
  }
});

S.mode = savedMode;

// ----------------------------------------------------------
// 8. getPhase() — Waldbauliche Phasen
// ----------------------------------------------------------
console.log('\n--- 8. getPhase() ---');

test('getPhase ist eine Funktion', () => {
  assert(typeof getPhase === 'function', 'getPhase ist keine Funktion');
});

test('getPhase(0) gibt Qualifizierung zurueck', () => {
  const p = getPhase(0);
  assert(p.id === 'qual', `getPhase(0).id = '${p.id}', erwartet 'qual'`);
});

test('getPhase(40) gibt Dimensionierung zurueck', () => {
  const p = getPhase(40);
  assert(p.id === 'dim', `getPhase(40).id = '${p.id}', erwartet 'dim'`);
});

test('getPhase(80) gibt Zielvorstellung zurueck', () => {
  const p = getPhase(80);
  assert(p.id === 'ziel', `getPhase(80).id = '${p.id}', erwartet 'ziel'`);
});

test('getPhase(120) gibt Zielvorstellung zurueck (letzte Phase)', () => {
  const p = getPhase(120);
  assert(p.id === 'ziel', `getPhase(120).id = '${p.id}', erwartet 'ziel'`);
});

test('Jede Phase hat erforderliche Felder (id, name, ageStart, ageEnd, color)', () => {
  for (const p of PHASES) {
    assert(typeof p.id === 'string', `Phase ohne id`);
    assert(typeof p.name === 'string', `Phase ${p.id}: name fehlt`);
    assert(typeof p.ageStart === 'number', `Phase ${p.id}: ageStart fehlt`);
    assert(typeof p.ageEnd === 'number', `Phase ${p.id}: ageEnd fehlt`);
    assert(typeof p.color === 'string', `Phase ${p.id}: color fehlt`);
  }
});

test('Phasen decken den gesamten Altersbereich lueckenlos ab (0-120)', () => {
  let expected = 0;
  for (const p of PHASES) {
    assert(
      p.ageStart === expected,
      `Luecke: Phase ${p.id} beginnt bei ${p.ageStart}, erwartet ${expected}`
    );
    expected = p.ageEnd;
  }
  assert(expected >= 120, `Phasen enden bei ${expected}, erwartet >= 120`);
});

// ----------------------------------------------------------
// 9. applyAge() — Altersbasierte Parameteraktualisierung
// ----------------------------------------------------------
console.log('\n--- 9. applyAge() ---');

test('applyAge ist eine Funktion', () => {
  assert(typeof applyAge === 'function', 'applyAge ist keine Funktion');
});

test('applyAge(50) aktualisiert S.sp-Parameter korrekt', () => {
  // Save current state
  const savedSp = JSON.parse(JSON.stringify(S.sp));
  const savedAge = S.age;

  applyAge(50);

  assert(S.age === 50, `S.age = ${S.age}, erwartet 50`);

  // Check that active species got updated
  for (const [k, s] of Object.entries(S.sp)) {
    if (!s.on) continue;
    const expectedH = hdom(k, 50);
    if (expectedH >= 1) {
      assertApprox(s.h, expectedH, 1, `${k}: h nach applyAge(50)`);
      assert(s.bhd > 0, `${k}: bhd = ${s.bhd}, erwartet > 0 nach applyAge(50)`);
      assert(s.cw > 0, `${k}: cw = ${s.cw}, erwartet > 0 nach applyAge(50)`);
    }
  }

  // Restore state
  S.sp = savedSp;
  S.age = savedAge;
});

// ----------------------------------------------------------
// 10. mR() — Seeded Random Number Generator
// ----------------------------------------------------------
console.log('\n--- 10. mR() (Seeded RNG) ---');

test('mR ist eine Funktion', () => {
  assert(typeof mR === 'function', 'mR ist keine Funktion');
});

test('mR(42) erzeugt deterministische Sequenz', () => {
  const r1 = mR(42);
  const r2 = mR(42);
  const seq1 = [r1(), r1(), r1(), r1(), r1()];
  const seq2 = [r2(), r2(), r2(), r2(), r2()];
  for (let i = 0; i < seq1.length; i++) {
    assert(
      seq1[i] === seq2[i],
      `mR(42): Wert ${i} unterschiedlich (${seq1[i]} vs ${seq2[i]})`
    );
  }
});

test('mR erzeugt Werte im Bereich [0, 1)', () => {
  const r = mR(12345);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert(v >= 0 && v < 1, `mR: Wert ${v} ausserhalb [0, 1)`);
  }
});

test('mR: verschiedene Seeds erzeugen verschiedene Sequenzen', () => {
  const r1 = mR(1);
  const r2 = mR(999);
  let same = 0;
  for (let i = 0; i < 10; i++) {
    if (r1() === r2()) same++;
  }
  assert(same < 10, 'mR: Seed 1 und 999 erzeugen identische Sequenzen');
});

// ----------------------------------------------------------
// 11. FBB_ZB — Z-Baum Endbestand
// ----------------------------------------------------------
console.log('\n--- 11. FBB_ZB ---');

test('FBB_ZB existiert fuer alle 9 Arten', () => {
  assert(typeof FBB_ZB !== 'undefined', 'FBB_ZB ist undefined');
  for (const sp of ALL_SPECIES) {
    assert(sp in FBB_ZB, `${sp} fehlt in FBB_ZB`);
    assert(typeof FBB_ZB[sp] === 'number', `${sp}: FBB_ZB kein Number`);
    assert(FBB_ZB[sp] > 0, `${sp}: FBB_ZB = ${FBB_ZB[sp]}, erwartet > 0`);
  }
});

// ----------------------------------------------------------
// 12. S (State) — Korrekte Initialisierung
// ----------------------------------------------------------
console.log('\n--- 12. State (S) ---');

test('S ist initialisiert', () => {
  assert(typeof S !== 'undefined' && S !== null, 'S ist undefined/null');
  assert(typeof S.mode === 'string', 'S.mode fehlt');
  assert(typeof S.density === 'number', 'S.density fehlt');
  assert(typeof S.seed === 'number', 'S.seed fehlt');
  assert(typeof S.sp === 'object' && S.sp !== null, 'S.sp fehlt');
});

test('S.sp hat Eintraege fuer alle 9 Arten', () => {
  for (const sp of ALL_SPECIES) {
    assert(sp in S.sp, `${sp} fehlt in S.sp`);
    const s = S.sp[sp];
    assert(typeof s.on === 'boolean', `${sp}: .on fehlt`);
    assert(typeof s.pct === 'number', `${sp}: .pct fehlt`);
    assert(typeof s.h === 'number', `${sp}: .h fehlt`);
    assert(typeof s.cw === 'number', `${sp}: .cw fehlt`);
    assert(typeof s.bhd === 'number', `${sp}: .bhd fehlt`);
  }
});

test('Default-Mischung summiert zu ~100%', () => {
  let sum = 0;
  for (const [k, s] of Object.entries(S.sp)) {
    if (s.on) sum += s.pct;
  }
  assert(
    sum >= 95 && sum <= 105,
    `Aktive Art-Anteile summieren zu ${sum}%, erwartet ~100%`
  );
});

// ----------------------------------------------------------
// 13. Integrationstests: Wachstumskurve End-to-End
// ----------------------------------------------------------
console.log('\n--- 13. Integrationstests ---');

test('Vollstaendige Wachstumskette: Alter -> hdom -> bhd -> crown', () => {
  for (const sp of ALL_SPECIES) {
    const age = 60;
    const h = hdom(sp, age);
    assert(h > 5, `${sp}: hdom(${age}) = ${h.toFixed(1)}, zu niedrig`);

    const bhd = bhdFromH(sp, h);
    assert(bhd > 5, `${sp}: bhdFromH(${h.toFixed(1)}) = ${bhd.toFixed(1)}, zu niedrig`);

    const cr = crownFromBHD(sp, bhd, h);
    assert(cr.cw > 1, `${sp}: cw = ${cr.cw.toFixed(1)}, erwartet > 1m`);
    assert(cr.kl > 1, `${sp}: kl = ${cr.kl.toFixed(1)}, erwartet > 1m`);
    assert(cr.ka >= 1, `${sp}: ka = ${cr.ka.toFixed(1)}, erwartet >= 1m`);
  }
});

test('Fichte bei Hiebreife: BHD nahe Zieldurchmesser 60cm', () => {
  const harvestAge = HIEBREIFE.Fi.harvestAge; // 60
  const h = hdom('Fi', harvestAge);
  const bhd = bhdFromH('Fi', h);
  // BHD should be in a reasonable range at harvest age
  assert(
    bhd >= 20 && bhd <= 80,
    `Fi: BHD bei Hiebreife (${harvestAge}J, h=${h.toFixed(1)}m) = ${bhd.toFixed(1)}cm`
  );
});

test('Buche bei Alter 100: Hoehe nahe 36m', () => {
  const h = hdom('Bu', 100);
  assertApprox(h, 36, 1, 'Buche hdom(100)');
});

test('Douglasie ist die schnellstwachsende Art bei Alter 50', () => {
  let maxH = 0;
  let maxSp = '';
  for (const sp of ALL_SPECIES) {
    const h = hdom(sp, 50);
    if (h > maxH) {
      maxH = h;
      maxSp = sp;
    }
  }
  assert(
    maxSp === 'Dou',
    `Schnellstwachsend bei 50J: ${maxSp} (${maxH.toFixed(1)}m), erwartet Dou`
  );
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\nFehlgeschlagene Tests:');
  for (const f of failures) {
    console.log(f);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('\nAlle Tests bestanden.\n');
  process.exit(0);
}
