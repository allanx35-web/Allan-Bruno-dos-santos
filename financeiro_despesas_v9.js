
/* A. S. CONTEÚDO DIGITAL — FINANCEIRO V9 — DESPESAS NA NUVEM */
(() => {
  'use strict';
  const db = typeof supabaseFinanceiro !== 'undefined' ? supabaseFinanceiro : null;
  if (!db) return;
  const main = document.querySelector('main');
  if (!main || document.getElementById('despesasV9')) return;
  const el = id => document.getElementById(id);
  const dinheiro = n => Number(n || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const seguro = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const isoHoje = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  let usuario = null, despesas = [];
  const secao = document.createElement('section');
  secao.className = 'card'; secao.id = 'despesasV9';
  secao.innerHTML = `
  <h2 style="color:#d5aa55">Financeiro V9 • Despesas e resultados</h2>
  <p class="note">Despesas salvas no Supabase. Vincule uma despesa a um contrato para acompanhar o resultado do projeto.</p>
  <div class="summary" style="margin:15px 0">
    <div class="metric"><small>Despesas do mês</small><strong id="v9Mes">R$ 0,00</strong></div>
    <div class="metric"><small>Pagas no mês</small><strong id="v9Pagas">R$ 0,00</strong></div>
    <div class="metric"><small>Em aberto</small><strong id="v9Abertas">R$ 0,00</strong></div>
    <div class="metric"><small>Resultado de caixa no mês</small><strong id="v9Resultado">R$ 0,00</strong></div>
  </div>
  <label for="v9FiltroMes">Competência das despesas</label><input id="v9FiltroMes" type="month">
  <h3>Nova despesa</h3>
  <label for="v9Descricao">Descrição</label><input id="v9Descricao" maxlength="200" placeholder="Ex.: Transporte para gravação">
  <label for="v9Categoria">Categoria</label><select id="v9Categoria"><option>Produção</option><option>Transporte</option><option>Equipamentos</option><option>Software</option><option>Marketing</option><option>Administrativo</option><option>Impostos</option><option>Outros</option></select>
  <label for="v9Projeto">Projeto (opcional)</label><select id="v9Projeto"><option value="">Despesa geral</option></select>
  <label for="v9Valor">Valor (R$)</label><input id="v9Valor" type="number" min="0.01" step="0.01" inputmode="decimal">
  <label for="v9Vencimento">Vencimento</label><input id="v9Vencimento" type="date">
  <div class="actions"><button id="v9Salvar" type="button">Salvar despesa</button><button id="v9Atualizar" type="button" class="secondary">Atualizar despesas</button></div>
  <p id="v9Estado" class="note" role="status">Aguardando autenticação...</p>
  <h3>Despesas cadastradas</h3><div id="v9Lista"></div>
  <h3>Resultado por projeto</h3><div id="v9Projetos"></div>`;
  const ancora = document.getElementById('dashboardGerencialV8');
  if (ancora) ancora.insertAdjacentElement('afterend',secao); else main.appendChild(secao);
  el('v9FiltroMes').value = isoHoje().slice(0,7);
  el('v9Vencimento').value = isoHoje();
  const estado = msg => el('v9Estado').textContent = msg;
  const contratosAtuais = () => { try { return typeof contratos !== 'undefined' && Array.isArray(contratos) ? contratos : []; } catch { return []; } };
  function atualizarProjetosSelect() {
    const select = el('v9Projeto'), atual = select.value;
    select.replaceChildren(new Option('Despesa geral',''));
    contratosAtuais().forEach(c => select.add(new Option(`${c.cliente} — ${c.projeto}`,c.id)));
    select.value = [...select.options].some(o=>o.value===atual) ? atual : '';
  }
  function renderizar() {
    atualizarProjetosSelect();
    const mes = el('v9FiltroMes').value;
    const mesDespesas = despesas.filter(d=>String(d.vencimento).slice(0,7)===mes);
    const totalMes = mesDespesas.reduce((s,d)=>s+Number(d.valor),0);
    const pagasMes = despesas.filter(d=>d.pago_em && String(d.pago_em).slice(0,7)===mes).reduce((s,d)=>s+Number(d.valor),0);
    const abertas = despesas.filter(d=>!d.pago_em).reduce((s,d)=>s+Number(d.valor),0);
    let recebidoMes = 0;
    for (const c of contratosAtuais()) for (const p of c.parcelas||[]) for (const pg of p.pagamentos||[]) if (String(pg.data||pg.data_pagamento||'').slice(0,7)===mes) recebidoMes += Number(pg.valor||0)/100;
    el('v9Mes').textContent=dinheiro(totalMes);
    el('v9Pagas').textContent=dinheiro(pagasMes);
    el('v9Abertas').textContent=dinheiro(abertas);
    el('v9Resultado').textContent=dinheiro(recebidoMes-pagasMes);
    const lista = el('v9Lista'); lista.replaceChildren();
    if (!despesas.length) lista.textContent='Nenhuma despesa cadastrada.';
    despesas.slice().sort((a,b)=>String(b.vencimento).localeCompare(String(a.vencimento))).forEach(d=>{
      const box=document.createElement('div');box.className='installment';
      const nome=contratosAtuais().find(c=>c.id===d.projeto_contrato_id);
      box.innerHTML=`<strong>${seguro(d.descricao)}</strong><p>${seguro(d.categoria)} • ${seguro(d.vencimento)} • ${seguro(dinheiro(d.valor))}</p><p class="note">${nome?seguro(nome.cliente+' — '+nome.projeto):'Despesa geral'} • ${d.pago_em?'Paga em '+seguro(d.pago_em):'Em aberto'}</p>`;
      const ac=document.createElement('div');ac.className='actions';
      const alternar=document.createElement('button');alternar.type='button';alternar.className='secondary';alternar.textContent=d.pago_em?'Desmarcar pagamento':'Marcar como paga';alternar.onclick=()=>alterarPagamento(d);
      const excluir=document.createElement('button');excluir.type='button';excluir.className='danger';excluir.textContent='Excluir';excluir.onclick=()=>excluirDespesa(d);
      ac.append(alternar,excluir);box.appendChild(ac);lista.appendChild(box);
    });
    const projetos=el('v9Projetos');projetos.replaceChildren();
    if (!contratosAtuais().length) projetos.textContent='Nenhum contrato carregado.';
    contratosAtuais().forEach(c=>{
      const custo=despesas.filter(d=>d.projeto_contrato_id===c.id).reduce((s,d)=>s+Number(d.valor),0);
      const recebimentos=(c.parcelas||[]).reduce((s,p)=>s+(p.pagamentos||[]).reduce((a,pg)=>a+Number(pg.valor||0)/100,0),0);
      const div=document.createElement('div');div.className='installment';
      div.innerHTML=`<strong>${seguro(c.cliente)} — ${seguro(c.projeto)}</strong><p>Recebido: ${seguro(dinheiro(recebimentos))} | Despesas atribuídas: ${seguro(dinheiro(custo))}</p><p><strong>Resultado parcial: ${seguro(dinheiro(recebimentos-custo))}</strong></p>`;
      projetos.appendChild(div);
    });
  }
  async function executar(fn) {
    try {
      const {data,error}=await db.auth.getUser();
      if(error || !data?.user) throw Error('Faça login para acessar as despesas.');
      usuario=data.user;
      await fn();
    } catch(e) {estado('Erro: '+(e.message||e));alert('Não foi possível concluir: '+(e.message||e));}
  }
  async function carregar() {
    const {data,error}=await db.from('financeiro_despesas').select('*').eq('usuario_id',usuario.id).order('vencimento',{ascending:false});
    if(error) throw error;
    despesas=data||[];renderizar();estado('Despesas sincronizadas: '+despesas.length+' registro(s).');
  }
  async function salvar() {
    const descricao=el('v9Descricao').value.trim();
    const valor=Number(el('v9Valor').value);
    const vencimento=el('v9Vencimento').value;
    if(!descricao||!Number.isFinite(valor)||valor<=0||!vencimento) return alert('Preencha descrição, valor positivo e vencimento.');
    await executar(async()=>{
      const {error}=await db.from('financeiro_despesas').insert({usuario_id:usuario.id,descricao,categoria:el('v9Categoria').value,projeto_contrato_id:el('v9Projeto').value||null,valor:Math.round(valor*100)/100,vencimento});
      if(error) throw error;
      el('v9Descricao').value='';el('v9Valor').value='';await carregar();
    });
  }
  async function alterarPagamento(d) {
    const novaData=d.pago_em?null:prompt('Data do pagamento (AAAA-MM-DD):',isoHoje());
    if(novaData===null && !d.pago_em)return;
    if(novaData && !/^\d{4}-\d{2}-\d{2}$/.test(novaData))return alert('Data inválida.');
    await executar(async()=>{const {error}=await db.from('financeiro_despesas').update({pago_em:novaData}).eq('id',d.id).eq('usuario_id',usuario.id);if(error)throw error;await carregar();});
  }
  async function excluirDespesa(d) {
    if(!confirm('Excluir a despesa "'+d.descricao+'"?'))return;
    await executar(async()=>{const {error}=await db.from('financeiro_despesas').delete().eq('id',d.id).eq('usuario_id',usuario.id);if(error)throw error;await carregar();});
  }
  el('v9Salvar').onclick=salvar;
  el('v9Atualizar').onclick=()=>executar(carregar);
  el('v9FiltroMes').onchange=renderizar;
  el('v9Projeto').addEventListener('focus',atualizarProjetosSelect);
  db.auth.onAuthStateChange((event,session)=>{
    if(session?.user){usuario=session.user;setTimeout(()=>executar(carregar),0);}
    else {usuario=null;despesas=[];renderizar();estado('Faça login para consultar despesas.');}
  });
  executar(carregar);
})();
