# ERP Padaria — Sistema de Gestão e PDV

Sistema completo de frente de caixa (PDV) e gestão para padarias.

**Stack:** FastAPI · React · TypeScript · SQLite (dev) / MySQL (prod)

---

## Início Rápido (Windows)

### 1ª vez (clonou o repositório agora)

```bat
instalar.bat
```

Esse script cria o ambiente virtual Python, instala todos os pacotes, configura o banco de dados com dados de exemplo e instala as dependências do frontend.

### Iniciar o sistema

```bat
iniciar.bat
```

Abre duas janelas (backend + frontend) e o navegador em `http://localhost:5173`.

---

## Inicialização Manual

### Backend (FastAPI)

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/api/docs

### Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

- App: http://localhost:5173

### Recriar banco de dados

```bash
cd backend
venv\Scripts\python.exe seed_dev.py
```

---

## Credenciais Padrão

| Perfil      | Email                  | Senha          |
|-------------|------------------------|----------------|
| Admin       | admin@padaria.com      | Admin@1234     |
| Caixa       | caixa@padaria.com      | Caixa@1234     |
| Estoquista  | estoque@padaria.com    | Estoque@1234   |

---

## Perfis de Acesso

| Perfil      | PDV | Estoque | Caixa | Dashboard | Relatórios | Admin |
|-------------|-----|---------|-------|-----------|------------|-------|
| admin       | ✓   | ✓       | ✓     | ✓         | ✓          | ✓     |
| gerente     | ✓   | ✓       | ✓     | ✓         | ✓          | ✗     |
| caixa       | ✓   | ✗       | ✓     | ✗         | ✗          | ✗     |
| estoquista  | ✗   | ✓       | ✗     | ✗         | ✗          | ✗     |

---

## Módulos

**PDV (Frente de Caixa)**
- Leitura de código de barras USB (HID, ex: Knup) ou digitação manual
- Pagamento split: múltiplas formas por venda (Dinheiro / Crédito / Débito / PIX / Vale)
- Troco automático e impressão ESC/POS após venda
- Bloqueio de PDV se caixa estiver fechado

**Estoque**
- Cadastro completo de produtos com código de barras, preço de venda e custo
- Ajuste manual de estoque (entrada, saída, perda, ajuste de saldo)
- Alertas de estoque mínimo
- Gestão de categorias e fornecedores

**Controle de Caixa**
- Abertura com fundo inicial, sangria, suprimento e fechamento
- Totalização por forma de pagamento e cálculo de diferença no fechamento

**Compras**
- Registro de ordens de compra por fornecedor
- Entrada automática no estoque ao receber mercadoria

**Dashboard**
- KPIs: faturamento, lucro, margem, ticket médio
- Gráfico de vendas diárias e curva ABC de produtos

**Relatórios**
- Exportação em PDF e Excel com filtro por período
- Relatórios de vendas, estoque e movimentações

**Auditoria**
- Log imutável de todas as operações sensíveis (login, vendas, estoque)

---

## Banco de Dados

Por padrão usa **SQLite** (sem instalação necessária). Para usar MySQL:

```env
# backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=erp_padaria
DB_USER=padaria_user
DB_PASSWORD=sua_senha
```

---

## Leitor de Código de Barras

O leitor USB funciona como teclado HID — basta focar o campo de busca no PDV e apontar o leitor para o produto. A detecção é automática: entradas em menos de 80ms entre teclas são tratadas como scanner, entradas mais lentas como digitação manual.

---

## Impressora Térmica (ESC/POS)

Configure em `backend/.env`:

```env
PRINTER_TYPE=usb
PRINTER_VENDOR_ID=0x0416
PRINTER_PRODUCT_ID=0x5011
PRINTER_PAPER_WIDTH=80
```

No Windows: use driver WinUSB via [Zadig](https://zadig.akeo.ie) ou conecte via rede (`PRINTER_TYPE=network`).

Para testes sem impressora física: `PRINTER_TYPE=file` (salva em arquivo local).

---

## Pré-requisitos

| Requisito         | Versão mínima | Download                     |
|-------------------|---------------|------------------------------|
| Python            | 3.11+         | https://python.org           |
| Node.js           | 20+           | https://nodejs.org           |

---

## Segurança em Produção

```bash
# Gere uma JWT_SECRET_KEY forte
python -c "import secrets; print(secrets.token_hex(32))"
```

- `APP_DEBUG=false` — desativa Swagger público
- Configure HTTPS via nginx ou Caddy
- Restrinja `CORS_ORIGINS` ao seu domínio real
- Use MySQL com usuário de permissões limitadas
- Nunca versione `.env` (já incluído no `.gitignore`)

---

## Docker Compose (alternativa)

```bash
docker-compose up --build
```

Sobe MySQL 8.0, backend e frontend juntos.

---

## Estrutura do Projeto

```
erp_padaria/
├── backend/            # FastAPI + SQLAlchemy async
│   ├── app/
│   │   ├── models/     # Modelos SQLAlchemy (ORM)
│   │   ├── routers/    # Endpoints da API
│   │   ├── services/   # Lógica de negócio
│   │   ├── schemas/    # Validação Pydantic
│   │   └── dependencies/  # Auth, guards de perfil
│   ├── seed_dev.py     # Popula banco com dados de teste
│   └── requirements.txt
├── frontend/           # React + Vite + TypeScript
│   └── src/
│       ├── pages/      # PDV, Estoque, Caixa, Dashboard...
│       ├── store/      # Zustand (auth, PDV, empresa)
│       └── config/     # Axios com refresh automático
├── iniciar.bat         # Inicia backend + frontend
├── instalar.bat        # Instalação inicial
└── docker-compose.yml
```
