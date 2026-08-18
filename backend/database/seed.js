// Carrega DATABASE_URL quando o seed for executado fora do servidor.
require('dotenv').config();
const products = require('./seeds/products');
const { databaseType, run, closeDatabase, initializeDatabase } = require('./index');

async function seed() {
  try {
    // Garante que as tabelas existam antes de inserir dados.
    await initializeDatabase();

    for (const product of products) {
      // ON CONFLICT funciona nos dois bancos e impede duplicação pelo id.
      await run(
        `INSERT INTO produtos (
          id, nome, preco, descricao, tipo, categoria, cor, estilo, colecao,
          imagem, imagem_sem_fundo, estoque
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING`,
        [
          product.id, product.nome, product.preco, product.descricao, product.tipo,
          product.categoria, product.cor, product.estilo, product.colecao,
          product.imagem, product.imagem_sem_fundo, product.estoque
        ]
      );
    }

    // No PostgreSQL, ajusta a sequência para o próximo INSERT sem id não colidir com o seed.
    if (databaseType === 'postgres') {
      await run(`SELECT setval(pg_get_serial_sequence('produtos', 'id'),
        COALESCE((SELECT MAX(id) FROM produtos), 1), true)`);
    }

    console.log(`Seed concluído usando ${databaseType}.`);
  } catch (error) {
    console.error('Não foi possível executar o seed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

seed();
