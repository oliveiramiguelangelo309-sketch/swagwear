// =============================================================================
// controllers/produtosController.js — lê as camisetas do catálogo no banco.
// -----------------------------------------------------------------------------
// "Controller" é a função que recebe a requisição de uma rota, consulta o
// banco e devolve a resposta (aqui sempre em JSON).
// =============================================================================

// Funções do banco: all = várias linhas, get = uma linha.
const { all, get } = require('../database');

// Colunas que o site pode mostrar ao público.
// A coluna "ativo" fica de fora: ela só serve para esconder produtos antigos.
const colunasPublicas = `
  id, nome, preco, descricao, tipo, categoria, cor, estilo, colecao,
  imagem, imagem_sem_fundo, estoque, criado_em
`;

// O PostgreSQL devolve o preço (tipo NUMERIC) como texto, por exemplo "149.00".
// Aqui convertemos para número (149), igual ao SQLite, para o frontend somar e formatar.
function normalizarProduto(produto) {
  return produto ? { ...produto, preco: Number(produto.preco) } : produto;
}

// GET /api/produtos — devolve todos os produtos ativos, em ordem de id.
async function listar(request, response) {
  try {
    const produtos = await all(
      `SELECT ${colunasPublicas} FROM produtos WHERE ativo = 1 ORDER BY id`
    );

    return response.json(produtos.map(normalizarProduto));
  } catch (error) {
    // O detalhe técnico fica no log; o visitante recebe uma mensagem simples.
    console.error('Erro ao listar produtos:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar os produtos.' });
  }
}

// GET /api/produtos/:id — devolve uma única camiseta pelo id da URL.
async function buscarPorId(request, response) {
  // O id chega como texto na URL ("3"); convertemos para número.
  const id = Number(request.params.id);

  // Recusa ids que não são números inteiros positivos (ex.: "abc", "-1", "2.5").
  if (!Number.isInteger(id) || id <= 0) {
    return response.status(400).json({ mensagem: 'O id do produto é inválido.' });
  }

  try {
    // O "?" é preenchido com o id de forma segura (evita SQL injection).
    const produto = await get(
      `SELECT ${colunasPublicas} FROM produtos WHERE id = ? AND ativo = 1`,
      [id]
    );

    // Produto inexistente ou desativado: responde 404 ("não encontrado").
    if (!produto) {
      return response.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    return response.json(normalizarProduto(produto));
  } catch (error) {
    console.error('Erro ao buscar produto:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar o produto.' });
  }
}

module.exports = { listar, buscarPorId };
