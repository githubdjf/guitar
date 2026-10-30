#!/usr/bin/env bash
# 吉他练习 - 一键启动本地服务器（支持写配置文件）
# 用法：./start.sh [端口]   （默认 8000，启动后自动打开浏览器）
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "=============================================="
echo "  吉他练习已启动：http://localhost:${PORT}"
echo "  配置写入：POST /api/tasks"
echo "  按 Ctrl+C 停止"
echo "=============================================="
# 自动打开浏览器（macOS/Linux）
( sleep 1; case "$(uname)" in
    Darwin) open "http://localhost:${PORT}" ;;
    Linux)  (command -v xdg-open >/dev/null && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) || true ;;
  esac ) &
python3 server.py "${PORT}"
