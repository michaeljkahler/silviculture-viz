// === controls.js ===
/**
 * controls.js — UI-Controls, State-Management, Event-Handler
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - S          — Globaler State (mode, density, transectY, seed, sp, trees)
 *   - buildC()   — Baut die Controls-UI auf
 *   - tS(k, on)  — Toggle Species ein/aus
 *   - sP(k, v)   — Set Percent für Baumart
 *   - sPr(k,p,v) — Set Parameter (h, cw, kl, ka, bhd)
 *   - uP()       — Update Percent-Summe
 *   - setMode(m) — Modus wechseln (gleich/ungleich)
 *   - uC(id, v)  — Update Control (density, transectY)
 *   - rS()       — Random Seed
 *   - regen()    — Neu generieren mit aktuellem Seed
 *   - render()   — Komplett-Rendering (genTrees + alle Views)
 *   - renderLeg()— Legende aktualisieren
 *   - uTitles()  — Titel aktualisieren
 *
 * Abhängigkeiten: species.js (SP, iP), generator.js (genTrees),
 *   renderFront.js, renderBird.js, stats.js
 */

// === Globaler State ===
let S = {
  mode: 'gleich',
  density: 220,
  transectY: 50,
  seed: 42,
  age: 0,         // 0 = manuell, >0 = altersbasiert (Zeitschiene)
  timelineOn: false,
  showVerjuengung: true,  // Naturverjüngung anzeigen (ab Zielphase)
  mixPattern: 'einzel',   // Mischungsform: einzel, trupp, gruppe, horst
  showZBaum: false,       // Z-Bäume hervorheben
  sp: {},
  trees: []
};

// State initialisieren aus Species-Definitionen
for (const [k, v] of Object.entries(SP)) {
  S.sp[k] = {
    on: k in iP,
    pct: iP[k] || 0,
    h: v.d.h,
    cw: v.d.cw,
    kl: v.d.kl,
    ka: v.d.ka,
    bhd: v.d.bhd
  };
}

/**
 * Baut die Controls-UI für alle Baumarten auf
 */
function buildC() {
  const el = document.getElementById('sc');
  let h = '';
  for (const [k, d] of Object.entries(SP)) {
    const s = S.sp[k];
    h += `<div class="spb ${s.on ? '' : 'off'}" id="spb-${k}">` +
      `<div class="sph">` +
        `<input type="checkbox" ${s.on ? 'checked' : ''} onchange="tS('${k}',this.checked)">` +
        `<div class="spi" style="background:${d.c}"><span style="color:#fff;font-size:7px;font-weight:700">${k.length > 2 ? k.substring(0, 2) : k}</span></div>` +
        `<span class="spn">${d.name}</span>` +
        `<span class="spl">${d.lat}</span>` +
      `</div>` +
      `<div class="pb">` +
        `<input type="range" min="0" max="100" step="5" value="${s.pct}" ${s.on ? '' : 'disabled'} oninput="sP('${k}',this.value)" id="pct-${k}">` +
        `<span class="pv" id="pv-${k}">${s.pct}%</span>` +
      `</div>` +
      `<div class="spp" id="spp-${k}">` +
        `<label>Höhe m<input type="number" value="${s.h}" min="5" max="55" step="1" onchange="sPr('${k}','h',this.value)"></label>` +
        `<label>Kronenbreite m<input type="number" value="${s.cw}" min="2" max="20" step=".5" onchange="sPr('${k}','cw',this.value)"></label>` +
        `<label>Kronenlänge m<input type="number" value="${s.kl}" min="2" max="40" step="1" onchange="sPr('${k}','kl',this.value)"></label>` +
        `<label>Kronenansatz m<input type="number" value="${s.ka}" min="1" max="30" step="1" onchange="sPr('${k}','ka',this.value)"></label>` +
        `<label>BHD cm<input type="number" value="${s.bhd}" min="10" max="120" step="5" onchange="sPr('${k}','bhd',this.value)"></label>` +
      `</div>` +
    `</div>`;
  }
  el.innerHTML = h;
  uP();
}

/** Toggle Species ein/aus */
function tS(k, on) {
  S.sp[k].on = on;
  if (!on) S.sp[k].pct = 0;
  document.getElementById(`pct-${k}`).disabled = !on;
  document.getElementById(`pct-${k}`).value = S.sp[k].pct;
  document.getElementById(`pv-${k}`).textContent = S.sp[k].pct + '%';
  document.getElementById(`spb-${k}`).className = 'spb ' + (on ? '' : 'off');
  uP();
  render();
}

/** Set Percent für Baumart */
function sP(k, v) {
  S.sp[k].pct = +v;
  document.getElementById(`pv-${k}`).textContent = v + '%';
  uP();
  render();
}

/** Set Parameter (h, cw, kl, ka, bhd) mit KL↔KA Synchronisation */
function sPr(k, p, v) {
  S.sp[k][p] = +v;
  // KL ↔ KA automatische Synchronisation [D005]
  if (p === 'kl') S.sp[k].ka = Math.max(S.sp[k].h - S.sp[k].kl, 1);
  if (p === 'ka') S.sp[k].kl = Math.max(S.sp[k].h - S.sp[k].ka, 1);
  if (p === 'h') S.sp[k].ka = Math.max(S.sp[k].h - S.sp[k].kl, 1);

  // Inputs aktualisieren
  const bl = document.getElementById(`spp-${k}`);
  if (bl) {
    const ins = bl.querySelectorAll('input[type=number]');
    ins[0].value = S.sp[k].h;
    ins[1].value = S.sp[k].cw;
    ins[2].value = S.sp[k].kl;
    ins[3].value = S.sp[k].ka;
    ins[4].value = S.sp[k].bhd;
  }
  render();
}

/** Update Percent-Summe Anzeige */
function uP() {
  const tot = Object.values(S.sp).reduce((a, s) => a + (s.on ? s.pct : 0), 0);
  const el = document.getElementById('pt');
  el.textContent = `Summe: ${tot}%`;
  el.className = 'pt ' + (tot === 100 ? 'ok' : 'warn');
}

/** Modus wechseln */
function setMode(m) {
  console.log('[DEBUG] setMode(' + m + ') aufgerufen');
  try {
    S.mode = m;
    document.getElementById('bg').className = m === 'gleich' ? 'active' : '';
    document.getElementById('bu').className = m === 'ungleich' ? 'active' : '';
    render();
    console.log('[DEBUG] setMode(' + m + ') erfolgreich, trees=' + S.trees.length);
  } catch(e) {
    console.error('[DEBUG] setMode FEHLER:', e);
    var d = document.getElementById('dbg-err');
    if (d) { d.style.display = 'block'; d.textContent += 'setMode FEHLER: ' + e.message + '\n'; }
  }
}

/** Naturverjüngung ein/ausschalten */
function toggleVerjuengung() {
  S.showVerjuengung = !S.showVerjuengung;
  const btn = document.getElementById('btn-vj');
  if (btn) btn.className = S.showVerjuengung ? 'active' : '';
  render();
}

/** Mischungsform setzen */
function setMixPattern(p) {
  console.log('[DEBUG] setMixPattern(' + p + ') aufgerufen');
  try {
    S.mixPattern = p;
    const opts = ['einzel', 'untergeordnet', 'trupp', 'gruppe', 'horst'];
    opts.forEach(o => {
      const el = document.getElementById('mix-' + o);
      if (el) el.className = o === p ? 'active' : '';
    });
    const desc = {
      einzel: 'Einzeln: Zufällige Verteilung der Baumarten.',
      untergeordnet: 'Untergeordnet: Hauptbaumart in Oberschicht, Nebenbaumarten in Unterschicht.',
      trupp: 'Trupp: Kleine Gruppen ≤5 Aren (3-5 Bäume gleicher Art).',
      gruppe: 'Gruppe: 5-10 Aren (10-20 Bäume gleicher Art).',
      horst: 'Horst: Grosse Flächen 10-50 Aren (>20 Bäume gleicher Art).',
    };
    const el = document.getElementById('mi-mix');
    if (el) el.textContent = desc[p] || '';
    _masterKey = ''; // Force regeneration
    render();
    console.log('[DEBUG] setMixPattern(' + p + ') erfolgreich, trees=' + S.trees.length);
  } catch(e) {
    console.error('[DEBUG] setMixPattern FEHLER:', e);
    var d = document.getElementById('dbg-err');
    if (d) { d.style.display = 'block'; d.textContent += 'setMixPattern FEHLER: ' + e.message + '\n'; }
  }
}

/** Z-Baum-Anzeige ein/ausschalten */
function toggleZBaum() {
  S.showZBaum = !S.showZBaum;
  const btn = document.getElementById('btn-zb');
  if (btn) btn.className = S.showZBaum ? 'active' : '';
  render();
}

/** Update Control (density, transectY) */
function uC(id, v) {
  S[id] = +v;
  document.getElementById(id === 'density' ? 'vd' : 'vt').textContent = v + (id === 'transectY' ? ' m' : '');
  render();
}

/** Random Seed */
function rS() {
  S.seed = Math.floor(Math.random() * 9999) + 1;
  document.getElementById('seed').value = S.seed;
  _masterKey = ''; // Cache invalidieren für neue Masterpopulation
  render();
}

/** Neu generieren mit aktuellem Seed */
function regen() {
  S.seed = +document.getElementById('seed').value;
  _masterKey = ''; // Cache invalidieren für neue Masterpopulation
  render();
}

/** Legende aktualisieren */
function renderLeg() {
  const el = document.getElementById('legend');
  let h = '';
  for (const [k, d] of Object.entries(SP)) {
    if (!S.sp[k].on || S.sp[k].pct <= 0) continue;
    h += `<div class="li"><div class="ls" style="background:${d.c}"></div>` +
         `<b>${d.name}</b> <span style="color:#aaa;font-size:10px">${S.sp[k].pct}%</span></div>`;
  }
  // Z-Baum Legende
  if (S.showZBaum && S.timelineOn) {
    const nZB = S.trees.filter(t => t.isZBaum).length;
    if (nZB > 0) {
      h += `<div class="li li-zb"><div class="ls" style="background:none;border:2px dashed #e67300;"></div>` +
           `<b style="color:#e67300;">Z-Baum</b> <span style="color:#aaa;font-size:10px">${nZB} Stk.</span></div>`;
    }
  }
  el.innerHTML = h;
}

// === Timeline-Funktionen ===

/**
 * Timeline-Modus ein/ausschalten
 * @param {boolean} on — true = Zeitschiene aktiv
 */
function setTimeline(on) {
  S.timelineOn = on;
  document.getElementById('tl-on').className = on ? 'active' : '';
  document.getElementById('tl-off').className = on ? '' : 'active';
  document.getElementById('tl-content').className = 'tl-content ' + (on ? 'visible' : 'hidden');

  // Nur Stämme/ha deaktivieren (wird im Timeline-Modus von FBB gesteuert)
  // Transekt Y und Seed bleiben immer interaktiv
  const densityRow = document.getElementById('density-row');
  if (densityRow) {
    densityRow.style.opacity = on ? '0.4' : '1';
    densityRow.style.pointerEvents = on ? 'none' : 'auto';
  }

  if (on) {
    const age = S.age || 80; // Default: 80 Jahre (Dimensionierung/Ziel-Übergang)
    setAge(age);
  } else {
    S.age = 0;
    // Manuelle Werte zurücksetzen auf Defaults
    for (const [k, v] of Object.entries(SP)) {
      if (!S.sp[k].on) continue;
      S.sp[k].h = v.d.h;
      S.sp[k].cw = v.d.cw;
      S.sp[k].kl = v.d.kl;
      S.sp[k].ka = v.d.ka;
      S.sp[k].bhd = v.d.bhd;
    }
    S.density = +document.getElementById('density').value;
    render();
  }
}

/**
 * Alter setzen und alles aktualisieren
 * @param {number} age — Bestandesalter in Jahren (0-120)
 */
function setAge(age) {
  const maxA = typeof getMaxAge === 'function' ? getMaxAge() : 120;
  age = Math.max(1, Math.min(maxA, Math.round(age)));
  S.age = age;

  // Slider-Maximum dynamisch anpassen + Wert setzen
  const slider = document.getElementById('tl-age');
  if (slider) {
    if (+slider.max !== maxA) slider.max = maxA;
    slider.value = age;
  }
  const val = document.getElementById('tl-age-val');
  if (val) val.textContent = age + ' Jahre';

  // Wachstumsdaten anwenden
  if (typeof applyAge === 'function') {
    applyAge(age);
  }

  // Density-Slider synchronisieren
  const ds = document.getElementById('density');
  if (ds) { ds.value = S.density; }
  const vd = document.getElementById('vd');
  if (vd) vd.textContent = S.density;

  // Phase-Indikator aktualisieren
  updatePhaseIndicator(age);

  // Species-Parameter in UI aktualisieren
  updateSpeciesUI();

  render();
}

/**
 * Phase-Indikator und Phase-Bar aktualisieren
 */
function updatePhaseIndicator(age) {
  if (typeof getPhase !== 'function') return;
  const phase = getPhase(age);

  const phEl = document.getElementById('tl-phase-info');
  if (phEl) {
    phEl.style.background = phase.color + '22';
    phEl.innerHTML =
      `<div class="tl-phase-dot" style="background:${phase.color}"></div>` +
      `<div><span class="tl-phase-name">${phase.name}</span><br>` +
      `<span class="tl-phase-desc">${phase.desc}</span></div>`;
  }

  // Phase-Bar Segmente highlighten
  if (typeof PHASES !== 'undefined') {
    PHASES.forEach((p, i) => {
      const seg = document.getElementById('tl-seg-' + i);
      if (seg) {
        seg.className = 'tl-phase-seg' + (p.id === phase.id ? ' active' : '');
        seg.style.opacity = p.id === phase.id ? '1' : '0.5';
      }
    });
  }

  // Stammzahl-Stats + Hiebreife-Info
  const stEl = document.getElementById('tl-stats');
  if (stEl && typeof nHa === 'function' && typeof hdom === 'function') {
    const n = nHa(age);
    // Dominante Höhe der Hauptbaumart
    let mainSp = 'Bu', mainPct = 0;
    for (const [k, s] of Object.entries(S.sp)) {
      if (s.on && s.pct > mainPct) { mainSp = k; mainPct = s.pct; }
    }
    const hMain = hdom(mainSp, age);
    // Hiebreife-Warnung
    let hrInfo = '';
    if (typeof HIEBREIFE !== 'undefined') {
      for (const [k, s] of Object.entries(S.sp)) {
        if (!s.on || s.pct <= 0) continue;
        const hr = HIEBREIFE[k];
        if (hr && age >= hr.harvestAge) {
          hrInfo += ` <span style="color:#c44;font-weight:bold;">⚠ ${k} hiebsreif</span>`;
        }
      }
    }
    stEl.innerHTML = `N/ha: <span>${n}</span> · hdom ${mainSp}: <span>${hMain.toFixed(1)}m</span>${hrInfo}`;
  }

  // === FBB Durchforstungs-Overlay ===
  // Zeigt aktuelle Massnahme und nächsten Eingriff aus FBB-Tabellen
  const dfEl = document.getElementById('tl-df-info');
  if (dfEl && typeof getIntervention === 'function' && typeof hdom === 'function') {
    let mainSp2 = 'Bu', mainPct2 = 0;
    for (const [k, s] of Object.entries(S.sp)) {
      if (s.on && s.pct > mainPct2) { mainSp2 = k; mainPct2 = s.pct; }
    }
    const hMain2 = hdom(mainSp2, age);
    const iv = getIntervention(mainSp2, hMain2);

    if (iv && iv.current) {
      const c = iv.current;
      let html = `<div style="font-size:10px;color:#555;">`;
      html += `<b style="color:#8b5e2a;">${c.massnahme}</b>`;
      if (c.entnahmeN) html += ` · Entnahme: <span style="color:#c44;">${c.entnahmeN} N/ha</span>`;
      if (c.konZB) html += ` · KON/ZB: ${c.konZB}`;
      if (c.bhdZB) html += ` · BHD<sub>ZB</sub>: ${c.bhdZB}cm`;
      if (iv.next) {
        html += `<br><span style="color:#999;">Nächst: ${iv.next.massnahme} bei hdom ${iv.next.hdom}m</span>`;
      }
      html += `</div>`;
      dfEl.innerHTML = html;
      dfEl.style.display = 'block';
    } else if (iv && iv.next) {
      dfEl.innerHTML = `<div style="font-size:10px;color:#999;">Erster Eingriff: ${iv.next.massnahme} bei hdom ${iv.next.hdom}m</div>`;
      dfEl.style.display = 'block';
    } else {
      dfEl.style.display = 'none';
    }
  }
}

/**
 * Species-Parameter-Inputs in der UI aktualisieren
 */
function updateSpeciesUI() {
  for (const [k, s] of Object.entries(S.sp)) {
    const bl = document.getElementById(`spp-${k}`);
    if (!bl) continue;
    const ins = bl.querySelectorAll('input[type=number]');
    if (ins.length >= 5) {
      ins[0].value = s.h;
      ins[1].value = s.cw;
      ins[2].value = s.kl;
      ins[3].value = s.ka;
      ins[4].value = s.bhd;
    }
  }
}

/**
 * Snap zu einem bestimmten Alter (Klick auf Snap-Punkt)
 */
function snapAge(age) {
  setAge(age);
}

/**
 * Baut die Timeline-UI auf (wird in buildC aufgerufen)
 */
function buildTimeline() {
  const el = document.getElementById('tl-container');
  if (!el) return;

  let h = '';

  // Toggle: Manuell / Zeitschiene
  h += '<div class="tl-toggle">';
  h += '<button id="tl-off" class="active" onclick="setTimeline(false)">Manuell</button>';
  h += '<button id="tl-on" onclick="setTimeline(true)">Zeitschiene</button>';
  h += '</div>';

  // Timeline-Inhalt (initial verborgen)
  h += '<div id="tl-content" class="tl-content hidden">';

  // maxA vorab berechnen (vor Verwendung in Phase-Bar)
  const maxA = typeof getMaxAge === 'function' ? getMaxAge() : 120;

  // Phase-Bar
  h += '<div class="tl-phase-bar">';
  if (typeof PHASES !== 'undefined') {
    PHASES.forEach((p, i) => {
      const w = (Math.min(p.ageEnd, maxA) - p.ageStart) / maxA * 100;
      if (w <= 0) return;
      h += `<div id="tl-seg-${i}" class="tl-phase-seg" style="width:${w}%;background:${p.color};opacity:.5"></div>`;
    });
  }
  h += '</div>';

  // Alters-Anzeige
  h += '<div class="tl-age-val" id="tl-age-val">80 Jahre</div>';

  // Slider
  h += '<div class="tl-slider-wrap">';
  h += '<input type="range" id="tl-age" min="1" max="' + maxA + '" step="1" value="80" oninput="setAge(+this.value)">';
  h += '</div>';

  // Snap-Punkte
  h += '<div class="tl-snaps">';
  if (typeof PHASE_SNAPS !== 'undefined') {
    PHASE_SNAPS.forEach(s => {
      h += `<div class="tl-snap" onclick="snapAge(${s.age || 1})">${s.age || 1}</div>`;
    });
  }
  h += '</div>';

  // Phase-Indikator
  h += '<div class="tl-phase" id="tl-phase-info"></div>';

  // Stats
  h += '<div class="tl-stats" id="tl-stats"></div>';

  // FBB Durchforstungs-Info
  h += '<div id="tl-df-info" style="margin-top:3px;padding:4px 6px;background:#fdf6ec;border-radius:4px;display:none;"></div>';

  h += '</div>'; // tl-content

  el.innerHTML = h;
}

/** Titel aktualisieren */
function uTitles() {
  const l = S.mode === 'gleich' ? 'Gleichförmiger Hochwald' : 'Ungleichförmiger Hochwald';
  const ageStr = S.timelineOn && S.age > 0 ? ` · ${S.age} Jahre` : '';
  const phaseStr = S.timelineOn && S.age > 0 && typeof getPhase === 'function'
    ? ` · ${getPhase(S.age).name}` : '';
  const mixStr = S.mixPattern !== 'einzel' ? ` · ${S.mixPattern.charAt(0).toUpperCase() + S.mixPattern.slice(1)}mischung` : '';
  document.getElementById('ft').textContent = `Frontansicht — Transekt ${CONFIG.TRANSECT_WIDTH} m · ${l}${ageStr}${phaseStr}${mixStr}`;
  document.getElementById('bt').textContent = `Vogelperspektive — 100 × 100 m · ${l}${ageStr}${mixStr}`;
  document.getElementById('mi').textContent = S.timelineOn
    ? (S.mode === 'gleich'
      ? `Zeitschiene ${S.age}J: Gleichförmig — alle Bäume ähnlich alt.`
      : `Zeitschiene ${S.age}J: Plenterwald — permanente Verjüngung, alle Altersklassen.`)
    : S.mode === 'gleich'
      ? 'Gleichförmig: Bäume ähnlicher Dimension, geringe Höhenstreuung.'
      : 'Ungleichförmig (Plenterwald): Inverse-J Verteilung, alle Entwicklungsstufen.';
}

/** Komplett-Rendering: Bäume generieren + alle Ansichten + Statistik */
function render() {
  genTrees();
  // Z-Bäume markieren (nach genTrees, vor Rendering)
  if (typeof markZBaeume === 'function') {
    markZBaeume(S.trees);
  }
  renderFront();
  renderBird();
  renderLeg();
  calcSt();
  uTitles();
}

