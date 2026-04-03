-- =============================================================================
-- ERP Padaria - Seed Data
-- =============================================================================
USE erp_padaria;

-- Categorias
INSERT INTO categorias (nome, descricao, ativo, created_at, updated_at) VALUES
('Pães',       'Pães e produtos panificados',      1, NOW(), NOW()),
('Bolos',      'Bolos e tortas',                   1, NOW(), NOW()),
('Salgados',   'Salgados assados e fritos',        1, NOW(), NOW()),
('Bebidas',    'Bebidas frias e quentes',           1, NOW(), NOW()),
('Doces',      'Doces e confeitaria',              1, NOW(), NOW()),
('Frios',      'Frios e laticínios',               1, NOW(), NOW()),
('Outros',     'Demais produtos',                  1, NOW(), NOW());

-- Fornecedores
INSERT INTO fornecedores (razao_social, cnpj, telefone, email, ativo, created_at, updated_at) VALUES
('Distribuidora Farinha & Cia',  '12.345.678/0001-90', '(11) 99999-1111', 'farinha@exemplo.com.br', 1, NOW(), NOW()),
('Bebidas Norte Sul Ltda',       '98.765.432/0001-10', '(11) 99999-2222', 'bebidas@exemplo.com.br', 1, NOW(), NOW()),
('Laticínios do Vale',           '11.222.333/0001-44', '(11) 99999-3333', 'laticinios@exemplo.com.br', 1, NOW(), NOW());

-- Admin user (senha: Admin@1234)
-- Hash gerado via bcrypt rounds=12
INSERT INTO usuarios (uuid, nome, email, senha_hash, perfil, ativo, created_at, updated_at) VALUES
(UUID(), 'Administrador', 'admin@padaria.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2oJciJm8Ry',
 'admin', 1, NOW(), NOW()),
(UUID(), 'Operador Caixa', 'caixa@padaria.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2oJciJm8Ry',
 'caixa', 1, NOW(), NOW()),
(UUID(), 'Estoquista', 'estoque@padaria.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2oJciJm8Ry',
 'estoquista', 1, NOW(), NOW());

-- Caixa padrão
INSERT INTO caixas (nome, descricao, ativo, created_at, updated_at) VALUES
('Caixa 01', 'Caixa principal', 1, NOW(), NOW()),
('Caixa 02', 'Caixa secundário', 1, NOW(), NOW());

-- Produtos de exemplo
INSERT INTO produtos
  (codigo_barras, sku, nome, categoria_id, fornecedor_id, unidade_medida,
   preco_custo, preco_venda, estoque_atual, estoque_minimo, estoque_maximo, ativo, created_at, updated_at)
VALUES
('7891000315507', 'PAO-FRANCES',  'Pão Francês (unidade)',       1, 1, 'un',  0.25,  0.60, 200,  50,  500, 1, NOW(), NOW()),
('7891000315514', 'PAO-FORMA',    'Pão de Forma 500g',           1, 1, 'un',  3.50,  6.99,  30,   5,  100, 1, NOW(), NOW()),
('7891000315521', 'PAO-INTEGRAL', 'Pão Integral 400g',           1, 1, 'un',  4.20,  8.50,  20,   5,   80, 1, NOW(), NOW()),
('7891000315528', 'BOLO-CENOURA', 'Bolo de Cenoura (fatia)',     2, 1, 'un',  2.00,  4.50,  15,   3,   50, 1, NOW(), NOW()),
('7891000315535', 'BOLO-CHOCO',   'Bolo de Chocolate (fatia)',   2, 1, 'un',  2.20,  5.00,  15,   3,   50, 1, NOW(), NOW()),
('7891000315542', 'COXINHA',      'Coxinha de Frango',           3, 1, 'un',  1.50,  3.50,  40,  10,  100, 1, NOW(), NOW()),
('7891000315549', 'ENROLADO',     'Enrolado de Salsicha',        3, 1, 'un',  1.20,  3.00,  40,  10,  100, 1, NOW(), NOW()),
('7891000315556', 'CAFE-P',       'Café Coado (copo pequeno)',   4, NULL,'un', 0.30,  2.00,   0,   0,    0, 1, NOW(), NOW()),
('7891000315563', 'CAFE-G',       'Café Coado (copo grande)',    4, NULL,'un', 0.40,  3.00,   0,   0,    0, 1, NOW(), NOW()),
('7891000315570', 'SUCO-LAR',     'Suco de Laranja (300ml)',     4, NULL,'un', 1.80,  4.50,  10,   3,   30, 1, NOW(), NOW()),
('7891000315577', 'REFRIGERANTE', 'Refrigerante Lata 350ml',     4, 2,   'un', 2.50,  5.00,  24,   6,   72, 1, NOW(), NOW()),
('7891000315584', 'DOCE-LEITE',   'Doce de Leite 200g',          5, 3,   'un', 4.00,  8.00,  12,   3,   30, 1, NOW(), NOW()),
('7891000315591', 'QUEIJO-MINAS', 'Queijo Minas Frescal 400g',   6, 3,   'un', 7.50, 14.90,  10,   3,   20, 1, NOW(), NOW()),
('7891000315598', 'MANTEIGA',     'Manteiga com Sal 200g',       6, 3,   'un', 5.00,  9.90,  15,   5,   30, 1, NOW(), NOW());
