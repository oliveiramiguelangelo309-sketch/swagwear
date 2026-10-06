// =============================================================================
// backend/server.js — o servidor da SwagWear (Express).
// -----------------------------------------------------------------------------
// Ele faz duas coisas:
//   1. entrega as páginas do site (index.html, loja.html, style.css...);
//   2. responde a API em /api/... (produtos, login, pedidos, assistente).
// No computador ele é iniciado com "pnpm start". Na Vercel, quem o usa é o
// arquivo api/index.js.
// =============================================================================

// Lê as variáveis do arquivo .env (senhas, chaves, URL do banco).
// O .env nunca vai para o GitHub nem para o navegador.
require('dotenv').config();

// path monta caminhos de pastas; express é a biblioteca do servidor web.
const path = require('node:path');
const express = require('express');

// checkDatabase confere/prepara o banco; databaseType diz qual banco está em uso.
const { checkDatabase, databaseType } = require('./database');

// Cada grupo de rotas fica no seu próprio arquivo, para este continuar pequeno.
const usuariosRoutes = require('./routes/usuarios');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require('./routes/pedidos');
const assistenteRoutes = require('./routes/assistente');

// Cria o aplicativo e escolhe a porta (PORT do .env ou 3000).
const app = express();
const port = Number(process.env.PORT) || 3000;

// Começa a preparar o banco assim que o servidor carrega.
// No SQLite isso cria as tabelas; no PostgreSQL só confirma a conexão
// (lá as tabelas são criadas antes, com "pnpm run migrate").
const databaseReady = checkDatabase();

// -----------------------------------------------------------------------------
// Controle de origem (CORS): só aceita chamadas à API vindas do próprio site,
// do localhost ou dos endereços listados em APP_ORIGIN. Assim outro site
// qualquer não consegue usar a nossa API pelo navegador dos visitantes.
// -----------------------------------------------------------------------------
app.use((request, response, next) => {
  const origin = request.headers.origin;

  // Requisições sem "Origin" (abrir a página direto, curl...) seguem normalmente.
  if (!origin) return next();

  // Descobre o endereço do próprio site. Na Vercel o protocolo (https) vem
  // no cabeçalho x-forwarded-proto.
  const forwardedProtocol = request.headers['x-forwarded-proto'];
  const protocol = forwardedProtocol || request.protocol;
  const ownOrigin = `${protocol}://${request.get('host')}`;

  // APP_ORIGIN pode ter vários endereços separados por vírgula.
  const configuredOrigins = String(process.env.APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowed = origin === ownOrigin || configuredOrigins.includes(origin) || developmentOrigins.includes(origin);

  if (!allowed) {
    return response.status(403).json({ mensagem: 'Origem não permitida.' });
  }

  // Avisa ao navegador que esta origem pode usar a API e com quais cabeçalhos/métodos.
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // PATCH é usado na troca de senha e na confirmação do pagamento simulado.
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');

  // OPTIONS é a "pergunta prévia" do navegador; responde que está tudo certo.
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  return next();
});

// Nenhuma rota usa o banco antes de ele estar pronto.
// Se o banco estiver fora do ar, responde 503 ("serviço indisponível").
app.use(async (request, response, next) => {
  try {
    await databaseReady;
    return next();
  } catch (error) {
    console.error('Banco indisponível:', error.message);
    return response.status(503).json({ mensagem: 'Banco de dados temporariamente indisponível.' });
  }
});

// Permite ler o corpo das requisições em JSON (ex.: { "email": "...", "senha": "..." }).
app.use(express.json());

// Entrega os arquivos do site (HTML, CSS, imagens) que estão na pasta principal.
app.use(express.static(path.join(__dirname, '..')));

// GET /api/status — rota simples para conferir se o backend está no ar.
app.get('/api/status', (request, response) => {
  response.json({
    nome: 'SwagWear API',
    status: 'online'
  });
});

// Liga as rotas com o prefixo /api: por exemplo, /cadastro vira /api/cadastro.
app.use('/api', usuariosRoutes);
app.use('/api', produtosRoutes);
app.use('/api', pedidosRoutes);
app.use('/api', assistenteRoutes);

// Tratador final de erros: registra no log e responde sem expor detalhes internos.
// (O Express reconhece este tipo de função por ela ter 4 parâmetros.)
app.use((error, request, response, next) => {
  if (error) {
    console.error('Erro tratado pelo servidor:', error.message);
    return response.status(400).json({ mensagem: error.message || 'Requisição inválida.' });
  }

  return next();
});

// Espera o banco ficar pronto e só então começa a aceitar visitas.
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

// Só abre a porta quando este arquivo é executado diretamente (pnpm start).
// Na Vercel, o api/index.js apenas importa o "app" e a Vercel cuida da porta.
if (require.main === module) {
  startServer();
}

module.exports = app;
