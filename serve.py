#!/usr/bin/env python3
"""Minimal static file server for Beach Walk (works around a sandboxed getcwd)."""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 4173))

Handler = partial(SimpleHTTPRequestHandler, directory=ROOT)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Beach Walk serving {ROOT} at http://localhost:{PORT}", flush=True)
httpd.serve_forever()
