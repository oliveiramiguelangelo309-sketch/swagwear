const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const databaseType = 'postgres';
const migrationPath = path.join(__dirname, 'migrations', 'postgres', '001_initial.sql');

// O pooler do Supabase usa um certificado assinado pela CA própria do Supabase, que não está
// na lista padrão do Node. DATABASE_SSL_CA aceita o conteúdo PEM do certificado (útil na
// Vercel, onde "\n" pode vir escapado) ou o caminho de um arquivo .crt relativo à raiz do projeto.
function lerCertificadoCa() {
  const valor = String(process.env.DATABASE_SSL_CA || '').trim();

  if (!valor) {
    return undefined;
  }

  if (valor.startsWith('-----BEGIN')) {
    return valor.replace(/\\n/g, '\n');
  }

  return fs.readFileSync(path.resolve(__dirname, '..', '..', valor), 'utf8');
}

// O Pool reaproveita conexões e é apropriado para APIs com várias requisições.
// DATABASE_URL será fornecida pelo serviço PostgreSQL em produção.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : {
        // Em produção, o certificado do servidor deve ser validado por padrão.
        // Só use "false" explicitamente em um ambiente controlado com certificado próprio.
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: lerCertificadoCa()
      }
});

// Os controladores usam ? porque esse formato também funciona no SQLite.
// Aqui eles são convertidos para $1, $2... antes de chegar ao PostgreSQL.
function postgresSql(sql) {
  let position = 0;
  return sql.replace(/\?/g, () => `$${++position}`);
}

function createQueries(queryable) {
  return {
    async run(sql, parameters = []) {
      let preparedSql = postgresSql(sql).trim().replace(/;$/, '');
      const isInsert = /^INSERT\s+/i.test(preparedSql);

      if (isInsert && !/\bRETURNING\b/i.test(preparedSql)) {
        preparedSql += ' RETURNING id';
      }

      const result = await queryable.query(preparedSql, parameters);
      return { id: result.rows[0]?.id, changes: result.rowCount };
    },

    async get(sql, parameters = []) {
      const result = await queryable.query(postgresSql(sql), parameters);
      return result.rows[0];
    },

    async all(sql, parameters = []) {
      const result = await queryable.query(postgresSql(sql), parameters);
      return result.rows;
    }
  };
}

const poolQueries = createQueries(pool);

async function initializeDatabase() {
  // A migration é idempotente e mantém o PostgreSQL com as mesmas tabelas do SQLite.
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
}

// Em produção, migrations são um passo explícito; o servidor apenas testa a conexão.
async function checkDatabase() {
  await pool.query('SELECT 1');
}

async function transaction(work) {
  // Uma transação PostgreSQL precisa usar o mesmo client do BEGIN até COMMIT/ROLLBACK.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(createQueries(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  databaseType,
  databasePath: null,
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
