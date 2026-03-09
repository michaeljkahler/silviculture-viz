// === generator.js ===
/**
 * generator.js — Baumgenerierung, Spacing, Modus-Logik, Seeded RNG
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - mR(seed)    — Mulberry32 Seeded Random Number Generator
 *   - genTrees()  — Generiert Baumliste basierend auf State S
 *   - W(j,f,a)    — Wellenform-Hilfsfunktion (Wobble)
 *   - genTimelineMaster() — Master-Population für persistente Zeitschiene
 *
 * Abhängigkeiten: config.js (PLOT), species.js (SP), controls.js (S),
 *   timeline.js (applyAge, hdom, bhdFromH, crownFromBHD — optional)
 * Wird benötigt von: renderFront.js, renderBird.js, stats.js
 */

let rng;

/**
 * Mulberry32 — Seeded Pseudo-Random Number Generator
 * Gibt eine Funktion zurück die bei jedem Aufruf einen Wert [0,1) liefert.
 */
function mR(s) {
  return function() {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Wellenform-Hilfsfunktion für organische Variationen
 * @param {number} j - Jitter/Phase
 * @param {number} f - Frequenz
 * @param {number} a - Amplitude
 */
const W = (j, f, a) => Math.sin(j * f) * a;

// === Timeline Master-Population ===
// Persistente Bäume: gleiche Positionen über alle Altersstufen.
// Bäume mit niedrigem survivalRank überleben am längsten.
let _masterKey = '';
let _masterTrees = [];
let _untergeordnetMinor = null; // Set of minor species in 'untergeordnet' mode

/**
 * Generiert eine Master-Population für den Zeitschienen-Modus.
 *
 * Positionen: Gejittertes Hexagonalgitter (≈1500 Punkte auf 100×100m).
 *
 * Survival-Rang: RÄUMLICH GESCHICHTET (nicht zufällig!).
 * → Fläche wird rekursiv in Zellen aufgeteilt.
 *   In jeder Runde überlebt pro Zelle ein Baum.
 *   → Für jedes N sind die Überlebenden gleichmässig verteilt.
 *   → Grid-Deckungsgrad ≈ Raw-Deckungsgrad (minimale Überlappung).
 *
 * [Designentscheidung D007: Hex-Gitter + stratifizierter Survival]
 */
function genTimelineMaster() {
  const maxN = 2400; // FBB: max 2400 N/ha (Fichte/Tanne Jungbestand)
  const masterRng = mR(S.seed);
  const ac = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
  const tP = ac.reduce((a, [_, s]) => a + s.pct, 0);

  if (!tP) { _masterTrees = []; return; }

  // --- Gejittertes Hexagonalgitter ---
  const area = PLOT * PLOT;
  const hexSpacing = Math.sqrt(area * 2 / (maxN * Math.sqrt(3)));
  const jitterAmt = hexSpacing * 0.18;
  const margin = 2;

  const gridPoints = [];
  const rowH = hexSpacing * Math.sqrt(3) / 2;
  let row = 0;
  for (let y = margin; y < PLOT - margin; y += rowH) {
    const xOff = (row % 2 === 1) ? hexSpacing / 2 : 0;
    for (let x = margin + xOff; x < PLOT - margin; x += hexSpacing) {
      const jx = x + (masterRng() - 0.5) * 2 * jitterAmt;
      const jy = y + (masterRng() - 0.5) * 2 * jitterAmt;
      if (jx >= margin && jx <= PLOT - margin && jy >= margin && jy <= PLOT - margin) {
        gridPoints.push({ x: jx, y: jy });
      }
    }
    row++;
  }
  while (gridPoints.length > maxN) {
    gridPoints.splice(Math.floor(masterRng() * gridPoints.length), 1);
  }

  // --- Räumlich stratifizierter Survival-Rang ---
  // Rekursive Zell-Ebenen: 5×5, 10×10, 20×20, 40×40 Zellen
  // In jeder Runde pro Zelle 1 Baum → gleichmässige Verteilung der Überlebenden
  const totalN = gridPoints.length;
  const survRanks = new Float64Array(totalN); // 0=überlebt am längsten

  // Gruppen-basierte Rang-Vergabe
  const cellLevels = [5, 10, 15, 20, 30, 40]; // Zunehmend fein
  let rankCounter = 0;
  const assigned = new Uint8Array(totalN); // 0=noch nicht zugewiesen

  for (const nCells of cellLevels) {
    const cellW = PLOT / nCells;
    // Sammle nicht-zugewiesene Bäume pro Zelle
    const cells = {};
    for (let i = 0; i < totalN; i++) {
      if (assigned[i]) continue;
      const cx = Math.min(nCells - 1, Math.floor(gridPoints[i].x / cellW));
      const cy = Math.min(nCells - 1, Math.floor(gridPoints[i].y / cellW));
      const key = cx + '_' + cy;
      if (!cells[key]) cells[key] = [];
      cells[key].push(i);
    }
    // Pro Zelle: einen zufälligen Baum auswählen
    const cellKeys = Object.keys(cells);
    // Shuffle cell order
    for (let i = cellKeys.length - 1; i > 0; i--) {
      const j = Math.floor(masterRng() * (i + 1));
      const tmp = cellKeys[i]; cellKeys[i] = cellKeys[j]; cellKeys[j] = tmp;
    }
    for (const key of cellKeys) {
      const arr = cells[key];
      if (!arr.length) continue;
      // Zufällig einen aus der Zelle wählen
      const pick = Math.floor(masterRng() * arr.length);
      const idx = arr[pick];
      survRanks[idx] = rankCounter++;
      assigned[idx] = 1;
    }
  }
  // Restliche Bäume: zufällige Ränge am Ende
  for (let i = 0; i < totalN; i++) {
    if (!assigned[i]) {
      survRanks[i] = rankCounter + masterRng();
    }
  }

  // --- Baumarten zuweisen ---
  // Mischungsform bestimmt räumliche Verteilung der Arten:
  //   einzel: Zufällige Einzelmischung (Fisher-Yates Shuffle)
  //   trupp:  Kleine Cluster ≤5 Aren (~12m Radius, 3-5 Bäume)
  //   gruppe: Mittlere Cluster 5-10 Aren (~18m Radius, 10-20 Bäume)
  //   horst:  Grosse Cluster 10-50 Aren (~30m Radius, >20 Bäume)
  // Ref: BLFw426 2025, Schütz (2003): Mischungsformen
  const cn = [];
  let u = 0;
  ac.forEach(([k, s], i) => {
    const n = i === ac.length - 1 ? totalN - u : Math.round(totalN * s.pct / tP);
    cn.push({ k, n });
    u += n;
  });

  let spArr;
  const mixP = (typeof S !== 'undefined' && S.mixPattern) ? S.mixPattern : 'einzel';

  _untergeordnetMinor = null; // Reset bei jedem Modus
  if (mixP === 'einzel') {
    // Einzelmischung: Zufällige Verteilung
    spArr = [];
    for (const { k, n } of cn) {
      for (let i = 0; i < n; i++) spArr.push(k);
    }
    for (let i = spArr.length - 1; i > 0; i--) {
      const j = Math.floor(masterRng() * (i + 1));
      const tmp = spArr[i]; spArr[i] = spArr[j]; spArr[j] = tmp;
    }
  } else if (mixP === 'untergeordnet') {
    // Untergeordnete Mischung: Hauptbaumart in Oberschicht, Nebenbaumarten in Unterschicht
    // Räumlich zufällig verteilt (wie Einzelmischung), aber Nebenbaumarten werden
    // über hVar in die Unterschicht gedrückt (in genTrees via _isMinorSpecies Flag).
    // Ref: Schütz (2003) — Nebenbaumarten im Zwischenstand/Unterstand
    const sorted = [...ac].sort((a, b) => b[1].pct - a[1].pct);
    const dominantSp = sorted[0][0];
    const minorSet = new Set(sorted.slice(1).map(s => s[0]));

    // Alle Arten nach Prozent verteilen, räumlich zufällig (Fisher-Yates Shuffle)
    spArr = [];
    for (const { k, n } of cn) {
      for (let i = 0; i < n; i++) spArr.push(k);
    }
    for (let i = spArr.length - 1; i > 0; i--) {
      const j = Math.floor(masterRng() * (i + 1));
      const tmp = spArr[i]; spArr[i] = spArr[j]; spArr[j] = tmp;
    }

    // Merke welche Arten untergeordnet sind (wird im tree-Objekt gespeichert)
    // _untergeordnetMinor Set wird unten beim tree-push verwendet
    _untergeordnetMinor = minorSet;
  } else {
    // Clustered: Trupp/Gruppe/Horst
    // Generiere Cluster-Zentren und weise Bäume nach Nähe zu
    const clusterR = mixP === 'trupp' ? 12 : mixP === 'gruppe' ? 18 : 30;
    const nClusters = Math.max(ac.length, Math.round(PLOT * PLOT / (Math.PI * clusterR * clusterR)));

    // Erzeuge Cluster-Zentren mit zugewiesener Baumart
    // Fix: Proportionale Zuweisung garantiert, dass jede Art mindestens 1 Cluster erhält
    const clusters = [];
    const guaranteed = [];
    for (const [k, s] of ac) {
      const count = Math.max(1, Math.round(nClusters * s.pct / tP));
      for (let g = 0; g < count && guaranteed.length < nClusters; g++) {
        guaranteed.push(k);
      }
    }
    // Restliche Cluster proportional auffüllen
    while (guaranteed.length < nClusters) {
      let rVal = masterRng() * tP;
      let chosenSp = ac[0][0];
      for (const [k, s] of ac) {
        rVal -= s.pct;
        if (rVal <= 0) { chosenSp = k; break; }
      }
      guaranteed.push(chosenSp);
    }
    // Mischen für räumliche Durchmischung
    for (let i = guaranteed.length - 1; i > 0; i--) {
      const j = Math.floor(masterRng() * (i + 1));
      const tmp = guaranteed[i]; guaranteed[i] = guaranteed[j]; guaranteed[j] = tmp;
    }
    for (let ci = 0; ci < nClusters; ci++) {
      const cx = masterRng() * (PLOT - 4) + 2;
      const cy = masterRng() * (PLOT - 4) + 2;
      clusters.push({ x: cx, y: cy, sp: guaranteed[ci] });
    }

    // Jeder Baum wird dem nächsten Cluster zugewiesen
    spArr = new Array(totalN);
    for (let i = 0; i < totalN; i++) {
      const px = gridPoints[i].x;
      const py = gridPoints[i].y;
      let bestDist = Infinity;
      let bestSp = ac[0][0];
      for (const cl of clusters) {
        const d = Math.hypot(cl.x - px, cl.y - py);
        if (d < bestDist) { bestDist = d; bestSp = cl.sp; }
      }
      spArr[i] = bestSp;
    }
  }

  const trees = [];
  for (let i = 0; i < totalN; i++) {
    const sp = spArr[i] || ac[0][0];
    // Untergeordnete Mischung: Nebenbaumarten bekommen jüngeres indAge
    // (über ageOffset), sodass sie natürlich in der Unterschicht wachsen.
    // Dominant: normaler ageOffset (±15%), Minor: -40% bis -70% jünger
    const isMinor = _untergeordnetMinor && _untergeordnetMinor.has(sp);
    const ageOff = isMinor
      ? -(0.40 + masterRng() * 0.30)  // -40% bis -70% → deutlich jünger/kleiner
      : masterRng() * 0.30 - 0.15;    // ±15% normal
    trees.push({
      sp,
      x: gridPoints[i].x,
      y: gridPoints[i].y,
      jit: masterRng() * 6.28,
      survivalRank: survRanks[i],
      ageOffset: ageOff,
      hVar: 0.90 + masterRng() * 0.20,
      cwVar: 0.85 + masterRng() * 0.30,
      klVar: 0.90 + masterRng() * 0.20,
      isMinorSpecies: isMinor || false,
    });
  }

  trees.sort((a, b) => a.survivalRank - b.survivalRank);

  // === Z-Bäume auf Master-Population markieren (persistent über Altersstufen) ===
  // Endabstände pro Art (aus FBB_ZB Kommentaren)
  const ZB_ENDABSTAND = {
    Fi: 8, Ta: 8, Bu: 11, Ei: 15, Es: 12, BAh: 12, WFoe: 11, Lae: 11, Dou: 9
  };
  // Z-Bäume pro Art bestimmen: nach survivalRank (niedrigster = bester/grösster)
  const acZB = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
  const tPzb = acZB.reduce((a, [_, s]) => a + s.pct, 0);
  trees.forEach(t => { t.isZBaum = false; });

  for (const [k, s] of acZB) {
    if (!s.on || s.pct <= 0) continue;
    const zbTotal = FBB_ZB[k] || 100;
    // Proportional auf Plot-Fläche (1ha = 10000m², Plot = PLOT²)
    const plotArea = (typeof PLOT !== 'undefined' ? PLOT * PLOT : 10000);
    const zbOnPlot = Math.round(zbTotal * (plotArea / 10000) * s.pct / tPzb);
    const minDist = ZB_ENDABSTAND[k] || 10;

    // Kandidaten: Bäume dieser Art, nach survivalRank (niedrigster = stärkster)
    const candidates = trees
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.sp === k);
    // survivalRank ist bereits sortiert (trees sind sortiert)

    let marked = 0;
    for (const { t: cand, i: ci } of candidates) {
      if (marked >= zbOnPlot) break;
      // Abstandscheck: kein anderer Z-Baum innerhalb minDist
      let tooClose = false;
      for (let j = 0; j < trees.length; j++) {
        if (!trees[j].isZBaum) continue;
        const d = Math.hypot(cand.x - trees[j].x, cand.y - trees[j].y);
        if (d < minDist) { tooClose = true; break; }
      }
      if (!tooClose) {
        trees[ci].isZBaum = true;
        marked++;
      }
    }
  }

  _masterTrees = trees;
}

/**
 * Generiert Baumliste basierend auf aktuellem State S
 * Platziert Bäume mit Mindestabstand auf 100×100m Plot
 *
 * Zeitschienen-Modus (S.age > 0):
 *   Verwendet Master-Population → Bäume sind persistent über Altersstufen.
 *   Bei höherem Alter: weniger Bäume (Mortalität), gleiche Positionen.
 *
 * Manueller Modus (S.age = 0):
 *   Klassische Generierung wie bisher.
 */
function genTrees() {
  const useTimeline = S.age > 0 && typeof hdom === 'function';

  if (useTimeline) {
    // --- Zeitschienen-Modus: Master-Population verwenden ---

    // Cache-Key: Seed + aktive Arten + Prozente + Modus
    const key = S.seed + '_' + S.mode + '_' + Object.entries(S.sp)
      .filter(([_, s]) => s.on && s.pct > 0)
      .map(([k, s]) => k + s.pct)
      .join(',');

    if (key !== _masterKey) {
      genTimelineMaster();
      _masterKey = key;
    }

    // Wie viele Bäume überleben bei diesem Alter?
    const nSurvive = Math.min(Math.round(S.density), _masterTrees.length);

    // === Plenterwald (ungleich): breite Altersverteilung ===
    // Im Plenterwald gibt es alle Entwicklungsstufen gleichzeitig.
    // Inverse-J Durchmesserverteilung: viele kleine, wenige grosse Bäume.
    // Ref: Schütz (2002), Plenterskript Abb. 1.1
    const isPlenter = S.mode === 'ungleich';

    const trees = [];
    for (let i = 0; i < nSurvive; i++) {
      const mt = _masterTrees[i];

      let indAge;
      if (isPlenter) {
        // Plenterwald: Jeder Baum hat ein individuelles Alter
        // von Jungwuchs (1J) bis zum ältesten Bestandesalter.
        // Niedrige survivalRank-Bäume = die ältesten/grössten.
        // Inverse-J: Die meisten Bäume sind jung.
        const relRank = i / Math.max(nSurvive - 1, 1); // 0=ältester, 1=jüngster
        // Exponentiell: mehr junge Bäume (Plenter-Gleichgewicht)
        const ageFrac = Math.pow(1 - relRank, 0.6); // 1→0 (alt→jung)
        const maxAge = typeof getMaxAge === 'function' ? getMaxAge() : 120;
        const ageRange = Math.min(S.age, maxAge);
        indAge = Math.max(1, ageRange * ageFrac * (0.9 + mt.ageOffset * 0.4));
      } else {
        // Gleichförmig: alle ähnlich alt (±15% Variation)
        indAge = Math.max(1, S.age * (1 + mt.ageOffset));
      }

      const hBase = hdom(mt.sp, indAge);
      const h = Math.max(hBase * mt.hVar, 0.5);

      let cw, kl, ka, bhd;
      if (h < 1.3) {
        // Jungwuchs
        bhd = 0;
        cw = Math.max(h * 0.4, 0.3);
        kl = Math.max(h * 0.8, 0.3);
        ka = Math.max(h - kl, 0.1);
      } else {
        bhd = bhdFromH(mt.sp, h);
        const crown = crownFromBHD(mt.sp, bhd, h);
        cw = crown.cw * mt.cwVar;
        kl = crown.kl * mt.klVar;
        ka = Math.max(h - kl, 1);

        // Plenterwald: Kronenlänge nach Schichtposition anpassen (Schütz 2002)
        // Unterschicht (<10m): ~30% → kl *= 0.55
        // Mittelschicht (10-25m): ~45% → kl *= 0.80
        // Oberschicht (>25m): unverändert
        if (isPlenter && h > 2) {
          const klFactor = h < 10 ? 0.55 : h < 25 ? 0.55 + (h - 10) / 15 * 0.45 : 1.0;
          kl *= klFactor;
          ka = Math.max(h - kl, 1);
        }
      }

      // === Hiebreife-Check: Baum wird geerntet wenn indAge > harvestAge + 8 ===
      const hr5 = HIEBREIFE[mt.sp];
      if (hr5 && indAge > hr5.harvestAge + 8) {
        if (isPlenter) {
          // Plenterwald (Dauerwald): Alten Baum durch jungen ersetzen (Verjüngung)
          const youngAge = 1 + Math.random() * 10;
          const youngH = hdom(mt.sp, youngAge);
          trees.push({
            sp: mt.sp, x: mt.x, y: mt.y,
            h: youngH, cw: Math.max(youngH * 0.4, 0.3), kl: Math.max(youngH * 0.8, 0.3),
            ka: Math.max(youngH * 0.2, 0.1), bhd: youngH > 1.3 ? bhdFromH(mt.sp, youngH) : 0,
            jit: mt.jit, indAge: Math.round(youngAge), isVerjuengung: true
          });
        }
        continue; // Gleichförmig: Baum gefällt, nicht ersetzen
      }

      trees.push({
        sp: mt.sp, x: mt.x, y: mt.y,
        h, cw, kl, ka, bhd,
        jit: mt.jit,
        indAge: Math.round(indAge),
        isZBaum: mt.isZBaum || false  // Persistent vom Master übernehmen
      });
    }
    // === Naturverjüngung (ab Zielphase, fakultativ) ===
    // Artspezifischer Verjüngungsbeginn: min(harvestAge) - 20 der aktiven Arten
    // Im Plenterwald: permanente Verjüngung ab ~40J
    // Ref: BLFw426 2026 Slide 2, Schütz (2002)
    const acVj6 = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
    let minHarvest = 100;
    for (const [k6] of acVj6) {
      if (HIEBREIFE[k6]) minHarvest = Math.min(minHarvest, HIEBREIFE[k6].harvestAge);
    }
    const vjStart = isPlenter ? 40 : Math.max(20, minHarvest - 20);
    if (S.showVerjuengung && S.age >= vjStart) {
      const vjRng = mR(S.seed + 7777);
      // Verjüngungsintensität steigt mit Alter — stärker in Zielphase
      const vjIntensity = Math.min(1.0, (S.age - vjStart) / 30); // 0→1 über 30 Jahre
      const maxVJ = Math.round(vjIntensity * (isPlenter ? 200 : 350));

      const vjSpecies = [];
      for (const [k6, s6] of acVj6) {
        for (let i = 0; i < Math.round(s6.pct / 10); i++) vjSpecies.push(k6);
      }
      if (vjSpecies.length === 0) vjSpecies.push('Bu');

      for (let i = 0; i < maxVJ; i++) {
        const x = vjRng() * 88 + 6;
        const y = vjRng() * 88 + 6;

        // Lückenprüfung gelockert: cw * 0.5 statt 0.3
        let inGap = true;
        for (const t of trees) {
          if (t.isVerjuengung) continue;
          const dist = Math.hypot(t.x - x, t.y - y);
          if (dist < t.cw * 0.5) { inGap = false; break; }
        }

        if (inGap) {
          const sp = vjSpecies[Math.floor(vjRng() * vjSpecies.length)];
          const h = 0.3 + vjRng() * 5.7; // 0.3-6.0m (erweitert von 4.8m)
          const cw = Math.max(h * 0.35, 0.2);
          const kl = Math.max(h * 0.85, 0.2);
          trees.push({
            sp, x, y,
            h, cw, kl,
            ka: Math.max(h - kl, 0.05),
            bhd: h > 1.3 ? h * 1.5 : 0,
            jit: vjRng() * 6.28,
            isVerjuengung: true
          });
        }
      }
    }

    // === Konkurrenz-Interaktion (spatial hash optimiert) ===
    const COMP = {Bu:2.0, Ta:1.5, Fi:1.0, BAh:1.5, Ei:1.8, WFoe:0.8, Lae:0.7, Es:1.3, Dou:1.2};
    const cellSz = 15, nC = Math.ceil((typeof PLOT!=='undefined'?PLOT:100)/cellSz);
    const grid = {};
    for (let i = 0; i < trees.length; i++) {
      const cx = Math.min(nC-1, Math.floor(trees[i].x/cellSz));
      const cy = Math.min(nC-1, Math.floor(trees[i].y/cellSz));
      const key = cx+'_'+cy;
      if (!grid[key]) grid[key] = [];
      grid[key].push(i);
    }
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (t.h < 5) continue;
      const cx = Math.min(nC-1, Math.floor(t.x/cellSz));
      const cy = Math.min(nC-1, Math.floor(t.y/cellSz));
      let pressure = 0, nn = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nbs = grid[(cx+dx)+'_'+(cy+dy)];
        if (!nbs) continue;
        for (const j of nbs) {
          if (i === j) continue;
          const n = trees[j];
          const dist = Math.hypot(t.x-n.x, t.y-n.y);
          const reach = (t.cw+n.cw)/2;
          if (dist < reach*1.5 && n.h >= t.h*0.7) {
            pressure += (COMP[n.sp]||1.0) * (1 - dist/(reach*1.5));
            nn++;
          }
        }
      }
      if (nn > 0) t.cw *= (1 - Math.min(0.15, pressure * 0.03));
    }

    S.trees = trees;

  } else {
    // --- Klassischer Modus (manuell) ---
    rng = mR(S.seed);
    const nT = Math.round(S.density);
    const ac = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
    const tP = ac.reduce((a, [_, s]) => a + s.pct, 0);

    if (!tP) { S.trees = []; return; }

    const cn = [];
    let u = 0;
    ac.forEach(([k, s], i) => {
      const n = i === ac.length - 1 ? nT - u : Math.round(nT * s.pct / tP);
      cn.push({ k, n });
      u += n;
    });

    // === Mischungsform: Artzuordnung bestimmen ===
    // Schritt 1: Positionen generieren (unabhängig von Art)
    const positions = [];
    const tmpCw = []; // temporäre Kronenbreiten für Kollisionsprüfung
    const avgH = ac.reduce((a, [_, s]) => a + s.h * s.pct, 0) / tP;
    const avgCwEst = ac.reduce((a, [_, s]) => a + s.cw * s.pct, 0) / tP;
    for (let i = 0; i < nT; i++) {
      const cwEst = avgCwEst * (.82 + rng() * .18) * (.9 + rng() * .2);
      let x, y, ok, at = 0;
      do {
        x = rng() * 92 + 4;
        y = rng() * 92 + 4;
        ok = positions.every((p, j) =>
          Math.hypot(p.x - x, p.y - y) >= Math.max((tmpCw[j] / 2 + cwEst / 2) * .4, 1.5)
        );
        at++;
      } while (!ok && at < 120);
      if (!ok) { x = rng() * 92 + 4; y = rng() * 92 + 4; }
      positions.push({ x, y });
      tmpCw.push(cwEst);
    }

    // Schritt 2: Baumarten zuweisen je nach S.mixPattern
    const mixP = S.mixPattern || 'einzel';
    let spAssign; // Array of species keys, length = nT

    if (mixP === 'einzel') {
      // Einzelmischung: Zufällige Verteilung
      spAssign = [];
      for (const { k, n } of cn) { for (let i = 0; i < n; i++) spAssign.push(k); }
      // Fisher-Yates Shuffle
      for (let i = spAssign.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = spAssign[i]; spAssign[i] = spAssign[j]; spAssign[j] = tmp;
      }
    } else if (mixP === 'untergeordnet') {
      // Untergeordnete Mischung: Hauptbaumart dominiert, Nebenbaumarten verstreut
      spAssign = new Array(nT);
      const sorted = [...ac].sort((a, b) => b[1].pct - a[1].pct);
      const dominant = sorted[0][0];
      const minor = sorted.slice(1);
      const splitIdx = Math.round(nT * 0.6);
      for (let i = 0; i < nT; i++) {
        if (i < splitIdx) {
          spAssign[i] = dominant;
        } else {
          const minorTotal = minor.reduce((s, e) => s + e[1].pct, 0);
          let rVal = rng() * minorTotal;
          spAssign[i] = minor.length ? minor[0][0] : dominant;
          for (const [k, s] of minor) {
            rVal -= s.pct;
            if (rVal <= 0) { spAssign[i] = k; break; }
          }
        }
      }
    } else {
      // Clustered: Trupp (~12m), Gruppe (~18m), Horst (~30m)
      const clusterR = mixP === 'trupp' ? 12 : mixP === 'gruppe' ? 18 : 30;
      const plotSz = typeof PLOT !== 'undefined' ? PLOT : 100;
      const nClusters = Math.max(ac.length, Math.round(plotSz * plotSz / (Math.PI * clusterR * clusterR)));

      // Cluster-Zentren mit zugewiesener Baumart
      // Fix: Proportionale Zuweisung garantiert, dass jede Art mindestens 1 Cluster erhält
      const clusters = [];
      const guaranteed = [];
      for (const [k, s] of ac) {
        const count = Math.max(1, Math.round(nClusters * s.pct / tP));
        for (let g = 0; g < count && guaranteed.length < nClusters; g++) {
          guaranteed.push(k);
        }
      }
      while (guaranteed.length < nClusters) {
        let rVal = rng() * tP;
        let chosenSp = ac[0][0];
        for (const [k, s] of ac) {
          rVal -= s.pct;
          if (rVal <= 0) { chosenSp = k; break; }
        }
        guaranteed.push(chosenSp);
      }
      for (let i = guaranteed.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = guaranteed[i]; guaranteed[i] = guaranteed[j]; guaranteed[j] = tmp;
      }
      for (let ci = 0; ci < nClusters; ci++) {
        const cx = rng() * (plotSz - 4) + 2;
        const cy = rng() * (plotSz - 4) + 2;
        clusters.push({ x: cx, y: cy, sp: guaranteed[ci] });
      }

      // Jeder Baum wird dem nächsten Cluster zugewiesen
      spAssign = new Array(nT);
      for (let i = 0; i < nT; i++) {
        const px = positions[i].x;
        const py = positions[i].y;
        let bestDist = Infinity;
        let bestSp = ac[0][0];
        for (const cl of clusters) {
          const d = Math.hypot(cl.x - px, cl.y - py);
          if (d < bestDist) { bestDist = d; bestSp = cl.sp; }
        }
        spAssign[i] = bestSp;
      }
    }

    // Schritt 3: Bäume mit zugewiesener Art und Position erzeugen
    const trees = [];
    for (let i = 0; i < nT; i++) {
      const k = spAssign[i] || ac[0][0];
      const s = S.sp[k];
      if (!s) continue;

      let sf = 1;
      if (S.mode === 'ungleich') {
        const r = rng();
        if (r < .18) sf = .15 + rng() * .15;
        else if (r < .38) sf = .3 + rng() * .15;
        else if (r < .58) sf = .5 + rng() * .15;
        else if (r < .78) sf = .7 + rng() * .15;
        else sf = .88 + rng() * .12;
      } else {
        sf = .82 + rng() * .18;
      }

      const h = s.h * sf;
      let cw, kl, ka, bhd;
      if (h < 1.3) {
        bhd = 0;
        cw = Math.max(h * 0.4, 0.3);
        kl = Math.max(h * 0.8, 0.3);
        ka = Math.max(h - kl, 0.1);
      } else {
        bhd = bhdFromH(k, h);
        const crown = crownFromBHD(k, bhd, h);
        cw = crown.cw * (.9 + rng() * .2);
        kl = crown.kl * (.9 + rng() * .2);
        ka = Math.max(h - kl, 1);
      }

      trees.push({
        sp: k, x: positions[i].x, y: positions[i].y,
        h, cw, kl, ka,
        bhd: bhd,
        jit: rng() * 6.28
      });
    }

    // === Naturverjüngung im manuellen Modus ===
    if (S.showVerjuengung) {
      const vjRng = mR(S.seed + 7777);
      const maxVJ = 100; // Moderate Anzahl für manuellen Modus
      const vjSpecies = [];
      const acVj = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
      for (const [k2, s2] of acVj) {
        for (let ii = 0; ii < Math.round(s2.pct / 10); ii++) vjSpecies.push(k2);
      }
      if (vjSpecies.length === 0) vjSpecies.push('Bu');

      for (let vi = 0; vi < maxVJ; vi++) {
        const vx = vjRng() * 88 + 6;
        const vy = vjRng() * 88 + 6;
        // Lückenprüfung: kein grosser Baum innerhalb cw * 0.5
        let inGap = true;
        for (const t of trees) {
          if (t.isVerjuengung) continue;
          const dist = Math.hypot(t.x - vx, t.y - vy);
          if (dist < t.cw * 0.5) { inGap = false; break; }
        }
        if (inGap) {
          const vjSp = vjSpecies[Math.floor(vjRng() * vjSpecies.length)];
          const vh = 0.3 + vjRng() * 4.5; // 0.3-4.8m
          const vcw = Math.max(vh * 0.35, 0.2);
          const vkl = Math.max(vh * 0.85, 0.2);
          trees.push({
            sp: vjSp, x: vx, y: vy,
            h: vh, cw: vcw, kl: vkl,
            ka: Math.max(vh - vkl, 0.05),
            bhd: vh > 1.3 ? vh * 1.5 : 0,
            jit: vjRng() * 6.28,
            isVerjuengung: true
          });
        }
      }
    }

    // === Konkurrenz-Interaktion (spatial hash optimiert) ===
    const COMP = {Bu:2.0, Ta:1.5, Fi:1.0, BAh:1.5, Ei:1.8, WFoe:0.8, Lae:0.7, Es:1.3, Dou:1.2};
    const cellSz = 15, nC = Math.ceil((typeof PLOT!=='undefined'?PLOT:100)/cellSz);
    const grid = {};
    for (let i = 0; i < trees.length; i++) {
      const cx = Math.min(nC-1, Math.floor(trees[i].x/cellSz));
      const cy = Math.min(nC-1, Math.floor(trees[i].y/cellSz));
      const key = cx+'_'+cy;
      if (!grid[key]) grid[key] = [];
      grid[key].push(i);
    }
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (t.h < 5) continue;
      const cx = Math.min(nC-1, Math.floor(t.x/cellSz));
      const cy = Math.min(nC-1, Math.floor(t.y/cellSz));
      let pressure = 0, nn = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nbs = grid[(cx+dx)+'_'+(cy+dy)];
        if (!nbs) continue;
        for (const j of nbs) {
          if (i === j) continue;
          const n = trees[j];
          const dist = Math.hypot(t.x-n.x, t.y-n.y);
          const reach = (t.cw+n.cw)/2;
          if (dist < reach*1.5 && n.h >= t.h*0.7) {
            pressure += (COMP[n.sp]||1.0) * (1 - dist/(reach*1.5));
            nn++;
          }
        }
      }
      if (nn > 0) t.cw *= (1 - Math.min(0.15, pressure * 0.03));
    }

    S.trees = trees;
  }
}

