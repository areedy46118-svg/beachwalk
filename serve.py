#!/usr/bin/env python3
"""Minimal static file server for Beach Walk (works around a sandboxed getcwd)."""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
# port: $PORT wins (the Claude Code preview sets it, and with autoPort it is
# the port the preview is WAITING on — letting the "4173" in launch.json win
# meant a second preview, or anything else already on 4173, left the server
# unable to bind and the preview dead), then the CLI arg, then 4173
PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 4173))

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


    # A SERVER THAT LOGS EVERY REQUEST CAN STOP SERVING. The game asks for
    # hundreds of files a load, and each one was a line on stderr; when that
    # goes to a pipe nobody is draining (the Claude Code preview), the pipe
    # fills and the next write BLOCKS the handler thread — and then the next,
    # until the page stops loading and the preview "ends". Errors only.
    def log_message(self, fmt, *args):
        pass

    def log_error(self, fmt, *args):
        try:
            sys.stderr.write("%s\n" % (fmt % args))
        except Exception:
            pass

    # a browser that drops a connection mid-file (a reload, a closed tab) is
    # not an error worth a traceback
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, TimeoutError):
            pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


class Server(ThreadingHTTPServer):
    daemon_threads = True          # a hung connection never holds the process open
    allow_reuse_address = True     # a restart does not wait out TIME_WAIT on the port
    request_queue_size = 128       # a full load is a burst of requests

    def handle_error(self, request, client_address):
        pass                       # a dropped client is not our problem, and a traceback per one fills the pipe


Handler = partial(Handler, directory=ROOT)


def bind(port):
    # the preview's port is the preview's: wait for it a little rather than wander off it
    fixed = bool(os.environ.get("PORT"))
    for attempt in range(40 if fixed else 20):
        p = port if fixed else port + attempt
        try:
            return Server(("127.0.0.1", p), Handler), p
        except OSError:
            if fixed:
                time.sleep(0.25)
    raise SystemExit(f"port {port} is in use")


import time
httpd, PORT = bind(PORT)
print(f"Beach Walk serving {ROOT} at http://localhost:{PORT}", flush=True)
# and if anything ever does take the loop down, it comes straight back up on the same socket
while True:
    try:
        httpd.serve_forever()
        break
    except KeyboardInterrupt:
        break
    except Exception as e:
        try:
            sys.stderr.write("server loop restarting: %r\n" % (e,))
        except Exception:
            pass
        time.sleep(0.2)
