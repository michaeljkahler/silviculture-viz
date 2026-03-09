// === renderBird.js ===
/**
 * renderBird.js — SVG-Rendering Vogelperspektive
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - renderBird() — Rendert die komplette Vogelperspektive als SVG
 *
 * Abhängigkeiten:
 *   - config.js (PLOT)
 *   - species.js (SP)
 *   - crownBird.js (computeBR, crownTopN)
 *   - controls.js (S)
 */

/**
 * Rendert die Vogelperspektive (Kronenprojektionsplan) als SVG.
 * Zeigt 100×100m Plot mit Kronen, Transekt-Markierung und Achsenbeschriftung.
 */
function renderBird() {
  const el = document.getElementById('bw');
  const dW = Math.min(window.innerWidth - 380, 800);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dW}" height="${dW}" viewBox="-3 -3 ${PLOT + 6} ${PLOT + 6}">`;

  // Hintergrund
  svg += `<rect x="0" y="0" width="${PLOT}" height="${PLOT}" fill="#f9f8f3"/>`;

  // 10m-Raster
  for (let i = 0; i <= PLOT; i += 10) {
    svg += `<line x1="${i}" y1="0" x2="${i}" y2="${PLOT}" stroke="#ece9e0" stroke-width=".08"/>`;
    svg += `<line x1="0" y1="${i}" x2="${PLOT}" y2="${i}" stroke="#ece9e0" stroke-width=".08"/>`;
    if (i > 0 && i < PLOT) {
      svg += `<text x="${i}" y="${PLOT + 1.8}" font-size="1.4" fill="#c0bdb5" text-anchor="middle" font-family="sans-serif">${i}</text>`;
      svg += `<text x="-1" y="${i + .5}" font-size="1.4" fill="#c0bdb5" text-anchor="end" font-family="sans-serif">${i}</text>`;
    }
  }

  // Defs für Transekt-Schraffur (muss in <defs> vor Verwendung)
  const tY = S.transectY;
  const half = CONFIG.TRANSECT_WIDTH / 2;  // 5m bei 10m Transekt
  svg += `<defs><pattern id="th" patternUnits="userSpaceOnUse" width="1.2" height="1.2" patternTransform="rotate(45)">` +
         `<line x1="0" y1="0" x2="0" y2="1.2" stroke="#d4960a" stroke-width=".2" opacity=".45"/></pattern></defs>`;

  // === 1. Kronen rendern (grösste zuerst) ===
  const bd = computeBR(S.trees);
  const order = [...bd].sort((a, b) => S.trees[b.idx].cw - S.trees[a.idx].cw);

  for (const { idx, radii } of order) {
    const t = S.trees[idx];
    const def = SP[t.sp];

    // Schatten
    svg += `<circle cx="${t.x + .12}" cy="${t.y + .12}" r="${t.cw / 2 * .8}" fill="#000" opacity=".025"/>`;

    // Kronenpfad
    const path = crownTopN(t.sp, t.x, t.y, radii, t.jit);
    svg += `<path d="${path}" fill="${def.ct}" fill-opacity=".78" stroke="${def.cts}" stroke-width=".12"/>`;

    // Lichtreflex
    svg += `<circle cx="${t.x - t.cw / 8}" cy="${t.y - t.cw / 8}" r="${t.cw / 4}" fill="#fff" opacity=".05"/>`;

    // Stammpunkt
    svg += `<circle cx="${t.x}" cy="${t.y}" r="${Math.max(t.bhd / 200 * .7, .12)}" fill="#5a4018" opacity=".4"/>`;
  }

  // === 2. Transekt-Markierung ÜBER den Kronen (halbtransparent) ===
  svg += `<rect x="0" y="${tY - half}" width="${PLOT}" height="${CONFIG.TRANSECT_WIDTH}" fill="url(#th)"/>`;
  svg += `<rect x="0" y="${tY - half}" width="${PLOT}" height="${CONFIG.TRANSECT_WIDTH}" fill="rgba(255,200,50,.15)"/>`;
  svg += `<line x1="0" y1="${tY - half}" x2="${PLOT}" y2="${tY - half}" stroke="#c88600" stroke-width=".3"/>`;
  svg += `<line x1="0" y1="${tY + half}" x2="${PLOT}" y2="${tY + half}" stroke="#c88600" stroke-width=".3"/>`;
  svg += `<rect x="${PLOT + .4}" y="${tY - half}" width="2.2" height="${CONFIG.TRANSECT_WIDTH}" fill="#c88600" rx=".3"/>`;
  svg += `<text x="${PLOT + 1.5}" y="${tY + .4}" font-size="1" fill="#fff" text-anchor="middle" font-weight="700" font-family="sans-serif">T</text>`;

  // === 3. Z-Baum-Ringe GANZ OBEN (über Kronen und Transekt) ===
  if (S.showZBaum) {
    for (const { idx } of order) {
      const t = S.trees[idx];
      if (t.isZBaum) {
        svg += `<circle cx="${t.x}" cy="${t.y}" r="${t.cw / 2 + 0.4}" fill="none" stroke="#e67300" stroke-width=".35" stroke-dasharray=".6,.3" opacity=".9"/>`;
      }
    }
  }

  // Rahmen
  svg += `<rect x="0" y="0" width="${PLOT}" height="${PLOT}" fill="none" stroke="#aaa" stroke-width=".2"/>`;

  // Achsenbeschriftung
  svg += `<text x="${PLOT / 2}" y="${PLOT + 3.5}" font-size="1.6" fill="#999" text-anchor="middle" font-family="sans-serif">X (m)</text>`;
  svg += `<text x="-3.5" y="${PLOT / 2}" font-size="1.6" fill="#999" text-anchor="middle" font-family="sans-serif" transform="rotate(-90,-3.5,${PLOT / 2})">Y (m)</text>`;

  svg += `</svg>`;
  el.innerHTML = svg;
}

