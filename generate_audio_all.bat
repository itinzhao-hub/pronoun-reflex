@echo off
cd /d "%~dp0"
echo Google Cloud TTS full generation: 1000 stimuli x 4 profiles = 4000 MP3
if "%GOOGLE_CLOUD_TTS_API_KEY%"=="" (
  set /p GOOGLE_CLOUD_TTS_API_KEY=Paste GOOGLE_CLOUD_TTS_API_KEY: 
)
python tools\generate_audio.py
pause
