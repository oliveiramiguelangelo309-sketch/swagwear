// =============================================================================
// services/emailService.js — envia (ou simula enviar) emails de pedidos.
// -----------------------------------------------------------------------------
// Com EMAIL_MOCK=true (o padrão), nenhum email sai de verdade: o servidor só
// registra no log que a mensagem foi preparada. Assim dá para apresentar o
// fluxo sem contratar um serviço de email.
// =============================================================================
async function enviarEmailDemonstrativo({ destinatario, pedidoId, assunto, html }) {
  // Só desliga a simulação se EMAIL_MOCK for exatamente "false".
  const modoMock = String(process.env.EMAIL_MOCK || 'true').toLowerCase() !== 'false';

  if (modoMock) {
    // Registra só o número do pedido: nunca o email nem o conteúdo da mensagem.
    console.info(`[EMAIL MOCK] Mensagem do pedido #${pedidoId} preparada.`);
    return { modo: 'mock', enviado: false, simulado: true };
  }

  // Configuração do envio real, lida do .env (ou das variáveis da Vercel).
  const provider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY;
  const remetente = process.env.EMAIL_FROM;

  // O único serviço suportado é o Resend. Se faltar algo, avisa como configurar.
  if (provider !== 'resend' || !apiKey || !remetente) {
    const error = new Error('Configure EMAIL_PROVIDER, EMAIL_API_KEY e EMAIL_FROM ou use EMAIL_MOCK=true.');
    error.code = 'EMAIL_NAO_CONFIGURADO';
    throw error;
  }

  // Chama a API do Resend usando o fetch que já vem no Node (sem biblioteca extra).
  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ from: remetente, to: [destinatario], subject: assunto, html })
  });

  if (!resposta.ok) throw new Error('O serviço de email não aceitou a mensagem.');
  return { modo: 'resend', enviado: true, simulado: false };
}

module.exports = { enviarEmailDemonstrativo };
