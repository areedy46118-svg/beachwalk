#!/bin/sh
# Run a scenario of tools/probes.js in a headless Chrome of its own (never the owner's pane or save) and write its stills.
#   sh tools/probe.sh <scenario> [outdir]
SC=$1; OUT=${2:-/tmp/bw-probe}
cd "$(dirname "$0")/.." || exit 1
mkdir -p "$OUT"; rm -rf "$OUT/prof"
python3 serve.py 4213 > "$OUT/serve.log" 2>&1 & SRV=$!
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$OUT/prof" --no-first-run \
  --mute-audio --autoplay-policy=no-user-gesture-required --window-size=1280,760 --use-angle=metal --enable-logging=stderr --v=0 \
  "http://localhost:4213/tools/probe.html?s=$SC" > /dev/null 2> "$OUT/chrome.err" & CH=$!
for i in $(seq 1 ${PB_WAIT:-300}); do sleep 1; grep -q "\[PB\] DONE" "$OUT/chrome.err" && break; done
kill $CH $SRV 2>/dev/null; sleep 1; pkill -f "user-data-dir=$OUT/prof" 2>/dev/null
grep -o "\[PB\] .*" "$OUT/chrome.err" | sed 's/", source.*//'
python3 - "$OUT" <<'PY'
import re, sys, base64, collections
out = sys.argv[1]; parts = collections.defaultdict(dict); tot = {}
for line in open(out + '/chrome.err', errors='ignore'):
    m = re.search(r'\[PBIMG\] (\S+) (\d+)/(\d+) ([A-Za-z0-9+/=]+)', line)
    if m: parts[m.group(1)][int(m.group(2))] = m.group(4); tot[m.group(1)] = int(m.group(3))
for k, v in parts.items():
    if len(v) == tot[k]:
        open(f'{out}/{k}.jpg', 'wb').write(base64.b64decode(''.join(v[i] for i in range(tot[k])))); print('wrote', f'{out}/{k}.jpg')
PY
