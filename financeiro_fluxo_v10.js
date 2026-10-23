
/* A. S. CONTEÚDO DIGITAL — FINANCEIRO V10
   Fluxo de caixa projetado. Somente leitura.
   Contratos em centavos; despesas do Supabase em reais.
*/
(() => {
  "use strict";

  const db =
    typeof supabaseFinanceiro !== "undefined"
      ? supabaseFinanceiro
      : null;

  const main = document.querySelector("main");

  if (!db || !main || document.getElementById("fluxoCaixaV10")) {
    return;
  }

  const money = n =>
    Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const localISO = d => [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");

  const addDays = (iso, n) => {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return localISO(d);
  };

  const today = () => localISO(new Date());

  const contracts = () => {
    try {
      return typeof contratos !== "undefined" &&
        Array.isArray(contratos)
        ? contratos
        : [];
    } catch {
      return [];
    }
  };

  const root = document.createElement("section");
  root.className = "card";
  root.id = "fluxoCaixaV10";

  root.innerHTML = `
    <style>
      #fluxoCaixaV10 .fc-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 14px 0;
      }

      #fluxoCaixaV10 .fc-card {
        background: #102238;
        border: 1px solid #c8a65a55;
        border-radius: 12px;
        padding: 13px;
        min-width: 0;
      }

      #fluxoCaixaV10 .fc-card small {
        display: block;
        color: #c4d0df;
        margin-bottom: 7px;
      }

      #fluxoCaixaV10 .fc-card strong {
        color: #d5aa55;
        font-size: clamp(16px, 4vw, 23px);
        overflow-wrap: anywhere;
      }

      #fluxoCaixaV10 .fc-row {
        display: grid;
        grid-template-columns: 64px 1fr 112px;
        gap: 8px;
        align-items: center;
        margin: 12px 0;
        font-size: 12px;
      }

      #fluxoCaixaV10 .fc-track {
        background: #23384a;
        border-radius: 8px;
        overflow: hidden;
        height: 16px;
      }

      #fluxoCaixaV10 .fc-fill {
        height: 100%;
        background: #c8a65a;
      }

      #fluxoCaixaV10 .fc-neg {
        background: #de8585;
      }

      #fluxoCaixaV10 .fc-alert {
        padding: 10px 0;
        border-bottom: 1px solid #ffffff20;
        font-size: 13px;
      }

      #fluxoCaixaV10 .fc-note {
        font-size: 12px;
        line-height: 1.5;
        opacity: 0.8;
      }

      @media (max-width: 400px) {
        #fluxoCaixaV10 .fc-row {
          grid-template-columns: 50px 1fr 90px;
          gap: 5px;
          font-size: 11px;
        }
      }
    </style>

    <h2 style="color:#d5aa55">
      Financeiro V10 • Fluxo de caixa inteligente
    </h2>

    <p class="fc-note">
      Projeção com parcelas ainda não recebidas
      e despesas não pagas.
    </p>

    <div class="actions">
      <button
        type="button"
        id="fcAtualizar"
        class="secondary"
      >
        Atualizar projeção
      </button>
    </div>

    <p id="fcStatus" role="status" class="fc-note">
      Carregando...
    </p>

    <div class="fc-grid">
      <div class="fc-card">
        <small>Resultado previsto • 30 dias</small>
        <strong id="fc30">—</strong>
      </div>

      <div class="fc-card">
        <small>Resultado previsto • 60 dias</small>
        <strong id="fc60">—</strong>
      </div>

      <div class="fc-card">
        <small>Resultado previsto • 90 dias</small>
        <strong id="fc90">—</strong>
      </div>

      <div class="fc-card">
        <small>Recebíveis vencidos</small>
        <strong id="fcAtraso">—</strong>
      </div>

      <div class="fc-card">
        <small>Despesas vencidas</small>
        <strong id="fcDespAtraso">—</strong>
      </div>

      <div class="fc-card">
        <small>Saldo inicial considerado</small>
        <strong>R$ 0,00</strong>
      </div>
    </div>

    <h3>
      Entradas e saídas previstas • próximos 3 meses
    </h3>

    <div id="fcGrafico"></div>

    <h3>
      Alertas de vencimento • próximos 7 dias
    </h3>

    <div id="fcAlertas"></div>

    <p class="fc-note">
      A projeção representa o fluxo líquido futuro
      acumulado, não o saldo bancário.

      Não inclui saldo inicial, recebimentos já realizados,
      pagamentos já efetuados ou movimentações não
      cadastradas.

      Valores vencidos aparecem nos indicadores,
      mas não são presumidos como recebidos ou pagos
      nos próximos 90 dias.
    </p>
  `;

  const anchor =
    document.getElementById("despesasV9") ||
    document.getElementById("dashboardGerencialV8");

  if (anchor) {
    anchor.insertAdjacentElement("afterend", root);
  } else {
    main.appendChild(root);
  }

  const el = id => document.getElementById(id);

  const status = mensagem => {
    el("fcStatus").textContent = mensagem;
  };

  let expenses = [];
  let lastUser = null;
  let busy = false;

  function pendingReceivables() {
    const out = [];

    for (const c of contracts()) {
      for (const p of c.parcelas || []) {
        const paid = (p.pagamentos || []).reduce(
          (s, pg) => s + Number(pg.valor || 0),
          0
        );

        const amount = Math.max(
          0,
          (Number(p.valor || 0) - paid) / 100
        );

        if (amount > 0 && p.vencimento) {
          out.push({
            date: String(p.vencimento).slice(0, 10),
            amount,
            label: c.cliente || "Cliente"
          });
        }
      }
    }

    return out;
  }

  function pendingExpenses() {
    return expenses
      .filter(d => !d.pago_em && d.vencimento)
      .map(d => ({
        date: String(d.vencimento).slice(0, 10),
        amount: Number(d.valor || 0),
        label: d.descricao || "Despesa"
      }));
  }

  function project(receivables, payables, start, end) {
    const incoming = receivables
      .filter(x => x.date >= start && x.date <= end)
      .reduce((s, x) => s + x.amount, 0);

    const outgoing = payables
      .filter(x => x.date >= start && x.date <= end)
      .reduce((s, x) => s + x.amount, 0);

    return {
      incoming,
      outgoing,
      net: incoming - outgoing
    };
  }

  function draw() {
    const r = pendingReceivables();
    const p = pendingExpenses();
    const base = today();

    for (const n of [30, 60, 90]) {
      el("fc" + n).textContent = money(
        project(r, p, base, addDays(base, n)).net
      );
    }

    el("fcAtraso").textContent = money(
      r.filter(x => x.date < base)
        .reduce((s, x) => s + x.amount, 0)
    );

    el("fcDespAtraso").textContent = money(
      p.filter(x => x.date < base)
        .reduce((s, x) => s + x.amount, 0)
    );

    const bars = el("fcGrafico");
    bars.replaceChildren();

    const monthStart = base.slice(0, 7);

    const months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(
        Number(monthStart.slice(0, 4)),
        Number(monthStart.slice(5, 7)) - 1 + i,
        1
      );

      const key = localISO(d).slice(0, 7);
      const begin = i === 0 ? base : key + "-01";

      const last = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      );

      return {
        key,
        values: project(r, p, begin, localISO(last))
      };
    });

    const max = Math.max(
      1,
      ...months.flatMap(m => [
        m.values.incoming,
        m.values.outgoing
      ])
    );

    months.forEach(m => {
      const title = document.createElement("p");
      title.textContent = m.key;
      title.style.fontWeight = "bold";
      bars.appendChild(title);

      [
        ["Entradas", m.values.incoming, false],
        ["Saídas", m.values.outgoing, true]
      ].forEach(([label, value, negative]) => {
        const line = document.createElement("div");
        line.className = "fc-row";

        const name = document.createElement("span");
        name.textContent = label;

        const track = document.createElement("div");
        track.className = "fc-track";

        const fill = document.createElement("div");
        fill.className =
          "fc-fill" + (negative ? " fc-neg" : "");

        fill.style.width =
          (100 * value / max).toFixed(1) + "%";

        track.appendChild(fill);

        const amount = document.createElement("span");
        amount.textContent = money(value);
        amount.style.textAlign = "right";

        line.append(name, track, amount);
        bars.appendChild(line);
      });
    });

    const alerts = el("fcAlertas");
    alerts.replaceChildren();

    const limit = addDays(base, 7);

    const items = [
      ...r
        .filter(x => x.date >= base && x.date <= limit)
        .map(x => ({ ...x, type: "Receber" })),

      ...p
        .filter(x => x.date >= base && x.date <= limit)
        .map(x => ({ ...x, type: "Pagar" }))
    ].sort((a, b) => a.date.localeCompare(b.date));

    if (!items.length) {
      alerts.textContent =
        "Nenhum vencimento cadastrado para os próximos 7 dias.";
    }

    items.slice(0, 25).forEach(x => {
      const row = document.createElement("div");
      row.className = "fc-alert";

      row.textContent =
        `${x.date} • ${x.type}: ${x.label} • ${money(x.amount)}`;

      alerts.appendChild(row);
    });

    if (items.length > 25) {
      const note = document.createElement("p");
      note.textContent =
        `Mais ${items.length - 25} vencimento(s) não exibidos.`;

      alerts.appendChild(note);
    }
  }

  async function load() {
    if (busy) return;

    busy = true;
    el("fcAtualizar").disabled = true;

    try {
      const {
        data: { user },
        error: authError
      } = await db.auth.getUser();

      if (authError || !user) {
        lastUser = null;
        expenses = [];
        status("Faça login para carregar o fluxo de caixa.");
        return;
      }

      lastUser = user.id;

      const { data, error } = await db
        .from("financeiro_despesas")
        .select("descricao,valor,vencimento,pago_em")
        .eq("usuario_id", user.id)
        .order("vencimento", { ascending: true });

      if (error) throw error;

      expenses = data || [];

      draw();

      status(
        "Projeção atualizada. Despesas: " +
        expenses.length +
        " registro(s)."
      );

    } catch (e) {
      status(
        "Erro ao carregar projeção: " +
        (e.message || e)
      );

    } finally {
      busy = false;
      el("fcAtualizar").disabled = false;
    }
  }

  el("fcAtualizar").onclick = load;

  db.auth.onAuthStateChange((event, session) => {
    if (!session?.user) {
      lastUser = null;
      expenses = [];

      status(
        "Faça login para carregar o fluxo de caixa."
      );

    } else if (lastUser !== session.user.id) {
      setTimeout(load, 0);
    }
  });

  load();
})();
