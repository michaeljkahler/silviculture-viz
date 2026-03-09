// === config.js ===
/**
 * config.js — Globale Konstanten und Kompatibilitäts-Aliase
 *
 * Alle Werte die sich auf Plot-Grösse, Export, Rendering beziehen.
 * Änderungen hier wirken sich auf alle Module aus.
 *
 * Abhängigkeiten: keine (wird als erstes geladen)
 */

const CONFIG = {
  // Plot
  PLOT_SIZE: 100,       // Meter (100x100m = 1 ha)
  MAX_DISPLAY_H: 48,    // Maximale Höhe in der Frontansicht (m)
  TRANSECT_WIDTH: 10,   // Breite des Transekts (m)
  BG_DEPTH: 5,          // Tiefe der Hintergrundebene hinter Transekt (m)

  // Export
  EXPORT_DPI: 300,
  PANEL_W_MM: 135,      // A3-Panel Breite (mm)
  PANEL_H_MM: 70,       // A3-Panel Höhe (mm)
  PANEL_GAP_MM: 3,      // Abstand zwischen Front und Vogel (mm)

  // Berechnet
  get PANEL_W_PX() { return Math.round(this.PANEL_W_MM / 25.4 * this.EXPORT_DPI); },
  get PANEL_H_PX() { return Math.round(this.PANEL_H_MM / 25.4 * this.EXPORT_DPI); },
  get PANEL_GAP_PX() { return Math.round(this.PANEL_GAP_MM / 25.4 * this.EXPORT_DPI); },

  // Deckungsgrad-Raster
  COVER_RESOLUTION: 0.5, // Meter pro Zelle

  // Rendering
  GRID_MAJOR: 10,       // Hauptraster-Abstand (m)
  GRID_MINOR: 5,        // Nebenraster-Abstand (m)

  // Baumgenerierung
  MIN_SPACING_FACTOR: 0.4,  // Mindestabstand als Faktor der Kronensumme
  MIN_SPACING_ABS: 1.5,     // Absoluter Mindestabstand (m)
  PLACEMENT_ATTEMPTS: 120,  // Max. Platzierungsversuche pro Baum

  // Ungleichförmiger Modus: Grössenklassen
  SIZE_CLASSES: [
    { maxP: 0.18, minSF: 0.15, rangeSF: 0.15 },  // Jungwuchs
    { maxP: 0.38, minSF: 0.30, rangeSF: 0.15 },  // Dickung
    { maxP: 0.58, minSF: 0.50, rangeSF: 0.15 },  // Stangenholz
    { maxP: 0.78, minSF: 0.70, rangeSF: 0.15 },  // Baumholz
    { maxP: 1.00, minSF: 0.88, rangeSF: 0.12 },  // Starkes Baumholz
  ],

  // Gleichförmiger Modus
  GLEICH_MIN_SF: 0.82,
  GLEICH_RANGE_SF: 0.18,
};

// === v5-Kompatibilitäts-Aliase (globaler Scope) ===
// Diese Variablen werden von allen Modulen verwendet und
// entsprechen den Originalnamen aus v5_baseline.html.
const PLOT = CONFIG.PLOT_SIZE;
const MH = CONFIG.MAX_DISPLAY_H;
const DPI = CONFIG.EXPORT_DPI;
const PW = CONFIG.PANEL_W_PX;
const PH = CONFIG.PANEL_H_PX;

