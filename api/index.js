// Este é o entrypoint da Vercel Function.
// Ele reutiliza exatamente o mesmo Express testado localmente; não cria outro servidor.
const app = require('../backend/server');

module.exports = function vercelHandler(request, response) {
  // vercel.json guarda o trecho depois de /api em __path.
  // Aqui reconstruímos a URL original para o Express encontrar /api/produtos, /api/login etc.
  // O fallback com URL também permite testar este wrapper com o servidor HTTP do Node.
  const parsedUrl = new URL(request.url, 'http://localhost');
  const rewrittenPath = request.query?.__path ?? parsedUrl.searchParams.get('__path');

  if (rewrittenPath !== undefined) {
    const safePath = Array.isArray(rewrittenPath) ? rewrittenPath.join('/') : rewrittenPath;
    request.url = safePath ? `/api/${safePath}` : '/api';
  }

  return app(request, response);
};
