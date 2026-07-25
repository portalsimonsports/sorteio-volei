(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const panel = document.getElementById('tmFreeMatchPanel');
  const p1 = document.getElementById('tmFreePlayer1');
  const p2 = document.getElementById('tmFreePlayer2');
  const points = document.getElementById('tmFreeSetPoints');
  const label1 = document.getElementById('tmFreePlayer1Label');
  const note = document.getElementById('tmFreeWinnerNote');
  if (!panel || !p1 || !p2 || !points) return;

  const MODE_KEY = 'tm_jogo_avulso_metodo_v057';
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const text = value => String(value ?? '').trim();
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let busy = false;
  let currentMatch = null;
  let scores = [[0, 0]];
  let directPoints = Number(points.value) === 5 ? 5 : 11;
  let lastWinnerId = '';
  let lastWinnerName = '';

  function isDirect() {
    return localStorage.getItem(MODE_KEY) === 'DIRETO' || document.querySelector('[data-tm57-mode="DIRETO"]')?.classList.contains('active');
  }

  function unlockSelectors() {
    p1.disabled = false;
    p2.disabled = false;
  }

  function optionData() {
    const seen = new Set();
    return [...p1.options, ...p2.options].map(option => ({ id: text(option.value), name: text(option.textContent) }))
      .filter(item => item.id && !seen.has(item.id) && seen.add(item.id));
  }

  function playerName(id) {
    return optionData().find(item => item.id === text(id))?.name || text(id);
  }

  function optionsHtml(selected) {
    return `<option value="">Selecione um participante</option>${optionData().map(item => `<option value="${esc(item.id)}" ${item.id === text(selected) ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}`;
  }

  function setOuterPair(a, b) {
    if ([...p1.options].some(o => text(o.value) === text(a))) p1.value = text(a);
    if ([...p2.options].some(o => text(o.value) === text(b))) p2.value = text(b);
    unlockSelectors();
  }

  function makeDraft(a, b) {
    return {
      id: '',
      player1Id: text(a), player1: playerName(a),
      player2Id: text(b), player2: playerName(b),
      status: 'RASCUNHO', scores: [], bestOf: 1,
      setPoints: directPoints, minimumLead: 2, winPoints: 1, lossPoints: 0
    };
  }

  function validOpen(match) {
    const status = text(match?.status).toUpperCase();
    return !!match?.id && status && status !== 'FINALIZADO';
  }

  function allOpen(state) {
    return [...(state?.freeMatches || [])].filter(validOpen).sort((a, b) => num(b.order || b.game) - num(a.order || a.game));
  }

  function samePair(match, a, b) {
    const x = text(match?.player1Id), y = text(match?.player2Id);
    return (x === text(a) && y === text(b)) || (x === text(b) && y === text(a));
  }

  function openForPair(state, a, b) {
    return allOpen(state).find(match => samePair(match, a, b)) || null;
  }

  async function getFastState() {
    try { return await TM.request('tmPlacarEstadoRapido'); }
    catch (_) { return await TM.request('tmAdmin'); }
  }

  function getAdminKey(force = false) {
    if (force) localStorage.removeItem(ADMIN_KEY_STORE);
    let key = text(localStorage.getItem(ADMIN_KEY_STORE));
    if (!key) {
      key = text(prompt('Informe a chave administrativa:'));
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE, key);
    }
    return key;
  }

  async function requestQuickSave(params, retry = false) {
    try {
      return await TM.request('tmSalvarPlacarRapido', { ...params, chave: getAdminKey(retry) });
    } catch (error) {
      if (!retry && /chave administrativa/i.test(error?.message || '')) return requestQuickSave(params, true);
      throw error;
    }
  }

  function ensureModal() {
    let modal = document.getElementById('tm60QuickModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tm60QuickModal';
    modal.className = 'pa31-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pa31-modal-card"><button type="button" class="pa31-close" aria-label="Fechar">×</button><div id="tm60QuickRoot"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.pa31-close')?.addEventListener('click', () => { modal.hidden = true; currentMatch = null; scores = [[0, 0]]; });
    modal.addEventListener('click', event => { if (event.target === modal) { modal.hidden = true; currentMatch = null; scores = [[0, 0]]; } });
    return modal;
  }

  const modal = ensureModal();

  function preview() {
    const a = Math.max(0, Math.floor(num(scores[0]?.[0])));
    const b = Math.max(0, Math.floor(num(scores[0]?.[1])));
    const complete = a !== b && Math.max(a, b) > 0 && Math.abs(a - b) >= 2;
    return { a, b, complete, sets1: complete && a > b ? 1 : 0, sets2: complete && b > a ? 1 : 0 };
  }

  function syncMatchFromModal(root, changedSide) {
    const a = text(root.querySelector('[data-tm60-player="0"]')?.value);
    const b = text(root.querySelector('[data-tm60-player="1"]')?.value);
    if (!a || !b) return false;
    if (a === b) {
      TM.toast('Selecione participantes diferentes.', 'warn');
      const select = root.querySelector(`[data-tm60-player="${changedSide}"]`);
      if (select) select.value = '';
      return false;
    }
    currentMatch = makeDraft(a, b);
    scores = [[0, 0]];
    setOuterPair(a, b);
    return true;
  }

  function renderModal() {
    if (!currentMatch) return;
    const root = modal.querySelector('#tm60QuickRoot');
    if (!root) return;
    const r = preview();
    root.innerHTML = `<div class="pa31-scoreboard compact">
      <div class="pa31-score-head"><div><strong>${esc(currentMatch.player1)} × ${esc(currentMatch.player2)}</strong><small>Você pode trocar os participantes antes de salvar.</small></div><div class="pa31-sets">Sets ${r.sets1} × ${r.sets2}</div></div>
      <div class="flex-v024-versus tm60-modal-players">
        <label>Participante 1<select data-tm60-player="0">${optionsHtml(currentMatch.player1Id)}</select></label>
        <div class="versus-mark">×</div>
        <label>Desafiante<select data-tm60-player="1">${optionsHtml(currentMatch.player2Id)}</select></label>
      </div>
      <div class="tm57-rule-bar"><strong>Pontos por set</strong><div class="tm57-rule-options"><button type="button" data-tm60-points="5" class="${directPoints === 5 ? 'active' : ''}">5 pontos</button><button type="button" data-tm60-points="11" class="${directPoints === 11 ? 'active' : ''}">11 pontos</button></div><span>Diferença mínima: 2</span></div>
      <p class="tm57-direct-help">Pode encerrar abaixo de ${directPoints} pontos desde que exista vencedor e diferença mínima de 2.</p>
      <div class="pa31-set-list"><article class="pa31-set ${r.complete ? 'complete' : ''}"><header><strong>1º set</strong><span>${r.complete ? 'Pronto para encerrar' : `${directPoints} pontos • diferença 2`}</span></header>
        <div class="pa31-side"><span>${esc(currentMatch.player1)}</span><button type="button" data-tm60-delta="-1" data-side="0">−</button><input data-tm60-value data-side="0" type="number" min="0" value="${r.a}"><button type="button" data-tm60-delta="1" data-side="0">+</button></div>
        <div class="pa31-side"><span>${esc(currentMatch.player2)}</span><button type="button" data-tm60-delta="-1" data-side="1">−</button><input data-tm60-value data-side="1" type="number" min="0" value="${r.b}"><button type="button" data-tm60-delta="1" data-side="1">+</button></div>
      </article></div>
      <div class="pa31-save-line"><span class="tm57-direct-status" data-tm60-status>Placar ainda não gravado</span><button type="button" data-tm60-save>Salvar e encerrar</button></div>
    </div>`;

    root.querySelectorAll('[data-tm60-player]').forEach(select => select.addEventListener('change', () => {
      const side = select.dataset.tm60Player;
      if (syncMatchFromModal(root, side)) renderModal();
    }));

    root.querySelectorAll('[data-tm60-delta]').forEach(button => button.addEventListener('click', () => {
      const side = Number(button.dataset.side);
      scores[0][side] = Math.max(0, num(scores[0][side]) + Number(button.dataset.tm60Delta));
      renderModal();
    }));

    root.querySelectorAll('[data-tm60-value]').forEach(input => input.addEventListener('change', () => {
      const side = Number(input.dataset.side);
      scores[0][side] = Math.max(0, Math.floor(num(input.value)));
      renderModal();
    }));

    root.querySelectorAll('[data-tm60-points]').forEach(button => button.addEventListener('click', () => {
      directPoints = Number(button.dataset.tm60Points) === 5 ? 5 : 11;
      points.value = String(directPoints);
      updatePointButtons();
      currentMatch.setPoints = directPoints;
      renderModal();
    }));

    root.querySelector('[data-tm60-save]')?.addEventListener('click', saveAndFinish);
  }

  function updatePointButtons() {
    document.querySelectorAll('[data-tm57-points]').forEach(button => button.classList.toggle('active', Number(button.dataset.tm57Points) === directPoints));
  }

  function openDraft(a, b) {
    if (!a || !b || a === b) return;
    currentMatch = makeDraft(a, b);
    scores = [[0, 0]];
    renderModal();
    modal.hidden = false;
    unlockSelectors();
    const methodNote = document.getElementById('tm57MethodNote');
    if (methodNote) methodNote.textContent = 'Placar aberto. Você pode trocar os participantes no próprio modal e só grava ao tocar em Salvar e encerrar.';
  }

  function setModalStatus(message, type = '') {
    const status = modal.querySelector('[data-tm60-status]');
    if (status) { status.textContent = message; status.dataset.type = type; }
  }

  function applyWinnerAfterSave(match, r) {
    lastWinnerId = r.a > r.b ? text(match.player1Id) : text(match.player2Id);
    lastWinnerName = r.a > r.b ? text(match.player1) : text(match.player2);
    if ([...p1.options].some(o => text(o.value) === lastWinnerId)) p1.value = lastWinnerId;
    p2.value = '';
    if (label1) label1.textContent = 'Vencedor do último jogo';
    if (note) {
      note.hidden = false;
      note.textContent = `${lastWinnerName || 'O vencedor'} permanece selecionado. Escolha o próximo adversário.`;
    }
    unlockSelectors();
  }

  async function saveAndFinish() {
    if (!currentMatch || busy) return;
    const r = preview();
    if (!currentMatch.player1Id || !currentMatch.player2Id || currentMatch.player1Id === currentMatch.player2Id) {
      setModalStatus('Selecione dois participantes diferentes.', 'error');
      return;
    }
    if (!r.complete) {
      setModalStatus('Informe um vencedor com diferença mínima de 2 pontos.', 'error');
      TM.toast('O placar precisa ter diferença mínima de 2 pontos para encerrar.', 'warn');
      return;
    }

    const button = modal.querySelector('[data-tm60-save]');
    if (button) button.disabled = true;
    busy = true;
    setModalStatus('Salvando e encerrando...', 'saving');

    try {
      const draft = { ...currentMatch };
      let state = await getFastState();
      let serverMatch = openForPair(state, draft.player1Id, draft.player2Id);

      if (!serverMatch) {
        const created = await TM.request('tmCriarCampeonato', {
          tipo: 'AVULSO', jogador1: draft.player1Id, jogador2: draft.player2Id,
          melhorDe: 1, pontosSet: directPoints, vantagemMinima: 2, pontosVitoria: 1, pontosDerrota: 0
        });
        state = created?.state || await getFastState();
        serverMatch = openForPair(state, draft.player1Id, draft.player2Id);
      }

      if (!serverMatch?.id) throw new Error('O confronto não pôde ser localizado para salvar o placar.');

      const saved = await requestQuickSave({
        tipo: 'AVULSO', id: serverMatch.id, placar: scores,
        pontosSet: directPoints, vantagemMinima: 2, finalizarManual: 'SIM'
      });

      if (saved?.partial) throw new Error('O placar foi recebido como parcial e não foi encerrado.');
      const savedMatch = saved?.savedMatch || { ...serverMatch, ...draft };
      setModalStatus('Placar salvo e confronto encerrado.', 'ok');
      TM.toast(saved?.message || 'Confronto encerrado e salvo.');
      applyWinnerAfterSave(savedMatch, r);

      setTimeout(() => {
        modal.hidden = true;
        currentMatch = null;
        scores = [[0, 0]];
        busy = false;
        if (button) button.disabled = false;
      }, 500);
    } catch (error) {
      busy = false;
      setModalStatus(error?.message || 'Não foi possível salvar o confronto.', 'error');
      TM.toast(error?.message || 'Não foi possível salvar o confronto.', 'error');
      if (button) button.disabled = false;
      unlockSelectors();
    }
  }

  function openFromOuterSelectors() {
    if (!isDirect()) return;
    const a = text(p1.value), b = text(p2.value);
    if (!a || !b || a === b) return;
    openDraft(a, b);
  }

  // Captura antes da versão anterior: no modo direto selecionar os dois jogadores
  // apenas abre um rascunho. Nenhum jogo é criado até Salvar e encerrar.
  document.addEventListener('change', event => {
    if (event.target !== p1 && event.target !== p2) return;
    unlockSelectors();
    if (!isDirect()) return;
    event.stopImmediatePropagation();
    setTimeout(openFromOuterSelectors, 0);
  }, true);

  document.addEventListener('click', event => {
    const directPointButton = event.target.closest('[data-tm57-points]');
    if (directPointButton && isDirect()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      directPoints = Number(directPointButton.dataset.tm57Points) === 5 ? 5 : 11;
      points.value = String(directPoints);
      updatePointButtons();
      if (!modal.hidden && currentMatch) { currentMatch.setPoints = directPoints; renderModal(); }
      else setTimeout(openFromOuterSelectors, 0);
      return;
    }
    const modeButton = event.target.closest('[data-tm57-mode]');
    if (modeButton) {
      setTimeout(() => {
        unlockSelectors();
        if (modeButton.dataset.tm57Mode === 'DIRETO') openFromOuterSelectors();
      }, 0);
    }
  }, true);

  const unlockObserver = new MutationObserver(() => {
    unlockSelectors();
    if (lastWinnerId && modal.hidden && !p2.value) {
      if ([...p1.options].some(o => text(o.value) === lastWinnerId)) p1.value = lastWinnerId;
      if (label1) label1.textContent = 'Vencedor do último jogo';
    }
  });
  unlockObserver.observe(p1, { attributes: true, attributeFilter: ['disabled'] });
  unlockObserver.observe(p2, { attributes: true, attributeFilter: ['disabled'] });

  unlockSelectors();
  updatePointButtons();
})();