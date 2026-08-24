@echo off
chcp 65001 >nul
title MAY CHU GAME - BAN PHI THUYEN
cd /d "%~dp0project-root"

echo ================================================
echo   DANG KHOI DONG GAME BAN PHI THUYEN...
echo ================================================

start "" "http://localhost:8123/index.html"
node server.js

pause
