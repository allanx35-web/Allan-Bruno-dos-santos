
/* INTEGRAÇÃO FINANCEIRO V10 NA PLATAFORMA V7 */
(() => {
  "use strict";

  if (document.getElementById("financeiro")) return;

  const painel = document.getElementById("painel");
  const desktop = document.getElementById("desktop");
  const mobile = document.getElementById("mobile");

  if (!painel || !desktop || !mobile ||
      typeof go !== "function") {
    console.error("Estrutura original não encontrada.");
    return;
  }

  // Mantém as abas originais.
  if (typeof tabs !== "undefined" &&
      Array.isArray(tabs)) {
    tabs.push(["financeiro", "▣ Financeiro"]);
  }

  // Adiciona Financeiro ao menu do computador e celular.
  for (const menu of [desktop, mobile]) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "nav";
    botao.dataset.tab = "financeiro";
    botao.textContent = "▣ Financeiro";

    botao.onclick = () => go("financeiro");

    menu.appendChild(botao);
  }

  // Cria a área financeira sem substituir o sistema.
  const secao = document.createElement("section");
  secao.id = "financeiro";
  secao.className = "section";

  secao.innerHTML = `
    <div class="titleline">
      <h2>Gestão financeira</h2>
      <p class="muted">
        Contratos, recebimentos, despesas,
        relatórios e projeções.
      </p>
    </div>

    <div class="card"
         style="padding:0;overflow:hidden">
      <iframe
        title="Sistema financeiro completo"
        src="/financeiro.html"
        loading="lazy"
        style="
          display:block;
          width:100%;
          height:80vh;
          min-height:650px;
          border:0;
          background:#091724;
        "
      ></iframe>
    </div>
  `;

  painel.parentElement.appendChild(secao);
})();
