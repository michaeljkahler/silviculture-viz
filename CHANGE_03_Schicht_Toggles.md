# Änderung 03: Schicht-Toggles pro Baumart

## Ziel
Pro Baumart 4 einzeln aktivierbare Toggles:
- **O** = Oberschicht (>60% hMax)
- **M** = Mittelschicht (30–60% hMax)
- **U** = Unterschicht (<30% hMax)
- **V** = Naturverjüngung (Jungwuchs <2m / <5J)

Steuert, in welchen Höhenschichten die Baumart vorkommt.

## Aktueller Stand
Aktuell haben alle Baumarten eine einheitliche Altersverteilung:
- Gleichförmig: alle ähnlich alt (±15%)
- Plenter: Inverse-J über alle Stufen

Es gibt keine Möglichkeit, eine Art auf bestimmte Schichten zu beschränken.

## Neue Logik

### 1. UI — 4 Mini-Buttons pro Art
Neben den Mischungsform-Icons (·⁘◎◉↓) kommen 4 Schicht-Toggles:
```
[Bu] [65%] [·⁘◎◉↓] [O][M][U][V]  ← NEU
```
- Aktiv = farbig (grün), Inaktiv = grau
- Default: alle 4 aktiv (bisheriges Verhalten)
- Gespeichert in `S.sp[k].layers = { O: true, M: true, U: true, V: true }`

### 2. Auswirkung auf genTrees()

#### Gleichförmiger Modus
- O/M/U beeinflussen die individuelle Höhenvariation:
  - Nur O aktiv → indAge = S.age × (0.9–1.1) (grosse Bäume)
  - Nur U aktiv → indAge = S.age × (0.3–0.5) (unterdrückt)
  - Nur V aktiv → indAge = 1–10 (Naturverjüngung)
- Kombination: O+M = obere 60–100%, M+U = 30–70%, etc.

#### Plenterwald-Modus
- Die Inverse-J-Verteilung wird auf die aktiven Schichten beschränkt:
  - Nur O → nur die ältesten/grössten Bäume (ageFrac > 0.6)
  - Nur U+V → nur Jungwuchs (ageFrac < 0.3)
  - O+M+U+V → volles Spektrum (bisheriges Verhalten)

### 3. Waldbauliche Logik der Defaults
Sinnvolle Presets pro Art (können vom User überschrieben werden):

| Art | O | M | U | V | Begründung |
|-----|---|---|---|---|------------|
| Bu  | ✓ | ✓ | ✓ | ✓ | Klimax, alle Schichten |
| Ta  | ✓ | ✓ | ✓ | ✓ | Plenterbaumart, alle Schichten |
| BAh | ✓ | ✓ | - | ✓ | Braucht Licht ab Mittelschicht |
| Fi  | ✓ | ✓ | - | - | Halbschatten, keine Unterschicht |
| WFoe| ✓ | - | - | - | Nur Oberschicht (Lichtbaumart) |
| Lae | ✓ | - | - | ✓ | Nur Ober + Verjüngung (Pionierbaumart) |
| Ei  | ✓ | ✓ | - | ✓ | Jugend schattentolerant, dann Licht |
| Bi  | ✓ | - | - | ✓ | Pionierbaumart, nur Oberschicht |

### 4. Rendering
Keine Änderung am Rendering — die Bäume werden einfach in anderen Grössen generiert.
Die Kraft-Schichtung in der Vogelperspektive zeigt die Ergebnisse automatisch.

## Betroffene Funktionen
- `genTrees()` — Altersberechnung pro Baum muss Schicht-Filter berücksichtigen
- `S.sp[k]` — neues Property `layers`
- UI — neue Toggle-Buttons pro Art
- `setMode()` — Defaults pro Art setzen

## Performance-Hinweis
Kein Einfluss auf Rendering-Performance (gleiche Anzahl Bäume).
