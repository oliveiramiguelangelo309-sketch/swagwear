const { all, get, run } = require('../database');

const colunasPublicas = `
  id, nome, preco, descricao, tipo, categoria, cor, estilo, colecao,
  imagem, imagem_sem_fundo, estoque, criado_em
`;

const colunasAdmin = `
  id, nome, preco, descricao, tipo, categoria, cor, estilo, colecao,
  imagem, imagem_sem_fundo, estoque, ativo, criado_em, atualizado_em
`;

function normalizarProduto(produto) {
  return produto ? { ...produto, preco: Number(produto.preco) } : produto;
}

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

async function buscarPorId(request, response) {
  const id = Number(request.params.id);

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

async function listarAdmin(request, response) {
  try {
    const produtos = await all(`SELECT ${colunasAdmin} FROM produtos ORDER BY id`);
    return response.json(produtos.map(normalizarProduto));
  } catch (error) {
    console.error('Erro ao listar produtos (admin):', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível carregar os produtos.' });
  }
}

function validarCamposObrigatorios(dados) {
  const nome = String(dados.nome || '').trim();
  const tipo = String(dados.tipo || '').trim();
  const categoria = String(dados.categoria || '').trim();
  const imagem = String(dados.imagem || '').trim();
  const preco = Number(dados.preco);

  if (!nome || !tipo || !categoria || !imagem) {
    return { erro: 'Nome, tipo, categoria e imagem são obrigatórios.' };
  }

  if (!Number.isFinite(preco) || preco < 0) {
    return { erro: 'Informe um preço válido.' };
  }

  const estoque = dados.estoque === undefined ? 0 : Number(dados.estoque);

  if (!Number.isInteger(estoque) || estoque < 0) {
    return { erro: 'Informe um estoque válido.' };
  }

  return {
    valores: {
      nome,
      preco,
      descricao: String(dados.descricao || '').trim() || null,
      tipo,
      categoria,
      cor: String(dados.cor || '').trim() || null,
      estilo: String(dados.estilo || '').trim() || null,
      colecao: String(dados.colecao || '').trim() || null,
      imagem,
      imagem_sem_fundo: String(dados.imagem_sem_fundo || '').trim() || null,
      estoque
    }
  };
}

async function criar(request, response) {
  const { erro, valores } = validarCamposObrigatorios(request.body);

  if (erro) {
    return response.status(400).json({ mensagem: erro });
  }

  try {
    const resultado = await run(
      `INSERT INTO produtos
       (nome, preco, descricao, tipo, categoria, cor, estilo, colecao, imagem, imagem_sem_fundo, estoque)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        valores.nome, valores.preco, valores.descricao, valores.tipo, valores.categoria,
        valores.cor, valores.estilo, valores.colecao, valores.imagem, valores.imagem_sem_fundo,
        valores.estoque
      ]
    );

    const produto = await get(`SELECT ${colunasAdmin} FROM produtos WHERE id = ?`, [resultado.id]);

    return response.status(201).json({
      mensagem: 'Produto criado com sucesso.',
      produto: normalizarProduto(produto)
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível criar o produto.' });
  }
}

async function atualizar(request, response) {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return response.status(400).json({ mensagem: 'O id do produto é inválido.' });
  }

  const produtoExistente = await get('SELECT id FROM produtos WHERE id = ?', [id]);

  if (!produtoExistente) {
    return response.status(404).json({ mensagem: 'Produto não encontrado.' });
  }

  const camposEnviados = request.body || {};
  const camposPermitidos = [
    'nome', 'preco', 'descricao', 'tipo', 'categoria', 'cor',
    'estilo', 'colecao', 'imagem', 'imagem_sem_fundo', 'estoque', 'ativo'
  ];

  const colunas = [];
  const valores = [];

  for (const campo of camposPermitidos) {
    if (!(campo in camposEnviados)) continue;

    if (campo === 'preco') {
      const preco = Number(camposEnviados.preco);
      if (!Number.isFinite(preco) || preco < 0) {
        return response.status(400).json({ mensagem: 'Informe um preço válido.' });
      }
      colunas.push('preco = ?');
      valores.push(preco);
      continue;
    }

    if (campo === 'estoque') {
      const estoque = Number(camposEnviados.estoque);
      if (!Number.isInteger(estoque) || estoque < 0) {
        return response.status(400).json({ mensagem: 'Informe um estoque válido.' });
      }
      colunas.push('estoque = ?');
      valores.push(estoque);
      continue;
    }

    if (campo === 'ativo') {
      const ativo = camposEnviados.ativo ? 1 : 0;
      colunas.push('ativo = ?');
      valores.push(ativo);
      continue;
    }

    if (['nome', 'tipo', 'categoria', 'imagem'].includes(campo)) {
      const valor = String(camposEnviados[campo] || '').trim();
      if (!valor) {
        return response.status(400).json({ mensagem: `O campo ${campo} não pode ficar vazio.` });
      }
      colunas.push(`${campo} = ?`);
      valores.push(valor);
      continue;
    }

    const valor = String(camposEnviados[campo] || '').trim();
    colunas.push(`${campo} = ?`);
    valores.push(valor || null);
  }

  if (colunas.length === 0) {
    return response.status(400).json({ mensagem: 'Nenhum campo para atualizar foi enviado.' });
  }

  colunas.push('atualizado_em = CURRENT_TIMESTAMP');
  valores.push(id);

  try {
    await run(`UPDATE produtos SET ${colunas.join(', ')} WHERE id = ?`, valores);

    const produto = await get(`SELECT ${colunasAdmin} FROM produtos WHERE id = ?`, [id]);

    return response.json({
      mensagem: 'Produto atualizado com sucesso.',
      produto: normalizarProduto(produto)
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível atualizar o produto.' });
  }
}

module.exports = { listar, buscarPorId, listarAdmin, criar, atualizar };
