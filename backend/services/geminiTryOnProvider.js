// Integração do provador virtual com o Gemini (gemini-3.1-flash-image / "Nano Banana").
// O modelo recebe a foto da pessoa e a foto da peça e devolve uma imagem editada,
// combinando as duas — por isso não precisa de segmentação, pose nem GPU dedicada,
// diferente do pipeline IDM-VTON usado no Hugging Face Space.
// gemini-2.5-flash-image é desligado em 02/10/2026; o sucessor indicado pelo Google é o 3.1.
// GEMINI_MODELO_IMAGEM permite trocar o modelo pelo .env sem mexer no código.
const MODELO_GEMINI_IMAGEM =
  String(process.env.GEMINI_MODELO_IMAGEM || '').trim() || 'gemini-3.1-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI_IMAGEM}:generateContent`;
const TRYON_TIMEOUT_MS = 60_000;

// Cria erros identificáveis para o controller devolver uma mensagem controlada,
// no mesmo formato usado por huggingFaceTryOnProvider.js.
function criarErroProvider(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

async function aguardarComTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeout = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        criarErroProvider(
          'TRYON_TIMEOUT',
          'O provador demorou mais que o esperado. Tente novamente mais tarde.'
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// A imagem da peça vem como URL (Supabase Storage). O Gemini só aceita mídia embutida
// (inline_data em base64) ou arquivos enviados pela Files API, então baixamos os bytes aqui.
async function baixarImagemComoBase64(url) {
  let resposta;

  try {
    resposta = await fetch(url);
  } catch (error) {
    throw criarErroProvider(
      'TRYON_INVALID_INPUT',
      'Não foi possível carregar a imagem da peça para o provador.',
      error
    );
  }

  if (!resposta.ok) {
    throw criarErroProvider(
      'TRYON_INVALID_INPUT',
      'Não foi possível carregar a imagem da peça para o provador.'
    );
  }

  const mimeType = resposta.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await resposta.arrayBuffer());
  return { mimeType: mimeType.split(';')[0], data: buffer.toString('base64') };
}

// Traduz mensagens técnicas comuns da API do Gemini para códigos seguros do backend.
function normalizarErroGemini(error) {
  if (error && error.code) return error;

  const message = String(error && error.message ? error.message : error).toLowerCase();

  // "limit: 0" significa que o modelo não tem cota gratuita nenhuma nesta conta
  // (os modelos de imagem do Gemini exigem faturamento ativo), não que ela acabou por hoje.
  if (/limit: 0\b/.test(message)) {
    return criarErroProvider(
      'GEMINI_SEM_COTA_GRATUITA',
      'O provador com Gemini exige faturamento ativo na conta do Google AI Studio.',
      error
    );
  }

  if (/(quota|rate.?limit|resource.*exhausted|429)/.test(message)) {
    return criarErroProvider(
      'GEMINI_QUOTA_EXCEDIDA',
      'A cota gratuita do Gemini está indisponível no momento.',
      error
    );
  }

  if (/(api key|permission|401|403)/.test(message)) {
    return criarErroProvider(
      'GEMINI_CHAVE_INVALIDA',
      'A chave da API do Gemini não foi aceita.',
      error
    );
  }

  return criarErroProvider(
    'GEMINI_TRYON_ERROR',
    'O Gemini não conseguiu gerar a visualização agora.',
    error
  );
}

function montarPrompt({ categoria, descricao }) {
  return [
    'Você é um provador virtual de roupas. A primeira imagem mostra uma pessoa real.',
    'A segunda imagem mostra uma peça de roupa isolada, categoria "' + categoria + '"',
    (descricao ? ('(' + descricao + ')') : ''),
    '.',
    'Gere uma única imagem fotorrealista da MESMA pessoa da primeira foto — preserve rosto,',
    'tom de pele, cabelo, pose e o fundo original — vestindo a peça da segunda imagem no lugar',
    'da roupa que ela já usa. Ajuste caimento, sombras e proporções de forma natural.',
    'Responda apenas com a imagem gerada, sem texto.'
  ].join(' ');
}

async function gerarComGemini({ fotoPessoa, imagemRoupa, categoria, descricao }) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    throw criarErroProvider(
      'GEMINI_CHAVE_AUSENTE',
      'O serviço de IA não está configurado. Ative o modo mock.'
    );
  }

  const roupa = await baixarImagemComoBase64(imagemRoupa);

  const corpoRequisicao = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: montarPrompt({ categoria, descricao }) },
          {
            inlineData: {
              mimeType: fotoPessoa.mimetype,
              data: fotoPessoa.buffer.toString('base64')
            }
          },
          { inlineData: { mimeType: roupa.mimeType, data: roupa.data } }
        ]
      }
    ],
    // Alguns modelos de imagem não aceitam só IMAGE; com TEXT junto, o texto é ignorado abaixo.
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  };

  let resposta;

  try {
    resposta = await aguardarComTimeout(
      fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoRequisicao)
      }),
      TRYON_TIMEOUT_MS
    );
  } catch (error) {
    throw normalizarErroGemini(error);
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    // Registra o erro real da API (sem a chave) para diagnosticar modelo ou formato recusado.
    console.error(`Gemini (${MODELO_GEMINI_IMAGEM}) respondeu HTTP ${resposta.status}: ${detalhe.slice(0, 500)}`);
    throw normalizarErroGemini(new Error(`HTTP ${resposta.status}: ${detalhe}`));
  }

  const corpo = await resposta.json();
  const partes = corpo?.candidates?.[0]?.content?.parts || [];
  // Os modelos 3.x podem devolver imagens intermediárias de "pensamento" (thought: true);
  // a imagem final é a última parte de imagem que não é pensamento.
  const parteImagem = partes
    .filter((parte) => (parte.inlineData || parte.inline_data) && !parte.thought)
    .pop();
  const inline = parteImagem && (parteImagem.inlineData || parteImagem.inline_data);

  if (!inline || !inline.data) {
    throw criarErroProvider(
      'GEMINI_RESPOSTA_VAZIA',
      'O provador terminou, mas o Gemini não devolveu uma imagem.'
    );
  }

  const mimeType = inline.mimeType || inline.mime_type || 'image/png';
  return { imagemResultado: `data:${mimeType};base64,${inline.data}` };
}

module.exports = { gerarComGemini, TRYON_TIMEOUT_MS };
