#!/bin/bash
# bundle.sh — Baut src/ -> index.html (standalone)
#
# Vereint alle CSS- und JS-Module in eine einzige HTML-Datei.
# Die generierte Datei funktioniert ohne Server direkt im Browser.
#
# Verwendung: bash build/bundle.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
SRC="$ROOT/src"
OUT="$ROOT/index.html"

echo "Bundling src/ -> index.html..."

# HTML-Kopf
cat > "$OUT" << 'HEADER'
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Waldbau Zielmischungstyp — BLFw426</title>
<style>
HEADER

# CSS einbetten
cat "$SRC/css/style.css" >> "$OUT"

# HTML-Mittelteil (aus src/index.html extrahieren: body-Inhalt bis zu den script-Tags)
cat >> "$OUT" << 'MIDDLE'
</style>
</head>
<body>
MIDDLE

# Body-Inhalt aus src/index.html extrahieren (zwischen <body> und den <script src= Tags)
sed -n '/<body>/,/<script src=/{ /<body>/d; /<script src=/d; p; }' "$SRC/index.html" >> "$OUT"

# Script-Tag öffnen
echo '<script>' >> "$OUT"

# JS-Module in korrekter Reihenfolge einbetten
MODULES="config species timeline ztree generator crownFront crownBird renderFront renderBird stats controls export"
for mod in $MODULES; do
  cat "$SRC/js/$mod.js" >> "$OUT"
  echo "" >> "$OUT"
done

# Init-Code
cat >> "$OUT" << 'INIT'
// Init
try {
  console.log('[INIT] buildC...');
  buildC();
  console.log('[INIT] buildTimeline...');
  buildTimeline();
  console.log('[INIT] render...');
  render();
  console.log('[INIT] ✓ Alle Funktionen geladen. Buttons sollten funktionieren.');
  window.addEventListener('resize', () => { renderFront(); renderBird(); });
} catch(e) {
  console.error('[INIT] FEHLER:', e);
  var d = document.getElementById('dbg-err');
  if (d) { d.style.display = 'block'; d.textContent += 'INIT FEHLER: ' + e.message + ' (Zeile ca. ' + (e.stack||'').match(/:(\d+):/)?.[1] + ')\n'; }
}
INIT

echo '</script>' >> "$OUT"
echo '</body>' >> "$OUT"
echo '</html>' >> "$OUT"

LINES=$(wc -l < "$OUT")
echo "Done: $OUT ($LINES lines)"
