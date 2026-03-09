// === crownFront.js ===
/**
 * crownFront.js — Kronenformen Frontansicht (pro Art)
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - crownPts(type, cx, top, base, hw, cH, jit) — Berechnet Kronenpunkte
 *   - p2p(pts)                                    — Konvertiert Punkte zu SVG-Pfad
 *   - genFoliageBlobs(cx, top, base, hw, cH, jit, type) — Foliage-Cluster für Laubbäume
 *
 * Abhängigkeiten: generator.js (mR, W)
 * Wird benötigt von: renderFront.js
 *
 * HINWEIS: Diese Datei wird in Phase 1 iterativ verbessert!
 * Aktueller Stand: v5-Extraktion (Baseline)
 */

/** Totäste und Klebäste am Stamm (Frontansicht) */
function drawBranchStubs(t, gY, tw) {
  let svg = '';
  if (!t.bhd || t.bhd < 20 || t.h < 15) return svg;

  // Deterministic "random" from jit
  const s1 = Math.abs(Math.sin(t.jit * 1000));
  const s2 = Math.abs(Math.cos(t.jit * 777));
  if (s1 > 0.45) return svg; // only ~45% of mature trees

  const nBr = 1 + Math.floor(s1 * 2.5); // 1-3 branches
  const kaY = gY - t.ka;

  for (let i = 0; i < nBr; i++) {
    const frac = 0.25 + (i / nBr) * 0.55;
    const bY = gY - t.ka * frac;
    const bLen = tw * 1.8 + s2 * 1.2;
    const side = (i % 2 === 0) ? 1 : -1;
    const droop = 0.12 + s1 * 0.15;

    // Totast: kurzer, nach unten hängender Aststummel
    svg += '<line x1="' + t.x + '" y1="' + bY + '" x2="' + (t.x + side * bLen) + '" y2="' + (bY + droop * bLen) + '" stroke="#7a6a5a" stroke-width=".12" stroke-linecap="round"/>';
  }

  // Klebast bei Laubbäumen mit grossem BHD
  const sp = typeof SPECIES !== 'undefined' ? SPECIES[t.sp] : null;
  if (sp && sp.deciduous && t.bhd > 35 && s2 > 0.4) {
    const kY = gY - 1.5;
    const kLen = tw * 2.5;
    const kSide = s1 > 0.25 ? 1 : -1;
    svg += '<line x1="' + t.x + '" y1="' + kY + '" x2="' + (t.x + kSide * kLen) + '" y2="' + (kY - 0.3) + '" stroke="#8a7a6a" stroke-width=".15" stroke-linecap="round"/>';
  }

  return svg;
}

/**
 * Berechnet die Kronenpunkte (Umrisslinie) für einen Baum in der Frontansicht
 *
 * @param {string} type - Kronentyp (dome, layered, spire, spreading, round, umbrella, lightcone, vase)
 * @param {number} cx   - X-Position Stammmitte
 * @param {number} top  - Y-Position Kronenspitze (oben)
 * @param {number} base - Y-Position Kronenansatz (unten)
 * @param {number} hw   - Halbe Kronenbreite
 * @param {number} cH   - Kronenhöhe (Kronenlänge)
 * @param {number} jit  - Jitter für reproduzierbare Variation
 * @returns {Array} Array von [x, y] Punkten
 */
function crownPts(type, cx, top, base, hw, cH, jit) {
  const pts = [];
  const N = 30;

  switch (type) {

    // === LAUBBÄUME ===

    case 'dome': {
      // Buche (Fagus sylvatica) — Breite, bucklige Kuppel
      // Natürliches Wachstum: Kronenrand deutlich lobat durch
      // konkurrierende Astgruppen (Hauptlaubpartien). Im Bestand
      // höher als breit — Krone füllt die volle Kronenlänge.
      // Konische Basis: Krone verjüngt sich zum Stamm hin.
      // Ref: SPECIES_REFERENCE.md, Pampigny-Profile, NaiS 2A

      const rngD = mR(Math.round(jit * 1000));

      // 4-6 Hauptlaubpartien (crown lobes)
      const nLobes = 4 + Math.floor(rngD() * 3);
      const lobes = [];
      for (let l = 0; l < nLobes; l++) {
        lobes.push({
          a: (l + 0.3 + rngD() * 0.4) / nLobes * Math.PI,
          s: 0.06 + rngD() * 0.12,
          w: 0.08 + rngD() * 0.10
        });
      }

      // --- Konische Basis: Krone verjüngt sich zum Stamm ---
      // Stammbreite-Anteil an der Kronenmitte (schmaler Ansatz)
      const taperW = hw * 0.15; // Breite am Stammansatz (~15% der halben Kronenbreite)
      const taperH = cH * 0.08; // Höhe des konischen Übergangs unter dem Dome

      // Linke Taper-Punkte: von Stamm nach aussen
      pts.push([cx - taperW, base + taperH * 0.3]);
      pts.push([cx - taperW * 1.3, base]);
      pts.push([cx - hw * 0.35, base - cH * 0.03]);

      const ND = 56;
      // Dome-Bogen beginnt bei ~5% und endet bei ~95% (Taper übernimmt die Enden)
      for (let i = 2; i <= ND - 2; i++) {
        const t = i / ND;
        const a = Math.PI * t;

        // Basis: abgeflachte Kuppel (pow < 1 = breiterer Scheitel)
        let r = Math.pow(Math.sin(a), 0.82);

        // Loben-Modulation (Gauss-Bumps)
        for (const lb of lobes) {
          const da = a - lb.a;
          r += lb.s * Math.exp(-da * da / (2 * lb.w * lb.w));
        }

        // Mittlere Buckel (Astgruppen-Ebene)
        r *= 1 + 0.04 * Math.sin(a * 6.7 + jit * 1.3)
               + 0.03 * Math.sin(a * 10.3 + jit * 2.1)
               + 0.02 * Math.sin(a * 4.3 + jit * 0.8);

        // Feine Rauhigkeit (Blatt-/Zweig-Ebene)
        r *= 1 + 0.015 * Math.sin(a * 17.1 + jit * 2.9)
               + 0.010 * Math.sin(a * 23.7 + jit * 3.6);

        // Leichte Asymmetrie (Wind/Licht)
        r *= 1 + 0.02 * Math.sin(a * 1.15 + jit * 0.4);

        // Volle Kronenlänge: ry ≈ 0.88 × cH
        // Mit Loben (~+10-15%) erreicht Scheitel ≈ 95-100% von cH
        // Clamp bei top verhindert Überschreitung der Baumhöhe
        const ry = cH * (0.88 + 0.012 * Math.sin(a * 2.3 + jit * 0.6));

        pts.push([
          cx - hw + t * hw * 2,
          Math.max(top, base - r * ry)
        ]);
      }

      // Rechte Taper-Punkte: von aussen zurück zum Stamm
      pts.push([cx + hw * 0.35, base - cH * 0.03]);
      pts.push([cx + taperW * 1.3, base]);
      pts.push([cx + taperW, base + taperH * 0.3]);

      break;
    }

    case 'spreading': {
      // Eiche (Quercus ssp.) — Breite, knorrige, FLACHE Krone
      // Breiter als hoch: Scheitel abgeflacht (pow 0.55), knorrige Asymmetrie.
      // 3-5 unregelmässige Loben (weniger als Buche, gröber).
      // Grösste Kronenbreite aller Arten (14m).
      // Ref: VISUAL_GUIDELINES.md, Waldbau IV §6.1
      const rngS = mR(Math.round(jit * 1000 + 1));

      // 3-5 grobe Loben (Eiche hat weniger, kräftigere Astpartien als Buche)
      const nLobesS = 3 + Math.floor(rngS() * 3);
      const lobesS = [];
      for (let l = 0; l < nLobesS; l++) {
        lobesS.push({
          a: (l + 0.2 + rngS() * 0.6) / nLobesS * Math.PI,
          s: 0.08 + rngS() * 0.14, // stärker als Buche (knorriger)
          w: 0.10 + rngS() * 0.12
        });
      }

      // Konische Basis
      const taperWS = hw * 0.12;
      pts.push([cx - taperWS, base + cH * 0.04]);
      pts.push([cx - taperWS * 1.5, base]);
      pts.push([cx - hw * 0.3, base - cH * 0.02]);

      const NS = 48; // mehr Punkte für glattere Form
      for (let i = 2; i <= NS - 2; i++) {
        const t = i / NS;
        const a = Math.PI * t;

        // Basis: FLACH (pow 0.55 = flacher Scheitel, breite Schultern)
        let r = Math.pow(Math.sin(a), 0.55);

        // Loben-Modulation (Gauss-Bumps)
        for (const lb of lobesS) {
          const da = a - lb.a;
          r += lb.s * Math.exp(-da * da / (2 * lb.w * lb.w));
        }

        // Gröbere Buckel (Eiche ist knorriger als Buche)
        r *= 1 + 0.06 * Math.sin(a * 4.3 + jit * 1.1)
               + 0.05 * Math.sin(a * 7.1 + jit * 2.3)
               + 0.03 * Math.sin(a * 2.7 + jit * 0.7);

        // Feinere Rauhigkeit
        r *= 1 + 0.02 * Math.sin(a * 13.3 + jit * 2.5)
               + 0.015 * Math.sin(a * 19.7 + jit * 3.2);

        // Stärkere Asymmetrie (Eiche wächst oft einseitig)
        r *= 1 + 0.04 * Math.sin(a * 1.1 + jit * 0.5);

        // Kronenradius: weniger als Buche (flacher = kürzer vertikal)
        // 0.72 statt 0.88 → flachere Krone, da Eiche breiter als hoch
        const ryS = cH * (0.72 + 0.015 * Math.sin(a * 2.1 + jit * 0.8));

        pts.push([
          cx - hw + t * hw * 2,
          Math.max(top, base - r * ryS)
        ]);
      }

      pts.push([cx + hw * 0.3, base - cH * 0.02]);
      pts.push([cx + taperWS * 1.5, base]);
      pts.push([cx + taperWS, base + cH * 0.04]);
      break;
    }

    case 'round': {
      // Bergahorn (Acer pseudoplatanus) — Kompakte, RUNDE Krone
      // Gleichmässiger als Buche (weniger lobat), höher als Eiche.
      // Fast kreisrunde Silhouette mit nur leichter Unregelmässigkeit.
      // 2-4 subtile Loben (Bergahorn hat gleichmässige Krone).
      // Ref: VISUAL_GUIDELINES.md, Waldbau III Abb. 2.1
      const rngR = mR(Math.round(jit * 1000 + 2));

      // 2-4 subtile Loben (weniger und schwächer als Buche/Eiche)
      const nLobesR = 2 + Math.floor(rngR() * 3);
      const lobesR = [];
      for (let l = 0; l < nLobesR; l++) {
        lobesR.push({
          a: (l + 0.3 + rngR() * 0.4) / nLobesR * Math.PI,
          s: 0.03 + rngR() * 0.06, // schwächer als Buche (gleichmässiger)
          w: 0.12 + rngR() * 0.10  // breiter (sanftere Übergänge)
        });
      }

      // Konische Basis
      const taperWR = hw * 0.13;
      pts.push([cx - taperWR, base + cH * 0.04]);
      pts.push([cx - taperWR * 1.4, base]);
      pts.push([cx - hw * 0.32, base - cH * 0.02]);

      const NR = 44;
      for (let i = 2; i <= NR - 2; i++) {
        const t = i / NR;
        const a = Math.PI * t;

        // Fast kreisrund: pow(sin, 0.95) → kaum abgeflacht
        let r = Math.pow(Math.sin(a), 0.95);

        // Subtile Loben-Modulation
        for (const lb of lobesR) {
          const da = a - lb.a;
          r += lb.s * Math.exp(-da * da / (2 * lb.w * lb.w));
        }

        // Nur leichte Buckel (gleichmässiger als Buche/Eiche)
        r *= 1 + 0.03 * Math.sin(a * 5.1 + jit * 1.3)
               + 0.02 * Math.sin(a * 8.7 + jit * 2.1);

        // Feine Textur
        r *= 1 + 0.012 * Math.sin(a * 14.5 + jit * 2.7)
               + 0.008 * Math.sin(a * 21.3 + jit * 3.4);

        // Minimale Asymmetrie
        r *= 1 + 0.015 * Math.sin(a * 1.2 + jit * 0.3);

        // ry = 0.82 × cH (zwischen Buche 0.88 und Eiche 0.72)
        const ryR = cH * (0.82 + 0.010 * Math.sin(a * 2.5 + jit * 0.7));

        pts.push([
          cx - hw + t * hw * 2,
          Math.max(top, base - r * ryR)
        ]);
      }

      pts.push([cx + hw * 0.32, base - cH * 0.02]);
      pts.push([cx + taperWR * 1.4, base]);
      pts.push([cx + taperWR, base + cH * 0.04]);
      break;
    }

    case 'vase': {
      // Esche (Fraxinus excelsior) — VASENFÖRMIG
      // Punkte werden höhenbasiert erzeugt:
      //   Linke Seite: von unten (base) nach oben (top)
      //   Rechte Seite: von oben nach unten (base)
      // Breiten-Envelope: unten schmal (~40%), max bei ~70% Höhe, oben schmaler.
      // Ref: VISUAL_GUIDELINES.md, Waldbau III Abb. 2.1
      const rngV = mR(Math.round(jit * 1000 + 3));

      // 3-5 Loben für organischen Rand
      const nLobesV = 3 + Math.floor(rngV() * 3);
      const lobesV = [];
      for (let l = 0; l < nLobesV; l++) {
        lobesV.push({
          h: (l + 0.2 + rngV() * 0.6) / nLobesV, // Position als Höhen-Fraktion 0-1
          s: 0.04 + rngV() * 0.08,
          w: 0.10 + rngV() * 0.10
        });
      }

      // Vasen-Breiten-Funktion: f(hFrac) → Breitenfaktor
      // hFrac=0 (Basis): schmal (0.35)
      // hFrac=0.55: breiteste Stelle (~1.0)
      // hFrac=1.0 (oben): FLACHES PLATEAU (~0.45), NICHT spitz!
      // Ref: Fraxinus-Habitus — Krone oben aufgefächert, breites Dach
      function vaseWidth(hFrac) {
        // Schneller Anstieg von unten, breites Plateau oben
        // pow(hFrac, 0.35) → schneller Anstieg, oben flach
        const rise = Math.pow(Math.min(hFrac * 1.5, 1.0), 0.35);
        // Oben nur leicht verengen: Minimum bei 0.45 (nicht 0)
        // sin-Kurve mit Maximum bei hFrac~0.55
        const bellTop = 0.45 + 0.55 * Math.sin(Math.PI * Math.pow(hFrac, 0.60));
        // Unten einschnüren
        const pinch = 0.35 + 0.65 * Math.pow(hFrac, 0.45);
        return Math.min(rise, bellTop, pinch);
      }

      const NV = 22; // Punkte pro Seite
      const ryV = cH * 0.82;

      // Konische Basis
      const taperWV = hw * 0.10;
      pts.push([cx - taperWV, base + cH * 0.035]);
      pts.push([cx - taperWV * 1.0, base]);

      // LINKE SEITE: von unten nach oben
      for (let i = 1; i <= NV; i++) {
        const hFrac = i / (NV + 1); // 0→1 von Basis nach Spitze
        let w = vaseWidth(hFrac);

        // Loben-Modulation
        for (const lb of lobesV) {
          const dh = hFrac - lb.h;
          w += lb.s * Math.exp(-dh * dh / (2 * lb.w * lb.w));
        }

        // Buckel + Rauhigkeit
        w *= 1 + 0.035 * Math.sin(hFrac * 16.7 + jit * 1.4)
               + 0.020 * Math.sin(hFrac * 31.3 + jit * 2.8);

        // Asymmetrie (links etwas anders als rechts)
        w *= 1 + 0.025 * Math.sin(hFrac * 4.1 + jit * 0.5);

        const y = Math.max(top, base - hFrac * ryV);
        pts.push([cx - hw * w, y]);
      }

      // FLACHER SCHEITEL statt Spitze: 3 Punkte über die Breite
      {
        const topW = vaseWidth(0.96);
        const topY = Math.max(top, base - ryV);
        // Leichte Buckel am Scheitel für organischen Look
        const bL = 0.03 * Math.sin(jit * 2.1);
        const bR = 0.03 * Math.sin(jit * 3.4);
        pts.push([cx - hw * (topW * 0.5 + bL), topY + ryV * 0.01]);
        pts.push([cx + hw * 0.02 * (rngV() - 0.5), topY]);
        pts.push([cx + hw * (topW * 0.5 + bR), topY + ryV * 0.01]);
      }

      // RECHTE SEITE: von oben nach unten
      for (let i = NV; i >= 1; i--) {
        const hFrac = i / (NV + 1);
        let w = vaseWidth(hFrac);

        // Loben (leicht verschoben für Asymmetrie)
        for (const lb of lobesV) {
          const dh = hFrac - lb.h;
          w += lb.s * 0.9 * Math.exp(-dh * dh / (2 * lb.w * lb.w));
        }

        // Buckel + Rauhigkeit (leicht andere Phase als links)
        w *= 1 + 0.030 * Math.sin(hFrac * 16.7 + jit * 1.7)
               + 0.018 * Math.sin(hFrac * 31.3 + jit * 3.1);

        // Asymmetrie rechte Seite
        w *= 1 - 0.020 * Math.sin(hFrac * 4.1 + jit * 0.5);

        const y = Math.max(top, base - hFrac * ryV);
        pts.push([cx + hw * w, y]);
      }

      pts.push([cx + taperWV * 1.0, base]);
      pts.push([cx + taperWV, base + cH * 0.035]);
      break;
    }

    // === NADELBÄUME ===

    case 'layered': {
      // Weisstanne (Abies alba) — Gestufte Pyramide mit horizontalen Astquirlen
      // Deutlich sichtbare Etagen (6-8 Quirle), jede Astlage leicht durchhängend
      // mit aufgebogenen Enden. Konischer Gesamtumriss, deutlich schmaler als Buche.
      // Einschnitte zwischen Etagen zeigen ~50-60% der Etagenbreite (nicht bis Stamm).
      // Ref: SPECIES_REFERENCE.md, VISUAL_GUIDELINES.md §2 Tanne
      const rngL = mR(Math.round(jit * 1000 + 10));

      // 6-8 Astquirle
      const nTiers = 6 + Math.floor(rngL() * 3);

      // Konische Envelope: Breitenfaktor f(f) — f=0 oben, f=1 Basis
      function tierEnv(f) {
        return Math.pow(f, 0.82) * (0.95 + 0.05 * Math.sin(Math.PI * f));
      }

      // === SPITZE ===
      pts.push([cx + hw * 0.005 * (rngL() - 0.5), top + cH * 0.005]);

      // Hilfsfunktion: Erzeuge eine Etage (rechte Seite)
      // Gibt 5 Punkte zurück: aufsteigend → hängend → Spitze (aufgebogen)
      function tierRight(i) {
        const f = i / nTiers;
        const ly = top + cH * f;
        const envW = tierEnv(f) * hw;

        const vr = 0.93 + rngL() * 0.14; // Breiten-Variation 93-107%
        const droop = 0.010 + rngL() * 0.015; // Durchhang
        const upturn = 0.006 + rngL() * 0.010; // Aufbiegung

        // 5 Punkte pro Etage für glattere Kurve:
        // P1: Astansatz nahe Stamm (leicht aufwärts)
        const p1x = cx + envW * 0.15;
        const p1y = ly - cH * (0.015 + rngL() * 0.01);

        // P2: Innerer Ast (30% Breite, auf Etagen-Höhe)
        const p2x = cx + envW * (0.35 + rngL() * 0.05);
        const p2y = ly;

        // P3: Ast-Mitte (55% Breite, leicht hängend)
        const p3x = cx + envW * (0.58 + rngL() * 0.08);
        const p3y = Math.min(ly + cH * droop * 0.7, base - 0.15);

        // P4: Äusserer Ast (80% Breite, maximaler Durchhang)
        const p4x = cx + envW * (0.80 + rngL() * 0.06);
        const p4y = Math.min(ly + cH * droop, base - 0.1);

        // P5: Astspitze (leicht aufgebogen)
        const tipJit = hw * 0.015 * Math.sin(jit * 3.7 + i * 2.1);
        const p5x = cx + envW * vr + tipJit;
        const p5y = Math.min(ly + cH * (droop - upturn), base - 0.05);

        return [[p1x, p1y], [p2x, p2y], [p3x, p3y], [p4x, p4y], [p5x, p5y]];
      }

      // === RECHTE SEITE: Etagen von oben nach unten ===
      for (let i = 1; i <= nTiers; i++) {
        const tierPts = tierRight(i);
        for (const p of tierPts) pts.push(p);

        // Einschnitt zwischen Etagen
        if (i < nTiers) {
          const f = i / nTiers;
          const ly = top + cH * f;
          const envW = tierEnv(f) * hw;

          // Einrückung: 45-60% der AKTUELLEN Etagenbreite (nicht bis Stamm!)
          const indentFrac = 0.45 + rngL() * 0.15;
          const indentW = envW * indentFrac;
          const indentY1 = Math.min(ly + cH * 0.003, base - 0.2);
          const indentY2 = Math.min(top + cH * ((i + 0.35) / nTiers), base - 0.15);
          pts.push([cx + indentW, indentY1]);
          pts.push([cx + indentW * 0.92, indentY2]);
        }
      }

      // === BASIS ===
      pts.push([cx + hw * 0.06, base]);
      pts.push([cx - hw * 0.06, base]);

      // === LINKE SEITE: von unten nach oben (gespiegelt mit Variation) ===
      for (let i = nTiers; i >= 1; i--) {
        const f = i / nTiers;
        const ly = top + cH * f;
        const envW = tierEnv(f) * hw;

        // Eigener RNG pro Tier für Asymmetrie
        const rngL2 = mR(Math.round(jit * 1000 + 10 + i * 7));
        const vr = 0.93 + rngL2() * 0.14;
        const droop = 0.010 + rngL2() * 0.015;
        const upturn = 0.006 + rngL2() * 0.010;

        // Einschnitt von unten kommend
        if (i < nTiers) {
          const indentFrac = 0.45 + rngL2() * 0.15;
          const indentW = envW * indentFrac;
          const transY = Math.min(top + cH * ((i + 0.35) / nTiers), base - 0.15);
          pts.push([cx - indentW * 0.92, transY]);
          pts.push([cx - indentW, Math.min(ly + cH * 0.003, base - 0.2)]);
        }

        // 5 Punkte Astprofil (gespiegelt)
        const tipJit = hw * 0.015 * Math.sin(jit * 4.1 + i * 1.9);
        const p5x = cx - envW * vr + tipJit;
        const p5y = Math.min(ly + cH * (droop - upturn), base - 0.05);
        pts.push([p5x, p5y]);

        const p4x = cx - envW * (0.80 + rngL2() * 0.06);
        const p4y = Math.min(ly + cH * droop, base - 0.1);
        pts.push([p4x, p4y]);

        const p3x = cx - envW * (0.58 + rngL2() * 0.08);
        const p3y = Math.min(ly + cH * droop * 0.7, base - 0.15);
        pts.push([p3x, p3y]);

        const p2x = cx - envW * (0.35 + rngL2() * 0.05);
        pts.push([p2x, ly]);

        const p1x = cx - envW * 0.15;
        const p1y = ly - cH * (0.015 + rngL2() * 0.01);
        pts.push([p1x, p1y]);
      }

      break;
    }

    case 'spire': {
      // Fichte (Picea abies) — Schmaler, spitzer Kegel ("Kirchturm")
      // Gleichmässiger als Tanne, KEINE ausgeprägten Stufen.
      // Leichte Zacken am Rand (hängende Äste, Lametta-Effekt).
      // Schmalste Krone der Nadelbäume (cw=6m).
      // Ref: SPECIES_REFERENCE.md, VISUAL_GUIDELINES.md §2 Fichte
      const rngF = mR(Math.round(jit * 1000 + 20));

      // Spitze (scharf, leicht asymmetrisch)
      const spTipOff = hw * 0.01 * (rngF() - 0.5);
      pts.push([cx + spTipOff, top]);

      // Konische Envelope mit leichter Konkavität (schlanker als Tanne)
      // pow(f, 0.92) → fast linear, typisch Fichte
      function spireEnv(f) {
        return Math.pow(f, 0.92) * (0.96 + 0.04 * Math.sin(Math.PI * f * 0.6));
      }

      const NF = 28; // Fein genug für glatte Kontur mit Zacken

      // === RECHTE SEITE ===
      for (let i = 1; i <= NF; i++) {
        const f = i / NF;
        const ly = top + cH * f;
        let w = spireEnv(f);

        // Hängende Ast-Zacken: kleine, regelmässige Einbuchtungen
        // Amplitude nimmt nach unten zu (ältere, längere Äste)
        const zackAmp = 0.04 + f * 0.06; // 4-10% Einbuchtung
        const zackFreq = 8 + Math.floor(rngF() * 4); // 8-11 Zyklen
        const zackPhase = rngF() * Math.PI * 2;
        const zack = zackAmp * Math.sin(f * zackFreq * Math.PI + zackPhase + jit);

        // Feinere Rauhigkeit (Nadelsilhouette)
        const fine = 0.015 * Math.sin(f * 19.3 + jit * 2.7)
                   + 0.010 * Math.sin(f * 31.7 + jit * 3.9);

        // Leichte Asymmetrie (Wind)
        const asym = 0.02 * Math.sin(f * 1.3 + jit * 0.6);

        w *= (1 + zack + fine + asym);

        // Variation pro Individuum
        w *= (0.95 + rngF() * 0.10);

        pts.push([cx + w * hw, Math.min(ly, base)]);
      }

      // Basis
      pts.push([cx + hw * 0.05, base]);
      pts.push([cx - hw * 0.05, base]);

      // === LINKE SEITE (gespiegelt mit anderer Phase) ===
      for (let i = NF; i >= 1; i--) {
        const f = i / NF;
        const ly = top + cH * f;
        let w = spireEnv(f);

        // Gleiche Struktur, andere Phase für Asymmetrie
        const zackAmp = 0.04 + f * 0.06;
        const zackFreq = 8 + Math.floor(rngF() * 4);
        const zackPhase = rngF() * Math.PI * 2;
        const zack = zackAmp * Math.sin(f * zackFreq * Math.PI + zackPhase + jit + 1.5);

        const fine = 0.015 * Math.sin(f * 19.3 + jit * 3.1)
                   + 0.010 * Math.sin(f * 31.7 + jit * 4.3);

        const asym = -0.02 * Math.sin(f * 1.3 + jit * 0.6);

        w *= (1 + zack + fine + asym);
        w *= (0.95 + rngF() * 0.10);

        pts.push([cx - w * hw, Math.min(ly, base)]);
      }

      break;
    }

    case 'umbrella': {
      // Waldföhre (Pinus sylvestris) — Schirmförmig, flach, hoher Kronenansatz
      // Höhenbasierter Ansatz (wie 'vase'): Punkte von unten nach oben (links),
      // flacher Scheitel, dann von oben nach unten (rechts).
      // Breitenprofil: unten schmal (~20%), schnell ausladend, oben BREIT (~100%).
      // Scheitel: FLACH (breites Plateau, nicht spitz).
      // Ref: SPECIES_REFERENCE.md, VISUAL_GUIDELINES.md §2 Waldföhre
      const rngU = mR(Math.round(jit * 1000 + 30));

      // Breiter als Nominal
      const umbW = hw * (1.05 + rngU() * 0.10);

      // 3-4 Loben für knorrige Oberfläche
      const nLobesU = 3 + Math.floor(rngU() * 2);
      const lobesU = [];
      for (let l = 0; l < nLobesU; l++) {
        lobesU.push({
          h: (l + 0.2 + rngU() * 0.6) / nLobesU, // Position als Höhenfraktion
          s: 0.04 + rngU() * 0.08,
          w: 0.10 + rngU() * 0.10
        });
      }

      // Breitenprofil: f=0 (Basis), f=1 (Scheitel)
      // Unten schmal, schnell ausladend, Maximum bei ~70% Höhe,
      // oben sanft verjüngt auf ~75% → breiter, flacher Schirm
      function umbWidth(f) {
        // Anstieg: pow(f, 0.50) → schnell breit
        const rise = Math.pow(f, 0.50);
        // Sanfte Verjüngung am Scheitel: ab f>0.7 auf 75%
        const topCap = f > 0.7 ? 1.0 - 0.25 * Math.pow((f - 0.7) / 0.3, 2) : 1.0;
        return rise * topCap;
      }

      const NU = 22; // Punkte pro Seite
      const ryU = cH * 0.92;

      // Taper-Basis links
      const taperWU = umbW * 0.10;
      pts.push([cx - taperWU, base + cH * 0.02]);
      pts.push([cx - taperWU, base]);

      // === LINKE SEITE: von unten nach oben (i=1..NU) ===
      for (let i = 1; i <= NU; i++) {
        const f = i / (NU + 1);
        let w = umbWidth(f);

        for (const lb of lobesU) {
          const dh = f - lb.h;
          w += lb.s * Math.exp(-dh * dh / (2 * lb.w * lb.w));
        }

        // Knorrige Buckel (typisch Föhre, moderat)
        w *= 1 + 0.035 * Math.sin(f * 8.3 + jit * 1.3)
               + 0.025 * Math.sin(f * 13.7 + jit * 2.1);
        // Feine Rauhigkeit
        w *= 1 + 0.012 * Math.sin(f * 21.1 + jit * 2.9);
        // Asymmetrie links
        w *= 1 + 0.02 * Math.sin(f * 2.7 + jit * 0.5);

        const y = Math.max(top, base - f * ryU);
        pts.push([cx - umbW * w, y]);
      }

      // === FLACHER SCHEITEL ===
      // 3 Punkte: genau so breit wie letzter Seitenpunkt → kein V-Einschnitt
      {
        const topY = Math.max(top, base - ryU);
        const topF = NU / (NU + 1);
        const topW = umbWidth(topF) * umbW;
        pts.push([cx - topW * 0.95, topY + cH * 0.002]);
        pts.push([cx + umbW * 0.01 * (rngU() - 0.5), topY]);
        pts.push([cx + topW * 0.95, topY + cH * 0.002]);
      }

      // === RECHTE SEITE: von oben nach unten (i=NU..1) ===
      for (let i = NU; i >= 1; i--) {
        const f = i / (NU + 1);
        let w = umbWidth(f);

        for (const lb of lobesU) {
          const dh = f - lb.h;
          w += lb.s * 0.9 * Math.exp(-dh * dh / (2 * lb.w * lb.w));
        }

        // Buckel (andere Phase als links)
        w *= 1 + 0.030 * Math.sin(f * 8.3 + jit * 1.6)
               + 0.020 * Math.sin(f * 13.7 + jit * 2.5);
        w *= 1 + 0.012 * Math.sin(f * 21.1 + jit * 3.2);
        // Asymmetrie rechts
        w *= 1 - 0.018 * Math.sin(f * 2.7 + jit * 0.5);

        const y = Math.max(top, base - f * ryU);
        pts.push([cx + umbW * w, y]);
      }

      // Taper-Basis rechts
      pts.push([cx + taperWU, base]);
      pts.push([cx + taperWU, base + cH * 0.02]);

      break;
    }

    case 'lightcone': {
      // Lärche (Larix decidua) — Lockerer, leichter, LUFTIGER Kegel
      // Sommergrüner Nadelbaum → lichtdurchlässiger als Fichte/Tanne.
      // Äste dünn, leicht hängend. Krone wirkt transparent/offen.
      // Unregelmässiger als Fichte, mit grösseren Einbuchtungen (Luftlöcher).
      // Ref: SPECIES_REFERENCE.md, VISUAL_GUIDELINES.md §2 Lärche
      const rngLa = mR(Math.round(jit * 1000 + 40));

      // Spitze
      pts.push([cx + hw * 0.008 * (rngLa() - 0.5), top + cH * 0.003]);

      // Konische Envelope — etwas unregelmässiger als Fichte
      function larchEnv(f) {
        return Math.pow(f, 0.88) * (0.92 + 0.08 * Math.sin(Math.PI * f * 0.7));
      }

      const NLa = 24; // Weniger Punkte → gröbere Kontur (luftiger Look)

      // 3-5 "Luftlöcher" (grössere Einbuchtungen wo Äste fehlen/dünn sind)
      const nGaps = 3 + Math.floor(rngLa() * 3);
      const gaps = [];
      for (let g = 0; g < nGaps; g++) {
        gaps.push({
          f: 0.15 + rngLa() * 0.70, // Position (15-85% der Höhe)
          s: 0.08 + rngLa() * 0.12, // Stärke (8-20% Einbuchtung)
          w: 0.06 + rngLa() * 0.06  // Breite
        });
      }

      // === RECHTE SEITE ===
      for (let i = 1; i <= NLa; i++) {
        const f = i / NLa;
        const ly = top + cH * f;
        let w = larchEnv(f);

        // Grundzacken (leicht hängende Äste)
        const hangAmp = 0.03 + f * 0.04;
        w *= 1 + hangAmp * Math.sin(f * 7.3 * Math.PI + jit * 1.5);

        // Luftlöcher (grössere Einbuchtungen)
        for (const gap of gaps) {
          const df = f - gap.f;
          w -= gap.s * Math.exp(-df * df / (2 * gap.w * gap.w));
        }

        // Feine Rauhigkeit
        w *= 1 + 0.02 * Math.sin(f * 15.7 + jit * 2.3)
               + 0.015 * Math.sin(f * 22.3 + jit * 3.7);

        // Asymmetrie
        w *= 1 + 0.025 * Math.sin(f * 1.4 + jit * 0.7);

        // Individuelle Variation
        w *= 0.93 + rngLa() * 0.14;

        // Mindestbreite (nicht komplett auf 0 einschnüren)
        w = Math.max(w, 0.08);

        pts.push([cx + w * hw, Math.min(ly, base)]);
      }

      // Basis
      pts.push([cx + hw * 0.05, base]);
      pts.push([cx - hw * 0.05, base]);

      // === LINKE SEITE ===
      // Eigene Luftlöcher für Asymmetrie
      const gapsL = [];
      for (let g = 0; g < nGaps; g++) {
        gapsL.push({
          f: 0.15 + rngLa() * 0.70,
          s: 0.08 + rngLa() * 0.12,
          w: 0.06 + rngLa() * 0.06
        });
      }

      for (let i = NLa; i >= 1; i--) {
        const f = i / NLa;
        const ly = top + cH * f;
        let w = larchEnv(f);

        const hangAmp = 0.03 + f * 0.04;
        w *= 1 + hangAmp * Math.sin(f * 7.3 * Math.PI + jit * 2.1);

        // Linke Luftlöcher (andere Positionen)
        for (const gap of gapsL) {
          const df = f - gap.f;
          w -= gap.s * Math.exp(-df * df / (2 * gap.w * gap.w));
        }

        w *= 1 + 0.02 * Math.sin(f * 15.7 + jit * 2.8)
               + 0.015 * Math.sin(f * 22.3 + jit * 4.1);

        w *= 1 - 0.025 * Math.sin(f * 1.4 + jit * 0.7);

        w *= 0.93 + rngLa() * 0.14;
        w = Math.max(w, 0.08);

        pts.push([cx - w * hw, Math.min(ly, base)]);
      }

      break;
    }
  }

  return pts;
}

/**
 * Konvertiert ein Array von Punkten zu einem SVG-Pfad-String
 * @param {Array} pts - Array von [x, y] Punkten
 * @returns {string} SVG path d-Attribut
 */
function p2p(pts) {
  if (!pts.length) return '';
  return 'M ' + pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' L ') + ' Z';
}

/**
 * Generiert Foliage-Blobs (Laubcluster) für Laubbäume
 * Verteilt Kreise innerhalb der Kronenform für volumetrischen Effekt
 *
 * @param {number} cx   - X-Position Stammmitte
 * @param {number} top  - Y Kronenspitze
 * @param {number} base - Y Kronenansatz
 * @param {number} hw   - Halbe Kronenbreite
 * @param {number} cH   - Kronenhöhe
 * @param {number} jit  - Jitter
 * @param {string} type - Kronentyp
 * @returns {Array} Array von {x, y, r, shade} Objekten
 */
function genFoliageBlobs(cx, top, base, hw, cH, jit, type) {
  const blobs = [];
  const rng2 = mR(Math.round(jit * 1000));
  const isDecid = ['dome', 'spreading', 'round', 'vase'].includes(type);
  if (!isDecid) return blobs;

  // Anzahl Blobs proportional zur Kronengrösse
  const area = hw * cH;
  // Dome: weniger, grössere Zonen; andere: mehr, kleinere Blobs
  const nBlobs = type === 'dome'
    ? Math.max(8, Math.min(22, Math.round(area * 0.18)))
    : Math.max(8, Math.min(35, Math.round(area * 0.3)));
  const midY = base - cH * 0.5;

  for (let i = 0; i < nBlobs; i++) {
    const ang = rng2() * Math.PI * 2;
    const rFrac = rng2() * 0.85;
    let bx, by, br;
    const t = rng2();

    switch (type) {
      case 'dome': {
        // Buche: Volumen-basierte Innentextur
        // Geschichtete Zonen statt kleiner Einzelkreise
        // Lichtrichtung: oben-links → hell; unten-rechts → dunkel
        const layerFrac = i / nBlobs;
        const yFrac = 0.08 + rng2() * 0.82;
        by = base - cH * yFrac;
        // Envelope passend zur neuen Dome-Form (pow 0.82, ry 0.92)
        const envWD = hw * Math.pow(Math.sin(Math.PI * Math.min(yFrac / 0.94, 1)), 0.82) * 0.88;
        bx = cx + (rng2() - 0.5) * envWD * 1.8;
        bx = Math.max(cx - envWD, Math.min(cx + envWD, bx));
        // Grössenstaffelung: erste 30% gross, mittlere mittel, letzte klein
        if (layerFrac < 0.3) {
          br = hw * (0.28 + rng2() * 0.18);
        } else if (layerFrac < 0.7) {
          br = hw * (0.16 + rng2() * 0.12);
        } else {
          br = hw * (0.09 + rng2() * 0.08);
        }
        break;
      }
      case 'spreading':
        by = base - cH * (0.05 + t * 0.85);
        bx = cx + (rng2() - 0.5) * hw * 1.8 * Math.sin(Math.PI * (by - top) / cH);
        br = hw * (0.14 + rng2() * 0.2);
        break;
      case 'round':
        by = base - cH * (0.08 + t * 0.82);
        bx = cx + (rng2() - 0.5) * hw * 1.5 * Math.sin(Math.PI * (by - top) / cH);
        br = hw * (0.11 + rng2() * 0.16);
        break;
      case 'vase': {
        const spread = 0.4 + 0.6 * Math.sin(Math.PI * t);
        by = base - cH * (0.05 + t * 0.88);
        bx = cx + (rng2() - 0.5) * hw * spread * 1.5;
        br = hw * (0.1 + rng2() * 0.15);
        break;
      }
    }

    // Auf Kronenumriss begrenzen (für nicht-Dome Typen)
    if (type !== 'dome') {
      const envW = hw * Math.sin(Math.PI * Math.max(0, Math.min(1, (base - by) / cH))) * 1.05;
      bx = Math.max(cx - envW, Math.min(cx + envW, bx));
    }

    // Shade: dome nutzt positionsbasiertes Licht, andere zufällig
    let shade;
    if (type === 'dome') {
      const yFracS = Math.max(0, (base - by) / cH);
      const heightShade = yFracS * 0.55;
      const sideShade = ((cx - bx) / hw) * 0.12;
      shade = Math.min(1, Math.max(0, heightShade + sideShade + rng2() * 0.33));
    } else {
      shade = rng2();
    }
    blobs.push({ x: bx, y: by, r: br, shade });
  }
  return blobs;
}

