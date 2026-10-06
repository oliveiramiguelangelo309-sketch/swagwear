// =============================================================================
// services/pixService.js — prepara um PIX DEMONSTRATIVO (sem valor real).
// -----------------------------------------------------------------------------
// Não consulta bancos nem confirma transferências: só monta os dados que a
// página de pagamento mostra e o texto do email de demonstração.
// =============================================================================

// Troca caracteres especiais do HTML por códigos seguros, para que dados do
// cliente (nome, email) nunca virem código dentro do email.
function escaparHtml(valor) {
  return String(valor || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Monta o PIX de um pedido. O valor chega em centavos (ex.: 14900 = R$ 149,00).
function gerarPixDemonstrativo({ pedidoId, nome, email, totalCentavos, chavePix }) {
  // Converte centavos para reais no formato "R$ 149,00".
  const valor = (Number(totalCentavos) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  // Texto usado só para desenhar o "QR code" ilustrativo da página.
  // Não é um código PIX válido em nenhum banco.
  const textoQr = `SWAGWEAR-DEMO|PEDIDO=${pedidoId}|VALOR=${totalCentavos}|CHAVE=${chavePix}`;

  // Conteúdo do email demonstrativo enviado ao cliente.
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
