@echo off
chcp 65001 >nul
title erp-padaria
color 0A
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ==========================================
echo         erp-padaria  v1.0  [rapido]
echo  ==========================================
echo.

start "erp-padaria Backend" cmd /k "cd /d %ROOT%\backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
start "erp-padaria Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"

echo [OK] Backend:  http://localhost:8000
echo [OK] Frontend: http://localhost:5173
echo [OK] Docs:     http://localhost:8000/api/docs
echo.
echo Abrindo navegador em 4s...
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo Sistema iniciado. Esta janela pode ser fechada.
echo.
pause >nul
