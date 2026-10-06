// =============================================================================
// routes/usuarios.js — rotas de conta: cadastro, login e troca de senha.
// =============================================================================
const express = require('express');
const { cadastrar, entrar, alterarSenha } = require('../controllers/usuariosController');
const { exigirAutenticacao } = require('../middlewares/autenticacao');
const { criarLimitador } = require('../middlewares/limitadorTaxa');

// Router agrupa estas rotas sem criar outro servidor.
const router = express.Router();

// Cada IP pode tentar cadastro/login no máximo 10 vezes a cada 15 minutos.
// Isso dificulta alguém ficar "chutando" senhas.
const limitarAcessoConta = criarLimitador({ janelaMs: 15 * 60 * 1000, maximo: 10 });

// POST /api/cadastro — cria uma conta nova.
router.post('/cadastro', limitarAcessoConta, cadastrar);

// POST /api/login — confere email e senha e devolve um token de acesso.
router.post('/login', limitarAcessoConta, entrar);

// PATCH /api/usuarios/senha — troca a senha. Exige estar logado:
// o middleware exigirAutenticacao lê o token antes de chegar no controller.
router.patch('/usuarios/senha', exigirAutenticacao, alterarSenha);

// O server.js importa este router e adiciona o prefixo /api.
module.exports = router;
