# Änderungsauftrag v4 — Feature-Update v1.1.0

**Datum:** 12.03.2026
**Basis:** waldbau-viz_v1.0.1.html
**Zielversion:** v1.1.0 (Minor — neue Features, keine Breaking Changes)
**Quelle:** Nutzer-Feedback + Fachliche Anforderungen

---

## Übersicht

| # | Feature | Komplexität | Priorität |
|---|---------|------------|-----------|
| 1 | Linde (Tilia ssp.) als 10. Baumart | Mittel | Hoch |
| 2 | Individuelle Mischungsform pro Baumart | Mittel | Hoch |
| 3 | Naturverjüngung wächst im Zeitstrahl | Hoch | Hoch |

**Vorgehen:** Schrittweise implementieren und nach jedem Feature testen.

---

## Feature 1: Linde (Tilia ssp.) als 10. Baumart

### 1.1 Fachliche Grundlage

**Quellen:**
- Dendrologie Artenportraits (ETH Zürich, Rudow 2024): Tilia cordata + T. platyphyllos
- LWF Wissen 78 (Falk, Klemmt, Binder, Reger): Standort, Wachstum und waldbauliche Behandlung in Bayern
- Böckmann (1990): Wachstum und Ertrag der Winterlinde, Dissertation Göttingen
- FBB-Ableitung: Analog Buche/Bergahorn (keine FBB-Tabelle für Linde vorhanden)

**Eckdaten Linde (Li):**
- Oberhöhe Maximum: 36m (Bonität ~B22)
- Umtriebszeit: 110 Jahre
- Max. Alter im Modell: 150 Jahre
- Zieldurchmesser: 60 cm
- Z-Bäume Endbestand: 100/ha
- Endabstand Z-Bäume: 12m
- Schattentoleranz: hoch (wie Buche)
- Schattenerzeugung: hoch
- Dürreempfindlichkeit: gering (besser als Buche)

### 1.2 Wachstumskurve (SiWaWa-Ableitung)

Abgeleitet aus LWF-Abbildung 3 (Chapman-Richards, überdurchschnittliches Wachstum) und Vergleich mit Bu/BAh:

```
Alter:  [10,   20,   30,   40,   50,   60,   70,   80,   100,  120,  140]
Li:     [3.0,  8.5,  14.0, 18.5, 22.0, 25.0, 27.5, 29.5, 32.5, 34.5, 36.0]
```

Bonität-Zuordnung: `{ klasse: "B22", quelle: "LWF/Böckmann (abgeleitet)" }`

### 1.3 Betroffene Code-Stellen (~16 Änderungen)

#### A) Datenobjekte — Linde-Einträge hinzufügen

| # | Objekt/Stelle | Wert für Li | Bemerkung |
|---|--------------|-------------|-----------|
| 1 | `SPECIES` Array | `{ key:'Li', label:'Linde', color:'#8FBC8F', emoji:'🌳' }` | Farbe: DarkSeaGreen (Laubbaum, heller als Bu) |
| 2 | `SIWAWA_KURVEN.kurven.Li` | `[3.0, 8.5, 14.0, 18.5, 22.0, 25.0, 27.5, 29.5, 32.5, 34.5, 36.0]` | Wie oben abgeleitet |
| 3 | `SIWAWA_KURVEN.bonitaet_zuordnung.Li` | `{ klasse: "B22", quelle: "LWF/Böckmann" }` | — |
| 4 | `GROWTH_PARAMS.Li` | `{ hMax: 36, steepness: 0.022, inflection: 45 }` | Anpassung an Kurve nötig |
| 5 | `HIEBREIFE.Li` | `{ harvestAge: 110, maxAge: 150, zd_cm: 60, zbHa: 100 }` | LWF: 100–140, konservativ 110 |
| 6 | `FBB_ZB.Li` | `100` | Endbestand Z-Bäume |
| 7 | `FBB_EINGRIFFE.Li` | Siehe Tabelle unten | Abgeleitet von Bu/BAh |

**FBB_EINGRIFFE für Linde (abgeleitet):**
```javascript
"Li": [
  {"hdom":14, "bhdZB":14, "totalN":1800, "konZB":2.0, "entnahmeN":1500, "massnahme":"FE einlegen"},
  {"hdom":18, "bhdZB":20, "totalN":1400, "konZB":2.2, "entnahmeN":1100, "massnahme":"Z-Bäume bestimmen und fördern"},
  {"hdom":22, "bhdZB":26, "totalN":1000, "konZB":2.3, "entnahmeN":700,  "massnahme":"Z-Bäume fördern"},
  {"hdom":25, "bhdZB":32, "totalN":700,  "konZB":2.0, "entnahmeN":450,  "massnahme":"Z-Bäume fördern"},
  {"hdom":28, "bhdZB":40, "totalN":350,  "konZB":1.0, "entnahmeN":200,  "massnahme":"Z-Bäume fördern"},
  {"hdom":32, "bhdZB":50, "totalN":200,  "konZB":1.0, "entnahmeN":100,  "massnahme":"Letzte Durchforstung"},
  {"hdom":35,             "totalN":100,                                   "massnahme":"Verjüngungshiebe"}
]
```

#### B) Allometrische Funktionen

| # | Funktion/Stelle | Wert für Li | Bemerkung |
|---|----------------|-------------|-----------|
| 8 | `bhdFromH()` target | `60` cm | Zieldurchmesser |
| 9 | `crRatioBase.Li` | `0.55` | Breite Krone, ähnlich Bu (0.50) aber etwas breiter |
| 10 | `COMP` Matrix (als Akteur) | `{ Fi:0.6, Ta:0.7, Bu:0.9, Li:1.0, ... }` | Schattentoleranz hoch → starker Konkurrent gegen Licht-BA |
| 11 | `COMP` Matrix (als Nachbar) | In alle bestehenden Arten einfügen | Li als Nachbar: mittlere Bedrängung |
| 12 | `ZB_ENDABSTAND.Li` | `12` | Breite Krone |
| 13 | `ZB_ENDABSTAND` (Plenter) | `12` | — |

#### C) UI und Rendering

| # | Stelle | Änderung |
|---|--------|----------|
| 14 | `buildC()` auto-mix | Li in die Mischungslogik aufnehmen |
| 15 | `S.sp` Default | Li als wählbare Art im UI sicherstellen |
| 16 | Kronen-SVG Rendering | Li bekommt Laubbaum-Krone (rund, ähnlich Bu), Farbe `#8FBC8F` |

#### D) Stammzahltabelle

| # | Stelle | Wert |
|---|--------|------|
| 17 | `stammzahl_nha.Li` | `[[14,1800],[18,1400],[22,1000],[25,700],[28,350],[32,200],[35,100]]` |

---

## Feature 2: Individuelle Mischungsform pro Baumart

### 2.1 Fachlicher Hintergrund

Aktuell ist `S.mixPattern` ein einzelner String für den gesamten Bestand. Neu soll jede Baumart ihre eigene Mischungsform haben, z.B. Buche in Trupps + Fichte als Horst im selben Bestand.

### 2.2 Datenmodell-Änderung

**Alt:**
```javascript
S.mixPattern = 'trupp'  // global für alle Arten
```

**Neu:**
```javascript
S.mixPatterns = { Bu: 'trupp', Fi: 'horst', Ta: 'einzel', Li: 'untergeordnet', ... }
```

Fallback: Wenn eine Art keinen Eintrag hat → Default `'einzel'`.

### 2.3 UI-Änderung

Pro Baumart-Zeile (wo bereits Anteil-Slider + Checkbox steht) kommt ein kompaktes **Icon-System** mit 5 Icons:

| Icon | Pattern | Tooltip |
|------|---------|---------|
| `·` (Punkt) | einzel | Einzelmischung |
| `⁘` (4 Punkte) | trupp | Truppweise (~12m) |
| `◎` (Kreis) | gruppe | Gruppenweise (~18m) |
| `◉` (gefüllter Kreis) | horst | Horstweise (~30m) |
| `↓` (Pfeil) | untergeordnet | Untergeordnete Mischung |

- Icons als kleine Buttons nebeneinander in der Baumart-Zeile
- Aktives Pattern wird hervorgehoben (z.B. farbig/bold)
- Nur anklickbar wenn die Baumart aktiv ist (Anteil > 0%)

### 2.4 Betroffene Code-Stellen

| # | Stelle | Änderung |
|---|--------|----------|
| 1 | `S.mixPattern` → `S.mixPatterns` | Von String zu Object |
| 2 | HTML: Baumart-Zeilen | Pro Zeile 5 Icon-Buttons hinzufügen |
| 3 | `setMixPattern()` | Refactor: nimmt jetzt `(species, pattern)` als Parameter |
| 4 | `genTimelineMaster()` Clustering | Pro Baumart eigenen Pattern lesen bei Positionierung |
| 5 | `genTrees()` manueller Modus | Pro Baumart eigenen Pattern lesen |
| 6 | `_masterKey` | Muss alle per-species Patterns serialisieren für Cache-Invalidierung |
| 7 | Globaler Mix-Button (oben) | Optional beibehalten als "Alle auf X setzen"-Shortcut |
| 8 | `untergeordnet`-Logik | Wenn Art X = 'untergeordnet' → diese Art ist der untergeordnete Partner (ageOffset -40% bis -70%) |

### 2.5 Logik-Detail: Untergeordnete Mischung per Art

Wenn `S.mixPatterns.Ta = 'untergeordnet'`, dann:
- Tanne wird **räumlich zufällig** verteilt (wie Einzelmischung)
- Tanne bekommt **ageOffset** -40% bis -70% → jünger/kleiner
- Alle anderen Arten behalten ihre eigene Mischungsform

Mehrere Arten gleichzeitig als "untergeordnet" ist möglich (z.B. Ta + Li untergeordnet, Bu + Fi als Horst).

---

## Feature 3: Naturverjüngung wächst im Zeitstrahl

### 3.1 Fachlicher Hintergrund

Aktuell werden VJ-Bäume bei jedem Zeitschritt frisch generiert mit zufälliger Höhe (0.3–6.0m). Sie sind NICHT in `_masterTrees` gespeichert und haben kein `indAge`. Der Wald "wächst nicht nach".

**Soll:** VJ entsteht erst ab `vjStart` (wenn erste Bäume Hiebreife erreichen). VJ-Kohorten wachsen über die Zeit und bilden natürlichen Nachwuchs.

### 3.2 VJ-Entstehungslogik (neu)

1. **Zeitpunkt:** VJ beginnt ab `vjStart` (berechnet aus Hiebreife der frühesten Art)
2. **Ort:** Nur in Bestandeslücken (kein Kronenschirm) + **15% zufällig unter Schirm** (Schattenbaumarten)
3. **Schattenbaumarten** (VJ unter Schirm möglich): Bu, Ta, Fi, Li, BAh
4. **Lichtbaumarten** (nur in Lücken): Ei, WFoe, Lae, Es, Dou
5. **Art der VJ:** Gleiche Artenmischung wie Hauptbestand (proportional zu `S.sp`)

### 3.3 Persistenz in _masterTrees

VJ-Bäume werden einmalig generiert und in `_masterTrees` gespeichert:

```javascript
{
  sp: 'Bu',
  x: 23.5,
  y: 41.2,
  birthAge: 60,        // Bestandesalter bei Entstehung
  isVerjuengung: true,  // Flag für VJ
  // indAge wird berechnet: currentAge - birthAge
}
```

### 3.4 Wachstumsberechnung VJ

Bei Bestandesalter X hat ein VJ-Baum (geboren bei Alter Y):
```
vjIndAge = X - Y
h = hdom(sp, vjIndAge) * 0.70   // 70% Reduktion wegen Beschattung
bhd = bhdFromH(sp, h)
crown = crownFromBHD(sp, bhd, h)
```

Der Reduktionsfaktor 0.70 berücksichtigt, dass VJ unter Schirm langsamer wächst. Für VJ in Lücken könnte der Faktor höher sein (0.85).

### 3.5 Kohorten-Management

- **Pro PHASE_SNAP-Stufe** (ab vjStart): Neue VJ-Kohorte generieren
- **Kohorte = Set von VJ-Bäumen** mit gleichem `birthAge`
- Bei jedem Zeitschritt: Alle bisherigen Kohorten darstellen mit berechnetem Wachstum
- **Übergang VJ → Bestandesbaum:** Ab h > 8m (hdom) wird `isVerjuengung` auf `false` gesetzt → normaler Baum
- **Konkurrenz:** VJ-Bäume < 5m Höhe nehmen nicht an Konkurrenzberechnung teil, darüber schon

### 3.6 Betroffene Code-Stellen

| # | Stelle | Änderung |
|---|--------|----------|
| 1 | `_masterTrees` Struktur | VJ-Bäume mit `birthAge`, `isVerjuengung` aufnehmen |
| 2 | `genTimelineMaster()` | VJ-Kohorten pro PHASE_SNAP generieren und speichern |
| 3 | VJ-Generierung (aktuell in `genTrees()` ~Zeile 1596) | Umbauen: Lückenerkennung + Schirmcheck + persistente Speicherung |
| 4 | Wachstumsberechnung Timeline | VJ-Bäume: `indAge = currentAge - birthAge`, dann `hdom()` mit Reduktionsfaktor |
| 5 | Rendering | VJ-Bäume < 1.3m: weiterhin kleines Symbol; > 1.3m: normale Kronendarstellung |
| 6 | Lückenerkennung | Spatial-Hash nutzen: Prüfe ob Position unter Kronenschirm liegt |
| 7 | Manueller Modus | VJ bleibt wie bisher (frisch generiert, keine Persistenz nötig) |

### 3.7 Abgrenzung

- **Manueller Modus:** VJ bleibt unverändert (frisch generiert pro Render, kein Wachstum)
- **Timeline-Modus:** VJ wird persistent, wächst, bildet Kohorten
- **Export:** VJ-Bäume erscheinen in Timeline-Export wie gewohnt

---

## Implementierungsreihenfolge

1. **Feature 1 (Linde)** → Testen
2. **Feature 2 (Per-Species Mixing)** → Testen
3. **Feature 3 (VJ-Wachstum)** → Testen
4. Gesamttest + Versionierung → v1.1.0

---

## Versionierung

- **v1.0.1** → v1.1.0 (Minor Version: neue Features, rückwärtskompatibel)
- Dateien:
  - `waldbau-viz_v1.1.0.html` — Neue Version
  - `index.html` — Wird auf v1.1.0 aktualisiert
  - `waldbau-viz_v1.0.1.html` — Bleibt als Snapshot erhalten
