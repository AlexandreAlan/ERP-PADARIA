@echo off
chcp 65001 >nul
title ATUALIZAR - ERP Padaria
setlocal EnableDelayedExpansion

set "ROOT=C:\Padaria"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "DB_FILE=%BACKEND%\padaria.db"
set "BACKUP_DIR=%ROOT%\backups"

echo.
echo  ============================================================
echo       ERP PADARIA - ATUALIZADOR
echo  Este script atualiza o sistema sem apagar nenhum dado.
echo  ============================================================
echo.
pause

:: ── 1. Backup do banco ───────────────────────────────────────────────────────
echo  [1/4] Fazendo backup do banco de dados...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do (
    set "DIA=%%a" & set "MES=%%b" & set "ANO=%%c"
)
for /f "tokens=1-2 delims=:" %%a in ("%TIME: =0%") do (
    set "HORA=%%a" & set "MIN=%%b"
)
set "TS=%ANO%-%MES%-%DIA%_%HORA%-%MIN%"

if exist "%DB_FILE%" (
    copy "%DB_FILE%" "%BACKUP_DIR%\padaria_%TS%.db" >nul
    echo  [OK] Backup salvo: backups\padaria_%TS%.db
) else (
    echo  [INFO] Banco SQLite nao encontrado (modo Docker/MySQL).
)

:: ── 2. Atualiza codigo (git pull) ────────────────────────────────────────────
echo.
echo  [2/4] Atualizando codigo...
git --version >nul 2>&1
if not errorlevel 1 (
    if exist "%ROOT%\.git" (
        cd /d "%ROOT%" && git pull
    ) else (
        echo  [INFO] Nao e um repositorio Git. Copie os arquivos manualmente.
    )
) else (
    echo  [INFO] Git nao encontrado. Pulando.
)

:: ── 3. Atualiza dependencias ─────────────────────────────────────────────────
echo.
echo  [3/4] Atualizando dependencias...
if exist "%BACKEND%\venv\Scripts\pip.exe" (
    "%BACKEND%\venv\Scripts\pip.exe" install -r "%BACKEND%\requirements.txt" -q --upgrade
    echo  [OK] Dependencias Python atualizadas.
)
if exist "%FRONTEND%\package.json" (
    pushd "%FRONTEND%" && call npm install --silent && popd
    echo  [OK] Dependencias Node.js atualizadas.
)

:: ── 4. Recompila e reinicia ──────────────────────────────────────────────────
echo.
echo  [4/4] Recompilando e reiniciando...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

cd /d "%FRONTEND%"
call npm run build >nul 2>&1
if errorlevel 1 (
    echo  [AVISO] Falha ao compilar o frontend.
) else (
    echo  [OK] Interface compilada.
)

cd /d "%BACKEND%"
start "ERP Padaria" /min cmd /k "venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul
start http://localhost:8000

echo.
echo  ============================================================
echo   ATUALIZACAO CONCLUIDA — Banco de dados intacto.
echo  ============================================================
echo.
pause
