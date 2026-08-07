#!/usr/bin/env bash
# 吉他和弦转换练习 - 一键启动本地服务器
# 用法：./start.sh [端口]   （默认 8000，启动后自动打开浏览器）
cd "$(dirname "$0")/src/practice"
PORT="${1:-8000}"
echo "=============================================="
echo "  吉他练习已启动：http://localhost:${PORT}"
echo "  按 Ctrl+C 停止"
echo "=============================================="
# 自动打开浏览器（macOS/Linux）
( sleep 1; case "$(uname)" in
    Darwin) open "http://localhost:${PORT}" ;;
    Linux)  (command -v xdg-open >/dev/null && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) || true ;;
  esac ) &
python3 -m http.server "${PORT}"
