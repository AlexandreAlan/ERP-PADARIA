-- =============================================================================
-- ERP Padaria - Schema MySQL 8.0
-- =============================================================================

CREATE DATABASE IF NOT EXISTS erp_padaria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE erp_padaria;

-- =============================================================================
-- USUARIOS
-- =============================================================================
CREATE TABLE usuarios (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid        CHAR(36)        NOT NULL,
    nome        VARCHAR(100)    NOT NULL,
    email       VARCHAR(150)    NOT NULL,
    senha_hash  VARCHAR(255)    NOT NULL,
    perfil      ENUM('admin','gerente','caixa','estoquista') NOT NULL DEFAULT 'caixa',
    ativo       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  DATETIME        NOT NULL,
    updated_at  DATETIME        NOT NULL,
    deleted_at  DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_uuid  (uuid),
    UNIQUE KEY uq_usuarios_email (email),
    KEY idx_usuarios_perfil (perfil),
    KEY idx_usuarios_ativo  (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CATEGORIAS
-- =============================================================================
CREATE TABLE categorias (
    id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(80)  NOT NULL,
    descricao   TEXT         NULL,
    ativo       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categorias_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- FORNECEDORES
-- =============================================================================
CREATE TABLE fornecedores (
    id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    razao_social VARCHAR(150) NOT NULL,
    cnpj        CHAR(18)      NULL,
    telefone    VARCHAR(20)   NULL,
    email       VARCHAR(150)  NULL,
    ativo       TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL,
    updated_at  DATETIME      NOT NULL,
    deleted_at  DATETIME      NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fornecedores_cnpj (cnpj),
    KEY idx_fornecedores_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- PRODUTOS
-- =============================================================================
CREATE TABLE produtos (
    id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    codigo_barras    VARCHAR(50)     NULL,
    sku              VARCHAR(50)     NULL,
    nome             VARCHAR(150)    NOT NULL,
    descricao        TEXT            NULL,
    categoria_id     SMALLINT UNSIGNED NOT NULL,
    fornecedor_id    INT UNSIGNED    NULL,
    unidade_medida   ENUM('un','kg','g','l','ml','pct') NOT NULL DEFAULT 'un',
    preco_custo      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    preco_venda      DECIMAL(10,2)   NOT NULL,
    estoque_atual    DECIMAL(10,3)   NOT NULL DEFAULT 0.000,
    estoque_minimo   DECIMAL(10,3)   NOT NULL DEFAULT 0.000,
    estoque_maximo   DECIMAL(10,3)   NULL,
    imagem_url       VARCHAR(500)    NULL,
    ativo            TINYINT(1)      NOT NULL DEFAULT 1,
    created_at       DATETIME        NOT NULL,
    updated_at       DATETIME        NOT NULL,
    deleted_at       DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_produtos_codigo_barras (codigo_barras),
    UNIQUE KEY uq_produtos_sku          (sku),
    KEY idx_produtos_categoria   (categoria_id),
    KEY idx_produtos_fornecedor  (fornecedor_id),
    KEY idx_produtos_estoque_min (estoque_atual, estoque_minimo),
    KEY idx_produtos_ativo       (ativo),
    FULLTEXT KEY ft_produtos_nome (nome),
    CONSTRAINT fk_produtos_categoria  FOREIGN KEY (categoria_id)  REFERENCES categorias(id),
    CONSTRAINT fk_produtos_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MOVIMENTACOES DE ESTOQUE (ledger append-only)
-- =============================================================================
CREATE TABLE movimentacoes_estoque (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    produto_id      INT UNSIGNED    NOT NULL,
    tipo            ENUM('entrada','saida','ajuste','perda','devolucao','venda') NOT NULL,
    quantidade      DECIMAL(10,3)   NOT NULL,
    saldo_antes     DECIMAL(10,3)   NOT NULL,
    saldo_depois    DECIMAL(10,3)   NOT NULL,
    custo_unit      DECIMAL(10,2)   NULL,
    referencia_id   BIGINT UNSIGNED NULL,
    referencia_tipo ENUM('venda','compra','ajuste_manual') NULL,
    usuario_id      BIGINT UNSIGNED NOT NULL,
    observacao      TEXT            NULL,
    created_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_movest_produto    (produto_id),
    KEY idx_movest_created    (created_at),
    KEY idx_movest_tipo       (tipo),
    KEY idx_movest_referencia (referencia_tipo, referencia_id),
    CONSTRAINT fk_movest_produto  FOREIGN KEY (produto_id)  REFERENCES produtos(id),
    CONSTRAINT fk_movest_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CAIXAS (physical cash drawer registration)
-- =============================================================================
CREATE TABLE caixas (
    id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(80)   NOT NULL,
    descricao       VARCHAR(255)  NULL,
    ativo           TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL,
    updated_at      DATETIME      NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_caixas_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SESSOES DE CAIXA
-- =============================================================================
CREATE TABLE sessoes_caixa (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    caixa_id           INT UNSIGNED    NOT NULL,
    usuario_id         BIGINT UNSIGNED NOT NULL,
    status             ENUM('aberto','fechado') NOT NULL DEFAULT 'aberto',
    valor_abertura     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    valor_fechamento   DECIMAL(10,2)   NULL,
    total_vendas       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    total_sangrias     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    total_suprimentos  DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    diferenca          DECIMAL(10,2)   NULL,
    observacao         TEXT            NULL,
    opened_at          DATETIME        NOT NULL,
    closed_at          DATETIME        NULL,
    PRIMARY KEY (id),
    KEY idx_sessoes_caixa_status  (caixa_id, status),
    KEY idx_sessoes_caixa_usuario (usuario_id),
    KEY idx_sessoes_caixa_opened  (opened_at),
    CONSTRAINT fk_sessoes_caixa    FOREIGN KEY (caixa_id)   REFERENCES caixas(id),
    CONSTRAINT fk_sessoes_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- MOVIMENTACOES DE CAIXA (sangria / suprimento)
-- =============================================================================
CREATE TABLE movimentacoes_caixa (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sessao_id   BIGINT UNSIGNED NOT NULL,
    tipo        ENUM('sangria','suprimento') NOT NULL,
    valor       DECIMAL(10,2)   NOT NULL,
    motivo      VARCHAR(255)    NOT NULL,
    usuario_id  BIGINT UNSIGNED NOT NULL,
    created_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_movcaixa_sessao (sessao_id),
    CONSTRAINT fk_movcaixa_sessao  FOREIGN KEY (sessao_id)  REFERENCES sessoes_caixa(id),
    CONSTRAINT fk_movcaixa_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VENDAS (sale header)
-- =============================================================================
CREATE TABLE vendas (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid                 CHAR(36)        NOT NULL,
    sessao_id            BIGINT UNSIGNED NOT NULL,
    usuario_id           BIGINT UNSIGNED NOT NULL,
    status               ENUM('rascunho','concluida','cancelada') NOT NULL DEFAULT 'rascunho',
    subtotal             DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    desconto_valor       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    desconto_pct         DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    total                DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    troco                DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    observacao           TEXT            NULL,
    cancelado_por        BIGINT UNSIGNED NULL,
    cancelado_em         DATETIME        NULL,
    motivo_cancelamento  TEXT            NULL,
    created_at           DATETIME        NOT NULL,
    updated_at           DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vendas_uuid     (uuid),
    KEY idx_vendas_sessao  (sessao_id),
    KEY idx_vendas_status  (status),
    KEY idx_vendas_created (created_at),
    KEY idx_vendas_usuario (usuario_id),
    CONSTRAINT fk_vendas_sessao       FOREIGN KEY (sessao_id)     REFERENCES sessoes_caixa(id),
    CONSTRAINT fk_vendas_usuario      FOREIGN KEY (usuario_id)    REFERENCES usuarios(id),
    CONSTRAINT fk_vendas_cancelado_por FOREIGN KEY (cancelado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ITENS DE VENDA
-- =============================================================================
CREATE TABLE itens_venda (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    venda_id     BIGINT UNSIGNED NOT NULL,
    produto_id   INT UNSIGNED    NOT NULL,
    quantidade   DECIMAL(10,3)   NOT NULL,
    preco_unit   DECIMAL(10,2)   NOT NULL,
    custo_unit   DECIMAL(10,2)   NOT NULL,
    desconto_unit DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    total_item   DECIMAL(10,2)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_itensvenda_venda   (venda_id),
    KEY idx_itensvenda_produto (produto_id),
    CONSTRAINT fk_itensvenda_venda   FOREIGN KEY (venda_id)   REFERENCES vendas(id),
    CONSTRAINT fk_itensvenda_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- PAGAMENTOS (supports split payment per sale)
-- =============================================================================
CREATE TABLE pagamentos (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    venda_id    BIGINT UNSIGNED NOT NULL,
    forma       ENUM('dinheiro','cartao_credito','cartao_debito','pix','vale') NOT NULL,
    valor       DECIMAL(10,2)   NOT NULL,
    nsu         VARCHAR(50)     NULL,
    status      ENUM('pendente','aprovado','recusado') NOT NULL DEFAULT 'aprovado',
    created_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_pagamentos_venda (venda_id),
    KEY idx_pagamentos_forma (forma),
    CONSTRAINT fk_pagamentos_venda FOREIGN KEY (venda_id) REFERENCES vendas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- COMPRAS (purchase orders)
-- =============================================================================
CREATE TABLE compras (
    id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    fornecedor_id INT UNSIGNED  NOT NULL,
    usuario_id    BIGINT UNSIGNED NOT NULL,
    status        ENUM('rascunho','confirmado','recebido','cancelado') NOT NULL DEFAULT 'rascunho',
    total         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    nota_fiscal   VARCHAR(50)   NULL,
    data_entrega  DATE          NULL,
    created_at    DATETIME      NOT NULL,
    updated_at    DATETIME      NOT NULL,
    PRIMARY KEY (id),
    KEY idx_compras_fornecedor (fornecedor_id),
    KEY idx_compras_status     (status),
    KEY idx_compras_created    (created_at),
    CONSTRAINT fk_compras_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
    CONSTRAINT fk_compras_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ITENS DE COMPRA
-- =============================================================================
CREATE TABLE itens_compra (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    compra_id   INT UNSIGNED    NOT NULL,
    produto_id  INT UNSIGNED    NOT NULL,
    quantidade  DECIMAL(10,3)   NOT NULL,
    custo_unit  DECIMAL(10,2)   NOT NULL,
    total_item  DECIMAL(10,2)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_itenscompra_compra   (compra_id),
    KEY idx_itenscompra_produto  (produto_id),
    CONSTRAINT fk_itenscompra_compra   FOREIGN KEY (compra_id)  REFERENCES compras(id),
    CONSTRAINT fk_itenscompra_produto  FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- LOG DE AUDITORIA (append-only)
-- =============================================================================
CREATE TABLE logs_auditoria (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id      BIGINT UNSIGNED NULL,
    entidade        VARCHAR(50)     NOT NULL,
    entidade_id     VARCHAR(50)     NOT NULL,
    acao            ENUM('criar','editar','deletar','login','logout','cancelar','ajuste') NOT NULL,
    dados_anteriores JSON           NULL,
    dados_novos     JSON            NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(500)    NULL,
    created_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_audit_entidade  (entidade, entidade_id),
    KEY idx_audit_usuario   (usuario_id),
    KEY idx_audit_created   (created_at),
    KEY idx_audit_acao      (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
