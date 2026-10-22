
/* FINANCEIRO V8 — DASHBOARD GERENCIAL
   Somente leitura: não altera contratos ou pagamentos.
*/

(() => {
  "use strict";

  const main = document.querySelector("main");
  const resumo = document
    .getElementById("totalContratado")
    ?.closest("section.card");

  if (!main || !resumo || typeof renderizar !== "function") {
    return;
  }

  if (document.getElementById("dashboardGerencialV8")) {
    return;
  }

  const secao = document.createElement("section");
  secao.id = "dashboardGerencialV8";
  secao.className = "card";

  secao.innerHTML = `
    <style>
      #dashboardGerencialV8 .dg-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      #dashboardGerencialV8 .dg-topo h2 {
        margin: 0;
      }

      #dashboardGerencialV8 .dg-periodo {
        width: auto;
        max-width: 180px;
        padding: 10px;
      }

      #dashboardGerencialV8 .dg-grade {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }

      #dashboardGerencialV8 .dg-indicador {
        background: #0c2032;
        border: 1px solid #d5aa5529;
        border-radius: 12px;
        padding: 15px;
        min-width: 0;
      }

      #dashboardGerencialV8 .dg-indicador small {
        display: block;
        color: #b9c7d3;
        margin-bottom: 8px;
        font-size: 13px;
      }

      #dashboardGerencialV8 .dg-indicador strong {
        display: block;
        color: #d5aa55;
        font-size: clamp(16px, 3.7vw, 23px);
        overflow-wrap: anywhere;
      }

      #dashboardGerencialV8 .dg-alerta strong {
        color: #ff9797;
      }

      #dashboardGerencialV8 .dg-grafico {
        margin-top: 22px;
      }

      #dashboardGerencialV8 .dg-grafico h3 {
        font-size: 17px;
        margin: 0 0 15px;
      }

      #dashboardGerencialV8 .dg-linha {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr) 115px;
        gap: 9px;
        align-items: center;
        margin: 12px 0;
        font-size: 12px;
      }

      #dashboardGerencialV8 .dg-trilho {
        height: 15px;
        background: #0b1b2b;
        border-radius: 9px;
        overflow: hidden;
      }

      #dashboardGerencialV8 .dg-barra {
        height: 100%;
        width: 0;
        background: #d5aa55;
        border-radius: 9px;
      }

      #dashboardGerencialV8 .dg-numero {
        text-align: right;
        color: #dbe5ee;
        font-variant-numeric: tabular-nums;
      }

      #dashboardGerencialV8 .dg-rodape {
        font-size: 12px;
        line-height: 1.5;
        color: #b9c7d3;
        margin: 15px 0 0;
      }

      @media (max-width: 450px) {
        #dashboardGerencialV8 .dg-linha {
          grid-template-columns: 62px minmax(0, 1fr) 94px;
          gap: 6px;
          font-size: 11px;
        }
      }
    </style>

    <div class="dg-topo">
      <h2>Dashboard gerencial</h2>
      <label style="margin:0">
        Mês de referência
        <input
          id="dgMes"
          class="dg-periodo"
          type="month"
          aria-label="Mês de referência"
        >
      </label>
    </div>

    <div class="dg-grade">
      <div class="dg-indicador">
        <small>Recebido no mês</small>
        <strong id="dgRecebido">R$ 0,00</strong>
      </div>

      <div class="dg-indicador">
        <small>A receber no mês</small>
        <strong id="dgReceber">R$ 0,00</strong>
      </div>

      <div class="dg-indicador dg-alerta">
        <small>Em atraso até o fim do mês</small>
        <strong id="dgAtrasado">R$ 0,00</strong>
      </div>

      <div class="dg-indicador">
        <small>Saldo total em aberto</small>
        <strong id="dgAberto">R$ 0,00</strong>
      </div>

      <div class="dg-indicador">
        <small>Parcelas com saldo no mês</small>
        <strong id="dgParcelas">0</strong>
      </div>

      <div class="dg-indicador">
        <small>Contratos ativos</small>
        <strong id="dgAtivos">0</strong>
      </div>
    </div>

    <div class="dg-grafico">
      <h3>Previsão de recebíveis — próximos 6 meses</h3>
      <div
        id="dgBarras"
        role="img"
        aria-label="Gráfico de valores a receber por mês"
      ></div>
    </div>

    <p class="dg-rodape">
      Previsão baseada nos vencimentos das parcelas
      ainda não recebidas. Os valores em atraso
      consideram saldos vencidos até o fim do mês
      selecionado, não apenas parcelas vencidas hoje.
    </p>
  `;

  resumo.insertAdjacentElement("afterend", secao);

  const campoMes = document.getElementById("dgMes");
  const agora = new Date();

  const mesLocal =
    agora.getFullYear() +
    "-" +
    String(agora.getMonth() + 1).padStart(2, "0");

  campoMes.value = mesLocal;

  const moedaV8 = centavos =>
    (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const meses = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
  ];

  function mesMais(anoMes, adicionar) {
    const [ano, mes] = anoMes.split("-").map(Number);
    const data = new Date(
      Date.UTC(ano, mes - 1 + adicionar, 1)
    );

    return (
      data.getUTCFullYear() +
      "-" +
      String(data.getUTCMonth() + 1).padStart(2, "0")
    );
  }

  function rotulo(anoMes) {
    const [ano, mes] = anoMes.split("-").map(Number);
    return meses[mes - 1] + "/" + String(ano).slice(-2);
  }

  function texto(id, valor) {
    document.getElementById(id).textContent = valor;
  }

  function atualizarDashboardV8() {
    const mes = campoMes.value || mesLocal;
    const fimMes = mesMais(mes, 1) + "-01";

    let recebidoMes = 0;
    let receberMes = 0;
    let atrasado = 0;
    let aberto = 0;
    let parcelasMes = 0;
    let ativos = 0;

    const valores = Array(6).fill(0);

    const lista = Array.isArray(contratos)
      ? contratos
      : [];

    for (const contrato of lista) {
      let saldoContrato = 0;

      for (const parcela of contrato.parcelas || []) {
        const pago = (parcela.pagamentos || [])
          .reduce(
            (soma, pagamento) =>
              soma + Number(pagamento.valor || 0),
            0
          );

        const saldo = Math.max(
          0,
          Number(parcela.valor || 0) - pago
        );

        saldoContrato += saldo;
        aberto += saldo;

        if (
          parcela.vencimento?.slice(0, 7) === mes &&
          saldo > 0
        ) {
          receberMes += saldo;
          parcelasMes++;
        }

        if (
          parcela.vencimento &&
          parcela.vencimento < fimMes &&
          saldo > 0
        ) {
          atrasado += saldo;
        }

        for (let i = 0; i < 6; i++) {
          if (
            parcela.vencimento?.slice(0, 7) ===
            mesMais(mes, i)
          ) {
            valores[i] += saldo;
            break;
          }
        }

        for (const pagamento of parcela.pagamentos || []) {
          if (pagamento.data?.slice(0, 7) === mes) {
            recebidoMes += Number(pagamento.valor || 0);
          }
        }
      }

      if (saldoContrato > 0) {
        ativos++;
      }
    }

    texto("dgRecebido", moedaV8(recebidoMes));
    texto("dgReceber", moedaV8(receberMes));
    texto("dgAtrasado", moedaV8(atrasado));
    texto("dgAberto", moedaV8(aberto));
    texto("dgParcelas", String(parcelasMes));
    texto("dgAtivos", String(ativos));

    const maximo = Math.max(1, ...valores);
    const area = document.getElementById("dgBarras");

    area.replaceChildren();

    valores.forEach((valor, indice) => {
      const linha = document.createElement("div");
      linha.className = "dg-linha";

      const label = document.createElement("span");
      label.textContent = rotulo(mesMais(mes, indice));

      const trilho = document.createElement("div");
      trilho.className = "dg-trilho";

      const barra = document.createElement("div");
      barra.className = "dg-barra";
      barra.style.width =
        (100 * valor / maximo) + "%";

      trilho.appendChild(barra);

      const numero = document.createElement("span");
      numero.className = "dg-numero";
      numero.textContent = moedaV8(valor);

      linha.append(label, trilho, numero);
      area.appendChild(linha);
    });
  }

  campoMes.addEventListener(
    "change",
    atualizarDashboardV8
  );

  const renderizarAnterior = renderizar;

  renderizar = function (...args) {
    const resultado = renderizarAnterior.apply(this, args);
    atualizarDashboardV8();
    return resultado;
  };

  atualizarDashboardV8();
})();
