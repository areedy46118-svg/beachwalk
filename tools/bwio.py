"""Reading and writing the game's assets as the game does (2026-11-21): a file may be stored gzipped (`tools/gz_assets.py`) —
`bwGunzip` in the game inflates it when it starts 1f 8b — so a tool that reads one back must do the same, and one that writes
a .glb or moves .json should write it gzipped again (level 9, mtime 0) so the saving is kept."""
import gzip, json


def read_bytes(path):
    b = open(path, 'rb').read()
    return gzip.decompress(b) if b[:2] == b'\x1f\x8b' else b


def read_json(path):
    return json.loads(read_bytes(path).decode('utf-8'))


def write_bytes(path, data):
    open(path, 'wb').write(gzip.compress(data, 9, mtime=0))


def write_json(path, obj):
    write_bytes(path, json.dumps(obj, separators=(',', ':')).encode('utf-8'))
