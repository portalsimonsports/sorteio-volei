(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const p1 = document.getElementById('tmFreePlayer1');
  const p2 = document.getElementById('tmFreePlayer2');
  const points = document.getElementById('tmFreeSetPoints');
  const label1 = document.getElementById('tmFreePlayer1Label');
  const note = document.getElementById('tmFreeWinnerNote');
  if (!p1 || !p2 || !points) return;

  const MODE_KEY = 'tm_jogo_avulso_metodo_v057';
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const text = v => String(v ?? '').trim();
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let draft = null;
  let score = [0, 0];
  let directPoints = Number(points.value) === 5 ? 5 : 11;
  let saving = false;

  const directMode = () => localStorage.getItem(MODE_KEY) === 'DIRETO' || document.querySelector('[data-tm57-mode="DIRETO"]')?.classList.contains('active');
  const unlock = () => { p1.disabled = false; p2.disabled = false; };

  function players() {
    const seen = new Set();
    return [...p1.options, ...p2.options]
      .map(o => ({ id: text(o.value), name: text(o.textContent) }))
      .filter(x => x.id && !seen.has(x.id) && seen.add(x.id));
  }
  const playerName = id => players().find(x => x.id === text(id))?.name || text(id);
  const options = selected => `<option value="">Selecione um participante</option>${players().map(x => `<option value="${esc(x.id)}" ${x.id === text(selected) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;

  function makeDraft(a, b) {
    return { player1Id:text(a), player1:playerName(a), player2Id:text(b), player2:playerName(b) };
  }

  function ensureModal() {
    let modal = document.getElementById('tm61Modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tm61Modal';
    modal.className = 'pa31-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pa31-modal-card"><button type="button" class="pa31-close" aria-label="Fechar">×</button><div id="tm61Root"></div></div>';
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; draft = null; score = [0,0]; saving = false; };
    modal.querySelector('.pa31-close')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    return modal;
  }
  const modal = ensureModal();

  function result() {
    const a = Math.max(0, Math.floor(num(score[0]))), b = Math.max(0, Math.floor(num(score[1])));
    const complete = a !== b && Math.max(a,b) > 0 && Math.abs(a-b) >= 2;
    return { a,b,complete,sets1:complete&&a>b?1:0,sets2:complete&&b>a?1:0 };
  }

  function setStatus(message, type='') {
    const el = modal.querySelector('[data-tm61-status]');
    if (el) { el.textContent = message; el.dataset.type = type; }
  }

  function syncOuter() {
    if (!draft) return;
    if ([...p1.options].some(o => text(o.value) === draft.player1Id)) p1.value = draft.player1Id;
    if ([...p2.options].some(o => text(o.value) === draft.player2Id)) p2.value = draft.player2Id;
    unlock();
  }

  function render() {
    if (!draft) return;
    const root = modal.querySelector('#tm61Root');
    const r = result();
    root.innerHTML = `<div class="pa31-scoreboard compact">
      <div class="pa31-score-head"><div><strong>${esc(draft.player1)} × ${esc(draft.player2)}</strong><small>Troque qualquer participante antes de salvar.</small></div><div class="pa31-sets">Sets ${r.sets1} × ${r.sets2}</div></div>
      <div class="flex-v024-versus tm60-modal-players">
        <label>Participante 1<select data-tm61-player="0">${options(draft.player1Id)}</select></label>
        <div class="versus-mark">×</div>
        <label>Desafiante<select data-tm61-player="1">${options(draft.player2Id)}</select></label>
      </div>
      <div class="tm57-rule-bar"><strong>Pontos por set</strong><div class="tm57-rule-options"><button type="button" data-tm61-points="5" class="${directPoints===5?'active':''}">5 pontos</button><button type="button" data-tm61-points="11" class="${directPoints===11?'active':''}">11 pontos</button></div><span>Diferença mínima: 2</span></div>
      <p class="tm57-direct-help">O confronto pode ser encerrado abaixo de ${directPoints} pontos se houver vencedor com diferença mínima de 2.</p>
      <div class="pa31-set-list"><article class="pa31-set ${r.complete?'complete':''}"><header><strong>1º set</strong><span>${r.complete?'Pronto para encerrar':`${directPoints} pontos • diferença 2`}</span></header>
        <div class="pa31-side"><span>${esc(draft.player1)}</span><button type="button" data-tm61-delta="-1" data-side="0">−</button><input data-tm61-value data-side="0" type="number" min="0" value="${r.a}"><button type="button" data-tm61-delta="1" data-side="0">+</button></div>
        <div class="pa31-side"><span>${esc(draft.player2)}</span><button type="button" data-tm61-delta="-1" data-side="1">−</button><input data-tm61-value data-side="1" type="number" min="0" value="${r.b}"><button type="button" data-tm61-delta="1" data-side="1">+</button></div>
      </article></div>
      <div class="pa31-save-line"><span class="tm57-direct-status" data-tm61-status>Pronto para lançamento</span><button type="button" data-tm61-save>Salvar e encerrar</button></div>
    </div>`;

    root.querySelectorAll('[data-tm61-player]').forEach(sel => sel.addEventListener('change', () => {
      const a = text(root.querySelector('[data-tm61-player="0"]')?.value);
      const b = text(root.querySelector('[data-tm61-player="1"]')?.value);
      if (!a || !b) return;
      if (a === b) { TM.toast('Selecione participantes diferentes.', 'warn'); sel.value=''; return; }
      draft = makeDraft(a,b);
      score = [0,0];
      syncOuter();
      render();
    }));

    root.querySelectorAll('[data-tm61-delta]').forEach(btn => btn.addEventListener('click', () => {
      const side = Number(btn.dataset.side);
      score[side] = Math.max(0, num(score[side]) + Number(btn.dataset.tm61Delta));
      render();
    }));
    root.querySelectorAll('[data-tm61-value]').forEach(input => input.addEventListener('change', () => {
      score[Number(input.dataset.side)] = Math.max(0, Math.floor(num(input.value)));
      render();
    }));
    root.querySelectorAll('[data-tm61-points]').forEach(btn => btn.addEventListener('click', () => {
      directPoints = Number(btn.dataset.tm61Points) === 5 ? 5 : 11;
      points.value = String(directPoints);
      updatePointButtons();
      render();
    }));
    root.querySelector('[data-tm61-save]')?.addEventListener('click', save);
  }

  function openDraft(a,b) {
    if (!a || !b || a === b) return;
    draft = makeDraft(a,b);
    score = [0,0];
    render();
    modal.hidden = false;
    unlock();
    const info = document.getElementById('tm57MethodNote');
    if (info) info.textContent = 'Placar aberto. Os participantes podem ser trocados no modal. Nada é gravado antes de Salvar e encerrar.';
  }

  function getAdminKey(force=false) {
    if (force) localStorage.removeItem(ADMIN_KEY_STORE);
    let key = text(localStorage.getItem(ADMIN_KEY_STORE));
    if (!key) {
      key = text(prompt('Informe a chave administrativa:'));
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE,key);
    }
    return key;
  }

  async function quickSave(params,retry=false) {
    try { return await TM.request('tmSalvarPlacarRapido',{...params,chave:getAdminKey(retry)}); }
    catch(error) {
      if (!retry && /chave administrativa/i.test(error?.message||'')) return quickSave(params,true);
      throw error;
    }
  }

  async function stateFast() {
    try { return await TM.request('tmPlacarEstadoRapido'); }
    catch(_) { return await TM.request('tmAdmin'); }
  }

  function openMatches(state) {
    return [...(state?.freeMatches||[])].filter(m => m?.id && text(m.status).toUpperCase() !== 'FINALIZADO');
  }

  function findMatch(state,a,b) {
    const list = openMatches(state);
    return list.find(m => text(m.player1Id)===a && text(m.player2Id)===b)
      || list.find(m => text(m.player1Id)===b && text(m.player2Id)===a)
      || null;
  }

  async function save() {
    if (!draft || saving) return;
    const r = result();
    if (!r.complete) { setStatus('Informe um vencedor com diferença mínima de 2 pontos.','error'); return; }
    const button = modal.querySelector('[data-tm61-save]');
    if (button) button.disabled = true;
    saving = true;
    setStatus('Salvando e encerrando...','saving');
    try {
      const chosen = {...draft};
      let state = await stateFast();
      let match = findMatch(state,chosen.player1Id,chosen.player2Id);
      if (!match) {
        const created = await TM.request('tmCriarCampeonato',{
          tipo:'AVULSO',jogador1:chosen.player1Id,jogador2:chosen.player2Id,melhorDe:1,
          pontosSet:directPoints,vantagemMinima:2,pontosVitoria:1,pontosDerrota:0
        });
        state = created?.state || await stateFast();
        match = findMatch(state,chosen.player1Id,chosen.player2Id);
      }
      if (!match?.id) throw new Error('O confronto não foi localizado para gravação.');

      const reversed = text(match.player1Id) !== chosen.player1Id;
      const payloadScore = reversed ? [[r.b,r.a]] : [[r.a,r.b]];
      const saved = await quickSave({
        tipo:'AVULSO',id:match.id,placar:payloadScore,pontosSet:directPoints,vantagemMinima:2,finalizarManual:'SIM'
      });
      if (saved?.partial) throw new Error('O serviço recebeu o placar, mas não encerrou o confronto.');

      const winnerId = r.a > r.b ? chosen.player1Id : chosen.player2Id;
      const winnerName = r.a > r.b ? chosen.player1 : chosen.player2;
      if ([...p1.options].some(o=>text(o.value)===winnerId)) p1.value=winnerId;
      p2.value='';
      if (label1) label1.textContent='Vencedor do último jogo';
      if (note) { note.hidden=false; note.textContent=`${winnerName} permanece selecionado. Escolha o próximo adversário.`; }
      unlock();
      setStatus('Placar salvo e confronto encerrado.','ok');
      TM.toast(saved?.message || 'Confronto salvo e encerrado.');
      setTimeout(()=>{ modal.hidden=true; draft=null; score=[0,0]; saving=false; if(button)button.disabled=false; },500);
    } catch(error) {
      saving=false;
      if (button) button.disabled=false;
      setStatus(error?.message || 'Falha ao salvar o confronto.','error');
      TM.toast(error?.message || 'Falha ao salvar o confronto.','error');
      unlock();
    }
  }

  function updatePointButtons() {
    document.querySelectorAll('[data-tm57-points]').forEach(btn => btn.classList.toggle('active',Number(btn.dataset.tm57Points)===directPoints));
  }

  function openOuter() {
    if (!directMode()) return;
    const a=text(p1.value),b=text(p2.value);
    if (a&&b&&a!==b) openDraft(a,b);
  }

  // Bloqueia o manipulador antigo somente no modo direto.
  document.addEventListener('change',e=>{
    if (e.target!==p1 && e.target!==p2) return;
    unlock();
    if (!directMode()) return;
    e.stopImmediatePropagation();
    setTimeout(openOuter,0);
  },true);

  document.addEventListener('click',e=>{
    const pointBtn=e.target.closest('[data-tm57-points]');
    if (pointBtn && directMode()) {
      e.preventDefault();e.stopImmediatePropagation();
      directPoints=Number(pointBtn.dataset.tm57Points)===5?5:11;
      points.value=String(directPoints);updatePointButtons();
      if (!modal.hidden && draft) render(); else setTimeout(openOuter,0);
      return;
    }
    const modeBtn=e.target.closest('[data-tm57-mode]');
    if (modeBtn) setTimeout(()=>{unlock();if(modeBtn.dataset.tm57Mode==='DIRETO')openOuter();},0);
  },true);

  new MutationObserver(unlock).observe(p1,{attributes:true,attributeFilter:['disabled']});
  new MutationObserver(unlock).observe(p2,{attributes:true,attributeFilter:['disabled']});
  unlock();
  updatePointButtons();
})();