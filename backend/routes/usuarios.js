// Cria um agrupador de rotas sem iniciar outro servidor Express.
const express = require('express');
const { cadastrar, entrar, alterarSenha } = require('../controllers/usuariosController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');
const { criarLimitador } = require('../middlewares/limitadorTaxa');

const router = express.Router();
const limitarAcessoConta = criarLimitador({ janelaMs: 15 * 60 * 1000, maximo: 10 });

// Cada rota encaminha a requisição para seu controlador específico.
router.post('/cadastro', limitarAcessoConta, cadastrar);
router.post('/login', limitarAcessoConta, entrar);

// O middleware lê o Bearer token antes de permitir a troca da senha.
router.patch('/usuarios/senha', exigirAutenticacao, alterarSenha);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
