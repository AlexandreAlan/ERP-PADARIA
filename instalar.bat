@echo off
chcp 65001 >nul
title ERP Padaria — Instalação
color 0E

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     ERP Padaria — Instalação Completa    ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Este script instala todas as dependencias do projeto.
echo  Execute apenas uma vez (ou apos clonar o repositorio).
echo.

:: ─── Verifica Python ────────────────────────────────────────────────────────
echo  Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERRO] Python nao encontrado!
    echo  Instale o Python 3.11+ em: https://python.org/downloads
    echo  IMPORTANTE: Marque "Add Python to PATH" durante a instalacao.
    echo.
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  [OK] Python %PYVER% encontrado.

:: ─── Verifica Node.js ───────────────────────────────────────────────────────
echo  Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js nao encontrado!
    echo  Instale o Node.js 20+ em: https://nodejs.org
    echo.
    pause & exit /b 1
)
for /f %%v in ('node --version') do set NODEVER=%%v
echo  [OK] Node.js %NODEVER% encontrado.

echo.
echo  ─── Configurando Backend Python ───────────────────────────────────────

:: Remove venv antigo se existir
if exist "backend\venv" (
    echo  Removendo venv anterior...
    rmdir /s /q backend\venv
)

:: Cria novo venv
echo  Criando ambiente virtual Python...
python -m venv backend\venv
if errorlevel 1 (
    echo  [ERRO] Falha ao criar venv. Verifique sua instalacao do Python.
    pause & exit /b 1
)

:: Atualiza pip
echo  Atualizando pip...
backend\venv\Scripts\pip.exe install --upgrade pip -q

:: Instala requirements
echo  Instalando dependencias Python...
backend\venv\Scripts\pip.exe install -r backend\requirements.txt
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias Python.
    pause & exit /b 1
)
echo  [OK] Dependencias Python instaladas com sucesso.

:: Cria .env se não existir
if not exist "backend\.env" (
    echo  Criando arquivo de configuracao backend\.env...
    copy backend\.env.example backend\.env >nul
    echo  [OK] backend\.env criado. Edite o arquivo para configurar seu ambiente.
) else (
    echo  [INFO] backend\.env ja existe, mantendo configuracoes atuais.
)

echo.
echo  ─── Inicializando Banco de Dados ──────────────────────────────────────

echo  Criando banco de dados com dados de exemplo...
backend\venv\Scripts\python.exe backend\seed_dev.py
if errorlevel 1 (
    echo  [ERRO] Falha ao inicializar banco de dados.
    pause & exit /b 1
)
echo  [OK] Banco de dados criado com sucesso.

echo.
echo  ─── Configurando Frontend React ───────────────────────────────────────

echo  Instalando dependencias Node.js...
cd frontend
call npm install
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias Node.js.
    cd ..
    pause & exit /b 1
)
cd ..
echo  [OK] Dependencias Node.js instaladas com sucesso.

:: ─── Conclusão ──────────────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                  Instalacao concluida!                       ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║  Para iniciar o sistema, execute: iniciar.bat               ║
echo  ║                                                              ║
echo  ║  Credenciais padrao:                                        ║
echo  ║    Admin:      admin@padaria.com  /  Admin@1234             ║
echo  ║    Caixa:      caixa@padaria.com  /  Caixa@1234            ║
echo  ║    Estoquista: estoque@padaria.com / Estoque@1234           ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
pause
