#!/bin/sh
# The crow's scream measured at the speakers (tools/crowlevel.html), in a headless Chrome of its own, silent, on 4233.
OUT=${1:-/tmp/bw-crowlevel}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4233 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4233/tools/crowlevel.html" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 240); do sleep 1; grep -q "\[CL\] DONE" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null
grep -o "\[CL\].*" "$OUT/chrome.err" | sed 's/", source.*//'
