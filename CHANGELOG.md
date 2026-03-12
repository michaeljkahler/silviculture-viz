# Changelog

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
