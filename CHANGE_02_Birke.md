# Änderung 02: Birke als neue Baumart

## Ziel
Betula pendula (Sandbirke) als 11. Baumart hinzufügen.

## Umsetzung

### 1. SP-Eintrag
```javascript
Bi: {
  name: 'Birke',
  lat: 'Betula pendula',
  c: '#c8d8a0', cs: '#a8b880', cd: '#90a068',    // Frontansicht: helles Gelbgrün
  ct: '#d4e4a8', cts: '#b8cc88',                   // Vogelperspektive
  crown: 'birch',                                   // Neue Kronenform: locker, hängend
  deciduous: true,
  d: { h: 25, cw: 8, kl: 14, ka: 11, bhd: 35 }
}
```

### 2. SiWaWa-Kurve (abgeleitet)
Birke: Pionierbaumart, schnellwüchsig in Jugend, früh kulminierend.
Ref: Schwappach Ertragstafel, NW-FVA (Albert et al. 2021).
```javascript
Bi: [5.0, 12.0, 17.0, 21.0, 24.0, 26.0, 27.5, 28.5, 30.0, 31.0, 31.5]
// Max ~32m, schnelles Jugendwachstum, frühe Kulmination ab ~60J
```

### 3. bhdFromH Target
```javascript
Bi: { hRef: 30.0, bhdRef: 50 }  // Birke: schlank, max BHD ~50cm
```

### 4. FBB-Tabelle (analog Föhre, kürzer)
Umtriebszeit: 80J, ZD: 40cm, Endabstand: 9m, Z-Bäume: 80/ha, Bonität: 22
```javascript
HIEBREIFE.Bi = { age: 80, h: 28 };
ZB_ZAHL.Bi = 80;
ZB_ENDABSTAND.Bi = 9;
```

### 5. Kronenform 'birch' (Front + Vogel)
Front: Lockere, leicht hängende Krone — schmaler als Buche, Äste nach unten.
Vogel: Unregelmässig-rund, etwas asymmetrisch, licht (niedrige Opazität).

### 6. UI-Button
Neuer Button in der Baumarten-Leiste mit Farbe + Slider.

### 7. Plenterwald-Konstanten
```javascript
PLENTER_ZD.Bi = 35;  // Birke: kurzlebig, frühe Ernte
```

## Waldbauliche Referenz
- Pionierbaumart, Lichtzahl 7, kurzlebig (~80-120J)
- Wichtig für Biodiversität (Totholz, Insekten, Dendrohabitate)
- Schnelle Beschirmung nach Störung → Vorwaldbaumart
- NaiS: Pionierbaumart auf Störungsflächen erwünscht
