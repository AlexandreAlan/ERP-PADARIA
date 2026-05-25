# ERP Padaria — Sistema de Gestão e PDV

Sistema completo de frente de caixa (PDV) e gestão para padarias.  
**Stack:** FastAPI · React 18 · TypeScript · SQLite (dev) / PostgreSQL (produção, em Docker)

---

## Sumário

1. [Instalação do Zero (nova máquina)](#1-instalação-do-zero-nova-máquina)
2. [Usar em modo desenvolvimento (quem já tem o sistema)](#2-usar-em-modo-desenvolvimento)
3. [Inicialização Manual (passo a passo)](#3-inicialização-manual-passo-a-passo)
4. [Credenciais Padrão](#4-credenciais-padrão)
5. [Perfis de Acesso](#5-perfis-de-acesso)
6. [Módulos do Sistema](#6-módulos-do-sistema)
7. [Configuração do .env](#7-configuração-do-env)
8. [Banco de Dados](#8-banco-de-dados)
9. [Leitor de Código de Barras](#9-leitor-de-código-de-barras)
10. [Impressora Térmica ESC/POS](#10-impressora-térmica-escpos)
11. [Segurança em Produção](#11-segurança-em-produção)
12. [Estrutura do Projeto](#12-estrutura-do-projeto)
13. [Deploy em produção (Docker · multi-tenant)](#13-deploy-em-produção-docker--multi-tenant)

---

## 1. Instalação do Zero (nova máquina)

Use este caminho quando for instalar o sistema em um computador que **nunca teve o ERP Padaria**.  
O instalador faz tudo automaticamente: baixa o código, instala Python e Node.js, cria o banco de dados e coloca um atalho na área de trabalho.

### Pré-requisitos mínimos

| Requisito   | Versão mínima | Observação                                      |
|-------------|---------------|-------------------------------------------------|
| Windows     | 10 / 11       | 64 bits                                         |
| Conexão     | Internet      | Necessária apenas na primeira instalação        |
| Permissão   | Administrador | O instalador precisa criar pastas em `C:\`      |

> Python, Node.js e Git **não precisam estar instalados** — o instalador baixa tudo sozinho via `winget`.

---

### Passo 1 — Baixar o instalador

Acesse o repositório no GitHub:

```
https://github.com/AlexandreAlan/ERP-PADARIA
```

Clique em **Code → Download ZIP**, extraia o arquivo e abra a pasta extraída.

**OU**, se já tiver o Git instalado, abra o Prompt de Comando e execute:

```bat
git clone https://github.com/AlexandreAlan/ERP-PADARIA.git C:\Padaria
cd C:\Padaria
```

---

### Passo 2 — Executar o instalador

Dentro da pasta do projeto, encontre o arquivo:

```
INSTALAR_SISTEMA.bat
```

Clique com o **botão direito** → **Executar como administrador**.

> Se o Windows perguntar "Deseja permitir que este aplicativo faça alterações?", clique em **Sim**.

O instalador vai:

1. Verificar e instalar **Python 3.12** (se não tiver)
2. Verificar e instalar **Node.js 20 LTS** (se não tiver)
3. Verificar e instalar **Git** (se não tiver)
4. Clonar o repositório em **`C:\Padaria`**
5. Criar o arquivo **`.env`** com configurações padrão e uma chave JWT única
6. Criar o ambiente virtual Python e instalar todas as dependências
7. Criar o **banco de dados** SQLite e populá-lo com dados de exemplo
8. Instalar dependências do frontend e **compilar** o React
9. Criar o script **`C:\Padaria\Iniciar_Padaria.bat`**
10. Criar um **atalho "Padaria ERP"** na área de trabalho

Ao final, será perguntado se deseja iniciar o sistema imediatamente.

---

### Passo 3 — Iniciar o sistema no dia a dia

Após a instalação, basta dar dois cliques no atalho da área de trabalho:

```
Padaria ERP
```

Ou execute diretamente:

```
C:\Padaria\Iniciar_Padaria.bat
```

O navegador abrirá automaticamente em **http://localhost:8000**.

---

## 2. Usar em modo desenvolvimento

Use este caminho se você **clonou o repositório para desenvolver** ou modificar o sistema.

### Pré-requisitos

Instale manualmente antes de continuar:

| Software | Download                        |
|----------|---------------------------------|
| Python 3.11+ | https://www.python.org/downloads/ |
| Node.js 20+  | https://nodejs.org/pt-br/download/ |
| Git          | https://git-scm.com/download/win   |

> Durante a instalação do Python, marque a opção **"Add Python to PATH"**.

---

### Passo 1 — Clonar o repositório

Abra o **Prompt de Comando** ou **PowerShell** e execute:

```bat
git clone https://github.com/AlexandreAlan/ERP-PADARIA.git
cd ERP-PADARIA
```

Isso cria a pasta `ERP-PADARIA` com todo o código do projeto.

---

### Passo 2 — Iniciar o sistema

Dentro da pasta do projeto, execute:

```
erp-padaria.bat
```

Na **primeira execução**, o script faz automaticamente:
- Cria o ambiente virtual Python (`backend\venv`)
- Instala todas as dependências Python
- Cria o arquivo `.env` a partir do exemplo
- Cria e popula o banco de dados SQLite
- Instala as dependências do frontend (Node.js)
- Abre o backend (porta 8000) e o frontend dev (porta 5173) em janelas separadas
- Abre o navegador em **http://localhost:5173**

Nas próximas execuções, apenas inicia os servidores (muito mais rápido).

---

### Passo 3 — Acessar

| Serviço      | URL                              |
|--------------|----------------------------------|
| Sistema      | http://localhost:5173            |
| API (backend)| http://localhost:8000            |
| Swagger docs | http://localhost:8000/api/docs   |

---

## 3. Inicialização Manual (passo a passo)

Caso os scripts `.bat` não funcionem, siga este roteiro manualmente.

### Backend (FastAPI)

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Crie o arquivo `.env` (copie de `.env.example` se existir, ou crie com o conteúdo da [seção 7](#7-configuração-do-env)).

Crie o banco de dados:

```bat
venv\Scripts\python.exe seed_dev.py
```

Inicie o servidor:

```bat
venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + Vite)

Abra outro terminal:

```bat
cd frontend
npm install
npm run dev
```

### Recriar o banco do zero

```bat
cd backend
venv\Scripts\python.exe seed_dev.py
```

> Atenção: isso **apaga todos os dados** existentes e recria com os dados de exemplo.

---

## 4. Credenciais Padrão

Criadas automaticamente pelo `seed_dev.py`:

| Perfil      | E-mail                  | Senha          |
|-------------|-------------------------|----------------|
| Admin       | admin@padaria.com       | Admin@1234     |
| Caixa       | caixa@padaria.com       | Caixa@1234     |
| Estoquista  | estoque@padaria.com     | Estoque@1234   |

> Troque as senhas imediatamente após instalar em produção.

---

## 5. Perfis de Acesso

| Perfil     | PDV | Estoque | Caixa | Dashboard | Relatórios | Admin |
|------------|:---:|:-------:|:-----:|:---------:|:----------:|:-----:|
| admin      | ✓   | ✓       | ✓     | ✓         | ✓          | ✓     |
| gerente    | ✓   | ✓       | ✓     | ✓         | ✓          | ✗     |
| caixa      | ✓   | ✗       | ✓     | ✗         | ✗          | ✗     |
| estoquista | ✗   | ✓       | ✗     | ✗         | ✗          | ✗     |

---

## 6. Módulos do Sistema

### PDV — Frente de Caixa

- Busca de produtos por nome ou código de barras
- Teclado numérico (mouse ou teclado físico) para quantidade
- Pagamento único ou dividido: Dinheiro, Crédito, Débito, PIX, Vale
- Troco calculado automaticamente
- Impressão do cupom ESC/POS automática após venda
- Desconto por item ou por venda (valor fixo ou percentual)
- Caixa bloqueado até que o operador abra uma sessão

### Estoque

- Cadastro completo de produtos: código de barras, foto, preços, unidade de medida
- Ajuste manual (entrada, saída, perda, inventário)
- Alerta de estoque mínimo no dashboard
- Gestão de categorias e fornecedores

### Controle de Caixa

- Abertura com fundo inicial
- Sangria (retirada) e suprimento (reforço) durante o turno
- Fechamento com totalização por forma de pagamento
- Cálculo automático de diferença (sobra/falta)

### Compras

- Registro de ordens de compra por fornecedor
- Entrada automática no estoque ao confirmar recebimento

### Dashboard

- KPIs em tempo real: faturamento, lucro, margem, ticket médio
- Gráfico de vendas por dia (últimos 30 dias)
- Curva ABC — produtos mais rentáveis
- Alertas de estoque mínimo

### Relatórios

- Vendas por período com filtro de data
- Movimentações de estoque
- Exportação em PDF e Excel

### Auditoria

- Log imutável de todas as operações sensíveis
- Registra: login, criação de vendas, cancelamentos, ajustes de estoque

---

## 7. Configuração do .env

O arquivo `backend\.env` controla todo o comportamento do sistema.  
Ele é criado automaticamente pelo instalador, mas pode ser editado com o Bloco de Notas.

```env
# ── Aplicação ────────────────────────────────────
APP_NAME=Minha Padaria
APP_ENV=production          # development | production
APP_DEBUG=false             # true = ativa Swagger público
APP_HOST=0.0.0.0
APP_PORT=8000

# ── Banco de dados ───────────────────────────────
# SQLite (dev, sem instalação extra):
DB_HOST=sqlite
DB_NAME=padaria             # cria o arquivo padaria.db

# PostgreSQL (produção):
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=erp_padaria
# DB_USER=padaria_user
# DB_PASSWORD=senha_forte_aqui

# ── Segurança ────────────────────────────────────
JWT_SECRET_KEY=troque-por-uma-chave-muito-longa-e-aleatoria
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ── CORS (origens permitidas) ────────────────────
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# ── Impressora Térmica ───────────────────────────
PRINTER_TYPE=file           # usb | network | file
PRINTER_VENDOR_ID=0x0416
PRINTER_PRODUCT_ID=0x5011
PRINTER_PAPER_WIDTH=80      # 80 = 80mm (42 colunas) | 58 = 58mm (32 colunas)

# Para impressora de rede:
# PRINTER_TYPE=network
# PRINTER_NETWORK_IP=192.168.1.100
# PRINTER_NETWORK_PORT=9100

# ── Informações da padaria (aparecem no cupom) ───
PADARIA_NOME=Minha Padaria
PADARIA_CNPJ=00.000.000/0001-00
PADARIA_ENDERECO=Rua Exemplo, 123
PADARIA_CIDADE=Cidade - UF
PADARIA_TELEFONE=(11) 99999-9999
PADARIA_MENSAGEM_RODAPE=Obrigado pela preferencia!
```

> O arquivo `.env` **nunca é enviado ao GitHub** (está no `.gitignore`). Cada instalação tem o seu próprio.

---

## 8. Banco de Dados

### SQLite (padrão)

Não exige nenhuma instalação. O banco é criado como um arquivo em:

```
backend\padaria.db
```

Ideal para uso em padarias com um único computador.

### PostgreSQL (produção — recomendado para múltiplos computadores)

Em produção o banco roda em **container Docker** (ver seção [Deploy em produção](#13-deploy-em-produção-docker--multi-tenant)). Para apontar para um PostgreSQL próprio, configure o `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_padaria
DB_USER=padaria_user
DB_PASSWORD=senha_forte
```

E crie o banco/usuário no Postgres:

```sql
CREATE DATABASE erp_padaria;
CREATE USER padaria_user WITH PASSWORD 'senha_forte';
GRANT ALL PRIVILEGES ON DATABASE erp_padaria TO padaria_user;
```

Para inicializar **com dados de exemplo** (dev/demo), use `seed_dev.py`. Para um banco **limpo** (cliente real — só admin, empresa e caixa), use `init_db.py`:

```bash
cd backend
python init_db.py        # init limpo e idempotente
# ou: python seed_dev.py # demo (ATENÇÃO: apaga tudo e popula dados fictícios)
```

---

## 9. Leitor de Código de Barras

O leitor USB (tipo HID, ex: Knup KP-1026) funciona como teclado — não precisa de driver.

**Como usar:**
1. Abra o PDV no sistema
2. O campo de busca fica com foco automaticamente
3. Aponte o leitor para o código de barras do produto
4. O produto é adicionado ao carrinho na quantidade configurada

**Detecção automática:** teclas chegando com menos de 80ms de intervalo são tratadas como scanner; digitação humana normal não é afetada.

**Sem leitor:** digite o nome ou código do produto no campo de busca e pressione Enter.

---

## 10. Impressora Térmica ESC/POS

### Modos disponíveis

| `PRINTER_TYPE` | Como funciona                                     |
|----------------|---------------------------------------------------|
| `usb`          | Conectada por USB — requer driver WinUSB (Zadig)  |
| `network`      | Conectada na rede local por IP                    |
| `file`         | Salva o cupom em arquivo (para testes)            |

### Impressora USB (WinUSB)

1. Baixe o [Zadig](https://zadig.akeo.ie)
2. Conecte a impressora por USB
3. No Zadig: selecione a impressora → instale o driver **WinUSB**
4. Descubra o `Vendor ID` e `Product ID` no Gerenciador de Dispositivos
5. Configure no `.env`:

```env
PRINTER_TYPE=usb
PRINTER_VENDOR_ID=0x0416
PRINTER_PRODUCT_ID=0x5011
```

### Impressora de Rede

```env
PRINTER_TYPE=network
PRINTER_NETWORK_IP=192.168.1.100
PRINTER_NETWORK_PORT=9100
```

### Testar sem impressora

```env
PRINTER_TYPE=file
```

O cupom é salvo em `%TEMP%\ultimo_recibo.bin`. Use um visualizador ESC/POS para conferir.

---

## 11. Segurança em Produção

### Gerar uma chave JWT forte

```bat
venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

Copie o resultado e coloque no `.env`:

```env
JWT_SECRET_KEY=resultado_aqui
```

### Checklist de produção

- [ ] `APP_DEBUG=false` — desativa o Swagger público
- [ ] `JWT_SECRET_KEY` com pelo menos 64 caracteres aleatórios
- [ ] `CORS_ORIGINS` apontando apenas para o seu domínio/IP
- [ ] Banco PostgreSQL com usuário de permissões limitadas (não use `postgres`/superusuário)
- [ ] Faça backup diário do arquivo `padaria.db` (SQLite) ou do volume do PostgreSQL
- [ ] Nunca versione o arquivo `.env`

---

## 12. Estrutura do Projeto

```
ERP-PADARIA/
│
├── backend/                        # API FastAPI (assíncrona, SQLAlchemy 2.0)
│   ├── app/
│   │   ├── models/                 # Modelos SQLAlchemy (tabelas do banco)
│   │   ├── routers/                # Endpoints da API REST
│   │   ├── services/               # Lógica de negócio
│   │   ├── schemas/                # Validação com Pydantic
│   │   ├── dependencies/           # Autenticação e guards de perfil
│   │   └── main.py                 # Ponto de entrada da API
│   ├── seed_dev.py                 # Cria e popula o banco COM dados de exemplo
│   ├── init_db.py                  # Init LIMPO (produção/cliente real)
│   ├── Dockerfile                  # Imagem de produção
│   ├── requirements.txt            # Dependências Python
│   └── .env                        # Configurações (NÃO versionar)
│
├── frontend/                       # SPA React 18 + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/                  # PDV, Estoque, Caixa, Dashboard...
│       ├── store/                  # Estado global (Zustand)
│       ├── hooks/                  # Hooks reutilizáveis
│       └── config/                 # Axios com interceptor de autenticação
│
├── deploy/                         # Infra de produção (multi-tenant)
│   ├── new-client.sh               # Provisiona uma cópia isolada de cliente
│   ├── clients/                    # 1 .env por cliente (gitignored) + example.env
│   └── nginx/                      # Confs de Nginx versionadas
│
├── docker-compose.yml              # Stack de produção parametrizada (PostgreSQL + backend)
├── INSTALAR_SISTEMA.bat            # Instalador automático Windows (nova máquina)
├── erp-padaria.bat                 # Inicia o sistema em modo desenvolvimento (Windows)
├── setup.ps1                       # Script PowerShell chamado pelo instalador
│
└── app.py                          # Sistema legado (Flask) — não é mais desenvolvido
```

### Arquivos importantes para o dia a dia

| Arquivo                  | Para que serve                                             |
|--------------------------|------------------------------------------------------------|
| `INSTALAR_SISTEMA.bat`   | Instalar em uma máquina nova (executa uma vez)             |
| `erp-padaria.bat`        | Iniciar o sistema para desenvolvimento                     |
| `C:\Padaria\Iniciar_Padaria.bat` | Iniciar o sistema em produção (criado pelo instalador) |
| `backend\.env`           | Configurações do sistema (banco, impressora, padaria)      |
| `backend\seed_dev.py`    | Recriar o banco de dados com dados de exemplo              |

---

## 13. Deploy em produção (Docker · multi-tenant)

Em produção o sistema roda em **Docker** (PostgreSQL + backend FastAPI) atrás do **Nginx** com HTTPS (Let's Encrypt). O frontend é compilado (`frontend/dist`) e servido pelo Nginx.

### Modelo multi-tenant: cópia isolada por cliente

Um único código e um único `docker-compose.yml` **parametrizado**. Cada cliente roda como um **projeto Docker Compose separado**, com banco, volumes, rede, container e porta próprios — **dados 100% isolados**. O `frontend/dist` é compartilhado; o nome/identidade da padaria (logo, CNPJ, etc.) vem em runtime de `GET /api/configuracoes/empresa`, que nasce da variável `PADARIA_NOME`.

Os defaults do compose (`${VAR:-padrão}`) reproduzem a instância base, então `docker compose up -d` puro sobe a primeira instância sem precisar de nada extra.

### Provisionar um novo cliente (1 comando)

```bash
cd /caminho/do/ERP-PADARIA

# 1. Crie o arquivo de ambiente do cliente (gere os segredos):
cp deploy/clients/example.env deploy/clients/<slug>.env
#   preencha <slug>, domínio, porta livre, DB_*, JWT_SECRET_KEY, PADARIA_NOME, ADMIN_*

# 2. Provisione (sobe a stack isolada + init limpo + Nginx + HTTPS):
./deploy/new-client.sh <slug> <dominio>
```

O `deploy/new-client.sh` sobe a stack (`docker compose -p erp-padaria-<slug> --env-file deploy/clients/<slug>.env up -d --build`), roda o `init_db.py` (admin + empresa + caixa, **sem dados fictícios**), gera a conf do Nginx e emite o certificado.

### Operação / re-deploy

```bash
# Frontend (compartilhado por todos os clientes):
cd frontend && npm run build && cd ..

# Backend de um cliente específico (ex.: slug "kero"):
docker compose -p erp-padaria-kero --env-file deploy/clients/kero.env up -d --build

# Logs:
docker compose -p erp-padaria-kero --env-file deploy/clients/kero.env logs -f
```

> `seed_dev.py` popula dados de exemplo e **apaga o banco** (uso dev/demo). Em banco de cliente real use sempre `init_db.py` (limpo e idempotente).

---

## Solução de Problemas

### "Python não encontrado"
Reinstale o Python marcando **"Add Python to PATH"** durante a instalação.  
Após instalar, feche e reabra o terminal.

### "npm não encontrado"
Reinstale o Node.js e marque a opção de adicionar ao PATH.

### Porta 8000 ou 5173 em uso
Verifique se o sistema já está rodando em outra janela.  
Para encerrar, feche as janelas do terminal com título "Backend" e "Frontend".

### Banco de dados corrompido ou para reiniciar do zero
```bat
cd backend
del padaria.db
venv\Scripts\python.exe seed_dev.py
```

### Erro de permissão no Windows
Execute o `.bat` com botão direito → **Executar como administrador**.

### Erro "MissingGreenlet" ou "greenlet" no backend
Reinstale as dependências Python:
```bat
cd backend
venv\Scripts\pip.exe install -r requirements.txt --force-reinstall
```
