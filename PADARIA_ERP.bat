@echo off
chcp 65001 >nul
title ERP Padaria
setlocal

set "ROOT=C:\Padaria"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

echo.
echo  [1/3] Encerrando processos na porta 8000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo  [2/3] Compilando interface...
cd /d "%FRONTEND%"
call npm run build >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Falha ao compilar. Verifique se o Node.js esta instalado.
    pause & exit /b 1
)

echo  [3/3] Iniciando servidor...
cd /d "%BACKEND%"
start "ERP Padaria" /min cmd /k "venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul
start http://localhost:8000

exit
