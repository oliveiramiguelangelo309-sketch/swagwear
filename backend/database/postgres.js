// =============================================================================
// database/postgres.js — banco PostgreSQL (Supabase), usado com DATABASE_URL.
// -----------------------------------------------------------------------------
// É o banco do site online. As funções daqui têm os mesmos nomes das do
// sqlite.js, para o resto do backend não precisar saber qual banco está em uso.
// =============================================================================
const fs = require('node:fs');
const path = require('node:path');
const { Pool, types } = require('pg'); // "pg" é a biblioteca oficial do PostgreSQL para Node

// O pg devolve BIGINT/BIGSERIAL (tipo 20) como texto, porque números muito grandes não cabem
// num Number do JavaScript. Nossos ids são pequenos, e o frontend compara ids como número
// (igual ao SQLite); sem isto, a vitrine da home não encontrava nenhum produto ("1" !== 1).
types.setTypeParser(20, (valor) => Number.parseInt(valor, 10));

const databaseType = 'postgres';

// Arquivo SQL que cria as tabelas no PostgreSQL (usado pelo "pnpm run migrate").
const migrationPath = path.join(__dirname, 'migrations', 'postgres', '001_initial.sql');

// O pooler do Supabase usa um certificado assinado pela CA própria do Supabase, que não está
// na lista padrão do Node. DATABASE_SSL_CA aceita o conteúdo PEM do certificado (útil na
// Vercel, onde "\n" pode vir escapado) ou o caminho de um arquivo .crt relativo à raiz do projeto.
function lerCertificadoCa() {
  const valor = String(process.env.DATABASE_SSL_CA || '').trim();

  // Sem certificado configurado: usa a lista padrão do Node.
  if (!valor) {
    return undefined;
  }

  // O valor já é o próprio certificado: troca "\n" escrito por quebras de linha de verdade.
  if (valor.startsWith('-----BEGIN')) {
    return valor.replace(/\\n/g, '\n');
  }

  // Senão, é o caminho de um arquivo .crt: lê o conteúdo dele.
  return fs.readFileSync(path.resolve(__dirname, '..', '..', valor), 'utf8');
}

// O Pool mantém algumas conexões abertas e as reaproveita entre requisições,
// o que é bem mais rápido do que conectar de novo a cada pedido.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // endereço, usuário e senha do banco
  ssl: process.env.DATABASE_SSL === 'false'
    ? false // sem criptografia (só para bancos locais de teste)
    : {
        // Confere se o servidor do banco é mesmo quem diz ser (padrão: sim).
        // Só use "false" explicitamente em um ambiente controlado com certificado próprio.
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: lerCertificadoCa()
      }
});

// Os controllers escrevem o SQL com "?" (formato do SQLite).
// O PostgreSQL usa $1, $2, $3... então trocamos cada "?" pelo número certo.
// Ex.: "WHERE id = ? AND ativo = ?"  vira  "WHERE id = $1 AND ativo = $2".
function postgresSql(sql) {
  let position = 0;
  return sql.replace(/\?/g, () => `$${++position}`);
}

// Cria as funções run/get/all em cima de quem executa as consultas:
// o pool (uso normal) ou um client fixo (dentro de uma transação).
function createQueries(queryable) {
  return {
    // INSERT/UPDATE/DELETE. Devolve { id, changes } igual ao SQLite.
    async run(sql, parameters = []) {
      // Converte os "?" e tira um ";" final, se houver.
      let preparedSql = postgresSql(sql).trim().replace(/;$/, '');
      const isInsert = /^INSERT\s+/i.test(preparedSql);

      // O PostgreSQL só devolve o id inserido se pedirmos com "RETURNING id".
      if (isInsert && !/\bRETURNING\b/i.test(preparedSql)) {
        preparedSql += ' RETURNING id';
      }

      const result = await queryable.query(preparedSql, parameters);
      return { id: result.rows[0]?.id, changes: result.rowCount };
    },

    // Devolve só a primeira linha do resultado.
    async get(sql, parameters = []) {
      const result = await queryable.query(postgresSql(sql), parameters);
      return result.rows[0];
    },

    // Devolve todas as linhas do resultado.
    async all(sql, parameters = []) {
      const result = await queryable.query(postgresSql(sql), parameters);
      return result.rows;
    }
  };
}

// Funções de uso normal, que pegam qualquer conexão livre do pool.
const poolQueries = createQueries(pool);

// Cria as tabelas no PostgreSQL. O SQL só cria o que falta, então pode rodar de novo.
async function initializeDatabase() {
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
}

// Online, as tabelas são criadas antes com "pnpm run migrate".
// Aqui o servidor só testa se consegue falar com o banco.
async function checkDatabase() {
  await pool.query('SELECT 1');
}

// Transação: grupo de comandos que dá certo inteiro ou é desfeito inteiro.
async function transaction(work) {
  // Todos os comandos da transação precisam usar a MESMA conexão,
  // do BEGIN até o COMMIT/ROLLBACK. Por isso separamos um client só para ela.
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // começa a transação
    const result = await work(createQueries(client)); // comandos do controller
    await client.query('COMMIT'); // tudo certo: grava de vez
    return result;
  } catch (error) {
    await client.query('ROLLBACK'); // algo falhou: desfaz tudo
    throw error;
  } finally {
    client.release(); // devolve a conexão para o pool
  }
}

// Fecha todas as conexões (usado pelos comandos migrate e seed ao terminar).
async function closeDatabase() {
  await pool.end();
}

module.exports = {
  databaseType,
  databasePath: null, // no PostgreSQL não existe arquivo local
  initializeDatabase,
  checkDatabase,
  closeDatabase,
  run: poolQueries.run,
  get: poolQueries.get,
  all: poolQueries.all,
  transaction,
  // Exportado somente para testes unitários da conversão; controladores não usam esta função.
  postgresSql
};
