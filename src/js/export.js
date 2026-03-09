// === export.js ===
/**
 * export.js — PNG-Export (300 DPI, Panelgrössen)
 *
 * Extrahiert aus v5_baseline.html
 *
 * Enthält:
 *   - xp(type)         — Export Front/Vogel/Paar als PNG
 *   - s2c(svgEl,w,h,cb)— SVG zu Canvas konvertieren
 *   - xpP()            — Paar-Export (Front + Vogel übereinander)
 *   - xpTimeline()     — Zeitreihen-Export (3 Zeitpunkte nebeneinander)
 *   - dl(canvas, name) — Canvas als PNG herunterladen
 *
 * Abhängigkeiten: config.js (PW, PH, DPI), controls.js (S),
 *   timeline.js (applyAge, getPhase — optional für Zeitreihen-Export)
 */

/**
 * Exportiert Front, Vogel oder Paar als PNG (300 DPI, 135×70mm)
 * @param {string} type - 'front', 'bird', oder 'pair'
 */
function xp(type) {
  if (type === 'pair') { xpP(); return; }
  if (type === 'timeline') { xpTimeline(); return; }
  const svgEl = document.querySelector(type === 'front' ? '#fw svg' : '#bw svg');
  const ageStr = S.timelineOn && S.age > 0 ? `_${S.age}J` : '';
  s2c(svgEl, PW, PH, c => { dl(c, `${type}_${S.mode}${ageStr}.png`); });
}

/**
 * Konvertiert ein SVG-Element in ein eigenständiges Canvas mit gegebener Auflösung.
 * Jeder Aufruf erstellt ein NEUES Canvas (wichtig für Paar-/Zeitreihen-Export,
 * da sonst das gleiche Canvas mehrfach überschrieben wird).
 *
 * @param {SVGElement} svgEl - SVG Element
 * @param {number} w - Zielbreite in Pixel
 * @param {number} h - Zielhöhe in Pixel
 * @param {function} cb - Callback mit eigenständigem Canvas
 */
function s2c(svgEl, w, h, cb) {
  const cl = svgEl.cloneNode(true);
  cl.setAttribute('width', w);
  cl.setAttribute('height', h);
  const str = new XMLSerializer().serializeToString(cl);
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    // Neues Canvas pro Aufruf — verhindert Überschreibung bei Multi-Panel-Exports
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cb(c);
  };
  img.src = url;
}

/**
 * Paar-Export: Front + Vogel übereinander mit 3mm Gap
 * Beide Ansichten gleich breit (PW), Bird quadratisch (PW × PW)
 */
function xpP() {
  const gap = Math.round(3 / 25.4 * DPI);
  const birdH = PW; // Vogelperspektive ist quadratisch
  s2c(document.querySelector('#fw svg'), PW, PH, fc => {
    s2c(document.querySelector('#bw svg'), PW, birdH, bc => {
      const c = document.createElement('canvas');
      c.width = PW;
      c.height = PH + gap + birdH;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(fc, 0, 0);
      ctx.drawImage(bc, 0, PH + gap);
      const ageStr = S.timelineOn && S.age > 0 ? `_${S.age}J` : '';
      dl(c, `paar_${S.mode}${ageStr}.png`);
    });
  });
}

/**
 * Zeitreihen-Export: 3 Phasen-Repräsentanten nebeneinander
 * Rendert Frontansicht bei 20J, 60J und 100J als ein breites Bild.
 *
 * Layout: [20J | 60J | 100J] mit 3mm Gap, jeweils 135×70mm @ 300 DPI
 * Gesamtbreite: 3 × PW + 2 × Gap
 *
 * Phase-Label wird als Text oben in jedes Panel geschrieben.
 */
function xpTimeline() {
  if (typeof applyAge !== 'function' || typeof getPhase !== 'function') {
    alert('Zeitschiene nicht verfügbar.');
    return;
  }

  const ages = [20, 60, 100];
  const gap = Math.round(3 / 25.4 * DPI); // 3mm Gap
  const totalW = PW * ages.length + gap * (ages.length - 1);
  const labelH = Math.round(8 / 25.4 * DPI); // 8mm für Label
  const birdH = PW; // Vogelperspektive ist quadratisch (gleiche Breite)
  const viewGap = Math.round(2 / 25.4 * DPI); // 2mm zwischen Front und Bird
  const totalH = labelH + PH + viewGap + birdH;

  // Speichere aktuellen State
  const savedAge = S.age;
  const savedDensity = S.density;
  const savedSp = {};
  for (const [k, s] of Object.entries(S.sp)) {
    savedSp[k] = { h: s.h, cw: s.cw, kl: s.kl, ka: s.ka, bhd: s.bhd };
  }

  const panels = [];

  function renderAge(idx) {
    if (idx >= ages.length) {
      // Alle Panels gerendert — zusammensetzen
      composeTimeline(panels, ages, totalW, totalH, labelH, viewGap, birdH, gap);
      // State wiederherstellen
      if (savedAge > 0) {
        applyAge(savedAge);
      } else {
        S.age = 0;
        S.density = savedDensity;
        for (const [k, s] of Object.entries(savedSp)) {
          Object.assign(S.sp[k], s);
        }
      }
      render();
      return;
    }

    const age = ages[idx];
    S.age = age;
    applyAge(age);
    genTrees();
    renderFront();
    renderBird();

    // Front-SVG capturen
    const frontSvg = document.querySelector('#fw svg');
    s2c(frontSvg, PW, PH, frontCanvas => {
      // Bird-SVG capturen (quadratisch)
      const birdSvg = document.querySelector('#bw svg');
      s2c(birdSvg, PW, PW, birdCanvas => {
        panels.push({ frontCanvas, birdCanvas, age });
        renderAge(idx + 1);
      });
    });
  }

  renderAge(0);
}

/**
 * Setzt die Timeline-Panels zusammen und lädt das Ergebnis herunter.
 * Layout pro Spalte: Label → Frontansicht → Vogelperspektive
 */
function composeTimeline(panels, ages, totalW, totalH, labelH, viewGap, birdH, gap) {
  const c = document.createElement('canvas');
  c.width = totalW;
  c.height = totalH;
  const ctx = c.getContext('2d');

  // Hintergrund
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, totalW, totalH);

  panels.forEach((p, i) => {
    const x = i * (PW + gap);
    const phase = getPhase(p.age);

    // Label-Bereich mit Phase-Farbe
    ctx.fillStyle = phase.color + '33';
    ctx.fillRect(x, 0, PW, labelH);

    // Label-Text
    ctx.fillStyle = '#333';
    ctx.font = `bold ${Math.round(labelH * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p.age} Jahre — ${phase.name}`, x + PW / 2, labelH * 0.35);

    // Zusatzinfo
    ctx.fillStyle = '#888';
    ctx.font = `${Math.round(labelH * 0.3)}px sans-serif`;
    ctx.fillText(`N=${nHa(p.age)}/ha · hdom=${hdom('Bu', p.age).toFixed(1)}m`, x + PW / 2, labelH * 0.75);

    // Frontansicht
    ctx.drawImage(p.frontCanvas, x, labelH);

    // Vogelperspektive (unter der Frontansicht)
    ctx.drawImage(p.birdCanvas, x, labelH + PH + viewGap);

    // Trennlinie
    if (i < panels.length - 1) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + PW + gap / 2, 0);
      ctx.lineTo(x + PW + gap / 2, totalH);
      ctx.stroke();
    }
  });

  dl(c, `zeitreihe_${S.mode}_${ages.join('-')}J.png`);
}

/**
 * Canvas als PNG herunterladen
 * @param {HTMLCanvasElement} canvas
 * @param {string} name - Dateiname
 */
function dl(canvas, name) {
  const a = document.createElement('a');
  a.download = name;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
