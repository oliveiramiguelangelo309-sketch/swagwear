// Importa as consultas ao SQLite usadas para listar e localizar produtos.
const { all, get } = require('../database');

// Colunas públicas devolvidas pela API. O campo interno "ativo" não precisa ir ao navegador.
const colunasPublicas = `
  id, nome, preco, descricao, tipo, categoria, cor, estilo, colecao,
  imagem, imagem_sem_fundo, estoque, criado_em
`;

// PostgreSQL devolve NUMERIC como texto; esta função mantém o contrato da API igual ao SQLite.
function normalizarProduto(produto) {
  return produto ? { ...produto, preco: Number(produto.preco) } : produto;
}

// Retorna todos os produtos ativos, ordenados pelo id de criação.
async function listar(request, response) {
  try {
    const produtos = await all(
      `SELECT ${colunasPublicas} FROM produtos WHERE ativo = 1 ORDER BY id`
    );

    return response.json(produtos.map(normalizarProduto));
  } catch (error) {
    console.error('Erro ao listar produtos:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar os produtos.' });
  }
}

// Retorna um produto ativo a partir do número recebido em /api/produtos/:id.
async function buscarPorId(request, response) {
  const id = Number(request.params.id);

  // O id precisa ser um número inteiro positivo antes de chegar ao banco.
  if (!Number.isInteger(id) || id <= 0) {
    return response.status(400).json({ mensagem: 'O id do produto é inválido.' });
  }

  try {
    const produto = await get(
      `SELECT ${colunasPublicas} FROM produtos WHERE id = ? AND ativo = 1`,
      [id]
    );

    if (!produto) {
      return response.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    return response.json(normalizarProduto(produto));
  } catch (error) {
    console.error('Erro ao buscar produto:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar o produto.' });
  }
}

// Exporta as funções para que o arquivo de rotas possa usá-las.
module.exports = { listar, buscarPorId };
