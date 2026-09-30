// Centraliza as consultas do pedido para que a rota continue pequena.
const { run, get, all, transaction } = require('../database');
const { gerarBoletoDemonstrativo } = require('../services/boletoService');
const { gerarPixDemonstrativo } = require('../services/pixService');
const { enviarEmailDemonstrativo } = require('../services/emailService');

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

// Lista somente os pedidos que pertencem ao usuário identificado pelo JWT.
async function listarMeusPedidos(request, response) {
  try {
    // O LEFT JOIN mantém o pedido visível mesmo se algum item antigo estiver ausente.
    const linhas = await all(
      `SELECT
         p.id AS pedido_id, p.status, p.metodo_pagamento, p.total_centavos, p.criado_em,
         i.id AS item_id, i.produto_id, i.quantidade, i.preco_unitario_centavos,
         pr.nome AS produto_nome, pr.imagem AS produto_imagem
       FROM pedidos p
       LEFT JOIN itens_pedido i ON i.pedido_id = p.id
       LEFT JOIN produtos pr ON pr.id = i.produto_id
       WHERE p.usuario_id = ?
       ORDER BY p.criado_em DESC, p.id DESC, i.id ASC`,
      [request.usuario.id]
    );

    // O banco devolve uma linha por item; o Map agrupa os itens dentro de cada pedido.
    const pedidosPorId = new Map();

    for (const linha of linhas) {
      if (!pedidosPorId.has(linha.pedido_id)) {
        pedidosPorId.set(linha.pedido_id, {
          id: linha.pedido_id,
          status: linha.status,
          forma_pagamento: linha.metodo_pagamento,
          total: Number(linha.total_centavos || 0) / 100,
          criado_em: linha.criado_em,
          itens: []
        });
      }

      if (linha.item_id) {
        pedidosPorId.get(linha.pedido_id).itens.push({
          produto_id: linha.produto_id,
          nome: linha.produto_nome || 'Produto SwagWear',
          imagem: linha.produto_imagem || '',
          quantidade: linha.quantidade,
          preco_unitario: Number(linha.preco_unitario_centavos || 0) / 100
        });
      }
    }

    return response.json({ pedidos: Array.from(pedidosPorId.values()) });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar seus pedidos.' });
  }
}

// Confirma um pagamento simulado para a apresentação da FECIP.
// O WHERE inclui usuario_id: mesmo sabendo o número do pedido, outro usuário não pode alterá-lo.
async function confirmarPagamentoSimulado(request, response) {
  const pedidoId = Number(request.params.id);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return response.status(400).json({ mensagem: 'Pedido inválido.' });
  }

  try {
    const resultado = await run(
      `UPDATE pedidos
       SET status = 'pago', atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ? AND usuario_id = ? AND status = 'pendente'`,
      [pedidoId, request.usuario.id]
    );

    if (resultado.changes !== 1) {
      // A resposta genérica não revela se o pedido pertence a outra pessoa.
      return response.status(404).json({ mensagem: 'Pedido pendente não encontrado.' });
    }

    return response.json({
      mensagem: 'Pagamento simulado confirmado.',
      pedido: { id: pedidoId, status: 'pago' }
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento simulado:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível confirmar o pagamento.' });
  }
}

// Devolve a chave configurada somente ao usuário autenticado.
// A chave fica no .env e não precisa ser escrita no HTML ou no Git.
async function obterConfiguracaoPix(request, response) {
  const chavePix = String(process.env.PIX_KEY || '').trim();

  if (!chavePix) {
    return response.status(503).json({ mensagem: 'A chave PIX demonstrativa não foi configurada.' });
  }

  return response.json({
    chave: chavePix,
    aviso: 'Pagamento demonstrativo para fins acadêmicos.'
  });
}

// Prepara o PIX e o email antes de o botão demonstrativo mudar o pedido para pago.
async function prepararPixDoPedido(request, response) {
  const pedidoId = Number(request.params.id);
  const chavePix = String(process.env.PIX_KEY || '').trim();

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return response.status(400).json({ mensagem: 'Pedido inválido.' });
  }

  if (!chavePix) {
    return response.status(503).json({ mensagem: 'A chave PIX demonstrativa não foi configurada.' });
  }

  try {
    const pedido = await get(
      `SELECT p.id, p.status, p.metodo_pagamento, p.total_centavos,
              u.nome AS usuario_nome, u.email AS usuario_email
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = ? AND p.usuario_id = ?`,
      [pedidoId, request.usuario.id]
    );

    if (!pedido || pedido.status !== 'pendente' || pedido.metodo_pagamento !== 'pix') {
      return response.status(404).json({ mensagem: 'Pedido pendente por PIX não encontrado.' });
    }

    const pix = gerarPixDemonstrativo({
      pedidoId: pedido.id,
      nome: pedido.usuario_nome,
      email: pedido.usuario_email,
      totalCentavos: pedido.total_centavos,
      chavePix
    });
    const email = await enviarEmailDemonstrativo({
      destinatario: pedido.usuario_email,
      pedidoId: pedido.id,
      assunto: `PIX demonstrativo SwagWear — pedido #${pedido.id}`,
      html: pix.html
    });

    return response.json({
      mensagem: email.simulado
        ? 'Email PIX simulado com sucesso.'
        : 'Instruções PIX enviadas por email.',
      pix,
      email: { modo: email.modo, simulado: email.simulado }
    });
  } catch (error) {
    console.error('Erro ao preparar PIX demonstrativo:', error.message);
    const status = error.code === 'EMAIL_NAO_CONFIGURADO' ? 503 : 500;
    return response.status(status).json({ mensagem: error.message || 'Não foi possível preparar o PIX.' });
  }
}

// Gera o boleto somente depois de confirmar que pedido e email pertencem ao JWT.
async function gerarBoletoDoPedido(request, response) {
  const pedidoId = Number(request.params.id);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return response.status(400).json({ mensagem: 'Pedido inválido.' });
  }

  try {
    const pedido = await get(
      `SELECT p.id, p.status, p.metodo_pagamento, p.total_centavos,
              u.nome AS usuario_nome, u.email AS usuario_email
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = ? AND p.usuario_id = ?`,
      [pedidoId, request.usuario.id]
    );

    if (!pedido || pedido.status !== 'pendente' || pedido.metodo_pagamento !== 'boleto') {
      return response.status(404).json({ mensagem: 'Pedido pendente por boleto não encontrado.' });
    }

    const boleto = gerarBoletoDemonstrativo({
      pedidoId: pedido.id,
      nome: pedido.usuario_nome,
      email: pedido.usuario_email,
      totalCentavos: pedido.total_centavos
    });
    const email = await enviarEmailDemonstrativo({
      destinatario: pedido.usuario_email,
      pedidoId: pedido.id,
      assunto: `Boleto demonstrativo SwagWear — pedido #${pedido.id}`,
      html: boleto.html
    });

    return response.json({
      mensagem: email.simulado
        ? 'Email de boleto simulado com sucesso.'
        : 'Boleto demonstrativo enviado por email.',
      boleto,
      email: { modo: email.modo, simulado: email.simulado }
    });
  } catch (error) {
    console.error('Erro ao gerar boleto demonstrativo:', error.message);
    const status = error.code === 'EMAIL_NAO_CONFIGURADO' ? 503 : 500;
    return response.status(status).json({ mensagem: error.message || 'Não foi possível gerar o boleto.' });
  }
}

module.exports = {
  criarPedido,
  listarMeusPedidos,
  confirmarPagamentoSimulado,
  obterConfiguracaoPix,
  prepararPixDoPedido,
  gerarBoletoDoPedido
};
