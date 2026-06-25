#!/usr/bin/env bash
# Build the thesis PDF with XeLaTeX (handles Vietnamese + bibliography).
set -e
cd "$(dirname "$0")"
latexmk -xelatex -interaction=nonstopmode -halt-on-error main.tex
echo "==> Done: main.pdf"
