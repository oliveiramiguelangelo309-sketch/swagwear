/* =============================================================================
   swag-assistant.js — chat da assistente virtual "Swag" (canto inferior direito).
   -----------------------------------------------------------------------------
   Este arquivo cria sozinho o botão "Swag", a janela do chat e os estilos dela.
   Basta incluir <script src="swag-assistant.js"></script> numa página.
   As perguntas vão para POST /api/assistente, que consulta a IA do Gemini.
   ============================================================================= */

/* IIFE: a função roda na hora e mantém as variáveis daqui separadas das da página. */
(function () {
  /* Chaves do sessionStorage: memória do navegador que dura enquanto a aba
     estiver aberta. Assim a conversa continua ao trocar de página. */
  const CHAVE_HISTORICO = "swagwear_swag_historico";
  const CHAVE_ABERTO = "swagwear_swag_aberto";

  /* Lê a conversa salva. Se não houver nada (ou estiver corrompido), devolve lista vazia. */
  function lerHistorico() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_HISTORICO);
      const historico = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(historico) ? historico : [];
    } catch (error) {
      return [];
    }
  }

  /* Salva só as 20 últimas mensagens. Se o navegador bloquear o armazenamento
     (ex.: modo privado), apenas ignora: o chat continua funcionando. */
  function salvarHistorico(historico) {
    try {
      sessionStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico.slice(-20)));
    } catch (error) {
      return;
    }
  }

  /* Cria uma tag <style> com o visual do chat. Ficar aqui dentro faz o widget
     funcionar em qualquer página, mesmo sem mexer no style.css. */
  function injetarEstilos() {
    const estilo = document.createElement("style");
    estilo.textContent = `
      /* Botão redondo roxo "Swag", fixo no canto inferior direito */
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
      /* Janela do chat, logo acima do botão */
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
      /* Faixa do topo com o título e o botão de fechar (×) */
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
      /* Área das mensagens, com rolagem própria */
      .swag-mensagens {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      /* Bolha de cada mensagem: roxa à direita (visitante), escura à esquerda (Swag) */
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
      /* Campo de digitar + botão Enviar, no rodapé da janela */
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

  /* Cria o botão, a janela do chat e toda a lógica de enviar/receber mensagens. */
  function criarWidget() {
    /* Botão que abre e fecha o chat. */
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "swag-botao";
    botao.setAttribute("aria-label", "Abrir assistente Swag");
    botao.textContent = "Swag";

    /* Janela do chat, que começa escondida (hidden). */
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

    /* Coloca o botão e a janela no final da página. */
    document.body.append(botao, painel);

    /* Guarda referências para as partes da janela que vamos usar. */
    const mensagensEl = painel.querySelector(".swag-mensagens");
    const formulario = painel.querySelector(".swag-formulario");
    const input = painel.querySelector(".swag-input");
    const botaoFechar = painel.querySelector(".swag-fechar");
    const botaoEnviar = painel.querySelector(".swag-enviar");

    /* Desenha uma bolha de mensagem. role "user" = visitante; qualquer outro = Swag.
       textContent garante que a resposta seja mostrada como texto, nunca como HTML. */
    function renderizarMensagem(role, texto) {
      const bolha = document.createElement("div");
      bolha.className = role === "user" ? "swag-mensagem swag-mensagem-usuario" : "swag-mensagem swag-mensagem-swag";
      bolha.textContent = texto;
      mensagensEl.appendChild(bolha);
      /* Rola até o final para a mensagem nova aparecer. */
      mensagensEl.scrollTop = mensagensEl.scrollHeight;
    }

    /* Recupera a conversa desta aba. */
    let historico = lerHistorico();

    /* Conversa nova: começa com a saudação da Swag. */
    if (historico.length === 0) {
      historico = [{ role: "model", text: "Oi! Eu sou a Swag. Posso ajudar com produtos, pedidos ou pagamento." }];
      salvarHistorico(historico);
    }

    /* Mostra todas as mensagens salvas. */
    historico.forEach((item) => renderizarMensagem(item.role === "user" ? "user" : "swag", item.text));

    /* Abre a janela e lembra que ela está aberta (para continuar aberta em outra página). */
    function abrirPainel() {
      painel.hidden = false;
      sessionStorage.setItem(CHAVE_ABERTO, "1");
      input.focus();
    }

    /* Fecha a janela e lembra que ela está fechada. */
    function fecharPainel() {
      painel.hidden = true;
      sessionStorage.setItem(CHAVE_ABERTO, "0");
    }

    /* O botão "Swag" alterna entre abrir e fechar. */
    botao.addEventListener("click", function () {
      if (painel.hidden) abrirPainel();
      else fecharPainel();
    });

    /* O "×" do topo fecha a janela. */
    botaoFechar.addEventListener("click", fecharPainel);

    /* Envio de uma pergunta (botão Enviar ou tecla Enter). */
    formulario.addEventListener("submit", async function (event) {
      /* Impede o formulário de recarregar a página. */
      event.preventDefault();
      const mensagem = input.value.trim();
      if (!mensagem) return; /* não envia mensagem vazia */

      /* Mostra a pergunta na tela e salva no histórico. */
      renderizarMensagem("user", mensagem);
      historico.push({ role: "user", text: mensagem });
      salvarHistorico(historico);

      /* Limpa e trava o campo enquanto espera a resposta. */
      input.value = "";
      input.disabled = true;
      botaoEnviar.disabled = true;

      try {
        /* Manda a pergunta e o histórico anterior (sem a pergunta atual, que já vai em "mensagem"). */
        const resposta = await fetch("/api/assistente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem, historico: historico.slice(0, -1) })
        });

        const dados = await resposta.json();

        /* Erro do servidor (ex.: muitas mensagens seguidas): usa a mensagem que ele mandou. */
        if (!resposta.ok) {
          throw new Error(dados.mensagem || "Não foi possível falar com a Swag agora.");
        }

        /* Mostra a resposta da Swag e salva no histórico. */
        renderizarMensagem("swag", dados.resposta);
        historico.push({ role: "model", text: dados.resposta });
        salvarHistorico(historico);
      } catch (error) {
        /* Qualquer erro aparece como uma bolha da Swag (não é salvo no histórico). */
        renderizarMensagem("swag", error.message);
      } finally {
        /* Destrava o campo para a próxima pergunta. */
        input.disabled = false;
        botaoEnviar.disabled = false;
        input.focus();
      }
    });

    /* Se o chat estava aberto na página anterior, reabre aqui. */
    if (sessionStorage.getItem(CHAVE_ABERTO) === "1") abrirPainel();
  }

  /* Ponto de partida: aplica os estilos e cria o widget. */
  function iniciar() {
    injetarEstilos();
    criarWidget();
  }

  /* Espera o HTML carregar (document.body precisa existir) antes de criar o widget. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
