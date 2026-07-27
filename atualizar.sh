#!/usr/bin/env bash
# Atualiza o ERP Padaria sem apagar dados (Linux/macOS).
# Equivalente ao ATUALIZAR_SISTEMA.bat (Windows).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "== Atualizador ERP Padaria (Linux/macOS) =="

# ── 1. Backup do banco SQLite (se existir) ──────────────────────────────────
if [ -f backend/padaria.db ]; then
  mkdir -p backups
  TS="$(date +%Y-%m-%d_%H-%M)"
  cp backend/padaria.db "backups/padaria_${TS}.db"
  echo "[OK] Backup salvo: backups/padaria_${TS}.db"
else
  echo "[INFO] Banco SQLite não encontrado (modo Docker/Postgres) — sem backup local."
fi

# ── 2. Atualiza o código ────────────────────────────────────────────────────
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo "[2/4] Atualizando o código (git pull)..."
  git pull --ff-only || echo "[AVISO] git pull não pôde avançar; resolva manualmente."
else
  echo "[INFO] Sem Git/repositório — pulando atualização de código."
fi

# ── 3. Atualiza dependências ────────────────────────────────────────────────
echo "[3/4] Atualizando dependências..."
if [ -x backend/venv/bin/pip ]; then
  backend/venv/bin/pip install -r backend/requirements.txt -q --upgrade
  echo "[OK] Dependências Python atualizadas."
fi
if [ -f frontend/package.json ]; then
  ( cd frontend && npm install --no-fund --no-audit )
  echo "[OK] Dependências Node.js atualizadas."
fi

# ── 4. Recompila ────────────────────────────────────────────────────────────
echo "[4/4] Recompilando a interface..."
( cd frontend && npm run build )

echo
echo "== Atualização concluída (dados intactos). Rode ./iniciar.sh para reiniciar. =="
