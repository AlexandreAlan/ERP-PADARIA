#!/usr/bin/env bash
# Inicia o ERP Padaria em modo bare-metal no Linux/macOS.
# Equivalente ao PADARIA_ERP.bat (Windows). Para o caminho universal com
# Docker (funciona igual em qualquer SO), veja o README: `docker compose up`.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [ ! -x backend/venv/bin/uvicorn ]; then
  echo "[ERRO] Ambiente não instalado. Rode ./instalar.sh primeiro." >&2
  exit 1
fi

echo "[1/3] Liberando a porta 8000..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8000/tcp >/dev/null 2>&1 || true
fi

echo "[2/3] Compilando a interface..."
( cd frontend && npm run build )

echo "[3/3] Iniciando o servidor em http://localhost:8000 ..."
if command -v xdg-open >/dev/null 2>&1; then
  ( sleep 3 && xdg-open http://localhost:8000 >/dev/null 2>&1 || true ) &
fi
cd backend
exec venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
