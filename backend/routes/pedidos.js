const express = require('express');
const {
  criarPedido,
  listarMeusPedidos,
  confirmarPagamentoSimulado
} = require('../controllers/pedidosController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');

const router = express.Router();

// A autenticação impede a criação de pedidos sem um usuário conhecido.
router.post('/pedidos', exigirAutenticacao, criarPedido);

// O id do usuário vem do token, por isso a URL não recebe usuario_id.
router.get('/pedidos/meus', exigirAutenticacao, listarMeusPedidos);

// Esta confirmação é apenas uma simulação da FECIP e nunca recebe cartão ou CVV.
router.patch('/pedidos/:id/pagamento', exigirAutenticacao, confirmarPagamentoSimulado);

module.exports = router;
