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

// A autenticação impede a criação de pedidos sem um usuário conhecido.
router.post('/pedidos', exigirAutenticacao, criarPedido);

// O id do usuário vem do token, por isso a URL não recebe usuario_id.
router.get('/pedidos/meus', exigirAutenticacao, listarMeusPedidos);

// Esta confirmação é apenas uma simulação da FECIP e nunca recebe cartão ou CVV.
router.patch('/pedidos/:id/pagamento', exigirAutenticacao, confirmarPagamentoSimulado);

// PIX e boleto usam o email e o usuário encontrados pelo JWT.
router.get('/pagamentos/pix', exigirAutenticacao, obterConfiguracaoPix);
router.post('/pedidos/:id/pix', exigirAutenticacao, prepararPixDoPedido);
router.post('/pedidos/:id/boleto', exigirAutenticacao, gerarBoletoDoPedido);

module.exports = router;
