// =============================================================================
// routes/pedidos.js — rotas de pedidos e pagamentos demonstrativos.
// -----------------------------------------------------------------------------
// Todas exigem login, porque um pedido sempre pertence a um usuário.
// Os pagamentos (PIX e boleto) são simulações acadêmicas: nada é cobrado.
// =============================================================================
const express = require('express');
const {
  criarPedido,
  listarMeusPedidos,
  confirmarPagamentoSimulado,
  obterConfiguracaoPix,
  prepararPixDoPedido,
  gerarBoletoDoPedido
} = require('../controllers/pedidosController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');

const router = express.Router();

// POST /api/pedidos — cria um pedido com os itens do carrinho.
router.post('/pedidos', exigirAutenticacao, criarPedido);

// GET /api/pedidos/meus — lista os pedidos de quem está logado.
// O id do usuário vem do token, por isso a URL não recebe usuario_id.
router.get('/pedidos/meus', exigirAutenticacao, listarMeusPedidos);

// PATCH /api/pedidos/:id/pagamento — confirma o pagamento de mentira (simulação).
// Nunca recebe número de cartão nem CVV.
router.patch('/pedidos/:id/pagamento', exigirAutenticacao, confirmarPagamentoSimulado);

// GET /api/pagamentos/pix — devolve a chave PIX de demonstração.
router.get('/pagamentos/pix', exigirAutenticacao, obterConfiguracaoPix);

// POST /api/pedidos/:id/pix — prepara o PIX demonstrativo de um pedido.
router.post('/pedidos/:id/pix', exigirAutenticacao, prepararPixDoPedido);

// POST /api/pedidos/:id/boleto — gera um boleto demonstrativo (sem valor real).
router.post('/pedidos/:id/boleto', exigirAutenticacao, gerarBoletoDoPedido);

module.exports = router;
