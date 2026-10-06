// =============================================================================
// middlewares/autenticacao.js — confere se o visitante está logado.
// -----------------------------------------------------------------------------
// Quando alguém faz login, o backend devolve um "token JWT": um texto assinado
// que prova quem é o usuário. O navegador manda esse token de volta no
// cabeçalho "Authorization: Bearer <token>" nas rotas que exigem login.
// =============================================================================

// Biblioteca que cria e confere tokens JWT.
const jwt = require('jsonwebtoken');

// Online (produção) é obrigatório ter um segredo próprio para assinar os tokens.
// Sem ele, qualquer um que conhecesse o segredo padrão poderia forjar logins.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET precisa estar definido em produção.');
}

// No computador, se não houver JWT_SECRET, usa um segredo fixo só para testes.
const jwtSecret = process.env.JWT_SECRET || 'swagwear-local-development-secret';

// Roda antes das rotas que precisam saber qual usuário está conectado.
function exigirAutenticacao(request, response, next) {
  // Exemplo do cabeçalho: "Bearer eyJhbGciOi..."
  const authorization = request.headers.authorization || '';
  const [tipo, token] = authorization.split(' ');

  // Sem token, ou formato errado: pede para entrar na conta.
  if (tipo !== 'Bearer' || !token) {
    return response.status(401).json({ mensagem: 'Entre na sua conta para continuar.' });
  }

  try {
    // jwt.verify confere a assinatura e a validade (o token expira em 8 horas).
    // Se estiver tudo certo, os dados do usuário ficam em request.usuario.
    request.usuario = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    // Token falsificado, alterado ou vencido.
    return response.status(401).json({ mensagem: 'Sua sessão é inválida ou expirou.' });
  }
}

// jwtSecret também é exportado porque o controller de usuários assina os tokens com ele.
module.exports = { exigirAutenticacao, jwtSecret };
