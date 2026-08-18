// DATABASE_URL é a chave de seleção do banco:
// - sem DATABASE_URL: usa o arquivo SQLite local;
// - com DATABASE_URL: usa PostgreSQL persistente.
const adapter = process.env.DATABASE_URL
  ? require('./postgres')
  : require('./sqlite');

// Os controladores conhecem somente esta interface comum.
// Isso evita espalhar detalhes de SQLite ou PostgreSQL pela aplicação.
module.exports = {
  databaseType: adapter.databaseType,
  databasePath: adapter.databasePath,
  initializeDatabase: adapter.initializeDatabase,
  checkDatabase: adapter.checkDatabase,
  closeDatabase: adapter.closeDatabase,
  run: adapter.run,
  get: adapter.get,
  all: adapter.all,
  transaction: adapter.transaction
};
