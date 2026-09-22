#!/usr/bin/env bash
#
# Rasterise the app mark into the PNGs a home-screen install needs.
#
# `public/favicon.svg` is the single source — this script strips its rounded
# background rect and re-composes the mark over the backgrounds each target
# wants, so editing the pot in one place is enough. The PNGs are committed;
# run this only when the mark changes.
#
#   brew install librsvg     # for rsvg-convert
#   ./scripts/icons.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

command -v rsvg-convert >/dev/null || {
  echo "rsvg-convert not found — brew install librsvg" >&2
  exit 1
}

BG='#f5ead8'
SRC=public/favicon.svg
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# The mark without its own rounded background, ready to sit on whatever we choose.
MARK=$(sed -e '1d' -e '$d' -e '/rx="18"/d' "$SRC")

compose() { # $1 = background markup, $2 = mark transform
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">\n%s\n<g transform="%s">%s</g>\n</svg>\n' \
    "$1" "$2" "$MARK"
}

# `any`: the mark as the browser tab shows it, rounded corners and all.
rsvg-convert -w 192 -h 192 "$SRC" -o public/icon-192.png
rsvg-convert -w 512 -h 512 "$SRC" -o public/icon-512.png

# `maskable`: full-bleed background, mark shrunk to 80% so Android's mask can
# crop to a circle without clipping the pot.
compose "<rect width=\"64\" height=\"64\" fill=\"$BG\"/>" "translate(6.4 6.4) scale(0.8)" > "$TMP/maskable.svg"
rsvg-convert -w 512 -h 512 "$TMP/maskable.svg" -o public/icon-maskable-512.png

# apple-touch-icon: square and opaque. iOS applies its own rounding and renders
# transparency as black, so it must not get the rounded-corner version.
compose "<rect width=\"64\" height=\"64\" fill=\"$BG\"/>" "translate(0 0)" > "$TMP/apple.svg"
rsvg-convert -w 180 -h 180 "$TMP/apple.svg" -o public/apple-touch-icon.png

ls -l public/*.png
