@echo off
cd /d "%~dp0"

echo Starting Pronoun Cluster Reflex local server...
start "Pronoun Cluster Reflex Server" cmd /k python -m http.server 8000

timeout /t 1 /nobreak >nul
start "" http://localhost:8000

exit
