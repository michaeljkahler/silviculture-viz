# Änderung 06: Totholz stehend und liegend (20 m³/ha)

## Ziel
Stehendes und liegendes Totholz im Bestand darstellen.
Zielwert: 20 m³/ha (NaiS-Anforderung Biodiversität).

## Konzept

### 1. Totholz-Typen
- **Stehend (Snags)**: Gebrochene Stämme, 5–15m hoch, ohne Krone
- **Liegend (Logs)**: Am Boden liegende Stämme, 5–20m lang, verschiedene BHD

### 2. Aufteilung
- 50% stehend, 50% liegend (≈ 10 m³/ha je Typ)
- Stehend: ~3–5 Stämme/ha (grosse BHD 30–50cm)
- Liegend: ~5–8 Stämme/ha (verschiedene BHD 20–40cm)

### 3. Toggle
Neuer Button in der Toolbar: "Totholz" [T] — ein/aus.
Gespeichert in `S.showTotholz = true/false`.

### 4. Generierung
Deterministisch aus Seed (wie Baumpositionen):
```javascript
function genTotholz(seed, nStehend, nLiegend) {
  const rng = mR(seed + 9999);  // Separater Seed-Offset
  const totholz = [];
  // Stehend: zufällige Position, zufälliger BHD, gebrochene Höhe
  for (let i = 0; i < nStehend; i++) {
    totholz.push({
      type: 'stehend',
      x: rng() * 92 + 4, y: rng() * 92 + 4,
      bhd: 30 + rng() * 20,      // 30-50 cm
      h: 5 + rng() * 10,          // 5-15 m Bruchhöhe
      rotation: rng() * 360        // Für Vogelperspektive
    });
  }
  // Liegend: Position, Länge, BHD, Richtung
  for (let i = 0; i < nLiegend; i++) {
    totholz.push({
      type: 'liegend',
      x: rng() * 90 + 5, y: rng() * 90 + 5,
      bhd: 20 + rng() * 20,       // 20-40 cm
      len: 5 + rng() * 15,        // 5-20 m Länge
      angle: rng() * Math.PI      // Liegewinkel
    });
  }
  return totholz;
}
```

### 5. Rendering Frontansicht
- **Stehend**: Brauner Stamm ohne Krone, oben gezackt/gebrochen, evtl. Pilzkonsole
- **Liegend**: Nur sichtbar wenn im Transekt, am Boden als schräger Stamm

### 6. Rendering Vogelperspektive
- **Stehend**: Grauer/brauner Kreis (Stammquerschnitt) mit × Markierung
- **Liegend**: Braune Linie (Stamm) mit Dicke proportional zu BHD

### 7. Statistik
Neues Stat-Feld: "Totholz: X m³/ha (Y stehend / Z liegend)"

## Waldbauliche Referenz
- NaiS 2024: "Genügend Totholz für Biodiversität"
- Lachat et al. (2013): 20–30 m³/ha Totholz als Mindestanforderung
- Bütler et al. (2020): Totholz-Management im Schweizer Wald
