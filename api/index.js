// =============================================================================
// api/index.js — porta de entrada do backend quando o site roda na Vercel.
// -----------------------------------------------------------------------------
// Na Vercel não existe um servidor ligado o tempo todo: cada requisição para
// /api/... acorda uma "Vercel Function", que é esta função exportada abaixo.
// Ela reaproveita o mesmo aplicativo Express usado no computador (server.js),
// então o comportamento é igual nos dois lugares.
// =============================================================================

// Importa o aplicativo Express já configurado com todas as rotas da SwagWear.
const app = require('../backend/server');

// A Vercel chama esta função a cada requisição recebida em /api/...
module.exports = function vercelHandler(request, response) {
  // O vercel.json redireciona "/api/qualquer/coisa" para "/api?__path=qualquer/coisa".
  // Aqui lemos esse __path para reconstruir a URL original que o Express espera.
  // new URL(...) também funciona fora da Vercel, o que facilita testar este arquivo.
  const parsedUrl = new URL(request.url, 'http://localhost');
  const rewrittenPath = request.query?.__path ?? parsedUrl.searchParams.get('__path');

  if (rewrittenPath !== undefined) {
    // Se o caminho vier em pedaços (array), junta tudo com "/".
    const safePath = Array.isArray(rewrittenPath) ? rewrittenPath.join('/') : rewrittenPath;

    // Devolve a URL ao formato normal, por exemplo "/api/produtos" ou "/api/login".
    request.url = safePath ? `/api/${safePath}` : '/api';
  }

  // Entrega a requisição para o Express, que escolhe a rota certa e responde.
  return app(request, response);
};
