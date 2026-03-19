# Änderung 04: Mischungsform folgt Prozentzahl

## Ziel
Die Prozentzahl pro Baumart ist führend. Die Mischungsform (Einzel/Trupp/Gruppe/Horst)
passt sich an, wenn der Anteil zu klein ist für die gewählte Form.

## Aktueller Stand
Die Mischungsform wird unabhängig vom Prozentanteil angewendet.
Problem: Bei 3% Anteil und "Horst" (30m Radius, braucht ~20+ Bäume) hat die Art
nur ~15-20 Bäume — es entsteht genau 1 Horst, der Rest ist leer. Unrealistisch.

## Neue Logik

### 1. Mindest-Baumzahl pro Mischungsform
```javascript
const MIX_MIN_TREES = {
  einzel: 1,        // Einzelmischung: ab 1 Baum
  trupp: 5,         // Trupp: mind. 5 Bäume für 1 Trupp
  gruppe: 15,       // Gruppe: mind. 15 Bäume für 1 Gruppe
  horst: 30,        // Horst: mind. 30 Bäume für 1 Horst
  untergeordnet: 1  // Untergeordnet: ab 1 Baum
};
```

### 2. Auto-Downgrade bei zu wenig Bäumen
Wenn eine Art zu wenig Bäume für die gewählte Mischungsform hat:
```
Horst → Gruppe → Trupp → Einzel
```
Beispiel: WFoe 5% bei 620 N/ha = 31 Bäume → Horst knapp möglich.
Beispiel: Ei 3% bei 620 N/ha = 19 Bäume → Gruppe möglich, Horst nicht.

### 3. UI-Feedback
Wenn eine Mischungsform heruntergestuft wird:
- Button bleibt auf der gewählten Form (= Wunsch)
- Kleines Warnsymbol (⚡) zeigt an, dass die Form angepasst wurde
- Tooltip: "Nur X Bäume — als Trupp statt Horst dargestellt"

### 4. Cluster-Warnung anpassen
Die bestehende `_clusterWarnings`-Logik wird erweitert:
- Statt nur "reicht nicht für 1 Horst" → automatisch herunterstufen + Info

## Betroffene Funktionen
- `genTimelineMaster()` — Cluster-Spezifikation
- `genTrees()` (manueller Modus) — Cluster-Spezifikation
- `_clusterWarnings` — erweitern statt nur warnen
- Neue Hilfsfunktion: `effectiveMixPattern(sp, nTrees)` → tatsächliche Form

## Keine Auswirkung auf
- Rendering (nimmt einfach die angepasste Form)
- Export, Statistiken
