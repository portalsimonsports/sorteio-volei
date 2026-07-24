(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei;
  const bracket = document.getElementById('bracket');
  if (!bracket) return;

  let lastState = null;
  let applying = false;

  function rules(state) {
    const source = state?.rules || {};
    const championship = state?.championship || {};
    const settings = championship?.settings || {};
    const bestOfRaw = Number(championship.bestOf || settings.bestOf || source.bestOf || V.C.BEST_OF_SETS || 3);
    const bestOf = [1, 3, 5].includes(bestOfRaw) ? bestOfRaw : 3;
    return {
      bestOf,
      setsToWin: Number(source.setsToWin || Math.floor(bestOf / 2) + 1),
      normalSetPoints: Number(championship.normalPoints || settings.normalPoints || source.normalSetPoints || V.C.NORMAL_SET_POINTS || 25),
      tiebreakSetPoints: Number(championship.tiebreakPoints || settings.tiebreakPoints || source.tiebreakSetPoints || V.C.TIEBREAK_SET_POINTS || 15),
      minimumLead: Number(championship.minimumLead || settings.minimumLead || source.minimumLead || V.C.MINIMUM_LEAD || 2)
    };
  }

  function findCard(game) {
    return [...bracket.querySelectorAll('.match')].find(card => {
      const text = card.querySelector('.match-top span:first-child')?.textContent || '';
      return Number((text.match(/\d+/) || [])[0]) === Number(game);
    });
  }

  function timeText(match) {
    const status = String(match.status || '').toUpperCase();
    if (status === 'FINALIZADO') {
      if (match.startedAt && match.finishedAt) return `Início ${V.dateTime(match.startedAt, true)} • Término ${V.dateTime(match.finishedAt, true)}`;
      if (match.finishedAt) return `Resultado registrado em ${V.dateTime(match.finishedAt, true)}`;
      return 'Partida finalizada';
    }
    if (match.startedAt && status === 'EM_DISPUTA') return `Iniciada em ${V.dateTime(match.startedAt, true)} • Partida em disputa`;
    return '';
  }

  function directAdvanceText(match) {
    if (String(match.phase || '').toUpperCase() !== 'SEMIFINAL') return '';
    const direct = match.team1 && !match.team2 ? match.team1 : match.team2 && !match.team1 ? match.team2 : null;
    const waiting = !match.team1 ? match.team1Placeholder : !match.team2 ? match.team2Placeholder : '';
    if (!direct || !waiting) return '';
    return `Classificação direta: ${V.teamName(direct)} aguarda ${waiting}.`;
  }

  function updateRules(state) {
    const r = rules(state || {});
    const bestOf = document.getElementById('publicBestOf');
    const setsToWin = document.getElementById('publicSetsToWin');
    const normal = document.getElementById('publicNormalPoints');
    const tie = document.getElementById('publicTiePoints');
    const lead = document.getElementById('publicMinimumLead');
    if (bestOf) bestOf.textContent = r.bestOf === 1 ? 'Partida em 1 set' : `Melhor de ${r.bestOf} sets`;
    if (setsToWin) setsToWin.textContent = `A dupla que vencer ${r.setsToWin} set${r.setsToWin === 1 ? '' : 's'} ganha a partida.`;
    if (normal) normal.textContent = `${r.normalSetPoints} pontos`;
    if (tie) tie.textContent = r.bestOf === 1 ? 'Sem set decisivo' : `${r.tiebreakSetPoints} pontos`;
    if (lead) lead.textContent = `Vantagem de ${r.minimumLead}`;
  }

  function rebuildScoreRows(card, match, bestOf) {
    const rows = card.querySelectorAll('.score-row');
    rows.forEach((row, side) => {
      const total = row.querySelector('strong');
      row.querySelectorAll('b').forEach(cell => cell.remove());
      const scores = Array.from({ length: bestOf }, (_, index) => match.scores?.[index]?.[side]);
      scores.forEach(value => {
        const cell = document.createElement('b');
        cell.textContent = value === null || value === undefined ? '–' : String(value);
        row.insertBefore(cell, total);
      });
    });
  }

  function apply(state) {
    if (!state || applying) return;
    applying = true;
    try {
      const currentRules = rules(state);
      updateRules(state);
      bracket.style.setProperty('--score-set-count', String(currentRules.bestOf));
      const matches = (state.rounds || []).flatMap(round => round.matches || []);
      matches.forEach(match => {
        const card = findCard(match.game);
        if (!card) return;
        const header = card.querySelector('.score-head');
        if (header) header.innerHTML = `<span>Dupla</span>${Array.from({ length: currentRules.bestOf }, (_, index) => `<b>${index + 1}º</b>`).join('')}<b>Sets</b>`;
        rebuildScoreRows(card, match, currentRules.bestOf);
        const status = card.querySelector('.match-status');
        const exactTime = timeText(match);
        const direct = directAdvanceText(match);
        if (status && exactTime) status.textContent = exactTime;
        else if (status && direct) status.textContent = direct;
      });
    } finally {
      applying = false;
    }
  }

  async function refresh() {
    try {
      lastState = await V.request('estado');
      setTimeout(() => apply(lastState), 40);
    } catch (_) {}
  }

  const observer = new MutationObserver(() => {
    if (!applying && lastState) requestAnimationFrame(() => apply(lastState));
  });
  observer.observe(bracket, { childList: true, subtree: true });
  refresh();
  setInterval(refresh, 5000);
})();
