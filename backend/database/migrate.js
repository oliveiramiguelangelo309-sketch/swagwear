// Carrega .env para que DATABASE_URL também funcione neste comando separado.
require('dotenv').config();
const { databaseType, initializeDatabase, closeDatabase } = require('./index');

async function migrate() {
  try {
    await initializeDatabase();
    console.log(`Migration concluída usando ${databaseType}.`);
  } catch (error) {
    console.error('Não foi possível executar a migration:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

migrate();
