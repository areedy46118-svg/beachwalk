#!/usr/bin/env python3
"""Minimal static file server for Beach Walk (works around a sandboxed getcwd)."""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
# port: CLI arg wins, then $PORT (set by the Claude Code preview), then 4173
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT") or 4173)

class Handler(SimpleHTTPRequestHandler):
    """The code is never cached. The assets are — but only on a 304.

    SimpleHTTPRequestHandler sends Last-Modified and nothing else, and with no
    Cache-Control a browser is free to guess how long it may keep a file. For
    main.js, edited every few minutes, Chrome guesses wrong: a normal reload
    serves the stale copy out of disk cache and the change appears not to have
    happened at all. Only a hard reload got through, which is a terrible way
    to find out your last three commits were never being loaded.

    So the source keeps `no-store` and the ASSETS DO NOT, because `no-store`
    means a reload re-downloads NINETY-FOUR MEGABYTES of models every single
    time — which is most of what "the loading takes too long" is when you are
    playing it on the machine you are building it on. `no-cache` is the answer
    and the two names are nothing alike: it still revalidates on every single
    request, so a rebuilt .glb is picked up the moment its mtime moves, and it
    answers 304 with no body when it has not. Repeat loads go from 94 MB to a
    few kilobytes of headers, and a packer that rewrites an asset is still
    visible on the next plain reload.
    """

    CODE = (".html", ".js", ".css", ".json")

    def _is_code(self):
        return self.path.split("?")[0].endswith(self.CODE)

    def end_headers(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            # lets the JS Self-Profiling API run on the page (new Profiler(...)): how a
            # hitch is traced to the function that made it. Dev server only; no effect otherwise.
            self.send_header("Document-Policy", "js-profiling")
        if self._is_code():
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        # the code drops its validators too, so we never answer a 304 for it
        if self._is_code():
            del self.headers["If-Modified-Since"]
            del self.headers["If-None-Match"]
        return super().send_head()


Handler = partial(Handler, directory=ROOT)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Beach Walk serving {ROOT} at http://localhost:{PORT}", flush=True)
httpd.serve_forever()
