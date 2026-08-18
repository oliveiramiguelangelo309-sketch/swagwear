// O cliente oficial do Gradio conecta o backend Node diretamente ao Space.
// A importacao e dinamica porque o pacote moderno usa ES Modules.
const DEFAULT_HF_SPACE = 'zepolmix2/swagwear-virtual-tryon';
const TRYON_TIMEOUT_MS = 120_000;

// Cria erros identificaveis para o controller devolver uma mensagem controlada.
function criarErroProvider(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

// Interrompe a espera local depois de 120 segundos. Nao existe nova tentativa.
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

// O Gradio pode devolver a imagem como texto ou como FileData com uma URL.
function obterUrlImagemGradio(response) {
  const data = response && response.data;
  const value = Array.isArray(data) ? data[0] : data;

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value.url === 'string' && value.url.trim()) {
    return value.url;
  }

  throw criarErroProvider(
    'TRYON_EMPTY_RESULT',
    'O provador terminou, mas nao devolveu uma imagem.'
  );
}

// Traduz mensagens tecnicas comuns do Space para codigos seguros do backend.
function normalizarErroHuggingFace(error) {
  if (error && error.code) return error;

  const message = String(error && error.message ? error.message : error).toLowerCase();

  if (/(quota|zero.?gpu|gpu.*unavailable|queue.*unavailable|exceeded)/.test(message)) {
    return criarErroProvider(
      'ZERO_GPU_UNAVAILABLE',
      'A cota gratuita do provador esta indisponivel no momento.',
      error
    );
  }

  if (/(sleeping|starting|building|space.*offline|space.*error|not running)/.test(message)) {
    return criarErroProvider(
      'HF_SPACE_UNAVAILABLE',
      'O provador esta iniciando ou temporariamente indisponivel.',
      error
    );
  }

  if (/(invalid|image|category|validation)/.test(message)) {
    return criarErroProvider(
      'TRYON_INVALID_INPUT',
      'A imagem ou a categoria nao foi aceita pelo provador.',
      error
    );
  }

  return criarErroProvider(
    'HF_TRYON_ERROR',
    'O Hugging Face nao conseguiu gerar a visualizacao agora.',
    error
  );
}

async function gerarComHuggingFace({ fotoPessoa, imagemRoupa, categoria, descricao }) {
  const space = String(process.env.HF_SPACE || DEFAULT_HF_SPACE).trim();

  if (!space) {
    throw criarErroProvider('HF_SPACE_AUSENTE', 'O Space do provador nao foi configurado.');
  }

  let client;

  try {
    const { Client, handle_file: handleFile } = await import('@gradio/client');
    const options = { record_history: false };

    // O Space atual e publico. HF_TOKEN e opcional e permanece somente no backend.
    if (process.env.HF_TOKEN) {
      options.token = process.env.HF_TOKEN;
    }

    client = await aguardarComTimeout(Client.connect(space, options), TRYON_TIMEOUT_MS);

    // Blob preserva bytes e MIME type do Buffer mantido pelo multer em memoria.
    const humanImage = new Blob([fotoPessoa.buffer], { type: fotoPessoa.mimetype });

    const response = await aguardarComTimeout(
      client.predict('/tryon', {
        human_image: handleFile(humanImage),
        garment_image: handleFile(imagemRoupa),
        category: categoria,
        garment_description: descricao
      }),
      TRYON_TIMEOUT_MS
    );

    return { imagemResultado: obterUrlImagemGradio(response) };
  } catch (error) {
    throw normalizarErroHuggingFace(error);
  } finally {
    // Fecha o stream do cliente; nao executa retry nem chama outro provider.
    if (client) {
      // O EventSource do cliente trata o abort intencional como erro e o imprime.
      // Removemos apenas esse listener antes de fechar para nao poluir o terminal.
      if (client.stream_instance) client.stream_instance.onerror = null;
      client.close();
    }
  }
}

module.exports = {
  gerarComHuggingFace,
  obterUrlImagemGradio,
  TRYON_TIMEOUT_MS
};
