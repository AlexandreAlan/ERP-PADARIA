# Changelog

All notable changes to ERP Padaria are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Não lançado]

### Added
- **Fabricante/marca** no cadastro de produto (além do fornecedor/distribuidor)
- **Importação do XML da NF-e** em Compras: lê fornecedor e itens do XML que o
  fornecedor manda junto da mercadoria, casa produto existente por código de
  barras/SKU, mostra uma prévia pra conferir antes de lançar a compra
- **Exportar/Importar Excel** do catálogo de produtos, com atualização em lote
  (casa por id/código de barras/SKU); a quantidade em estoque nunca é alterada
  pela importação — só por compra ou ajuste, preservando a auditoria
- Migração automática e idempotente de colunas novas em produção (o projeto não
  usa Alembic; até então uma coluna nova exigia intervenção manual no banco)
- **Conciliação bancária**: importação de extrato OFX (com dedupe por FITID),
  sugestão automática de PIX/dinheiro por valor+data, e conciliação manual do
  que sobrar
- **Contratos de cartão**: cadastro de operadora (Stone/Cielo/Rede/etc.) e taxa
  por bandeira/tipo/parcelas, com cálculo do valor líquido esperado e prazo de
  recebimento
- **Relatório Dinâmico**: tabela dinâmica de vendas (dimensão + métrica à
  escolha do usuário) com exportação em Excel

### Security
- XML da NF-e é lido com `defusedxml` (proteção contra XML bomb/XXE), não o
  `xml.etree.ElementTree` puro

## [1.3.0] — 2026-07-27

### Added
- **Suíte de testes automatizados** (o projeto não tinha nenhum): **pytest** no backend cobrindo a lógica crítica do PDV (cálculo de venda, troco, desconto, baixa e estorno de estoque, fechamento de caixa e KPIs do dashboard, com SQLite em memória) e **vitest** no frontend (formatação de moeda e carrinho, garantindo paridade de cálculo com o backend) — 32 testes no total
- **Suporte cross-platform Windows + Linux/macOS**: scripts `instalar.sh` / `iniciar.sh` / `atualizar.sh` equivalentes aos `.bat`, e matriz de CI Ubuntu + Windows provando a portabilidade

### Changed
- **CI com gate de testes obrigatório**: o build da imagem e a publicação no release só ocorrem se `pytest` e `vitest` passarem (antes o `docker-publish` subia a imagem no release sem rodar teste nenhum)
- `APP_DEBUG` agora **desligado por padrão** (Swagger/OpenAPI e stack traces só com opt-in explícito)
- Versão do app FastAPI sincronizada (estava fixa em `1.0.0`)

### Security
- `config.py` **recusa iniciar em produção** (`APP_ENV=production`) com `JWT_SECRET_KEY` fraco/de exemplo ou com menos de 32 caracteres
- CI ganhou **scan de segurança**: `bandit` (análise estática, bloqueante) + `pip-audit` e `npm audit` (dependências, informativos)

---

## [1.2.0] — 2026-07-20

### Added
- Módulo de Clientes com histórico de compras e programa de fidelidade
- Módulo de Notificações in-app (sino no header, alertas automáticos de estoque)
- Perfil `sync_pdv` no model Usuario + dependency `require_sync` (permite `sync_pdv` ou `admin`) para as rotas de sincronização com o PDV offline

### Security
- Removida credencial hardcoded de `create_super_admin.py`
- Validação do conteúdo real da imagem (não só extensão) no upload de logo
- `npm audit fix` (ws, react-router)

### Fixed
- Imports não usados removidos (ruff)

### Docs
- README com badges (CI, licença, release, demo), seção de capturas de tela e link da demo ao vivo

---

## [1.1.0] — 2026-06-28

### Added
- **Compras** — página frontend completa: listagem com KPIs, criação de pedido por fornecedor, recebimento com entrada automática no estoque
- **Docs interna** — página de documentação do sistema para todos os perfis
- **Admin Central** — painel do `super_admin` para gerenciar clientes e instâncias
- **PWA** — manifest.json, favicon SVG e meta tags para instalação como app

### Changed
- Dashboard reimplementado com KPIs expandidos (margem real, ticket médio, curva ABC, produtos abaixo do mínimo)
- Estoque com indicador visual de alerta de estoque crítico e ordenação por urgência
- Auditoria com filtros avançados (período, usuário, ação) e modal de detalhes
- Sidebar atualizada com grupos Operação/Gestão/Sistema, links de Admin e Docs, e BottomNav mobile
- Login redesenhado com nova identidade visual
- Nova identidade visual: logos SVG, design system CSS com variáveis de cor

### Fixed
- 88 erros de lint no backend (ruff): imports não usados, comparações `== True`/`== None`, lambda como def, inline if
- Tipagem TypeScript estrita nos callbacks `onError` do react-query

### Security
- Backend rodando como não-root (UID 10001) no Dockerfile

---

## [1.0.0] — 2026-06-27

### Added
- **PDV** — frente de caixa completa com suporte a leitor de código de barras, pagamento misto (Dinheiro/Crédito/Débito/PIX/Vale), desconto por item/venda e impressão de cupom ESC/POS
- **Estoque** — CRUD de produtos com foto, código de barras, SKU, preço de custo/venda, unidade de medida e estoque mínimo; ajuste manual (entrada, saída, perda, inventário)
- **Controle de Caixa** — abertura com fundo inicial, sangria, suprimento, fechamento com totalização por forma de pagamento
- **Compras** — registro de ordens de compra por fornecedor com entrada automática no estoque
- **Dashboard** — KPIs em tempo real, gráfico de vendas 30 dias, curva ABC, alertas de estoque mínimo
- **Relatórios** — vendas por período, movimentações de estoque, exportação PDF e Excel
- **Auditoria** — log imutável de todas as operações sensíveis
- **Categorias hierárquicas** — subcategorias com validação de ciclo
- **Perfis de acesso** — `super_admin`, `admin`, `gerente`, `caixa`, `estoquista`
- **PWA** — manifest.json e meta tags para instalação como app
- **Multi-tenant Docker** — `docker-compose.yml` parametrizado + script `deploy/new-client.sh`
- **Instalador Windows** — `INSTALAR_SISTEMA.bat` instala tudo do zero em uma nova máquina

### Security
- Backend roda como usuário não-root (UID 10001) no Dockerfile
- JWT com access token de 8h + refresh token de 7 dias
- Auditoria imutável via API (sem endpoint de delete)
- Swagger desabilitado em `APP_DEBUG=false`

---

## [0.x] — Desenvolvimento inicial

Projeto em desenvolvimento interno. Sem releases públicas.

---

[Unreleased]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.0.0...v1.2.0
[1.1.0]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AlexandreAlan/ERP-PADARIA/releases/tag/v1.0.0
