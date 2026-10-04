#!/usr/bin/env bash
# Renders the key moments of one or more scenes and tiles each into build/<lesson>-<scene>-sheet.png
# usage: tools/sheet.sh closer thirds ...   (LESSON=photographing-people to pick a lesson,
#        SIZE=1080x1920 for the portrait layout)
set -euo pipefail
cd "$(dirname "$0")/.."
LESSON="${LESSON:-frame-it-better}"
SIZE="${SIZE:-1920x1080}"
for s in "$@"; do
  rm -f build/preview/"$LESSON-$s-$SIZE"-*.png
  node tools/preview.mjs --lesson "$LESSON" --scene "$s" --keys --size "$SIZE" > /dev/null
  if [[ "$SIZE" == 1920x1080 ]]; then geo=960x540+6+6; tile=2x3; else geo=360x640+6+6; tile=6x1; fi
  montage build/preview/"$LESSON-$s-$SIZE"-*.png -tile "$tile" -geometry "$geo" -background '#333' build/"$LESSON-$s"-sheet.png
  echo "build/$LESSON-$s-sheet.png"
done
