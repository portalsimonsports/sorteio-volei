(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const p1 = document.getElementById('tmFreePlayer1');
  const p2 = document.getElementById('tmFreePlayer2');
  const label1 = document.getElementById('tmFreePlayer1Label');
  const note = document.getElementById('tmFreeWinnerNote');
  const bestOf = document.getElementById('tmFreeBestOf');
  const points = document.getElementById('tmFreeSetPoints');
  const lead = document.getElementById('tmFreeMinimumLead');
  const win = document.getElementById('tmFreeWinPoints');
  const loss = document.getElementById('tmFreeLossPoints');
  const list = document.getElementById('tmFreeMatches');
  const create = document.getElementById('tmFreeNewGame');
  let syncing = false;

  function applyDefaults() {
    if (bestOf && !bestOf.dataset.tm45Default) { bestOf.value = '1'; bestOf.dataset.tm45Default = '1'; }
    if (points && !points.dataset.tm45Default) { points.value = '11'; points.dataset.tm45Default = '1'; }
    if (lead && !lead.dataset.tm45Default) { lead.value = '2'; lead.dataset.tm45Default = '1'; }
    if (win && !win.dataset.tm45Default) { win.value = '1'; win.dataset.tm45Default = '1'; }
    if (loss && !loss.dataset.tm45Default) { loss.value = '0'; loss.dataset.tm45Default = '1'; }

    const form = document.getElementById('tmTournamentForm');
    if (form && /NOVO CAMPEONATO/i.test(form.textContent || '') && !form.dataset.tm45Default) {
      const b = form.querySelector('#tmBestOf');
      const p = form.querySelector('#tmSetPoints');
      const l = form.querySelector('#tmMinimumLead');
      const w = form.querySelector('#tmWinPoints');
      const d = form.querySelector('#tmLossPoints');
      if (b) b.value = '1';
      if (p) p.value = '11';
      if (l) l.value = '2';
      if (w) w.value = '1';
      if (d) d.value = '0';
      form.dataset.tm45Default = '1';
    }
  }

  function latestFinished(matches = []) {
    return [...matches]
      .filter(match => String(match?.status || '').toUpperCase() === 'FINALIZADO' && match?.winnerId)
      .sort((a, b) => Number(b.order || b.game || 0) - Number(a.order || a.game || 0))[0] || null;
  }

  function latestOpen(matches = []) {
    return [...matches]
      .filter(match => {
        const status = String(match?.status || '').toUpperCase();
        return match?.id && status && status !== 'FINALIZADO';
      })
      .sort((a, b) => Number(b.order || b.game || 0) - Number(a.order || a.game || 0))[0] || null;
  }

  function setSelectValue(select, value) {
    if (!select || !value) return false;
    const exists = [...select.options].some(option => String(option.value) === String(value));
    if (!exists) return false;
    select.value = String(value);
    return true;
  }

  function liberarSeletores() {
    if (p1) p1.disabled = false;
    if (p2) p2.disabled = false;
    if (create) create.disabled = false;
    if (label1) label1.textContent = 'Participante 1';
    if (note) note.hidden = true;
  }

  function applyWinner(state) {
    if (!p1 || !p2) return;
    const matches = Array.isArray(state?.freeMatches) ? state.freeMatches : [];

    // Sempre parte de um estado utilizável. Não confiamos em freeOpenMatch isolado,
    // pois ele pode permanecer em cache depois que o confronto já foi finalizado.
    liberarSeletores();

    const open = latestOpen(matches);
    if (open) {
      const ok1 = setSelectValue(p1, open.player1Id);
      const ok2 = setSelectValue(p2, open.player2Id);
      if (ok1 && ok2) {
        p1.disabled = true;
        p2.disabled = true;
        if (create) create.disabled = true;
        if (note) {
          note.hidden = false;
          note.textContent = 'Finalize o confronto atual antes de criar um novo jogo.';
        }
        return;
      }
      // Se o estado aberto não puder ser associado aos participantes carregados,
      // não bloqueia os selects. Isso evita tela presa por cache/estado antigo.
    }

    const last = latestFinished(matches);
    if (!last) return;

    const winnerId = String(last.winnerId || '');
    const winnerName = winnerId === String(last.player1Id) ? last.player1 : last.player2;
    const loserId = winnerId === String(last.player1Id) ? String(last.player2Id || '') : String(last.player1Id || '');

    if (!setSelectValue(p1, winnerId)) return;

    // Regra preservada: após um resultado, apenas o vencedor fica fixo.
    // O desafiante continua sempre selecionável.
    p1.disabled = true;
    p2.disabled = false;
    if (label1) label1.textContent = 'Vencedor do último jogo';
    if (!p2.value || p2.value === winnerId) setSelectValue(p2, loserId);
    if (note) {
      note.hidden = false;
      note.textContent = `${winnerName || 'O vencedor do último jogo'} permanece fixo para o próximo confronto. Escolha o desafiante.`;
    }
  }

  async function sync() {
    if (syncing) return;
    syncing = true;
    try {
      applyDefaults();
      let state;
      try { state = await TM.request('tmPlacarEstadoRapido'); }
      catch (_) { state = await TM.request('tmAdmin'); }
      applyWinner(state || {});
    } catch (_) {
      applyDefaults();
      liberarSeletores();
    } finally { syncing = false; }
  }

  applyDefaults();
  // Libera imediatamente para não deixar a interface presa enquanto o estado chega.
  liberarSeletores();
  setTimeout(sync, 80);
  setTimeout(sync, 500);

  if (list) new MutationObserver(() => {
    clearTimeout(window.__tm45SeqTimer);
    window.__tm45SeqTimer = setTimeout(sync, 60);
  }).observe(list, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-score-save], [data-pa31-save], #tmSaveScore, #tmFreeNewGame, [data-tm57-mode]')) {
      setTimeout(sync, 80);
      setTimeout(sync, 500);
    }
  }, true);

  document.addEventListener('tm:free-selectors-refresh', () => sync());
})();