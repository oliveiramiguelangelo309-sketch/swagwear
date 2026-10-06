/**
 * Teste local do fluxo de conta da SwagWear.
 *
 * O teste força o SQLite antes de carregar o servidor. Dessa forma, ele não
 * escreve no Supabase de produção e não depende das credenciais do arquivo .env.
 */
process.env.DATABASE_URL = "";
process.env.JWT_SECRET = "segredo-exclusivo-do-teste-local-swagwear";
process.env.APP_ORIGIN = "http://127.0.0.1";
process.env.NODE_ENV = "test";
// O teste usa chave fictícia e email mock; nenhuma mensagem real é enviada.
process.env.PIX_KEY = "chave-pix-exclusiva-do-teste";
process.env.EMAIL_MOCK = "true";

const bcrypt = require("bcryptjs");
const app = require("../server");
const { run, get, closeDatabase } = require("../database");

// Um e-mail diferente em cada execução evita conflito com testes anteriores.
const identificador = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `teste-conta-${identificador}@swagwear.local`;
const emailOutroUsuario = `teste-isolamento-${identificador}@swagwear.local`;
const senhaInicial = "SenhaTeste123";
const senhaNova = "SenhaNova456";

let servidor;
let usuarioId;
let outroUsuarioId;
let produtoTesteId;

/** Envia uma requisição local e devolve o código HTTP e o JSON recebido. */
async function requisicao(caminho, opcoes = {}) {
  const endereco = servidor.address();
  const resposta = await fetch(`http://127.0.0.1:${endereco.port}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });

  return { status: resposta.status, corpo: await resposta.json() };
}

/** Para o teste com uma explicação simples quando algo não funciona. */
function confirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function executar() {
  // A porta 0 pede ao Windows uma porta livre e evita conflitos.
  servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => servidor.once("listening", resolve));

  const cadastro = await requisicao("/api/cadastro", {
    method: "POST",
    body: JSON.stringify({ nome: "Pessoa de Teste", email, senha: senhaInicial }),
  });
  confirmar(cadastro.status === 201, `Cadastro retornou HTTP ${cadastro.status}.`);

  const login = await requisicao("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, senha: senhaInicial }),
  });
  confirmar(login.status === 200, `Login retornou HTTP ${login.status}.`);
  confirmar(Boolean(login.corpo.token), "O login não devolveu o token JWT.");
  confirmar(Boolean(login.corpo.usuario?.id), "O login não devolveu o usuário.");
  confirmar(!("senha_hash" in login.corpo.usuario), "O login expôs senha_hash.");

  const token = login.corpo.token;
  usuarioId = login.corpo.usuario.id;

  const cadastroOutro = await requisicao("/api/cadastro", {
    method: "POST",
    body: JSON.stringify({ nome: "Outro Usuário", email: emailOutroUsuario, senha: senhaInicial }),
  });
  confirmar(cadastroOutro.status === 201, "Não foi possível criar o segundo usuário do teste.");
  const loginOutro = await requisicao("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: emailOutroUsuario, senha: senhaInicial }),
  });
  confirmar(loginOutro.status === 200, "Não foi possível autenticar o segundo usuário.");
  outroUsuarioId = loginOutro.corpo.usuario.id;

  const semToken = await requisicao("/api/pedidos/meus");
  confirmar(semToken.status === 401, "A rota privada aceitou acesso sem token.");

  // Um produto temporário permite testar a criação real sem alterar o estoque da loja.
  const produtoTeste = await run(
    `INSERT INTO produtos
     (nome, preco, descricao, tipo, categoria, cor, estilo, colecao, imagem, estoque, ativo)
     VALUES (?, 129.9, 'Produto temporário', 'camiseta', 'parte_superior', 'preto', 'street', 'teste', 'teste.png', 3, 1)`,
    [`Produto de teste ${identificador}`]
  );
  produtoTesteId = produtoTeste.id;

  // usuario_id malicioso é enviado de propósito e deve ser ignorado pelo backend.
  const criacaoPedido = await requisicao("/api/pedidos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      usuario_id: outroUsuarioId,
      forma_pagamento: "pix",
      itens: [{ produto_id: produtoTesteId, quantidade: 1 }],
    }),
  });
  confirmar(criacaoPedido.status === 201, `Criação do pedido retornou HTTP ${criacaoPedido.status}.`);
  const pedido = criacaoPedido.corpo.pedido;
  const pedidoNoBanco = await get("SELECT usuario_id, status FROM pedidos WHERE id = ?", [pedido.id]);
  confirmar(pedidoNoBanco.usuario_id === usuarioId, "O backend confiou no usuario_id enviado pelo navegador.");
  confirmar(pedidoNoBanco.status === "pendente", "O pedido não começou como pendente.");

  const pedidosOutro = await requisicao("/api/pedidos/meus", {
    headers: { Authorization: `Bearer ${loginOutro.corpo.token}` },
  });
  confirmar(!pedidosOutro.corpo.pedidos.some((item) => item.id === pedido.id), "Um usuário enxergou o pedido do outro.");

  const pagamentoPorOutro = await requisicao(`/api/pedidos/${pedido.id}/pagamento`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${loginOutro.corpo.token}` },
  });
  confirmar(pagamentoPorOutro.status === 404, "Outro usuário conseguiu pagar o pedido.");

  const configuracaoPix = await requisicao("/api/pagamentos/pix", {
    headers: { Authorization: `Bearer ${token}` },
  });
  confirmar(configuracaoPix.status === 200 && Boolean(configuracaoPix.corpo.chave), "A chave PIX não foi carregada.");

  const preparacaoPix = await requisicao(`/api/pedidos/${pedido.id}/pix`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  confirmar(preparacaoPix.status === 200, `Preparação PIX retornou HTTP ${preparacaoPix.status}.`);
  confirmar(preparacaoPix.corpo.email?.simulado === true, "O email PIX não permaneceu em modo mock.");
  confirmar(preparacaoPix.corpo.pix?.html.includes(configuracaoPix.corpo.chave), "O email PIX não contém a chave configurada.");

  const pagamento = await requisicao(`/api/pedidos/${pedido.id}/pagamento`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  confirmar(pagamento.status === 200, `Pagamento PIX simulado retornou HTTP ${pagamento.status}.`);

  // O boleto saiu do site: a API precisa recusar pedidos com essa forma de pagamento.
  const tentativaBoleto = await requisicao("/api/pedidos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      forma_pagamento: "boleto",
      itens: [{ produto_id: produtoTesteId, quantidade: 1 }],
    }),
  });
  confirmar(tentativaBoleto.status === 400, `Pedido por boleto deveria ser recusado, mas retornou HTTP ${tentativaBoleto.status}.`);

  const pedidos = await requisicao("/api/pedidos/meus", {
    headers: { Authorization: `Bearer ${token}` },
  });
  confirmar(pedidos.status === 200, `Pedidos retornou HTTP ${pedidos.status}.`);
  confirmar(
    pedidos.corpo.pedidos?.some((item) => item.id === pedido.id && item.status === "pago"),
    "O pedido PIX confirmado do usuário não apareceu."
  );

  const senhaErrada = await requisicao("/api/usuarios/senha", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ senha_atual: "senha-incorreta", nova_senha: senhaNova }),
  });
  confirmar(senhaErrada.status === 401, "A troca aceitou uma senha atual incorreta.");

  const troca = await requisicao("/api/usuarios/senha", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ senha_atual: senhaInicial, nova_senha: senhaNova }),
  });
  confirmar(troca.status === 200, `Troca de senha retornou HTTP ${troca.status}.`);

  const registro = await get("SELECT senha_hash FROM usuarios WHERE id = ?", [usuarioId]);
  confirmar(registro.senha_hash !== senhaNova, "A senha foi salva sem proteção.");
  confirmar(await bcrypt.compare(senhaNova, registro.senha_hash), "O hash da senha está incorreto.");

  const loginAntigo = await requisicao("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, senha: senhaInicial }),
  });
  confirmar(loginAntigo.status === 401, "A senha antiga continuou funcionando.");

  const loginNovo = await requisicao("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, senha: senhaNova }),
  });
  confirmar(loginNovo.status === 200, "A nova senha não permitiu fazer login.");

  console.log("TESTE DE CONTA: OK");
  console.log("LOGIN E JWT: OK");
  console.log("PEDIDOS DO USUÁRIO: OK");
  console.log("VÍNCULO PEDIDO/COMPRADOR: OK");
  console.log("PIX CONFIRMADO COMO PAGO: OK");
  console.log("EMAIL PIX EM MODO MOCK: OK");
  console.log("BOLETO RECUSADO (FORA DO SITE): OK");
  console.log("ISOLAMENTO ENTRE USUÁRIOS: OK");
  console.log("TROCA DE SENHA COM BCRYPT: OK");
  console.log("SUPABASE DE PRODUÇÃO ALTERADO: NÃO");
}

async function finalizar() {
  // Exclui exclusivamente os dados temporários criados por este teste local.
  if (usuarioId) {
    await run("DELETE FROM pedidos WHERE usuario_id = ?", [usuarioId]);
    await run("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
  }
  if (outroUsuarioId) {
    await run("DELETE FROM pedidos WHERE usuario_id = ?", [outroUsuarioId]);
    await run("DELETE FROM usuarios WHERE id = ?", [outroUsuarioId]);
  }
  if (produtoTesteId) await run("DELETE FROM produtos WHERE id = ?", [produtoTesteId]);
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  await closeDatabase();
}

executar()
  .catch((erro) => {
    console.error(`TESTE DE CONTA: FALHOU - ${erro.message}`);
    process.exitCode = 1;
  })
  .finally(finalizar);
