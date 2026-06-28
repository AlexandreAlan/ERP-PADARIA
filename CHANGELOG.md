# Changelog

All notable changes to ERP Padaria are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Unreleased]

### Added
- Módulo de Clientes com histórico de compras e programa de fidelidade
- Módulo de Notificações in-app (sino no header, alertas automáticos de estoque)

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

[Unreleased]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AlexandreAlan/ERP-PADARIA/releases/tag/v1.0.0
