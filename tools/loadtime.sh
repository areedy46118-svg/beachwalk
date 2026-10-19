#!/bin/sh
# The checkpoint load, timed in a headless Chrome of its own (its own profile: never the owner's save), against a
# throwaway server on 4211 so the owner's game on 4199 is not slowed. Prints the [LT] lines of tools/loadtime.html.
#   sh tools/loadtime.sh [runs] [outdir]
RUNS=${1:-2}; OUT=${2:-/tmp/bw-loadtime}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4211 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4211/tools/loadtime.html?runs=$RUNS" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 360); do sleep 1; grep -q "\[LT\] DONE\|\[LT\] FAILED" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null
grep -o "\[LT\].*" "$OUT/chrome.err" | sed 's/", source.*//'
