// =============================================================================
// controllers/assistenteController.js — recebe a pergunta do chat da Swag.
// -----------------------------------------------------------------------------
// Valida o que o navegador mandou e pede a resposta ao serviço do Gemini
// (services/assistantService.js).
// =============================================================================
const { responderComGemini } = require('../services/assistantService');

async function conversar(request, response) {
  // Texto digitado pelo visitante, sem espaços sobrando nas pontas.
  const mensagem = String(request.body.mensagem || '').trim();

  // Mensagens anteriores da conversa, para a IA lembrar do contexto.
  // Se não vier uma lista, usa uma lista vazia.
  const historico = Array.isArray(request.body.historico) ? request.body.historico : [];

  // Não faz sentido chamar a IA com a mensagem vazia.
  if (!mensagem) {
    return response.status(400).json({ mensagem: 'Escreva uma pergunta para a Swag.' });
  }

  // Limita o tamanho da pergunta para não gastar cota da IA à toa.
  if (mensagem.length > 1000) {
    return response.status(400).json({ mensagem: 'Sua pergunta é muito longa.' });
  }

  try {
    // Pede a resposta ao Gemini e devolve para o navegador como JSON.
    const resultado = await responderComGemini({ mensagem, historico });
    return response.json(resultado);
  } catch (error) {
    // O erro técnico fica só no log do servidor; o visitante vê uma mensagem simples.
    console.error('Erro no assistente Swag:', error.message);
    return response.status(502).json({ mensagem: 'A Swag não conseguiu responder agora. Tente novamente.' });
  }
}

module.exports = { conversar };
