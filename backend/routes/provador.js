const express = require('express');
const multer = require('multer');
const { gerar } = require('../controllers/provadorController');

const router = express.Router();

// memoryStorage mantém a foto apenas na memória RAM durante a requisição.
// Nenhum arquivo pessoal é criado no disco ou inserido no SQLite.
const upload = multer({
  storage: multer.memoryStorage(),
  // Mantem a foto abaixo do limite de 4,5 MB da Vercel, incluindo o multipart.
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.mimetype)) {
      callback(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
      return;
    }

    callback(null, true);
  }
});

// "foto" precisa ser o mesmo nome usado no FormData do frontend.
router.post('/provador', upload.single('foto'), gerar);

module.exports = router;
