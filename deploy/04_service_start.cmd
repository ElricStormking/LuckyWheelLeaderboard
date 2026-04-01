@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0\04_service_start.ps1" -Build
pause
