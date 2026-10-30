#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吉他和弦练习 - 本地服务器
- 静态服务 src/ 目录
- POST /api/tasks 将任务数组写入 src/config/tasks.json
- 仅监听 127.0.0.1（本机访问），零第三方依赖

用法：python3 server.py [端口]   （默认 8000）
"""
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
CONFIG_DIR = os.path.join(ROOT, "config")
CONFIG_FILE = os.path.join(CONFIG_DIR, "tasks.json")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # 始终以 src/ 为静态根目录
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        # /api/tasks 读取当前配置
        if parsed.path == "/api/tasks":
            data = self._read_config()
            self._send_json(data if data is not None else [])
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/tasks":
            self._send_json({"ok": False, "error": "not found"}, 404)
            return

        if not self._is_local():
            self._send_json({"ok": False, "error": "forbidden: local only"}, 403)
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b""
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, list):
                raise ValueError("配置必须是一个任务数组")
            self._write_config(data)
            self._send_json({"ok": True, "count": len(data)})
        except Exception as exc:  # noqa: BLE001
            self._send_json({"ok": False, "error": str(exc)}, 400)

    def _is_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1", "localhost")

    def _read_config(self):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return None

    def _write_config(self, data):
        os.makedirs(CONFIG_DIR, exist_ok=True)
        tmp = CONFIG_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, CONFIG_FILE)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(("127.0.0.1", port), Handler)
    print("==============================================")
    print("  吉他练习已启动：http://localhost:%d" % port)
    print("  配置文件写入：POST /api/tasks")
    print("  按 Ctrl+C 停止")
    print("==============================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()