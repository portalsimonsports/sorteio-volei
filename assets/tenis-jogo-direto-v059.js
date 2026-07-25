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
  const text = value => String(value ?? '').trim();
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let busy = false;
  let currentMatch = null;
  let scores = [[0, 0]];
  let directPoints = Number(points.value) === 5 ? 5 : 11;
  let lastOpenKey = '';

  function isDirect() {
    return localStorage.getItem(MODE_KEY) === 'DIRETO' || document.querySelector('[data-tm57-mode="DIRETO"]')?.classList.contains('active');
  }

  function unlockSelectors() {
    if (p1.disabled) p1.disabled = false;
    if (p2.disabled) p2.disabled = false;
  }

  function selectExists(select, value) {
    return !!select && [...select.options].some(option => text(option.value) === text(value));
  }

  function setSelect(select, value) {
    if (!selectExists(select, value)) return false;
    select.value = text(value);
    return true;
  }

  function selectedPairKey() {
    const a = text(p1.value), b = text(p2.value);
    return a && b ? `${a}::${b}` : '';
  }

  function validOpen(match) {
    const status = text(match?.status).toUpperCase();
    return !!match?.id && !!status && status !== 'FINALIZADO';
  }

  function allOpen(state) {
    return [...(state?.freeMatches || [])]
      .filter(validOpen)
      .sort((a, b) => num(b.order || b.game) - num(a.order || a.game));
  }

  function samePair(match, a, b) {
    const x = text(match?.player1Id), y = text(match?.player2Id);
    return (x === a && y === b) || (x === b && y === a);
  }

  function openForPair(state, a, b) {
    return allOpen(state).find(match => samePair(match, a, b)) || null;
  }

  async function getFastState() {
    try { return await TM.request('tmPlacarEstadoRapido'); }
    catch (_) { return await TM.request('tmAdmin'); }
  }

  function ensureModal() {
    let modal = document.getElementById('tm59QuickModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tm59QuickModal';
    modal.className = 'pa31-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pa31-modal-card"><button type="button" class="pa31-close" aria-label="Fechar">×</button><div id="tm59QuickRoot"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.pa31-close')?.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
    return modal;
  }

  const modal = ensureModal();

  function preview() {
    const a = Math.max(0, Math.floor(num(scores[0]?.[0])));
    const b = Math.max(0, Math.floor(num(scores[0]?.[1])));
    const complete = a !== b && Math.max(a, b) > 0 && Math.abs(a - b) >= 2;
    return { a, b, complete, sets1: complete && a > b ? 1 : 0, sets2: complete && b > a ? 1 : 0 };
  }

  function renderModal() {
    if (!currentMatch) return;
    const root = modal.querySelector('#tm59QuickRoot');
    if (!root) return;
    const r = preview();
    root.innerHTML = `<div class="pa31-scoreboard compact">
      <div class="pa31-score-head"><div><strong>${esc(currentMatch.player1)} × ${esc(currentMatch.player2)}</strong><small>Placar direto: escolha os pontos e salve somente ao encerrar.</small></div><div class="pa31-sets">Sets ${r.sets1} × ${r.sets2}</div></div>
      <div class="tm57-rule-bar"><strong>Pontos por set</strong><div class="tm57-rule-options"><button type="button" data-tm59-points="5" class="${directPoints === 5 ? 'active' : ''}">5 pontos</button><button type="button" data-tm59-points="11" class="${directPoints === 11 ? 'active' : ''}">11 pontos</button></div><span>Diferença mínima: 2</span></div>
      <p class="tm57-direct-help">Pode encerrar abaixo de ${directPoints} pontos desde que exista vencedor e diferença mínima de 2.</p>
      <div class="pa31-set-list"><article class="pa31-set ${r.complete ? 'complete' : ''}"><header><strong>1º set</strong><span>${r.complete ? 'Pronto para encerrar' : `${directPoints} pontos • diferença 2`}</span></header>
        <div class="pa31-side"><span>${esc(currentMatch.player1)}</span><button type="button" data-tm59-delta="-1" data-side="0">−</button><input data-tm59-value data-side="0" type="number" min="0" value="${r.a}"><button type="button" data-tm59-delta="1" data-side="0">+</button></div>
        <div class="pa31-side"><span>${esc(currentMatch.player2)}</span><button type="button" data-tm59-delta="-1" data-side="1">−</button><input data-tm59-value data-side="1" type="number" min="0" value="${r.b}"><button type="button" data-tm59-delta="1" data-side="1">+</button></div>
      </article></div>
      <div class="pa31-save-line"><span class="tm57-direct-status" data-tm59-status>Placar ainda não gravado</span><button type="button" data-tm59-save>Salvar e encerrar</button></div>
    </div>`;

    root.querySelectorAll('[data-tm59-delta]').forEach(button => button.addEventListener('click', () => {
      const side = Number(button.dataset.side);
      scores[0][side] = Math.max(0, num(scores[0][side]) + Number(button.dataset.tm59Delta));
      renderModal();
    }));

    root.querySelectorAll('[data-tm59-value]').forEach(input => input.addEventListener('change', () => {
      const side = Number(input.dataset.side);
      scores[0][side] = Math.max(0, Math.floor(num(input.value)));
      renderModal();
    }));

    root.querySelectorAll('[data-tm59-points]').forEach(button => button.addEventListener('click', () => {
      directPoints = Number(button.dataset.tm59Points) === 5 ? 5 : 11;
      points.value = String(directPoints);
      updatePointButtons();
      renderModal();
    }));

    root.querySelector('[data-tm59-save]')?.addEventListener('click', saveAndFinish);
  }

  function updatePointButtons() {
    document.querySelectorAll('[data-tm57-points]').forEach(button => {
      button.classList.toggle('active', Number(button.dataset.tm57Points) === directPoints);
    });
  }

  function openQuick(match) {
    currentMatch = match;
    const existing = Array.isArray(match?.scores) && match.scores.length ? match.scores[0] : null;
    scores = [[num(existing?.[0]), num(existing?.[1])]];
    window.__TM52_SCORE_RULES = window.__TM52_SCORE_RULES || {};
    window.__TM52_SCORE_RULES[text(match.id)] = { points: directPoints, lead: 2 };
    renderModal();
    modal.hidden = false;
    unlockSelectors();
  }

  function applyWinnerAfterSave(match, r) {
    const winnerId = r.a > r.b ? text(match.player1Id) : text(match.player2Id);
    const winnerName = r.a > r.b ? text(match.player1) : text(match.player2);
    if (winnerId) setSelect(p1, winnerId);
    p2.value = '';
    if (label1) label1.textContent = 'Vencedor do último jogo';
    if (note) {
      note.hidden = false;
      note.textContent = `${winnerName || 'O vencedor'} permanece selecionado. Escolha o próximo adversário.`;
    }
    unlockSelectors();
    lastOpenKey = '';
  }

  function setModalStatus(message, type = '') {
    const status = modal.querySelector('[data-tm59-status]');
    if (status) {
      status.textContent = message;
      status.dataset.type = type;
    }
  }

  async function saveAndFinish() {
    if (!currentMatch) return;
    const r = preview();
    if (!r.complete) {
      setModalStatus('Informe um vencedor com diferença mínima de 2 pontos.', 'error');
      TM.toast('O placar precisa ter diferença mínima de 2 pontos para encerrar.', 'warn');
      return;
    }
    const button = modal.querySelector('[data-tm59-save]');
    if (button) button.disabled = true;
    setModalStatus('Salvando e encerrando...', 'saving');
    try {
      window.__TM53_MANUAL_SAVE_UNTIL = Date.now() + 3000;
      const savedMatch = currentMatch;
      const result = await TM.request('tmSalvarPlacarAutomatico', {
        tipo: 'AVULSO', id: savedMatch.id, placar: scores, pontosSet: directPoints, vantagemMinima: 2
      });
      if (result?.partial) throw new Error('O placar foi recebido como parcial. Toque novamente em Salvar e encerrar.');
      setModalStatus('Confronto encerrado e salvo.', 'ok');
      TM.toast(result?.message || 'Confronto encerrado e salvo.');
      applyWinnerAfterSave(savedMatch, r);
      currentMatch = null;
      setTimeout(() => {
        modal.hidden = true;
        unlockSelectors();
        document.getElementById('tmRefresh')?.click();
        setTimeout(unlockSelectors, 250);
        setTimeout(unlockSelectors, 900);
      }, 300);
    } catch (error) {
      setModalStatus(error.message || 'Não foi possível salvar o confronto.', 'error');
      TM.toast(error.message || 'Não foi possível salvar o confronto.', 'error');
      if (button) button.disabled = false;
      unlockSelectors();
    }
  }

  async function createOrOpenSelected() {
    if (!isDirect() || busy) return;
    const a = text(p1.value), b = text(p2.value);
    if (!a || !b || a === b) return;
    const key = `${a}::${b}`;
    if (key === lastOpenKey && currentMatch && !modal.hidden) return;

    busy = true;
    lastOpenKey = key;
    const methodNote = document.getElementById('tm57MethodNote');
    if (methodNote) methodNote.textContent = 'Abrindo o placar do confronto selecionado...';
    try {
      let state = await getFastState();
      let match = openForPair(state, a, b);
      if (!match) {
        const existingOpen = allOpen(state)[0] || null;
        if (existingOpen) {
          setSelect(p1, existingOpen.player1Id);
          setSelect(p2, existingOpen.player2Id);
          unlockSelectors();
          openQuick(existingOpen);
          if (methodNote) methodNote.textContent = 'Existe um confronto ainda aberto. O placar dele foi reaberto para finalização.';
          TM.toast('Há um confronto ainda não finalizado. Finalize-o antes de iniciar outro.', 'warn');
          return;
        }

        const result = await TM.request('tmCriarCampeonato', {
          tipo: 'AVULSO', jogador1: a, jogador2: b, melhorDe: 1,
          pontosSet: directPoints, vantagemMinima: 2, pontosVitoria: 1, pontosDerrota: 0
        });
        state = result?.state || await getFastState();
        match = openForPair(state, a, b) || allOpen(state)[0] || null;
      }

      if (!match) throw new Error('O confronto foi criado, mas o placar não pôde ser aberto automaticamente.');
      openQuick(match);
      if (methodNote) methodNote.textContent = 'Placar aberto. Use + e − e toque em Salvar e encerrar.';
    } catch (error) {
      lastOpenKey = '';
      TM.toast(error.message || 'Não foi possível abrir o placar direto.', 'error');
      if (methodNote) methodNote.textContent = error.message || 'Não foi possível abrir o placar direto.';
    } finally {
      busy = false;
      unlockSelectors();
    }
  }

  // Impede que a versão anterior do fluxo direto execute em paralelo.
  document.addEventListener('change', event => {
    if (event.target !== p1 && event.target !== p2) return;
    unlockSelectors();
    if (!isDirect()) return;
    event.stopImmediatePropagation();
    setTimeout(createOrOpenSelected, 0);
  }, true);

  document.addEventListener('click', event => {
    const directPointButton = event.target.closest('[data-tm57-points]');
    if (directPointButton && isDirect()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      directPoints = Number(directPointButton.dataset.tm57Points) === 5 ? 5 : 11;
      points.value = String(directPoints);
      updatePointButtons();
      setTimeout(createOrOpenSelected, 0);
      return;
    }

    const modeButton = event.target.closest('[data-tm57-mode]');
    if (modeButton) {
      setTimeout(() => {
        unlockSelectors();
        if (modeButton.dataset.tm57Mode === 'DIRETO') createOrOpenSelected();
      }, 0);
    }
  }, true);

  // Nenhuma rotina pode deixar os selects visualmente travados. O vencedor é
  // preservado pelo valor selecionado, não pelo atributo disabled.
  const unlockObserver = new MutationObserver(unlockSelectors);
  unlockObserver.observe(p1, { attributes: true, attributeFilter: ['disabled'] });
  unlockObserver.observe(p2, { attributes: true, attributeFilter: ['disabled'] });

  document.getElementById('tmRefresh')?.addEventListener('click', () => {
    setTimeout(unlockSelectors, 50);
    setTimeout(unlockSelectors, 350);
    setTimeout(unlockSelectors, 900);
  }, true);

  unlockSelectors();
  setTimeout(unlockSelectors, 100);
  setTimeout(unlockSelectors, 600);
})();
