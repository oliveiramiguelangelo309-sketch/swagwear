const express = require('express');
const { conversar } = require('../controllers/assistenteController');
const { criarLimitador } = require('../middlewares/limitadorTaxa');

const router = express.Router();
const limitarAssistente = criarLimitador({ janelaMs: 60 * 1000, maximo: 15 });

router.post('/assistente', limitarAssistente, conversar);

module.exports = router;
