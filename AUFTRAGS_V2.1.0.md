# Auftrag: GitHub Update auf V2.1.0

**Projekt:** Waldbau-Visualisierung (waldbau-viz)
**Von Version:** V2.0.0
**Auf Version:** V2.1.0 (Minor Release — Plenterwald-Erweiterungen)
**Datum:** 2026-03-12

---

## 1. Versionierung & Dateien

### 1.1 Neue Versionsdatei erstellen
- `waldbau-viz_v2.0.0.html` → kopieren als `waldbau-viz_v2.1.0.html`
- `index.html` mit dem Inhalt von `waldbau-viz_v2.1.0.html` aktualisieren (identisch)
- In beiden Dateien den Versions-String im Code aktualisieren: `v2.0.0` → `v2.1.0`

### 1.2 Savepoint erstellen
- `waldbau-viz_v2.1.0.html` → kopieren als `savepoint_14_v2.1.0_plenterwald_rendering.html`

### 1.3 Alte Versionen behalten
- `waldbau-viz_v2.0.0.html` bleibt als Referenz im Repo

---

## 2. Changelog V2.1.0

### 2.1 ZD-Ernte-Ring Logik (FIX — kritisch)
**Funktion:** Ring-Rendering in `renderBird()`

**Problem:** Die Ernte-Ringe (magenta) im Plenterwald-Modus wurden nicht angezeigt. Zwei Ursachen:

1. **Fehlende hVar-Korrektur:** In `genTrees()` wird die Baumhöhe mit `h = hdom(sp, indAge) * mt.hVar` berechnet, der BHD hängt davon ab. Die Ring-Projektion verwendete nur `hdom()` ohne die Höhenvarianz — dadurch stimmte die Vorhersage nicht mit der tatsächlichen Ernte überein.

2. **Nur Einschritt-Prüfung:** Der alte Code prüfte nur aktuellen vs. nächsten Stepper-Schritt. Bei langsam wachsenden Bäumen nahe der ZD-Schwelle reichte der BHD-Zuwachs in einem 8-Jahres-Schritt nicht aus, um die Schwelle zu überqueren.

**Lösung:**
- `hVar` wird aus den gespeicherten Baumeigenschaften rekonstruiert: `hVar = t.h / hdom(t.sp, t.indAge)`
- Für jeden Baum werden **alle zukünftigen Stepper-Schritte** gescannt, um den ersten Ernteschritt zu finden
- Ring erscheint genau einen Schritt vor der Ernte (Benutzeranforderung: "kontrolliere bei welchem Zeitschritt ein Baum ZD grösser 1 ist und setze den Ring auf den nächst früheren Schritt")

**Verifiziert:** Simulation bestätigt 1–4 Ringe pro Schritt bei 100 Bäumen (realistisch für Plenterdurchforstung).

---

### 2.2 Kraft'sche Schichtung — Visuelle Tiefenwirkung (NEU)
**Funktion:** `KRAFT_LAYERS` in `renderBird()`

**Änderung:** Die 5 Kraft'schen Schichten erhalten differenzierte Licht-/Schatteneffekte, die eine visuelle Tiefenwirkung erzeugen.

**Unterschicht (Schicht 1–3 — unterdrückt, unterständig, bedrängt):**
- `fillOp` reduziert (0.30 / 0.42 / 0.60) — Kronen wirken blasser, tiefer
- Neues **Abdunkelungs-Overlay** (`#1a2a10`, dunkles Waldgrün) über jeder Krone: 18% → 12% → 6% — simuliert Beschattung durch das Kronendach darüber
- Dünnere Strokes (0.04 / 0.06 / 0.09) — weniger visuelles Gewicht

**Oberschicht (Schicht 4–5 — mitherrschend, vorherrschend):**
- Schatten vergrössert und verstärkt: `shadowR` 0.90–0.95, Opazität 5–7%, grösserer Versatz (0.18m)
- Stärkerer **Lichtreflex**: 8% / 12% (statt einheitlich 6%), grösserer Radius (`cw/3.5`)
- Kräftigerer Stroke (0.14 / 0.18) — schärfere Kronenkontur

**Waldkundliche Referenz:** Kraft (1884), Leibundgut (1978), Schütz (2001): Soziale Stellung im Plenterwald.

---

### 2.3 Natürliche Kronenformen — Plenter-Modus (NEU)
**Funktion:** `crownTopN()` — 6. Parameter `kraftRel`, Hilfsfunktion `_crownHash()`

**Problem:** Die bisherigen sin-basierten Kronenmodulationen erzeugten bei Laubbäumen (Bu, Ei, Li) regelmässige 5–6-zackige Sternmuster — unrealistisch für natürliche Laubkronen.

**Lösung:** Neue Plenter-spezifische Kronenlogik (nur aktiv wenn `kraftRel`-Parameter übergeben wird — gleichförmiger Modus bleibt unverändert):

**Laubbäume — "wolkig statt sternig":**
- Hash-basiertes Pseudo-Noise (`_crownHash`) statt sin-Wellen — 3 überlagerte Frequenzen erzeugen natürliche Unregelmässigkeit
- Nur 1–2 niederfrequente Wellen als Grundform → breite Ausbeulung statt Zacken
- Noise-Amplitude schichtabhängig: vorherrschend ±3% (volle Krone) → unterdrückt ±9% (zerrissen)
- **Asymmetrie** für Unterschicht: unterdrückte Bäume wachsen einseitig zum Licht (`cos(a - Lichtrichtung)`, bis 8% Versatz)

**Nadelbäume — "kompakt, leicht unrund":**
- Weniger Noise (±2–6%) — behalten natürliche Symmetrie
- Schichtabhängige **Kompaktheit**: unterdrückte Nadelbäume bis 8% schmaler (Schattenkrone)

**Catmull-Rom Tension:**
- Plenter: 0.25 (weichere, rundere Kurven) vs. gleichförmig: 0.18 (unverändert)

| Kraft-Schicht | Laub-Charakter | Nadel-Charakter |
|---|---|---|
| unterdrückt | asymmetrisch, zerrissen, ±17% | schmal, kompakt, ±6% |
| bedrängt | leicht unregelmässig, ±10% | normal, ±4% |
| vorherrschend | voll, rund, sanft uneben, ±6% | voll, fast kreisrund, ±3% |

**Waldkundliche Referenz:** Schütz (2001, 2002): Kronenarchitektur im Plenterwald, Pretzsch (2009): Allometrische Beziehungen.

---

## 3. Technische Details

### 3.1 Neue Funktionen
| Funktion | Datei-Position | Beschreibung |
|---|---|---|
| `_crownHash(x, y)` | vor `crownTopN` | Deterministische Hash-Funktion für Pseudo-Noise |

### 3.2 Geänderte Funktionen
| Funktion | Art | Beschreibung |
|---|---|---|
| `crownTopN()` | Erweitert | 6. Parameter `kraftRel` für Plenter-Kronenform |
| `renderBird()` | Geändert | Ring-Logik komplett überarbeitet, Kraft-Layer-Parameter angepasst, `kraftRel` an `crownTopN` übergeben |

### 3.3 Geänderte Konstanten
| Konstante | Alt | Neu |
|---|---|---|
| `KRAFT_LAYERS[0].fillOp` | 0.40 | 0.30 |
| `KRAFT_LAYERS[0].shadeOp` | — | 0.18 (neu) |
| `KRAFT_LAYERS[4].shadow` | 0.045 | 0.07 |
| `KRAFT_LAYERS[4].lightOp` | — | 0.12 (neu) |
| *(vollständige Tabelle: siehe Code)* | | |

### 3.4 Keine Breaking Changes
- Gleichförmiger Modus: **komplett unverändert**
- `crownTopN` ohne 6. Parameter: verhält sich identisch wie v2.0.0
- Mischungsform-Warnungen: funktionieren in beiden Modi (keine Änderung)

---

## 4. Bekannte Einschränkungen

- Mischungsform-Warnungen im Plenterwald verwenden dieselben Schwellenwerte wie im gleichförmigen Modus — waldbaulich könnten diese für den Plenterwald angepasst werden (→ v3)
- Überführung gleichförmig → ungleichförmig noch nicht implementiert (→ v3)
- Kronenformen Frontansicht: noch keine schichtabhängige Differenzierung (nur Vogelperspektive)

---

## 5. Quellen

- Kraft, G. (1884): Beiträge zur Lehre von den Durchforstungen, Schlagstellungen und Lichtungshieben. Hannover.
- Leibundgut, H. (1978): Die Waldpflege. Bern: Haupt.
- Schütz, J.-P. (2001): Der Plenterwald und weitere Formen strukturierter und gemischter Wälder. Berlin: Parey.
- Schütz, J.-P. (2002): Silvicultural tools to develop irregular and diverse forest structures. Forestry 75(4).
- Pretzsch, H. (2009): Forest Dynamics, Growth and Yield. Berlin: Springer.
- De Liocourt, F. (1898): De l'aménagement des sapinières. Bulletin de la Société Forestière de Franche-Comté et Belfort.
- FBB Produktionskonzept (Burgergemeinde Bern, 2022).
