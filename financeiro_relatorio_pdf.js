
/*
 * A. S. CONTEÚDO DIGITAL
 * FINANCEIRO V8 — RELATÓRIO PDF
 * Arquivo: financeiro_relatorio_pdf.js
 *
 * Gera um relatório A4 de uma página usando
 * os contratos e pagamentos carregados no sistema.
 */

(() => {
  "use strict";

  const ID_BOTAO = "btnRelatorioPdfV8";

  const moeda = (valor) =>
  (Number(valor || 0) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  function dataLocalISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function mesAtual() {
    return dataLocalISO().slice(0, 7);
  }

  function adicionarMes(anoMes, quantidade) {
    const [ano, mes] = anoMes.split("-").map(Number);

    const data = new Date(
      ano,
      mes - 1 + quantidade,
      1
    );

    return (
      data.getFullYear() +
      "-" +
      String(data.getMonth() + 1).padStart(2, "0")
    );
  }

  function nomeMes(anoMes) {
    const [ano, mes] = anoMes.split("-").map(Number);

    return new Date(ano, mes - 1, 1)
      .toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
  }

  function nomeMesCurto(anoMes) {
    const [ano, mes] = anoMes.split("-").map(Number);

    return new Date(ano, mes - 1, 1)
      .toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit"
      })
      .replace(".", "");
  }

  function obterContratos() {
    /*
     * A variável "contratos" é utilizada
     * pelo Financeiro V8.
     */
    try {
      if (
        typeof contratos !== "undefined" &&
        Array.isArray(contratos)
      ) {
        return contratos;
      }
    } catch (erro) {
      console.warn(
        "Não foi possível acessar os contratos:",
        erro
      );
    }

    return [];
  }

  function obterMesSelecionado() {
    const campo = document.getElementById("dgMes");

    if (
      campo &&
      /^\d{4}-\d{2}$/.test(campo.value)
    ) {
      return campo.value;
    }

    return mesAtual();
  }

  function calcularRelatorio(anoMes) {
    const lista = obterContratos();

    const hoje = dataLocalISO();
    const inicioMes = `${anoMes}-01`;
    const inicioProximoMes =
      `${adicionarMes(anoMes, 1)}-01`;

    const dados = {
      mes: anoMes,
      recebido: 0,
      receberMes: 0,
      vencidoHoje: 0,
      vencerMes: 0,
      saldoAberto: 0,
      contratosAtivos: 0,
      parcelasPendentesMes: 0,
      previsao: Array(6).fill(0)
    };

    for (const contrato of lista) {
      let saldoContrato = 0;

      const parcelas = Array.isArray(contrato.parcelas)
        ? contrato.parcelas
        : [];

      for (const parcela of parcelas) {
        const pagamentos = Array.isArray(
          parcela.pagamentos
        )
          ? parcela.pagamentos
          : [];

        const valorParcela = Number(
          parcela.valor || 0
        );

        const totalPago = pagamentos.reduce(
          (soma, pagamento) =>
            soma + Number(pagamento.valor || 0),
          0
        );

        const saldo = Math.max(
          0,
          valorParcela - totalPago
        );

        const vencimento = String(
          parcela.vencimento || ""
        ).slice(0, 10);

        dados.saldoAberto += saldo;
        saldoContrato += saldo;

        // Recebimentos efetivos do mês.
        for (const pagamento of pagamentos) {
          const dataPagamento = String(
            pagamento.data ||
            pagamento.data_pagamento ||
            ""
          ).slice(0, 10);

          if (
            dataPagamento >= inicioMes &&
            dataPagamento < inicioProximoMes
          ) {
            dados.recebido += Number(
              pagamento.valor || 0
            );
          }
        }

        if (saldo <= 0 || !vencimento) {
          continue;
        }

        // Parcelas vencidas até hoje.
        if (vencimento < hoje) {
          dados.vencidoHoje += saldo;
        }

        // Saldo previsto para o mês selecionado.
        if (
          vencimento >= inicioMes &&
          vencimento < inicioProximoMes
        ) {
          dados.receberMes += saldo;
          dados.parcelasPendentesMes++;

          // A vencer, considerando a data atual.
          if (vencimento >= hoje) {
            dados.vencerMes += saldo;
          }
        }

        // Previsão dos próximos seis meses.
        for (let i = 0; i < 6; i++) {
          if (
            vencimento.slice(0, 7) ===
            adicionarMes(anoMes, i)
          ) {
            dados.previsao[i] += saldo;
            break;
          }
        }
      }

      if (saldoContrato > 0) {
        dados.contratosAtivos++;
      }
    }

    return dados;
  }

  function escaparHTML(valor) {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function criarCartao(titulo, valor, destaque = false) {
    return `
      <div class="indicador ${destaque ? "destaque" : ""}">
        <div class="indicador-titulo">
          ${escaparHTML(titulo)}
        </div>
        <div class="indicador-valor">
          ${escaparHTML(valor)}
        </div>
      </div>
    `;
  }

  function criarHTMLRelatorio(dados) {
    const maiorPrevisao = Math.max(
      1,
      ...dados.previsao
    );

    const barras = dados.previsao.map(
      (valor, indice) => {
        const mes = adicionarMes(
          dados.mes,
          indice
        );

        const percentual = Math.max(
          0,
          Math.min(
            100,
            (valor / maiorPrevisao) * 100
          )
        );

        return `
          <div class="linha-previsao">
            <div class="mes-previsao">
              ${escaparHTML(nomeMesCurto(mes))}
            </div>

            <div class="trilho">
              <div
                class="barra"
                style="width:${percentual}%"
              ></div>
            </div>

            <div class="valor-previsao">
              ${escaparHTML(moeda(valor))}
            </div>
          </div>
        `;
      }
    ).join("");

    const dataEmissao = new Date()
      .toLocaleString("pt-BR");

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">

<title>
  Relatório Financeiro V8 -
  ${escaparHTML(nomeMes(dados.mes))}
</title>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<style>
  @page {
    size: A4 portrait;
    margin: 11mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #16243a;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .pagina {
    width: 100%;
    max-width: 188mm;
    margin: 0 auto;
  }

  .cabecalho {
    background: #101d34;
    color: white;
    padding: 20px 22px;
    border-radius: 10px;
    border-bottom: 5px solid #c8a65a;
  }

  .marca {
    color: #d6b36b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .titulo {
    font-size: 24px;
    font-weight: 800;
    margin-top: 8px;
  }

  .subtitulo {
    color: #dce3ed;
    font-size: 11px;
    margin-top: 7px;
  }

  .secao {
    margin-top: 18px;
  }

  .secao-titulo {
    font-size: 13px;
    font-weight: 800;
    color: #101d34;
    border-bottom: 2px solid #c8a65a;
    padding-bottom: 7px;
    margin-bottom: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .grade {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }

  .indicador {
    border: 1px solid #dce2eb;
    border-radius: 8px;
    padding: 12px 10px;
    min-height: 72px;
    background: #f8fafc;
  }

  .indicador.destaque {
    border-color: #c8a65a;
    background: #fffaf0;
  }

  .indicador-titulo {
    font-size: 9px;
    line-height: 1.4;
    color: #526176;
    text-transform: uppercase;
    font-weight: 700;
  }

  .indicador-valor {
    font-size: 17px;
    font-weight: 800;
    margin-top: 8px;
    color: #101d34;
    white-space: nowrap;
  }

  .linha-previsao {
    display: grid;
    grid-template-columns: 57px 1fr 100px;
    align-items: center;
    gap: 12px;
    margin: 11px 0;
  }

  .mes-previsao {
    font-size: 10px;
    font-weight: 700;
    color: #394a60;
    text-transform: capitalize;
  }

  .trilho {
    height: 13px;
    background: #e8edf3;
    border-radius: 20px;
    overflow: hidden;
  }

  .barra {
    height: 100%;
    background: linear-gradient(
      90deg,
      #b48a3f,
      #dfbf79
    );
    border-radius: 20px;
  }

  .valor-previsao {
    font-size: 10px;
    text-align: right;
    font-weight: 700;
    color: #101d34;
  }

  .observacoes {
    background: #f4f6f9;
    border-left: 4px solid #c8a65a;
    padding: 12px 14px;
    border-radius: 4px;
    font-size: 10px;
    line-height: 1.6;
    color: #48566a;
  }

  .rodape {
    margin-top: 20px;
    padding-top: 11px;
    border-top: 1px solid #dce2eb;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 9px;
    color: #64748b;
  }

  @media print {
    .pagina {
      max-width: none;
    }

    .cabecalho,
    .indicador,
    .observacoes {
      break-inside: avoid;
    }
  }
</style>
</head>

<body>
<div class="pagina">

  <header class="cabecalho">
    <div class="marca">
      A. S. CONTEÚDO DIGITAL
    </div>

    <div class="titulo">
      RELATÓRIO FINANCEIRO V8
    </div>

    <div class="subtitulo">
      Competência:
      ${escaparHTML(nomeMes(dados.mes))}
      • Demonstrativo gerencial
    </div>
  </header>

  <section class="secao">
    <div class="secao-titulo">
      Resumo financeiro
    </div>

    <div class="grade">
      ${criarCartao(
        "Recebido no mês",
        moeda(dados.recebido),
        true
      )}

      ${criarCartao(
        "Saldo a receber no mês",
        moeda(dados.receberMes)
      )}

      ${criarCartao(
        "Vencido até hoje",
        moeda(dados.vencidoHoje)
      )}

      ${criarCartao(
        "A vencer neste mês",
        moeda(dados.vencerMes)
      )}

      ${criarCartao(
        "Saldo total em aberto",
        moeda(dados.saldoAberto),
        true
      )}

      ${criarCartao(
        "Contratos ativos",
        String(dados.contratosAtivos)
      )}
    </div>
  </section>

  <section class="secao">
    <div class="secao-titulo">
      Previsão de recebíveis — 6 meses
    </div>

    ${barras}
  </section>

  <section class="secao">
    <div class="secao-titulo">
      Informações complementares
    </div>

    <div class="observacoes">
      <strong>Parcelas com saldo no mês:</strong>
      ${dados.parcelasPendentesMes}

      <p>
        Os valores consideram os contratos,
        parcelas e pagamentos disponíveis
        no momento da emissão.
      </p>

      <p>
        O indicador "Vencido até hoje" considera
        saldos com vencimento anterior à data
        atual. A previsão de recebíveis utiliza
        os vencimentos originalmente cadastrados
        e não representa garantia de recebimento.
      </p>
    </div>
  </section>

  <footer class="rodape">
    <span>
      A. S. Conteúdo Digital • Financeiro V8
    </span>

    <span>
      Emitido em:
      ${escaparHTML(dataEmissao)}
    </span>
  </footer>

</div>
</body>
</html>
    `;
  }

  function gerarRelatorioPDF() {
    const contratosCarregados = obterContratos();

    if (!contratosCarregados.length) {
      alert(
        "Nenhum contrato carregado. Aguarde a sincronização com a nuvem."
      );
      return;
    }

    const mes = obterMesSelecionado();
    const dados = calcularRelatorio(mes);

    const janela = window.open("", "_blank");

    if (!janela) {
      alert(
        "O navegador bloqueou a abertura do relatório. Permita pop-ups para este site."
      );
      return;
    }

    janela.document.open();
    janela.document.write(
      criarHTMLRelatorio(dados)
    );
    janela.document.close();

    janela.focus();

    // Abre a impressão, onde é possível salvar como PDF.
    janela.addEventListener("load", () => {
      setTimeout(() => {
        janela.print();
      }, 350);
    });

    // Alternativa para navegadores que não disparam
    // o evento load após document.write().
    setTimeout(() => {
      if (!janela.closed) {
        janela.focus();
      }
    }, 600);
  }

  function instalarBotao() {
    if (document.getElementById(ID_BOTAO)) {
      return;
    }

    const dashboard = document.getElementById(
      "dashboardGerencialV8"
    );

    if (!dashboard) {
      return;
    }

    const botao = document.createElement("button");

    botao.id = ID_BOTAO;
    botao.type = "button";
    botao.textContent = "Gerar relatório PDF";

    Object.assign(botao.style, {
      background: "#c8a65a",
      color: "#101d34",
      border: "none",
      borderRadius: "9px",
      padding: "12px 18px",
      fontSize: "13px",
      fontWeight: "800",
      cursor: "pointer",
      marginTop: "14px",
      marginBottom: "8px",
      width: "100%",
      maxWidth: "260px"
    });

    botao.addEventListener(
      "click",
      gerarRelatorioPDF
    );

    dashboard.appendChild(botao);
  }

  function iniciar() {
    instalarBotao();

    /*
     * Caso o Dashboard V8 seja inserido
     * depois deste script, aguarda sua criação.
     */
    if (!document.getElementById(ID_BOTAO)) {
      const observador = new MutationObserver(() => {
        instalarBotao();

        if (document.getElementById(ID_BOTAO)) {
          observador.disconnect();
        }
      });

      observador.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      { once: true }
    );
  } else {
    iniciar();
  }

})();
