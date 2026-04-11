# Changelog

## [2.6.1] — 2026-04-11

### Schaftpflege-Zyklus: Diener mit Kronenansatz-Kappung + kontinuierlicher Verjüngung

Feinschliff der Timeline-Dienerlogik nach v2.6.0. Bisher bekamen Diener eine feste Höhenfraktion des Förderbaums (M=67 %, U=35 %), die vom Kronenansatz unabhängig war. Neu:

#### Kronenansatz-Kappung
- Diener-Höhe ≤ **Förderbaum-ka × 1.10** (Kronenunterkante +10 %)
- Berechnung: `foerderKa = foerderH - foerderCrown.kl` (aus `crownFromBHD`)
- Obergrenze für das Diener-Alter per Binärsuche: `hdom(dienerSp, maxAge) = maxDienerH`
- **Physikalisch:** Diener wachsen nie in die Krone des Förderbaums hinein

#### "Vorzu verjüngt" — zyklischer Schaftpflege-Durchlauf
- Jeder Diener bekommt eine **Phase** (Golden-Ratio-Sequenz über `survivalRank`) → gleichmässige Verteilung über den gesamten Zyklus
- Wachstumsfluss: `dienerFlow = S.age × 0.5 + phase × maxDienerAge` (Schattenwachstum = 50 %)
- **Modulo** auf `maxDienerAge` → alter Diener nahe Obergrenze wird beim nächsten Zeitschritt automatisch durch Sämling ersetzt
- Resultat: Im Bestand sind gleichzeitig Sämlinge, mittelhohe und beinahe-Maximal-Diener sichtbar → natürliche kontinuierliche Verjüngung

#### Verifikation (QS Iter 1 bei WFoe-Trupp + Ta-Diener)
| Alter | Föerder h | ka | max erlaubt | Diener min / med / max |
|---|---|---|---|---|
| 20 | 7.0 | 2.2 | 2.4 | 0.5 / 0.7 / 2.3 |
| 40 | 19.0 | 9.2 | 10.1 | 0.5 / 3.4 / 10.0 |
| 60 | 29.5 | 17.8 | 19.6 | 0.5 / 6.8 / 18.8 |
| 80 | 33.5 | 21.7 | 23.8 | 0.5 / 8.6 / 22.4 |
| 120 | 39.0 | 27.0 | 29.7 | 0.5 / 11.8 / 29.3 |

- 0 Verletzungen der Kappung über alle Altersstufen
- Bei Alter 80: 294 kleine (<3m) + 338 mittlere + 685 grosse Diener → breite Streuung
- Diener-Median wächst mit Förderbaum-ka (mitwachsen ✓)
- Sämling-Minimum 0.5 m über alle Altersstufen (kontinuierliche Verjüngung ✓)

#### Tests
- state_roundtrip: 36/36 ✅
- validate: 63/63 ✅
- QS v2.6.1 (Kappung + Streubreite + Wachstum über Zeit): 10/10 ✅

#### Betroffene Codestelle
- `genTrees()` Zeile ~2807–2846: Ring-Diener-Alter-Berechnung komplett neu

## [2.6.0] — 2026-04-11

### Feature-Parity Timeline ↔ Manuell + VJ-Deckungsgrad + Diener-Ernte-Bug

Nach einem Feature-Audit beider Modi wurden 5 Lücken/Bugs behoben, um Manuell und Zeitschiene auf denselben Funktionsstand zu bringen.

#### Fix 1: Timeline-Diener-Ernte-Bug
- **Bug**: Diener wurden bei ihrer *eigenen* Art-Hiebreife geerntet, nicht bei der des Förderbaums. Beispiel: Ta-Diener (Hiebreife 60) unter WFoe-Förderbaum (Hiebreife 120) verschwanden bei `S.age ≥ 71`, während der Förderbaum bis 131 stand.
- **Fix**: Neuer `isRingDiener`-Flag. Ring-Diener folgen jetzt dem hardCutoff ihres *Förderbaums*, nicht ihrer eigenen Art.
- Sauberere Trennung von `isDiener` (nur Ring-Diener, für `calcSt`-Stammzahl-Ausschluss) und `isZBaum: false` (alle Nicht-O-Layer-Bäume).

#### Fix 2: Timeline Master — Schicht-Toggle für Einzelmischung
- **Vorher**: Schicht-Toggle (O/M/U/V) wirkte im Master nur bei Cluster-Mischungen (`trupp`/`gruppe`/`horst`), nicht bei Einzelmischung. Das führte zu Inkonsistenzen zwischen Master (`isMinorSpecies`) und genTrees (`_assignedLayer`).
- **Fix**: `} else if (spLyM && isClusterM) { ... }` → `} else if (spLyM) { ... }` — Schicht-Toggle gilt jetzt für *alle* Mischungsformen.

#### Fix 3: Manueller Modus — Schicht-Toggle für Einzelmischung
- Gleicher Fix wie Change 2, aber in `genTrees()` für den manuellen Pfad (Zeile ~3495). Einzelbäume mit U/M-Toggle werden jetzt korrekt in der entsprechenden Schicht platziert.

#### Fix 4: Manueller Modus — Z-Bäume aktivierbar
- **Vorher**: `markZBaeume()` hatte einen harten Gate `!S.timelineOn → return`. Im Manual Mode waren Z-Bäume unmöglich.
- **Fix**: Gate geöffnet. Neuer Initial-Markierungsschritt (Schritt 0) in `markZBaeume()` — wenn keine persistenten Z-Baum-Flags existieren (Manual Mode), werden Kandidaten greedy nach BHD sortiert und unter Berücksichtigung von Endabstand und Budget markiert.
- `removeZBaumKonkurrenten()` Gate ebenfalls geöffnet (`!S.showZBaum` statt `!S.timelineOn`).
- Konsequenz: Z-Baum-Pipeline (Markierung, Konkurrentenentnahme, Boost, Konkurrenz) läuft jetzt auch im Manual Mode.

#### Fix 5: Manueller Modus — VJ auf 80 % Deckungsgrad umgestellt
- **Vorher**: Harter Cap `maxVJ = 80` unabhängig von Lückengrösse → "zu zaghafte" Verjüngung.
- **Neu**: Monte-Carlo-Schätzung der Lückenfläche (40×40 Sample-Raster), Zielwert `gapArea × 0.80` als kumulativer VJ-Kronenflächen-Cover.
- Packing-Loop mit Spatial-Grid (`vjCell = 4m`) für O(1) Kollisionsprüfung.
- VJ-Kronen visuell vergrössert (Faktor 1.2 für Sämlinge, 0.95 statt 0.85 für grössere) — repräsentieren Verjüngungs-Cluster statt Einzelpflanzen.
- Lockere Packung (Kronen dürfen bis ~82 % überlappen) → natürliche Gruppen.
- Saturation-Counter mit Break bei 500 fehlgeschlagenen Versuchen in Folge.
- Messung: Von 9.7 % → 74 % Deckung bei Standard-Szenario (Fi 100 %, density 150, h 28 m).

#### Tests
- state_roundtrip: 36/36 ✅
- validate: 63/63 ✅
- QS-Szenarien Iter 1 (Schicht-Toggle, Z-Bäume, Ta/Bu-Layer, VJ-Stufenverteilung): 8/8 ✅
- QS-Szenarien Iter 2 (Ta-Diener unter WFoe bei Alter 50/80/140, Deckungsgradmessung, Z-Baum-Budget): 6/6 ✅

#### Betroffene Codestellen in `index.html`
- `markZBaeume()` Zeile ~1544: Gate geöffnet + Initial-Markierung für Manual Mode (Schritt 0)
- `removeZBaumKonkurrenten()` Zeile ~1719: Gate umgestellt auf `!S.showZBaum`
- `genTimelineMaster()` Zeile ~2594: Schicht-Toggle unabhängig von Cluster
- `genTrees()` Timeline-Pfad Zeile ~2895–2948: `isRingDiener`-Logik, saubere Flag-Trennung
- `genTrees()` Manual-Pfad Zeile ~3495: Schicht-Toggle unabhängig von Cluster
- `genTrees()` Manual-Pfad Zeile ~3600–3720: VJ auf 80 % Deckungsgrad mit Spatial-Grid

## [2.5.3] — 2026-04-11

### Revert v2.5.2 Caps + Neue VJ-Logik im manuellen Modus

#### Zeitschiene: gapAge-Cap entfernt, Dichte moderat reduziert
- **Revert v2.5.2**: `VJ_MAX_AGE` und `VJ_MAX_PER_GAP` entfernt, `gapAge` und `canopyVjAge` wieder uncapped → VJ wächst in späten Phasen natürlich zum Folgebestand heran
- **Neue Dichte**: `VJ_AREA_PER_TREE = 5` (vorher 25 in v2.5.2, 2.5 in v2.2.0) → Zieldichte 0.2 Pflanzen/m²
- **Obergrenze**: `VJ_MAX_PER_M2 = 5` als harter Cap (greift nur bei Mini-Lücken)
- Bei typischer Ta-Lücke (~78 m²): v2.5.3 liefert ~16 VJ (v2.2.0: 31, v2.5.2: 3–8)

#### Manueller Modus: Verhältnisbasierte Höhenverteilung in 4 Stufen
- **Gate**: VJ erscheint erst, wenn Oberschicht (Bäume mit `h ≥ 20 m`) existiert
- **Oberschicht-Referenz**: Median der Höhen aller Bäume ≥ 20 m
- **4 diskrete Stufen** mit gewichteter Zufallsauswahl (ähnlich Timeline-Verteilung):
  - Sämlinge/Jungwuchs (2–10 % h_ober): **45 %**
  - Dickung (15–30 % h_ober): **28 %**
  - Stangenholz (35–50 % h_ober): **18 %**
  - Vorwachser (55–70 % h_ober): **9 %**
- **Natürlicher Eindruck** durch Clustering in Generationen + Streuung innerhalb jeder Stufe
- VJ-Max-Höhe skaliert mit Oberschicht: bei 20 m → max 14 m, bei 35 m → max 24.5 m
- Kronen werden über `bhdFromH` + `crownFromBHD` korrekt abgeleitet (statt simpler Proportionalität)

## [2.5.2] — 2026-04-11

### Fix: VJ-Dichte & gapAge-Cap gegen Mittelschicht-Artefakt

Bei Gleich-Alter-Szenarien mit divergierenden Umtriebszeiten (z.B. Ta 60J + WFoe 120J bei S.age=120) entstanden zwei Rendering-Artefakte im Naturverjüngungs-Block von `genTimelineMaster()`:

1. **Gap-VJ zu dicht:** ~45 Bäume pro Lücke, bis zu ~5.700 VJ pro Hektar
2. **gapAge ungedeckelt:** "VJ" wuchs auf 20–25m und bildete eine scheinbare Mittelschicht, obwohl alle Arten nur `layers.O=true` hatten

**Fix:**
- **`VJ_AREA_PER_TREE = 25`** (vorher 2.5) → ~10× weniger dicht
- **`VJ_MAX_PER_GAP = 8`** → harter Cap bei grossen Lücken
- **`VJ_MAX_AGE = 30`** → `gapAge` und `canopyVjAge` werden gedeckelt
  - Maximale VJ-Höhe (Ta) ~14.5m statt 23m → keine Mittelschicht-Artefakte
- Unter-Schirm-VJ übernimmt denselben Alters-Cap (Konsistenz)

**Nicht verändert:** `harvestedTrees`-Erfassung, Dienerbaum-Logik (v2.2.1), Plenterwald-Pfad, `calcSt`/Statistik.

Verifiziert in 3 QA-Iterationen gegen Szenario T3_Hiebsreife_Ta_Ei_WFoe_120J (seed 42, density 149).

## [2.5.1] — 2026-04-11

### UI: Arbeitsstand-Sektion verschoben

- Die Save/Load-Buttons (JSON + CSV) wurden vom unteren Ende der Sidebar nach **ganz oben** über die Zeitschiene verschoben — schneller erreichbar zu Beginn der Arbeit

## [2.5.0] — 2026-04-11

### Feature: Excel-Vorlage mit Dropdowns und Formel-CSV-Export

- **`waldbau-state_VORLAGE.xlsx`** — Benutzerfreundliche Excel-Vorlage mit:
  - **Anleitung-Sheet:** Schritt-für-Schritt-Dokumentation in Deutsch
  - **Eingabe-Sheet:** Alle Parameter mit Dropdown-Menüs (Mode, Booleans, Mischungsformen) und Wertebereich-Validierungen (Prozent 0-100, Höhe 0-200, etc.)
  - **CSV-Export-Sheet:** Formel-basierte CSV-Ausgabe die sich automatisch aus den Eingaben aktualisiert
- Workflow: User füllt Eingabe-Sheet aus → CSV-Export aktualisiert sich automatisch → Copy-Paste in Texteditor → als .csv speichern → in waldbau-viz importieren
- **Tooltips/Comments** in den Spaltenheadern erklären jeden Parameter
- **`tools/generate_xlsx_template.py`** — Generator-Script (öffnet via openpyxl)
- **`tests/test_xlsx_template.py`** — Validierungstest: simuliert Excel-Formelauswertung in Python und füttert die generierte CSV durch `csvToState()` in Node.js (alle Prüfungen bestanden)

## [2.4.1] — 2026-04-11

### Cleanup + Farbänderungen

- **Klebast-Logik entfernt:** Der Klebast-Code in `drawBranchStubs()` wurde entfernt (war für die Visualisierung unnötig)
- **Neue Hauptfarben pro Baumart** (gemäss Standardpalette):
  - Fichte: `#5a5a00` (war Blau)
  - Weisstanne: `#b4b400` (war Türkis)
  - Waldföhre: `#f5f51e` (war Beige)
  - Lärche: `#f5f582` (war Hellgrün)
  - Douglasie: `#000000` (war Grün)
  - Buche: `#b4f5f5` (war Hellgrün)
  - Eiche: `#7878eb` (war Beige)
  - Ahorn: `#1e1e96` (war Pink)
  - Esche: `#0a0ae1` (war Blaugrau)
  - Birke: `#d9d9d9` (war Hellgrün)
  - Linde: unverändert
- Schatten- und Hell-Varianten (`cs`, `cd`, `ct`, `cts`) wurden konsistent aus den neuen Hauptfarben abgeleitet

## [2.4.0] — 2026-04-11

### Feature: CSV Save/Load + QS-Verifikation der JSON-Speicherung

#### Neue Features
- **CSV Export** (📊): Speichert den Arbeitsstand als CSV-Datei (Multi-Section-Format mit ##GLOBALS und ##SPECIES)
- **CSV Import** (📥): Lädt einen Arbeitsstand aus einer CSV-Datei
- **Vorlagen-Datei** `waldbau-state_VORLAGE.csv`: Ausführlich kommentierte CSV-Maske die in Excel/LibreOffice ausgefüllt und dann importiert werden kann
- CSV-Format unterstützt: Kommentare (`#`), leere Zeilen, CRLF/LF, ja/nein/true/false/1/0 als Boolean, semikolon-separierte Diener-Listen

#### QS-Verifikation der JSON-Speicherung (5 Iterationen)
- Vollständiger Round-Trip-Test mit Node.js Test-Runner
- 36 automatisierte Tests (alle grün): State-Init, saveState-Vollständigkeit, alle 18 Top-Level-Felder, Per-Art-Werte (h/cw/kl/ka/bhd/layers/habitat), Edge Cases, CSV-Roundtrip
- **Bug-Fixes als Teil der QS:**
  - **Production-Bug:** `claimed`-Variable war im falschen Scope in `genTimelineMaster()` — crasht bei Diener ohne Cluster (existierte seit v2.2.0)
  - **Load-UI-Sync:** mixOverflow-Styling, Totholz-Button, showHabitat-Re-Derive werden jetzt nach dem Laden korrekt aktualisiert
  - **Load-Reset:** `setTimeline(false)` darf beim Laden nicht aufgerufen werden, da es per-Art h/cw/kl/ka/bhd auf Defaults zurücksetzt

## [2.3.0] — 2026-04-11

### Feature: Arbeitsstand-Speicherung (JSON)

- **Speichern-Button** (💾): Exportiert den kompletten Arbeitsstand als JSON-Datei
  - Enthält: Modus, Dichte, Seed, Alter, Timeline, Mischungsformen pro Art, Schicht-Toggles, Dienerbaum-Mappings, Z-Baum/Habitat/Totholz-Konfiguration, Pro-Art-Parameter (h, cw, kl, ka, bhd, pct, on, layers, habitat)
  - Dateiname mit Modus + Zeitstempel: `waldbau-state_{mode}_{YYYY-MM-DD-HH-MM}.json`
  - Schemaversion + Metadaten für zukünftige Migrations-Sicherheit
- **Laden-Button** (📂): Lädt einen gespeicherten Arbeitsstand zurück
  - Validiert App-Identität (`waldbau-viz`)
  - Synchronisiert alle UI-Elemente (Slider, Buttons, Checkboxen, Mode-Toggles, Timeline)
  - Re-rendert komplette Visualisierung mit neuem State
  - Unbekannte Baumarten werden ignoriert (vorwärtskompatibel)
- Generierte Bäume werden NICHT gespeichert — werden über den Seed reproduzierbar regeneriert

## [2.2.1] — 2026-04-11

### Hotfix: Dienerbäume als reine Bonus-Bäume

- **Stammzahl/Grundfläche/Vorrat:** Dienerbäume werden vollständig aus `calcSt()` ausgeschlossen. Nur Oberschicht (Förderbäume + Einzelmischung) zählt zu den Bestandeskennzahlen.
- **Dienergürtel 100% gefüllt:** `used[dSp]` wird bei Diener-Platzierung niemals inkrementiert → Dienerart behält volles globales Budget für Cluster/Einzelmischung. Keine `__RESERVED__` Lücken mehr, keine "Positionen unbesetzt"-Warnung.
- **≥ 90% Deckungsgrad** strukturell garantiert durch 100% Füllung.
- **Gürtelbreite bleibt 10m** (mehr Lichtdurchlass als 5m).
- Betroffen: Timeline-Modus (`genTimelineMaster`) und manueller Modus.
- Dienerbäume tragen weiterhin zum horizontalen/vertikalen Deckungsgrad und zur visuellen Darstellung bei.

## [2.2.0] — 2026-03-19

### Minor: Waldbauliche Werkzeuge & Visualisierungs-Erweiterungen

#### Z-Baum proportionale Verteilung (NEU)
- Z-Bäume proportional zum Mischungsanteil verteilt
- Lichtbaumarten +10% Aufschlag (aufgerundet), Schattenbaumarten abgerundet
- 2. Generation Z-Bäume: Lichtbaumarten +25% Budget-Boost

#### Birke als 11. Baumart (NEU)
- Betula pendula mit SiWaWa-Kurve, Kronenform 'birch', FBB-Tabelle
- Pionierbaumart: Umtrieb 80J, ZD 40cm, Lichtzahl 7

#### Schicht-Toggles [O][M][U][V] (NEU)
- Pro Baumart: Oberschicht, Mittelschicht, Unterschicht, Naturverjüngung
- Nur bei Trupp/Gruppe/Horst aktiv (Dienerbaum-Konzept, Röhrig 2006)
- Ausgebleicht bei Einzelmischung, ausgeblendet im Plenterwald

#### Dienerbaum-Kopplung (NEU)
- Pro Förderbaumart: Diener-Arten zuweisen (Schattenbaumarten als Schaftpfleger)
- 10m-Buffer um Cluster-Rand (Distanz zum nächsten Förderbaum)
- Proportionale Verteilung mit Interleaving bei mehreren Diener-Arten
- Ring-Positionen exklusiv gesperrt (RESERVED-Marker)
- Dienerbäume auch innerhalb der Cluster als Unterschicht-Bonus
- Deckungsgrad-Warnung wenn < 90% im Ring

#### Multi-Mischungsform pro Art (NEU)
- Primäre + Overflow-Form gleichzeitig wählbar (z.B. Horst + Gruppe)
- Auto-Downgrade: Horst → Gruppe → Trupp → Einzel bei zu wenig Bäumen
- Überzählige-Warnung unterscheidet Budget vs. Platzproblem

#### Cluster-Platzierung verbessert (FIX)
- Farthest Point Sampling statt zufällig → gleichmässige Verteilung
- ±10% Variation für natürlichen Charakter
- Cluster-Kapazität: mittlere Kronenbreite (50% Endkrone) statt Maximum

#### Lichtbaumart-Endabstand Sonderregel (NEU)
- Lichtbaumarten (Ei, WFoe, Lae, Bi) bekommen mindestens ihren eigenen Endabstand
- Gilt nur für O-Bäume (Dienerbäume ausgenommen)
- Nur im Zeitstrahl (Z-Baum-Logik)

#### Totholz stehend & liegend (NEU)
- Toggle "Totholz": 3-5 stehende Snags + 5-8 liegende Logs
- 20 m³/ha Zielwert (NaiS Biodiversität)
- Mindestabstand 2m zu Oberschicht-Stämmen
- Liegendes Totholz unter Kronen, stehendes über Kronen

#### Habitatbäume pro Baumart (NEU)
- 🌳 Toggle pro Art: grösste Bäume dauerhaft geschützt
- Dendrohabitat-Score nach Bütler et al. (2020, WSL Merkblatt 64)
- Keine Ernte bei Hiebreife oder ZD (Überhälter)
- Grüner Ring + Spechtloch in Front-/Vogelansicht

#### Visuelle Verbesserungen
- 10m-Raster über Baumkronen (nicht darunter), Labels bold
- Stämme 1.5× BHD-Breite mit Verjüngung nach oben (Trapez)
- Export: Baumarten-Legende wird automatisch beigefügt
- Einzelmischung-Buchen-Block-Bug gefixt (Positionen geschuffelt)
- 2. Generation Timeline-Schritte für kurzlebige Arten (Birke)

## [2.1.0] — 2026-03-12

### Minor: Plenterwald-Rendering & Ernte-Ring Logik

#### ZD-Ernte-Ring Logik (FIX — kritisch)
- **hVar-Korrektur:** Ring-Projektion berücksichtigt jetzt die Höhenvarianz aus `genTrees()` — vorher stimmte die Vorhersage nicht mit der tatsächlichen Ernte überein
- **Alle-Schritte-Scan:** Statt nur den nächsten Schritt zu prüfen, werden alle zukünftigen Stepper-Schritte pro Baum durchsucht → erster Ernteschritt wird zuverlässig gefunden
- Ring erscheint genau einen Schritt vor der Ernte (verifiziert: 1–4 Ringe/Schritt bei 100 Bäumen)

#### Kraft'sche Schichtung — Visuelle Tiefenwirkung (NEU)
- Unterschicht (Schicht 1–3): Abdunkelungs-Overlay (`#1a2a10`, 18→6%) simuliert Beschattung, reduzierte Opazität und dünnere Strokes
- Oberschicht (Schicht 4–5): Grössere/dunklere Schatten (5–7%), stärkerer Lichtreflex (8–12%), kräftigere Konturen
- Visuelle Tiefenwirkung: Oberschicht dominiert, Unterschicht scheint gedämpft durch

#### Natürliche Kronenformen — Plenter-Modus (NEU)
- Hash-basiertes Pseudo-Noise statt sin-Wellen → Laubkronen "wolkig" statt sternförmig
- Schichtabhängige Differenzierung: unterdrückt = asymmetrisch/zerrissen, vorherrschend = voll/rund
- Nadelbäume: kompakter, schichtabhängige Verengung der Schattenkrone
- Weichere Catmull-Rom Tension (0.25 vs. 0.18) für rundere Kurven
- **Nur Plenter-Modus** — gleichförmiger Modus komplett unverändert

### Keine Breaking Changes
- Gleichförmiger Modus: identisch mit v2.0.0
- `crownTopN()` ohne 6. Parameter: verhält sich wie bisher

## [2.0.0] — 2026-03-12

### Major: Voronoi-basierte Z-Baum Architektur

#### Voronoi-basierte Z-Baum Konkurrenzlogik (NEU)
- Jeder Z-Baum erhält ein Voronoi-Feld: Nicht-Z-Bäume werden dem nächsten Z-Baum zugeordnet
- Durchforstung von innen nach aussen (FBB-konform)
- Artübergreifende Abstandsberechnung: `(Endabstand_A/2 + Endabstand_B/2)`
- Progressiver Kronenschluss nach Entnahme, begrenzt auf `ZB_ENDABSTAND`

#### Generationentrennung (NEU)
- 1. Generation (Bestandesbäume) und 2. Generation (VJ-Nachfolger) getrennt
- Beide Generationen durchlaufen identische Z-Baum-Logik

#### 6-Schichten SVG-Rendering (NEU)
- Erweitert von 4 auf 6 Schichten: Unter-Schirm-VJ, Konkurrenten 2.Gen, Z-Bäume 2.Gen, Konkurrenten 1.Gen, Z-Bäume 1.Gen, Z-Baum-Ringe

#### Differenzierte Konkurrenzlogik (NEU)
- Z-Baum vs. Z-Baum: 90%, Z-Baum vs. Konkurrent: 25%, Z-Baum vs. VJ: 0%
- Konsistente Zeitreihe unabhängig vom Z-Baum-Modus

#### Kronendeformation mit Z-Baum-Dominanz (NEU)
- 75/25 Dominanz-Split (Z-Baum nimmt 75% des Raums)
- Z-Bäume werden nicht durch VJ beeinflusst

#### Kronenwachstum begrenzt auf Endabstand (FIX)
- Z-Baum-Kronen werden auf artspezifischen `ZB_ENDABSTAND` begrenzt

## [1.0.1] — 2026-03-09

### Bug-Fixes
- Paar-Export: Vogelperspektive wird jetzt korrekt quadratisch (PW × PW) statt rechteckig (PW × PH) exportiert

## [1.0.0] — 2026-03-09

### Features
- 9 Baumarten mit artspezifischen Kronenformen (Front + Vogelperspektive)
- Zeitschiene mit SiWaWa-Wachstumskurven (0-140 Jahre)
- 5 Mischungsformen: Einzelmischung, Trupp, Gruppe, Horst, Untergeordnet
- Z-Baum-Logik basierend auf FBB-Produktionskonzept 2022
- Naturverjüngung ab Zielphase (gleichförmig) / ab 40J (Plenterwald)
- Voronoi-basiertes Kronenclipping in Vogelperspektive
- Raster-basierter Deckungsgrad (echte Bodenbedeckung)
- PNG-Export 300 DPI (Front, Vogel, Paar, Zeitreihe)
- Standalone HTML — keine Installation, kein Server nötig

### Bug-Fixes
- Horst-Mischung: Proportionale Cluster-Zuweisung stellt sicher, dass alle Baumarten erhalten bleiben
- Plenterwald-Dichtemodus: Density-Slider als Gleichgewichtsstammzahl nutzbar

### Datenquellen
- SiWaWa Wuchssimulator (ETH-Z/WSL)
- FBB Produktionskonzept (Burgergemeinde Bern 2022)
- NW-FVA Ertragstafeln (Albert et al. 2021, CC-BY 4.0)
- NaiS Schutzwald-Anforderungen (BAFU/WSL)

### Bekannte Einschränkungen
- Kronenformen Frontansicht noch schematisch (nicht fotorealistisch)
- Bergahorn-Wachstumskurven abgeleitet (keine SiWaWa-Originaldaten)
- Eiche/Föhre SiWaWa-Kurven nur für Extrembonitäten verfügbar
