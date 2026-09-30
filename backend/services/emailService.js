// O modo mock permite apresentar o fluxo sem contratar ou configurar email real.
async function enviarEmailDemonstrativo({ destinatario, pedidoId, assunto, html }) {
  const modoMock = String(process.env.EMAIL_MOCK || 'true').toLowerCase() !== 'false';

  if (modoMock) {
    // Não registra email, conteúdo ou segredo; somente o número demonstrativo.
    console.info(`[EMAIL MOCK] Mensagem do pedido #${pedidoId} preparada.`);
    return { modo: 'mock', enviado: false, simulado: true };
  }

  const provider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY;
  const remetente = process.env.EMAIL_FROM;

  // Resend é opcional e usa o fetch nativo do Node, sem biblioteca adicional.
  if (provider !== 'resend' || !apiKey || !remetente) {
    const error = new Error('Configure EMAIL_PROVIDER, EMAIL_API_KEY e EMAIL_FROM ou use EMAIL_MOCK=true.');
    error.code = 'EMAIL_NAO_CONFIGURADO';
    throw error;
  }

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ from: remetente, to: [destinatario], subject: assunto, html })
  });

  if (!resposta.ok) throw new Error('O serviço de email não aceitou a mensagem.');
  return { modo: 'resend', enviado: true, simulado: false };
}

module.exports = { enviarEmailDemonstrativo };
