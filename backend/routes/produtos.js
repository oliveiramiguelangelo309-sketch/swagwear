// Cria as rotas de leitura do catálogo sem alterar os cards atuais da loja.
const express = require('express');
const { listar, buscarPorId, listarAdmin, criar, atualizar } = require('../controllers/produtosController');
const { exigirAutenticacao, exigirAdmin } = require('../middlewares/autenticacao');

const router = express.Router();

router.get('/admin/produtos', exigirAutenticacao, exigirAdmin, listarAdmin);
router.post('/admin/produtos', exigirAutenticacao, exigirAdmin, criar);
router.patch('/admin/produtos/:id', exigirAutenticacao, exigirAdmin, atualizar);

// A rota com /:id vem depois da listagem e recebe um id pela URL.
router.get('/produtos', listar);
router.get('/produtos/:id', buscarPorId);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
