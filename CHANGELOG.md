# Changelog

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
