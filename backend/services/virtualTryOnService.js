// Versão estável do IDM-VTON consultada na documentação oficial do Replicate.
const MODELO_IDM_VTON =
  'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';

const { gerarComHuggingFace } = require('./huggingFaceTryOnProvider');
const PROVIDERS_VALIDOS = new Set(['mock', 'huggingface', 'replicate']);

// Mantem a leitura antiga isolada para projetos que ainda nao possuem TRYON_PROVIDER.
function isLegacyTryOnMockEnabled() {
  return String(process.env.TRYON_MOCK || 'true').toLowerCase() !== 'false';
}

// TRYON_PROVIDER tem prioridade. Sem ele, TRYON_MOCK preserva o comportamento antigo:
// true usa mock e false usa Replicate, exatamente como antes desta integracao.
function getTryOnProvider() {
  const providerExplicito = String(process.env.TRYON_PROVIDER || '')
    .trim()
    .toLowerCase();

  if (!providerExplicito) {
    return isLegacyTryOnMockEnabled() ? 'mock' : 'replicate';
  }

  if (!PROVIDERS_VALIDOS.has(providerExplicito)) {
    const error = new Error('TRYON_PROVIDER deve ser mock, huggingface ou replicate.');
    error.code = 'TRYON_PROVIDER_INVALIDO';
    throw error;
  }

  return providerExplicito;
}

// Centraliza a leitura do modo mock para controller e serviço tomarem a mesma decisão.
function isTryOnMockEnabled() {
  return getTryOnProvider() === 'mock';
}

// Converte os tipos usados pela SwagWear para as três categorias aceitas pelo modelo.
function mapearCategoriaProvador(tipo = '', categoria = '') {
  const texto = `${tipo} ${categoria}`.toLowerCase();

  if (/(vestido|dress)/.test(texto)) {
    return 'dresses';
  }

  if (/(calça|calca|cargo|baggy|short|saia|parte_inferior|lower)/.test(texto)) {
    return 'lower_body';
  }

  // Camiseta, moletom, jaqueta e categorias desconhecidas usam upper_body como padrão seguro.
  return 'upper_body';
}

// Aceita diferentes formatos de saída do cliente Replicate e sempre devolve uma URL em texto.
function obterUrlResultado(output) {
  const valor = Array.isArray(output) ? output[0] : output;

  if (typeof valor === 'string') {
    return valor;
  }

  if (valor && typeof valor.url === 'function') {
    return valor.url().toString();
  }

  if (valor && valor.url) {
    return valor.url.toString();
  }

  throw new Error('O provedor não devolveu uma imagem válida.');
}

// Descreve somente o formato técnico da resposta, sem registrar URL, imagem ou dados privados.
function identificarFormatoResultado(output) {
  const valor = Array.isArray(output) ? output[0] : output;
  const prefixo = Array.isArray(output) ? 'array contendo ' : '';

  if (typeof valor === 'string') return `${prefixo}URL em texto`;
  if (valor && typeof valor.url === 'function') return `${prefixo}FileOutput/objeto com url()`;
  if (valor && valor.url) return `${prefixo}objeto com propriedade url`;
  return `${prefixo}${typeof valor}`;
}

// Esta é a única função que conhece o provedor externo de IA.
async function gerarProvadorVirtual({ fotoPessoa, imagemRoupa, categoria, descricao }) {
  const provider = getTryOnProvider();

  if (provider === 'mock') {
    // No mock, devolvemos a própria foto como resultado simulado sem acessar a internet.
    const dataUri = `data:${fotoPessoa.mimetype};base64,${fotoPessoa.buffer.toString('base64')}`;
    return { imagemResultado: dataUri };
  }

  if (provider === 'huggingface') {
    // Falhas do ZeroGPU voltam como erro controlado; nunca acionam Replicate.
    return gerarComHuggingFace({ fotoPessoa, imagemRoupa, categoria, descricao });
  }

  // Este bloco so e alcancado quando o provider escolhido e replicate.
  if (!process.env.REPLICATE_API_TOKEN) {
    const error = new Error('O serviço de IA não está configurado. Ative o modo mock.');
    error.code = 'TOKEN_AUSENTE';
    throw error;
  }

  // A importação dinâmica permite usar o cliente oficial, que é publicado como módulo moderno.
  const { default: Replicate } = await import('replicate');
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const output = await replicate.run(MODELO_IDM_VTON, {
    input: {
      human_img: fotoPessoa.buffer,
      garm_img: imagemRoupa,
      category: categoria,
      garment_des: descricao,
      crop: true,
      steps: 30
    }
  });

  // Este diagnóstico permite auditar a primeira resposta real sem revelar seu conteúdo.
  console.log(`Formato da resposta Replicate: ${identificarFormatoResultado(output)}`);

  return { imagemResultado: obterUrlResultado(output) };
}

module.exports = {
  gerarProvadorVirtual,
  mapearCategoriaProvador,
  isTryOnMockEnabled,
  getTryOnProvider
};
