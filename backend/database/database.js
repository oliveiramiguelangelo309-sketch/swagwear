// =============================================================================
// database/database.js — arquivo de compatibilidade.
// -----------------------------------------------------------------------------
// Versões antigas do projeto importavam o banco por este arquivo. Hoje a
// implementação real fica em index.js (que escolhe SQLite ou PostgreSQL),
// então aqui apenas repassamos tudo o que index.js exporta.
// =============================================================================
module.exports = require('./index');
