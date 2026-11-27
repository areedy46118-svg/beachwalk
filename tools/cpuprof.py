#!/usr/bin/env python3
"""CPU PROFILES OF A PROBE, HEADLESS (2026-11-26). Runs a tools/probes.js scenario (or an evalFile) in a headless Chrome of its own,
with the DevTools protocol's sampling profiler on; every console.profile(name) / console.profileEnd(name) pair the probe makes comes
back here. The profiler's own start/stop costs ~270 ms, so a profile's length says nothing: the probe names the ones worth reading
with a log line `[PB] SPIKE <title> <ms>` (its own timing of the work inside), and those are printed as their heaviest functions
(inclusive and self time). --min 0 prints every profile.

    python3 -I tools/cpuprof.py 'evalFile&f=/tools/tavlag.js' --q '&still=1&prof=1' --min 4

Standard library only (a hand-rolled websocket). One headless Chrome at a time (it waits for any other to finish)."""
import argparse, base64, json, os, shutil, socket, struct, subprocess, sys, tempfile, time, urllib.request, collections

ap = argparse.ArgumentParser()
ap.add_argument('scenario'); ap.add_argument('--q', default=''); ap.add_argument('--port', type=int, default=4244)
ap.add_argument('--dbg', type=int, default=9344); ap.add_argument('--min', type=float, default=4.0)
ap.add_argument('--wait', type=int, default=600); ap.add_argument('--top', type=int, default=14); ap.add_argument('--interval', type=int, default=100)
A = ap.parse_args()
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

for i in range(900):
    if subprocess.run(['pgrep', '-qf', '--', '--headless=new']).returncode != 0: break
    if i == 0: print('waiting for the other headless Chrome to finish', file=sys.stderr)
    time.sleep(1)

prof = tempfile.mkdtemp(prefix='bwprof')
srv = subprocess.Popen([sys.executable, 'serve.py', str(A.port)], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
ch = subprocess.Popen([CHROME, '--headless=new', f'--user-data-dir={prof}', '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
                       '--window-size=1280,760', '--use-angle=metal', f'--remote-debugging-port={A.dbg}', 'about:blank'],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

class WS:
    def __init__(self, url):
        hp, path = url[len('ws://'):].split('/', 1); h, p = hp.split(':')
        self.s = socket.create_connection((h, int(p))); key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f'GET /{path} HTTP/1.1\r\nHost: {hp}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf: buf += self.s.recv(4096)
        self.rest = buf.split(b'\r\n\r\n', 1)[1]; self.n = 0
    def _read(self, k):
        while len(self.rest) < k:
            d = self.s.recv(1 << 20)
            if not d: raise EOFError
            self.rest += d
        out, self.rest = self.rest[:k], self.rest[k:]; return out
    def send(self, method, params=None):
        self.n += 1; data = json.dumps({'id': self.n, 'method': method, 'params': params or {}}).encode()
        hdr = bytearray([0x81]); L = len(data)
        if L < 126: hdr.append(0x80 | L)
        elif L < 65536: hdr.append(0x80 | 126); hdr += struct.pack('>H', L)
        else: hdr.append(0x80 | 127); hdr += struct.pack('>Q', L)
        m = os.urandom(4); self.s.sendall(bytes(hdr) + m + bytes(b ^ m[i % 4] for i, b in enumerate(data))); return self.n
    def recv(self):
        msg = b''
        while True:
            b0, b1 = self._read(2); L = b1 & 0x7f
            if L == 126: L = struct.unpack('>H', self._read(2))[0]
            elif L == 127: L = struct.unpack('>Q', self._read(8))[0]
            if b1 & 0x80: self._read(4)
            msg += self._read(L)
            if b0 & 0x80: return json.loads(msg.decode('utf-8', 'replace'))

def report(p, title):
    nodes = {n['id']: n for n in p['nodes']}
    parent = {}
    for n in p['nodes']:
        for c in n.get('children', []): parent[c] = n['id']
    dt = collections.Counter()
    for sid, d in zip(p['samples'], p['timeDeltas']): dt[sid] += d / 1000.0
    selfT, incl = collections.Counter(), collections.Counter()
    for nid, t in dt.items():
        f = nodes[nid]['callFrame']; key = f"{f['functionName'] or '(anon)'}:{f['lineNumber'] + 1}"
        selfT[key] += t; seen = set(); x = nid
        while x is not None:
            cf = nodes[x]['callFrame']; k = f"{cf['functionName'] or '(anon)'}:{cf['lineNumber'] + 1}"
            if k not in seen: incl[k] += t; seen.add(k)
            x = parent.get(x)
    dur = (p['endTime'] - p['startTime']) / 1000.0
    skip = ('(root)', '(program)', '(idle)', '(anon):0')
    print(f'== {title} {dur:.1f} ms')
    print('   incl: ' + ' | '.join(f'{k} {v:.1f}' for k, v in incl.most_common(60) if not k.startswith(skip))[:1400])
    print('   self: ' + ' | '.join(f'{k} {v:.1f}' for k, v in selfT.most_common(A.top) if not k.startswith(skip)))
    return True

try:
    tgt = None
    for i in range(60):
        try:
            tgt = next(t for t in json.load(urllib.request.urlopen(f'http://127.0.0.1:{A.dbg}/json')) if t['type'] == 'page'); break
        except Exception: time.sleep(0.5)
    ws = WS(tgt['webSocketDebuggerUrl'])
    for m, prm in [('Runtime.enable', None), ('Profiler.enable', None), ('Profiler.setSamplingInterval', {'interval': A.interval})]: ws.send(m, prm)
    ws.send('Page.navigate', {'url': f'http://localhost:{A.port}/tools/probe.html?s={A.scenario}{A.q}'})
    t0 = time.time(); shown = 0; total = 0; held = {}
    ws.s.settimeout(5)
    while time.time() - t0 < A.wait:
        try: m = ws.recv()
        except socket.timeout: continue
        meth = m.get('method')
        if meth == 'Profiler.consoleProfileFinished':
            total += 1; title = m['params'].get('title') or ''
            if A.min <= 0: shown += report(m['params']['profile'], title)
            else: held[title] = m['params']['profile']
            if len(held) > 8: held.pop(next(iter(held)))
        elif meth == 'Runtime.consoleAPICalled':
            txt = ' '.join(str(a.get('value', '')) for a in m['params'].get('args', []))
            if '[PB] SPIKE' in txt:      # (the probe names a profile worth reading: `log('SPIKE', title, ms)`)
                t = txt.split('[PB] SPIKE ', 1)[1].rsplit(' ', 1)[0]
                if t in held: print('step', txt.rsplit(' ', 1)[1], 'ms'); report(held.pop(t), t); shown += 1
                continue
            if '[PB]' in txt and '[PBIMG]' not in txt: print(txt[:600])
            if '[PB] DONE' in txt: break
    print(f'profiles: {total}, over {A.min} ms: {shown}')
finally:
    ch.kill(); srv.kill(); time.sleep(1); subprocess.run(['pkill', '-f', f'user-data-dir={prof}']); shutil.rmtree(prof, ignore_errors=True)
