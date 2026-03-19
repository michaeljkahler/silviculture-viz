# Änderung 07: Habitatbäume (3–5 pro ha)

## Ziel
3–5 Bäume pro ha als Habitatbäume markieren — alte, grosse Bäume
die dauerhaft stehen bleiben (keine Ernte, kein Z-Baum-Status).

## Konzept

### 1. Definition
Habitatbäume sind Bäume mit besonderem ökologischem Wert:
- Höhlen, Rindentaschen, Totäste, Kronentotholz
- Dauerhaft geschützt (keine Nutzung)
- Bevorzugt: Eiche, Buche, Linde (hoher Dendrohabitat-Score)
- Bevorzugt: die grössten/ältesten Bäume im Bestand

### 2. Toggle
Neuer Button: "Habitat" [H] — ein/aus.
Gespeichert in `S.showHabitat = true/false`.

### 3. Auswahl-Algorithmus
```javascript
function markHabitatBaeume(trees, n) {
  // n = 3–5 (konfigurierbar, Default 5)

  // Dendrohabitat-Score pro Art (aus Bewertungstabelle)
  const DENDRO = { Ei: 5, BAh: 4, Ta: 4, Bu: 4, WFoe: 4, Lae: 3, Li: 4,
                   Es: 3, Fi: 3, Bi: 3, Dou: 3 };

  // Score pro Baum: Dendrohabitat × BHD × Alter
  const scored = trees
    .filter(t => t.bhd > 20 && !t.isVerjuengung)
    .map(t => ({
      tree: t,
      score: (DENDRO[t.sp] || 3) * t.bhd * (t.indAge || 50)
    }))
    .sort((a, b) => b.score - a.score);

  // Top n auswählen, aber max. 2 gleiche Art
  const selected = [];
  const artCount = {};
  for (const { tree } of scored) {
    if (selected.length >= n) break;
    const c = artCount[tree.sp] || 0;
    if (c >= 2) continue;  // Max 2 Habitatbäume gleicher Art
    tree.isHabitat = true;
    selected.push(tree);
    artCount[tree.sp] = c + 1;
  }
}
```

### 4. Rendering Frontansicht
- Grünes Dreieck-Symbol (△) über dem Baum
- Oder: Spechtloch-Andeutung am Stamm (kleiner schwarzer Kreis)

### 5. Rendering Vogelperspektive
- Grüner gestrichelter Ring um die Krone (ähnlich Z-Baum, aber grün + breiter)
- Oder: Grünes Stern-Symbol ★ neben dem Stammpunkt
- Auf höchster Ebene (über Kraft-Schichten und Ernte-Ringen)

### 6. Interaktion mit Z-Bäumen
- Habitatbäume sind KEINE Z-Bäume → kein Z-Baum-Boost
- Habitatbäume werden NICHT geerntet (auch nicht bei Hiebreife/ZD)
- In genTrees(): `if (t.isHabitat) continue;` vor Hiebreife-Check

### 7. Interaktion mit Plenterwald
- Im Plenterwald: Habitatbäume werden NICHT bei ZD-Ernte entfernt
- Sie können über ZD hinauswachsen → werden zu den grössten Bäumen
- Ernte-Ring wird NICHT angezeigt für Habitatbäume

### 8. Statistik
Neues Stat-Feld: "Habitatbäume: X/ha (Ei: Y, Bu: Z, ...)"

## Waldbauliche Referenz
- Bütler et al. (2013): Habitatbäume — Schlüsselstrukturen für die Biodiversität
- NaiS 2024: Dendrohabitate als Anforderungskriterium
- Lachat et al. (2013): Mindestanforderungen für Alt- und Totholz
- Projektarbeit BLFw426: Biodiversität Dendrohabitate Score pro Art
