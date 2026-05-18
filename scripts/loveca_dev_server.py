#!/usr/bin/env python3
"""Loveca ローカル配信用: JS/CSS/HTML を no-cache で返す（ES モジュールの古いキャッシュ対策）。"""
from __future__ import annotations

import http.server
import os
import socketserver
import sys


class LovecaDevTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class LovecaDevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0]
        if path.endswith((".js", ".css", ".html", ".json", ".webmanifest")) or path in ("/", ""):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: loveca_dev_server.py PORT ROOT_DIR", file=sys.stderr)
        sys.exit(2)
    port = int(sys.argv[1])
    root = os.path.abspath(sys.argv[2])
    os.chdir(root)
    with LovecaDevTCPServer(("127.0.0.1", port), LovecaDevHandler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
