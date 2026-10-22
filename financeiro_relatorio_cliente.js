
/*
 * A. S. CONTEÚDO DIGITAL
 * FINANCEIRO V8
 * RELATÓRIO DETALHADO POR CLIENTE
 *
 * Arquivo: financeiro_relatorio_cliente.js
 *
 * Os valores do sistema são armazenados em centavos.
 * Este módulo apenas consulta os contratos carregados.
 */

(() => {
  "use strict";

  const ID_AREA = "relatorioClienteV8";

  function moeda(centavos) {
    return (Number(centavos || 0) / 100)
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
  }

  function hojeISO() {
    const data = new Date();

    return [
      data.getFullYear(),
      String(data.getMonth() + 1).padStart(2, "0"),
      String(data.getDate()).padStart(2, "0")
    ].join("-");
  }

  function formatarData(valor) {
    const data = String(valor || "").slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return "Não informada";
    }

    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  function escaparHTML(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function obterContratos() {
    try {
      if (
        typeof contratos !== "undefined" &&
        Array.isArray(contratos)
      ) {
        return contratos;
      }
    } catch (erro) {
      console.warn(
        "Não foi possível consultar os contratos:",
        erro
      );
    }

    return [];
  }

  function calcularContrato(contrato) {
    const hoje = hojeISO();

    let recebidoTotal = 0;
    let saldoVencido = 0;

    const parcelas = Array.isArray(contrato.parcelas)
      ? contrato.parcelas
      : [];

    const detalhes = parcelas.map((parcela, indice) => {
      const pagamentos = Array.isArray(
        parcela.pagamentos
      )
        ? parcela.pagamentos
        : [];

      const recebido = pagamentos.reduce(
        (soma, pagamento) =>
          soma + Number(pagamento.valor || 0),
        0
      );

      const valor = Number(parcela.valor || 0);
      const saldo = Math.max(0, valor - recebido);

      const vencimento = String(
        parcela.vencimento || ""
      ).slice(0, 10);

      recebidoTotal += recebido;

      if (
        saldo > 0 &&
        vencimento &&
        vencimento < hoje
      ) {
        saldoVencido += saldo;
      }

      let situacao = "Pendente";

      if (saldo === 0) {
        situacao = "Quitada";
      } else if (vencimento && vencimento < hoje) {
        situacao = "Vencida";
      } else if (recebido > 0) {
        situacao = "Parcial";
      }

      return {
        numero: indice + 1,
        vencimento,
        valor,
        recebido,
        saldo,
        situacao,
        pagamentos
      };
    });

    const contratado = Number(contrato.total || 0);

    return {
      contratado,
      recebidoTotal,
      saldoTotal: Math.max(
        0,
        contratado - recebidoTotal
      ),
      saldoVencido,
      detalhes
    };
  }

  function criarHTML(contrato) {
    const dados = calcularContrato(contrato);

    const emissao = new Date()
      .toLocaleString("pt-BR");

    const linhas = dados.detalhes.map(parcela => {
      const historico = parcela.pagamentos
        .map(pagamento => {
          const data = formatarData(
            pagamento.data ||
            pagamento.data_pagamento
          );

          return `
            <div class="pagamento">
              Pagamento em
              ${escaparHTML(data)}
              —
              ${escaparHTML(moeda(pagamento.valor))}
            </div>
          `;
        })
        .join("");

      return `
        <tr>
          <td>${parcela.numero}</td>
          <td>
            ${escaparHTML(
              formatarData(parcela.vencimento)
            )}
          </td>
          <td>${escaparHTML(moeda(parcela.valor))}</td>
          <td>${escaparHTML(moeda(parcela.recebido))}</td>
          <td>${escaparHTML(moeda(parcela.saldo))}</td>
          <td>${escaparHTML(parcela.situacao)}</td>
        </tr>

        ${
          historico
            ? `
              <tr class="historico">
                <td colspan="6">
                  ${historico}
                </td>
              </tr>
            `
            : ""
        }
      `;
    }).join("");

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>
  Extrato financeiro -
  ${escaparHTML(contrato.cliente)}
</title>

<style>
  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: white;
    color: #13243c;
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
    color: #ffffff;
    padding: 20px;
    border-bottom: 5px solid #c8a65a;
    border-radius: 8px;
  }

  .marca {
    color: #dfbf79;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 2px;
  }

  h1 {
    margin: 8px 0;
    font-size: 23px;
  }

  .subtitulo {
    font-size: 11px;
    color: #e1e7f0;
  }

  h2 {
    font-size: 13px;
    text-transform: uppercase;
    border-bottom: 2px solid #c8a65a;
    padding-bottom: 7px;
    margin-top: 22px;
  }

  .identificacao {
    font-size: 12px;
    line-height: 1.8;
  }

  .grade {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
  }

  .indicador {
    background: #f8fafc;
    border: 1px solid #dce2eb;
    border-radius: 8px;
    padding: 12px;
  }

  .indicador small {
    display: block;
    color: #526176;
    font-size: 10px;
    text-transform: uppercase;
  }

  .indicador strong {
    display: block;
    font-size: 17px;
    margin-top: 7px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }

  th {
    background: #14283d;
    color: #ffffff;
    text-align: left;
    padding: 9px 6px;
  }

  td {
    padding: 9px 6px;
    border-bottom: 1px solid #dce2eb;
    vertical-align: top;
  }

  tr {
    break-inside: avoid;
  }

  .historico td {
    padding-top: 2px;
    padding-bottom: 8px;
  }

  .pagamento {
    font-size: 9px;
    color: #526176;
    margin: 3px 0;
  }

  .rodape {
    margin-top: 20px;
    border-top: 1px solid #dce2eb;
    padding-top: 10px;
    color: #64748b;
    font-size: 9px;
    line-height: 1.6;
  }

  @media print {
    .pagina {
      max-width: none;
    }

    .cabecalho,
    .indicador {
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
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

    <h1>
      EXTRATO FINANCEIRO V8
    </h1>

    <div class="subtitulo">
      Relatório detalhado por cliente
      • Emitido em ${escaparHTML(emissao)}
    </div>
  </header>

  <section>
    <h2>Identificação</h2>

    <div class="identificacao">
      <strong>Cliente:</strong>
      ${escaparHTML(
        contrato.cliente || "Não informado"
      )}

      <div>
        <strong>Projeto:</strong>
        ${escaparHTML(
          contrato.projeto || "Não informado"
        )}
      </div>
    </div>
  </section>

  <section>
    <h2>Resumo do contrato</h2>

    <div class="grade">
      <div class="indicador">
        <small>Valor contratado</small>
        <strong>
          ${escaparHTML(moeda(dados.contratado))}
        </strong>
      </div>

      <div class="indicador">
        <small>Total recebido</small>
        <strong>
          ${escaparHTML(moeda(dados.recebidoTotal))}
        </strong>
      </div>

      <div class="indicador">
        <small>Saldo em aberto</small>
        <strong>
          ${escaparHTML(moeda(dados.saldoTotal))}
        </strong>
      </div>

      <div class="indicador">
        <small>Vencido até hoje</small>
        <strong>
          ${escaparHTML(moeda(dados.saldoVencido))}
        </strong>
      </div>
    </div>
  </section>

  <section>
    <h2>Parcelas e pagamentos</h2>

    <table>
      <thead>
        <tr>
          <th>Nº</th>
          <th>Vencimento</th>
          <th>Parcela</th>
          <th>Recebido</th>
          <th>Saldo</th>
          <th>Situação</th>
        </tr>
      </thead>

      <tbody>
        ${
          linhas ||
          `
            <tr>
              <td colspan="6">
                Nenhuma parcela cadastrada.
              </td>
            </tr>
          `
        }
      </tbody>
    </table>
  </section>

  <footer class="rodape">
    A. S. Conteúdo Digital • Financeiro V8

    <div>
      Demonstrativo gerencial baseado nos registros
      disponíveis no momento da emissão.
    </div>

    <div>
      A quantidade de páginas depende do histórico
      de parcelas e pagamentos do contrato.
    </div>
  </footer>

</div>
</body>
</html>
    `;
  }

  function gerarPDFCliente(contrato) {
    const janela = window.open("", "_blank");

    if (!janela) {
      alert(
        "O navegador bloqueou a abertura do relatório. Permita pop-ups para este site."
      );
      return;
    }

    janela.document.open();
    janela.document.write(
      criarHTML(contrato)
    );
    janela.document.close();

    janela.focus();

    janela.addEventListener(
      "load",
      () => {
        setTimeout(() => {
          janela.print();
        }, 350);
      },
      { once: true }
    );
  }

  function instalarInterface() {
    if (document.getElementById(ID_AREA)) {
      return;
    }

    const dashboard = document.getElementById(
      "dashboardGerencialV8"
    );

    if (!dashboard) {
      return;
    }

    const area = document.createElement("div");
    area.id = ID_AREA;

    area.style.cssText = `
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #c8a65a55;
    `;

    const titulo = document.createElement("div");
    titulo.textContent =
      "Relatório detalhado por cliente";

    titulo.style.cssText = `
      color: #dfbf79;
      font-weight: 700;
      margin-bottom: 10px;
    `;

    const seletor = document.createElement("select");

    seletor.setAttribute(
      "aria-label",
      "Selecionar contrato para relatório"
    );

    seletor.style.cssText = `
      width: 100%;
      max-width: 420px;
      margin-bottom: 10px;
    `;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Gerar PDF do cliente";

    botao.style.cssText = `
      display: block;
      background: #c8a65a;
      color: #101d34;
      font-weight: 800;
      margin-bottom: 8px;
    `;

    function atualizarContratos() {
      const selecaoAnterior = seletor.value;

      seletor.replaceChildren();

      const inicial = document.createElement("option");
      inicial.value = "";
      inicial.textContent = "Selecione um contrato";

      seletor.appendChild(inicial);

      obterContratos().forEach(contrato => {
        const opcao = document.createElement("option");

        opcao.value = contrato.id;

        opcao.textContent = [
          contrato.cliente || "Cliente",
          contrato.projeto || "Projeto"
        ].join(" — ");

        seletor.appendChild(opcao);
      });

      const existe = [...seletor.options].some(
        opcao => opcao.value === selecaoAnterior
      );

      seletor.value = existe ? selecaoAnterior : "";
    }

    seletor.addEventListener(
      "focus",
      atualizarContratos
    );

    botao.addEventListener("click", () => {
      const contrato = obterContratos().find(
        item => item.id === seletor.value
      );

      if (!contrato) {
        alert(
          "Selecione um contrato. Se a lista estiver vazia, aguarde a sincronização da nuvem."
        );
        return;
      }

      gerarPDFCliente(contrato);
    });

    area.append(
      titulo,
      seletor,
      botao
    );

    dashboard.appendChild(area);

    atualizarContratos();
  }

  function iniciar() {
    instalarInterface();

    if (!document.getElementById(ID_AREA)) {
      const observador = new MutationObserver(() => {
        instalarInterface();

        if (document.getElementById(ID_AREA)) {
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
