const express = require('express');
const { criarPedido } = require('../controllers/pedidosController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');

const router = express.Router();

// A autenticação impede a criação de pedidos sem um usuário conhecido.
router.post('/pedidos', exigirAutenticacao, criarPedido);

module.exports = router;
