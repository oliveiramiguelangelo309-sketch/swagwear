-- =============================================================================
-- database/schema.sql — estrutura do banco SQLite (usado no computador).
-- -----------------------------------------------------------------------------
-- Cria as 4 tabelas da loja: usuarios, produtos, pedidos e itens_pedido.
-- "IF NOT EXISTS" faz o arquivo poder rodar várias vezes sem apagar nada.
-- A versão PostgreSQL (site online) fica em migrations/postgres/001_initial.sql.
-- =============================================================================

-- Liga a checagem de chaves estrangeiras (relações entre tabelas) no SQLite.
PRAGMA foreign_keys = ON;

-- Contas dos clientes.
-- A senha nunca é salva como texto: a API guarda somente o hash (bcrypt).
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,         -- número único, gerado sozinho
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,    -- único e sem diferenciar maiúsculas
  senha_hash TEXT NOT NULL,                     -- senha embaralhada pelo bcrypt
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de camisetas.
-- O preço do catálogo usa valor decimal; pedidos congelam os valores em centavos.
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  preco REAL NOT NULL CHECK (preco >= 0),       -- preço em reais, nunca negativo
  descricao TEXT,
  tipo TEXT NOT NULL,                           -- ex.: "camiseta"
  categoria TEXT NOT NULL,                      -- ex.: "parte_superior"
  cor TEXT,
  estilo TEXT,
  colecao TEXT,                                 -- nome do drop (ex.: "Baby Tee")
  imagem TEXT NOT NULL,                         -- caminho da foto (assets/produtos/...)
  imagem_sem_fundo TEXT,                        -- não usado atualmente (fica vazio)
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)), -- 0 = escondido da loja
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cada compra feita por um usuário.
-- O método pode ser registrado, mas dados de cartão, validade e CVV não pertencem a esta tabela.
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,                  -- quem comprou
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado')),
  metodo_pagamento TEXT
    CHECK (metodo_pagamento IS NULL OR metodo_pagamento IN ('cartao', 'pix', 'boleto')),
  total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (total_centavos >= 0), -- 14900 = R$ 149,00
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Itens de cada pedido: liga produtos a pedidos com quantidade e preço da compra.
-- O preço é copiado porque o valor do catálogo pode mudar depois que o pedido for feito.
CREATE TABLE IF NOT EXISTS itens_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos >= 0),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE, -- apagar o pedido apaga os itens
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Índices: deixam as buscas mais comuns mais rápidas conforme o banco crescer.
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_colecao ON produtos(colecao);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
