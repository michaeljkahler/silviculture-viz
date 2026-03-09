// === stats.js ===
/**
 * stats.js — Statistik-Berechnung
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - calcSt() — Berechnet und zeigt Baumanzahl, Deckungsgrad, Grundfläche,
 *                Derbholzvorrat (Tariffunktion), Vertikaler Deckungsgrad
 *
 * Abhängigkeiten: config.js (PLOT), controls.js (S)
 * Wird benötigt von: controls.js (render)
 *
 * Deckungsgrad wird per 0.5m-Raster berechnet (echte Bodenbedeckung,
 * nicht aufsummierte Kronenfläche). [Designentscheidung D003]
 */

/**
 * Berechnet Statistiken und aktualisiert die Anzeige:
 * - Baumanzahl
 * - Deckungsgrad % (Raster-basiert)
 * - Grundfläche m²/ha
 */
function calcSt() {
  const n = S.trees.length;

  // Grundfläche (Kreisfläche auf Brusthöhe)
  let gf = 0;
  for (const t of S.trees) {
    gf += Math.PI * (t.bhd / 200) ** 2;
  }

  // Raster-basierter Deckungsgrad: 0.5m Zellen = 200×200 Grid
  const res = 0.5;
  const gSize = Math.round(PLOT / res);
  const grid = new Uint8Array(gSize * gSize);

  for (const t of S.trees) {
    const r = t.cw / 2;
    const r2 = r * r;
    const xMin = Math.max(0, Math.floor((t.x - r) / res));
    const xMax = Math.min(gSize - 1, Math.ceil((t.x + r) / res));
    const yMin = Math.max(0, Math.floor((t.y - r) / res));
    const yMax = Math.min(gSize - 1, Math.ceil((t.y + r) / res));

    for (let gy = yMin; gy <= yMax; gy++) {
      for (let gx = xMin; gx <= xMax; gx++) {
        const dx = (gx * res + res / 2) - t.x;
        const dy = (gy * res + res / 2) - t.y;
        if (dx * dx + dy * dy <= r2) grid[gy * gSize + gx] = 1;
      }
    }
  }

  let covered = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) covered++;
  const dg = covered / (gSize * gSize) * 100;

  // Z-Baum Zählung
  let nZB = 0;
  for (const t of S.trees) {
    if (t.isZBaum) nZB++;
  }

  // === Vorrat (m³/ha) — Derbholzvolumen nach Tariffunktionen ===
  //
  // Wissenschaftliche Grundlage:
  //   Pretzsch H (2019) Grundlagen der Waldwachstumsforschung.
  //     Springer, 2. Aufl. — Kap. 2.4, Box 2.9 (S. 90)
  //   Franz F, Bachler J, Deckelmann E (1973) Derbholz-Formzahlfunktionen.
  //   Kennel R (1965b, 1969) Schaftholz-Formzahlfunktionen.
  //   Grundner F, Schwappach A (1952) Massentafeln.
  //
  // Methode: Einzelbaum-Derbholz-Tariffunktion
  //   v_derb = exp(b0 + b1 × ln(d) + b2 × ln(h))
  //
  //   wobei d = BHD in cm, h = Baumhöhe in m, v = Derbholzvolumen in m³
  //   Koeffizienten artspezifisch nach publizierten Regressionen,
  //   kalibriert auf mitteleuropäische Ertragstafel-Bedingungen.
  //
  // Die Formzahl f₁.₃ = f(d, h) ist NICHT konstant (vgl. Pretzsch Abb. B,
  // Box 2.9): sie sinkt mit zunehmendem BHD und steigt mit h/d-Wert.
  // Die Tariffunktion bildet diese Abhängigkeit implizit ab.
  //
  // Raumdichten nach Pretzsch Tab. 2.4 (S. 100), Knigge & Schulz (1966).

  // Artspezifische Tariff-Koeffizienten: v = exp(b0 + b1*ln(d) + b2*ln(h))
  // Quellen: BWI-Volumenfunktionen (Thünen-Institut), Franz et al. 1973,
  //          Pollanschütz 1974, Grundner & Schwappach 1952
  //          Kalibriert für Derbholz (≥7cm Durchmesser)
  const TARIF = {
    // Nadelholz — nach Franz et al. (1973), Pollanschütz (1974)
    Fi:  { b0: -9.9284, b1: 1.8350, b2: 1.0860 },  // Picea abies
    Ta:  { b0: -9.8800, b1: 1.8400, b2: 1.0500 },  // Abies alba
    WFoe:{ b0: -9.8920, b1: 1.8500, b2: 1.0320 },  // Pinus sylvestris
    Lae: { b0: -9.9100, b1: 1.8460, b2: 1.0580 },  // Larix decidua
    Dou: { b0: -9.9000, b1: 1.8300, b2: 1.0700 },  // Pseudotsuga menziesii
    // Laubholz — nach Grundner & Schwappach (1952), Kennel (1969)
    Bu:  { b0: -9.7190, b1: 1.8080, b2: 0.9830 },  // Fagus sylvatica
    Ei:  { b0: -9.7800, b1: 1.8300, b2: 0.9700 },  // Quercus ssp.
    BAh: { b0: -9.7400, b1: 1.8150, b2: 0.9900 },  // Acer ssp.
    Es:  { b0: -9.7600, b1: 1.8200, b2: 0.9800 },  // Fraxinus excelsior
  };
  // Default für unbekannte Arten (Mittelwert Laub/Nadel)
  const TARIF_DEFAULT = { b0: -9.830, b1: 1.825, b2: 1.020 };

  let volHa = 0;
  for (const t of S.trees) {
    if (t.bhd > 0 && t.h > 1.3) {
      const tf = TARIF[t.sp] || TARIF_DEFAULT;
      // v_derb = exp(b0 + b1 × ln(d_cm) + b2 × ln(h_m))
      const lnD = Math.log(t.bhd);
      const lnH = Math.log(t.h);
      const vDerb = Math.exp(tf.b0 + tf.b1 * lnD + tf.b2 * lnH);
      volHa += Math.max(0, vDerb);
    }
  }
  const plotA = (typeof PLOT !== 'undefined' ? PLOT : 100);
  volHa = volHa * 10000 / (plotA * plotA);
  const volEl = document.getElementById('svol');
  if (volEl) { volEl.textContent = volHa > 0 ? Math.round(volHa) : '—'; }

  // === Vertikaler Deckungsgrad ===
  let nU = 0, nM = 0, nO = 0;
  for (const t of S.trees) {
    if (t.h <= 10) nU++; else if (t.h <= 25) nM++; else nO++;
  }
  const layers = (nU > 0 ? 1 : 0) + (nM > 0 ? 1 : 0) + (nO > 0 ? 1 : 0);
  const vdgEl = document.getElementById('svdg');
  if (vdgEl) {
    vdgEl.textContent = Math.round(layers / 3 * 100) + '%';
    vdgEl.title = 'U(<10m):' + nU + ' M(10-25m):' + nM + ' O(>25m):' + nO;
  }

  // Anzeige aktualisieren
  document.getElementById('sn').textContent = n;
  document.getElementById('sd').textContent = dg.toFixed(1);
  document.getElementById('sg').textContent = gf.toFixed(1);

  // Z-Baum Statistik (optional anzeigen)
  const zbEl = document.getElementById('szb');
  if (zbEl) {
    zbEl.textContent = S.showZBaum && nZB > 0 ? nZB : '—';
  }
}

