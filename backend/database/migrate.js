// =============================================================================
// database/migrate.js — cria as tabelas do banco (comando: pnpm run migrate).
// -----------------------------------------------------------------------------
// "Migration" é o passo que prepara a estrutura do banco: tabelas, colunas e
// índices. Ele pode ser rodado várias vezes sem estragar nada, porque o SQL
// usado só cria o que ainda não existe.
// =============================================================================

// Lê o arquivo .env, para que DATABASE_URL funcione também neste comando avulso.
require('dotenv').config();

// databaseType diz qual banco está em uso ("sqlite" ou "postgres").
const { databaseType, initializeDatabase, closeDatabase } = require('./index');

async function migrate() {
  try {
    // Cria as tabelas e índices no banco escolhido.
    await initializeDatabase();
    console.log(`Migration concluída usando ${databaseType}.`);
  } catch (error) {
    // Mostra o motivo da falha e marca o comando como "terminou com erro".
    console.error('Não foi possível executar a migration:', error.message);
    process.exitCode = 1;
  } finally {
    // Fecha a conexão sempre, para o comando terminar e liberar o terminal.
    await closeDatabase();
  }
}

migrate();
