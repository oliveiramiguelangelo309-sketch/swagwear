// =============================================================================
// routes/assistente.js — rota do chat da assistente virtual "Swag".
// -----------------------------------------------------------------------------
// Recebe as perguntas digitadas no widget de chat (swag-assistant.js) e
// repassa ao controller, que consulta a IA do Gemini.
// =============================================================================
const express = require('express');
const { conversar } = require('../controllers/assistenteController');
const { criarLimitador } = require('../middlewares/limitadorTaxa');

// Router é um "mini aplicativo" com rotas, que o server.js liga no prefixo /api.
const router = express.Router();

// Cada visitante (IP) pode mandar no máximo 15 mensagens por minuto.
// Isso protege a cota gratuita do Gemini contra abuso.
const limitarAssistente = criarLimitador({ janelaMs: 60 * 1000, maximo: 15 });

// POST /api/assistente — primeiro passa pelo limitador, depois pelo controller.
router.post('/assistente', limitarAssistente, conversar);

module.exports = router;
