// Serviço de boleto acadêmico da SwagWear. Nenhuma cobrança bancária real é criada.

function escaparHtml(valor) {
  return String(valor || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function dataEmPortugues(data) {
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

function gerarBoletoDemonstrativo({ pedidoId, nome, email, totalCentavos }) {
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);
  const valor = (Number(totalCentavos) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
  // DEMO deixa explícito que este código não é uma linha digitável bancária.
  const codigo = `DEMO.${String(pedidoId).padStart(8, '0')}.${String(totalCentavos).padStart(10, '0')}.SWAGWEAR`;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Boleto demonstrativo</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#171717}header{border-bottom:4px solid #7b2fff;padding-bottom:16px}.aviso{margin:24px 0;padding:16px;background:#eee5ff;font-weight:bold}.linha{padding:11px 0;border-bottom:1px solid #ddd}.codigo{font-family:monospace;font-size:18px;word-break:break-all}</style></head><body><header><h1>SWAGWEAR</h1><p>Documento acadêmico de demonstração</p></header><p class="aviso">Boleto demonstrativo — sem valor financeiro</p><div class="linha"><strong>Cliente:</strong> ${escaparHtml(nome)}</div><div class="linha"><strong>Email:</strong> ${escaparHtml(email)}</div><div class="linha"><strong>Pedido:</strong> #${Number(pedidoId)}</div><div class="linha"><strong>Valor:</strong> ${escaparHtml(valor)}</div><div class="linha"><strong>Vencimento:</strong> ${dataEmPortugues(vencimento)}</div><div class="linha codigo"><strong>Código fictício:</strong> ${escaparHtml(codigo)}</div><p>Este documento não pode ser pago e não representa uma cobrança bancária.</p></body></html>`;

  return { pedido_id: Number(pedidoId), valor, vencimento: dataEmPortugues(vencimento), codigo, aviso: 'Boleto demonstrativo — sem valor financeiro', html };
}

module.exports = { gerarBoletoDemonstrativo };
