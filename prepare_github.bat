@echo off
cd /d "%~dp0"

echo [1/3] Rebuilding stimuli.js...
python tools\build_stimuli.py
if errorlevel 1 goto :fail

echo.
echo [2/3] Checking all 4000 audio files...
python tools\check_audio.py
if errorlevel 1 goto :fail

echo.
echo [3/3] Checking GitHub Pages limits...
python tools\check_github_pages.py
if errorlevel 1 goto :fail

echo.
echo Finished. If the final line says PASS, proceed to GitHub.
pause
exit /b 0

:fail
echo.
echo A check failed. Review the message above.
pause
exit /b 1
