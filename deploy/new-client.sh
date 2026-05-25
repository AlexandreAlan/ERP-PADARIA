#!/usr/bin/env bash
# =============================================================================
# Provisiona uma cópia ISOLADA do ERP Padaria para um cliente.
#
#   deploy/new-client.sh <slug> <dominio>
#   ex.: deploy/new-client.sh kero sistema.padariakero.com.br
#
# Pré-requisitos:
#   - deploy/clients/<slug>.env preenchido (ver example.env)
#   - DNS do <dominio> apontando para este servidor
#   - rodar a partir da raiz do projeto; usa sudo para Nginx/Certbot
#
# Cria: stack docker isolada (DB + backend) + Nginx + HTTPS. Idempotente.
# =============================================================================
set -euo pipefail

SLUG="${1:?uso: new-client.sh <slug> <dominio>}"
DOMAIN="${2:?uso: new-client.sh <slug> <dominio>}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="deploy/clients/${SLUG}.env"
PROJECT="erp-padaria-${SLUG}"
[ -f "$ENV_FILE" ] || { echo "ERRO: $ENV_FILE não existe (copie de deploy/clients/example.env)"; exit 1; }

# Porta do backend lida do env do cliente
BACKEND_PORT="$(grep -E '^BACKEND_PORT=' "$ENV_FILE" | cut -d= -f2 | tr -d '[:space:]')"
[ -n "$BACKEND_PORT" ] || { echo "ERRO: BACKEND_PORT ausente em $ENV_FILE"; exit 1; }

DC="docker compose -p ${PROJECT} --env-file ${ENV_FILE}"

echo "==> 1/5 Frontend (build compartilhado, se ainda não existir)"
[ -d frontend/dist ] || ( cd frontend && npm ci && npm run build )

echo "==> 2/5 Subindo stack isolada (${PROJECT}, porta ${BACKEND_PORT})"
$DC up -d --build

echo "==> 3/5 Inicialização limpa do banco (admin + empresa + caixa)"
for i in $(seq 1 10); do
  if $DC exec -T padaria-backend python init_db.py; then break; fi
  echo "   aguardando backend/db... ($i)"; sleep 3
done

echo "==> 4/5 Nginx para ${DOMAIN} -> 127.0.0.1:${BACKEND_PORT}"
CONF="/etc/nginx/sites-available/${DOMAIN}"
sudo tee "$CONF" >/dev/null <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/${SLUG}.access.log;
    error_log  /var/log/nginx/${SLUG}.error.log;

    root ${ROOT}/frontend/dist;
    index index.html;
    client_max_body_size 10M;

    location /assets/ { try_files \$uri =404; expires 1y; add_header Cache-Control "public, immutable"; }
    location /        { try_files \$uri \$uri/ /index.html; }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host              \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location ~ /\\. { deny all; }
}
NGINX
sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t && sudo systemctl reload nginx

echo "==> 5/5 HTTPS (Let's Encrypt)"
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect

echo ""
echo "OK  https://${DOMAIN} no ar (projeto ${PROJECT}, backend 127.0.0.1:${BACKEND_PORT})"
