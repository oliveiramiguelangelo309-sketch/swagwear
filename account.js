/* =============================================================================
   account.js — menu da conta na barra de navegação (todas as páginas).
   -----------------------------------------------------------------------------
   - Sem login: mostra os links "Entrar" e "Conta".
   - Com login: mostra o avatar com o primeiro nome e um menu com atalhos.
   - Em telas pequenas: cria o botão "☰" que abre e fecha o menu.
   Fica num arquivo só para não repetir esta lógica em cada página.
   ============================================================================= */

/* A função é executada na hora (IIFE), para as variáveis daqui não se misturarem
   com as variáveis das páginas. */
(function () {
  /* Nomes das chaves usadas no localStorage (memória do navegador). */
  const CHAVE_TOKEN = "swagwear_token";
  const CHAVE_USUARIO = "swagwear_usuario";

  /* Lê a sessão salva depois do login: o token e os dados básicos (id, nome, email).
     Nenhuma senha é guardada no navegador. Devolve null se ninguém estiver logado. */
  function obterSessao() {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const textoUsuario = localStorage.getItem(CHAVE_USUARIO);

    if (!token || !textoUsuario) return null;

    try {
      /* O usuário foi salvo como texto JSON; aqui volta a ser objeto. */
      const usuario = JSON.parse(textoUsuario);
      if (!usuario || !usuario.id || !usuario.nome || !usuario.email) return null;
      return { token, usuario };
    } catch (error) {
      /* Um valor corrompido não pode quebrar a barra de navegação. */
      return null;
    }
  }

  /* Sai da conta: apaga os dois dados do login e volta para a Home. */
  function sair() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    window.location.href = "index.html";
  }

  /* Pega só o primeiro nome ("Maria Clara Souza" -> "Maria"). */
  function primeiroNome(nome) {
    return String(nome || "Usuário").trim().split(/\s+/)[0];
  }

  /* Cria um link <a> com o texto e o destino informados. */
  function criarLink(texto, destino) {
    const link = document.createElement("a");
    link.textContent = texto;
    link.href = destino;
    return link;
  }

  /* Cria o botão hambúrguer (☰) uma única vez; no celular ele abre o mesmo <nav>. */
  function garantirNavToggle(navbar, nav) {
    /* Se o botão já existe, só devolve ele. */
    let botao = navbar.querySelector(".nav-toggle");
    if (botao) return botao;

    botao = document.createElement("button");
    botao.type = "button";
    botao.className = "nav-toggle";
    botao.setAttribute("aria-label", "Abrir menu"); /* texto lido por leitores de tela */
    botao.setAttribute("aria-expanded", "false");
    botao.textContent = "☰";

    /* Clique no botão: abre/fecha o menu e troca o ícone (☰ <-> ✕). */
    botao.addEventListener("click", function () {
      const aberto = nav.classList.toggle("is-open");
      botao.setAttribute("aria-expanded", String(aberto));
      botao.textContent = aberto ? "✕" : "☰";
    });

    /* Clique fora da barra: fecha o menu. */
    document.addEventListener("click", function (event) {
      if (nav.classList.contains("is-open") && !navbar.contains(event.target)) {
        nav.classList.remove("is-open");
        botao.setAttribute("aria-expanded", "false");
        botao.textContent = "☰";
      }
    });

    /* Tecla Esc: também fecha o menu. */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        botao.setAttribute("aria-expanded", "false");
        botao.textContent = "☰";
      }
    });

    navbar.appendChild(botao);
    return botao;
  }

  /* Monta a parte de conta da barra de navegação.
     Troca apenas os links de conta; os demais links da loja ficam como estão. */
  function atualizarNavbar() {
    const navbar = document.querySelector(".navbar");
    const nav = document.querySelector(".navbar nav");
    if (!navbar || !nav) return; /* página sem barra de navegação */

    garantirNavToggle(navbar, nav);

    /* Remove os links de conta escritos no HTML, para não ficarem duplicados. */
    nav.querySelectorAll("a").forEach(function (link) {
      const destino = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
      if (["entrar.html", "cadastro.html", "conta.html"].includes(destino)) link.remove();
    });

    /* Remove um menu de conta antigo, se esta função já tiver rodado antes. */
    const menuAntigo = nav.querySelector(".account-menu");
    if (menuAntigo) menuAntigo.remove();

    const sessao = obterSessao();

    /* Ninguém logado: mostra "Entrar" e "Conta" e termina aqui. */
    if (!sessao) {
      const entrar = criarLink("Entrar", "entrar.html");
      const conta = criarLink("Conta", "conta.html");

      /* Mantém os acessos de conta visíveis também em telas pequenas. */
      entrar.classList.add("account-auth-link");
      conta.classList.add("account-auth-link");
      nav.append(entrar, conta);
      return;
    }

    /* Alguém logado: cria o botão com a inicial (avatar) e o primeiro nome. */
    const nomeCurto = primeiroNome(sessao.usuario.nome);
    const menu = document.createElement("div");
    menu.className = "account-menu";

    const botao = document.createElement("button");
    botao.className = "account-trigger";
    botao.type = "button";
    botao.setAttribute("aria-expanded", "false");
    botao.innerHTML = `<span class="account-avatar"></span><span class="account-name"></span><span aria-hidden="true">⌄</span>`;
    /* textContent (e não innerHTML) evita que um nome com código vire HTML. */
    botao.querySelector(".account-avatar").textContent = nomeCurto.charAt(0).toUpperCase();
    botao.querySelector(".account-name").textContent = nomeCurto;

    /* Menu suspenso com atalhos para as seções da página Conta. */
    const dropdown = document.createElement("div");
    dropdown.className = "account-dropdown";
    dropdown.append(
      criarLink("Minha conta", "conta.html#perfil"),
      criarLink("Meus pedidos", "conta.html#pedidos"),
      criarLink("Pedidos confirmados", "conta.html#confirmados"),
      criarLink("Rastreio", "conta.html#rastreio"),
      criarLink("Alterar senha", "conta.html#senha")
    );

    /* Botão "Sair" no final do menu. */
    const botaoSair = document.createElement("button");
    botaoSair.type = "button";
    botaoSair.className = "account-logout";
    botaoSair.textContent = "Sair";
    botaoSair.addEventListener("click", sair);
    dropdown.appendChild(botaoSair);

    botao.addEventListener("click", function (event) {
      /* Impede que este clique chegue no "clique fora" abaixo e feche o menu na hora. */
      event.stopPropagation();

      /* No computador, clicar diretamente no primeiro nome abre a página da conta. */
      if (event.target.classList.contains("account-name")) {
        window.location.href = "conta.html";
        return;
      }

      /* O avatar e a seta abrem/fecham os atalhos rápidos do menu. */
      const aberto = menu.classList.toggle("is-open");
      botao.setAttribute("aria-expanded", String(aberto));
    });

    /* Clique fora do menu: fecha. */
    document.addEventListener("click", function (event) {
      if (!menu.contains(event.target)) {
        menu.classList.remove("is-open");
        botao.setAttribute("aria-expanded", "false");
      }
    });

    /* Tecla Esc: fecha. */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") menu.classList.remove("is-open");
    });

    menu.append(botao, dropdown);
    nav.appendChild(menu);
  }

  /* Deixa estas funções disponíveis para outras páginas (ex.: conta.html, carrinho.html)
     sem elas precisarem conhecer as chaves internas do localStorage. */
  window.SwagWearAccount = { obterSessao, sair, atualizarNavbar, primeiroNome };

  /* Monta a barra assim que o HTML terminar de carregar (ou na hora, se já carregou). */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarNavbar);
  } else {
    atualizarNavbar();
  }
})();
