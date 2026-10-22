
/* FINANCEIRO V7 — SINCRONIZAÇÃO SUPABASE */

(() => {
  "use strict";

  const db = supabaseFinanceiro;
  const CHAVE_LOCAL = "as_financeiro_v7_teste";

  let usuario = null;
  let ocupado = false;

  const emReais = centavos =>
    Number((centavos / 100).toFixed(2));

  const emCentavos = reais =>
    Math.round(Number(reais) * 100);

  function informar(mensagem) {
    const elemento = document.getElementById(
      "financeiroNuvemEstado"
    );

    if (elemento) {
      elemento.textContent = mensagem;
    }
  }

  function conferir(resultado) {
    if (resultado.error) {
      throw resultado.error;
    }

    return resultado.data;
  }

  function mensagemErro(erro) {
    return erro?.message || "Erro desconhecido";
  }

  // PAINEL DE SINCRONIZAÇÃO

  const painel = document.createElement("section");
  painel.className = "card";

  painel.innerHTML = `
    <h2>Sincronização na nuvem</h2>

    <p id="financeiroNuvemEstado">
      Aguardando autenticação...
    </p>

    <div class="actions">
      <button
        type="button"
        class="secondary"
        id="financeiroAtualizar">
        Atualizar da nuvem
      </button>

      <button
        type="button"
        class="secondary"
        id="financeiroImportar">
        Importar dados deste navegador
      </button>
    </div>

    <p class="note">
      A importação é opcional e exige confirmação.
      Não apague os dados locais antes de conferir
      os registros na nuvem.
    </p>
  `;

  const main = document.querySelector("main");

  main.insertBefore(
    painel,
    main.children[1] || null
  );

  // AUTENTICAÇÃO

  async function obterUsuario() {
    if (!db) {
      throw new Error(
        "Supabase não configurado."
      );
    }

    const { data, error } =
      await db.auth.getUser();

    if (error || !data?.user) {
      throw new Error(
        "Faça login para acessar a nuvem."
      );
    }

    return data.user;
  }

  async function executar(operacao) {
    if (ocupado) {
      informar("Aguarde a operação anterior.");
      return;
    }

    ocupado = true;

    try {
      usuario = await obterUsuario();

      informar("Processando na nuvem...");

      await operacao();

      informar("Operação concluída.");
    } catch (erro) {
      informar(
        "Erro: " + mensagemErro(erro)
      );

      alert(
        "Não foi possível concluir: " +
        mensagemErro(erro)
      );
    } finally {
      ocupado = false;
    }
  }

  // CARREGAR CONTRATOS DO SUPABASE

  async function carregarNuvem() {
    usuario = await obterUsuario();

    const contratosBanco = conferir(
      await db
        .from("financeiro_contratos")
        .select("*")
        .eq("usuario_id", usuario.id)
        .order("criado_em", {
          ascending: true
        })
    );

    const idsContratos =
      contratosBanco.map(c => c.id);

    let parcelasBanco = [];
    let pagamentosBanco = [];

    if (idsContratos.length) {
      parcelasBanco = conferir(
        await db
          .from("financeiro_parcelas")
          .select("*")
          .in("contrato_id", idsContratos)
          .order("numero", {
            ascending: true
          })
      );

      const idsParcelas =
        parcelasBanco.map(p => p.id);

      if (idsParcelas.length) {
        pagamentosBanco = conferir(
          await db
            .from("financeiro_pagamentos")
            .select("*")
            .in("parcela_id", idsParcelas)
        );
      }
    }

    contratos = contratosBanco.map(c => ({
      id: c.id,
      cliente: c.cliente_nome,
      projeto: c.projeto_nome,
      total: emCentavos(c.valor_total),
      modalidade: c.modalidade,

      parcelas: parcelasBanco
        .filter(p => p.contrato_id === c.id)
        .map(p => ({
          id: p.id,
          vencimento: p.vencimento,
          valor: emCentavos(p.valor),

          pagamentos: pagamentosBanco
            .filter(pg => pg.parcela_id === p.id)
            .map(pg => ({
              id: pg.id,
              valor: emCentavos(pg.valor),
              data: pg.data_pagamento
            }))
        }))
    }));

    renderizar();

    informar(
      "Nuvem sincronizada: " +
      contratos.length +
      " contrato(s)."
    );
  }

  async function atualizarNuvem() {
    await executar(carregarNuvem);
  }

  // SALVAR CONTRATO NO BANCO

  async function inserirContrato(contrato, modalidade) {
    conferir(
      await db
        .from("financeiro_contratos")
        .insert({
          id: contrato.id,
          usuario_id: usuario.id,
          cliente_nome: contrato.cliente,
          projeto_nome: contrato.projeto,
          valor_total: emReais(contrato.total),
          modalidade: modalidade
        })
    );

    const linhas = contrato.parcelas.map(
      (parcela, indice) => ({
        id: parcela.id,
        contrato_id: contrato.id,
        numero: indice + 1,
        valor: emReais(parcela.valor),
        vencimento: parcela.vencimento
      })
    );

    conferir(
      await db
        .from("financeiro_parcelas")
        .insert(linhas)
    );

    for (const parcela of contrato.parcelas) {
      if (!parcela.pagamentos.length) {
        continue;
      }

      const pagamentos =
        parcela.pagamentos.map(pg => ({
          id: pg.id,
          parcela_id: parcela.id,
          valor: emReais(pg.valor),
          data_pagamento: pg.data,
          forma_pagamento: "Não informado",
          observacao: "Importado do navegador"
        }));

      conferir(
        await db
          .from("financeiro_pagamentos")
          .insert(pagamentos)
      );
    }
  }

  // SUBSTITUIR CADASTRO LOCAL POR NUVEM

  salvarContrato = async function () {
    const cliente =
      el("cliente").value.trim();

    const projeto =
      el("projeto").value.trim();

    const total =
      cent(el("valor").value);

    if (
      !cliente ||
      !projeto ||
      !Number.isSafeInteger(total) ||
      total <= 0
    ) {
      return alert(
        "Preencha cliente, projeto e valor válido."
      );
    }

    const modalidade =
      el("modalidade").value;

    const parcelas = [];

    if (modalidade === "mensal") {
      const quantidade =
        Number(el("quantidade").value);

      const vencimento =
        el("vencimento").value;

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > 120 ||
        !vencimento
      ) {
        return alert(
          "Informe quantidade e primeiro vencimento."
        );
      }

      const base =
        Math.floor(total / quantidade);

      for (
        let i = 0;
        i < quantidade;
        i++
      ) {
        parcelas.push({
          id: uid(),

          vencimento: somarMeses(
            vencimento,
            i
          ),

          valor: i === quantidade - 1
            ? total - base * (quantidade - 1)
            : base,

          pagamentos: []
        });
      }
    } else {
      const itens = [
        ...el("parcelasCustom").children
      ];

      if (!itens.length) {
        return alert(
          "Adicione pelo menos uma parcela."
        );
      }

      for (const item of itens) {
        const valor = cent(
          item.querySelector(
            ".customValor"
          ).value
        );

        const vencimento =
          item.querySelector(
            ".customData"
          ).value;

        if (
          !Number.isSafeInteger(valor) ||
          valor <= 0 ||
          !vencimento
        ) {
          return alert(
            "Confira valores e vencimentos."
          );
        }

        parcelas.push({
          id: uid(),
          vencimento,
          valor,
          pagamentos: []
        });
      }

      const soma = parcelas.reduce(
        (total, p) => total + p.valor,
        0
      );

      if (soma !== total) {
        return alert(
          "A soma das parcelas deve ser igual ao contrato."
        );
      }
    }

    const contrato = {
      id: uid(),
      cliente,
      projeto,
      total,
      parcelas
    };

    await executar(async () => {
      await inserirContrato(
        contrato,
        modalidade
      );

      limpar();

      await carregarNuvem();

      alert(
        "Contrato salvo na nuvem!"
      );
    });
  };

  // REGISTRAR PAGAMENTO

  registrar = async function (ci, pi) {
    const contrato = contratos[ci];

    const parcela =
      contrato?.parcelas[pi];

    if (!parcela) {
      return;
    }

    const falta =
      parcela.valor - recebido(parcela);

    const resposta = prompt(
      "Valor recebido (R$):",
      (falta / 100).toFixed(2)
    );

    if (resposta === null) {
      return;
    }

    const valor = cent(
      resposta.replace(",", ".")
    );

    if (
      !Number.isSafeInteger(valor) ||
      valor <= 0 ||
      valor > falta
    ) {
      return alert(
        "Informe um valor válido."
      );
    }

    const data = prompt(
      "Data do pagamento (AAAA-MM-DD):",
      hoje()
    );

    if (data === null) {
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
      Number.isNaN(Date.parse(data))
    ) {
      return alert(
        "Data inválida."
      );
    }

    await executar(async () => {
      conferir(
        await db
          .from("financeiro_pagamentos")
          .insert({
            id: uid(),
            parcela_id: parcela.id,
            valor: emReais(valor),
            data_pagamento: data,
            forma_pagamento: "Não informado",
            observacao: ""
          })
      );

      await carregarNuvem();
    });
  };

  // EXCLUIR CONTRATO

  excluir = async function (indice) {
    const contrato =
      contratos[indice];

    if (!contrato) {
      return;
    }

    if (!confirm(
      "Excluir este contrato e todo o histórico da nuvem?"
    )) {
      return;
    }

    await executar(async () => {
      const idsParcelas =
        contrato.parcelas.map(p => p.id);

      if (idsParcelas.length) {
        conferir(
          await db
            .from("financeiro_pagamentos")
            .delete()
            .in("parcela_id", idsParcelas)
        );

        conferir(
          await db
            .from("financeiro_parcelas")
            .delete()
            .eq("contrato_id", contrato.id)
        );
      }

      conferir(
        await db
          .from("financeiro_contratos")
          .delete()
          .eq("id", contrato.id)
          .eq("usuario_id", usuario.id)
      );

      await carregarNuvem();
    });
  };

  // IMPORTAR DADOS LOCAIS COM CONFIRMAÇÃO

  async function importarLocal() {
    let locais = [];

    try {
      locais = JSON.parse(
        localStorage.getItem(CHAVE_LOCAL) ||
        "[]"
      );
    } catch {
      return alert(
        "Não foi possível ler os dados locais."
      );
    }

    if (
      !Array.isArray(locais) ||
      !locais.length
    ) {
      return alert(
        "Nenhum contrato local encontrado."
      );
    }

    if (!confirm(
      "Importar " +
      locais.length +
      " contrato(s) deste navegador? " +
      "Os dados locais serão preservados."
    )) {
      return;
    }

    await executar(async () => {
      const existentes = conferir(
        await db
          .from("financeiro_contratos")
          .select("id")
          .eq("usuario_id", usuario.id)
      );

      const ids = new Set(
        existentes.map(c => c.id)
      );

      let importados = 0;

      for (const contrato of locais) {
        if (ids.has(contrato.id)) {
          continue;
        }

        await inserirContrato(
          contrato,
          contrato.modalidade || "mensal"
        );

        importados++;
      }

      await carregarNuvem();

      alert(
        importados +
        " contrato(s) importado(s)."
      );
    });
  }

  // BOTÕES

  document.getElementById(
    "financeiroAtualizar"
  ).onclick = atualizarNuvem;

  document.getElementById(
    "financeiroImportar"
  ).onclick = importarLocal;

  // SESSÃO

  if (db) {
    db.auth.onAuthStateChange(
      (evento, sessao) => {
        if (evento === "SIGNED_OUT") {
          usuario = null;
          contratos = [];
          renderizar();

          informar(
            "Faça login para acessar a nuvem."
          );
        }

        if (
          evento === "SIGNED_IN" ||
          evento === "INITIAL_SESSION"
        ) {
          if (sessao?.user) {
            atualizarNuvem();
          }
        }
      }
    );

    atualizarNuvem();
  } else {
    informar(
      "Configuração do Supabase indisponível."
    );
  }
})();

