# GitHub Push: waldbau-viz — Dienerbaum-Bonus Hotfix

**Version:** v2.2.0 Hotfix (Dienerbaum-Logik überarbeitet)
**Datum:** 11. April 2026
**Typ:** Hotfix / waldbauliche Korrektur

---

## Kurzbeschreibung

Dienerbäume sind jetzt **reine Bonus-Bäume**. Sie zählen nicht mehr zur Stammzahl/ha,
Grundfläche oder zum Vorrat, und der Dienergürtel wird immer zu 100% gefüllt
(≥ 90% Deckungsgrad garantiert). Das globale Artenbudget bleibt für Cluster und
Einzelmischung vollständig erhalten.

---

## Änderungen im Detail

### 1. Stammzahl/Grundfläche/Vorrat — nur Oberschicht zählt

**Datei:** `waldbau-viz_v2.2.0.html` — Funktion `calcSt()` (~Zeile 5479)

Der Filter schliesst jetzt **beide** Dienerbaum-Typen aus den Bestandeskennzahlen aus:

```javascript
// VORHER:
const countTrees = S.trees.filter(t => !t.isBonusDiener);

// NACHHER:
const countTrees = S.trees.filter(t => !t.isBonusDiener && !t.isDiener);
```

Die Vorratsrechnung (`volHa`) iteriert jetzt ebenfalls über `countTrees` statt `S.trees`,
damit Dienerbäume auch aus dem Derbholzvolumen herausfallen. Nur Oberschicht
(Förderbäume + Einzelmischung) fliesst in die Statistik.

**Betroffen:**
- Stammzahl/ha (Anzeige `sn`)
- Grundfläche m²/ha (Anzeige `sg`)
- Vorrat m³/ha (Anzeige `svol`)

**Nicht betroffen (absichtlich):**
- Horizontaler Deckungsgrad — Dienerbäume tragen zur Kronenbedeckung bei
- Vertikaler Deckungsgrad (nU/nM/nO) — Dieners füllen die M/U-Schichten

---

### 2. Dienergürtel immer 100% gefüllt — Timeline-Modus

**Datei:** `waldbau-viz_v2.2.0.html` — `genTimelineMaster()` (~Zeile 2468–2513)

**Alte Logik:**
- Ring-Positionen wurden proportional auf Diener-Arten verteilt, begrenzt durch
  `Math.min(share, globalRemaining)` (globales Artbudget)
- Bei Budget-Erschöpfung wurden Ring-Positionen als `__RESERVED__` markiert
  und blieben leer → Warnung im UI
- Der Gürtel erreichte oft nicht die gewünschten 90% Deckungsgrad

**Neue Logik:**
- Alle Ring-Positionen werden **zu 100%** mit Dienerbäumen gefüllt
- `used[dSp]` wird **niemals** inkrementiert → die Dienerart behält ihr volles
  globales Budget für Cluster/Einzelmischung/Restpool
- Keine `__RESERVED__` Lücken mehr, keine "Positionen unbesetzt"-Warnung
- Proportionale Verteilung bei mehreren Diener-Arten via "last-gets-rest"-Algorithmus
  (kein Rundungsverlust)

```javascript
// Zuweisen — ALLE Ring-Positionen werden gefüllt (kein __RESERVED__ mehr).
// Alle Dienerbäume sind BONUS: used[dSp] wird NIEMALS inkrementiert.
// Die Dienerart behält damit ihr volles globales Budget für Cluster und
// Einzelmischung (Restpool). Dienerbäume sind via isDiener=true aus
// Stammzahl, Grundfläche und Vorrat ausgeschlossen (siehe calcSt()).
for (let qi = 0; qi < ringPositions.length; qi++) {
  const dSp = dienerQueue[qi % dienerQueue.length];
  const rp = ringPositions[qi];
  spArr[rp.idx] = dSp;
  _dienerPositions.set(rp.idx, { foerderSp, dist: rp.dist });
}
```

---

### 3. Dienergürtel immer 100% gefüllt — Manueller Modus

**Datei:** `waldbau-viz_v2.2.0.html` — Dienerbaum-Platzierung manueller Modus (~Zeile 3316–3395)

Identische Anpassung wie im Timeline-Modus übertragen:
- `usedM[dSp]` bleibt unberührt
- Alle Ring-Positionen werden gefüllt
- Die alte `dienerDG < 90%` Warnung und die zugehörige Deckungsgrad-Prüfung
  entfernt — der Gürtel erreicht die 90% jetzt strukturell durch die 100% Füllung

---

## Gürtelbreite

**Unverändert bei 10 Metern.** Im Verlauf der Diskussion wurde bestätigt, dass die
10m-Breite beibehalten wird, weil sie mehr Licht zum Förderbaum durchlässt als eine
5m-Variante.

---

## Semantische Auswirkungen

**Beispiel:** Bestand mit Fi 30% (Horst), Bu 30% (Einzelmischung), Ta 40% (Diener für Fi)
bei 1000 Bäumen Dichte:

| Phase | Bäume | Art |
|---|---|---|
| Cluster-Phase | 300 | Fi (Horst, Oberschicht) |
| Diener-Ring | ~250 | Ta (Bonus, 10m-Gürtel um Fi) |
| Restpool | ~450 | Bu ~193 + Ta ~257 (proportional) |
| **Total Bildschirm** | **1000** | |
| **Stammzahl/ha (Oberschicht)** | **750** | 300 Fi + 257 Ta + 193 Bu |

Die 250 Ta-Dieners im Ring zählen nicht zur Stammzahl — werden visuell aber
vollständig dargestellt und tragen zum horizontalen Deckungsgrad bei.

---

## Qualitätssicherung

5 QA-Iterationen durchgeführt:

1. **Syntax + Timeline-Trace** — JS-Parser OK (6669 Zeilen), Ring-Positionen werden
   korrekt gesperrt (`claimed` Set), Flow durchläuft sauber
2. **Manueller Modus + Edge Cases** — Multi-Species-Verteilung mit "letzte Art
   bekommt Rest", Modulo-Fallback für `dienerQueue`, frischer `spAssign` pro
   Aufruf (kein State-Leak)
3. **calcSt + assignedLayer Propagation** — Ring-Diener (`assignedLayer: M/U` →
   `isDiener: true`), Cluster-Bonus-Diener (`isDiener + isBonusDiener`),
   Schicht-Toggle-Cluster (`isDiener` wenn Layer != O) werden alle aus
   Stammzahl/Grundfläche/Vorrat gefiltert
4. **Totholz, Habitat, Konkurrenz, Durchforstung** — Alle Hilfsfunktionen
   respektieren `!t.isDiener` korrekt:
   - Dieners sind keine Habitat-Kandidaten
   - Dieners blockieren keine Totholz-Positionen
   - Dieners erzeugen realen Konkurrenzdruck (`applyZBaumCompetition`)
   - Dieners werden in der Z-Baum-Durchforstung nicht entfernt (Schaftpfleger-Schutz)
5. **Finale Prüfung + Sync** — `waldbau-viz_v2.2.0.html` und `index.html` identisch

---

## Geänderte Dateien

```
waldbau-viz_v2.2.0.html      — Haupt-Code (Hotfix inklusive)
index.html                   — Build-Output (synchron mit v2.2.0)
GITHUB_PUSH_V2.2.1_DIENERBAUM_BONUS.md — diese Datei
```

---

## Git-Befehle

```bash
cd waldbau-viz

# Stagen
git add waldbau-viz_v2.2.0.html
git add index.html
git add GITHUB_PUSH_V2.2.1_DIENERBAUM_BONUS.md

# Commit
git commit -m "$(cat <<'EOF'
Hotfix: Dienerbäume als reine Bonus-Bäume behandeln

Waldbauliche Korrektur an der Dienerbaum-Logik (v2.2.0 Hotfix):

1. Stammzahl/Grundfläche/Vorrat: Dienerbäume werden vollständig
   aus calcSt() ausgeschlossen. Nur Oberschicht (Förderbäume +
   Einzelmischung) zählt noch zu den Bestandeskennzahlen.

2. Dienergürtel: Wird jetzt zu 100% gefüllt (≥ 90% Deckungsgrad
   garantiert). used[dSp] wird bei Diener-Platzierung niemals
   inkrementiert, damit die Dienerart ihr volles globales Budget
   für Cluster/Einzelmischung/Restpool behält.

3. Gürtelbreite bleibt bei 10m (mehr Lichtdurchlass als 5m).

Betroffen: Timeline-Modus (genTimelineMaster) und manueller Modus.
Entfernt: __RESERVED__ Logik und dienerDG-Warnung (nicht mehr nötig).

QA: 5 Iterationen (Syntax, Timeline, Manuell, calcSt-Propagation,
Integration Totholz/Habitat/Konkurrenz/Durchforstung).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# Push
git push origin main
```

---

## Testszenarien (Manueller Smoke-Test)

Vor dem Push empfohlen:

1. **Timeline-Modus — Fi 60% Horst + Ta 40% Diener**
   - Erwartet: Fi-Horst in Oberschicht, Ta dicht um die Förderbäume, keine
     Lücken im Gürtel, Stammzahl zeigt weniger als totalN (Ta-Diener nicht
     mitgezählt)

2. **Manueller Modus — Gleicher Mix**
   - Erwartet: Identisches Verhalten wie Timeline

3. **Diener-Arten mit Schicht-Toggle Cluster**
   - Erwartet: M/U-Layer-Trees in Clustern zählen ebenfalls nicht zur Stammzahl
     (konform zu "nur Oberschicht zählt")

4. **Mehrere Dienerarten pro Förderart** (z.B. dienerMap[Fi] = ['Ta', 'Bu'])
   - Erwartet: Proportionale Verteilung im Ring nach Prozentzahlen, kein
     Rundungsverlust

5. **Dauerwald/Plenter Modus**
   - Erwartet: Unverändert — Plenter-Bäume haben kein `isDiener`-Flag und
     werden alle gezählt

6. **Vogelansicht + Frontansicht**
   - Erwartet: Dieners sichtbar in beiden Ansichten, Totholz mit 1-3m Abstand
     zu Oberschicht-Stämmen (nicht zu Dieners)

---

## Rollback

Falls Probleme auftreten, Rollback auf v2.2.0 Release-Stand:

```bash
git revert HEAD
git push origin main
```

Oder der savepoint_15_v2.2.0_waldbau_werkzeuge.html kann als Referenz dienen.
