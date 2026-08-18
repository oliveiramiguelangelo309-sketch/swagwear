// Centraliza as consultas do pedido para que a rota continue pequena.
const { get, transaction } = require('../database');

const formasPagamento = ['cartao', 'pix', 'boleto'];

// Cria um pedido usando somente ids e quantidades enviados pelo navegador.
async function criarPedido(request, response) {
  const itensRecebidos = request.body.itens;
  const formaPagamento = String(request.body.forma_pagamento || '').toLowerCase();

  if (!Array.isArray(itensRecebidos) || itensRecebidos.length === 0) {
    return response.status(400).json({ mensagem: 'O pedido precisa possuir pelo menos um item.' });
  }

  if (itensRecebidos.length > 50) {
    return response.status(400).json({ mensagem: 'O pedido possui itens demais.' });
  }

  if (!formasPagamento.includes(formaPagamento)) {
    return response.status(400).json({ mensagem: 'Escolha uma forma de pagamento válida.' });
  }

  try {
    const itensValidados = [];

    // Consulta cada produto no banco; o preço recebido do frontend é completamente ignorado.
    for (const item of itensRecebidos) {
      const produtoId = Number(item.produto_id);
      const quantidade = Number(item.quantidade);

      if (!Number.isInteger(produtoId) || produtoId <= 0 ||
          !Number.isInteger(quantidade) || quantidade <= 0 || quantidade > 99) {
        return response.status(400).json({ mensagem: 'Produto ou quantidade inválida.' });
      }

      const produto = await get(
        'SELECT id, nome, preco, estoque FROM produtos WHERE id = ? AND ativo = 1',
        [produtoId]
      );

      if (!produto) {
        return response.status(404).json({ mensagem: `Produto ${produtoId} não encontrado.` });
      }

      if (produto.estoque < quantidade) {
        return response.status(409).json({ mensagem: `Estoque insuficiente para ${produto.nome}.` });
      }

      const precoUnitarioCentavos = Math.round(Number(produto.preco) * 100);
      itensValidados.push({ ...produto, quantidade, precoUnitarioCentavos });
    }

    const totalCentavos = itensValidados.reduce(
      (total, item) => total + item.precoUnitarioCentavos * item.quantidade,
      0
    );

    // O adaptador garante uma transação adequada tanto no SQLite quanto no PostgreSQL.
    const pedidoCriado = await transaction(async (database) => {
      const pedido = await database.run(
        `INSERT INTO pedidos (usuario_id, status, metodo_pagamento, total_centavos)
         VALUES (?, 'pendente', ?, ?)`,
        [request.usuario.id, formaPagamento, totalCentavos]
      );

      for (const item of itensValidados) {
        await database.run(
          `INSERT INTO itens_pedido
           (pedido_id, produto_id, quantidade, preco_unitario_centavos)
           VALUES (?, ?, ?, ?)`,
          [pedido.id, item.id, item.quantidade, item.precoUnitarioCentavos]
        );

        // A condição de estoque também protege contra outra compra feita ao mesmo tempo.
        const estoque = await database.run(
          'UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?',
          [item.quantidade, item.id, item.quantidade]
        );

        if (estoque.changes !== 1) {
          throw new Error('O estoque mudou durante a compra. Tente novamente.');
        }
      }

      return {
        id: pedido.id,
        status: 'pendente',
        forma_pagamento: formaPagamento,
        total: totalCentavos / 100,
        itens: itensValidados.map((item) => ({
          produto_id: item.id,
          nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.precoUnitarioCentavos / 100
        }))
      };
    });

    return response.status(201).json({
      mensagem: 'Pedido criado com sucesso.',
      pedido: pedidoCriado
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível criar o pedido.' });
  }
}

module.exports = { criarPedido };
