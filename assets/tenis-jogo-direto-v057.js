(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const panel = document.getElementById('tmFreeMatchPanel');
  const p1 = document.getElementById('tmFreePlayer1');
  const p2 = document.getElementById('tmFreePlayer2');
  const bestOf = document.getElementById('tmFreeBestOf');
  const points = document.getElementById('tmFreeSetPoints');
  const lead = document.getElementById('tmFreeMinimumLead');
  const win = document.getElementById('tmFreeWinPoints');
  const loss = document.getElementById('tmFreeLossPoints');
  const create = document.getElementById('tmFreeNewGame');
  const list = document.getElementById('tmFreeMatches');
  if (!panel || !p1 || !p2 || !points || !create) return;

  const MODE_KEY = 'tm_jogo_avulso_metodo_v057';
  let mode = localStorage.getItem(MODE_KEY) === 'DIRETO' ? 'DIRETO' : 'TRADICIONAL';
  let directPoints = [5, 11].includes(Number(points.value)) ? Number(points.value) : 11;
  let creating = false;
  let currentMatch = null;
  let scores = [[0, 0]];
  let original = null;

  const text = value => String(value ?? '').trim();
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const fields = [bestOf, points, lead, win, loss].filter(Boolean).map(el => el.closest('label')).filter(Boolean);
  const actions = create.closest('.tm-actions');

  function installMethodChooser() {
    if (document.getElementById('tm57Method')) return;
    const box = document.createElement('div');
    box.id = 'tm57Method';
    box.className = 'tm57-method';
    box.innerHTML = `<strong>Método de lançamento</strong>
      <div class="tm57-method-buttons">
        <button type="button" data-tm57-mode="TRADICIONAL">Método atual</button>
        <button type="button" data-tm57-mode="DIRETO">Placar direto</button>
      </div>
      <div id="tm57DirectPoints" hidden>
        <span class="tm57-direct-badge">1 set • diferença 2 • vitória 1 • derrota 0</span>
        <div class="tm57-rule-bar"><strong>Pontos por set</strong><div class="tm57-rule-options"><button type="button" data-tm57-points="5">5 pontos</button><button type="button" data-tm57-points="11">11 pontos</button></div></div>
      </div>
      <small id="tm57MethodNote"></small>`;
    panel.querySelector('.tm-panel-head')?.insertAdjacentElement('afterend', box);
    box.addEventListener('click', event => {
      const modeButton = event.target.closest('[data-tm57-mode]');
      if (modeButton) {
        setMode(modeButton.dataset.tm57Mode);
        return;
      }
      const pointButton = event.target.closest('[data-tm57-points]');
      if (pointButton) {
        directPoints = Number(pointButton.dataset.tm57Points) || 11;
        points.value = String(directPoints);
        updatePointButtons();
        maybeCreateDirect('points');
      }
    });
  }

  function rememberOriginal() {
    if (original) return;
    original = {
      bestOf: bestOf?.value || '1', lead: lead?.value || '2', win: win?.value || '1', loss: loss?.value || '0',
      bestOfDisabled: !!bestOf?.disabled, leadDisabled: !!lead?.disabled, winDisabled: !!win?.disabled, lossDisabled: !!loss?.disabled
    };
  }

  function restoreOriginal() {
    if (!original) return;
    if (bestOf) { bestOf.value = original.bestOf; bestOf.disabled = original.bestOfDisabled; }
    if (lead) { lead.value = original.lead; lead.disabled = original.leadDisabled; }
    if (win) { win.value = original.win; win.disabled = original.winDisabled; }
    if (loss) { loss.value = original.loss; loss.disabled = original.lossDisabled; }
    fields.forEach(label => { label.hidden = false; });
    if (actions) actions.hidden = false;
  }

  function applyDirectDefaults() {
    rememberOriginal();
    if (bestOf) { bestOf.value = '1'; bestOf.disabled = true; }
    if (lead) { lead.value = '2'; lead.disabled = true; }
    if (win) { win.value = '1'; win.disabled = true; }
    if (loss) { loss.value = '0'; loss.disabled = true; }
    points.value = String(directPoints);
    fields.forEach(label => { label.hidden = true; });
    if (actions) actions.hidden = true;
  }

  function updatePointButtons() {
    document.querySelectorAll('[data-tm57-points]').forEach(button => button.classList.toggle('active', Number(button.dataset.tm57Points) === directPoints));
  }

  function renderMode() {
    const direct = mode === 'DIRETO';
    document.querySelectorAll('[data-tm57-mode]').forEach(button => button.classList.toggle('active', button.dataset.tm57Mode === mode));
    const directBox = document.getElementById('tm57DirectPoints');
    if (directBox) directBox.hidden = !direct;
    const note = document.getElementById('tm57MethodNote');
    if (direct) {
      applyDirectDefaults();
      updatePointButtons();
      if (note) note.textContent = 'Selecione os participantes e 5 ou 11 pontos. O placar abre sem usar o botão Novo jogo; + e − não gravam nada até você tocar em Salvar e encerrar.';
    } else {
      restoreOriginal();
      if (note) note.textContent = 'Mantém o fluxo já existente: configure a partida, toque em Novo jogo e depois abra o placar.';
    }
  }

  function setMode(next) {
    mode = next === 'DIRETO' ? 'DIRETO' : 'TRADICIONAL';
    localStorage.setItem(MODE_KEY, mode);
    renderMode();
  }

  function ensureModal() {
    let modal = document.getElementById('tm57DirectModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'tm57DirectModal';
    modal.className = 'pa31-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pa31-modal-card"><button type="button" class="pa31-close" aria-label="Fechar">×</button><div id="tm57DirectRoot"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.pa31-close')?.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
    return modal;
  }

  const modal = ensureModal();

  function resultPreview() {
    const a = num(scores[0]?.[0]), b = num(scores[0]?.[1]);
    const complete = a !== b && Math.max(a, b) > 0 && Math.abs(a - b) >= 2;
    return { a, b, complete, sets1: complete && a > b ? 1 : 0, sets2: complete && b > a ? 1 : 0 };
  }

  function renderDirectModal() {
    if (!currentMatch) return;
    const root = modal.querySelector('#tm57DirectRoot');
    const r = resultPreview();
    root.innerHTML = `<div class="pa31-scoreboard compact">
      <div class="pa31-score-head"><div><strong>${esc(currentMatch.player1)} × ${esc(currentMatch.player2)}</strong><small>Modo direto: ajuste o placar e grave somente ao finalizar.</small></div><div class="pa31-sets">Sets ${r.sets1} × ${r.sets2}</div></div>
      <div class="tm57-rule-bar"><strong>Pontos por set</strong><div class="tm57-rule-options"><button type="button" data-tm57-modal-points="5" class="${directPoints===5?'active':''}">5 pontos</button><button type="button" data-tm57-modal-points="11" class="${directPoints===11?'active':''}">11 pontos</button></div><span>Diferença mínima: 2</span></div>
      <p class="tm57-direct-help">O placar pode terminar abaixo de ${directPoints} pontos se houver um vencedor e a diferença mínima de 2 pontos estiver respeitada.</p>
      <div class="pa31-set-list"><article class="pa31-set ${r.complete?'complete':''}"><header><strong>1º set</strong><span>${r.complete?'Pronto para encerrar':`${directPoints} pontos • diferença 2`}</span></header>
        <div class="pa31-side"><span>${esc(currentMatch.player1)}</span><button type="button" data-tm57-delta="-1" data-side="0">−</button><input data-tm57-value data-side="0" type="number" min="0" value="${r.a}"><button type="button" data-tm57-delta="1" data-side="0">+</button></div>
        <div class="pa31-side"><span>${esc(currentMatch.player2)}</span><button type="button" data-tm57-delta="-1" data-side="1">−</button><input data-tm57-value data-side="1" type="number" min="0" value="${r.b}"><button type="button" data-tm57-delta="1" data-side="1">+</button></div>
      </article></div>
      <div class="pa31-save-line"><span class="tm57-direct-status" data-tm57-status>Placar ainda não gravado</span><button type="button" data-pa31-save data-tm57-save>Salvar e encerrar</button></div>
    </div>`;

    root.querySelectorAll('[data-tm57-delta]').forEach(button => button.addEventListener('click', () => {
      const side = Number(button.dataset.side), delta = Number(button.dataset.tm57Delta);
      scores[0][side] = Math.max(0, num(scores[0][side]) + delta);
      renderDirectModal();
    }));
    root.querySelectorAll('[data-tm57-value]').forEach(input => input.addEventListener('change', () => {
      const side = Number(input.dataset.side);
      scores[0][side] = Math.max(0, Math.floor(num(input.value)));
      renderDirectModal();
    }));
    root.querySelectorAll('[data-tm57-modal-points]').forEach(button => button.addEventListener('click', () => {
      directPoints = Number(button.dataset.tm57ModalPoints) || 11;
      points.value = String(directPoints);
      updatePointButtons();
      renderDirectModal();
    }));
    root.querySelector('[data-tm57-save]')?.addEventListener('click', saveAndFinish);
  }

  function setStatus(message, type = '') {
    const status = modal.querySelector('[data-tm57-status]');
    if (status) { status.textContent = message; status.dataset.type = type; }
  }

  function openDirect(match) {
    currentMatch = match;
    scores = [[0, 0]];
    window.__TM52_SCORE_RULES = window.__TM52_SCORE_RULES || {};
    window.__TM52_SCORE_RULES[String(match.id)] = { points: directPoints, lead: 2 };
    renderDirectModal();
    modal.hidden = false;
  }

  function newestOpen(state) {
    if (state?.freeOpenMatch) return state.freeOpenMatch;
    return [...(state?.freeMatches || [])].filter(match => String(match.status || '').toUpperCase() !== 'FINALIZADO').sort((a,b) => num(b.order)-num(a.order))[0] || null;
  }

  function addTemporaryListItem(match) {
    if (!list || !match?.id) return;
    if (list.querySelector(`[data-tm57-open="${CSS.escape(String(match.id))}"]`)) return;
    const empty = list.querySelector('.flex-v023-empty'); if (empty) empty.remove();
    const item = document.createElement('article');
    item.className = 'flex-v023-free-item';
    item.dataset.tm57Temporary = String(match.id);
    item.innerHTML = `<div><strong>${esc(match.player1)} × ${esc(match.player2)}</strong><small>Jogo ${num(match.order)} • ${esc(match.status || 'LIBERADO')} • placar direto</small></div><button class="tm-button secondary" type="button" data-tm57-open="${esc(match.id)}">Reabrir placar direto</button>`;
    list.prepend(item);
  }

  async function maybeCreateDirect(source) {
    if (mode !== 'DIRETO' || creating) return;
    if (source !== 'points' && source !== 'player') return;
    const player1 = text(p1.value), player2 = text(p2.value);
    if (!player1 || !player2 || player1 === player2) return;
    creating = true;
    const note = document.getElementById('tm57MethodNote');
    if (note) note.textContent = 'Criando o confronto e abrindo o placar...';
    try {
      const result = await TM.request('tmCriarCampeonato', {
        tipo:'AVULSO', jogador1:player1, jogador2:player2, melhorDe:1,
        pontosSet:directPoints, vantagemMinima:2, pontosVitoria:1, pontosDerrota:0
      });
      const match = newestOpen(result?.state);
      if (!match) throw new Error('O confronto foi criado, mas não foi possível abrir o placar automaticamente.');
      currentMatch = match;
      p1.disabled = true; p2.disabled = true;
      addTemporaryListItem(match);
      openDirect(match);
      if (note) note.textContent = 'Confronto aberto. Ajuste os pontos no modal e use Salvar e encerrar.';
    } catch (error) {
      TM.toast(error.message || 'Não foi possível abrir o confronto direto.', 'error');
      if (note) note.textContent = error.message || 'Não foi possível abrir o confronto direto.';
    } finally { creating = false; }
  }

  async function saveAndFinish() {
    if (!currentMatch) return;
    const r = resultPreview();
    if (!r.complete) {
      setStatus('Para encerrar, informe um vencedor com diferença mínima de 2 pontos.', 'error');
      TM.toast('O placar precisa ter diferença mínima de 2 pontos para encerrar.', 'warn');
      return;
    }
    const button = modal.querySelector('[data-tm57-save]');
    if (button) button.disabled = true;
    setStatus('Salvando e encerrando...', 'saving');
    try {
      window.__TM52_SCORE_RULES = window.__TM52_SCORE_RULES || {};
      window.__TM52_SCORE_RULES[String(currentMatch.id)] = { points: directPoints, lead: 2 };
      window.__TM53_MANUAL_SAVE_UNTIL = Date.now() + 3000;
      const result = await TM.request('tmSalvarPlacarAutomatico', {
        tipo:'AVULSO', id:currentMatch.id, placar:scores, pontosSet:directPoints, vantagemMinima:2
      });
      if (result?.partial) throw new Error('O serviço salvou o placar como parcial. Toque novamente em Salvar e encerrar.');
      setStatus('Confronto encerrado e salvo.', 'ok');
      TM.toast(result?.message || 'Confronto encerrado e salvo.');
      const temp = list?.querySelector(`[data-tm57-temporary="${CSS.escape(String(currentMatch.id))}"]`); temp?.remove();
      currentMatch = null;
      setTimeout(() => { modal.hidden = true; document.getElementById('tmRefresh')?.click(); }, 450);
    } catch (error) {
      setStatus(error.message || 'Não foi possível salvar.', 'error');
      TM.toast(error.message || 'Não foi possível salvar o confronto.', 'error');
      if (button) button.disabled = false;
    }
  }

  panel.addEventListener('click', event => {
    const reopen = event.target.closest('[data-tm57-open]');
    if (!reopen || !currentMatch || String(currentMatch.id) !== String(reopen.dataset.tm57Open)) return;
    event.preventDefault(); event.stopPropagation(); openDirect(currentMatch);
  }, true);

  p1.addEventListener('change', () => setTimeout(() => maybeCreateDirect('player'), 0));
  p2.addEventListener('change', () => setTimeout(() => maybeCreateDirect('player'), 0));
  points.addEventListener('change', () => {
    if (mode !== 'DIRETO') return;
    const value = Number(points.value);
    directPoints = value === 5 ? 5 : 11;
    points.value = String(directPoints);
    updatePointButtons();
    maybeCreateDirect('points');
  });

  installMethodChooser();
  renderMode();
})();