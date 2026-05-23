#Requires -Version 5.1
<#
.SYNOPSIS
    Instalador automatico do ERP Padaria
    Instala Python, Node.js, dependencias, banco de dados e cria atalho na area de trabalho.
.NOTES
    Execute como Administrador.
#>

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$INSTALL_DIR = "C:\Padaria"
$REPO_URL    = "https://github.com/AlexandreAlan/ERP-PADARIA.git"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "    [!] $msg" -ForegroundColor Yellow
}

function Test-CommandExists($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# ─── Verifica se e Administrador ──────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host "ERRO: Execute este script como Administrador." -ForegroundColor Red
    Write-Host "Clique com o botao direito no INSTALAR.bat e escolha 'Executar como administrador'."
    Read-Host "Pressione Enter para fechar"
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     INSTALADOR AUTOMATICO - ERP PADARIA" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Destino : $INSTALL_DIR"
Write-Host "  Repo    : $REPO_URL"
Write-Host ""

# ─── 1. Python 3.12 ───────────────────────────────────────────────────────────
Write-Step "Verificando Python..."
$PYTHON = $null
foreach ($pyCmd in @("python","python3","py")) {
    if (Test-CommandExists $pyCmd) {
        $ver = & $pyCmd --version 2>&1
        if ($ver -match "3\.(1[0-9]|[2-9]\d)") { $PYTHON = $pyCmd; break }
    }
}

if (-not $PYTHON) {
    Write-Warn "Python 3.10+ nao encontrado. Instalando via winget..."
    winget install --id Python.Python.3.12 --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    $PYTHON = "python"
}
$pyVer = & $PYTHON --version 2>&1
Write-OK "Python: $pyVer"

# ─── 2. Node.js 20 ────────────────────────────────────────────────────────────
Write-Step "Verificando Node.js..."
if (-not (Test-CommandExists "node")) {
    Write-Warn "Node.js nao encontrado. Instalando via winget..."
    winget install --id OpenJS.NodeJS.LTS --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}
$nodeVer = & node --version 2>&1
Write-OK "Node.js: $nodeVer"

# ─── 3. Git ───────────────────────────────────────────────────────────────────
Write-Step "Verificando Git..."
if (-not (Test-CommandExists "git")) {
    Write-Warn "Git nao encontrado. Instalando via winget..."
    winget install --id Git.Git --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}
$gitVer = & git --version 2>&1
Write-OK "Git: $gitVer"

# ─── 4. Clona / atualiza repositorio ─────────────────────────────────────────
Write-Step "Preparando pasta $INSTALL_DIR..."
if (Test-Path "$INSTALL_DIR\.git") {
    Write-Warn "Repositorio ja existe. Atualizando com git pull..."
    Set-Location $INSTALL_DIR
    git pull --ff-only
} else {
    if (Test-Path $INSTALL_DIR) {
        Write-Warn "Pasta $INSTALL_DIR existe sem .git. Removendo para clonar limpo..."
        Remove-Item $INSTALL_DIR -Recurse -Force
    }
    git clone $REPO_URL $INSTALL_DIR
    Set-Location $INSTALL_DIR
}
Write-OK "Codigo-fonte em $INSTALL_DIR"

# ─── 5. .env do backend ───────────────────────────────────────────────────────
Write-Step "Configurando .env do backend..."
$envPath = "$INSTALL_DIR\erp_padaria\backend\.env"
if (-not (Test-Path $envPath)) {
    $jwtSecret = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    $envContent = @"
APP_NAME=ERP Padaria
APP_ENV=production
APP_DEBUG=false
APP_HOST=0.0.0.0
APP_PORT=8000
DB_HOST=sqlite
DB_NAME=padaria
JWT_SECRET_KEY=$jwtSecret
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
PRINTER_TYPE=file
PADARIA_NOME=Minha Padaria
PADARIA_CNPJ=00.000.000/0001-00
PADARIA_MENSAGEM_RODAPE=Obrigado pela preferencia!
"@
    Set-Content -Path $envPath -Value $envContent -Encoding utf8
    Write-OK ".env criado"
} else {
    Write-Warn ".env ja existe — mantendo configuracoes atuais"
}

# ─── 6. Ambiente virtual Python ───────────────────────────────────────────────
Write-Step "Criando ambiente virtual Python..."
$backendDir = "$INSTALL_DIR\erp_padaria\backend"
$venvDir    = "$backendDir\venv"

if (-not (Test-Path "$venvDir\Scripts\python.exe")) {
    & $PYTHON -m venv $venvDir
}
Write-OK "Venv: $venvDir"

Write-Step "Instalando dependencias Python..."
& "$venvDir\Scripts\python.exe" -m pip install --upgrade pip --quiet
& "$venvDir\Scripts\pip.exe" install -r "$backendDir\requirements.txt" --quiet
Write-OK "Dependencias Python instaladas"

# ─── 7. Banco de dados e seed ─────────────────────────────────────────────────
Write-Step "Criando banco de dados e dados iniciais..."
Set-Location $backendDir
& "$venvDir\Scripts\python.exe" seed_dev.py
Set-Location $INSTALL_DIR
Write-OK "Banco de dados pronto com usuarios padrao"

# ─── 8. Frontend ──────────────────────────────────────────────────────────────
Write-Step "Instalando dependencias do frontend..."
$frontendDir = "$INSTALL_DIR\erp_padaria\frontend"
Set-Location $frontendDir
npm install --legacy-peer-deps
Write-OK "Dependencias frontend instaladas"

Write-Step "Compilando frontend (pode demorar 1-2 minutos)..."
npm run build
Write-OK "Frontend compilado"
Set-Location $INSTALL_DIR

# ─── 9. Script de inicializacao ───────────────────────────────────────────────
Write-Step "Criando script de inicializacao..."
$startBat = "$INSTALL_DIR\Iniciar_Padaria.bat"
$startContent = @"
@echo off
title ERP Padaria
color 0A
cd /d "$backendDir"
echo.
echo  ========================================
echo       ERP PADARIA - Iniciando...
echo  ========================================
echo.
echo  Acesse no navegador: http://localhost:8000
echo.
echo  Para encerrar, feche esta janela.
echo.
start "" "http://localhost:8000"
"$venvDir\Scripts\uvicorn.exe" app.main:app --host 0.0.0.0 --port 8000 --workers 1
"@
Set-Content -Path $startBat -Value $startContent -Encoding ascii
Write-OK "Script: $startBat"

# ─── 10. Atalho na area de trabalho ──────────────────────────────────────────
Write-Step "Criando atalho na area de trabalho..."
$desktopPublic = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
$desktopUser   = [System.Environment]::GetFolderPath("Desktop")

$iconPath = "$INSTALL_DIR\erp_padaria\frontend\public\favicon.ico"
if (-not (Test-Path $iconPath)) { $iconPath = "$env:SystemRoot\system32\imageres.dll,11" }

function New-Shortcut($path) {
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($path)
    $sc.TargetPath       = $startBat
    $sc.WorkingDirectory = $INSTALL_DIR
    $sc.Description      = "Iniciar ERP Padaria"
    $sc.WindowStyle      = 1
    $sc.IconLocation     = $iconPath
    $sc.Save()
}

New-Shortcut "$desktopPublic\Padaria ERP.lnk"
if ($desktopUser -ne $desktopPublic) {
    New-Shortcut "$desktopUser\Padaria ERP.lnk"
}
Write-OK "Atalho criado na area de trabalho"

# ─── Conclusao ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   INSTALACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Sistema instalado em : $INSTALL_DIR" -ForegroundColor White
Write-Host "  Atalho               : Area de trabalho > Padaria ERP" -ForegroundColor White
Write-Host ""
Write-Host "  Logins padrao:" -ForegroundColor White
Write-Host "    Admin   : admin@padaria.com   / Admin@1234" -ForegroundColor Gray
Write-Host "    Caixa   : caixa@padaria.com   / Caixa@1234" -ForegroundColor Gray
Write-Host "    Estoque : estoque@padaria.com / Estoque@1234" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para iniciar: clique em 'Padaria ERP' na area de trabalho" -ForegroundColor Cyan
Write-Host ""

$resp = Read-Host "Deseja iniciar o sistema agora? (S/N)"
if ($resp -match "^[Ss]") {
    Start-Process $startBat
}
