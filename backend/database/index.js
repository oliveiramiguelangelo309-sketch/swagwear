// =============================================================================
// database/index.js — escolhe qual banco de dados o site vai usar.
// -----------------------------------------------------------------------------
// A variável de ambiente DATABASE_URL decide o banco:
//   - sem DATABASE_URL: usa um arquivo SQLite local (bom para testar no PC);
//   - com DATABASE_URL: usa o PostgreSQL do Supabase (usado online).
// =============================================================================
const adapter = process.env.DATABASE_URL
  ? require('./postgres')
  : require('./sqlite');

// O resto do backend só conhece as funções abaixo, que existem nos dois bancos.
// Assim nenhum controller precisa saber se o banco é SQLite ou PostgreSQL.
module.exports = {
  databaseType: adapter.databaseType, // "sqlite" ou "postgres"
  databasePath: adapter.databasePath, // caminho do arquivo (só no SQLite)
  initializeDatabase: adapter.initializeDatabase, // cria tabelas e índices
  checkDatabase: adapter.checkDatabase, // confirma que o banco está acessível
  closeDatabase: adapter.closeDatabase, // fecha a conexão
  run: adapter.run, // executa INSERT/UPDATE/DELETE
  get: adapter.get, // busca uma única linha
  all: adapter.all, // busca várias linhas
  transaction: adapter.transaction // agrupa comandos que precisam dar certo juntos
};
