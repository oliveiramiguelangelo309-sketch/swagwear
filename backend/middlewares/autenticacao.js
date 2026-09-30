// jsonwebtoken verifica se o token foi realmente assinado pelo nosso backend.
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET precisa estar definido em produção.');
}

const jwtSecret = process.env.JWT_SECRET || 'swagwear-local-development-secret';

// Este middleware roda antes de rotas que precisam saber qual usuário está conectado.
function exigirAutenticacao(request, response, next) {
  const authorization = request.headers.authorization || '';
  const [tipo, token] = authorization.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return response.status(401).json({ mensagem: 'Entre na sua conta para continuar.' });
  }

  try {
    // Se a assinatura e a validade estiverem corretas, o usuário fica disponível na requisição.
    request.usuario = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return response.status(401).json({ mensagem: 'Sua sessão é inválida ou expirou.' });
  }
}

function exigirAdmin(request, response, next) {
  if (!request.usuario || !request.usuario.admin) {
    return response.status(403).json({ mensagem: 'Acesso restrito ao administrador.' });
  }

  return next();
}

module.exports = { exigirAutenticacao, exigirAdmin, jwtSecret };
