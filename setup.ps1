#Requires -Version 5.1
# Instalador automatico do ERP Padaria
# Execute como Administrador: botao direito -> Executar como administrador

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$INSTALL_DIR = "C:\Padaria"
$REPO_URL    = "https://github.com/AlexandreAlan/ERP-PADARIA.git"
$TMP         = $env:TEMP

# URLs de download direto (caso winget nao esteja disponivel)
$PY_URL   = "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe"
$NODE_URL = "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
$GIT_URL  = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    [X]  $msg" -ForegroundColor Red }

function Refresh-Path {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
}

function Run-Silent($exe, $argList) {
    $p = Start-Process -FilePath $exe -ArgumentList $argList -Wait -PassThru -WindowStyle Hidden
    return $p.ExitCode
}

function Download-File($url, $dest) {
    Write-Warn "Baixando: $url"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $dest)
        return $true
    } catch {
        Write-Err "Falha no download: $_"
        return $false
    }
}

function Try-Winget($id) {
    try {
        $wg = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $wg) { return $false }
        $ec = (Start-Process winget -ArgumentList "install --id $id --source winget --silent --accept-package-agreements --accept-source-agreements" -Wait -PassThru -WindowStyle Hidden).ExitCode
        return ($ec -eq 0)
    } catch { return $false }
}

function Find-Python {
    $candidates = @(
        "$env:ProgramFiles\Python312\python.exe",
        "$env:ProgramFiles\Python311\python.exe",
        "$env:ProgramFiles\Python310\python.exe",
        "${env:ProgramFiles(x86)}\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    foreach ($cmd in @("python","py")) {
        try {
            $v = (& $cmd --version 2>&1).ToString()
            if ($v -match "3\.(1[0-9]|[2-9]\d)") { return $cmd }
        } catch { }
    }
    return $null
}

# ============================================================================
# Verifica Administrador
# ============================================================================
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host ""
    Write-Err "Execute como Administrador."
    Write-Host "  Clique com botao direito no INSTALAR_SISTEMA.bat"
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

# ============================================================================
# 1. Python
# ============================================================================
Write-Step "Verificando Python..."
$PYTHON = Find-Python

if (-not $PYTHON) {
    Write-Warn "Python nao encontrado. Tentando instalar via winget..."
    $ok = Try-Winget "Python.Python.3.12"
    Refresh-Path
    $PYTHON = Find-Python

    if (-not $PYTHON) {
        Write-Warn "winget falhou ou nao disponivel. Baixando instalador direto..."
        $pyInst = Join-Path $TMP "python_setup.exe"
        if (Download-File $PY_URL $pyInst) {
            Run-Silent $pyInst "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0 Include_launcher=1" | Out-Null
            Refresh-Path
            $PYTHON = Find-Python
        }
    }
}

if (-not $PYTHON) {
    Write-Err "Nao foi possivel instalar o Python automaticamente."
    Write-Host "  Acesse https://www.python.org/downloads/ e instale o Python 3.12."
    Read-Host "Pressione Enter para fechar"
    exit 1
}
Write-OK "Python: $PYTHON"

# ============================================================================
# 2. Node.js
# ============================================================================
Write-Step "Verificando Node.js..."
$nodeOk = $false
try { $nodeOk = ((& node --version 2>&1).ToString() -match "v\d+") } catch { }

if (-not $nodeOk) {
    Write-Warn "Node.js nao encontrado. Tentando via winget..."
    Try-Winget "OpenJS.NodeJS.LTS" | Out-Null
    Refresh-Path
    try { $nodeOk = ((& node --version 2>&1).ToString() -match "v\d+") } catch { }

    if (-not $nodeOk) {
        Write-Warn "winget falhou. Baixando instalador direto..."
        $nodeInst = Join-Path $TMP "node_setup.msi"
        if (Download-File $NODE_URL $nodeInst) {
            Run-Silent "msiexec.exe" "/i `"$nodeInst`" /quiet /norestart ADDLOCAL=ALL" | Out-Null
            Refresh-Path
            # Node instala em local fixo
            $nodeExe = "$env:ProgramFiles\nodejs\node.exe"
            if (Test-Path $nodeExe) {
                $env:PATH = "$env:ProgramFiles\nodejs;" + $env:PATH
                $nodeOk = $true
            }
        }
    }
}

if (-not $nodeOk) {
    Write-Err "Nao foi possivel instalar Node.js automaticamente."
    Write-Host "  Acesse https://nodejs.org e instale o Node.js 20 LTS."
    Read-Host "Pressione Enter para fechar"
    exit 1
}
try { Write-OK ("Node.js: " + (& node --version 2>&1).ToString()) } catch { Write-OK "Node.js instalado" }

# ============================================================================
# 3. Git
# ============================================================================
Write-Step "Verificando Git..."
$GIT = $null
$gitExePaths = @(
    "$env:ProgramFiles\Git\cmd\git.exe",
    "$env:ProgramFiles\Git\bin\git.exe"
)
foreach ($p in $gitExePaths) { if (Test-Path $p) { $GIT = $p; break } }
if (-not $GIT) {
    try { if ((& git --version 2>&1).ToString() -match "git version") { $GIT = "git" } } catch { }
}

if (-not $GIT) {
    Write-Warn "Git nao encontrado. Tentando via winget..."
    Try-Winget "Git.Git" | Out-Null
    Refresh-Path
    foreach ($p in $gitExePaths) { if (Test-Path $p) { $GIT = $p; break } }
    if (-not $GIT) { try { $GIT = "git" } catch { } }

    if (-not $GIT) {
        Write-Warn "winget falhou. Baixando instalador direto..."
        $gitInst = Join-Path $TMP "git_setup.exe"
        if (Download-File $GIT_URL $gitInst) {
            Run-Silent $gitInst "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /COMPONENTS=`"icons,ext\reg\shellhere,assoc,assoc_sh`"" | Out-Null
            foreach ($p in $gitExePaths) { if (Test-Path $p) { $GIT = $p; break } }
            if ($GIT) { $env:PATH = "$env:ProgramFiles\Git\cmd;" + $env:PATH }
        }
    }
}

if (-not $GIT) {
    Write-Err "Nao foi possivel instalar Git automaticamente."
    Write-Host "  Acesse https://git-scm.com e instale o Git."
    Read-Host "Pressione Enter para fechar"
    exit 1
}
try { Write-OK ("Git: " + (& $GIT --version 2>&1).ToString()) } catch { Write-OK "Git instalado" }

# ============================================================================
# 4. Clona / atualiza repositorio
# ============================================================================
Write-Step "Preparando $INSTALL_DIR..."
if (Test-Path (Join-Path $INSTALL_DIR ".git")) {
    Write-Warn "Repositorio ja existe - atualizando..."
    Set-Location $INSTALL_DIR
    & $GIT pull --ff-only
} else {
    if (Test-Path $INSTALL_DIR) {
        Write-Warn "Pasta existe sem git - removendo para clonar limpo..."
        Remove-Item $INSTALL_DIR -Recurse -Force
    }
    & $GIT clone $REPO_URL $INSTALL_DIR
    Set-Location $INSTALL_DIR
}
Write-OK "Codigo em $INSTALL_DIR"

# Caminhos definitivos (backend/ e frontend/ ficam direto em $INSTALL_DIR apos clone)
$backendDir  = Join-Path $INSTALL_DIR "backend"
$frontendDir = Join-Path $INSTALL_DIR "frontend"
$venvDir     = Join-Path $backendDir  "venv"
$envPath     = Join-Path $backendDir  ".env"
$venvPython  = Join-Path $venvDir     "Scripts\python.exe"
$venvPip     = Join-Path $venvDir     "Scripts\pip.exe"

# ============================================================================
# 5. .env
# ============================================================================
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

# ============================================================================
# 6. Venv + dependencias Python
# ============================================================================
Write-Step "Criando ambiente virtual Python..."
if (-not (Test-Path $venvPython)) {
    & $PYTHON -m venv $venvDir
}
Write-OK "Venv: $venvDir"

Write-Step "Instalando dependencias Python..."
& $venvPython -m pip install --upgrade pip --quiet
& $venvPip install -r (Join-Path $backendDir "requirements.txt") --quiet
Write-OK "Dependencias Python instaladas"

# ============================================================================
# 7. Banco de dados
# ============================================================================
Write-Step "Criando banco de dados..."
Set-Location $backendDir
& $venvPython seed_dev.py
Set-Location $INSTALL_DIR
Write-OK "Banco de dados pronto"

# ============================================================================
# 8. Frontend
# ============================================================================
Write-Step "Instalando dependencias do frontend..."
Set-Location $frontendDir
npm install --legacy-peer-deps
Write-OK "Dependencias frontend instaladas"

Write-Step "Compilando frontend (aguarde 1-2 minutos)..."
npm run build
Write-OK "Frontend compilado"
Set-Location $INSTALL_DIR

# ============================================================================
# 9. Script de inicializacao
# ============================================================================
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
    "echo  Para encerrar: feche esta janela.",
    "echo.",
    "start /b powershell -WindowStyle Hidden -Command ""Start-Sleep 6; Start-Process 'http://localhost:8000'""",
    ("""" + $uvicornExe + """ app.main:app --host 0.0.0.0 --port 8000 --workers 1")
)
[System.IO.File]::WriteAllLines($startBat, $batLines, [System.Text.Encoding]::ASCII)
Write-OK "Script: $startBat"

# ============================================================================
# 10. Atalho na area de trabalho
# ============================================================================
Write-Step "Criando atalho na area de trabalho..."
$desktopPublic = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
$desktopUser   = [System.Environment]::GetFolderPath("Desktop")
$iconPath      = Join-Path $frontendDir "public\favicon.ico"
if (-not (Test-Path $iconPath)) { $iconPath = "$env:SystemRoot\system32\imageres.dll,11" }

function New-Shortcut($lnkPath) {
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($lnkPath)
    $sc.TargetPath       = $startBat
    $sc.WorkingDirectory = $INSTALL_DIR
    $sc.Description      = "Iniciar ERP Padaria"
    $sc.WindowStyle      = 1
    $sc.IconLocation     = $iconPath
    $sc.Save()
}
New-Shortcut (Join-Path $desktopPublic "Padaria ERP.lnk")
if ($desktopUser -ne $desktopPublic) { New-Shortcut (Join-Path $desktopUser "Padaria ERP.lnk") }
Write-OK "Atalho criado na area de trabalho"

# ============================================================================
# Conclusao
# ============================================================================
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
if ($resp -match "^[Ss]") { Start-Process $startBat }
