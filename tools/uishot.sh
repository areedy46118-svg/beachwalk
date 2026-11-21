#!/bin/sh
# The menu, the pack, the controls page and the HUD at four window sizes, headless (own port, own profile), into $OUT.
#   sh tools/uishot.sh [outdir] [ui list]      (PB_PORT: its server's port, 4215 unless given)
OUT=${1:-/tmp/bw-ui}; UIS=${2:-"menu pack ctl hud"}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; PORT=${PB_PORT:-4215}
python3 serve.py $PORT > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
for S in 1280x720 1440x900 1920x1080 960x540 2560x1440; do
  Wd=${S%x*}; Ht=${S#*x}
  for U in $UIS; do
    rm -rf "$OUT/prof"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run --mute-audio \
      --hide-scrollbars --window-size=$Wd,$Ht --virtual-time-budget=40000 --screenshot="$OUT/$U-$S.png" \
      "http://localhost:$PORT/tools/uishot.html?ui=$U&w=$Wd&h=$Ht" > /dev/null 2>&1
    echo "$OUT/$U-$S.png"
  done
done
kill $SRV 2>/dev/null
rm -rf "$OUT/prof"   # (each is ~400 MB and nothing reads it after, 2026-11-19)
