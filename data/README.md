# Waldbauliche Datenquellen

Dieses Verzeichnis enthält die waldbaulichen Referenzdaten im JSON-Format.

## Dateien

| Datei | Inhalt | Quelle |
|-------|--------|--------|
| `siwawa_kurven.json` | Oberhöhen-Wachstumskurven (hdom über Alter) | SiWaWa (ETH-Z/WSL) |
| `fbb_produktionskonzept.json` | Stammzahltabellen, Eingriffspläne, Z-Baum-Daten | FBB Bern 2022 |

## Nutzung

Die Daten werden im JavaScript-Code inline verwendet (standalone `index.html`).
Die JSON-Dateien dienen als Referenz und für eventuelle externe Nutzung.

## Lizenzen

- **SiWaWa-Daten**: Digitalisierung aus öffentlich verfügbarem Lehrmaterial (ETH-Z/WSL)
- **FBB-Daten**: Digitalisiert aus internem Planungsdokument, Verwendung im Bildungskontext
- **NW-FVA Ertragstafeln**: CC-BY 4.0 (Albert et al. 2021, DOI: 10.5281/zenodo.6343906)

Siehe [../docs/SOURCES.md](../docs/SOURCES.md) für vollständige Quellenangaben.
