@echo off
cd /d "%~dp0"
dotnet run --project src\TwinSight --urls http://127.0.0.1:5080
