#!/bin/sh
# Compress sign clips and an optional lesson source with ffmpeg.
# Sign clips: 240px tall. Lesson: 360px tall.
# Usage (from sign-window/): sh scripts/compress-videos.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
SIGNS="$ROOT/demo/signs"

compress() {
  input=$1
  height=$2
  tmp="$input.tmp.mp4"
  ffmpeg -y -i "$input" -vf "scale=-2:$height" -c:v libx264 -crf 30 -c:a aac -b:a 64k -movflags +faststart "$tmp"
  mv "$tmp" "$input"
}

if [ -d "$SIGNS" ]; then
  for input in "$SIGNS"/*.mp4; do
    [ -e "$input" ] || continue
    echo "sign $input"
    compress "$input" 240
  done
fi

if [ -f "$ROOT/demo/lesson-source.mp4" ]; then
  echo "lesson"
  ffmpeg -y -i "$ROOT/demo/lesson-source.mp4" \
    -vf "scale=-2:360" -c:v libx264 -crf 30 -c:a aac -b:a 64k -movflags +faststart \
    "$ROOT/demo/lesson.mp4"
fi
