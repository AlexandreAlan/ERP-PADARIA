# Changelog

All notable changes to ERP Padaria are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Unreleased]

### Added
- Módulo de Clientes com histórico de compras e programa de fidelidade
- Módulo de Notificações in-app (sino no header, alertas automáticos de estoque)
- Página de Docs interna do sistema
- Página Admin Central para super_admin gerenciar instâncias

### Changed
- Dashboard reimplementado com KPIs expandidos (margem real, ticket médio, curva ABC)
- Tela de Estoque com indicador visual de estoque crítico
- Tela de Auditoria com filtros avançados e modal de detalhes
- Sidebar atualizada com links de Admin e Docs

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

[Unreleased]: https://github.com/AlexandreAlan/ERP-PADARIA/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AlexandreAlan/ERP-PADARIA/releases/tag/v1.0.0
