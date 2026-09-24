@echo off
cd /d "%~dp0"
python tools\build_stimuli.py
python tools\check_audio.py
pause
