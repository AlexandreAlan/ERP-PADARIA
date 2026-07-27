#!/usr/bin/env bash
# Instalador do ERP Padaria (bare-metal) para Linux/macOS.
# Equivalente ao INSTALAR_SISTEMA.bat + setup.ps1 (Windows), mas instala na
# própria pasta do repositório (sem C:\Padaria). Para o caminho universal com
# Docker, veja o README: `docker compose up -d --build`.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "== Instalador ERP Padaria (Linux/macOS) =="

command -v python3 >/dev/null 2>&1 || { echo "[ERRO] Python 3 não encontrado. Instale o Python 3.12+." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[ERRO] Node.js/npm não encontrado. Instale o Node 20+." >&2; exit 1; }

echo "[1/4] Backend: criando venv e instalando dependências..."
python3 -m venv backend/venv
backend/venv/bin/pip install --upgrade pip -q
backend/venv/bin/pip install -r backend/requirements.txt -q

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "[OK] backend/.env criado a partir do exemplo — ajuste os valores antes de produção."
fi

echo "[2/4] Frontend: instalando dependências e compilando..."
( cd frontend && npm install --no-fund --no-audit && npm run build )

echo "[3/4] Inicializando o banco de dados..."
( cd backend && venv/bin/python init_db.py )

echo "[4/4] Criando o usuário super admin..."
( cd backend && venv/bin/python create_super_admin.py )

echo
echo "== Instalação concluída. Rode ./iniciar.sh para iniciar o sistema. =="
