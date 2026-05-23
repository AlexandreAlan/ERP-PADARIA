#Requires -Version 5.1
# Instalador automatico do ERP Padaria
# Execute como Administrador: botao direito -> Executar como administrador

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$INSTALL_DIR = "C:\Padaria"
$REPO_URL    = "https://github.com/AlexandreAlan/ERP-PADARIA.git"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }
function Test-Cmd($cmd)   { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# --- Verifica Administrador --------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "  ERRO: Execute como Administrador." -ForegroundColor Red
    Write-Host "  Clique com o botao direito no INSTALAR_SISTEMA.bat"
    Write-Host "  e escolha 'Executar como administrador'."
    Write-Host ""
    Read-Host "Pressione Enter para fechar"
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     INSTALADOR AUTOMATICO - ERP PADARIA"                    -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Destino : $INSTALL_DIR"
Write-Host "  Repo    : $REPO_URL"
Write-Host ""

# --- 1. Python ---------------------------------------------------------------
Write-Step "Verificando Python..."
$PYTHON = $null
foreach ($cmd in @("python","py","python3")) {
    if (Test-Cmd $cmd) {
        $v = (& $cmd --version 2>&1).ToString()
        if ($v -match "3\.(1[0-9]|[2-9]\d)") { $PYTHON = $cmd; break }
    }
}
if (-not $PYTHON) {
    Write-Warn "Python 3.10+ nao encontrado. Instalando via winget..."
    winget install --id Python.Python.3.12 --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    $PYTHON = "python"
}
Write-OK ("Python: " + (& $PYTHON --version 2>&1).ToString())

# --- 2. Node.js --------------------------------------------------------------
Write-Step "Verificando Node.js..."
if (-not (Test-Cmd "node")) {
    Write-Warn "Node.js nao encontrado. Instalando via winget..."
    winget install --id OpenJS.NodeJS.LTS --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}
Write-OK ("Node.js: " + (& node --version 2>&1).ToString())

# --- 3. Git ------------------------------------------------------------------
Write-Step "Verificando Git..."
if (-not (Test-Cmd "git")) {
    Write-Warn "Git nao encontrado. Instalando via winget..."
    winget install --id Git.Git --source winget --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
}
Write-OK ("Git: " + (& git --version 2>&1).ToString())

# --- 4. Clona / atualiza repositorio -----------------------------------------
Write-Step "Preparando $INSTALL_DIR..."
$gitDir = Join-Path $INSTALL_DIR ".git"
if (Test-Path $gitDir) {
    Write-Warn "Repositorio ja existe - atualizando..."
    Set-Location $INSTALL_DIR
    git pull --ff-only
} else {
    if (Test-Path $INSTALL_DIR) {
        Write-Warn "Pasta existe sem git - removendo para clonar limpo..."
        Remove-Item $INSTALL_DIR -Recurse -Force
    }
    git clone $REPO_URL $INSTALL_DIR
    Set-Location $INSTALL_DIR
}
Write-OK "Codigo em $INSTALL_DIR"

# Caminhos (o clone coloca backend/ e frontend/ direto em $INSTALL_DIR)
$backendDir  = Join-Path $INSTALL_DIR "backend"
$frontendDir = Join-Path $INSTALL_DIR "frontend"
$venvDir     = Join-Path $backendDir  "venv"
$envPath     = Join-Path $backendDir  ".env"

# --- 5. .env -----------------------------------------------------------------
Write-Step "Configurando .env..."
if (-not (Test-Path $envPath)) {
    $jwt = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    $envLines = @(
        "APP_NAME=ERP Padaria",
        "APP_ENV=production",
        "APP_DEBUG=false",
        "APP_HOST=0.0.0.0",
        "APP_PORT=8000",
        "DB_HOST=sqlite",
        "DB_NAME=padaria",
        "JWT_SECRET_KEY=$jwt",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480",
        "JWT_REFRESH_TOKEN_EXPIRE_DAYS=7",
        "CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000",
        "PRINTER_TYPE=file",
        "PADARIA_NOME=Minha Padaria",
        "PADARIA_CNPJ=00.000.000/0001-00",
        "PADARIA_MENSAGEM_RODAPE=Obrigado pela preferencia!"
    )
    [System.IO.File]::WriteAllLines($envPath, $envLines, [System.Text.Encoding]::UTF8)
    Write-OK ".env criado"
} else {
    Write-Warn ".env ja existe - mantendo configuracoes atuais"
}

# --- 6. Venv + dependencias Python -------------------------------------------
Write-Step "Criando ambiente virtual Python..."
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip    = Join-Path $venvDir "Scripts\pip.exe"
if (-not (Test-Path $venvPython)) {
    & $PYTHON -m venv $venvDir
}
Write-OK "Venv: $venvDir"

Write-Step "Instalando dependencias Python..."
& $venvPython -m pip install --upgrade pip --quiet
& $venvPip install -r (Join-Path $backendDir "requirements.txt") --quiet
Write-OK "Dependencias Python instaladas"

# --- 7. Banco de dados -------------------------------------------------------
Write-Step "Criando banco de dados..."
Set-Location $backendDir
& $venvPython seed_dev.py
Set-Location $INSTALL_DIR
Write-OK "Banco de dados pronto"

# --- 8. Frontend -------------------------------------------------------------
Write-Step "Instalando dependencias do frontend..."
Set-Location $frontendDir
npm install --legacy-peer-deps
Write-OK "Dependencias frontend instaladas"

Write-Step "Compilando frontend (aguarde 1-2 minutos)..."
npm run build
Write-OK "Frontend compilado"
Set-Location $INSTALL_DIR

# --- 9. Script de inicializacao ----------------------------------------------
Write-Step "Criando script de inicializacao..."
$startBat   = Join-Path $INSTALL_DIR "Iniciar_Padaria.bat"
$uvicornExe = Join-Path $venvDir "Scripts\uvicorn.exe"
$batLines = @(
    "@echo off",
    "title ERP Padaria",
    "color 0A",
    ("cd /d """ + $backendDir + """"),
    "echo.",
    "echo  ============================================",
    "echo       ERP PADARIA - Iniciando...",
    "echo  ============================================",
    "echo.",
    "echo  Acesse: http://localhost:8000",
    "echo.",
    "echo  Para encerrar feche esta janela.",
    "echo.",
    ("start """" ""http://localhost:8000"""),
    ("""" + $uvicornExe + """ app.main:app --host 0.0.0.0 --port 8000 --workers 1")
)
[System.IO.File]::WriteAllLines($startBat, $batLines, [System.Text.Encoding]::ASCII)
Write-OK "Script: $startBat"

# --- 10. Atalho na area de trabalho ------------------------------------------
Write-Step "Criando atalho na area de trabalho..."
$desktopPublic = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
$desktopUser   = [System.Environment]::GetFolderPath("Desktop")

$iconPath = Join-Path $frontendDir "public\favicon.ico"
if (-not (Test-Path $iconPath)) {
    $iconPath = "$env:SystemRoot\system32\imageres.dll,11"
}

function New-Shortcut($lnkPath) {
    $ws        = New-Object -ComObject WScript.Shell
    $sc        = $ws.CreateShortcut($lnkPath)
    $sc.TargetPath       = $startBat
    $sc.WorkingDirectory = $INSTALL_DIR
    $sc.Description      = "Iniciar ERP Padaria"
    $sc.WindowStyle      = 1
    $sc.IconLocation     = $iconPath
    $sc.Save()
}

New-Shortcut (Join-Path $desktopPublic "Padaria ERP.lnk")
if ($desktopUser -ne $desktopPublic) {
    New-Shortcut (Join-Path $desktopUser "Padaria ERP.lnk")
}
Write-OK "Atalho criado na area de trabalho"

# --- Conclusao ---------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   INSTALACAO CONCLUIDA COM SUCESSO!"                         -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Instalado em : $INSTALL_DIR"                               -ForegroundColor White
Write-Host "  Atalho       : Area de trabalho > Padaria ERP"             -ForegroundColor White
Write-Host ""
Write-Host "  Logins padrao:"                                             -ForegroundColor White
Write-Host "    Admin   : admin@padaria.com   / Admin@1234"              -ForegroundColor Gray
Write-Host "    Caixa   : caixa@padaria.com   / Caixa@1234"              -ForegroundColor Gray
Write-Host "    Estoque : estoque@padaria.com / Estoque@1234"            -ForegroundColor Gray
Write-Host ""
Write-Host "  Para iniciar clique em 'Padaria ERP' na area de trabalho"  -ForegroundColor Cyan
Write-Host ""

$resp = Read-Host "Deseja iniciar o sistema agora? (S/N)"
if ($resp -match "^[Ss]") {
    Start-Process $startBat
}
