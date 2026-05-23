@echo off
chcp 65001 >nul
title ERP Padaria - Desenvolvimento
color 0A
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ==========================================
echo       ERP PADARIA  -  Modo Dev
echo  ==========================================
echo.

rem Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale em https://python.org
    goto :fim
)

rem Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    goto :fim
)

rem Cria venv se nao existir
if not exist "%ROOT%\erp_padaria\backend\venv\Scripts\activate.bat" (
    echo [SETUP] Criando ambiente virtual Python...
    python -m venv "%ROOT%\erp_padaria\backend\venv"
)

rem Instala dependencias Python se necessario
echo [INFO] Verificando dependencias Python...
"%ROOT%\erp_padaria\backend\venv\Scripts\pip.exe" install -r "%ROOT%\erp_padaria\backend\requirements.txt" --quiet

rem Cria .env se nao existir
if not exist "%ROOT%\erp_padaria\backend\.env" (
    if exist "%ROOT%\erp_padaria\backend\.env.example" (
        copy "%ROOT%\erp_padaria\backend\.env.example" "%ROOT%\erp_padaria\backend\.env" >nul
        echo [OK] .env criado a partir do exemplo.
    )
)

rem Inicializa banco se nao existir
if not exist "%ROOT%\erp_padaria\backend\padaria.db" (
    echo [SETUP] Criando banco de dados...
    "%ROOT%\erp_padaria\backend\venv\Scripts\python.exe" "%ROOT%\erp_padaria\backend\seed_dev.py"
)

rem Instala dependencias Node se necessario
if not exist "%ROOT%\erp_padaria\frontend\node_modules" (
    echo [SETUP] Instalando dependencias Node.js...
    pushd "%ROOT%\erp_padaria\frontend"
    call npm install
    popd
)

rem Inicia servidores em janelas separadas
echo.
echo [INFO] Iniciando servidores...
echo.

start "Backend  - http://localhost:8000" cmd /k "cd /d %ROOT%\erp_padaria\backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "Frontend - http://localhost:5173" cmd /k "cd /d %ROOT%\erp_padaria\frontend && npm run dev"

echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:5173
echo  Swagger  : http://localhost:8000/api/docs
echo.
echo  Aguardando 5s para abrir o navegador...
timeout /t 5 /nobreak >nul
start http://localhost:5173

:fim
echo.
pause
