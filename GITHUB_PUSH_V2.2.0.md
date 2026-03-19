# GitHub Push: waldbau-viz v2.2.0

## Versionierung

### Dateien aktualisieren
```bash
# Im Repository-Verzeichnis:
cd waldbau-viz

# 1. Neue Versionsdatei (bereits erstellt)
# waldbau-viz_v2.2.0.html — Hauptdatei
# index.html — identisch mit v2.2.0 (Live-Version)

# 2. Savepoint erstellen
cp waldbau-viz_v2.2.0.html savepoint_15_v2.2.0_waldbau_werkzeuge.html
```

### Git-Befehle
```bash
# Alle geänderten Dateien stagen
git add waldbau-viz_v2.2.0.html
git add index.html
git add savepoint_15_v2.2.0_waldbau_werkzeuge.html
git add CHANGE_01_ZBaum_Proportional.md
git add CHANGE_02_Birke.md
git add CHANGE_03_Schicht_Toggles.md
git add CHANGE_04_Mischungsform_Prozent.md
git add CHANGE_05_Eiche_Endabstand.md
git add CHANGE_06_Totholz.md
git add CHANGE_07_Habitatbaeume.md
git add GITHUB_PUSH_V2.2.0.md

# Auch das Changelog im silviculture-viz Ordner
git add ../silviculture-viz/CHANGELOG.md

# Commit
git commit -m "v2.2.0: Waldbauliche Werkzeuge & Visualisierungs-Erweiterungen

Major Features:
- Z-Baum proportionale Verteilung mit Lichtbaum-Boost
- Birke (Betula pendula) als 11. Baumart
- Dienerbaum-Kopplung: Schaftpfleger im Ring um Förder-Cluster
- Multi-Mischungsform pro Art (Primär + Overflow)
- Schicht-Toggles [O][M][U][V] für Dienerbaum-Konzept
- Lichtbaumart-Endabstand Sonderregel (Ei, WFoe, Lae, Bi)
- Totholz stehend/liegend (20 m³/ha, NaiS)
- Habitatbäume pro Baumart (Bütler et al. 2020)
- Transekt-Breite Slider (5-15m)
- Stammzahl ↔ Kronengrösse dynamische Kopplung (Reineke 1933)

Fixes:
- Cluster-Platzierung: Farthest Point Sampling statt zufällig
- Buchen-Block-Bug: Restpool-Positionen geschuffelt
- Cluster-Kapazität: mittlere Kronenbreite statt Maximum
- 2. Generation Timeline für kurzlebige Arten

Visuelle Verbesserungen:
- Raster über Baumkronen, Labels bold
- Stämme 1.5× BHD mit Trapez-Verjüngung
- Export: Legende automatisch beigefügt
- Dienerbäume als Unterschicht-Bonus in Clustern

Waldbauliche Referenzen:
- FBB Produktionskonzept 2022
- NaiS 2024 (BAFU)
- Bütler et al. 2020 (WSL Merkblatt 64)
- Röhrig/Bartsch/von Lüpke 2006
- Schütz 2001, de Liocourt 1898
- Reineke 1933

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

# Push
git push origin main
```

## Änderungsübersicht v2.2.0

### Neue Funktionen (14)

| Nr | Feature | Modus | Beschreibung |
|---|---|---|---|
| 1 | Z-Baum proportional | Zeitstrahl | Verteilung nach Mischungsanteil, Lichtbaum +10%/+25% |
| 2 | Birke | Alle | 11. Baumart mit SiWaWa, FBB-Tabelle, Kronenform |
| 3 | Schicht-Toggles | Gleichförmig | [O][M][U][V] pro Art, nur bei Cluster-Mischungsformen |
| 4 | Dienerbaum-Kopplung | Beide | Ring um Cluster, proportional, exklusiv gesperrt |
| 5 | Multi-Mischungsform | Beide | Primär + Overflow gleichzeitig wählbar |
| 6 | Cluster Farthest Point | Beide | Gleichmässige Verteilung statt zufällig |
| 7 | Lichtbaumart-Endabstand | Zeitstrahl | Ei/WFoe/Lae/Bi: eigener Endabstand wenn > Durchschnitt |
| 8 | Totholz | Alle | 3-5 stehend + 5-8 liegend, 20 m³/ha |
| 9 | Habitatbäume | Alle | 🌳 pro Art, Dendrohabitat-Score, keine Ernte |
| 10 | Raster über Kronen | Vogel | 10m-Raster über Baumkronen, Labels bold |
| 11 | Export + Legende | Export | Baumarten-Legende im PNG beigefügt |
| 12 | Stämme dicker | Front | 1.5× BHD, Trapez-Verjüngung nach oben |
| 13 | Transekt-Slider | Alle | Breite 5-15m einstellbar |
| 14 | Stammzahl↔Kronen | Manuell | Dynamische Kopplung (Reineke 1933) |

### Warnungen (5 neue Typen)

| Warnung | Auslöser |
|---|---|
| ⚡ Mischungsform-Downgrade | Zu wenig Bäume für gewählte Form |
| ⚠ Überzählige Cluster-Bäume | Budget vs. Platzproblem differenziert |
| ⚡ Overflow-Nutzung | Primärform voll, Overflow aktiv |
| ⚠ Dienerbaum-Budget knapp | Ring-Positionen unbesetzt |
| ⚠ Diener-Deckungsgrad < 90% | Ring nicht ausreichend bestockt |

### Dateien

| Datei | Beschreibung |
|---|---|
| `waldbau-viz_v2.2.0.html` | Neue Version (Hauptdatei) |
| `index.html` | Live-Version (identisch mit v2.2.0) |
| `waldbau-viz_v2.0.0.html` | Arbeitsdatei (wird zu v2.2.0 umbenannt) |
| `CHANGE_01-07_*.md` | Änderungsspezifikationen |
| `GITHUB_PUSH_V2.2.0.md` | Dieses Dokument |

### Bekannte Einschränkungen
- Timeline-Modus laggt bei vielen Baumarten (Performance-Optimierung für v3)
- Stammzahl↔Kronen-Kopplung nur im manuellen Modus
- Überführung gleichförmig → ungleichförmig nicht implementiert (v3)
- Kronenformen Frontansicht: Birke noch schematisch
