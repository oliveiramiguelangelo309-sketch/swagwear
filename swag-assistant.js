(function () {
  const CHAVE_HISTORICO = "swagwear_swag_historico";
  const CHAVE_ABERTO = "swagwear_swag_aberto";

  function lerHistorico() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_HISTORICO);
      const historico = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(historico) ? historico : [];
    } catch (error) {
      return [];
    }
  }

  function salvarHistorico(historico) {
    try {
      sessionStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico.slice(-20)));
    } catch (error) {
      return;
    }
  }

  function injetarEstilos() {
    const estilo = document.createElement("style");
    estilo.textContent = `
      .swag-botao {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 60px;
        height: 60px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        border-radius: 999px;
        background: #7B2FFF;
        color: #FFFFFF;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-weight: 700;
        font-size: 14px;
        line-height: 1;
        box-shadow: 0 8px 24px rgba(123, 47, 255, 0.45);
        z-index: 9999;
      }
      .swag-botao:hover { filter: brightness(1.1); }
      .swag-painel {
        position: fixed;
        right: 24px;
        bottom: 96px;
        width: min(340px, calc(100vw - 32px));
        max-height: min(480px, calc(100vh - 140px));
        background: #151515;
        border: 1px solid #2A2A2A;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      }
      .swag-painel[hidden] { display: none; }
      .swag-cabecalho {
        background: #1A1A1A;
        color: #FFFFFF;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #2A2A2A;
      }
      .swag-cabecalho strong { color: #7B2FFF; }
      .swag-fechar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: none;
        border: none;
        color: #BFBFBF;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }
      .swag-mensagens {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .swag-mensagem {
        max-width: 85%;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-wrap;
      }
      .swag-mensagem-usuario {
        align-self: flex-end;
        background: #7B2FFF;
        color: #FFFFFF;
      }
      .swag-mensagem-swag {
        align-self: flex-start;
        background: #1A1A1A;
        color: #E5E5E5;
        border: 1px solid #2A2A2A;
      }
      .swag-formulario {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #2A2A2A;
      }
      .swag-input {
        flex: 1;
        background: #0A0A0A;
        border: 1px solid #2A2A2A;
        border-radius: 8px;
        color: #FFFFFF;
        padding: 8px 10px;
        font-family: inherit;
        font-size: 14px;
      }
      .swag-enviar {
        background: #7B2FFF;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
      }
      .swag-enviar:disabled { opacity: 0.6; cursor: default; }
    `;
    document.head.appendChild(estilo);
  }

  function criarWidget() {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "swag-botao";
    botao.setAttribute("aria-label", "Abrir assistente Swag");
    botao.textContent = "Swag";

    const painel = document.createElement("div");
    painel.className = "swag-painel";
    painel.hidden = true;
    painel.innerHTML = `
      <div class="swag-cabecalho">
        <span><strong>Swag</strong> · assistente SwagWear</span>
        <button type="button" class="swag-fechar" aria-label="Fechar assistente">×</button>
      </div>
      <div class="swag-mensagens"></div>
      <form class="swag-formulario">
        <input type="text" class="swag-input" placeholder="Pergunte algo sobre a SwagWear..." maxlength="500">
        <button type="submit" class="swag-enviar">Enviar</button>
      </form>
    `;

    document.body.append(botao, painel);

    const mensagensEl = painel.querySelector(".swag-mensagens");
    const formulario = painel.querySelector(".swag-formulario");
    const input = painel.querySelector(".swag-input");
    const botaoFechar = painel.querySelector(".swag-fechar");
    const botaoEnviar = painel.querySelector(".swag-enviar");

    function renderizarMensagem(role, texto) {
      const bolha = document.createElement("div");
      bolha.className = role === "user" ? "swag-mensagem swag-mensagem-usuario" : "swag-mensagem swag-mensagem-swag";
      bolha.textContent = texto;
      mensagensEl.appendChild(bolha);
      mensagensEl.scrollTop = mensagensEl.scrollHeight;
    }

    let historico = lerHistorico();

    if (historico.length === 0) {
      historico = [{ role: "model", text: "Oi! Eu sou a Swag. Posso ajudar com produtos, pedidos ou pagamento." }];
      salvarHistorico(historico);
    }

    historico.forEach((item) => renderizarMensagem(item.role === "user" ? "user" : "swag", item.text));

    function abrirPainel() {
      painel.hidden = false;
      sessionStorage.setItem(CHAVE_ABERTO, "1");
      input.focus();
    }

    function fecharPainel() {
      painel.hidden = true;
      sessionStorage.setItem(CHAVE_ABERTO, "0");
    }

    botao.addEventListener("click", function () {
      if (painel.hidden) abrirPainel();
      else fecharPainel();
    });

    botaoFechar.addEventListener("click", fecharPainel);

    formulario.addEventListener("submit", async function (event) {
      event.preventDefault();
      const mensagem = input.value.trim();
      if (!mensagem) return;

      renderizarMensagem("user", mensagem);
      historico.push({ role: "user", text: mensagem });
      salvarHistorico(historico);
      input.value = "";
      input.disabled = true;
      botaoEnviar.disabled = true;

      try {
        const resposta = await fetch("/api/assistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem, historico: historico.slice(0, -1) })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(dados.mensagem || "Não foi possível falar com a Swag agora.");
        }

        renderizarMensagem("swag", dados.resposta);
        historico.push({ role: "model", text: dados.resposta });
        salvarHistorico(historico);
      } catch (error) {
        renderizarMensagem("swag", error.message);
      } finally {
        input.disabled = false;
        botaoEnviar.disabled = false;
        input.focus();
      }
    });

    if (sessionStorage.getItem(CHAVE_ABERTO) === "1") abrirPainel();
  }

  function iniciar() {
    injetarEstilos();
    criarWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
