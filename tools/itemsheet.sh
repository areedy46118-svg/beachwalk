#!/bin/sh
# Every item, its name and its description, as one picture: sh tools/itemsheet.sh [out.png]   (headless, own port 4217)
# The keys alone: QS=keys=1 WS=1500,760 sh tools/itemsheet.sh out.png
OUT=${1:-/tmp/bw-items.png}; PORT=${PB_PORT:-4217}; D=$(mktemp -d)
cd "$(dirname "$0")/.." || exit 1
python3 serve.py $PORT > "$D/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$D/prof" --no-first-run --mute-audio \
  --hide-scrollbars --window-size=${WS:-1900,1360} --virtual-time-budget=240000 --screenshot="$OUT" \
  "http://localhost:$PORT/tools/itemsheet.html${QS:+?$QS}" > /dev/null 2>&1
kill $SRV 2>/dev/null; rm -rf "$D"; echo "$OUT"
