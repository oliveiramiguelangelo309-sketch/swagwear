// Cria um agrupador de rotas sem iniciar outro servidor Express.
const express = require('express');
const { cadastrar, entrar } = require('../controllers/usuariosController');

const router = express.Router();

// Cada rota encaminha a requisição para seu controlador específico.
router.post('/cadastro', cadastrar);
router.post('/login', entrar);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
