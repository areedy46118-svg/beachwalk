#!/bin/sh
# Every checkpoint's load, timed in a headless Chrome of its own (its own profile: never the owner's save), against a
# throwaway server on 4212. Prints the [LA] lines of tools/loadall.html.
#   sh tools/loadall.sh [runs] [outdir] [only: comma list of names, e.g. tav,whale,beach-60]
RUNS=${1:-1}; OUT=${2:-/tmp/bw-loadall}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4212 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4212/tools/loadall.html?runs=$RUNS${3:+&only=$3}${LT_Q:-}" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 ${LT_WAIT:-1500}); do sleep 1; grep -q "\[LA\] DONE\|\[LA\] FAILED" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null
grep -o "\[LA\].*" "$OUT/chrome.err" | sed 's/", source.*//'
