const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const databaseType = 'sqlite';
const databasePath = path.join(__dirname, 'swagwear.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// SQLite cria o arquivo automaticamente quando ele ainda não existe.
const database = new sqlite3.Database(databasePath, (error) => {
  if (error) console.error('Não foi possível abrir o SQLite:', error.message);
});

function executeSql(sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, (error) => error ? reject(error) : resolve());
  });
}

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function handleResult(error) {
      if (error) return reject(error);
      return resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
  });
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

async function initializeDatabase() {
  // O schema usa IF NOT EXISTS, portanto a migration pode rodar mais de uma vez.
  await executeSql(fs.readFileSync(schemaPath, 'utf8'));
}

// No desenvolvimento, verificar o banco também garante que o arquivo/tabelas existam.
async function checkDatabase() {
  await initializeDatabase();
}

// Uma fila impede que duas transações compartilhem a única conexão SQLite ao mesmo tempo.
let transactionQueue = Promise.resolve();

function transaction(work) {
  const current = transactionQueue.then(async () => {
    await run('BEGIN IMMEDIATE TRANSACTION');

    try {
      const result = await work({ run, get, all });
      await run('COMMIT');
      return result;
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });

  transactionQueue = current.catch(() => undefined);
  return current;
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    database.close((error) => error ? reject(error) : resolve());
  });
}

module.exports = {
  databaseType,
  databasePath,
  initializeDatabase,
  checkDatabase,
  closeDatabase,
  run,
  get,
  all,
  transaction
};
