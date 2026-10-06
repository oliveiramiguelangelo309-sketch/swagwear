// =============================================================================
// database/init.js — arquivo de compatibilidade.
// -----------------------------------------------------------------------------
// Antes, o banco era preparado rodando este arquivo. Agora quem faz isso é o
// migrate.js, então este arquivo só o executa (comando: npm run init-db).
// =============================================================================
require('./migrate');
