#!/usr/bin/env bash
# Render all PlantUML diagrams (src/*.puml) to vector PDF for LaTeX inclusion.
# Requires: plantuml, rsvg-convert (librsvg).
set -e
cd "$(dirname "$0")"
plantuml -tsvg -o "$(pwd)/diagrams" src/*.puml
for s in diagrams/*.svg; do
  rsvg-convert -f pdf -o "${s%.svg}.pdf" "$s"
done
echo "==> Rendered $(ls diagrams/*.pdf | wc -l | tr -d ' ') diagrams to figures/diagrams/*.pdf"
