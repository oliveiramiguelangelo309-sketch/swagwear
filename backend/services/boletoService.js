// =============================================================================
// services/boletoService.js — gera um boleto DEMONSTRATIVO (sem valor real).
// -----------------------------------------------------------------------------
// É uma simulação para o projeto acadêmico: nenhum banco é consultado e
// nenhuma cobrança é criada. O resultado é um HTML que o cliente pode baixar.
// =============================================================================

// Troca caracteres especiais do HTML por códigos seguros.
// Sem isso, um nome como "<script>" poderia virar código dentro do boleto.
function escaparHtml(valor) {
  return String(valor || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Formata uma data no padrão brasileiro, por exemplo 05/10/2026.
function dataEmPortugues(data) {
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

// Monta os dados e o HTML do boleto de um pedido.
// totalCentavos: o valor vem em centavos (ex.: 14900 = R$ 149,00) para evitar
// erros de arredondamento com números quebrados.
function gerarBoletoDemonstrativo({ pedidoId, nome, email, totalCentavos }) {
  // O vencimento é sempre daqui a 3 dias.
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);

  // Converte centavos para reais no formato "R$ 149,00".
  const valor = (Number(totalCentavos) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  // Código fictício. O prefixo DEMO deixa claro que não é uma linha digitável de banco.
  // padStart completa com zeros à esquerda (ex.: pedido 7 vira 00000007).
  const codigo = `DEMO.${String(pedidoId).padStart(8, '0')}.${String(totalCentavos).padStart(10, '0')}.SWAGWEAR`;

  // Página HTML completa do boleto, com estilo próprio embutido.
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Boleto demonstrativo</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#171717}header{border-bottom:4px solid #7b2fff;padding-bottom:16px}.aviso{margin:24px 0;padding:16px;background:#eee5ff;font-weight:bold}.linha{padding:11px 0;border-bottom:1px solid #ddd}.codigo{font-family:monospace;font-size:18px;word-break:break-all}</style></head><body><header><h1>SWAGWEAR</h1><p>Documento acadêmico de demonstração</p></header><p class="aviso">Boleto demonstrativo — sem valor financeiro</p><div class="linha"><strong>Cliente:</strong> ${escaparHtml(nome)}</div><div class="linha"><strong>Email:</strong> ${escaparHtml(email)}</div><div class="linha"><strong>Pedido:</strong> #${Number(pedidoId)}</div><div class="linha"><strong>Valor:</strong> ${escaparHtml(valor)}</div><div class="linha"><strong>Vencimento:</strong> ${dataEmPortugues(vencimento)}</div><div class="linha codigo"><strong>Código fictício:</strong> ${escaparHtml(codigo)}</div><p>Este documento não pode ser pago e não representa uma cobrança bancária.</p></body></html>`;

  // Devolve os dados separados (para mostrar na página) e o HTML (para baixar).
  return { pedido_id: Number(pedidoId), valor, vencimento: dataEmPortugues(vencimento), codigo, aviso: 'Boleto demonstrativo — sem valor financeiro', html };
}

module.exports = { gerarBoletoDemonstrativo };
