(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const KEY_STORE = 'sorteio_volei_admin_key_v10';
  const esc = TM.esc || (v => String(v ?? ''));
  let state = { players:[], championships:[], records:[] };

  function adminKey(force = false) {
    if (force) localStorage.removeItem(KEY_STORE);
    let key = localStorage.getItem(KEY_STORE) || '';
    if (!key) {
      key = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(KEY_STORE, key);
    }
    return key;
  }
  async function request(action, params = {}, retry = false) {
    try { return await TM.request(action, { ...params, chave:adminKey(retry) }); }
    catch (error) {
      if (!retry && /chave administrativa/i.test(error?.message || '')) { localStorage.removeItem(KEY_STORE); return request(action, params, true); }
      throw error;
    }
  }
  function optionList(selected = '') {
    return '<option value="">Selecione</option>' + state.players.map(p => `<option value="${esc(p.id)}"${String(p.id)===String(selected)?' selected':''}>${esc(p.name)}</option>`).join('');
  }
  function championshipOptions(selected = '') {
    return '<option value="">Selecione o campeonato</option>' + state.championships.map(c => `<option value="${esc(c.id)}"${String(c.id)===String(selected)?' selected':''}>${esc(c.name)} — ${esc(String(c.status||'').replaceAll('_',' '))}</option>`).join('');
  }
  function renderPlayers() {
    const a=document.getElementById('tmHistPlayerA'),b=document.getElementById('tmHistPlayerB');
    if(a){const keep=a.value;a.innerHTML=optionList(keep);}
    if(b){const keep=b.value;b.innerHTML=optionList(keep);}
  }
  function renderChampionships() {
    const select=document.getElementById('tmHistChampionship');
    if(!select)return;
    const keep=select.value;select.innerHTML=championshipOptions(keep);
  }
  function syncOrigin() {
    const origin=document.getElementById('tmHistOrigin')?.value||'AVULSO';
    const wrap=document.getElementById('tmHistChampionshipWrap'),select=document.getElementById('tmHistChampionship');
    const championship=origin==='CAMPEONATO';
    if(wrap)wrap.hidden=!championship;
    if(select){select.required=championship;if(!championship)select.value='';}
  }
  function renderRecords() {
    const root=document.getElementById('tmManualHistoryList'); if(!root) return;
    const rows=Array.isArray(state.records)?state.records:[];
    root.innerHTML=rows.length?rows.slice().reverse().map(h=>{
      const origem=h.origin==='CAMPEONATO'?`Campeonato: ${esc(h.championshipName||h.championshipId||'não informado')}`:'Jogos avulsos';
      return `<article class="tm53-history-item"><div><strong>${esc(h.playerA)} ${Number(h.winsA)||0} × ${Number(h.winsB)||0} ${esc(h.playerB)}</strong><small>${Number(h.games)||0} confrontos • base ${Number(h.basePoints)||11} pontos • diferença 2 • ${origem}</small></div><button type="button" class="tm-button secondary" data-tm53-delete="${esc(h.id)}">Excluir lançamento</button></article>`;
    }).join(''):'<div class="tm-empty">Nenhum histórico consolidado lançado manualmente.</div>';
  }
  async function refresh() {
    state=await request('tmHistoricoManualEstado');renderPlayers();renderChampionships();renderRecords();syncOrigin();
  }
  function syncTotal() {
    const a=Number(document.getElementById('tmHistWinsA')?.value||0),b=Number(document.getElementById('tmHistWinsB')?.value||0),total=document.getElementById('tmHistGames');
    if(total) total.value=Math.max(0,a+b);
  }
  document.getElementById('tmHistWinsA')?.addEventListener('input',syncTotal);
  document.getElementById('tmHistWinsB')?.addEventListener('input',syncTotal);
  document.getElementById('tmHistOrigin')?.addEventListener('change',syncOrigin);
  document.getElementById('tmManualHistoryForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget,button=event.submitter||form?.querySelector('button[type="submit"]');
    const payload={
      jogadorA:document.getElementById('tmHistPlayerA')?.value||'',jogadorB:document.getElementById('tmHistPlayerB')?.value||'',
      confrontos:document.getElementById('tmHistGames')?.value||'0',vitoriasA:document.getElementById('tmHistWinsA')?.value||'0',vitoriasB:document.getElementById('tmHistWinsB')?.value||'0',
      pontosBase:document.getElementById('tmHistBasePoints')?.value||'11',observacao:document.getElementById('tmHistObservation')?.value||'',
      origem:document.getElementById('tmHistOrigin')?.value||'AVULSO',campeonatoId:document.getElementById('tmHistChampionship')?.value||''
    };
    if(button)button.disabled=true;
    try{
      const result=await request('tmHistoricoManualSalvar',payload);state=result.state||state;renderPlayers();renderChampionships();renderRecords();
      if(form&&typeof form.reset==='function')form.reset();
      const base=document.getElementById('tmHistBasePoints'),games=document.getElementById('tmHistGames'),origin=document.getElementById('tmHistOrigin');
      if(base)base.value='11';if(games)games.value='0';if(origin)origin.value='AVULSO';syncOrigin();
      TM.toast?.(result.message||'Histórico adicionado.');
      window.dispatchEvent(new CustomEvent('tm54-history-changed'));
      setTimeout(()=>document.getElementById('tmRefresh')?.click(),350);
    }catch(error){TM.toast?.(error.message||'Não foi possível salvar o histórico.','error');}
    finally{if(button)button.disabled=false;}
  });
  document.getElementById('tmManualHistoryList')?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-tm53-delete]');if(!button)return;
    if(!confirm('Excluir apenas este lançamento histórico consolidado? As partidas reais não serão alteradas.'))return;
    button.disabled=true;
    try{const result=await request('tmHistoricoManualExcluir',{id:button.dataset.tm53Delete});state=result.state||state;renderRecords();TM.toast?.(result.message||'Lançamento removido.');window.dispatchEvent(new CustomEvent('tm54-history-changed'));setTimeout(()=>document.getElementById('tmRefresh')?.click(),350);}
    catch(error){TM.toast?.(error.message||'Não foi possível excluir.','error');button.disabled=false;}
  });
  refresh().catch(()=>{});
})();
