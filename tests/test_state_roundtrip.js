/**
 * test_state_roundtrip.js — QS für saveState() / applyLoadedState() / CSV
 *
 * Lädt index.html, extrahiert das Hauptscript, evaluiert es in einer
 * vollständigen DOM-Stub-Umgebung, und führt Round-Trip-Tests für
 * JSON und CSV save/load durch.
 *
 * Ausführung: node tests/test_state_roundtrip.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// === DOM STUBS ===
function makeEl(id) {
  const el = {
    id: id || '',
    value: '',
    style: {},
    className: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
    children: [],
    childNodes: [],
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild() {},
    setAttribute(n, v) { this[n] = v; },
    getAttribute(n) { return this[n] || null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600 }),
    click() {},
    focus() {},
    cloneNode() { return makeEl(); },
  };
  return el;
}

const elementMap = {};
const allElements = [];

global.document = {
  getElementById(id) {
    if (!elementMap[id]) {
      const el = makeEl(id);
      elementMap[id] = el;
      // Sensible defaults
      if (id === 'density') el.value = '220';
      if (id === 'transectY') el.value = '50';
      if (id === 'transectWidth') el.value = '10';
      if (id === 'seed') el.value = '42';
    }
    return elementMap[id];
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(tag) {
    const el = makeEl();
    el.tagName = tag.toUpperCase();
    el.getContext = () => ({
      fillRect: () => {}, clearRect: () => {}, beginPath: () => {},
      moveTo: () => {}, lineTo: () => {}, arc: () => {},
      fill: () => {}, stroke: () => {}, save: () => {}, restore: () => {},
      translate: () => {}, scale: () => {}, setTransform: () => {},
      drawImage: () => {}, measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillText: () => {},
    });
    el.toDataURL = () => 'data:image/png;base64,';
    el.width = 100; el.height = 100;
    allElements.push(el);
    return el;
  },
  createElementNS(ns, tag) { return this.createElement(tag); },
  body: makeEl('body'),
  addEventListener() {},
};

global.window = {
  addEventListener: () => {},
  innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
  requestAnimationFrame: (fn) => fn(),
  getComputedStyle: () => ({}),
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
};
global.Image = class { constructor() { this.onload = null; this.src = ''; } };
global.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
global.Blob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
global.XMLSerializer = class { serializeToString() { return '<svg></svg>'; } };
global.alert = (msg) => console.log('  [alert]', msg);
global.requestAnimationFrame = (fn) => fn();
global.navigator = { userAgent: 'node-test' };
global.HTMLCanvasElement = class {};
global.HTMLElement = class {};
global.DOMParser = class { parseFromString() { return { documentElement: { outerHTML: '<svg></svg>' } }; } };
global.FileReader = class {};

// === Code laden ===
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const mainScript = matches[1][1];

try {
  vm.runInThisContext(mainScript, { filename: 'index.html' });
} catch (e) {
  console.error('Init error:', e.message);
  // Fortfahren — manche Funktionen wie buildC könnten failen, aber S existiert vielleicht
}

// === Test framework ===
let passed = 0, failed = 0, warnings = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (e) {
    failed++;
    console.error('  \u2717 ' + name + ': ' + e.message);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'Not equal') + ': expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
}
function assertDeepEq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error((msg || 'Not deep equal') + ': expected ' + sb + ' got ' + sa);
}

// === Helper to capture saveState download ===
let lastDownload = null;
const origCreateElement = global.document.createElement.bind(global.document);
global.document.createElement = function(tag) {
  const el = origCreateElement(tag);
  if (tag === 'a') {
    el.click = function() {
      lastDownload = { name: this.download, href: this.href };
    };
  }
  return el;
};

// Capture Blob content
const blobs = {};
global.Blob = class {
  constructor(parts, opts) {
    this.parts = parts;
    this.opts = opts;
    this._content = parts.join('');
  }
};
global.URL.createObjectURL = function(blob) {
  const id = 'blob:' + Math.random().toString(36).slice(2);
  blobs[id] = blob;
  return id;
};

console.log('\n=== Round-Trip Test: saveState() / applyLoadedState() ===\n');

// === Test 1: S existiert und hat erwartete Felder ===
console.log('--- 1. State-Initialisierung ---');
test('S ist definiert', () => assert(typeof S !== 'undefined' && S, 'S not defined'));
test('S hat alle erwarteten Top-Level Felder', () => {
  const expected = ['mode','density','transectY','transectWidth','seed','age',
    'timelineOn','showVerjuengung','mixPatterns','mixPatternDefault','mixOverflow',
    'showZBaum','showTotholz','showHabitat','nHabitat','dienerMap','dienerRadius','sp'];
  for (const f of expected) {
    assert(f in S, 'Missing field: ' + f);
  }
});
test('S.sp hat Einträge für alle 11 Baumarten', () => {
  const expected = ['Bu','Ta','Fi','BAh','Ei','WFoe','Lae','Es','Dou','Li','Bi'];
  for (const k of expected) {
    assert(k in S.sp, 'Missing species: ' + k);
  }
});

// === Test 2: saveState produziert korrektes JSON ===
console.log('\n--- 2. saveState() ---');
test('saveState ist eine Funktion', () => assert(typeof saveState === 'function'));
test('saveState produziert Download', () => {
  lastDownload = null;
  saveState();
  assert(lastDownload !== null, 'No download triggered');
  assert(lastDownload.name && lastDownload.name.startsWith('waldbau-state_'), 'Wrong filename: ' + lastDownload.name);
});

// Get the saved JSON content
function getSavedJson() {
  lastDownload = null;
  saveState();
  const blob = blobs[lastDownload.href];
  return JSON.parse(blob._content);
}

test('Saved JSON enthält _meta', () => {
  const data = getSavedJson();
  assert(data._meta, 'Missing _meta');
  assertEq(data._meta.app, 'waldbau-viz');
  assert(typeof data._meta.schemaVersion === 'number');
  assert(typeof data._meta.savedAt === 'string');
});

test('Saved JSON enthält alle Top-Level Felder', () => {
  const data = getSavedJson();
  const required = ['mode','density','transectY','transectWidth','seed','age',
    'timelineOn','showVerjuengung','mixPatterns','mixPatternDefault','mixOverflow',
    'showZBaum','showTotholz','showHabitat','nHabitat','dienerMap','dienerRadius','sp'];
  for (const f of required) {
    assert(f in data, 'Missing in JSON: ' + f);
  }
});

test('Saved JSON sp hat alle Arten mit allen Feldern', () => {
  const data = getSavedJson();
  const speciesFields = ['on','pct','h','cw','kl','ka','bhd','layers','habitat'];
  for (const k of Object.keys(S.sp)) {
    assert(data.sp[k], 'Missing species in JSON: ' + k);
    for (const f of speciesFields) {
      assert(f in data.sp[k], 'Missing field ' + f + ' in species ' + k);
    }
    assert(typeof data.sp[k].layers === 'object' && data.sp[k].layers !== null);
    for (const lyr of ['O','M','U','V']) {
      assert(lyr in data.sp[k].layers, 'Missing layer ' + lyr + ' in species ' + k);
    }
  }
});

// === Test 3: Round-Trip mit modifiziertem State ===
console.log('\n--- 3. Round-Trip: Modify -> Save -> Reset -> Load -> Verify ---');

test('Round-Trip: density 220 -> 350', () => {
  S.density = 350;
  const data = getSavedJson();
  S.density = 100;
  applyLoadedState(data);
  assertEq(S.density, 350);
});

test('Round-Trip: mode gleich -> ungleich', () => {
  S.mode = 'ungleich';
  const data = getSavedJson();
  S.mode = 'gleich';
  applyLoadedState(data);
  assertEq(S.mode, 'ungleich');
});

test('Round-Trip: seed 42 -> 9999', () => {
  S.seed = 9999;
  document.getElementById('seed').value = '9999';  // saveState liest auch DOM für seed
  const data = getSavedJson();
  S.seed = 1;
  document.getElementById('seed').value = '1';
  applyLoadedState(data);
  assertEq(S.seed, 9999);
});

test('Round-Trip: age 0 -> 80, timelineOn true', () => {
  S.age = 80;
  S.timelineOn = true;
  const data = getSavedJson();
  S.age = 0;
  S.timelineOn = false;
  applyLoadedState(data);
  assertEq(S.age, 80);
  assertEq(S.timelineOn, true);
});

test('Round-Trip: transectY 50 -> 75, transectWidth 10 -> 15', () => {
  S.transectY = 75;
  S.transectWidth = 15;
  const data = getSavedJson();
  S.transectY = 0;
  S.transectWidth = 0;
  applyLoadedState(data);
  assertEq(S.transectY, 75);
  assertEq(S.transectWidth, 15);
});

test('Round-Trip: alle Booleans', () => {
  S.showVerjuengung = false;
  S.showZBaum = true;
  S.showTotholz = true;
  S.showHabitat = true;
  const data = getSavedJson();
  S.showVerjuengung = true;
  S.showZBaum = false;
  S.showTotholz = false;
  S.showHabitat = false;
  applyLoadedState(data);
  assertEq(S.showVerjuengung, false);
  assertEq(S.showZBaum, true);
  assertEq(S.showTotholz, true);
});

test('Round-Trip: mixPatterns', () => {
  S.mixPatterns.Bu = 'horst';
  S.mixPatterns.Fi = 'gruppe';
  S.mixPatterns.Ta = 'trupp';
  const data = getSavedJson();
  S.mixPatterns.Bu = 'einzel';
  S.mixPatterns.Fi = 'einzel';
  S.mixPatterns.Ta = 'einzel';
  applyLoadedState(data);
  assertEq(S.mixPatterns.Bu, 'horst');
  assertEq(S.mixPatterns.Fi, 'gruppe');
  assertEq(S.mixPatterns.Ta, 'trupp');
});

test('Round-Trip: mixOverflow', () => {
  S.mixOverflow = { Bu: 'gruppe', Ei: 'trupp' };
  const data = getSavedJson();
  S.mixOverflow = {};
  applyLoadedState(data);
  assertEq(S.mixOverflow.Bu, 'gruppe');
  assertEq(S.mixOverflow.Ei, 'trupp');
});

test('Round-Trip: dienerMap (multi-species)', () => {
  S.dienerMap = { Fi: ['Ta', 'Bu'], Ei: ['Bu', 'BAh'] };
  const data = getSavedJson();
  S.dienerMap = {};
  applyLoadedState(data);
  assertDeepEq(S.dienerMap.Fi, ['Ta', 'Bu']);
  assertDeepEq(S.dienerMap.Ei, ['Bu', 'BAh']);
});

test('Round-Trip: per-species pct/on', () => {
  S.sp.Bu.pct = 40;
  S.sp.Fi.pct = 30;
  S.sp.Bi.on = true;
  S.sp.Bi.pct = 10;
  const data = getSavedJson();
  S.sp.Bu.pct = 0;
  S.sp.Fi.pct = 0;
  S.sp.Bi.on = false;
  S.sp.Bi.pct = 0;
  applyLoadedState(data);
  assertEq(S.sp.Bu.pct, 40);
  assertEq(S.sp.Fi.pct, 30);
  assertEq(S.sp.Bi.on, true);
  assertEq(S.sp.Bi.pct, 10);
});

test('Round-Trip: per-species layers', () => {
  S.sp.Bu.layers = { O: true, M: true, U: false, V: false };
  S.sp.Ta.layers = { O: false, M: true, U: true, V: false };
  const data = getSavedJson();
  S.sp.Bu.layers = { O: true, M: false, U: false, V: false };
  S.sp.Ta.layers = { O: true, M: false, U: false, V: false };
  applyLoadedState(data);
  assertDeepEq(S.sp.Bu.layers, { O: true, M: true, U: false, V: false });
  assertDeepEq(S.sp.Ta.layers, { O: false, M: true, U: true, V: false });
});

test('Round-Trip: per-species habitat flags', () => {
  S.sp.Bu.habitat = true;
  S.sp.Ei.habitat = true;
  const data = getSavedJson();
  S.sp.Bu.habitat = false;
  S.sp.Ei.habitat = false;
  applyLoadedState(data);
  assertEq(S.sp.Bu.habitat, true);
  assertEq(S.sp.Ei.habitat, true);
  // showHabitat sollte automatisch re-derived sein
  assertEq(S.showHabitat, true);
});

test('Round-Trip: showHabitat re-derive wenn alle Habitat false', () => {
  S.sp.Bu.habitat = false;
  S.sp.Ei.habitat = false;
  for (const k of Object.keys(S.sp)) S.sp[k].habitat = false;
  S.showHabitat = false;
  const data = getSavedJson();
  S.showHabitat = true;
  applyLoadedState(data);
  assertEq(S.showHabitat, false);
});

test('Round-Trip: per-species h/cw/kl/ka/bhd (manueller Modus)', () => {
  // WICHTIG: per-Art Werte sind nur im manuellen Modus relevant.
  // Im Timeline-Modus werden sie aus dem Alter berechnet (applyAge).
  S.timelineOn = false;
  S.age = 0;
  S.sp.Bu.h = 35;
  S.sp.Bu.cw = 12;
  S.sp.Bu.kl = 22;
  S.sp.Bu.ka = 13;
  S.sp.Bu.bhd = 55;
  const data = getSavedJson();
  S.sp.Bu.h = 0;
  S.sp.Bu.cw = 0;
  S.sp.Bu.kl = 0;
  S.sp.Bu.ka = 0;
  S.sp.Bu.bhd = 0;
  applyLoadedState(data);
  assertEq(S.sp.Bu.h, 35);
  assertEq(S.sp.Bu.cw, 12);
  assertEq(S.sp.Bu.kl, 22);
  assertEq(S.sp.Bu.ka, 13);
  assertEq(S.sp.Bu.bhd, 55);
});

// === Test 4: Vollständiger State Snapshot Round-Trip ===
console.log('\n--- 4. Vollständiger State-Snapshot Round-Trip ---');

test('Kompletter Snapshot: alle Felder identisch nach Round-Trip (manueller Modus)', () => {
  // Manueller Modus damit per-Art-Werte nicht aus FBB überschrieben werden
  S.mode = 'gleich';
  S.density = 280;
  S.transectY = 60;
  S.transectWidth = 12;
  S.seed = 1234;
  document.getElementById('seed').value = '1234';
  S.age = 0;
  S.timelineOn = false;
  S.showVerjuengung = true;
  S.showZBaum = true;
  S.showTotholz = true;
  S.showHabitat = true;
  S.nHabitat = 4;
  S.dienerRadius = 10;
  S.mixPatternDefault = 'einzel';
  S.mixPatterns = { Bu: 'horst', Ta: 'einzel', Fi: 'gruppe', BAh: 'trupp',
    Ei: 'einzel', WFoe: 'einzel', Lae: 'einzel', Es: 'einzel',
    Dou: 'einzel', Li: 'einzel', Bi: 'einzel' };
  S.mixOverflow = { Bu: 'gruppe' };
  S.dienerMap = { Bu: ['Ta'] };
  S.sp.Bu.pct = 50;
  S.sp.Bu.habitat = true;
  S.sp.Bu.layers = { O: true, M: true, U: false, V: false };

  const data = getSavedJson();

  // Alles zerstören
  S.mode = 'ungleich';
  S.density = 100;
  S.seed = 1;
  S.age = 0;
  S.timelineOn = false;
  S.dienerMap = {};
  S.mixPatterns = {};
  S.mixOverflow = {};
  for (const k of Object.keys(S.sp)) {
    S.sp[k].pct = 0;
    S.sp[k].on = false;
    S.sp[k].habitat = false;
    S.sp[k].layers = { O: true, M: false, U: false, V: false };
  }

  // Wiederherstellen
  applyLoadedState(data);

  // Verifizieren
  assertEq(S.mode, 'gleich');
  assertEq(S.density, 280);
  assertEq(S.transectY, 60);
  assertEq(S.transectWidth, 12);
  assertEq(S.seed, 1234);
  assertEq(S.age, 0);
  assertEq(S.timelineOn, false);
  assertEq(S.nHabitat, 4);
  assertEq(S.dienerRadius, 10);
  assertEq(S.mixPatterns.Bu, 'horst');
  assertEq(S.mixPatterns.Fi, 'gruppe');
  assertEq(S.mixOverflow.Bu, 'gruppe');
  assertDeepEq(S.dienerMap.Bu, ['Ta']);
  assertEq(S.sp.Bu.pct, 50);
  assertEq(S.sp.Bu.habitat, true);
  assertDeepEq(S.sp.Bu.layers, { O: true, M: true, U: false, V: false });
});

// === Test 4b: Timeline-Modus Round-Trip ===
console.log('\n--- 4b. Timeline-Modus Round-Trip (per-Art aus Alter) ---');

test('Timeline-Modus: Alter wird korrekt geladen, per-Art-Werte aus FBB', () => {
  // Reset
  S.timelineOn = true;
  S.age = 60;
  S.mode = 'gleich';
  S.sp.Bu.pct = 50;
  S.sp.Bu.on = true;
  const data = getSavedJson();

  // Reset
  S.timelineOn = false;
  S.age = 0;
  applyLoadedState(data);

  assertEq(S.timelineOn, true);
  assertEq(S.age, 60);
  // Bei Alter 60 sollte Bu.h ~ 26.5m sein (SiWaWa Bu B24)
  assert(S.sp.Bu.h > 20 && S.sp.Bu.h < 35,
    'Bu.h sollte aus Alter berechnet werden, ist: ' + S.sp.Bu.h);
});

// === Test 5: Edge Cases ===
console.log('\n--- 5. Edge Cases ---');

test('Load mit fehlenden Feldern crashed nicht', () => {
  applyLoadedState({ _meta: { app: 'waldbau-viz' }, mode: 'gleich' });
  // Sollte nicht crashen
});

test('Load lehnt fremde App ab', () => {
  let threw = false;
  try {
    applyLoadedState({ _meta: { app: 'andere-app' } });
  } catch (e) { threw = true; }
  assert(threw, 'Should reject foreign app');
});

test('Load mit unbekannter Baumart wird ignoriert', () => {
  S.sp.Bu.pct = 30;
  applyLoadedState({
    _meta: { app: 'waldbau-viz' },
    sp: { ZZZ: { on: true, pct: 99 }, Bu: { pct: 45 } }
  });
  assertEq(S.sp.Bu.pct, 45);
  assert(!('ZZZ' in S.sp));
});

// === Test 6: CSV Round-Trip ===
console.log('\n--- 6. CSV Round-Trip ---');

test('stateToCsv ist eine Funktion', () => {
  assert(typeof stateToCsv === 'function');
  assert(typeof csvToState === 'function');
});

test('stateToCsv produziert CSV mit GLOBALS und SPECIES Sektion', () => {
  const csv = stateToCsv();
  assert(csv.includes('##GLOBALS'));
  assert(csv.includes('##SPECIES'));
  assert(csv.includes('mode,'));
  assert(csv.includes('species,on,pct,h,cw'));
});

test('csvToState parst GLOBALS korrekt', () => {
  const csv = '##GLOBALS\nkey,value\nmode,gleich\ndensity,250\nseed,777\ntimelineOn,false\n';
  const data = csvToState(csv);
  assertEq(data.mode, 'gleich');
  assertEq(data.density, 250);
  assertEq(data.seed, 777);
  assertEq(data.timelineOn, false);
});

test('csvToState parst SPECIES korrekt', () => {
  const csv = '##SPECIES\nspecies,on,pct,h,cw,kl,ka,bhd,layerO,layerM,layerU,layerV,habitat,mixPattern,mixOverflow,diener\nBu,true,40,28,9,18,8,40,true,false,false,false,false,horst,gruppe,Ta;BAh\nFi,true,30,32,6,20,8,42,true,false,false,false,true,einzel,,\n';
  const data = csvToState(csv);
  assertEq(data.sp.Bu.on, true);
  assertEq(data.sp.Bu.pct, 40);
  assertEq(data.sp.Bu.h, 28);
  assertDeepEq(data.sp.Bu.layers, { O: true, M: false, U: false, V: false });
  assertEq(data.mixPatterns.Bu, 'horst');
  assertEq(data.mixOverflow.Bu, 'gruppe');
  assertDeepEq(data.dienerMap.Bu, ['Ta','BAh']);
  assertEq(data.sp.Fi.habitat, true);
});

test('CSV Round-Trip: kompletter State (manueller Modus)', () => {
  S.timelineOn = false;
  S.age = 0;
  S.mode = 'gleich';
  S.density = 320;
  S.seed = 555;
  document.getElementById('seed').value = '555';
  S.transectWidth = 8;
  S.showZBaum = true;
  S.mixPatterns.Bu = 'horst';
  S.mixOverflow = { Bu: 'gruppe' };
  S.dienerMap = { Bu: ['Ta','BAh'] };
  S.sp.Bu.pct = 45;
  S.sp.Bu.layers = { O: true, M: true, U: false, V: false };
  S.sp.Bu.habitat = true;

  const csv = stateToCsv();

  S.density = 100;
  S.seed = 1;
  S.transectWidth = 10;
  S.showZBaum = false;
  S.mixPatterns.Bu = 'einzel';
  S.mixOverflow = {};
  S.dienerMap = {};
  S.sp.Bu.pct = 0;
  S.sp.Bu.layers = { O: true, M: false, U: false, V: false };
  S.sp.Bu.habitat = false;

  const data = csvToState(csv);
  applyLoadedState(data);

  assertEq(S.mode, 'gleich');
  assertEq(S.density, 320);
  assertEq(S.seed, 555);
  assertEq(S.transectWidth, 8);
  assertEq(S.showZBaum, true);
  assertEq(S.mixPatterns.Bu, 'horst');
  assertEq(S.mixOverflow.Bu, 'gruppe');
  assertDeepEq(S.dienerMap.Bu, ['Ta','BAh']);
  assertEq(S.sp.Bu.pct, 45);
  assertDeepEq(S.sp.Bu.layers, { O: true, M: true, U: false, V: false });
  assertEq(S.sp.Bu.habitat, true);
});

test('CSV mit Kommentaren und leeren Zeilen', () => {
  const csv = '# Das ist ein Kommentar\n# Noch einer\n\n##GLOBALS\nkey,value\n# Inline Kommentar\nmode,ungleich\n\ndensity,180\n\n# Ende\n';
  const data = csvToState(csv);
  assertEq(data.mode, 'ungleich');
  assertEq(data.density, 180);
});

test('CSV ja/nein als Boolean', () => {
  const csv = '##SPECIES\nspecies,on,pct,habitat\nBu,ja,50,nein\nFi,yes,30,true\nTa,nein,0,false\n';
  const data = csvToState(csv);
  assertEq(data.sp.Bu.on, true);
  assertEq(data.sp.Bu.habitat, false);
  assertEq(data.sp.Fi.on, true);
  assertEq(data.sp.Fi.habitat, true);
  assertEq(data.sp.Ta.on, false);
});

test('CSV Diener-Liste mit Semikolon', () => {
  const csv = '##SPECIES\nspecies,on,pct,diener\nFi,true,30,Ta;Bu;BAh\nEi,true,20,Bu\n';
  const data = csvToState(csv);
  assertDeepEq(data.dienerMap.Fi, ['Ta','Bu','BAh']);
  assertDeepEq(data.dienerMap.Ei, ['Bu']);
});

test('CSV CRLF Zeilenumbrueche werden akzeptiert', () => {
  const csv = '##GLOBALS\r\nkey,value\r\nmode,gleich\r\ndensity,200\r\n';
  const data = csvToState(csv);
  assertEq(data.mode, 'gleich');
  assertEq(data.density, 200);
});

// === Summary ===
console.log('\n==================================================');
console.log('Ergebnis: ' + passed + ' bestanden, ' + failed + ' fehlgeschlagen');
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);
