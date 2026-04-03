# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura do Repositório

Este repositório contém **dois sistemas**:

| Pasta | Sistema | Stack |
|---|---|---|
| raiz (`app.py`, `templates/`, `static/`) | Sistema legado | Flask + SQLite + Jinja2 |
| `backend/` + `frontend/` | **Sistema novo (ativo)** | FastAPI + React + SQLite/MySQL |

O sistema novo é o que está em uso. O legado está preservado mas não é mais desenvolvido.

---

## Sistema Novo — Como Rodar

### Backend (FastAPI)

```bash
cd backend
venv\Scripts\activate          # Windows (venv já criado)
uvicorn app.main:app --host 0.0.0.0 --port 8000
# API disponível em http://localhost:8000
# Swagger em http://localhost:8000/api/docs
```

### Frontend (React + Vite)

```bash
cd frontend
npm run dev
# Disponível em http://localhost:5173
```

### Banco de dados

O backend usa **SQLite por padrão** (`backend/app/database/padaria.db`) quando `DB_HOST=sqlite` no `.env`. Para MySQL, configure as variáveis `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` no `.env`.

Para recriar o banco do zero:

```bash
cd backend
venv\Scripts\python.exe seed_dev.py
```

### Credenciais padrão

| Perfil | Email | Senha |
|---|---|---|
| Admin | admin@padaria.com | Admin@1234 |
| Caixa | caixa@padaria.com | Caixa@1234 |
| Estoquista | estoque@padaria.com | Estoque@1234 |

---

## Arquitetura do Backend

**Stack:** FastAPI + SQLAlchemy 2.0 async + aiosqlite (dev) / aiomysql (prod)

**Fluxo de request:** `Router → Dependency (auth) → Service → SQLAlchemy model → DB`

**Gerenciamento de transações:** O `get_db()` em `app/database.py` faz `commit` automático ao final de cada request e `rollback` em exceção. Os services **não usam** `async with db.begin()` — usam apenas `await db.flush()` para obter IDs gerados antes do commit final.

**Autenticação:** JWT Bearer via `app/dependencies/auth.py`. Token decodificado em `get_current_user`. Perfis: `admin`, `gerente`, `caixa`, `estoquista`. Guards: `require_admin`, `require_caixa`, `require_estoque`.

**Modelos** (`app/models/`):
- `usuario.py` — `Usuario` com bcrypt direto (sem passlib)
- `produto.py` — `Produto`, `Categoria`, `Fornecedor`
- `venda.py` — `Venda`, `ItemVenda`, `Pagamento`
- `caixa.py` — `Caixa`, `SessaoCaixa`, `MovimentacaoCaixa`
- `estoque.py` — `MovimentacaoEstoque`
- `auditoria.py` — `LogAuditoria` (append-only)

**Routers** (`app/routers/`): `auth`, `produtos`, `vendas`, `caixa`, `estoque`, `dashboard`, `relatorios`, `usuarios`, `categorias`, `fornecedores`, `compras`, `auditoria`

**Services** (`app/services/`):
- `venda_service.py` — lógica atômica de venda: valida sessão → verifica estoque → cria Venda/itens/pagamentos → deduz estoque → atualiza totais da sessão → audit log
- `caixa_service.py` — abertura/fechamento/sangria/suprimento
- `dashboard_service.py` — KPIs, vendas por dia, curva ABC
- `escpos_service.py` — geração de bytes ESC/POS para impressora térmica

**Atenção SQLite:** PKs devem ser `Integer` (não `BigInteger` ou `SmallInteger`) para autoincrement funcionar. `SAEnum` sem parâmetro `name=`. Pool de conexões desabilitado para SQLite.

---

## Arquitetura do Frontend

**Stack:** React 18 + Vite + TypeScript + Zustand + React Query v3 + TailwindCSS + Recharts + Axios

**Estado global** (`src/store/`):
- `authStore.ts` — tokens JWT persistidos no localStorage
- `pdvStore.ts` — carrinho de compras e sessaoId ativo

**API** (`src/config/api.ts`): instância Axios com interceptor que injeta Bearer token e faz refresh automático no 401.

**Páginas** (`src/pages/`):
- `PDV/PDVPage.tsx` — frente de caixa com scanner de código de barras e `PaymentModal`
- `PDV/SessaoGuard.tsx` — bloqueia PDV se não houver caixa aberto, exibe modal de abertura
- `Estoque/EstoquePage.tsx` — CRUD de produtos (criar/editar/remover) + ajuste de estoque
- `Dashboard/DashboardPage.tsx` — KPIs, gráfico de barras, curva ABC, alertas
- `Caixa/CaixaPage.tsx` — sangria, suprimento, fechar caixa

**Scanner de código de barras** (`src/hooks/useBarcodeScanner.ts`): detecta leitura por timing (< 80ms entre teclas = scanner HID, ex: Knup). Funciona em qualquer campo de texto também com digitação manual.

---

## Sistema Legado (Flask)

Iniciar: `venv\Scripts\activate && python app.py` → http://127.0.0.1:5000

Login: `admin` / `1234` ou `caixa` / `1234`

Toda a lógica está em `app.py` (rotas + controllers). Modelos em `models/`. Frontend em `templates/` (Jinja2) + `static/js/` (vanilla JS). Não há separação backend/frontend.
