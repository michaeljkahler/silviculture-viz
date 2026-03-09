// === crownBird.js ===
/**
 * crownBird.js — Kronen-Vogelperspektive, Voronoi-Logik
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - computeBR(trees) — Berechnet richtungsabhängige Kronenradien (Voronoi-Clipping)
 *   - crownTopN(sp, cx, cy, radii, jit) — Generiert SVG-Pfad für Kronenprojektionsform
 *
 * Abhängigkeiten: species.js (SP)
 * Wird benötigt von: renderBird.js
 */

/**
 * Berechnet richtungsabhängige Kronenradien für die Vogelperspektive.
 * Bäume behalten ihren natürlichen Kronendurchmesser.
 * Nur wo sich Kronen überlappen würden, wird der Rand richtungsabhängig
 * zurückgedrückt (36 Winkelsegmente). [Designentscheidung D002]
 *
 * @param {Array} trees - Array aller Bäume mit {x, y, cw, ...}
 * @returns {Array} Array von {idx, radii} — radii ist Array[36] mit Radien pro Richtung
 */
function computeBR(trees) {
  const NA = 36;
  const res = [];

  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const nR = t.cw / 2;
    const radii = new Array(NA).fill(nR);

    for (let j = 0; j < trees.length; j++) {
      if (i === j) continue;
      const o = trees[j];
      const dx = o.x - t.x, dy = o.y - t.y;
      const dist = Math.hypot(dx, dy);
      const oR = o.cw / 2;

      // Keine Überlappung → kein Clipping nötig
      if (dist >= nR + oR) continue;

      const na = Math.atan2(dy, dx);
      const myS = nR / (nR + oR);
      const maxR = dist * myS - .08;

      for (let a = 0; a < NA; a++) {
        const ang = 2 * Math.PI * a / NA;
        let diff = Math.abs(ang - na);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        if (diff < Math.PI * .55) {
          const inf = Math.cos(diff / .55 * Math.PI / 2);
          const cR = nR * (1 - inf) + maxR * inf;
          if (cR < radii[a]) radii[a] = Math.max(cR, .2);
        }
      }
    }
    res.push({ idx: i, radii });
  }
  return res;
}

/**
 * Generiert einen SVG-Pfad für die Kronenprojektion in der Vogelperspektive.
 * Erzeugt glatte Catmull-Rom-Splines mit artspezifischer Formmodulation.
 *
 * @param {string} sp   - Baumart-Key (z.B. 'Bu')
 * @param {number} cx   - X-Position
 * @param {number} cy   - Y-Position
 * @param {Array} radii  - Array[36] mit Radien pro Richtung
 * @param {number} jit  - Jitter
 * @returns {string} SVG path d-Attribut
 */
function crownTopN(sp, cx, cy, radii, jit) {
  const N = radii.length;
  const type = SP[sp].crown;
  let pts = [];

  for (let i = 0; i < N; i++) {
    const a = 2 * Math.PI * i / N;
    let r = radii[i];
    let mod = 1;

    // Artspezifische Formmodulation
    switch (type) {
      case 'dome':
        mod = .94 + .06 * Math.sin(a * 3 + jit) + .03 * Math.sin(a * 6 + jit * 1.5);
        break;
      case 'layered':
        mod = .92 + .08 * Math.pow(Math.cos(a * 2 + jit), 2);
        break;
      case 'spire':
        mod = .88 + .04 * Math.sin(a * 5 + jit);
        break;
      case 'spreading':
        mod = .92 + .08 * Math.sin(a * 2 + jit) + .05 * Math.sin(a * 5 + jit * 2);
        break;
      case 'round':
        mod = .96 + .04 * Math.sin(a * 3 + jit);
        break;
      case 'umbrella':
        mod = .9 + .1 * Math.abs(Math.cos(a + jit * .3));
        break;
      case 'lightcone':
        mod = .92 + .08 * Math.sin(a * 3 + jit);
        break;
      case 'vase':
        mod = .92 + .08 * Math.cos(a * 2 + jit);
        break;
    }

    r *= mod;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }

  // Catmull-Rom Spline für glatte Kurve
  let d = '';
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];

    if (i === 0) d = `M ${p1[0]} ${p1[1]} `;
    d += `C ${p1[0] + (p2[0] - p0[0]) * .18} ${p1[1] + (p2[1] - p0[1]) * .18},` +
         `${p2[0] - (p3[0] - p1[0]) * .18} ${p2[1] - (p3[1] - p1[1]) * .18},` +
         `${p2[0]} ${p2[1]} `;
  }
  return d + 'Z';
}

