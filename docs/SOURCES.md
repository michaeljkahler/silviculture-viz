# Waldbauliche Datenquellen und Quellenverzeichnis

## 1. SiWaWa Wachstumskurven (hdom über Alter)

**Was:** Oberhöhen-Stützpunkte für 9 Baumarten (je 2 Bonitätsklassen)
**Methode:** Manuelle Digitalisierung aus SiWaWa-Grafiken, 3 Iterationsrunden
**Referenzalter:** Bonität = hdom [m] im Alter 50 Jahre (SiWaWa-Konvention)

### Primärquellen
- ETH Zürich, Professur für Waldökosystem-Management: SiWaWa Wuchssimulator
  - URL: https://www.siwawa.org
  - Dokumentation: http://www.moti.ch
  - Anwendung: MOTI App (Mobile Timber Inventory)

### Baumarten und Bonitäten

| Art | Kürzel | Bonität hoch | Bonität mittel | Quelle |
|-----|--------|-------------|----------------|--------|
| Buche | Bu | B28 | B26 | SiWaWa |
| Weisstanne | Ta | B22 | B20 | SiWaWa |
| Fichte | Fi | B30 | B28 | SiWaWa |
| Eiche | Ei | B28 | B26 | SiWaWa |
| Esche | Es | B30 | B28 | SiWaWa |
| Waldföhre | Foe | B28 | B26 | SiWaWa |
| Lärche | La | B30 | B28 | SiWaWa |
| Douglasie | Dou | B36 | B34 | SiWaWa |
| Bergahorn | BAh | B26 | B22 | Abgeleitet (s.u.) |

### Bergahorn — Sonderfall
Keine SiWaWa-Originalkurve verfügbar. Abgeleitet aus:
- Röhle H., Huber M., Steinacker L. (2009): Bergahorn-Versuchsflächen Bayern.
  In: LWF Wissen 62, Beiträge zum Bergahorn.
- Lockow K.-W. (2003): Bergahorn im nordostdeutschen Tiefland — Ertragstafel.
  Landesforstanstalt Eberswalde.
- Waldbauliche Erfahrungswerte Schweiz (ETH Zürich, HAFL)

### Verifikation
Kreuzvalidiert gegen:
- NW-FVA Ertragstafeln (Albert et al. 2021) — 5 Hauptbaumarten
- Badoux E. (1967/68): Schweizer Ertragstafeln Fichte/Buche — WSL/EAFV
- Schober R. (1995): Ertragstafeln wichtiger Baumarten. 4. Aufl. Sauerländer.
- Österreichische Ertragstafeln (Marschall 1975)

Ergebnis: 6/8 Arten vollständig verifiziert, 2 (Eiche, Föhre) bedingt
(Extrembonitäten, am oberen Rand).

---

## 2. FBB Produktionskonzept (Eingriffstabellen)

**Was:** Vollständige Eingriffspläne für 10 Baumarten
**Quelle:** Forstbetrieb Burgergemeinde Bern, Produktionskonzept Version 28.06.2022

### Enthaltene Daten pro Eingriff
- Oberhöhe (hdom) als Trigger
- BHD der Z-Bäume
- Stammzahl vor/nach Eingriff
- Konkurrenten pro Z-Baum
- Massnahmenbeschreibung
- Zieldurchmesser, Z-Bäume pro ha, Umtriebszeit, Endabstand

### Baumarten
Fi, Ta, Foe, La, Dou, Bu, Ei, Es, Ah (Bergahorn), Übriges Laubholz

### Lizenzhinweis
Daten digitalisiert aus internem Planungsdokument des FBB.
Verwendung im Bildungskontext (HAFL-Projektarbeit).

---

## 3. CH/DE Ertragstafeln (hdom-Wachstumskurven)

**Was:** hdom-Wachstumskurven nach publizierten Ertragstafeln, 8 Baumarten, je 2 Bonitäten

### Primärquellen

| Baumart | Primärquelle | Sekundärquelle |
|---------|-------------|----------------|
| Fichte | Badoux E. (1967/68), WSL/EAFV | NW-FVA Albert et al. (2021) |
| Tanne | Hausser K. (1956) in Schober | — |
| Buche | Badoux E. (1983), WSL/EAFV | Schober R. (1967/1995) |
| Eiche | Jüttner (1955) in Schober | NW-FVA Albert et al. (2021) |
| Föhre | Wiedemann E. (1943) in Schober | NW-FVA Albert et al. (2021) |
| Lärche | Kennel R. (1959/72) in Schober | — |
| Douglasie | Bergel D. (1985) in Schober | NW-FVA Albert et al. (2021) |
| Bergahorn | Röhle et al. (2009) | Lockow (2003) |

### NW-FVA Neue Ertragstafeln
Albert M., Nagel J., Schmidt M., Nagel R.-V., Spellmann H. (2021):
*Eine neue Generation von Ertragstafeln für Eiche, Buche, Fichte, Douglasie und Kiefer.*
Zenodo. DOI: [10.5281/zenodo.6343906](https://doi.org/10.5281/zenodo.6343906)
**Lizenz: CC-BY 4.0**

R-Paket: [et.nwfva](https://github.com/rnuske/et.nwfva) auf CRAN

### Schober Ertragstafelsammlung
Schober R. (1995): *Ertragstafeln wichtiger Baumarten bei verschiedener Durchforstung.*
4. Auflage. J.D. Sauerländer, Frankfurt am Main.

---

## 4. NaiS-Anforderungen (Schutzwald)

**Was:** Ideale und minimale Anforderungen an Schutzwaldbestände

### Quelle
Frehner M., Wasser B., Schwitter R. (2005/2019):
*Nachhaltigkeit und Erfolgskontrolle im Schutzwald (NaiS).*
Anhang 2A (Standortbeschriebe) und 2B (Anforderungstabellen).
Bundesamt für Umwelt BAFU, Bern.

### Verwendete Standortstypen
- 7a: Typischer Waldmeister-Buchenwald (submontan)
- 8a: Typischer Waldhirsen-Buchenwald (untermontan)
- 8S: Feuchter Waldhirsen-Buchenwald
- 9a/9w: Lungenkraut-Buchenwald (submontan)
- 12a: Bingelkraut-Buchenwald (untermontan)

---

## 5. Kronenallometrie

### Kronenradius aus BHD
Pretzsch H. (2009): *Forest Dynamics, Growth and Yield.*
Springer, Berlin Heidelberg. DOI: 10.1007/978-3-540-88307-4
Beziehung: kr ∝ BHD^0.5 (artspezifische Koeffizienten)

### Mischungsformen
Schütz J.P. (2003): *Waldbau.*
ETH Zürich, Haupt Verlag, Bern.
Definitionen: Einzelständer, Trupp (<5a), Gruppe (5-10a), Horst (10-50a)

### Plenterwald
Schütz J.P. (2002): *Die Plenterung und ihre unterschiedlichen Formen.*
ETH Zürich. Inverse-J Stammzahlverteilung, Gleichgewichtsstammzahl.

---

## 6. Vegetationsbeschreibungen

NaiS Standortstypen-Beschreibungen (2019), Version 1.0:
*Naturwald- und Vegetationsbeschreibung NaiS Standortstypen.*
Herausgeber: BAFU / WSL.
