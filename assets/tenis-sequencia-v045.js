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
  const list = document.getElementById('tmFreeMatches');
  let syncing = false;

  function applyDefaults() {
    if (bestOf && !bestOf.dataset.tm45Default) { bestOf.value = '1'; bestOf.dataset.tm45Default = '1'; }
    if (points && !points.dataset.tm45Default) { points.value = '1'; points.dataset.tm45Default = '1'; }
    if (lead && !lead.dataset.tm45Default) { lead.value = '2'; lead.dataset.tm45Default = '1'; }

    const form = document.getElementById('tmTournamentForm');
    if (form && /NOVO CAMPEONATO/i.test(form.textContent || '') && !form.dataset.tm45Default) {
      const b = form.querySelector('#tmBestOf'), p = form.querySelector('#tmSetPoints'), l = form.querySelector('#tmMinimumLead');
      if (b) b.value = '1';
      if (p) p.value = '1';
      if (l) l.value = '2';
      form.dataset.tm45Default = '1';
    }
  }

  function latestFinished(matches = []) {
    return [...matches]
      .filter(match => String(match?.status || '').toUpperCase() === 'FINALIZADO' && match?.winnerId)
      .sort((a, b) => Number(b.order || b.game || 0) - Number(a.order || a.game || 0))[0] || null;
  }

  function setSelectValue(select, value) {
    if (!select || !value) return false;
    const exists = [...select.options].some(option => String(option.value) === String(value));
    if (!exists) return false;
    select.value = String(value);
    return true;
  }

  function applyWinner(state) {
    if (!p1 || !p2) return;
    const open = state?.freeOpenMatch || (state?.freeMatches || []).find(match => String(match?.status || '').toUpperCase() !== 'FINALIZADO');
    if (open) return;
    const last = latestFinished(state?.freeMatches || []);
    if (!last) return;
    const winnerId = String(last.winnerId || '');
    const winnerName = winnerId === String(last.player1Id) ? last.player1 : last.player2;
    const loserId = winnerId === String(last.player1Id) ? String(last.player2Id || '') : String(last.player1Id || '');
    if (!setSelectValue(p1, winnerId)) return;
    p1.disabled = true;
    if (label1) label1.textContent = 'Vencedor do último jogo';
    if (!p2.value || p2.value === winnerId) setSelectValue(p2, loserId);
    p2.disabled = false;
    if (note) {
      note.hidden = false;
      note.textContent = `${winnerName || 'O vencedor do último jogo'} permanece fixo para o próximo confronto.`;
    }
  }

  async function sync() {
    if (syncing) return;
    syncing = true;
    try {
      applyDefaults();
      const state = await TM.request('tmAdmin');
      applyWinner(state || {});
    } catch (_) {
      applyDefaults();
    } finally { syncing = false; }
  }

  applyDefaults();
  setTimeout(sync, 900);
  if (list) new MutationObserver(() => { clearTimeout(window.__tm45SeqTimer); window.__tm45SeqTimer = setTimeout(sync, 700); }).observe(list, { childList: true, subtree: true });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-score-save], [data-pa31-save], #tmSaveScore, #tmFreeNewGame')) {
      setTimeout(sync, 1500);
      setTimeout(sync, 5000);
    }
  }, true);
})();
