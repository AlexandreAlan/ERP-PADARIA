@echo off
chcp 65001 >nul
title erp-padaria
color 0A
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ==========================================
echo         erp-padaria  v1.0
echo  ==========================================
echo.

rem Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale em https://python.org
    goto :fim
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER%

rem Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    goto :fim
)
for /f %%v in ('node --version') do set NODEVER=%%v
echo [OK] Node.js %NODEVER%

echo.

rem Cria venv se nao existir
if not exist "%ROOT%\backend\venv\Scripts\activate.bat" (
    echo [SETUP] Criando ambiente virtual Python...
    python -m venv "%ROOT%\backend\venv"
    if errorlevel 1 (
        echo [ERRO] Falha ao criar venv.
        goto :fim
    )
    echo [OK] Ambiente virtual criado.
)

rem Instala dependencias Python
echo [INFO] Verificando dependencias Python...
"%ROOT%\backend\venv\Scripts\python.exe" -m pip install --upgrade pip
"%ROOT%\backend\venv\Scripts\pip.exe" install -r "%ROOT%\backend\requirements.txt"
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias Python.
    goto :fim
)
echo [OK] Dependencias Python instaladas.

rem Cria .env se nao existir
if not exist "%ROOT%\backend\.env" (
    if exist "%ROOT%\backend\.env.example" (
        copy "%ROOT%\backend\.env.example" "%ROOT%\backend\.env" >nul
        echo [OK] .env criado.
    )
)

rem Inicializa banco se nao existir
if not exist "%ROOT%\backend\app\database\padaria.db" (
    if not exist "%ROOT%\backend\padaria.db" (
        echo [SETUP] Inicializando banco de dados...
        "%ROOT%\backend\venv\Scripts\python.exe" "%ROOT%\backend\seed_dev.py"
        if errorlevel 1 (
            echo [ERRO] Falha ao inicializar banco de dados.
            goto :fim
        )
        echo [OK] Banco de dados criado.
    )
) else (
    echo [OK] Banco de dados encontrado.
)

rem Instala dependencias Node se nao existir
if not exist "%ROOT%\frontend\node_modules" (
    echo [SETUP] Instalando dependencias Node.js...
    pushd "%ROOT%\frontend"
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar Node.js.
        popd
        goto :fim
    )
    popd
    echo [OK] Node.js instalado.
) else (
    echo [OK] Node.js OK.
)

rem Inicia servidores
echo.
echo [INFO] Iniciando servidores...

start "erp-padaria Backend" cmd /k "cd /d %ROOT%\backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "erp-padaria Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"

echo [OK] Backend:  http://localhost:8000
echo [OK] Frontend: http://localhost:5173
echo [OK] Docs:     http://localhost:8000/api/docs
echo.
echo Aguardando 5s para abrir o navegador...
timeout /t 5 /nobreak >nul
start http://localhost:5173

:fim
echo.
pause
