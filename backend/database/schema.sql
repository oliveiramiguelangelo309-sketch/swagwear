-- Ativa a validacao das chaves estrangeiras no SQLite.
PRAGMA foreign_keys = ON;

-- Guarda as contas dos clientes.
-- A senha nunca deve ser salva como texto: futuramente, a API salvará somente o hash.
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Guarda o catálogo e os atributos que poderão alimentar recomendações de looks.
-- O preço do catálogo usa valor decimal; pedidos congelam os valores em centavos.
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  preco REAL NOT NULL CHECK (preco >= 0),
  descricao TEXT,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cor TEXT,
  estilo TEXT,
  colecao TEXT,
  imagem TEXT NOT NULL,
  imagem_sem_fundo TEXT,
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Guarda cada compra feita por um usuário.
-- O método pode ser registrado, mas dados de cartão, validade e CVV não pertencem a esta tabela.
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado')),
  metodo_pagamento TEXT
    CHECK (metodo_pagamento IS NULL OR metodo_pagamento IN ('cartao', 'pix', 'boleto')),
  total_centavos INTEGER NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Liga os produtos aos pedidos e registra quantidade e preço no momento da compra.
-- O preço é copiado porque o valor do catálogo pode mudar depois que o pedido for feito.
CREATE TABLE IF NOT EXISTS itens_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos >= 0),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Estes índices deixam buscas comuns mais rápidas conforme o banco crescer.
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_colecao ON produtos(colecao);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
