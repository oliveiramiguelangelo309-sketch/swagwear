// Serviço de PIX demonstrativo. Ele não consulta bancos nem confirma transferências reais.
function escaparHtml(valor) {
  return String(valor || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function gerarPixDemonstrativo({ pedidoId, nome, email, totalCentavos, chavePix }) {
  const valor = (Number(totalCentavos) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
  // Este texto alimenta somente o desenho demonstrativo exibido na página.
  const textoQr = `SWAGWEAR-DEMO|PEDIDO=${pedidoId}|VALOR=${totalCentavos}|CHAVE=${chavePix}`;
  const html = `<h1>SwagWear — PIX demonstrativo</h1><p><strong>Pedido:</strong> #${Number(pedidoId)}</p><p><strong>Cliente:</strong> ${escaparHtml(nome)}</p><p><strong>Email:</strong> ${escaparHtml(email)}</p><p><strong>Valor:</strong> ${escaparHtml(valor)}</p><p><strong>Chave PIX:</strong> ${escaparHtml(chavePix)}</p><p><strong>Pagamento demonstrativo para fins acadêmicos.</strong></p><p>O botão da FECIP simula a confirmação; esta mensagem não comprova transferência bancária.</p>`;

  return {
    pedido_id: Number(pedidoId),
    valor,
    chave: String(chavePix),
    texto_qr: textoQr,
    aviso: 'Pagamento demonstrativo para fins acadêmicos.',
    html
  };
}

module.exports = { gerarPixDemonstrativo };
