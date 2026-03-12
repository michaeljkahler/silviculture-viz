# Auftrag: GitHub Update auf V2.0.0

**Projekt:** Waldbau-Visualisierung (waldbau-viz)
**Von Version:** V1.1.0
**Auf Version:** V2.0.0 (Major Release — fundamentale Architekturänderungen)
**Datum:** 2026-03-12

---

## 1. Versionierung & Dateien

### 1.1 Neue Versionsdatei erstellen
- `waldbau-viz_v1.1.0.html` → kopieren als `waldbau-viz_v2.0.0.html`
- `index.html` mit dem Inhalt von `waldbau-viz_v2.0.0.html` aktualisieren (identisch)
- In beiden Dateien den Versions-String im Code aktualisieren: `v1.1.0` → `v2.0.0`

### 1.2 Savepoint erstellen
- `waldbau-viz_v2.0.0.html` → kopieren als `savepoint_13_v2.0.0_zbaum_voronoi.html`

### 1.3 Alte Versionen behalten
- `waldbau-viz_v1.0.0.html`, `waldbau-viz_v1.0.1.html`, `waldbau-viz_v1.1.0.html` bleiben als Referenz im Repo

---

## 2. Changelog V2.0.0

### 2.1 Voronoi-basierte Z-Baum Konkurrenzlogik (NEU)
**Funktion:** `removeZBaumKonkurrenten()` — komplett neu geschrieben

- Jeder Z-Baum erhält ein Voronoi-Feld: alle Nicht-Z-Bäume der jeweiligen Generation werden dem nächsten Z-Baum zugeordnet
- Durchforstung erfolgt **von innen nach aussen** (nächster Konkurrent wird zuerst entfernt)
- FBB-konforme Entnahme: Anzahl Konkurrenten pro Z-Baum wird aus FBB Eingriffstabellen interpoliert (`konZB` bei aktuellem `hdom`)
- Artübergreifende Abstandsberechnung: `(Endabstand_A/2 + Endabstand_B/2)`
- Progressiver Kronenschluss nach Entnahme: `boost = freedFraction × 0.90 × ageFactor`, begrenzt auf `ZB_ENDABSTAND`

### 2.2 Generationentrennung (NEU)
**Funktion:** `processGeneration()` — generische Funktion für beide Generationen

- **1. Generation (Bestandesbäume):** `!isFromVJ` — ursprüngliche Bäume ab Jahr 1
- **2. Generation (VJ-Nachfolger):** `isFromVJ` — Verjüngung auf Erntepositionen
- Beide Generationen durchlaufen identische Z-Baum-Logik (Voronoi, Durchforstung, Kronenschluss)
- Alle Master-Bäume existieren ab Jahr 1 (`nSurvive = _masterTrees.length`)

### 2.3 6-Schichten SVG-Rendering (NEU)
**Funktion:** `renderBird()` — erweitert von 4 auf 6 Schichten

| Schicht | Inhalt | Opacity | Filter |
|---------|--------|---------|--------|
| A (unterst) | Unter-Schirm-VJ | .45 | `underCanopy === true` |
| B | Konkurrenten 2. Gen | .70 | `!isZBaum && isFromVJ && !underCanopy` |
| C | Z-Bäume 2. Gen | .90 | `isZBaum && isFromVJ && !underCanopy` |
| D | Konkurrenten 1. Gen | .78 | `!isZBaum && !isFromVJ && !isVerjuengung && !underCanopy` |
| E | Z-Bäume 1. Gen | .95 | `isZBaum && !isFromVJ && !underCanopy` |
| F (oberst) | Z-Baum-Ringe | — | `isZBaum` (orange 1.Gen / blau 2.Gen) |

### 2.4 Differenzierte Konkurrenzlogik (NEU)
**Funktion:** `applyZBaumCompetition()` — neue Pipeline-Stufe

| Baum (t) | Nachbar (n) | Reaktion |
|----------|-------------|----------|
| Z-Baum | Z-Baum | 90% (`pressure × 0.027`) |
| Z-Baum | Konkurrent | 25% (`pressure × 0.0075`) |
| Z-Baum | VJ | 0% (ignoriert) |
| Konkurrent | Z-Baum/Konkurrent | 100% (`pressure × 0.03`) |
| Konkurrent | VJ | 0% (ignoriert) |

- `genTrees()` verwendet einheitliche Konkurrenz für alle Bäume (stabile Basis-Population)
- `applyZBaumCompetition()` korrigiert nachträglich die Z-Baum-spezifischen Faktoren
- Dadurch bleibt die Zeitreihe identisch mit/ohne Z-Baum-Modus

### 2.5 Kronendeformation mit Z-Baum-Dominanz (NEU)
**Funktion:** `computeBR()` — erweitert

- Z-Bäume werden **nicht** durch VJ beeinflusst (skip)
- Konkurrenten 1. Gen reagieren **nicht** auf VJ (skip)
- Z-Baum vs. Konkurrent: **75/25 Dominanz-Split** (Z-Baum nimmt 75% des Raums)
- Gleichrangige Bäume: proportionale Aufteilung nach Kronenradius

### 2.6 Konsistente Zeitreihe (BESTÄTIGT)
- `genTrees()` liest `mt.isZBaum` direkt aus dem Master (immer gesetzt)
- `harvestDelay` basiert auf Master-Flag, nicht auf `S.showZBaum`
- Grundpopulation (Positionen, Erntezeitpunkte) ist identisch ob Z-Baum-Modus an/aus

### 2.7 Kronenwachstum begrenzt auf Endabstand (FIX)
- Z-Baum-Kronen werden auf `ZB_ENDABSTAND[species]` begrenzt
- `ZB_ENDABSTAND = {Fi:8, Ta:8, Bu:11, Ei:15, Es:12, BAh:12, WFoe:11, Lae:11, Dou:9, Li:12}`

---

## 3. Render-Pipeline V2.0.0

```
render()
  1. genTrees()                    — Einheitliche Grundpopulation
  2. markZBaeume(S.trees)          — Z-Bäume nach FBB markieren
  3. removeZBaumKonkurrenten()     — Voronoi + FBB-Durchforstung (beide Generationen)
  4. applyZBaumBoost()             — Basis-Boost für herrschende Stellung
  5. applyZBaumCompetition()       — Differenzierte Konkurrenz (90%/25%/0%)
  6. renderFront()                 — Frontansicht
  7. renderBird()                  — Vogelansicht (6 Schichten)
  8. renderLeg() / calcSt() / ... — Legende, Statistik, UI
```

---

## 4. Wichtige Konstanten (V2.0.0)

```javascript
const ZB_ENDABSTAND = {Fi:8, Ta:8, Bu:11, Ei:15, Es:12, BAh:12, WFoe:11, Lae:11, Dou:9, Li:12};
const FBB_ZB = { /* Z-Bäume pro ha per species — aus FBB Produktionskonzept 2022 */ };
const HIEBREIFE = {
  Bu: {harvestAge:100, maxAge:140, zd_cm:60},
  Ta: {harvestAge:60, maxAge:100, zd_cm:60},
  Fi: {harvestAge:60, maxAge:80, zd_cm:60},
  // ... alle 10 Baumarten
};
```

---

## 5. Git-Anweisungen

### 5.1 Commit-Nachricht
```
V2.0.0: Voronoi-basierte Z-Baum Architektur

Major Release — fundamentale Architekturänderungen:
- Voronoi-basierte Konkurrentenzuordnung pro Z-Baum
- Durchforstung von innen nach aussen (FBB-konform)
- 6-Schichten SVG-Rendering mit Generationentrennung
- Differenzierte Konkurrenzlogik (90%/25%/0%)
- Kronendeformation mit Z-Baum-Dominanz (75/25 Split)
- Generationenübergreifende Z-Baum-Logik (1. + 2. Gen)
- Konsistente Zeitreihe unabhängig vom Z-Baum-Modus
- Kronenwachstum begrenzt auf artspezifischen Endabstand
```

### 5.2 Git-Befehle
```bash
cd waldbau-viz

# 1. Versionsdateien erstellen
cp waldbau-viz_v1.1.0.html waldbau-viz_v2.0.0.html
cp waldbau-viz_v2.0.0.html savepoint_13_v2.0.0_zbaum_voronoi.html
# index.html ist bereits aktuell (identisch mit v1.1.0)

# 2. Versions-String in waldbau-viz_v2.0.0.html und index.html aktualisieren
# Suche nach "v1.1.0" und ersetze durch "v2.0.0" (im HTML-Titel und im Code)

# 3. Staging
git add waldbau-viz_v2.0.0.html
git add savepoint_13_v2.0.0_zbaum_voronoi.html
git add index.html
git add IMPL_SPEC_ZBaum_Refactor.md
git add AUFTRAGS_V2.0.0.md
git add AENDERUNGSAUFTRAG_v4.md
git add vergleich_10_baumarten.svg

# 4. Commit
git commit -m "V2.0.0: Voronoi-basierte Z-Baum Architektur

Major Release — fundamentale Architekturänderungen:
- Voronoi-basierte Konkurrentenzuordnung pro Z-Baum
- Durchforstung von innen nach aussen (FBB-konform)
- 6-Schichten SVG-Rendering mit Generationentrennung
- Differenzierte Konkurrenzlogik (90%/25%/0%)
- Kronendeformation mit Z-Baum-Dominanz (75/25 Split)
- Generationenübergreifende Z-Baum-Logik (1. + 2. Gen)
- Konsistente Zeitreihe unabhängig vom Z-Baum-Modus
- Kronenwachstum begrenzt auf artspezifischen Endabstand"

# 5. Tag setzen
git tag -a v2.0.0 -m "V2.0.0: Voronoi-basierte Z-Baum Architektur"

# 6. Push
git push origin main
git push origin v2.0.0
```

---

## 6. Betroffene Dateien (Zusammenfassung)

| Datei | Aktion |
|-------|--------|
| `waldbau-viz_v2.0.0.html` | NEU (Kopie von v1.1.0, Version aktualisiert) |
| `index.html` | AKTUALISIERT (identisch mit v2.0.0) |
| `savepoint_13_v2.0.0_zbaum_voronoi.html` | NEU (Savepoint) |
| `IMPL_SPEC_ZBaum_Refactor.md` | BESTEHEND (Spezifikation der Änderungen) |
| `AUFTRAGS_V2.0.0.md` | NEU (dieses Dokument) |
| `AENDERUNGSAUFTRAG_v4.md` | BESTEHEND (Detailauftrag) |
| `vergleich_10_baumarten.svg` | BESTEHEND (Baumarten-Vergleich) |

---

## 7. Qualitätskontrolle

Vor dem Push sicherstellen:
1. `waldbau-viz_v2.0.0.html` öffnet korrekt im Browser
2. Z-Baum-Modus ein/aus: Vogelansicht-Grundstruktur bleibt identisch
3. Durchforstung sichtbar: Konkurrenten verschwinden von innen nach aussen
4. 6 Schichten korrekt gerendert (VJ unter Konkurrenten unter Z-Bäumen)
5. Kronenwachstum stoppt bei Endabstand
6. Alle 10 Baumarten funktionieren
7. Timeline durchlaufen: keine spontan erscheinenden Bäume
