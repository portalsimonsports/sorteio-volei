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
    const bestOfRaw = Number(source.bestOf ?? V.C.BEST_OF_SETS ?? 3);
    const bestOf = [1, 3, 5].includes(bestOfRaw) ? bestOfRaw : 3;
    return { bestOf };
  }

  function findCard(game) {
    return [...bracket.querySelectorAll('.match')].find(card => {
      const text = card.querySelector('.match-top span:first-child')?.textContent || '';
      return Number((text.match(/\d+/) || [])[0]) === Number(game);
    });
  }

  function timeText(match) {
    if (String(match.status || '').toUpperCase() !== 'FINALIZADO') return '';
    if (match.startedAt && match.finishedAt) return `Início ${V.dateTime(match.startedAt, true)} • Término ${V.dateTime(match.finishedAt, true)}`;
    if (match.finishedAt) return `Resultado registrado em ${V.dateTime(match.finishedAt, true)}`;
    return 'Partida finalizada';
  }

  function directAdvanceText(match) {
    if (String(match.phase || '').toUpperCase() !== 'SEMIFINAL') return '';
    const direct = match.team1 && !match.team2 ? match.team1 : match.team2 && !match.team1 ? match.team2 : null;
    const waiting = !match.team1 ? match.team1Placeholder : !match.team2 ? match.team2Placeholder : '';
    if (!direct || !waiting) return '';
    return `Classificação direta: ${V.teamName(direct)} aguarda ${waiting}.`;
  }

  function apply(state) {
    if (!state || applying) return;
    applying = true;
    try {
      const bestOf = rules(state).bestOf;
      bracket.style.setProperty('--score-set-count', String(bestOf));
      const matches = (state.rounds || []).flatMap(round => round.matches || []);
      matches.forEach(match => {
        const card = findCard(match.game);
        if (!card) return;
        const header = card.querySelector('.score-head');
        if (header) {
          header.innerHTML = `<span>Dupla</span>${Array.from({ length: bestOf }, (_, index) => `<b>${index + 1}º</b>`).join('')}<b>Sets</b>`;
        }
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
