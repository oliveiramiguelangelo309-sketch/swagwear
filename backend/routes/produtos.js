// Cria as rotas de leitura do catálogo sem alterar os cards atuais da loja.
const express = require('express');
const { listar, buscarPorId } = require('../controllers/produtosController');

const router = express.Router();

// A rota com /:id vem depois da listagem e recebe um id pela URL.
router.get('/produtos', listar);
router.get('/produtos/:id', buscarPorId);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
