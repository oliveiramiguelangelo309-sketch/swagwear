/**
 * Teste visual automatizado das telas de conta em desktop e celular.
 * Ele usa somente o servidor e o SQLite locais; nada é enviado para produção.
 */
process.env.DATABASE_URL = "";
process.env.JWT_SECRET = "segredo-exclusivo-do-teste-visual-swagwear";
process.env.APP_ORIGIN = "http://127.0.0.1";
process.env.NODE_ENV = "test";
// Credenciais fictícias garantem que o teste nunca envie email real.
process.env.PIX_KEY = "chave-pix-exclusiva-do-teste-visual";
process.env.EMAIL_MOCK = "true";

const { chromium } = require("playwright");
const app = require("../server");
const { run, get, closeDatabase } = require("../database");

const marcador = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `teste-visual-${marcador}@swagwear.local`;
const senha = "SenhaVisual123";
let servidor;
let navegador;
let usuarioId;
let produtoTesteId;

function confirmar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function executar() {
  servidor = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => servidor.once("listening", resolve));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const cadastro = await fetch(`${base}/api/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Pessoa Visual", email, senha }),
  });
  confirmar(cadastro.status === 201, `Cadastro visual retornou HTTP ${cadastro.status}.`);
  usuarioId = (await get("SELECT id FROM usuarios WHERE email = ?", [email])).id;
  produtoTesteId = (await run(
    `INSERT INTO produtos
     (nome, preco, descricao, tipo, categoria, cor, estilo, colecao, imagem, estoque, ativo)
     VALUES (?, 99.9, 'Teste visual', 'camiseta', 'parte_superior', 'preto', 'street', 'teste', 'teste.png', 2, 1)`,
    [`Produto visual ${marcador}`]
  )).id;

  // Usa o Chrome que já está instalado no computador, sem baixar outro navegador.
  navegador = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const pagina = await navegador.newPage({ viewport: { width: 1366, height: 768 } });
  pagina.on("pageerror", (erro) => console.log(`ERRO DO NAVEGADOR: ${erro.message}`));

  // Confere a entrada real pela página, inclusive salvamento da sessão e redirecionamento.
  await pagina.goto(`${base}/entrar.html`);
  await pagina.fill("#email", email);
  await pagina.fill("#senha", senha);
  await pagina.click('#formLogin button[type="submit"]');
  await pagina.waitForFunction(() => location.pathname.endsWith("/index.html"), null, { timeout: 10000 });
  await pagina.waitForLoadState("domcontentloaded");
  confirmar(new URL(pagina.url()).pathname.endsWith("/index.html"), "O login não redirecionou para a Home.");
  const diagnostico = await pagina.evaluate(() => ({
    tokenSalvo: Boolean(localStorage.getItem("swagwear_token")),
    usuarioSalvo: Boolean(localStorage.getItem("swagwear_usuario")),
    scriptEncontrado: Boolean(document.querySelector('script[src="account.js"]')),
    scriptCarregado: Boolean(window.SwagWearAccount),
    menuCriado: Boolean(document.querySelector(".account-menu")),
  }));
  if (!diagnostico.menuCriado) console.log(`DIAGNÓSTICO SEGURO: ${JSON.stringify(diagnostico)}`);
  confirmar(await pagina.locator(".account-trigger").isVisible(), "O avatar logado não apareceu.");
  await pagina.click(".account-name");
  await pagina.waitForFunction(() => location.pathname.endsWith("/conta.html"));
  confirmar((await pagina.locator("#perfilNome").textContent()) === "Pessoa Visual", "O perfil não mostrou o nome.");
  confirmar(await pagina.locator(".conta-tabs button").count() === 6, "As abas da conta não apareceram.");

  // Abre o menu e confirma os atalhos que o usuário pediu.
  await pagina.click(".account-avatar");
  confirmar(await pagina.locator('.account-dropdown a[href="conta.html#confirmados"]').isVisible(), "Atalho de pedidos ausente.");
  confirmar(await pagina.locator('.account-dropdown a[href="conta.html#rastreio"]').isVisible(), "Atalho de rastreio ausente.");

  // Confere o PIX acadêmico: chave carregada, email mock e pedido realmente pago.
  await pagina.evaluate((produtoId) => {
    localStorage.setItem("carrinho", JSON.stringify([{ produto_id: produtoId, nome: "Produto visual", preco: 99.9, imagem: "teste.png", quantidade: 1 }]));
  }, produtoTesteId);
  await pagina.goto(`${base}/pagamento.html`);
  confirmar((await pagina.locator("#compradorEmail").textContent()).includes(email), "O pagamento não identificou o comprador.");
  await pagina.waitForFunction(() => document.querySelector("#chavePix")?.textContent !== "Carregando...");
  confirmar(Boolean((await pagina.locator("#chavePix").textContent()).trim()), "A chave PIX não apareceu.");
  await pagina.click("#btnConfirmarPix");
  await pagina.waitForFunction(() => document.querySelector("#mensagemPagamento")?.textContent.includes("está pago"));
  const pedidoPix = await get("SELECT id, status FROM pedidos WHERE usuario_id = ? AND metodo_pagamento = 'pix'", [usuarioId]);
  confirmar(pedidoPix?.status === "pago", "O botão PIX não marcou o pedido como pago.");

  await pagina.goto(`${base}/conta.html#confirmados`);
  await pagina.waitForFunction(() => document.querySelectorAll("#pedidosConfirmados .pedido-card").length >= 1);
  const confirmados = await pagina.locator("#pedidosConfirmados").textContent();
  confirmar(confirmados.includes(`Pedido #${pedidoPix.id}`), "O pedido PIX pago não apareceu na conta.");

  // Repete a verificação em largura de celular e procura estouro horizontal.
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto(`${base}/pagamento.html`);
  confirmar(await pagina.locator("#painelPix").isVisible(), "O painel do PIX sumiu no celular.");
  confirmar(await pagina.locator("#painelBoleto").count() === 0, "O boleto voltou a aparecer no pagamento.");
  const pagamentoEstourou = await pagina.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  confirmar(!pagamentoEstourou, "O pagamento criou rolagem horizontal no celular.");

  await pagina.goto(`${base}/index.html`);
  confirmar(await pagina.locator(".account-trigger").isVisible(), "A conta logada sumiu no celular.");
  const estourouTela = await pagina.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  confirmar(!estourouTela, "A página criou rolagem horizontal no celular.");

  // O botão Sair deve remover a sessão e devolver a navbar ao estado deslogado.
  await pagina.click(".account-avatar");
  await pagina.click(".account-logout");
  await pagina.waitForLoadState("domcontentloaded");
  const sessaoApagada = await pagina.evaluate(() => !localStorage.getItem("swagwear_token") && !localStorage.getItem("swagwear_usuario"));
  confirmar(sessaoApagada, "O logout não removeu a sessão.");

  // Sem sessão, os botões Entrar e Conta continuam acessíveis no celular.
  confirmar(await pagina.locator("a.account-auth-link", { hasText: "Entrar" }).isVisible(), "Entrar ficou oculto no celular.");
  confirmar(await pagina.locator("a.account-auth-link", { hasText: "Conta" }).isVisible(), "Conta ficou oculta no celular.");

  await pagina.goto(`${base}/pagamento.html`);
  confirmar(await pagina.locator("#pagamentoBloqueado").isVisible(), "Usuário deslogado conseguiu acessar a finalização.");

  console.log("INTERFACE DE LOGIN: OK");
  console.log("SESSÃO NO NAVEGADOR: OK");
  console.log("MENU DE CONTA: OK");
  console.log("TELA CONTA EM DESKTOP: OK");
  console.log("PAGAMENTO IDENTIFICA USUÁRIO: OK");
  console.log("PIX CONFIRMA PEDIDO PAGO: OK");
  console.log("BOLETO FORA DO PAGAMENTO: OK");
  console.log("EMAIL DEMONSTRATIVO: MOCK");
  console.log("PEDIDOS PAGOS NA CONTA: OK");
  console.log("LOGOUT: OK");
  console.log("PAGAMENTO SEM LOGIN BLOQUEADO: OK");
  console.log("NAVEGAÇÃO EM CELULAR: OK");
  console.log("ROLAGEM HORIZONTAL NO CELULAR: NÃO");
}

async function finalizar() {
  if (navegador) await navegador.close();
  if (usuarioId) {
    await run("DELETE FROM pedidos WHERE usuario_id = ?", [usuarioId]);
    await run("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
  }
  if (produtoTesteId) await run("DELETE FROM produtos WHERE id = ?", [produtoTesteId]);
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  await closeDatabase();
}

executar()
  .catch((erro) => {
    console.error(`TESTE VISUAL: FALHOU - ${erro.message}`);
    process.exitCode = 1;
  })
  .finally(finalizar);
