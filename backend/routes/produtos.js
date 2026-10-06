// =============================================================================
// routes/produtos.js — rotas de leitura do catálogo de camisetas.
// -----------------------------------------------------------------------------
// São públicas (não exigem login): a home, a loja e a página de produto usam
// estas rotas para montar os cards.
// =============================================================================
const express = require('express');
const { listar, buscarPorId } = require('../controllers/produtosController');

const router = express.Router();

// GET /api/produtos — lista todos os produtos ativos.
router.get('/produtos', listar);

// GET /api/produtos/:id — busca um produto pelo número que vem na URL.
// Ex.: /api/produtos/3 devolve a camiseta de id 3.
router.get('/produtos/:id', buscarPorId);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
