#!/bin/sh
# Every piece of the owner's music through its real trigger, measured at the speakers, in a headless Chrome of its own
# (never the owner's pane or save), against a throwaway server on 4212.   sh tools/musictest.sh [outdir] [only, e.g. end,samurai]
OUT=${1:-/tmp/bw-musictest}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4212 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4212/tools/musictest.html${2:+?only=$2}" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 700); do sleep 1; grep -q "\[MT\] DONE" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null
grep -o "\[MT\].*" "$OUT/chrome.err" | sed 's/", source.*//'
