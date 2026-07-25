(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const KEY_STORE = 'sorteio_volei_admin_key_v10';
  const esc = TM.esc || (v => String(v ?? ''));
  let state = { players:[], records:[] };

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
  function renderPlayers() {
    const a=document.getElementById('tmHistPlayerA'),b=document.getElementById('tmHistPlayerB');
    if(a){const keep=a.value;a.innerHTML=optionList(keep);}
    if(b){const keep=b.value;b.innerHTML=optionList(keep);}
  }
  function renderRecords() {
    const root=document.getElementById('tmManualHistoryList'); if(!root) return;
    const rows=Array.isArray(state.records)?state.records:[];
    root.innerHTML=rows.length?rows.slice().reverse().map(h=>`<article class="tm53-history-item"><div><strong>${esc(h.playerA)} ${Number(h.winsA)||0} × ${Number(h.winsB)||0} ${esc(h.playerB)}</strong><small>${Number(h.games)||0} confrontos • base ${Number(h.basePoints)||11} pontos • diferença 2 • histórico consolidado</small></div><button type="button" class="tm-button secondary" data-tm53-delete="${esc(h.id)}">Excluir lançamento</button></article>`).join(''):'<div class="tm-empty">Nenhum histórico consolidado lançado manualmente.</div>';
  }
  async function refresh() {
    state=await request('tmHistoricoManualEstado');renderPlayers();renderRecords();
  }
  function syncTotal() {
    const a=Number(document.getElementById('tmHistWinsA')?.value||0),b=Number(document.getElementById('tmHistWinsB')?.value||0),total=document.getElementById('tmHistGames');
    if(total) total.value=Math.max(0,a+b);
  }
  document.getElementById('tmHistWinsA')?.addEventListener('input',syncTotal);
  document.getElementById('tmHistWinsB')?.addEventListener('input',syncTotal);
  document.getElementById('tmManualHistoryForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.submitter||event.currentTarget.querySelector('button[type="submit"]');if(button)button.disabled=true;
    try{
      const result=await request('tmHistoricoManualSalvar',{jogadorA:document.getElementById('tmHistPlayerA').value,jogadorB:document.getElementById('tmHistPlayerB').value,confrontos:document.getElementById('tmHistGames').value,vitoriasA:document.getElementById('tmHistWinsA').value,vitoriasB:document.getElementById('tmHistWinsB').value,pontosBase:document.getElementById('tmHistBasePoints').value,observacao:document.getElementById('tmHistObservation').value});
      state=result.state||state;renderPlayers();renderRecords();event.currentTarget.reset();document.getElementById('tmHistBasePoints').value='11';document.getElementById('tmHistGames').value='0';TM.toast?.(result.message||'Histórico adicionado.');setTimeout(()=>document.getElementById('tmRefresh')?.click(),80);
    }catch(error){TM.toast?.(error.message||'Não foi possível salvar o histórico.','error');}
    finally{if(button)button.disabled=false;}
  });
  document.getElementById('tmManualHistoryList')?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-tm53-delete]');if(!button)return;
    if(!confirm('Excluir apenas este lançamento histórico consolidado? As partidas reais não serão alteradas.'))return;
    button.disabled=true;
    try{const result=await request('tmHistoricoManualExcluir',{id:button.dataset.tm53Delete});state=result.state||state;renderRecords();TM.toast?.(result.message||'Lançamento removido.');setTimeout(()=>document.getElementById('tmRefresh')?.click(),80);}
    catch(error){TM.toast?.(error.message||'Não foi possível excluir.','error');button.disabled=false;}
  });
  refresh().catch(()=>{});
})();
