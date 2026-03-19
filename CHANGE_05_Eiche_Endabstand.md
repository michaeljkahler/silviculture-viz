# Änderung 05: Eiche-Endabstand Sonderregel

## Ziel
Wenn Eiche im Bestand ist, gilt für ALLE Abstände Eiche↔Nachbar der
Eiche-Endabstand (nicht der Durchschnitt). Eiche braucht maximale Kronenfreiheit.

## Aktueller Stand
Abstandsberechnung in `computeBR()` und `removeZBaumKonkurrenten()`:
```javascript
// Bisherig: Durchschnitt beider Endabstände
const abstand = (ZB_ENDABSTAND[sp_a] + ZB_ENDABSTAND[sp_b]) / 2;
```
Beispiel: Ei (15m) ↔ Bu (11m) = 13m Durchschnitt → Buche rückt zu nah an Eiche.

## Neue Logik
```javascript
// NEU: Wenn eine der beiden Arten Eiche ist → Eiche-Endabstand dominiert
const abstand = (sp_a === 'Ei' || sp_b === 'Ei')
  ? ZB_ENDABSTAND['Ei']                              // Eiche dominiert
  : (ZB_ENDABSTAND[sp_a] + ZB_ENDABSTAND[sp_b]) / 2; // Rest: Durchschnitt
```
Beispiel: Ei (15m) ↔ Bu (11m) = **15m** → Buche muss vollen Eiche-Abstand einhalten.

## Waldbauliche Begründung
- Eiche ist stark lichtbedürftig (Lichtzahl 3–4, petraea/robur)
- FBB-Pflegekonzept Eiche: 80+ cm BHD in 90–110 Jahren mit nur 40–50 Z-Bäume/ha
- Das erfordert weite Endabstände (15m) → volle Kronenfreiheit
- Jede Einengung durch Nachbarn führt zu Kronenverlust und Qualitätsverlust
- Ref: FBB 2022, Röhrig et al. (2006): Waldbau auf ökologischer Grundlage

## Betroffene Funktionen
- `computeBR()` — Kronendeformation (Voronoi-artig)
  → `myS` Berechnung: wenn einer Ei ist, bekommt Ei mehr Raum
- `removeZBaumKonkurrenten()` — Entnahmeschwelle
  → Abstandsberechnung bei Z-Baum Ei anpassen
- Keine neue Funktion nötig, nur Bedingung in bestehende einfügen

## Betroffene Konstante
```javascript
ZB_ENDABSTAND.Ei = 15;  // Bereits vorhanden, Wert prüfen
```

## Keine Auswirkung auf
- Plenterwald-Modus (keine Z-Bäume, aber computeBR auch dort aktiv → Kronendeformation profitiert)
- Andere Arten untereinander (Durchschnittslogik bleibt)
