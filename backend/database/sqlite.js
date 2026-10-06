// =============================================================================
// database/sqlite.js — banco SQLite, usado quando NÃO existe DATABASE_URL.
// -----------------------------------------------------------------------------
// SQLite guarda todo o banco num único arquivo (swagwear.db) dentro desta
// pasta. É prático para testar no computador sem instalar nada.
// As funções daqui têm os mesmos nomes das do postgres.js, para o resto do
// backend funcionar igual com qualquer um dos dois bancos.
// =============================================================================
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose(); // verbose() dá mensagens de erro mais detalhadas

const databaseType = 'sqlite';
const databasePath = path.join(__dirname, 'swagwear.db'); // arquivo do banco
const schemaPath = path.join(__dirname, 'schema.sql'); // SQL que cria as tabelas

// Abre (ou cria, se ainda não existir) o arquivo do banco.
const database = new sqlite3.Database(databasePath, (error) => {
  if (error) console.error('Não foi possível abrir o SQLite:', error.message);
});

// A biblioteca sqlite3 trabalha com "callbacks". As funções abaixo a embrulham
// em Promises, para o resto do código poder usar async/await.

// Executa um texto com vários comandos SQL de uma vez (usado para o schema).
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, (error) => error ? reject(error) : resolve());
  });
}

// Executa INSERT, UPDATE ou DELETE.
// Devolve o id da linha inserida (lastID) e quantas linhas mudaram (changes).
function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    // Usa "function" (e não arrow function) porque o sqlite3 entrega lastID e changes em "this".
    database.run(sql, parameters, function handleResult(error) {
      if (error) return reject(error);
      return resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Busca só a primeira linha do resultado (ou undefined se não houver).
function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
  });
}

// Busca todas as linhas do resultado, numa lista.
function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

// Cria as tabelas lendo o schema.sql. Como ele usa "IF NOT EXISTS",
// pode rodar quantas vezes for preciso sem apagar nada.
async function initializeDatabase() {
  await executeSql(fs.readFileSync(schemaPath, 'utf8'));
}

// No SQLite, "verificar o banco" já cria o arquivo e as tabelas se faltarem.
async function checkDatabase() {
  await initializeDatabase();
}

// O SQLite tem uma única conexão. Esta "fila" faz as transações rodarem uma
// de cada vez, para duas compras ao mesmo tempo não se misturarem.
let transactionQueue = Promise.resolve();

// Transação: um grupo de comandos que dá certo inteiro ou é desfeito inteiro.
// Ex.: criar o pedido, os itens e baixar o estoque — se um falhar, nada fica salvo.
function transaction(work) {
  const current = transactionQueue.then(async () => {
    await run('BEGIN IMMEDIATE TRANSACTION'); // começa a transação

    try {
      const result = await work({ run, get, all }); // executa os comandos do controller
      await run('COMMIT'); // deu tudo certo: grava de vez
      return result;
    } catch (error) {
      await run('ROLLBACK'); // algo falhou: desfaz tudo
      throw error;
    }
  });

  // Mesmo se esta transação falhar, a fila continua andando para a próxima.
  transactionQueue = current.catch(() => undefined);
  return current;
}

// Fecha o arquivo do banco (usado pelos comandos migrate e seed ao terminar).
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
