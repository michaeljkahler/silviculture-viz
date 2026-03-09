// === renderFront.js ===
/**
 * renderFront.js — SVG-Rendering Frontansicht
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - renderFront() — Rendert die komplette Frontansicht als SVG
 *
 * Abhängigkeiten:
 *   - config.js (PLOT, MH)
 *   - species.js (SP)
 *   - generator.js (W)
 *   - crownFront.js (crownPts, p2p)
 *   - generator.js (W)
 *   - controls.js (S)
 */

/**
 * Rendert die Frontansicht (Bestandesprofil) als SVG.
 * Zeigt einen 10m-Transekt mit Vordergrund- und Hintergrund-Bäumen.
 */
function renderFront() {
  const el = document.getElementById('fw');
  const dW = Math.min(window.innerWidth - 380, 800);
  const dH = dW * (MH / PLOT);

  const tY = S.transectY;
  const half = CONFIG.TRANSECT_WIDTH / 2;        // 5m (10m Transekt)
  const bgDepth = CONFIG.BG_DEPTH;               // 5m Hintergrund
  const inT = S.trees.filter(t => t.y >= tY - half && t.y <= tY + half);
  const nearT = S.trees.filter(t => t.y >= tY - half - bgDepth && t.y < tY - half);
  const allT = [
    ...nearT.map(t => ({ ...t, layer: 'bg' })),
    ...inT.map(t => ({ ...t, layer: 'fg' }))
  ];
  allT.sort((a, b) => a.y - b.y);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dW}" height="${dH}" viewBox="0 0 ${PLOT} ${MH}">`;

  // Himmel-Gradient
  svg += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
         `<stop offset="0%" stop-color="#e8ecf2"/><stop offset="100%" stop-color="#f6f6f2"/>` +
         `</linearGradient></defs>`;
  svg += `<rect width="${PLOT}" height="${MH}" fill="url(#sky)"/>`;

  // Raster vertikal
  for (let x = 0; x <= PLOT; x += 10) {
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${MH}" stroke="#e4e1d8" stroke-width=".07"/>`;
    if (x > 0 && x < PLOT) {
      svg += `<text x="${x}" y="${MH - .25}" font-size="1.3" fill="#ccc" text-anchor="middle" font-family="sans-serif">${x}</text>`;
    }
  }

  // Raster horizontal (Höhenlinien)
  for (let h = 0; h <= MH; h += 5) {
    const y = MH - h;
    svg += `<line x1="0" y1="${y}" x2="${PLOT}" y2="${y}" stroke="${h % 10 === 0 ? '#dad7ce' : '#edeae3'}" stroke-width="${h % 10 === 0 ? '.09' : '.04'}"/>`;
    if (h > 0 && h <= 45) {
      svg += `<text x=".7" y="${y + .35}" font-size="1.1" fill="#ccc" font-family="sans-serif">${h}m</text>`;
    }
  }

  // Bodenlinie
  svg += `<rect x="0" y="${MH - .4}" width="${PLOT}" height=".4" fill="#c9bb95" opacity=".3"/>`;
  svg += `<line x1="0" y1="${MH}" x2="${PLOT}" y2="${MH}" stroke="#8B7355" stroke-width=".15"/>`;

  const gY = MH;

  // === Bäume rendern ===
  for (const t of allT) {
    const def = SP[t.sp];
    const isBg = t.layer === 'bg';
    const op = isBg ? .4 : .92;
    const hw = t.cw / 2;
    const top = gY - t.h;
    const base = gY - t.ka;
    const cH = t.kl;
    const tw = Math.max(t.bhd / 100 * 1, .1);
    const twT = tw * .55;

    const isDecid = ['dome', 'spreading', 'round', 'vase'].includes(def.crown);

    // Stamm (nur Vordergrund)
    if (!isBg) {
      svg += `<path d="M ${t.x - tw / 2} ${gY} L ${t.x - twT / 2} ${base} L ${t.x + twT / 2} ${base} L ${t.x + tw / 2} ${gY} Z" fill="#5a4020" opacity="${op * .8}"/>`;
      svg += `<path d="M ${t.x} ${gY} L ${t.x + tw * .08} ${base} L ${t.x + tw * .2} ${gY} Z" fill="#7a6038" opacity=".2"/>`;
    }

    const pts = crownPts(def.crown, t.x, top, base, hw, cH, t.jit);
    const path = p2p(pts);

    if (isBg) {
      // === Hintergrund-Bäume: gedämpfte Darstellung ===
      // Einfache Füllung ohne Blobs
      svg += `<path d="${path}" fill="${def.c}" fill-opacity="${op * (isDecid ? .5 : .7)}" stroke="none"/>`;
      if (isDecid) {
        svg += `<path d="${path}" fill="none" stroke="${def.cs}" stroke-width=".08" stroke-opacity="${op * .2}"/>`;
      }
    } else {
      if (isDecid) {
        // === LAUBBÄUME: Gradient-basiertes Kronen-Rendering ===
        // Kein Blob-Kreise mehr — saubere Gradient-Füllung mit Lichtrichtung

        const uid = `cr${Math.round(t.x * 10)}${Math.round(t.y * 10)}${Math.round(t.jit * 100)}`;
        const clipId = uid;
        const gradId = `gd${uid}`;
        const gradHlId = `gh${uid}`;

        // ClipPath für Schatten- und Licht-Ellipsen
        svg += `<defs><clipPath id="${clipId}"><path d="${path}"/></clipPath></defs>`;

        // RadialGradient: Licht von oben-links, Schatten unten-rechts
        svg += `<defs><radialGradient id="${gradId}" cx="35%" cy="30%" r="65%" fx="30%" fy="25%">`;
        svg += `<stop offset="0%" stop-color="${def.c}" stop-opacity=".85"/>`;
        svg += `<stop offset="50%" stop-color="${def.cd}" stop-opacity=".70"/>`;
        svg += `<stop offset="100%" stop-color="${def.cs}" stop-opacity=".55"/>`;
        svg += `</radialGradient></defs>`;

        // 1. Basis-Schatten (Bodenschatten)
        svg += `<path d="${path}" fill="#000" fill-opacity=".02" transform="translate(.15,.15)"/>`;

        // 2. Hauptfüllung mit Gradient
        svg += `<path d="${path}" fill="url(#${gradId})"/>`;

        // 3. Licht-/Schatten-Modulation innerhalb ClipPath
        svg += `<g clip-path="url(#${clipId})">`;

        // Lichtreflex oben-links (diffuses Highlight)
        const hlCx = t.x - hw * 0.2;
        const hlCy = top + cH * 0.35;
        const hlRx = hw * 0.55;
        const hlRy = cH * 0.30;
        svg += `<ellipse cx="${hlCx}" cy="${hlCy}" rx="${hlRx}" ry="${hlRy}" fill="#fff" fill-opacity=".10"/>`;

        // Schatten unten-rechts (Kronenunterseite)
        const shCx = t.x + hw * 0.15;
        const shCy = base - cH * 0.12;
        const shRx = hw * 0.7;
        const shRy = cH * 0.20;
        svg += `<ellipse cx="${shCx}" cy="${shCy}" rx="${shRx}" ry="${shRy}" fill="${def.cs}" fill-opacity=".12"/>`;

        svg += `</g>`;

        // 4. Umriss-Strich
        svg += `<path d="${path}" fill="none" stroke="${def.cs}" stroke-width=".13" stroke-opacity=".35"/>`;

        // Äste vorerst deaktiviert (Feedback: schweben in der Luft)
      } else {
        // === NADELBÄUME: Detailliertes Umriss-Rendering ===

        // Schatten
        svg += `<path d="${path}" fill="#000" fill-opacity=".03" transform="translate(.12,.12)"/>`;

        // Hauptfüllung mit Umriss
        svg += `<path d="${path}" fill="${def.c}" fill-opacity="${op}" stroke="${def.cs}" stroke-width=".13"/>`;

        // Innere Schattenform (kein weisser Lichtreflex bei Nadelbäumen)
        if (def.crown === 'umbrella') {
          // Waldföhre: Ellipse statt crownPts (vermeidet Pfad-Kreuzung)
          const sCx = t.x + hw * 0.10;
          const sCy = top + cH * 0.55;
          svg += `<ellipse cx="${sCx}" cy="${sCy}" rx="${hw * 0.45}" ry="${cH * 0.25}" fill="${def.cd}" fill-opacity=".10"/>`;
        } else {
          const ip = crownPts(def.crown, t.x + hw * .06, top + cH * .15, base - cH * .05, hw * .55, cH * .6, t.jit + 3);
          svg += `<path d="${p2p(ip)}" fill="${def.cd}" fill-opacity=".1" stroke="none"/>`;
        }

        // Astlinien deaktiviert (Artefakte, User-Feedback 06.03.2026)
      }

      // === Totäste und Klebäste (Frontansicht) ===
      svg += drawBranchStubs(t, gY, tw);

      // === Z-Baum Markierung (Frontansicht) ===
      // Orangener Ring am Stammfuss + kleines "Z" Label
      if (t.isZBaum && S.showZBaum) {
        const zbR = Math.max(tw * 2.5, 0.6);
        svg += `<circle cx="${t.x}" cy="${gY - 0.2}" r="${zbR}" fill="none" stroke="#e67300" stroke-width=".18" stroke-dasharray=".3,.15"/>`;
        svg += `<text x="${t.x}" y="${gY + 1.2}" font-size="1.1" fill="#e67300" text-anchor="middle" font-weight="700" font-family="sans-serif">Z</text>`;
      }
    }
  }

  svg += `</svg>`;
  el.innerHTML = svg;
}

