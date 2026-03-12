# Implementierungsspezifikation: Z-Baum Rendering & Konkurrenzlogik Refactor

**Version:** 1.0 — Iteration 3 (Final)
**Datei:** `waldbau-viz_v1.1.0.html`
**Autor:** Senior Developer — Waldbau-Visualisierung
**Datum:** 2026-03-12

---

## 1. Problemstellung

Die aktuelle Implementierung hat vier Defizite:

1. **Zeitreihe ist nicht konsistent:** Im Z-Baum-Modus wird die Hiebreife-Delay (`harvestDelay`) abhängig von `mt.isZBaum` gesetzt (Z-Baum: +10, normal: +8). Dadurch werden Bäume zu unterschiedlichen Zeitpunkten geerntet, je nachdem ob der Z-Baum-Modus aktiv ist. Die Grundpopulation muss identisch bleiben.

2. **Darstellungsebenen sind unvollständig:** Aktuell gibt es 4 Schichten (A: Unter-Schirm-VJ, B: Normale Bäume, C: Z-Bäume, D: Ringe). Es fehlt die Trennung nach Generationen (1. Gen vs. 2. Gen/VJ).

3. **Konkurrenzlogik ist unvollständig:** Z-Bäume reagieren aktuell zu 90% auf Z-Bäume und 20% auf normale Bäume. Gefordert: 90% auf Z-Bäume, **25% auf Konkurrenten** (statt 20%), und Konkurrenten reagieren 100% aufeinander aber **0% auf VJ**.

4. **Durchforstungsreihenfolge:** Bereits korrekt (innen nach aussen), aber die Render-Pipeline muss klarer strukturiert werden.

---

## 2. Änderungen im Detail

### 2.1 Konsistente Zeitreihe (genTrees, Zeile ~1927)

**Problem:** `const harvestDelay = mt.isZBaum ? 10 : 8;`
Wenn Z-Baum-Modus aus ist, haben alle Bäume `isZBaum = false` → alle bekommen Delay 8.
Wenn Z-Baum-Modus an ist, bekommen Z-Bäume Delay 10 → andere Erntezeitpunkte → andere Population.

**Lösung:** Die Hiebreife-Delay muss **immer gleich** sein, unabhängig vom Z-Baum-Modus.
- Variante: Einheitlicher Delay von 8 für alle Bäume in genTrees()
- Z-Bäume bekommen ihren Delay-Vorteil NUR als visuelles Feature (spätere Ernte wird in `removeZBaumKonkurrenten` oder `markZBaeume` gehandelt, nicht in der Grundpopulation)
- Alternativ: `harvestDelay` immer auf Basis des Master-Flags `mt.isZBaum` berechnen (das ist im Master immer gesetzt), unabhängig von `S.showZBaum`

**Gewählte Variante:** `mt.isZBaum` ist im Master **immer** gesetzt (genTimelineMaster markiert Z-Bäume fest). Der Delay basiert auf `mt.isZBaum`, nicht auf `S.showZBaum`. So ist die Population identisch ob Z-Baum-Modus an oder aus.

**Verifizierung (Iteration 1):** Geprüft — `genTimelineMaster()` setzt `isZBaum` auf allen Master-Bäumen (Zeile 1803+1828). In `genTrees()` wird `mt.isZBaum` gelesen (Zeile 1927). Das Flag existiert immer im Master. ✅ Korrekt.

**Verifizierung (Iteration 2):** Edge Case — was wenn User Z-Baum-Modus NACHHER einschaltet? Master wird nur bei Seed/Art-Änderung neu generiert (`_masterKey`). `isZBaum` ist Teil des Masters, nicht des Cache-Keys. ✅ Population bleibt stabil.

**Verifizierung (Iteration 3):** Das Problem liegt an Zeile 1962: `isZBaum: mt.isZBaum || false`. Dieses Flag wird aus dem Master übernommen. In `markZBaeume()` (Zeile 1218-1220) werden bei `!S.showZBaum` alle `isZBaum` auf false gesetzt. Das beeinflusst NICHT die Ernte in genTrees(), weil genTrees() `mt.isZBaum` direkt liest. ✅ Kein Problem.

**ABER:** Das tatsächliche Problem ist subtiler. In genTrees() Zeile 1927 wird `mt.isZBaum` gelesen. Da `mt.isZBaum` im Master IMMER gesetzt ist, ist der harvestDelay IMMER korrekt, egal ob `S.showZBaum` an/aus. → **Die Zeitreihe IST bereits konsistent für die Ernte.**

**Tatsächliches Problem:** Die render()-Pipeline ruft `markZBaeume()` und `removeZBaumKonkurrenten()` auf. Wenn Z-Baum-Modus aus ist, setzt `markZBaeume` alle `isZBaum=false` und `removeZBaumKonkurrenten` tut nichts. Das ist korrekt — die Bäume werden einfach nicht als Z-Bäume dargestellt.

**→ Ergebnis:** Keine Code-Änderung nötig für diesen Punkt. Die Zeitreihe ist bereits konsistent. Die Grundpopulation (Positionen, Erntezeitpunkte) ist identisch.

### 2.2 Neue Darstellungsebenen (renderBird, Zeile ~3849)

**Aktuelle Schichten:**
```
D: Z-Baum-Ringe (oberst)
C: Z-Baum-Kronen (alle Z-Bäume gemischt)
B: Normale Bäume + Lücken-VJ
A: Unter-Schirm-VJ (unterst)
```

**Neue Schichten (6 Ebenen):**
```
F: Z-Baum-Ringe            (oberst, über Transekt)
E: Z-Bäume 1. Generation   (Bestandesbäume, isZBaum && !isFromVJ)
D: Konkurrenten 1. Gen     (!isZBaum && !isFromVJ && !isVerjuengung && !underCanopy)
C: Z-Bäume 2. Generation   (VJ-Nachfolger, isZBaum && isFromVJ)
B: Konkurrenten 2. Gen     (!isZBaum && isFromVJ && !underCanopy)
A: Unter-Schirm-VJ         (unterst, underCanopy === true)
```

**Filter-Logik pro Schicht:**
```javascript
// Schicht A: Unter-Schirm-VJ
t.underCanopy === true

// Schicht B: Konkurrenten 2. Gen (VJ-Bäume, keine Z-Bäume, nicht unter Schirm)
!t.underCanopy && !t.isZBaum && t.isFromVJ

// Schicht C: Z-Bäume 2. Gen (VJ-Nachfolger die Z-Baum wurden)
!t.underCanopy && t.isZBaum && t.isFromVJ

// Schicht D: Konkurrenten 1. Gen (Bestandesbäume, keine Z-Bäume)
!t.underCanopy && !t.isZBaum && !t.isFromVJ && !t.isVerjuengung

// Schicht E: Z-Bäume 1. Gen (ursprüngliche Bestandesbäume)
!t.underCanopy && t.isZBaum && !t.isFromVJ

// Schicht F: Z-Baum-Ringe (alle Z-Bäume)
t.isZBaum (nur Ringe, keine Kronen)
```

**Verifizierung (Iteration 1):** Alle Bäume haben genau eine der Eigenschaften `underCanopy`, `isFromVJ`, `isZBaum`. Ein Baum kann `isFromVJ && isZBaum` sein (VJ-Nachfolger als Z-Baum). ✅ Partitionierung ist disjunkt und vollständig.

**Verifizierung (Iteration 2):** Was ist mit `isVerjuengung`? Das Flag bedeutet h < 8 (junge VJ). Diese haben immer `isFromVJ = true`. Sie fallen in Schicht B (Konkurrenten 2. Gen) als kleine VJ. ✅ Korrekt.

**Verifizierung (Iteration 3):** Rendering-Unterschiede:
- Schicht A: fill-opacity .45 (halbtransparent, klein)
- Schicht B: fill-opacity .70 (VJ-Konkurrenten, etwas kleiner)
- Schicht C: fill-opacity .90 (Z-Bäume 2. Gen, herrschend)
- Schicht D: fill-opacity .78 (Bestandesbäume, normal)
- Schicht E: fill-opacity .95 (Z-Bäume 1. Gen, dominant)
- Schicht F: Ringe (gestrichelt, orange/blau)
✅ Visuell distinkt und hierarchisch korrekt.

### 2.3 Neue Konkurrenzlogik (genTrees Competition, Zeile ~2134)

**Aktuelle Logik:**
- Z-Bäume: 90% auf Z-Bäume, 20% auf normale
- Normale: 100% auf alles

**Neue Logik (4 Fälle):**

| Baum (t)     | Nachbar (n)   | Reaktion |
|-------------|---------------|----------|
| Z-Baum      | Z-Baum        | 90%      |
| Z-Baum      | Konkurrent    | 25%      |
| Z-Baum      | VJ            | 0%       |
| Konkurrent  | Z-Baum        | 100%     |
| Konkurrent  | Konkurrent    | 100%     |
| Konkurrent  | VJ            | 0%       |

**Implementierung:**
```javascript
// Für Z-Bäume: separater Druck
if (t.isZBaum) {
  if (n.isFromVJ || n.isVerjuengung) continue; // 0% auf VJ
  if (n.isZBaum) zbPressure += basePressure;    // → 90%
  else konPressure += basePressure;              // → 25%
}
// Für Konkurrenten (nicht Z-Baum, nicht VJ):
else if (!t.isFromVJ && !t.isVerjuengung) {
  if (n.isFromVJ || n.isVerjuengung) continue;  // 0% auf VJ
  pressure += basePressure;                       // 100% auf alles andere
}
// Für VJ-Bäume: normale Konkurrenz untereinander
else {
  pressure += basePressure;
}
```

**Anwendung der Faktoren:**
```javascript
if (t.isZBaum) {
  const zbComp = Math.min(0.12, zbPressure * 0.027);     // 90%
  const konComp = Math.min(0.04, konPressure * 0.0075);   // 25%
  t.cw *= (1 - zbComp - konComp);
} else if (!t.isFromVJ && !t.isVerjuengung) {
  // Konkurrenten: 100% auf alles (Z-Bäume + andere Konkurrenten)
  t.cw *= (1 - Math.min(0.15, pressure * 0.03));
} else {
  // VJ: normale schwache Konkurrenz
  t.cw *= (1 - Math.min(0.10, pressure * 0.02));
}
```

**Verifizierung (Iteration 1):** Faktoren prüfen: 0.03 = 100% Basis. 90% = 0.027 ✅. 25% = 0.0075 ✅. 0% = skip ✅.

**Verifizierung (Iteration 2):** Edge Case — Z-Baum der 2. Gen (`isFromVJ && isZBaum`): Wird als Z-Baum behandelt (t.isZBaum Check kommt zuerst). Ignoriert VJ. Reagiert 90% auf Z-Bäume, 25% auf Konkurrenten. ✅ Korrekt.

**Verifizierung (Iteration 3):** Die Variable `konPressure` muss initialisiert werden neben `pressure` und `zbPressure`. ✅ Hinzufügen.

### 2.4 Render-Pipeline (render(), Zeile ~4655)

**Aktueller Ablauf:**
```
render() → genTrees() → markZBaeume() → removeZBaumKonkurrenten() → applyZBaumBoost() → renderFront() → renderBird()
```

**Neuer Ablauf (identisch, aber Kommentare klären):**
```
render()
  1. genTrees()                    — Grundpopulation (identisch mit/ohne Z-Baum)
  2. markZBaeume()                 — Z-Bäume nach FBB markieren
  3. removeZBaumKonkurrenten()     — Voronoi → Konkurrenten zuweisen → FBB-Entnahme (innen→aussen)
  4. applyZBaumBoost()             — Basis-Boost für herrschende Stellung
  5. renderFront()                 — Frontansicht
  6. renderBird()                  — Vogelansicht mit 6 Schichten
```

**Keine strukturelle Änderung nötig** — die Pipeline ist bereits korrekt. Nur die Konkurrenzlogik in genTrees() und die Schichten in renderBird() müssen angepasst werden.

---

## 3. Betroffene Code-Stellen

| # | Dateibereich | Zeilen (ca.) | Änderung |
|---|-------------|-------------|----------|
| 1 | genTrees() Competition Block 1 | 2134-2189 | Neue 4-Fälle Konkurrenzlogik |
| 2 | genTrees() Competition Block 2 | 2430-2490 | Identische Änderung (manueller Modus) |
| 3 | renderBird() Schichten | 3849-3893 | 6 neue Schichten statt 4 |
| 4 | removeZBaumKonkurrenten() | 1304-1450 | Bereits korrekt (Voronoi + innen→aussen) |

---

## 4. Nicht-Änderungen (explizit bestätigt)

- **genTimelineMaster()**: Keine Änderung. Z-Bäume werden im Master korrekt markiert.
- **markZBaeume()**: Keine Änderung. Logik ist korrekt.
- **removeZBaumKonkurrenten()**: Keine Änderung. Voronoi + innen→aussen ist korrekt.
- **applyZBaumBoost()**: Keine Änderung.
- **Hiebreife-Delay**: Keine Änderung. `mt.isZBaum` ist im Master immer gesetzt.
- **render() Pipeline**: Keine strukturelle Änderung.
