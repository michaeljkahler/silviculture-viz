# Waldbau Zielmischungstyp Visualisierungstool

> Browserbasiertes Tool zur Visualisierung waldbaulicher Zielmischungstypen
> mit Frontansicht (Bestandesprofil) und Vogelperspektive (Kronenprojektionsplan).

## Features

- **Frontansicht** — Massstabsgetreues Bestandesprofil mit artspezifischen Kronenformen
- **Vogelperspektive** — Kronenprojektionsplan mit Voronoi-basiertem Kronenclipping
- **9 Baumarten** — Buche, Weisstanne, Fichte, Eiche, Bergahorn, Waldföhre, Lärche, Esche, Douglasie
- **Zeitschiene** — Bestandesentwicklung über Alter (SiWaWa-Wachstumskurven)
- **Mischungsformen** — Einzelmischung, Trupp, Gruppe, Horst, Untergeordnet
- **Z-Baum-Logik** — Zukunftsbäume basierend auf FBB-Produktionskonzept
- **Naturverjüngung** — Simulation der natürlichen Erneuerung
- **Export** — 300 DPI PNG für Druck (A3-Panelgrösse)

## Demo

> [Live Demo](https://michaeljkahler.github.io/silviculture-viz/)

## Verwendung

Einfach `index.html` im Browser öffnen. Keine Installation, kein Server, keine Dependencies.

### Modulare Version

Die modulare Version unter `src/index.html` lädt die JavaScript-Module einzeln.
Diese erfordert einen lokalen Webserver (z.B. `python -m http.server` oder VS Code Live Server).

## Waldbauliche Datenquellen

Siehe [docs/SOURCES.md](docs/SOURCES.md) für vollständige Quellenangaben.

| Datensatz | Quelle | Lizenz |
|-----------|--------|--------|
| SiWaWa Wachstumskurven | ETH Zürich / WSL | Digitalisierung aus Lehrmaterial |
| FBB Produktionskonzept | Forstbetrieb Burgergemeinde Bern 2022 | Dokumentiert |
| CH-Ertragstafeln | NW-FVA 2021 (Albert et al.), Schober 1995, Badoux 1967/68 | CC-BY 4.0 (NW-FVA) |
| NaiS-Anforderungen | BAFU / WSL | Öffentlich |
| Bergahorn Allometrie | Röhle et al. 2009, Lockow 2003 | Wissenschaftliche Publikationen |

## Kontext

Entwickelt im Rahmen der Projektarbeit BLFw426 "Waldbaukonzepte erarbeiten, veranschaulichen
und Erfolgskontrolle einrichten" an der [HAFL](https://www.bfh.ch/hafl/)
(Hochschule für Agrar-, Forst- und Lebensmittelwissenschaften),
Berner Fachhochschule, 2026.

## Lizenz

MIT — siehe [LICENSE](LICENSE)
