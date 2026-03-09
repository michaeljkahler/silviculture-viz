// === timeline.js ===
/**
 * timeline.js — Zeitschiene / Wachstumsmodell
 *
 * Phase 2: Bestandesentwicklung über die Zeit.
 *
 * Enthält:
 *   - SIWAWA_KURVEN   — Oberhöhen-Stützpunkte aus SiWaWa-Wuchssimulator (ETH-Z/WSL)
 *   - PHASES          — Waldbauliche Phasen (Qualifizierung, Dimensionierung, Zielvorstellung)
 *   - hdom(sp, age)   — Dominante Höhe (lineare Interpolation der Stützpunkte)
 *   - bhdFromH(sp, h) — BHD aus Höhe (allometrisch)
 *   - crownFromBHD(sp, bhd, h) — Kronendimensionen aus BHD und Höhe
 *   - nHa(age)        — Stammzahl pro ha (deckungsgrad-gesteuert)
 *   - getPhase(age)   — Aktuelle Phase bestimmen
 *   - applyAge(age)   — Aktualisiert S.sp Parameter basierend auf Alter
 *
 * Abhängigkeiten: species.js (SPECIES), controls.js (S)
 *
 * Quellen:
 *   - SiWaWa Wuchssimulator (ETH-Z / WSL), HAFL Abb. 4A
 *   - Bergahorn: Röhle et al. 2009 (Bayern), Lockow 2003 (Brandenburg)
 *   - Kronenallometrie: Pretzsch (2009), kr ∝ BHD^0.5
 *   - Stammzahlentwicklung: Deckungsgrad-gesteuert + FBB Produktionskonzept 2022
 */

// === SiWaWa Wachstumskurven ===
// Oberhöhe (hdom) in Metern an Stützpunkten [10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 140] Jahre
// Quelle: Manuelle Digitalisierung aus SiWaWa-Grafiken (3 Iterationen, kreuzvalidiert)
// Bonität = hdom [m] im Referenzalter 50 Jahre (SiWaWa-Konvention)
//
// Zuordnung BLFw426 (8a: Bu65/Ta15/Fi10/BAh10):
//   Bu  → Bu_26  (SiWaWa B26, nächste verfügbare Klasse zu B24)
//   Ta  → Ta_22  (SiWaWa max.; FBB-Bon.28 = anderes Referenzsystem)
//   Fi  → Fi_28  (direkt verfügbar)
//   BAh → BAh_22 (abgeleitet aus Röhle/Lockow, konservativ)
//   Ei  → Ei_26  (gut)
//   WFoe→ Foe_26 (gut)
//   Lae → La_28  (gut)
//   Es  → Es_28  (gut)

const SIWAWA_ALTER = [10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 140];

const SIWAWA_KURVEN = {
  // Korrigiert nach FBB Produktionskonzept 2022 + SiWaWa-Grafiken
  // Format: hdom [m] bei Alter [10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 140]
  Bu:   [3.5,  8.5, 14.0, 19.0, 23.0, 26.5, 29.5, 32.0, 36.0, 39.0, 41.0],  // Bu_24 (FBB: B24)
  Ta:   [3.0,  8.0, 14.0, 20.0, 26.0, 31.0, 35.0, 38.0, 42.0, 45.0, 47.0],  // Ta_28 (FBB: B28)
  Fi:   [3.5,  9.0, 15.0, 21.0, 28.0, 33.0, 37.0, 40.5, 45.0, 48.5, 50.0],  // Fi_28 (FBB: B28) — unverändert
  BAh:  [3.0,  8.5, 13.5, 18.0, 22.0, 25.5, 28.0, 29.5, 32.0, 33.5, 34.5],  // BAh_22 (Röhle/Lockow) — unverändert
  Ei:   [2.5,  7.0, 12.5, 18.5, 24.0, 28.5, 32.0, 34.5, 38.5, 41.5, 43.5],  // Ei_25 (FBB: B25)
  WFoe: [2.5,  7.0, 12.5, 19.0, 26.0, 29.5, 32.0, 33.5, 37.0, 39.0, 40.5],  // Foe_26 (FBB: B26) — unverändert
  Lae:  [4.5, 12.0, 20.0, 25.5, 28.0, 32.0, 35.5, 38.0, 41.5, 43.5, 45.0],  // La_28 (FBB: B28) — unverändert
  Es:   [5.0, 11.0, 17.5, 23.5, 28.0, 32.0, 35.0, 37.0, 40.0, 42.0, 43.5],  // Es_28 (FBB: B28) — unverändert
  Dou:  [4.5, 12.0, 20.5, 28.0, 34.0, 38.5, 42.0, 44.5, 47.5, 49.5, 51.0],  // Dou_34 (FBB: B34)
};

// === LEGACY: Chapman-Richards Parameter (Fallback für unbekannte Arten) ===
const GROWTH_PARAMS = {
  // Korrigiert nach FBB Produktionskonzept 2022
  Bu:  { a: 41, si: 24, label: 'Buche B24 (FBB/SiWaWa)' },
  Ta:  { a: 47, si: 28, label: 'Tanne B28 (FBB/SiWaWa)' },
  Fi:  { a: 50, si: 28, label: 'Fichte B28 (FBB/SiWaWa)' },
  BAh: { a: 35, si: 22, label: 'Bergahorn B22 (Röhle/Lockow)' },
  Ei:  { a: 43, si: 25, label: 'Eiche B25 (FBB/SiWaWa)' },
  WFoe:{ a: 41, si: 26, label: 'Föhre B26 (FBB/SiWaWa)' },
  Lae: { a: 45, si: 28, label: 'Lärche B28 (FBB/SiWaWa)' },
  Es:  { a: 44, si: 28, label: 'Esche B28 (FBB/SiWaWa)' },
  Dou: { a: 51, si: 34, label: 'Douglasie B34 (FBB/SiWaWa)' },
};

// === Hiebreife / Umtriebszeit ===
// Spätester sinnvoller Erntezeitpunkt je Art, aus FBB-Produktionskonzept 2022
// und SiWaWa-Grafiken (rote Rahmen = Hiebzeitpunktfenster).
//
// maxAge: Maximalalter auf der Zeitschiene (Slider-Limit)
// harvestAge: Typisches Erntealter (FBB Umtrieb)
// zd_cm: Zieldurchmesser BHD [cm]
// zbHa: Z-Bäume pro ha bei Hiebreife
//
const HIEBREIFE = {
  // Korrigiert nach FBB Produktionskonzept 2022
  Bu:   { harvestAge: 100, maxAge: 140, zd_cm: 60,  zbHa: 100, label: 'Buche B24: Umtrieb 100J, ZD 60cm' },
  Ta:   { harvestAge:  60, maxAge: 100, zd_cm: 60,  zbHa: 200, label: 'Tanne B28: Umtrieb 60J, ZD 60cm' },
  Fi:   { harvestAge:  60, maxAge:  80, zd_cm: 60,  zbHa: 200, label: 'Fichte B28: Umtrieb 60J, ZD 60cm' },
  BAh:  { harvestAge:  80, maxAge: 120, zd_cm: 60,  zbHa:  80, label: 'Bergahorn B22: Umtrieb 80J, ZD 60cm' },
  Ei:   { harvestAge: 110, maxAge: 160, zd_cm: 70,  zbHa:  50, label: 'Eiche B25: Umtrieb 110J, ZD 70cm' },
  WFoe: { harvestAge: 120, maxAge: 160, zd_cm: 80,  zbHa: 100, label: 'Föhre B26: Umtrieb 120J, ZD 80cm' },
  Lae:  { harvestAge: 120, maxAge: 160, zd_cm: 80,  zbHa: 100, label: 'Lärche B28: Umtrieb 120J, ZD 80cm' },
  Es:   { harvestAge:  80, maxAge: 120, zd_cm: 60,  zbHa:  80, label: 'Esche B28: Umtrieb 80J, ZD 60cm' },
  Dou:  { harvestAge:  80, maxAge: 120, zd_cm: 70,  zbHa: 150, label: 'Douglasie B34: Umtrieb 80J, ZD 70cm' },
};

/**
 * Berechnet das gewichtete maximale Bestandesalter (Slider-Maximum)
 * basierend auf den aktiven Baumarten und ihren Anteilen.
 * Die früheste Hiebreife der Hauptbaumart bestimmt das Limit.
 *
 * @returns {number} Maximalalter in Jahren
 */
function getMaxAge() {
  if (typeof S === 'undefined' || !S || !S.sp) return 120;
  let weightedMax = 0, totalPct = 0;
  for (const [k, s] of Object.entries(S.sp)) {
    if (!s.on || s.pct <= 0) continue;
    const hr = HIEBREIFE[k];
    if (hr) {
      weightedMax += s.pct * hr.maxAge;
      totalPct += s.pct;
    }
  }
  if (totalPct <= 0) return 120;
  return Math.round(weightedMax / totalPct);
}

// === Waldbauliche Phasen ===
const PHASES = [
  {
    id: 'qual',
    name: 'Qualifizierung',
    nameShort: 'Qual.',
    ageStart: 0,
    ageEnd: 20,
    color: '#a8d8a0',
    desc: 'Jungwuchs/Dickung — Stammzahlreduktion, Formauswahl, Z-Baum-Selektion'
  },
  {
    id: 'dim',
    name: 'Dimensionierung',
    nameShort: 'Dim.',
    ageStart: 20,
    ageEnd: 80,
    color: '#90c8d8',
    desc: 'Stangenholz/Baumholz — Kronenfreistellung, Durchmesserwachstum fördern'
  },
  {
    id: 'ziel',
    name: 'Zielvorstellung',
    nameShort: 'Ziel',
    ageStart: 80,
    ageEnd: 120,
    color: '#d8c890',
    desc: 'Reifer Bestand — Zieldurchmesser erreicht, Verjüngungseinleitung'
  }
];

// === Phase-Snap-Punkte für Slider ===
const PHASE_SNAPS = [
  { age: 0,   label: '0' },
  { age: 20,  label: '20' },
  { age: 40,  label: '40' },
  { age: 60,  label: '60' },
  { age: 80,  label: '80' },
  { age: 100, label: '100' },
  { age: 120, label: '120' },
  { age: 140, label: '140' },
];

/**
 * Dominante Höhe (hdom) als Funktion von Art und Alter.
 *
 * Primär: Lineare Interpolation der SiWaWa-Stützpunkte (10-140 Jahre).
 * Für Alter < 10: Kubische Extrapolation (durchläuft 0,0 und Stützpunkt 10J).
 * Für Alter > 140: Logarithmische Fortschreibung (flach asymptotisch).
 * Fallback: Einfaches Potenzgesetz wenn keine SiWaWa-Kurve verfügbar.
 *
 * @param {string} sp  — Artkürzel (Bu, Ta, Fi, ...)
 * @param {number} age — Alter in Jahren
 * @returns {number} hdom in Metern
 */
function hdom(sp, age) {
  if (age <= 0) return 0;

  const kurve = SIWAWA_KURVEN[sp];
  if (!kurve) {
    // Fallback: einfaches Potenzgesetz
    const gp = GROWTH_PARAMS[sp];
    if (!gp) return 0;
    return gp.a * Math.pow(age / 140, 1.3) * (gp.si / 26);
  }

  const A = SIWAWA_ALTER;

  // Alter < 10: kubische Extrapolation von (0,0) zu (10, kurve[0])
  if (age < A[0]) {
    const h10 = kurve[0];
    const t = age / A[0]; // 0 → 1
    // Kubisch: sanfter Anstieg, Steigung bei t=0 = 0
    return h10 * t * t * (3 - 2 * t);
  }

  // Alter > 140: logarithmische Fortschreibung
  if (age > A[A.length - 1]) {
    const hLast = kurve[kurve.length - 1];
    const hPrev = kurve[kurve.length - 2];
    // Jährliche Zunahme aus letztem Intervall, abflachend
    const ratePerYear = (hLast - hPrev) / (A[A.length - 1] - A[A.length - 2]);
    const extra = age - A[A.length - 1];
    return hLast + ratePerYear * extra * Math.exp(-extra * 0.02);
  }

  // Lineare Interpolation zwischen Stützpunkten
  for (let i = 0; i < A.length - 1; i++) {
    if (age >= A[i] && age <= A[i + 1]) {
      const t = (age - A[i]) / (A[i + 1] - A[i]);
      return kurve[i] + t * (kurve[i + 1] - kurve[i]);
    }
  }

  return kurve[kurve.length - 1];
}

/**
 * BHD als Funktion von Höhe und Art (allometrisch)
 *
 * Vereinfachte Beziehung basierend auf forstlichen Ertragstafeln:
 *   BHD ≈ bhdRef × (h / hRef)^exp
 *
 * Parameter pro Art kalibriert auf Ziel-BHD bei Zielhöhe (aus SPECIES_REFERENCE)
 *
 * @param {string} sp — Artkürzel
 * @param {number} h  — Baumhöhe in m
 * @returns {number} BHD in cm
 */
function bhdFromH(sp, h) {
  // Sanfter Übergang ab h=1.3m (statt hartem Cutoff)
  if (h <= 0.5) return 0;

  // Zielwerte kalibriert auf SiWaWa hdom(100) + FBB Produktionskonzept 2022 BHD-Ziele
  // hRef = hdom bei Alter 100 aus korrigierten SIWAWA_KURVEN
  const targets = {
    Bu:  { hRef: 36.0, bhdRef: 60 },   // Bu_24 hdom(100)=36, FBB ZD=60cm
    Ta:  { hRef: 42.0, bhdRef: 60 },   // Ta_28 hdom(100)=42, FBB ZD=60cm
    Fi:  { hRef: 45.0, bhdRef: 60 },   // Fi_28 hdom(100)=45, FBB ZD=60cm
    BAh: { hRef: 32.0, bhdRef: 60 },   // BAh_22 hdom(100)=32, FBB ZD=60cm
    Ei:  { hRef: 38.5, bhdRef: 70 },   // Ei_25 hdom(100)=38.5, FBB ZD=70cm
    WFoe:{ hRef: 37.0, bhdRef: 80 },   // Foe_26 hdom(100)=37, FBB ZD=80cm
    Lae: { hRef: 41.5, bhdRef: 80 },   // La_28 hdom(100)=41.5, FBB ZD=80cm
    Es:  { hRef: 40.0, bhdRef: 60 },   // Es_28 hdom(100)=40, FBB ZD=60cm
    Dou: { hRef: 47.5, bhdRef: 70 },   // Dou_34 hdom(100)=47.5, FBB ZD=70cm
  };

  const t = targets[sp] || { hRef: 30, bhdRef: 40 };
  const exp = (sp === 'Ei' || sp === 'WFoe') ? 1.5 : 1.3;
  let bhd = t.bhdRef * Math.pow(h / t.hRef, exp);

  // Weicher Übergang: BHD ramp von 0 bei h=0.5m auf vollen Wert bei h=3m
  if (h < 3.0) {
    const blend = (h - 0.5) / 2.5; // 0 → 1
    bhd *= blend * blend;           // quadratisch für sanften Anstieg
  }

  return bhd;
}

/**
 * Kronendimensionen als Funktion von BHD, Höhe und Art
 *
 * Allometrien:
 *   - Kronenbreite (cw):  cw = 2 × k_cr × BHD^0.5  (Pretzsch 2009)
 *   - Kronenlänge (kl):   kl = Kronenratio × h       (artenspezifisch)
 *   - Kronenansatz (ka):  ka = h - kl
 *
 * @param {string} sp  — Artkürzel
 * @param {number} bhd — BHD in cm
 * @param {number} h   — Baumhöhe in m
 * @returns {{ cw: number, kl: number, ka: number }}
 */
function crownFromBHD(sp, bhd, h) {
  // Sehr kleine Bäume: Krone proportional zur Höhe (fliessend)
  if (h <= 0.5) return { cw: Math.max(h * 0.5, 0.2), kl: Math.max(h * 0.8, 0.2), ka: Math.max(h * 0.2, 0.05) };
  if (bhd <= 0 || h <= 2) {
    // Übergangsbereich: lineare Interpolation basierend auf Höhe
    const cwSmall = h * 0.35;
    const klSmall = h * 0.80;
    return { cw: Math.max(cwSmall, 0.3), kl: Math.max(klSmall, 0.3), ka: Math.max(h - klSmall, 0.1) };
  }

  // Kronenbreite: cw = 2 × k_cr × BHD^0.5
  // k_cr kalibriert auf Defaults aus species.js
  const crCoeffs = {
    Bu:  0.85, // → cw ≈ 12.0 bei BHD 50
    Ta:  0.57, // → cw ≈ 8.5  bei BHD 55
    Fi:  0.43, // → cw ≈ 5.8  bei BHD 45
    BAh: 0.79, // → cw ≈ 10.0 bei BHD 40
    Ei:  0.95, // → cw ≈ 14.1 bei BHD 55
    WFoe:0.63, // → cw ≈ 8.0  bei BHD 40
    Lae: 0.55, // → cw ≈ 7.0  bei BHD 40
    Es:  0.71, // → cw ≈ 9.5  bei BHD 45
    Dou: 0.50,
  };
  const k_cr = crCoeffs[sp] || 0.70;
  const cw = 2.0 * k_cr * Math.pow(bhd, 0.5);

  // Kronenverhältnis: Anteil der Krone an Gesamthöhe
  // Junge Bäume ≈ 85%, alte Bäume → artspezifischer Basiswert
  // Kronenverhältnis im Endzustand (geschlossener, bewirtschafteter Bestand)
  // Nadelbäume: ca. 1/3 Kronenlänge im dichten Bestand (Forstpraxis)
  // Laubbäume: artspezifisch, generell kürzere Kronen als Jungbestand
  const crRatioBase = {
    Bu:  0.50, // Buche: ca. 50% — breite Krone, mittlerer Kronenansatz
    Ta:  0.40, // Tanne: ca. 40% — schatttolerant, etwas längere Krone als Fi
    Fi:  0.33, // Fichte: ca. 1/3 — typischer Nadelbaum im dichten Bestand
    BAh: 0.50, // Bergahorn: ca. 50%
    Ei:  0.45, // Eiche: ca. 45% — hoher Kronenansatz im Bestand
    WFoe:0.30, // Föhre: ca. 30% — kurze Krone, hoher Kronenansatz
    Lae: 0.33, // Lärche: ca. 1/3 — lichtbedürftig, kurze Krone
    Es:  0.45, // Esche: ca. 45%
    Dou: 0.33, // Douglasie: ca. 1/3 — ähnlich Fi im Bestand
  };

  const baseRatio = crRatioBase[sp] || 0.55;
  // Referenzhöhe = Höhe bei Hiebreife (nicht bei 140J), damit bei Erntealter baseRatio erreicht wird
  const hr = (typeof HIEBREIFE !== 'undefined' && HIEBREIFE[sp]) ? HIEBREIFE[sp] : null;
  const hRef = hr ? hdom(sp, hr.harvestAge) : (SIWAWA_KURVEN[sp] ? SIWAWA_KURVEN[sp][SIWAWA_KURVEN[sp].length - 1] : 35);
  const relH = Math.min(h / hRef, 1.0);
  // Jung: 85% Krone, Alt (bei Hiebreife): baseRatio
  const crRatio = 0.85 - (0.85 - baseRatio) * Math.pow(relH, 0.7);

  const kl = h * crRatio;
  const ka = h - kl;

  return { cw, kl, ka: Math.max(ka, 1.0) };
}

// === FBB Produktionskonzept 2022: Stammzahltabellen ===
// "Total N / ha (Stk.) vor Eingriff" — Oberhöhe [m] → N/ha
// Quelle: Produktionskonzept Forstbetrieb Burgergemeinde Bern, 28.06.2022
//
// Format: [oberhöhe_m, n_ha] Paare, aufsteigend nach Oberhöhe.
// Zwischen Stützpunkten wird linear interpoliert.
const FBB_NHA = {
  Fi:   [[12,2400],[14,2000],[17,1500],[20,1000],[23,600],[27,400],[34,200]],
  Ta:   [[12,2400],[14,2000],[17,1500],[20,1000],[23,600],[27,400],[34,200]],
  Bu:   [[18,1600],[22,1200],[25,800],[28,400],[33,300],[36,200]],
  Ei:   [[13,680],[16,580],[20,480],[22,375],[25,265],[28,150],[33,100],[38,50]],
  Es:   [[12,2000],[14,1600],[17,1200],[20,800],[23,400],[27,320],[33,80]],
  BAh:  [[12,2000],[14,1600],[17,1200],[20,800],[23,400],[27,320],[33,80]],
  WFoe: [[10,1450],[12,1250],[15,1050],[19,810],[23,550],[28,350],[34,200],[40,100]],
  Lae:  [[10,1450],[12,1250],[15,1050],[19,810],[23,550],[28,350],[34,200],[40,100]],
  Dou:  [[12,2200],[14,1800],[17,1300],[20,900],[23,550],[27,350],[34,180]],
};

/**
 * Stammzahl pro ha — Interpolation der FBB-Produktionskonzept-Tabellen.
 *
 * Für jede aktive Art wird anhand der aktuellen Oberhöhe die Stammzahl
 * aus der FBB-Tabelle interpoliert. Gewichtet nach Artanteil.
 *
 * Quelle: FBB Burgergemeinde Bern 2022 — echte waldbauliche Stammzahlen
 * inkl. Konkurrenten (nicht nur Z-Bäume).
 *
 * @param {number} age — Bestandesalter in Jahren
 * @returns {number} Stammzahl N/ha
 */
function nHa(age) {
  if (age <= 0) return 2400;

  // Plenterwald: Stammzahl bleibt hoch weil alle Altersklassen vorhanden
  // Gleichgewichts-Stammzahl ca. 400-600 N/ha (Schütz 2002)
  // Inverse-J: viele kleine + wenige grosse Bäume
  // Fix: Density-Slider als Gleichgewichtsstammzahl nutzbar
  if (typeof S !== 'undefined' && S && S.mode === 'ungleich') {
    const sliderVal = typeof document !== 'undefined' ?
      +(document.getElementById('density')?.value || 500) : 500;
    const baseN = Math.max(200, Math.min(600, sliderVal));
    if (age < 20) return Math.round(2400 - (2400 - baseN) * age / 20);
    return baseN;
  }

  let totalPct = 0, weightedN = 0;

  if (typeof S !== 'undefined' && S && S.sp) {
    for (const [k, s] of Object.entries(S.sp)) {
      if (!s.on || s.pct <= 0) continue;
      const h = hdom(k, age);
      const table = FBB_NHA[k];

      if (table && h > 0) {
        // Interpolation der FBB-Tabelle
        let n;
        if (h <= table[0][0]) {
          // Unter erster Stufe: extrapoliere linear von 2400 bei h=0
          n = 2400 + (table[0][1] - 2400) * (h / table[0][0]);
        } else if (h >= table[table.length - 1][0]) {
          // Über letzter Stufe: Endbestand halten
          n = table[table.length - 1][1];
        } else {
          // Lineare Interpolation
          for (let i = 0; i < table.length - 1; i++) {
            if (h >= table[i][0] && h <= table[i + 1][0]) {
              const t = (h - table[i][0]) / (table[i + 1][0] - table[i][0]);
              n = table[i][1] + t * (table[i + 1][1] - table[i][1]);
              break;
            }
          }
        }
        if (n !== undefined) {
          weightedN += s.pct * n;
          totalPct += s.pct;
        }
      } else {
        // Fallback: einfache Schätzung
        weightedN += s.pct * Math.max(200, 2400 - age * 25);
        totalPct += s.pct;
      }
    }
  }

  // Fallback: Buche
  if (totalPct <= 0) {
    const h = hdom('Bu', age);
    return nHaFromTable(FBB_NHA.Bu, h);
  }

  return Math.max(Math.round(weightedN / totalPct), 50);
}

/**
 * Bestimmt die aktuelle waldbauliche Phase für ein Alter
 * @param {number} age
 * @returns {Object} Phase-Objekt aus PHASES
 */
function getPhase(age) {
  for (const p of PHASES) {
    if (age >= p.ageStart && age < p.ageEnd) return p;
  }
  return PHASES[PHASES.length - 1];
}

/**
 * Aktualisiert alle Baum-Parameter basierend auf Alter.
 *
 * Berechnet für jede aktive Art: H, BHD, CW, KL, KA aus Wachstumskurven.
 * Passt auch die Stammzahl (density) an.
 *
 * @param {number} age — Bestandesalter in Jahren (0-120)
 */
function applyAge(age) {
  if (typeof S === 'undefined' || !S || !S.sp) return;

  S.age = age;
  S.density = nHa(age);

  for (const [k, s] of Object.entries(S.sp)) {
    if (!s.on) continue;
    const gp = GROWTH_PARAMS[k];
    if (!gp) continue;

    const h = hdom(k, age);
    if (h < 1) {
      s.h = Math.max(h, 0.5);
      s.cw = 0.3;
      s.kl = Math.max(h * 0.8, 0.3);
      s.ka = Math.max(h - s.kl, 0.1);
      s.bhd = 0;
      continue;
    }

    const bhd = bhdFromH(k, h);
    const crown = crownFromBHD(k, bhd, h);

    s.h   = +h.toFixed(1);
    s.bhd = +bhd.toFixed(0);
    s.cw  = +crown.cw.toFixed(1);
    s.kl  = +crown.kl.toFixed(1);
    s.ka  = +crown.ka.toFixed(1);
  }
}

