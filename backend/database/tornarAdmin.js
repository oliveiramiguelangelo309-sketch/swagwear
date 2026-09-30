require('dotenv').config();
const { run, get, closeDatabase, initializeDatabase } = require('./index');

async function tornarAdmin() {
  // O pnpm repassa o "--" literalmente para o script (o npm não), então ele é ignorado aqui.
  const argumentos = process.argv.slice(2).filter((argumento) => argumento !== '--');
  const email = String(argumentos[0] || '').trim().toLowerCase();

  if (!email) {
    console.error('Uso: npm run tornar-admin -- email@exemplo.com');
    process.exitCode = 1;
    return;
  }

  try {
    await initializeDatabase();

    const usuario = await get('SELECT id, nome FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      console.error(`Nenhum usuário encontrado com o email ${email}.`);
      process.exitCode = 1;
      return;
    }

    await run('UPDATE usuarios SET admin = 1 WHERE id = ?', [usuario.id]);
    console.log(`${usuario.nome} (${email}) agora é administrador.`);
  } catch (error) {
    console.error('Não foi possível promover o usuário:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

tornarAdmin();
