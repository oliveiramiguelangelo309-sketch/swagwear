function criarLimitador({ janelaMs, maximo }) {
  const tentativas = new Map();

  return function limitarTaxa(request, response, next) {
    const chave = request.ip;
    const agora = Date.now();
    const registro = tentativas.get(chave);

    if (!registro || agora - registro.inicio > janelaMs) {
      tentativas.set(chave, { inicio: agora, contagem: 1 });
      return next();
    }

    if (registro.contagem >= maximo) {
      const restanteMs = janelaMs - (agora - registro.inicio);
      response.setHeader('Retry-After', Math.ceil(restanteMs / 1000));
      return response.status(429).json({ mensagem: 'Muitas tentativas. Tente novamente em instantes.' });
    }

    registro.contagem += 1;
    return next();
  };
}

module.exports = { criarLimitador };
