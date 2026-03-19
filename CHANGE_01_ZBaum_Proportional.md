# Änderung 01: Z-Baum proportionale Verteilung nach Baumart

## Ziel
Z-Bäume werden proportional zum Mischungsanteil auf die Baumarten verteilt.
Lichtbaumarten werden aufgerundet, Schattenbaumarten abgerundet (±5% Spielraum).

## Aktueller Stand
Z-Bäume sind pro Art FIX definiert in `ZB_ZAHL`:
```javascript
const ZB_ZAHL = { Fi: 200, Ta: 200, Bu: 100, Ei: 50, BAh: 60, ... };
```
Diese Werte stammen aus dem FBB-Produktionskonzept und gelten für Reinbestände.
In Mischbeständen ist das falsch — eine Art mit 5% Anteil bekommt trotzdem 200 Z-Bäume.

## Neue Logik

### 1. Gesamt-Z-Baum-Budget berechnen
Gewichteter Durchschnitt aus den FBB-Werten × Mischungsanteil:
```
totalZB = Σ (ZB_ZAHL[sp] × pct[sp] / 100)
```
Beispiel: Bu 50% × 100 + Ta 25% × 200 + BAh 10% × 60 + ... ≈ 120 Z-Bäume/ha

### 2. Proportionale Verteilung
Jede Art bekommt Z-Bäume proportional zu ihrem Flächenanteil:
```
zbRaw[sp] = totalZB × pct[sp] / 100
```

### 3. Lichtbaumart-Korrektur (±5% Spielraum)
Lichtbaumarten (Lichtzahl ≥ 4) werden aufgerundet, Schattenbaumarten abgerundet:
```javascript
const LICHT_ARTEN = { WFoe: true, Lae: true, Ei: true, Bi: true };
// Aufgerundet: Math.ceil(zbRaw)
// Abgerundet: Math.floor(zbRaw)
// Differenz wird auf Schattenbaumarten verteilt
```
Max. Abweichung ±5% vom proportionalen Wert.

### 4. Minimum-Regel
Jede aktive Art bekommt mindestens 1 Z-Baum (sonst kein Z-Baum-Boost).

## Betroffene Funktionen
- `markZBaeume()` — muss neues Z-Baum-Budget pro Art verwenden
- `ZB_ZAHL` — wird dynamisch berechnet statt als Konstante
- Neue Hilfsfunktion: `calcZBaumBudget(sp_config)` → { sp: anzahl }

## Keine Auswirkung auf
- Plenterwald-Modus (hat keine Z-Bäume)
- Kronenrendering, Export, Statistiken

## Waldbauliche Referenz
- FBB Produktionskonzept 2022: Z-Baum-Zahlen pro Art
- Schütz (2003): Mischungsformen und Z-Baum-Verteilung in Mischbeständen
- BLFw426: Multifunktionale Bewertung → Lichtbaumarten aktiv fördern
