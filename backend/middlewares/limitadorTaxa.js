// =============================================================================
// middlewares/limitadorTaxa.js — limita quantas requisições cada IP pode fazer.
// -----------------------------------------------------------------------------
// Um "middleware" é uma função que roda antes do controller e pode deixar a
// requisição seguir (next) ou barrá-la. Este barra quem faz pedidos demais
// num intervalo de tempo (por exemplo, quem tenta adivinhar senhas).
// =============================================================================

// Cria um limitador com as regras escolhidas:
//   janelaMs = tamanho da janela de tempo, em milissegundos;
//   maximo   = quantas requisições cabem nessa janela.
function criarLimitador({ janelaMs, maximo }) {
  // Guarda, para cada IP, quando a janela começou e quantas vezes ele já pediu.
  // Fica na memória do servidor (zera quando o servidor reinicia).
  const tentativas = new Map();

  return function limitarTaxa(request, response, next) {
    const chave = request.ip; // identifica o visitante pelo endereço IP
    const agora = Date.now();
    const registro = tentativas.get(chave);

    // Primeira vez deste IP, ou a janela anterior já acabou: começa a contar de novo.
    if (!registro || agora - registro.inicio > janelaMs) {
      tentativas.set(chave, { inicio: agora, contagem: 1 });
      return next();
    }

    // Já atingiu o limite: responde 429 ("muitas requisições") e avisa
    // em quantos segundos pode tentar de novo (cabeçalho Retry-After).
    if (registro.contagem >= maximo) {
      const restanteMs = janelaMs - (agora - registro.inicio);
      response.setHeader('Retry-After', Math.ceil(restanteMs / 1000));
      return response.status(429).json({ mensagem: 'Muitas tentativas. Tente novamente em instantes.' });
    }

    // Ainda dentro do limite: soma mais uma e deixa seguir.
    registro.contagem += 1;
    return next();
  };
}

module.exports = { criarLimitador };
