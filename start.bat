@echo off
rem 吉他练习 - 一键启动本地服务器（支持写配置文件）
rem 用法：双击运行，或用命令行 start.bat 8000
cd /d "%~dp0"
set PORT=8000
if not "%1"=="" set PORT=%1
echo ==============================================
echo  吉他练习已启动：http://localhost:%PORT%
echo  配置写入：POST /api/tasks
echo  按 Ctrl+C 停止
echo ==============================================
python server.py %PORT%
