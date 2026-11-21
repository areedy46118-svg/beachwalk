#!/bin/sh
# The farmers' hit cry measured at the speakers (tools/farmhitlvl.html), in a headless Chrome of its own, silent, on 4234.
OUT=${1:-/tmp/bw-farmhitlvl}; Q=${CL_Q:-}    
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4234 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4234/tools/farmhitlvl.html$Q" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 240); do sleep 1; grep -q "\[FH\] DONE" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null; sleep 1; rm -rf "$OUT/prof"   # (each is ~400 MB and nothing reads it after: 124 left behind were 49 GB, 2026-11-19)
grep -o "\[FH\].*" "$OUT/chrome.err" | sed 's/", source.*//'
