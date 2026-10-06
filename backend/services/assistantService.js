// gemini-2.0-flash foi desligado em 01/06/2026. GEMINI_MODELO_TEXTO permite trocar o modelo
// pelo .env quando o Google aposentar este também, sem mexer no código.
const MODELO_GEMINI = String(process.env.GEMINI_MODELO_TEXTO || '').trim() || 'gemini-3.8-flash';
// Modelo mais leve usado só quando o principal está sobrecarregado ou sem cota (HTTP 503/429).
const MODELO_GEMINI_RESERVA = 'gemini-3.5-flash-lite';

function urlDoModelo(modelo) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
}

const INSTRUCAO_SISTEMA = `Você é a Swag, assistente virtual do site SwagWear (uma loja de streetwear feita como projeto de estudo/FECIP).
Responda apenas perguntas relacionadas ao site: catálogo e produtos, drops (Drop 01 "Baby Tee", com baby tees de corte ajustado, e Drop 02 "Corporation", com camisetas de corte reto; o catálogo atual tem só camisetas), carrinho e pedidos, formas de pagamento simuladas (PIX e boleto demonstrativos, sem cartão real) e cadastro e login. O site não tem provador virtual nem montagem de looks com IA.
Deixe claro quando algo é uma simulação/demonstração acadêmica e não uma compra real.
Se a pergunta não tiver relação com o site, responda educadamente que você só ajuda com dúvidas da SwagWear.
Responda sempre em português do Brasil, em frases curtas e diretas.`;

const RESPOSTA_MOCK = 'Olá! Sou a Swag (modo demonstração, sem IA configurada ainda). Em breve vou poder responder de verdade sobre produtos, pedidos e pagamento.';

function isAssistantMockEnabled() {
  return !String(process.env.GEMINI_API_KEY || '').trim();
}

function montarHistoricoGemini(historico) {
  return historico
    .filter((item) => item && (item.role === 'user' || item.role === 'model') && item.text)
    .slice(-10)
    .map((item) => ({ role: item.role, parts: [{ text: String(item.text).slice(0, 2000) }] }));
}

async function responderComGemini({ mensagem, historico }) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return { resposta: RESPOSTA_MOCK, mock: true };
  }

  const contents = [
    ...montarHistoricoGemini(historico || []),
    { role: 'user', parts: [{ text: mensagem }] }
  ];

  const requisicao = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
      contents,
      // Nos modelos com raciocínio, os tokens de "pensamento" também contam neste limite;
      // um teto baixo (400) podia terminar a resposta vazia. O tamanho curto vem da instrução.
      generationConfig: { maxOutputTokens: 2048, temperature: 0.4 }
    })
  };

  let modeloUsado = MODELO_GEMINI;
  let resposta = await fetch(`${urlDoModelo(modeloUsado)}?key=${encodeURIComponent(apiKey)}`, requisicao);

  // O Gemini devolve 503 em picos de demanda e 429 quando a cota gratuita do modelo principal
  // acaba (são só 20 pedidos no plano grátis). O modelo leve de reserva tem cota própria,
  // então a pergunta é repetida nele uma vez.
  if ([429, 503].includes(resposta.status) && modeloUsado !== MODELO_GEMINI_RESERVA) {
    modeloUsado = MODELO_GEMINI_RESERVA;
    resposta = await fetch(`${urlDoModelo(modeloUsado)}?key=${encodeURIComponent(apiKey)}`, requisicao);
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    const error = new Error('O assistente não conseguiu responder agora.');
    error.code = 'GEMINI_ERRO';
    error.detalhe = detalhe;
    // Registra o erro real da API (sem a chave) para facilitar a troca de modelo ou de chave.
    console.error(`Gemini (${modeloUsado}) respondeu HTTP ${resposta.status}: ${detalhe.slice(0, 500)}`);
    throw error;
  }

  const corpo = await resposta.json();
  const texto = corpo?.candidates?.[0]?.content?.parts
    ?.filter((parte) => parte.text && !parte.thought)
    .map((parte) => parte.text)
    .join('')
    .trim();

  if (!texto) {
    const error = new Error('O assistente não retornou uma resposta válida.');
    error.code = 'GEMINI_RESPOSTA_VAZIA';
    throw error;
  }

  return { resposta: texto, mock: false };
}

module.exports = { responderComGemini, isAssistantMockEnabled };
