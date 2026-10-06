// =============================================================================
// controllers/usuariosController.js — cadastro, login e troca de senha.
// =============================================================================

// bcryptjs transforma a senha num "hash": um código embaralhado que não dá para
// desfazer. O banco guarda só o hash; no login, comparamos a senha com ele.
const bcrypt = require('bcryptjs');

// Funções do banco: get = busca uma linha, run = insere/altera.
const { get, run } = require('../database');

// jsonwebtoken cria o token de login; jwtSecret é a chave que assina o token.
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../middlewares/autenticacao');

// -----------------------------------------------------------------------------
// POST /api/cadastro — cria uma conta nova.
// -----------------------------------------------------------------------------
async function cadastrar(request, response) {
  // Lê o formulário. trim() tira espaços nas pontas; o email vai em minúsculas
  // para "Ana@x.com" e "ana@x.com" serem a mesma conta.
  const nome = String(request.body.nome || '').trim();
  const email = String(request.body.email || '').trim().toLowerCase();
  const senha = String(request.body.senha || '');

  // O backend valida de novo, porque o navegador pode ser manipulado.
  if (!nome || !email || !senha) {
    return response.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
  }

  // Confere o formato básico "algo@algo.algo".
  const emailPareceValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailPareceValido) {
    return response.status(400).json({ mensagem: 'Informe um email válido.' });
  }

  // Senha mínima de 6 caracteres, para evitar senhas fáceis demais.
  if (senha.length < 6) {
    return response.status(400).json({ mensagem: 'A senha deve possuir pelo menos 6 caracteres.' });
  }

  try {
    // Confere se o email já tem conta, para dar uma mensagem amigável.
    const usuarioExistente = await get('SELECT id FROM usuarios WHERE email = ?', [email]);

    if (usuarioExistente) {
      // 409 = conflito: já existe uma conta com este email.
      return response.status(409).json({ mensagem: 'Este email já está cadastrado.' });
    }

    // Gera o hash da senha. O 12 é o "custo": quanto maior, mais difícil de quebrar.
    const senhaHash = await bcrypt.hash(senha, 12);

    // Os "?" são preenchidos com segurança, sem o texto virar comando SQL.
    const resultado = await run(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    // 201 = criado. Nunca devolvemos a senha nem o hash ao navegador.
    return response.status(201).json({
      mensagem: 'Cadastro realizado com sucesso.',
      usuario: { id: resultado.id, nome, email }
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível realizar o cadastro.' });
  }
}

// -----------------------------------------------------------------------------
// POST /api/login — confere email e senha e devolve um token de acesso.
// -----------------------------------------------------------------------------
async function entrar(request, response) {
  // O email é normalizado; a senha fica exatamente como foi digitada.
  const email = String(request.body.email || '').trim().toLowerCase();
  const senha = String(request.body.senha || '');

  if (!email || !senha) {
    return response.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
  }

  try {
    // Busca a conta pelo email. O hash só é usado aqui no servidor, para comparar.
    const usuario = await get(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?',
      [email]
    );

    // A mesma mensagem serve para "email não existe" e "senha errada",
    // assim ninguém descobre quais emails têm conta.
    if (!usuario) {
      return response.status(401).json({ mensagem: 'Email ou senha incorretos.' });
    }

    // Compara a senha digitada com o hash salvo.
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return response.status(401).json({ mensagem: 'Email ou senha incorretos.' });
    }

    // Cria o token que identifica o usuário nas próximas requisições
    // (por exemplo, ao finalizar um pedido). Ele vale por 8 horas.
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // O navegador guarda o token e os dados básicos (veja account.js).
    return response.json({
      mensagem: 'Login realizado com sucesso.',
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      token
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível realizar o login.' });
  }
}

// -----------------------------------------------------------------------------
// PATCH /api/usuarios/senha — troca a senha de quem está logado.
// -----------------------------------------------------------------------------
async function alterarSenha(request, response) {
  const senhaAtual = String(request.body.senha_atual || '');
  const novaSenha = String(request.body.nova_senha || '');

  if (!senhaAtual || !novaSenha) {
    return response.status(400).json({ mensagem: 'Preencha a senha atual e a nova senha.' });
  }

  // Mesma regra do cadastro: pelo menos 6 caracteres.
  if (novaSenha.length < 6) {
    return response.status(400).json({ mensagem: 'A nova senha deve possuir pelo menos 6 caracteres.' });
  }

  try {
    // O id do usuário vem do token (já conferido pelo middleware), nunca do navegador.
    const usuario = await get('SELECT id, senha_hash FROM usuarios WHERE id = ?', [request.usuario.id]);

    if (!usuario) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    // Só deixa trocar se a senha atual estiver certa.
    const senhaAtualCorreta = await bcrypt.compare(senhaAtual, usuario.senha_hash);

    if (!senhaAtualCorreta) {
      return response.status(401).json({ mensagem: 'A senha atual está incorreta.' });
    }

    // Salva só o hash da nova senha e registra a data da alteração.
    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
    await run(
      'UPDATE usuarios SET senha_hash = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
      [novaSenhaHash, request.usuario.id]
    );

    return response.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível alterar a senha.' });
  }
}

// Exporta as funções para o arquivo de rotas (routes/usuarios.js).
module.exports = { cadastrar, entrar, alterarSenha };
