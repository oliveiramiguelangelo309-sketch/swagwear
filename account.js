/* Este arquivo concentra a sessão visual para não repetir a mesma lógica em cada página. */
(function () {
  const CHAVE_TOKEN = "swagwear_token";
  const CHAVE_USUARIO = "swagwear_usuario";

  // Lê somente id, nome e email salvos depois do login; nenhuma senha é armazenada.
  function obterSessao() {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const textoUsuario = localStorage.getItem(CHAVE_USUARIO);

    if (!token || !textoUsuario) return null;

    try {
      const usuario = JSON.parse(textoUsuario);
      if (!usuario || !usuario.id || !usuario.nome || !usuario.email) return null;
      return { token, usuario };
    } catch (error) {
      // Um valor inválido não deve quebrar a navbar.
      return null;
    }
  }

  // Remove apenas os dois dados criados pelo login e volta para a Home.
  function sair() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    window.location.href = "index.html";
  }

  function primeiroNome(nome) {
    return String(nome || "Usuário").trim().split(/\s+/)[0];
  }

  function criarLink(texto, destino) {
    const link = document.createElement("a");
    link.textContent = texto;
    link.href = destino;
    return link;
  }

  // Troca apenas os links de conta; os demais links existentes da loja são preservados.
  function atualizarNavbar() {
    const nav = document.querySelector(".navbar nav");
    if (!nav) return;

    nav.querySelectorAll("a").forEach(function (link) {
      const destino = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
      if (["entrar.html", "cadastro.html", "conta.html"].includes(destino)) link.remove();
    });

    const menuAntigo = nav.querySelector(".account-menu");
    if (menuAntigo) menuAntigo.remove();

    const sessao = obterSessao();
    if (!sessao) {
      const entrar = criarLink("Entrar", "entrar.html");
      const conta = criarLink("Conta", "conta.html");

      // Mantém os acessos de conta visíveis também em telas pequenas.
      entrar.classList.add("account-auth-link");
      conta.classList.add("account-auth-link");
      nav.append(entrar, conta);
      return;
    }

    const nomeCurto = primeiroNome(sessao.usuario.nome);
    const menu = document.createElement("div");
    menu.className = "account-menu";

    const botao = document.createElement("button");
    botao.className = "account-trigger";
    botao.type = "button";
    botao.setAttribute("aria-expanded", "false");
    botao.innerHTML = `<span class="account-avatar"></span><span class="account-name"></span><span aria-hidden="true">⌄</span>`;
    botao.querySelector(".account-avatar").textContent = nomeCurto.charAt(0).toUpperCase();
    botao.querySelector(".account-name").textContent = nomeCurto;

    const dropdown = document.createElement("div");
    dropdown.className = "account-dropdown";
    dropdown.append(
      criarLink("Minha conta", "conta.html#perfil"),
      criarLink("Meus pedidos", "conta.html#pedidos"),
      criarLink("Pedidos confirmados", "conta.html#confirmados"),
      criarLink("Rastreio", "conta.html#rastreio"),
      criarLink("Alterar senha", "conta.html#senha")
    );

    const botaoSair = document.createElement("button");
    botaoSair.type = "button";
    botaoSair.className = "account-logout";
    botaoSair.textContent = "Sair";
    botaoSair.addEventListener("click", sair);
    dropdown.appendChild(botaoSair);

    botao.addEventListener("click", function (event) {
      event.stopPropagation();

      // No computador, clicar diretamente no primeiro nome abre a página da conta.
      if (event.target.classList.contains("account-name")) {
        window.location.href = "conta.html";
        return;
      }

      // O avatar e a seta continuam abrindo os atalhos rápidos do menu.
      const aberto = menu.classList.toggle("is-open");
      botao.setAttribute("aria-expanded", String(aberto));
    });

    document.addEventListener("click", function (event) {
      if (!menu.contains(event.target)) {
        menu.classList.remove("is-open");
        botao.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") menu.classList.remove("is-open");
    });

    menu.append(botao, dropdown);
    nav.appendChild(menu);
  }

  // A página de conta reutiliza estas funções sem conhecer as chaves internas.
  window.SwagWearAccount = { obterSessao, sair, atualizarNavbar, primeiroNome };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", atualizarNavbar);
  } else {
    atualizarNavbar();
  }
})();
