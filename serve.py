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
    """No caching, ever.

    SimpleHTTPRequestHandler sends Last-Modified and nothing else, and with no
    Cache-Control a browser is free to guess how long it may keep a file. For
    main.js, edited every few minutes, Chrome guesses wrong: a normal reload
    serves the stale copy out of disk cache and the change appears not to have
    happened at all. Only a hard reload got through, which is a terrible way
    to find out your last three commits were never being loaded.
    """

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # drop the validators too, so we never answer a 304 either
        del self.headers["If-Modified-Since"]
        del self.headers["If-None-Match"]
        return super().send_head()


Handler = partial(Handler, directory=ROOT)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Beach Walk serving {ROOT} at http://localhost:{PORT}", flush=True)
httpd.serve_forever()
