# Padaria ERP - Gemini Instructions

Este arquivo contém as diretrizes fundamentais para o desenvolvimento e manutenção do ERP Padaria.

## Arquitetura do Sistema

O projeto está dividido em dois ecossistemas:

1.  **Sistema Legado:** Flask + Jinja2 (Localizado na raiz). **Não deve receber novas funcionalidades.** Apenas correções críticas.
2.  **Sistema Novo (Ativo):** Localizado em `backend/` e `frontend/`. Este é o foco principal do desenvolvimento.
3.  **WhatsApp Service:** Microserviço em Node.js para integração com WhatsApp.

## Backend (FastAPI) - Diretrizes

- **Stack:** FastAPI, SQLAlchemy 2.0 (Async), aiosqlite/aiomysql.
- **Padrão de Camadas:** `Router -> Dependency (Auth) -> Service -> SQLAlchemy Model -> DB`.
- **Transações:** Gerenciadas automaticamente pelo `get_db` em `app/database.py`. Realiza `commit` ao final do request e `rollback` em caso de erro.
    - **Atenção:** Os Services não devem usar `async with db.begin()`. Use `await db.flush()` se precisar de IDs gerados antes do commit final.
- **Modelos (SQLAlchemy):**
    - Use `Integer` para Primary Keys (essencial para autoincrement no SQLite).
    - Use `SAEnum` sem o parâmetro `name=` para compatibilidade SQLite.
- **Autenticação:** JWT Bearer via `app/dependencies/auth.py`. Perfis: `admin`, `gerente`, `caixa`, `estoquista`.
- **Auditoria:** Toda alteração significativa deve ser registrada em `LogAuditoria` (camada de Service).
- **Inteligência de Negócio:** Dashboard avançado com Curva ABC, comparativo de crescimento período a período e alertas de estoque.

## Frontend (React) - Diretrizes

- **Stack:** React 18, Vite, TypeScript, TailwindCSS.
- **Design System:** Estética "Premium Bakery" com tons quentes (`#E67E22`, `#FAF7F2`), focada em legibilidade e feedback visual (badges de crescimento, indicadores de urgência).
- **Estado Global:** Zustand (`src/store/`).
- **Data Fetching:** React Query v3.
- **Comunicação API:** Axios (`src/config/api.ts`) com interceptor para tokens JWT e auto-refresh.
- **PDV:** O componente de PDV possui um hook customizado `useBarcodeScanner.ts` para capturar leituras de scanners HID.

## WhatsApp Service - Diretrizes

- **Stack:** Node.js, `whatsapp-web.js`, Socket.io, Express.
- **Propósito:** Geração de QR Code, envio de recibos detalhados de venda e alertas automáticos de estoque baixo.
- **Integração:** Backend dispara eventos via HTTP POST para `/send-receipt` e `/send-message`.

## Fluxos de Desenvolvimento

### Comandos Comuns

- **Backend:** `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`
- **Frontend:** `cd frontend && npm run dev`
- **WhatsApp:** `cd whatsapp-service && node index.js`
- **Reset DB:** `cd backend && venv\Scripts\python.exe seed_dev.py`

### Testes e Validação

- Sempre valide mudanças no backend acessando o Swagger em `http://localhost:8000/api/docs`.
- Verifique a integridade dos tipos TypeScript no frontend após alterações em modelos ou schemas do backend.

## Convenções de Código

- **Surgical Updates:** Prefira edições mínimas e precisas.
- **Nomenclatura:** Backend em português para domínios (vendas, produtos) e inglês para infraestrutura. Frontend majoritariamente em inglês.
- **Documentação:** Mantenha os docstrings de API e tipos TypeScript atualizados.
