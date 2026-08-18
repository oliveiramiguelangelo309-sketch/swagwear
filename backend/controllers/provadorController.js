const { get } = require('../database');
const {
  gerarProvadorVirtual,
  mapearCategoriaProvador,
  isTryOnMockEnabled
} = require('../services/virtualTryOnService');

// Recebe a foto temporária e busca todos os dados confiáveis da roupa no SQLite.
async function gerar(request, response) {
  const produtoId = Number(request.body.produto_id);

  if (!request.file) {
    return response.status(400).json({ mensagem: 'Escolha ou tire uma foto primeiro.' });
  }

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return response.status(400).json({ mensagem: 'Selecione uma peça válida.' });
  }

  try {
    const produto = await get(
      `SELECT id, nome, tipo, categoria, descricao, imagem, imagem_sem_fundo
       FROM produtos WHERE id = ? AND ativo = 1`,
      [produtoId]
    );

    if (!produto) {
      return response.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    const mockAtivo = isTryOnMockEnabled();

    // A IA real exige a imagem preparada da roupa para não gastar créditos com entrada inadequada.
    if (!mockAtivo && !produto.imagem_sem_fundo) {
      return response.status(422).json({
        mensagem: 'Esta peça ainda não possui uma imagem preparada para o provador.'
      });
    }

    // A imagem comum é aceita somente no mock, que não chama o provedor nem gasta créditos.
    const imagemRoupa = produto.imagem_sem_fundo || produto.imagem;
    const categoriaIA = mapearCategoriaProvador(produto.tipo, produto.categoria);

    // O controller conhece apenas o contrato unico do servico, nao o cliente externo.
    const { imagemResultado } = await gerarProvadorVirtual({
      fotoPessoa: request.file,
      imagemRoupa,
      categoria: categoriaIA,
      descricao: produto.descricao || produto.nome
    });

    return response.json({
      mensagem: mockAtivo
        ? 'Visualização simulada gerada no modo de desenvolvimento.'
        : 'Visualização gerada com sucesso.',
      imagemResultado,
      mock: mockAtivo
    });
  } catch (error) {
    console.error('Erro no provador virtual:', error.message);

    if (['TOKEN_AUSENTE', 'HF_SPACE_AUSENTE', 'TRYON_PROVIDER_INVALIDO'].includes(error.code)) {
      return response.status(503).json({ mensagem: error.message });
    }

    if (error.code === 'TRYON_TIMEOUT') {
      return response.status(504).json({ mensagem: error.message });
    }

    if (error.code === 'TRYON_INVALID_INPUT') {
      return response.status(422).json({ mensagem: error.message });
    }

    if (['ZERO_GPU_UNAVAILABLE', 'HF_SPACE_UNAVAILABLE'].includes(error.code)) {
      return response.status(503).json({ mensagem: error.message });
    }

    return response.status(502).json({ mensagem: 'Não foi possível gerar a visualização agora.' });
  }
}

module.exports = { gerar };
