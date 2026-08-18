// Carrega as variáveis do arquivo .env local antes dos outros módulos.
// Esse arquivo é ignorado pelo Git e nunca deve conter dados enviados ao frontend.
require('dotenv').config();

// Carrega os módulos usados pelo servidor HTTP.
const path = require('node:path');
const express = require('express');

// Importa a função que garante a existência das tabelas antes de aceitar acessos.
const { checkDatabase, databaseType } = require('./database');

// As rotas ficam separadas para o server.js continuar pequeno e fácil de entender.
const usuariosRoutes = require('./routes/usuarios');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require('./routes/pedidos');
const provadorRoutes = require('./routes/provador');

// Cria a aplicação Express e define a porta, permitindo uma configuração futura pelo ambiente.
const app = express();
const port = Number(process.env.PORT) || 3000;

// SQLite prepara as tabelas localmente; PostgreSQL apenas confirma a conexão.
// Em produção, o schema PostgreSQL deve ser criado antes com `npm run migrate`.
const databaseReady = checkDatabase();

// Aceita o próprio domínio da requisição, localhost e APP_ORIGIN configurada.
// Isso evita liberar a API para qualquer site enquanto mantém frontend e API juntos.
app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (!origin) return next();

  const forwardedProtocol = request.headers['x-forwarded-proto'];
  const protocol = forwardedProtocol || request.protocol;
  const ownOrigin = `${protocol}://${request.get('host')}`;
  const configuredOrigins = String(process.env.APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowed = origin === ownOrigin || configuredOrigins.includes(origin) || developmentOrigins.includes(origin);

  if (!allowed) {
    return response.status(403).json({ mensagem: 'Origem não permitida.' });
  }

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (request.method === 'OPTIONS') return response.sendStatus(204);
  return next();
});

// Nenhuma rota acessa o banco antes da conexão/migration terminar.
app.use(async (request, response, next) => {
  try {
    await databaseReady;
    return next();
  } catch (error) {
    console.error('Banco indisponível:', error.message);
    return response.status(503).json({ mensagem: 'Banco de dados temporariamente indisponível.' });
  }
});

// Permite que futuras rotas recebam objetos JSON no corpo das requisições.
app.use(express.json());

// Disponibiliza o frontend existente sem alterar seus arquivos ou seu design.
app.use(express.static(path.join(__dirname, '..')));

// Rota simples para confirmar que o backend está funcionando.
app.get('/api/status', (request, response) => {
  response.json({
    nome: 'SwagWear API',
    status: 'online'
  });
});

// Adiciona /api antes das rotas: por exemplo, /cadastro vira /api/cadastro.
app.use('/api', usuariosRoutes);
app.use('/api', produtosRoutes);
app.use('/api', pedidosRoutes);
app.use('/api', provadorRoutes);

// Trata erros de upload e outros erros conhecidos sem mostrar detalhes internos ao navegador.
app.use((error, request, response, next) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    // Multer identifica o excesso antes do controller e nenhuma IA e chamada.
    return response.status(413).json({
      mensagem: 'A imagem é muito grande. Envie uma foto de até 4 MB.'
    });
  }

  if (error) {
    console.error('Erro tratado pelo servidor:', error.message);
    return response.status(400).json({ mensagem: error.message || 'Requisição inválida.' });
  }

  return next();
});

// Primeiro prepara o banco; somente depois começa a escutar requisições.
async function startServer() {
  try {
    await databaseReady;

    app.listen(port, () => {
      console.log(`SwagWear disponível em http://localhost:${port} usando ${databaseType}`);
    });
  } catch (error) {
    console.error('Não foi possível iniciar o backend:', error.message);
    process.exitCode = 1;
  }
}

// Executa o listener somente quando este arquivo é iniciado diretamente no computador.
// Quando o Vercel importa o app, ele gerencia a porta e não cria outro servidor.
if (require.main === module) {
  startServer();
}

module.exports = app;
