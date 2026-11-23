#!/bin/sh
# The Enemy Log's silhouettes, drawn off the game (tools/elogshadows.js) into assets/elog-shadows.png + .json.
#   sh tools/elogshadows.sh
cd "$(dirname "$0")/.." || exit 1
OUT=${1:-/tmp/bw-elogshadows}
PB_PORT=${PB_PORT:-4223} PB_WAIT=${PB_WAIT:-1500} sh tools/probe.sh 'evalFile&f=/tools/elogshadows.js' "$OUT" | grep -v "^wrote"
python3 - "$OUT" <<'PY'
import re, sys, base64, json
out = sys.argv[1]; parts = {}; tot = 0; cells = None
for line in open(out + '/chrome.err', errors='ignore'):
    m = re.search(r'\[PBPNG\] elog-shadows (\d+)/(\d+) ([A-Za-z0-9+/=]+)', line)
    if m: parts[int(m.group(1))] = m.group(3); tot = int(m.group(2))
    m = re.search(r'\[PBJSON\] (\{.*\})', line)
    if m: cells = json.loads(m.group(1))
if not cells or len(parts) != tot or not tot: sys.exit('no sheet came back')
open('assets/elog-shadows.png', 'wb').write(base64.b64decode(''.join(parts[i] for i in range(tot))))
json.dump(cells, open('assets/elog-shadows.json', 'w'), separators=(',', ':'))
print('wrote assets/elog-shadows.png and .json:', len(cells), 'kinds')
PY
