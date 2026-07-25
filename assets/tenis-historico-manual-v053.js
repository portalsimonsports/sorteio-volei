(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const KEY_STORE = 'sorteio_volei_admin_key_v10';
  const esc = TM.esc || (v => String(v ?? ''));
  let state = { players:[], championships:[], records:[] };
  let editingId = '';

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
  function formatDateTime(value) {
    if (!value) return 'Data/hora não registrada';
    if (typeof value === 'string') {
      const text=value.trim();
      const br=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+)(\d{1,2}):(\d{2})(?::\d{2})?/);
      if(br)return `${br[1].padStart(2,'0')}/${br[2].padStart(2,'0')}/${br[3]} • ${br[4].padStart(2,'0')}:${br[5]}`;
    }
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return esc(value);
    try{
      const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date);
      const get=type=>parts.find(p=>p.type===type)?.value||'';
      return `${get('day')}/${get('month')}/${get('year')} • ${get('hour')}:${get('minute')}`;
    }catch(ignore){
      return date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',',' •');
    }
  }
  function renderRecords() {
    const root=document.getElementById('tmManualHistoryList'); if(!root) return;
    const rows=Array.isArray(state.records)?state.records:[];
    root.innerHTML=rows.length?rows.slice().reverse().map(h=>{
      const origem=h.origin==='CAMPEONATO'?`Campeonato: ${esc(h.championshipName||h.championshipId||'não informado')}`:'Jogos avulsos';
      const editing=String(editingId)===String(h.id)?' editing':'';
      const dataHora=formatDateTime(h.createdAt);
      return `<article class="tm53-history-item${editing}"><div class="tm53-history-copy"><strong>${esc(h.playerA)} ${Number(h.winsA)||0} × ${Number(h.winsB)||0} ${esc(h.playerB)}</strong><small>${Number(h.games)||0} confrontos • base ${Number(h.basePoints)||11} pontos • diferença 2 • ${origem}</small><small class="tm53-history-datetime">📅 ${esc(dataHora)}</small></div><div class="tm53-history-actions"><button type="button" class="tm-button primary" data-tm53-edit="${esc(h.id)}">Editar lançamento</button><button type="button" class="tm-button secondary" data-tm53-delete="${esc(h.id)}">Excluir lançamento</button></div></article>`;
    }).join(''):'<div class="tm-empty">Nenhum histórico consolidado lançado manualmente.</div>';
  }
  async function refresh() {
    state=await request('tmHistoricoManualEstado');renderPlayers();renderChampionships();renderRecords();syncOrigin();
  }
  function syncTotal() {
    const a=Number(document.getElementById('tmHistWinsA')?.value||0),b=Number(document.getElementById('tmHistWinsB')?.value||0),total=document.getElementById('tmHistGames');
    if(total) total.value=Math.max(0,a+b);
  }
  function setEditorTitle(editing) {
    const title=document.querySelector('#tmManualHistoryPanel .tm-panel-head h2');
    if(title)title.textContent=editing?'Editar confronto anterior':'Adicionar confronto anterior';
    const submit=document.getElementById('tmHistSubmit')||document.querySelector('#tmManualHistoryForm button[type="submit"]');
    if(submit)submit.textContent=editing?'Salvar alterações':'Adicionar ao histórico';
    const cancel=document.getElementById('tmHistCancel');
    if(cancel)cancel.hidden=!editing;
  }
  function resetEditor() {
    const form=document.getElementById('tmManualHistoryForm');
    editingId='';
    if(form&&typeof form.reset==='function')form.reset();
    const base=document.getElementById('tmHistBasePoints'),games=document.getElementById('tmHistGames'),origin=document.getElementById('tmHistOrigin'),championship=document.getElementById('tmHistChampionship');
    if(base)base.value='11';if(games)games.value='0';if(origin)origin.value='AVULSO';if(championship)championship.value='';
    syncOrigin();setEditorTitle(false);renderRecords();
  }
  function beginEdit(id) {
    const record=(state.records||[]).find(item=>String(item.id)===String(id));
    if(!record){TM.toast?.('Lançamento histórico não encontrado.','error');return;}
    editingId=record.id;
    renderPlayers();renderChampionships();
    const values={tmHistPlayerA:record.playerAId,tmHistPlayerB:record.playerBId,tmHistWinsA:record.winsA,tmHistWinsB:record.winsB,tmHistGames:record.games,tmHistBasePoints:record.basePoints||11,tmHistObservation:record.observation||'',tmHistOrigin:record.origin||'AVULSO'};
    Object.entries(values).forEach(([idField,value])=>{const field=document.getElementById(idField);if(field)field.value=String(value??'');});
    syncOrigin();
    const championship=document.getElementById('tmHistChampionship');if(championship)championship.value=record.origin==='CAMPEONATO'?String(record.championshipId||''):'';
    setEditorTitle(true);renderRecords();
    document.getElementById('tmManualHistoryPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>document.getElementById('tmHistPlayerA')?.focus(),350);
  }

  document.getElementById('tmHistWinsA')?.addEventListener('input',syncTotal);
  document.getElementById('tmHistWinsB')?.addEventListener('input',syncTotal);
  document.getElementById('tmHistOrigin')?.addEventListener('change',syncOrigin);
  document.getElementById('tmHistCancel')?.addEventListener('click',resetEditor);
  document.getElementById('tmManualHistoryForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget,button=event.submitter||form?.querySelector('button[type="submit"]');
    const payload={
      id:editingId,
      jogadorA:document.getElementById('tmHistPlayerA')?.value||'',jogadorB:document.getElementById('tmHistPlayerB')?.value||'',
      confrontos:document.getElementById('tmHistGames')?.value||'0',vitoriasA:document.getElementById('tmHistWinsA')?.value||'0',vitoriasB:document.getElementById('tmHistWinsB')?.value||'0',
      pontosBase:document.getElementById('tmHistBasePoints')?.value||'11',observacao:document.getElementById('tmHistObservation')?.value||'',
      origem:document.getElementById('tmHistOrigin')?.value||'AVULSO',campeonatoId:document.getElementById('tmHistChampionship')?.value||''
    };
    if(button)button.disabled=true;
    const action=editingId?'tmHistoricoManualEditar':'tmHistoricoManualSalvar';
    try{
      const result=await request(action,payload);state=result.state||state;resetEditor();renderPlayers();renderChampionships();renderRecords();
      TM.toast?.(result.message||(action==='tmHistoricoManualEditar'?'Lançamento atualizado.':'Histórico adicionado.'));
      window.dispatchEvent(new CustomEvent('tm54-history-changed'));
      setTimeout(()=>document.getElementById('tmRefresh')?.click(),350);
    }catch(error){TM.toast?.(error.message||'Não foi possível salvar o histórico.','error');}
    finally{if(button)button.disabled=false;}
  });
  document.getElementById('tmManualHistoryList')?.addEventListener('click',async event=>{
    const editButton=event.target.closest('[data-tm53-edit]');
    if(editButton){beginEdit(editButton.dataset.tm53Edit);return;}
    const button=event.target.closest('[data-tm53-delete]');if(!button)return;
    if(!confirm('Excluir apenas este lançamento histórico consolidado? As partidas reais não serão alteradas.'))return;
    button.disabled=true;
    try{
      const deletingId=button.dataset.tm53Delete,result=await request('tmHistoricoManualExcluir',{id:deletingId});state=result.state||state;
      if(String(editingId)===String(deletingId))resetEditor();else renderRecords();
      TM.toast?.(result.message||'Lançamento removido.');window.dispatchEvent(new CustomEvent('tm54-history-changed'));setTimeout(()=>document.getElementById('tmRefresh')?.click(),350);
    }catch(error){TM.toast?.(error.message||'Não foi possível excluir.','error');button.disabled=false;}
  });
  refresh().catch(()=>{});
})();