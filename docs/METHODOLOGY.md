# Berechnungsmethodik

Technische Dokumentation der Algorithmen und Berechnungsverfahren in `silviculture-viz`.

---

## 1. Zufallsgenerator (Seeded Random)

Die Visualisierung verwendet den **Mulberry32**-Algorithmus als Pseudo-Zufallszahlengenerator (PRNG). Er erzeugt bei gleichem Seed identische Zahlenfolgen, sodass Bestandesbilder reproduzierbar sind.

**Algorithmus** (`mR(seed)`):

```
s = s + 0x6D2B79F5  (32-Bit Addition mit Overflow)
t = imul(s XOR (s >>> 15), 1 | s)
t = t + imul(t XOR (t >>> 7), 61 | t) XOR t
return (t XOR (t >>> 14)) >>> 0) / 2^32
```

- Ausgabe: Gleichverteilte Werte im Intervall [0, 1)
- 32-Bit Zustandsraum, ca. 2^32 Periodenlange
- Alle stochastischen Prozesse (Positionen, Artzuordnung, Variationen) laufen uber denselben `rng`-Strom, sodass eine Seed-Anderung den gesamten Bestand konsistent verandert.

Eine Hilfsfunktion `W(j, f, a) = sin(j * f) * a` erzeugt Wellenform-Modulationen fur organische Variationen in Kronenformen.

---

## 2. Baumgenerierung (Master-Population)

### 2.1 Zeitschienen-Modus (Master-Population)

Fur die Bestandesentwicklung uber die Zeit wird eine **persistente Master-Population** erzeugt (`genTimelineMaster`). Alle Altersstufen verwenden dieselben Baumpositionen; bei zunehmendem Alter werden weniger Baume angezeigt (Mortalitat), die verbleibenden stehen aber immer an denselben Koordinaten.

**Positionierung: Gejittertes Hexagonalgitter**

- Maximale Stammzahl: 2400 N/ha
- Hexagonaler Grundabstand: `spacing = sqrt(Flache * 2 / (maxN * sqrt(3)))`
- Jitter: +/-18% des Grundabstands (gleichverteilt)
- Rand-Puffer: 2 m zu jedem Plotrand
- Uberzahlige Punkte werden zufallig entfernt bis maxN erreicht ist

**Spatially Stratified Survival**

Der Survival-Rang bestimmt, welche Baume bei geringerer Stammzahl uberleben. Er wird **nicht** zufallig vergeben, sondern **raumlich geschichtet** uber rekursive Zellebenen:

1. Zellgitter-Ebenen: 5x5, 10x10, 15x15, 20x20, 30x30, 40x40 Zellen
2. Pro Ebene und pro Zelle wird genau ein noch nicht zugewiesener Baum ausgewahlt
3. Die Auswahl-Reihenfolge (Zellen-Shuffle + Zufallswahl innerhalb der Zelle) bestimmt den Rang
4. Restliche Baume erhalten zufallige Nachrange

**Effekt:** Bei jeder Stammzahl N sind die N uberlebenden Baume raumlich gleichmassig verteilt. Dadurch entspricht der Raster-Deckungsgrad dem wahren Deckungsgrad (minimale Kronenlappung).

### 2.2 Manueller Modus (Klassisch)

Im manuellen Modus (ohne Zeitschiene) werden Baumpositionen per Rejection-Sampling erzeugt:

- Bis zu 120 Versuche pro Baum
- Mindestabstand: `max((cw_i/2 + cw_j/2) * 0.4, 1.5 m)`
- Plotbereich: 4-96 m (4 m Randpuffer bei 100 m Plot)

### 2.3 Grossenvariation

- **Gleichformiger Modus:** Skalierungsfaktor sf = 0.82 + rng * 0.18
- **Ungleichformiger Modus (Plenterwald):** Funf Grossenklassen mit Wahrscheinlichkeiten 18/20/20/20/22%, sf-Bereiche von 0.15-0.30 (Jungwuchs) bis 0.88-1.00 (starkes Baumholz)

### 2.4 Individuelle Variation (Timeline)

Jeder Master-Baum erhalt persistente Variationskoeffizienten:

| Parameter  | Bereich          | Beschreibung                    |
|------------|------------------|---------------------------------|
| `hVar`     | 0.90 - 1.10      | Hohenvariations-Faktor          |
| `cwVar`    | 0.85 - 1.15      | Kronenbreiten-Variation         |
| `klVar`    | 0.90 - 1.10      | Kronenlangen-Variation          |
| `ageOffset`| -0.15 bis +0.15  | Altersvariation (gleichformig)  |
| `ageOffset`| -0.70 bis -0.40  | Altersvariation (untergeordnet, Nebenart) |

### 2.5 Plenterwald (Ungleichaltriger Bestand)

Im Plenterwald erhalt jeder Baum ein individuelles Alter basierend auf seinem Survival-Rang:

```
relRank = i / (nSurvive - 1)       // 0 = altester, 1 = jungster
ageFrac = (1 - relRank)^0.6        // Exponentiell: viele junge Baume
indAge  = ageRange * ageFrac * (0.9 + ageOffset * 0.4)
```

Die exponentielle Verteilung (Exponent 0.6) erzeugt die fur den Plenterwald typische Inverse-J-Durchmesserverteilung (viele kleine, wenige grosse Baume, vgl. Schutz 2002).

Kronenlange wird schichtabhangig angepasst:
- Unterschicht (h < 10 m): kl * 0.55
- Mittelschicht (10-25 m): linear von 0.55 auf 1.0
- Oberschicht (h > 25 m): unverandert

---

## 3. Allometrische Beziehungen

### 3.1 Oberhohenkurven: hdom(Art, Alter)

Primare Datenquelle: **SiWaWa-Wuchssimulator** (ETH Zurich / WSL), manuell digitalisiert.

Stutzpunkte bei Alter [10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 140] Jahren. Bonitat = hdom im Referenzalter 50 (SiWaWa-Konvention).

| Art  | Bonitat | hdom(50) | hdom(100) | hdom(140) |
|------|---------|----------|-----------|-----------|
| Bu   | B24     | 23.0 m   | 36.0 m    | 41.0 m    |
| Ta   | B28     | 26.0 m   | 42.0 m    | 47.0 m    |
| Fi   | B28     | 28.0 m   | 45.0 m    | 50.0 m    |
| BAh  | B22     | 22.0 m   | 32.0 m    | 34.5 m    |
| Ei   | B25     | 24.0 m   | 38.5 m    | 43.5 m    |
| WFoe | B26     | 26.0 m   | 37.0 m    | 40.5 m    |
| Lae  | B28     | 28.0 m   | 41.5 m    | 45.0 m    |
| Es   | B28     | 28.0 m   | 40.0 m    | 43.5 m    |
| Dou  | B34     | 34.0 m   | 47.5 m    | 51.0 m    |

**Interpolation:**
- **10-140 J:** Lineare Interpolation zwischen Stutzpunkten
- **< 10 J:** Kubische Extrapolation durch (0,0): `h = h10 * t^2 * (3 - 2*t)`, wobei t = age/10. Erzeugt Hermite-Spline mit Steigung 0 bei t=0.
- **> 140 J:** Logarithmische Fortschreibung: `h = hLast + rate * extra * exp(-extra * 0.02)`. Die jahrliche Rate wird aus dem letzten Intervall berechnet und flacht exponentiell ab.

### 3.2 BHD aus Hohe: bhdFromH(Art, h)

Allometrische Potenzfunktion, kalibriert auf artspezifische Zielwerte aus dem FBB-Produktionskonzept 2022:

```
BHD = bhdRef * (h / hRef)^exp
```

| Art  | hRef (m) | bhdRef (cm) | Exponent |
|------|----------|-------------|----------|
| Bu   | 36.0     | 60          | 1.3      |
| Ta   | 42.0     | 60          | 1.3      |
| Fi   | 45.0     | 60          | 1.3      |
| BAh  | 32.0     | 60          | 1.3      |
| Ei   | 38.5     | 70          | 1.5      |
| WFoe | 37.0     | 80          | 1.5      |
| Lae  | 41.5     | 80          | 1.3      |
| Es   | 40.0     | 60          | 1.3      |
| Dou  | 47.5     | 70          | 1.3      |

Weicher Ubergang fur Jungbaume: Bei h < 3.0 m wird BHD quadratisch geblendet (`blend = ((h - 0.5) / 2.5)^2`), bei h <= 0.5 m ist BHD = 0.

### 3.3 Krone aus BHD: crownFromBHD(Art, BHD, h)

**Kronenbreite** nach Pretzsch (2009):

```
cw = 2 * k_cr * BHD^0.5
```

Artspezifische Koeffizienten k_cr:

| Art  | k_cr | Beispiel cw bei BHD 50 cm |
|------|------|---------------------------|
| Bu   | 0.85 | 12.0 m                    |
| Ta   | 0.57 | 8.1 m                     |
| Fi   | 0.43 | 6.1 m                     |
| BAh  | 0.79 | 11.2 m                    |
| Ei   | 0.95 | 13.4 m                    |
| WFoe | 0.63 | 8.9 m                     |
| Lae  | 0.55 | 7.8 m                     |
| Es   | 0.71 | 10.0 m                    |
| Dou  | 0.50 | 7.1 m                     |

**Kronenverhaltnis** (Kronenlange / Baumhohe):

```
crRatio = 0.85 - (0.85 - baseRatio) * (h / hRef)^0.7
```

Jung (h << hRef): crRatio -> 85%. Alt (h = hRef): crRatio -> baseRatio (artspezifisch, z.B. Bu=50%, Fi=33%, WFoe=30%). hRef wird als hdom beim Hiebreife-Alter berechnet.

---

## 4. Voronoi-Kronenclipping (Vogelperspektive)

Die Funktion `computeBR` berechnet richtungsabhangige Kronenradien, um in der Vogelperspektive realistische, nicht-uberlappende Kronenprojektionen zu erzeugen.

### 4.1 Algorithmus

Fur jeden Baum werden **36 Winkelsegmente** (je 10 Grad) betrachtet:

1. Initialisierung: Alle 36 Radien = cw/2 (naturlicher Kronenradius)
2. Fur jedes Baumpaar (i, j) mit uberlappenden Kronen (`dist < r_i + r_j`):
   - Winkel zum Nachbarn: `na = atan2(dy, dx)`
   - Proportionaler Teilungspunkt: `myShare = r_i / (r_i + r_j)`
   - Maximaler Radius in Richtung des Nachbarn: `maxR = dist * myShare - 0.08`
3. Fur jedes Segment a mit Winkeldifferenz diff < 0.55*pi zum Nachbarn:
   - Einflussfaktor: `inf = cos(diff / 0.55 * pi/2)` (Kosinus-Gewichtung)
   - Geclippter Radius: `cR = r * (1 - inf) + maxR * inf`
   - Neuer Radius: `min(bisheriger Radius, max(cR, 0.2))`

**Effekt:** Kronen werden proportional zu ihren Radien aufgeteilt. Die Kosinus-Gewichtung erzeugt weiche Ubergange; das Clipping betrifft nur die dem Nachbarn zugewandte Seite der Krone.

### 4.2 Artspezifische Formmodulation

Die Funktion `crownTopN` erzeugt aus den 36 Radien einen SVG-Pfad mit Catmull-Rom-Splines. Jeder Radius wird mit einem artspezifischen Modulator skaliert:

| Kronentyp   | Arten     | Formel                                         |
|-------------|-----------|-------------------------------------------------|
| `dome`      | Bu        | 0.94 + 0.06*sin(3a+j) + 0.03*sin(6a+1.5j)     |
| `layered`   | Ta        | 0.92 + 0.08*cos^2(2a+j)                        |
| `spire`     | Fi, Dou   | 0.88 + 0.04*sin(5a+j)                          |
| `spreading` | Ei        | 0.92 + 0.08*sin(2a+j) + 0.05*sin(5a+2j)       |
| `round`     | BAh       | 0.96 + 0.04*sin(3a+j)                          |
| `umbrella`  | WFoe      | 0.90 + 0.10*|cos(a+0.3j)|                      |
| `lightcone` | Lae       | 0.92 + 0.08*sin(3a+j)                          |
| `vase`      | Es        | 0.92 + 0.08*cos(2a+j)                          |

Die Spline-Tangenten werden mit Faktor 0.18 berechnet (Catmull-Rom, tension ~0.64), was glatte, organisch wirkende Kronenrander erzeugt.

---

## 5. Raster-Deckungsgrad

Der Deckungsgrad wird **nicht** aus aufsummierten Kronenflachen berechnet (was Uberlappungen doppelt zahlen wurde), sondern per **Raster-Verfahren** mit 0.5 m Auflosung.

### Algorithmus (`calcSt`)

1. Erzeuge ein Uint8-Array der Grosse (PLOT/0.5)^2 = 200x200 = 40'000 Zellen
2. Fur jeden Baum: Iteriere uber alle Rasterzellen im Bounding-Box der Krone
3. Kreistest: `(dx^2 + dy^2) <= r^2` wobei dx, dy = Abstand Zellmittelpunkt zu Baumposition
4. Zelle wird als bedeckt markiert (Bitflag, keine Doppelzahlung)
5. Deckungsgrad = Anzahl bedeckte Zellen / Gesamtzahl Zellen * 100%

Bei PLOT=100 m und 0.5 m Auflosung reprasentiert jede Zelle 0.25 m^2.

### Weitere Statistiken

- **Grundflache:** `G = Summe(pi * (BHD/200)^2)` in m^2/ha
- **Derbholzvorrat:** Einzelbaum-Tariffunktion `v = exp(b0 + b1*ln(d) + b2*ln(h))` mit artspezifischen Koeffizienten nach Franz et al. (1973), Grundner & Schwappach (1952). Hochrechnung auf Hektar.
- **Vertikaler Deckungsgrad:** Dreischichtmodell (U: <=10 m, M: 10-25 m, O: >25 m). VDG = besetzte Schichten / 3 * 100%.

---

## 6. Konkurrenz-Interaktion

### Spatial-Hash-Optimierung

Um O(n^2)-Paarvergleiche zu vermeiden, wird ein **raumliches Gitter** (Spatial Hash) mit 15 m Zellgrosse verwendet:

1. Alle Baume werden in Zellen des 15 m-Gitters einsortiert (7x7 Zellen bei 100 m Plot)
2. Fur jeden Baum (h >= 5 m) werden nur Nachbarn in der eigenen + 8 angrenzenden Zellen gepruft

### Konkurrenz-Berechnung

Ein Nachbar j erzeugt Konkurrenzdruck auf Baum i wenn:
- Abstand < 1.5 * mittlere Kronenreichweite: `dist < (cw_i + cw_j) / 2 * 1.5`
- Nachbar mindestens 70% so hoch: `h_j >= h_i * 0.7`

Der Druck pro Nachbar ist:

```
pressure_j = COMP[art_j] * (1 - dist / (reach * 1.5))
```

Artspezifische Konkurrenzkraft (COMP):

| Art  | Bu  | Ta  | Fi  | BAh | Ei  | WFoe | Lae | Es  | Dou |
|------|-----|-----|-----|-----|-----|------|-----|-----|-----|
| COMP | 2.0 | 1.5 | 1.0 | 1.5 | 1.8 | 0.8  | 0.7 | 1.3 | 1.2 |

**Kronenreduktion:**

```
cw_neu = cw * (1 - min(0.15, Summe(pressure) * 0.03))
```

Maximale Reduktion: 15%. Dies modelliert die Kronenverschmalerung unter Konkurrenzdruck, ohne die Baumposition zu verandern.

---

## 7. Zeitschiene

### 7.1 Stammzahlentwicklung: nHa(Alter)

Die Stammzahl pro Hektar wird aus den **FBB-Produktionskonzept-Tabellen** (Forstbetrieb Burgergemeinde Bern, 2022) interpoliert. Diese Tabellen geben fur jede Art die Stammzahl vor Eingriff als Funktion der Oberhohe an:

```
Alter -> hdom(Art, Alter) -> FBB-Tabelle -> N/ha
```

Fur mehrere aktive Arten wird der gewichtete Mittelwert nach Flachenanteil berechnet.

Beispiel Fichte (Fi): hdom 12m -> 2400 N/ha, hdom 20m -> 1000 N/ha, hdom 34m -> 200 N/ha.

**Plenterwald:** Quasi-konstante Stammzahl von 500 N/ha ab Alter 20 (Gleichgewicht nach Schutz 2002).

### 7.2 Waldbauliche Phasen

| Phase            | Alter     | Beschreibung                                      |
|------------------|-----------|---------------------------------------------------|
| Qualifizierung   | 0-20 J    | Jungwuchs/Dickung, Stammzahlreduktion, Z-Baumwahl |
| Dimensionierung  | 20-80 J   | Kronenfreistellung, Durchmesserwachstum fordern    |
| Zielvorstellung  | 80-120 J  | Zieldurchmesser erreicht, Verjungungseinleitung    |

### 7.3 Hiebreife und Ernte

Artspezifische Umtriebszeiten und Zieldurchmesser aus dem FBB-Produktionskonzept:

| Art  | Umtrieb (J) | Max-Alter (J) | Ziel-BHD (cm) | Z-Baume/ha |
|------|-------------|----------------|----------------|------------|
| Bu   | 100         | 140            | 60             | 100        |
| Ta   | 60          | 100            | 60             | 200        |
| Fi   | 60          | 80             | 60             | 200        |
| BAh  | 80          | 120            | 60             | 80         |
| Ei   | 110         | 160            | 70             | 50         |
| WFoe | 120         | 160            | 80             | 100        |
| Lae  | 120         | 160            | 80             | 100        |
| Es   | 80          | 120            | 60             | 80         |
| Dou  | 80          | 120            | 70             | 150        |

Baume mit `indAge > harvestAge + 8` werden geerntet. Im Plenterwald werden sie durch Jungbaume (Alter 1-10 J) am selben Standort ersetzt (Dauerwaldprinzip).

### 7.4 Naturverjungung

Ab einem artspezifischen Alter (`min(harvestAge) - 20`, Plenterwald ab 40 J) wird Naturverjungung generiert:

- Eigener Seed: `S.seed + 7777` (deterministisch, unabhangig von Master-Population)
- Intensitat steigt uber 30 Jahre von 0 auf Maximum (bis 200 im Plenter, 350 im Gleichformigen)
- Platzierung nur in Kronenlucken (Abstand > cw * 0.5 zu Altbaumen)
- Hohe: 0.3-6.0 m, Kronenbreite ~35% der Hohe

### 7.5 Z-Baum-Markierung

Z-Baume (Zukunftsbaume) werden persistent auf der Master-Population markiert:

1. Kandidaten werden nach Survival-Rank sortiert (niedrigster = starkster/grosster)
2. Pro Art werden proportional zur Flache Z-Baume ausgewahlt (Ziel: FBB_ZB-Werte)
3. **Mindestabstandsregel:** Kein Z-Baum innerhalb des artspezifischen Endabstands (z.B. Bu: 11 m, Fi: 8 m, Ei: 15 m) eines bereits markierten Z-Baums

---

## 8. Mischungsformen

Die Artzuordnung der Baume zu Positionen erfolgt je nach gewahltem Mischungsmuster:

### 8.1 Einzelmischung (`einzel`)

Baume werden proportional zu den eingestellten Artanteilen erzeugt und per **Fisher-Yates-Shuffle** zufallig auf die Positionen verteilt. Ergibt eine raumlich gleichmassige, stammweise Durchmischung.

### 8.2 Untergeordnete Mischung (`untergeordnet`)

Die Hauptbaumart (hochster Flachenanteil) dominiert die Oberschicht, Nebenbaumarten wachsen in der Unterschicht:

- Raumlich zufallig verteilt (wie Einzelmischung)
- Nebenbaumarten erhalten einen **Age-Offset** von -40% bis -70%, sodass sie bei gleichem Bestandesalter deutlich kleiner/junger sind und naturlich in der Unterschicht wachsen

### 8.3 Trupp / Gruppe / Horst (Cluster-Mischung)

Clustered-Mischung uber einen **Voronoi-artigen Nearest-Neighbor-Ansatz**:

1. **Cluster-Zentren** werden zufallig auf der Flache verteilt. Ihre Anzahl ergibt sich aus:
   ```
   nClusters = max(Anzahl Arten, round(PLOT^2 / (pi * clusterR^2)))
   ```
2. Jedes Zentrum erhalt eine Baumart, zufallig gewahlt proportional zum Flachenanteil
3. Jeder Baum wird der Art des **nachstgelegenen Cluster-Zentrums** zugewiesen (Nearest-Neighbor = Voronoi-Zelle)

Cluster-Radien (orientiert an Schutz 2003, BLFw426):

| Mischungsform | Cluster-Radius | Beschreibung                           |
|---------------|----------------|----------------------------------------|
| Trupp         | 12 m           | Kleine Gruppen, <=5 Aren (~3-5 Baume)  |
| Gruppe        | 18 m           | Mittlere Cluster, 5-10 Aren            |
| Horst         | 30 m           | Grosse Cluster, 10-50 Aren (>20 Baume) |

Die Cluster-Anzahl ist so gewahlt, dass die mittlere Clusterflache `pi * r^2` die Plotflache luckenlos abdeckt. Die tatsachliche Clustergrosse variiert durch die zufallige Lage der Zentren (Poisson-Voronoi-Effekt).

---

*Quellen: SiWaWa-Wuchssimulator (ETH/WSL), FBB Produktionskonzept Burgergemeinde Bern 2022, Pretzsch (2009/2019), Franz et al. (1973), Grundner & Schwappach (1952), Schutz (2002/2003), Rohle et al. (2009).*
