#!/bin/sh
# Every item in the pack's live pane, headless (own port, own profile): sh tools/pvsheet.sh [out.png]   (PB_PORT: 4216 unless given)
OUT=${1:-/tmp/bw-pvsheet.png}; PORT=${PB_PORT:-4216}; D=$(mktemp -d)
cd "$(dirname "$0")/.." || exit 1
python3 serve.py $PORT > "$D/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$D/prof" --no-first-run --mute-audio \
  --hide-scrollbars --window-size=2390,1000 --virtual-time-budget=240000 --screenshot="$OUT" \
  "http://localhost:$PORT/tools/pvsheet.html${QS:+?$QS}" > /dev/null 2>&1
kill $SRV 2>/dev/null; rm -rf "$D"; echo "$OUT"
