@echo off
chcp 65001 >nul
title ERP Padaria — Inicializando...
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         ERP Padaria — Sistema PDV        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ─── Verifica Python ───────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Python nao encontrado. Instale em https://python.org e reexecute.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  [OK] Python %PYVER%

:: ─── Verifica Node.js ──────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado. Instale em https://nodejs.org e reexecute.
    pause
    exit /b 1
)
for /f %%v in ('node --version') do set NODEVER=%%v
echo  [OK] Node.js %NODEVER%

echo.
echo  ─── Backend ───────────────────────────────────────────────────────────

:: ─── Cria venv se não existir ───────────────────────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo  Criando ambiente virtual Python...
    python -m venv backend\venv
    if errorlevel 1 (
        echo  [ERRO] Falha ao criar venv.
        pause & exit /b 1
    )
    echo  [OK] Venv criado.
)

:: ─── Instala / atualiza dependências Python ─────────────────────────────────
echo  Verificando dependencias Python...
backend\venv\Scripts\pip.exe install -q --upgrade pip >nul 2>&1
backend\venv\Scripts\pip.exe install -q -r backend\requirements.txt
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar requirements. Verifique backend\requirements.txt
    pause & exit /b 1
)
echo  [OK] Dependencias Python instaladas.

:: ─── Cria .env se não existir ───────────────────────────────────────────────
if not exist "backend\.env" (
    echo  Criando backend\.env a partir do .env.example...
    copy backend\.env.example backend\.env >nul
    echo  [AVISO] backend\.env criado com valores padrao. Ajuste conforme necessario.
)

:: ─── Cria banco de dados (seed) se não existir ──────────────────────────────
if not exist "backend\padaria.db" (
    echo  Banco de dados nao encontrado. Executando seed inicial...
    backend\venv\Scripts\python.exe backend\seed_dev.py
    if errorlevel 1 (
        echo  [ERRO] Falha ao inicializar banco de dados.
        pause & exit /b 1
    )
    echo  [OK] Banco de dados criado com dados de exemplo.
) else (
    echo  [OK] Banco de dados existente encontrado.
)

echo.
echo  ─── Frontend ──────────────────────────────────────────────────────────

:: ─── Instala dependências Node se não existir ───────────────────────────────
if not exist "frontend\node_modules" (
    echo  Instalando dependencias Node.js (pode demorar alguns minutos)...
    cd frontend
    npm install --silent
    if errorlevel 1 (
        echo  [ERRO] Falha ao instalar dependencias Node.js.
        cd ..
        pause & exit /b 1
    )
    cd ..
    echo  [OK] Dependencias Node.js instaladas.
) else (
    echo  [OK] node_modules encontrado.
)

:: ─── Inicia servidores ──────────────────────────────────────────────────────
echo.
echo  ─── Iniciando servidores ──────────────────────────────────────────────
echo.

start "ERP Padaria — Backend (API)" cmd /k "title ERP Padaria — Backend && color 0B && cd /d %~dp0backend && venv\Scripts\activate && echo  Backend iniciando em http://localhost:8000 && echo  Swagger: http://localhost:8000/api/docs && echo. && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

start "ERP Padaria — Frontend (React)" cmd /k "title ERP Padaria — Frontend && color 0D && cd /d %~dp0frontend && echo  Frontend iniciando em http://localhost:5173 && echo. && npm run dev"

echo  [OK] Backend: http://localhost:8000
echo  [OK] Frontend: http://localhost:5173
echo  [OK] API Docs: http://localhost:8000/api/docs
echo.
echo  ┌─────────────────────────────────────────┐
echo  │  Credenciais padrao:                    │
echo  │  Admin:      admin@padaria.com          │
echo  │  Senha:      Admin@1234                 │
echo  │  Caixa:      caixa@padaria.com          │
echo  │  Estoquista: estoque@padaria.com        │
echo  └─────────────────────────────────────────┘
echo.
echo  Aguardando servidores subirem...
timeout /t 5 /nobreak >nul

:: Abre o navegador automaticamente
start http://localhost:5173

echo.
echo  Pressione qualquer tecla para fechar esta janela.
echo  Os servidores continuam rodando nas janelas abertas.
pause >nul
