# Changelog

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
