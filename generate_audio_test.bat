@echo off
cd /d "%~dp0"
echo Google Cloud TTS test: first 20 stimuli x 4 profiles = 80 MP3
if "%GOOGLE_CLOUD_TTS_API_KEY%"=="" (
  set /p GOOGLE_CLOUD_TTS_API_KEY=Paste GOOGLE_CLOUD_TTS_API_KEY: 
)
python tools\generate_audio.py --limit 20
pause
