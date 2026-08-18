// jsonwebtoken verifica se o token foi realmente assinado pelo nosso backend.
const jwt = require('jsonwebtoken');

// No desenvolvimento local existe um valor padrão.
// Antes de produção, JWT_SECRET deverá ser uma variável longa e secreta.
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

module.exports = { exigirAutenticacao, jwtSecret };
