// === ztree.js ===
/**
 * ztree.js — Z-Baum-Logik und FBB-Eingriffstabellen
 *
 * Z-Bäume (Zukunftsbäume / Crop Trees) sind die besten Bäume im Bestand,
 * die für die Endnutzung vorgesehen sind. Sie werden ab der Dimensionierungs-
 * phase ausgewählt und durch Kronfreistellung gefördert.
 *
 * Enthält:
 *   - FBB_ZB         — Z-Baum-Anzahl pro ha (aus FBB Produktionskonzept 2022)
 *   - FBB_EINGRIFFE  — Vollständige Eingriffstabellen pro Art
 *   - getZBaumCount() — Aktuelle Z-Baum-Anzahl für Art und Oberhöhe
 *   - getIntervention() — Nächster/aktueller Eingriff
 *   - markZBaeume()   — Markiert Z-Bäume in Baumliste
 *
 * Abhängigkeiten: timeline.js (hdom), species.js (SP), controls.js (S)
 *
 * Quelle: Produktionskonzept Forstbetrieb Burgergemeinde Bern, 28.06.2022
 */

// === Z-Baum Endbestand pro ha ===
const FBB_ZB = {
  // FBB Produktionskonzept 2022: Z-Bäume im Endbestand
  Fi:   200,  // Fichte: 200 Z-Bäume/ha, Endabstand 8m
  Ta:   200,  // Tanne: 200, Endabstand 8m
  Bu:   100,  // Buche: 100, Endabstand 11m
  Ei:    50,  // Eiche: 50, Endabstand 15m
  Es:    80,  // Esche: 80, Endabstand 12m
  BAh:   80,  // Ahorn: 80, Endabstand 12m
  WFoe: 100,  // Föhre: 100, Endabstand 11m
  Lae:  100,  // Lärche: 100, Endabstand 11m
  Dou:  150,  // Douglasie: 150 Z-Bäume/ha, Endabstand 9m (FBB 2022)
};

// === FBB Eingriffstabellen ===
// Format: Array von { hdom, bhdZB, totalN, konZB, entnahmeN, massnahme }
// konZB = Verhältnis Konkurrenten pro Z-Baum
const FBB_EINGRIFFE = {
  Fi: [
    { hdom:12, bhdZB:12, totalN:2400, konZB:2,   entnahmeN:2000, massnahme:'FE einlegen' },
    { hdom:14, bhdZB:15, totalN:2000, konZB:2.6, entnahmeN:1480, massnahme:'Z-Bäume fördern' },
    { hdom:17, bhdZB:19, totalN:1500, konZB:2.6, entnahmeN:980,  massnahme:'Z-Bäume fördern' },
    { hdom:20, bhdZB:24, totalN:1000, konZB:2.3, entnahmeN:540,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:29, totalN:600,  konZB:1,   entnahmeN:400,  massnahme:'Z-Bäume fördern' },
    { hdom:27, bhdZB:36, totalN:400,  konZB:1,   entnahmeN:200,  massnahme:'Letzte Durchforstung' },
    { hdom:34,           totalN:200,                               massnahme:'Verjüngung einleiten' },
  ],
  Ta: [
    { hdom:12, bhdZB:12, totalN:2400, konZB:2,   entnahmeN:2000, massnahme:'FE einlegen' },
    { hdom:14, bhdZB:15, totalN:2000, konZB:2.5, entnahmeN:1500, massnahme:'Z-Bäume bestimmen' },
    { hdom:17, bhdZB:19, totalN:1500, konZB:2.5, entnahmeN:1000, massnahme:'Z-Bäume fördern' },
    { hdom:20, bhdZB:24, totalN:1000, konZB:2,   entnahmeN:600,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:29, totalN:600,  konZB:1,   entnahmeN:400,  massnahme:'Z-Bäume fördern' },
    { hdom:27, bhdZB:37, totalN:400,  konZB:1,   entnahmeN:200,  massnahme:'Z-Bäume fördern' },
    { hdom:34,           totalN:200,                               massnahme:'Verjüngungshiebe' },
  ],
  Bu: [
    { hdom:18, bhdZB:20, totalN:1600, konZB:2.1, entnahmeN:1390, massnahme:'FE, Z-Bäume bestimmen' },
    { hdom:22, bhdZB:26, totalN:1200, konZB:2.2, entnahmeN:980,  massnahme:'Z-Bäume fördern' },
    { hdom:25, bhdZB:32, totalN:800,  konZB:2.3, entnahmeN:570,  massnahme:'Z-Bäume fördern' },
    { hdom:28, bhdZB:38, totalN:400,  konZB:1,   entnahmeN:300,  massnahme:'Z-Bäume fördern' },
    { hdom:33, bhdZB:47, totalN:300,  konZB:1,   entnahmeN:200,  massnahme:'Z-Bäume fördern' },
    { hdom:36, bhdZB:60, totalN:200,  konZB:1,   entnahmeN:100,  massnahme:'Letzte Durchforstung' },
  ],
  Ei: [
    { hdom:13, bhdZB:13, totalN:680,  konZB:2,   entnahmeN:580,  massnahme:'FE einlegen' },
    { hdom:16, bhdZB:17, totalN:580,  konZB:2,   entnahmeN:480,  massnahme:'Z-Bäume fördern' },
    { hdom:20, bhdZB:23, totalN:480,  konZB:2.1, entnahmeN:375,  massnahme:'Z-Bäume fördern' },
    { hdom:22, bhdZB:32, totalN:375,  konZB:2.2, entnahmeN:265,  massnahme:'Z-Bäume fördern' },
    { hdom:25, bhdZB:46, totalN:265,  konZB:2.3, entnahmeN:150,  massnahme:'Z-Bäume fördern' },
    { hdom:28, bhdZB:47, totalN:150,  konZB:1,   entnahmeN:100,  massnahme:'Z-Bäume fördern' },
    { hdom:33, bhdZB:48, totalN:100,  konZB:1,   entnahmeN:50,   massnahme:'Z-Bäume fördern' },
    { hdom:38, bhdZB:70, totalN:50,                                massnahme:'Verjüngungshiebe' },
  ],
  Es: [
    { hdom:12, bhdZB:12, totalN:2000, konZB:2.6, entnahmeN:1792, massnahme:'FE einlegen' },
    { hdom:14, bhdZB:15, totalN:1600, konZB:2.6, entnahmeN:1392, massnahme:'Z-Bäume fördern' },
    { hdom:17, bhdZB:19, totalN:1200, konZB:2.6, entnahmeN:992,  massnahme:'Z-Bäume fördern' },
    { hdom:20, bhdZB:25, totalN:800,  konZB:2.3, entnahmeN:616,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:31, totalN:400,  konZB:1,   entnahmeN:320,  massnahme:'Z-Bäume fördern' },
    { hdom:27, bhdZB:40, totalN:320,  konZB:1,   entnahmeN:240,  massnahme:'Z-Bäume fördern' },
    { hdom:33, bhdZB:60, totalN:80,                                massnahme:'Verjüngungshiebe' },
  ],
  BAh: [
    { hdom:12, bhdZB:12, totalN:2000, konZB:2.6, entnahmeN:1792, massnahme:'FE einlegen' },
    { hdom:14, bhdZB:15, totalN:1600, konZB:2.6, entnahmeN:1392, massnahme:'Z-Bäume fördern' },
    { hdom:17, bhdZB:19, totalN:1200, konZB:2.6, entnahmeN:992,  massnahme:'Z-Bäume fördern' },
    { hdom:20, bhdZB:25, totalN:800,  konZB:2.3, entnahmeN:616,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:31, totalN:400,  konZB:1,   entnahmeN:320,  massnahme:'Z-Bäume fördern' },
    { hdom:27, bhdZB:40, totalN:320,  konZB:1,   entnahmeN:240,  massnahme:'Z-Bäume fördern' },
    { hdom:33, bhdZB:60, totalN:80,                                massnahme:'Verjüngungshiebe' },
  ],
  WFoe: [
    { hdom:10, bhdZB:14, totalN:1450, konZB:2,   entnahmeN:1250, massnahme:'FE einlegen' },
    { hdom:12, bhdZB:16, totalN:1250, konZB:2,   entnahmeN:1050, massnahme:'Z-Bäume bestimmen' },
    { hdom:15, bhdZB:20, totalN:1050, konZB:2.4, entnahmeN:810,  massnahme:'Z-Bäume fördern' },
    { hdom:19, bhdZB:25, totalN:810,  konZB:2.6, entnahmeN:550,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:31, totalN:550,  konZB:2,   entnahmeN:350,  massnahme:'Z-Bäume fördern' },
    { hdom:28, bhdZB:33, totalN:350,  konZB:1.5, entnahmeN:200,  massnahme:'Z-Bäume fördern' },
    { hdom:34, bhdZB:46, totalN:200,  konZB:1,   entnahmeN:100,  massnahme:'Z-Bäume fördern' },
    { hdom:40, bhdZB:80, totalN:100,                               massnahme:'Verjüngungshiebe' },
  ],
  Lae: [
    { hdom:10, bhdZB:14, totalN:1450, konZB:2,   entnahmeN:1250, massnahme:'FE einlegen' },
    { hdom:12, bhdZB:16, totalN:1250, konZB:2,   entnahmeN:1050, massnahme:'Z-Bäume bestimmen' },
    { hdom:15, bhdZB:20, totalN:1050, konZB:2.4, entnahmeN:810,  massnahme:'Z-Bäume fördern' },
    { hdom:19, bhdZB:25, totalN:810,  konZB:2.6, entnahmeN:550,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:31, totalN:550,  konZB:2,   entnahmeN:350,  massnahme:'Z-Bäume fördern' },
    { hdom:28, bhdZB:33, totalN:350,  konZB:1.5, entnahmeN:200,  massnahme:'Z-Bäume fördern' },
    { hdom:34, bhdZB:46, totalN:200,  konZB:1,   entnahmeN:100,  massnahme:'Z-Bäume fördern' },
    { hdom:40, bhdZB:80, totalN:100,                               massnahme:'Verjüngungshiebe' },
  ],
  Dou: [
    // FBB Produktionskonzept 2022: Douglasie B34, 150 Z-Bäume/ha
    { hdom:12, bhdZB:12, totalN:2000, konZB:2,   entnahmeN:1700, massnahme:'FE einlegen' },
    { hdom:15, bhdZB:16, totalN:1700, konZB:2.5, entnahmeN:1200, massnahme:'Z-Bäume bestimmen' },
    { hdom:19, bhdZB:21, totalN:1200, konZB:2.5, entnahmeN:800,  massnahme:'Z-Bäume fördern' },
    { hdom:23, bhdZB:27, totalN:800,  konZB:2,   entnahmeN:500,  massnahme:'Z-Bäume fördern' },
    { hdom:27, bhdZB:34, totalN:500,  konZB:1.5, entnahmeN:300,  massnahme:'Z-Bäume fördern' },
    { hdom:34, bhdZB:45, totalN:300,  konZB:1,   entnahmeN:150,  massnahme:'Letzte Durchforstung' },
    { hdom:42, bhdZB:70, totalN:150,                               massnahme:'Verjüngung einleiten' },
  ],
};

/**
 * Gibt die Z-Baum-Anzahl pro ha für eine Art bei gegebener Oberhöhe zurück.
 *
 * Die Z-Baum-Anzahl ist im Wesentlichen konstant = FBB_ZB[sp] sobald
 * Z-Bäume bestimmt wurden (ab 2. Eingriff). Vor der Bestimmung: 0.
 *
 * Quelle: FBB Produktionskonzept 2022 — Z-Bäume im Endbestand
 */
function getZBaumCount(sp, h) {
  const zbFinal = FBB_ZB[sp] || 100;
  const table = FBB_EINGRIFFE[sp];
  if (!table || h < table[0].hdom) return 0;
  // Ab dem 1. Eingriff (FE einlegen) werden Z-Bäume bestimmt → Konstante Anzahl
  return zbFinal;
}

/**
 * Bestimmt den aktuellen/nächsten Eingriff für eine Art basierend auf Oberhöhe.
 */
function getIntervention(sp, h) {
  const table = FBB_EINGRIFFE[sp];
  if (!table) return null;
  for (let i = table.length - 1; i >= 0; i--) {
    if (h >= table[i].hdom) {
      return {
        current: table[i],
        next: i < table.length - 1 ? table[i + 1] : null,
        index: i,
        total: table.length
      };
    }
  }
  return { current: null, next: table[0], index: -1, total: table.length };
}

/**
 * Markiert Z-Bäume in der Baumliste.
 * Im Timeline-Modus: isZBaum wird persistent vom Master übernommen (in genTrees).
 * Diese Funktion ergänzt nur fehlende Z-Bäume (z.B. nach Hiebreife-Ernte).
 * Im manuellen Modus: Keine Z-Baum-Markierung.
 */
function markZBaeume(trees) {
  if (!trees || trees.length === 0) return trees;

  if (!S.timelineOn || S.age < 15 || !S.showZBaum) {
    trees.forEach(t => { t.isZBaum = false; });
    return trees;
  }

  // isZBaum kommt bereits aus genTrees() via Master.
  // Prüfe ob genug Z-Bäume vorhanden, sonst Nachfolger bestimmen
  const ZB_ENDABSTAND = {
    Fi: 8, Ta: 8, Bu: 11, Ei: 15, Es: 12, BAh: 12, WFoe: 11, Lae: 11, Dou: 9
  };
  const ac = Object.entries(S.sp).filter(([_, s]) => s.on && s.pct > 0);
  const tP = ac.reduce((a, [_, s]) => a + s.pct, 0);

  for (const [k, s] of ac) {
    if (!s.on || s.pct <= 0) continue;
    const zbTotal = FBB_ZB[k] || 100;
    const plotArea = (typeof PLOT !== 'undefined' ? PLOT * PLOT : 10000);
    const zbOnPlot = Math.round(zbTotal * (plotArea / 10000) * s.pct / tP);
    const minDist = ZB_ENDABSTAND[k] || 10;

    const currentZB = trees.filter(t => t.sp === k && t.isZBaum);
    if (currentZB.length >= zbOnPlot) continue;

    // Brauche Nachfolger
    const needed = zbOnPlot - currentZB.length;
    const candidates = trees
      .filter(t => t.sp === k && !t.isZBaum && !t.isVerjuengung && t.bhd > 0)
      .sort((a, b) => b.bhd - a.bhd);

    let added = 0;
    for (const cand of candidates) {
      if (added >= needed) break;
      let tooClose = false;
      for (const zb of trees.filter(t => t.isZBaum)) {
        if (Math.hypot(cand.x - zb.x, cand.y - zb.y) < minDist) { tooClose = true; break; }
      }
      if (!tooClose) {
        cand.isZBaum = true;
        added++;
      }
    }
  }
  return trees;
}

