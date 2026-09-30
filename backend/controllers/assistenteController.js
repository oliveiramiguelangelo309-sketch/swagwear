const { responderComGemini } = require('../services/assistantService');

async function conversar(request, response) {
  const mensagem = String(request.body.mensagem || '').trim();
  const historico = Array.isArray(request.body.historico) ? request.body.historico : [];

  if (!mensagem) {
    return response.status(400).json({ mensagem: 'Escreva uma pergunta para a Swag.' });
  }

  if (mensagem.length > 1000) {
    return response.status(400).json({ mensagem: 'Sua pergunta é muito longa.' });
  }

  try {
    const resultado = await responderComGemini({ mensagem, historico });
    return response.json(resultado);
  } catch (error) {
    console.error('Erro no assistente Swag:', error.message);
    return response.status(502).json({ mensagem: 'A Swag não conseguiu responder agora. Tente novamente.' });
  }
}

module.exports = { conversar };
