// bcryptjs transforma senhas em hashes e compara senhas sem revelar o valor original.
const bcrypt = require('bcryptjs');

// Estas funções permitem consultar e alterar o SQLite usando async/await.
const { get, run } = require('../database');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../middlewares/autenticacao');

// Express executa esta função quando o frontend envia POST /api/cadastro.
async function cadastrar(request, response) {
  // Lê os dados enviados pelo formulário e remove espaços desnecessários.
  const nome = String(request.body.nome || '').trim();
  const email = String(request.body.email || '').trim().toLowerCase();
  const senha = String(request.body.senha || '');

  // O backend valida novamente, pois dados enviados pelo navegador podem ser manipulados.
  if (!nome || !email || !senha) {
    return response.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
  }

  // Esta expressão faz uma validação básica do formato do email.
  const emailPareceValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailPareceValido) {
    return response.status(400).json({ mensagem: 'Informe um email válido.' });
  }

  // Uma senha mínima reduz o risco de contas protegidas por senhas muito fáceis.
  if (senha.length < 6) {
    return response.status(400).json({ mensagem: 'A senha deve possuir pelo menos 6 caracteres.' });
  }

  try {
    // Verifica o email antes da inserção para devolver uma mensagem amigável.
    const usuarioExistente = await get('SELECT id FROM usuarios WHERE email = ?', [email]);

    if (usuarioExistente) {
      return response.status(409).json({ mensagem: 'Este email já está cadastrado.' });
    }

    // O número 12 define o custo do hash: mais seguro que salvar a senha pura.
    const senhaHash = await bcrypt.hash(senha, 12);

    // Os pontos de interrogação evitam que o texto do usuário seja interpretado como SQL.
    const resultado = await run(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    // Nunca devolvemos senha nem hash para o navegador.
    return response.status(201).json({
      mensagem: 'Cadastro realizado com sucesso.',
      usuario: { id: resultado.id, nome, email }
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error.message);
    return response.status(500).json({ mensagem: 'Não foi possível realizar o cadastro.' });
  }
}

// Express executa esta função quando o frontend envia POST /api/login.
async function entrar(request, response) {
  // Normaliza o email e mantém a senha exatamente como foi digitada.
  const email = String(request.body.email || '').trim().toLowerCase();
  const senha = String(request.body.senha || '');

  if (!email || !senha) {
    return response.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
  }

  try {
    // Procura a conta pelo email e traz o hash apenas para a comparação no servidor.
    const usuario = await get(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?',
      [email]
    );

    // A mesma mensagem cobre email inexistente e senha incorreta, reduzindo exposição de contas.
    if (!usuario) {
      return response.status(401).json({ mensagem: 'Email ou senha incorretos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return response.status(401).json({ mensagem: 'Email ou senha incorretos.' });
    }

    // O token identifica o usuário nas próximas requisições, como a criação de pedidos.
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      jwtSecret,
      { expiresIn: '8h' }
    );

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

// Exporta os controladores para o arquivo de rotas de usuários.
module.exports = { cadastrar, entrar };
