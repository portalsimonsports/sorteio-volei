(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;

  const V = window.Volei;
  const section = document.getElementById('classificacao');
  const rowsTarget = document.getElementById('finalRankingRows');
  const statusTarget = document.getElementById('rankingStatus');
  if (!section || !rowsTarget) return;

  function winner(match) {
    if (!match?.winnerId) return null;
    if (match.team1?.id === match.winnerId) return match.team1;
    if (match.team2?.id === match.winnerId) return match.team2;
    return null;
  }

  function loser(match) {
    if (!match?.winnerId || !match.team1 || !match.team2) return null;
    return match.team1.id === match.winnerId ? match.team2 : match.team1;
  }

  function teamName(team) {
    return V.teamName(team) || team?.id || 'Equipe';
  }

  function buildRanking(state) {
    const matches = (state.rounds || []).flatMap(round => round.matches || []);
    const teams = new Map();
    (state.teams || []).forEach(team => teams.set(team.id, team));
    matches.forEach(match => {
      if (match.team1?.id) teams.set(match.team1.id, match.team1);
      if (match.team2?.id) teams.set(match.team2.id, match.team2);
    });

    const stats = new Map();
    teams.forEach((team, id) => stats.set(id, {
      team, games: 0, wins: 0, losses: 0,
      setsFor: 0, setsAgainst: 0, pointsFor: 0, pointsAgainst: 0,
      lastRound: -1, position: 0, label: ''
    }));

    matches.filter(match => match.status === 'FINALIZADO' && match.team1 && match.team2).forEach(match => {
      const first = stats.get(match.team1.id);
      const second = stats.get(match.team2.id);
      if (!first || !second) return;
      first.games++; second.games++;
      first.setsFor += Number(match.sets1 || 0); first.setsAgainst += Number(match.sets2 || 0);
      second.setsFor += Number(match.sets2 || 0); second.setsAgainst += Number(match.sets1 || 0);
      (match.scores || []).forEach(set => {
        const p1 = Number(set?.[0]);
        const p2 = Number(set?.[1]);
        if (Number.isFinite(p1)) { first.pointsFor += p1; second.pointsAgainst += p1; }
        if (Number.isFinite(p2)) { second.pointsFor += p2; first.pointsAgainst += p2; }
      });
      const matchWinner = winner(match);
      if (matchWinner?.id === first.team.id) { first.wins++; second.losses++; }
      else if (matchWinner?.id === second.team.id) { second.wins++; first.losses++; }
      first.lastRound = Math.max(first.lastRound, Number(match.roundIndex || 0));
      second.lastRound = Math.max(second.lastRound, Number(match.roundIndex || 0));
    });

    const final = matches.find(match => String(match.phase || '').toUpperCase() === 'FINAL');
    const third = matches.find(match => String(match.phase || '').toUpperCase() === 'DISPUTA DE 3º LUGAR');
    const champion = winner(final);
    const runnerUp = loser(final);
    const thirdPlace = winner(third);
    const fourthPlace = loser(third);

    [[champion,1,'CAMPEÃ'],[runnerUp,2,'VICE-CAMPEÃ'],[thirdPlace,3,'3º LUGAR'],[fourthPlace,4,'4º LUGAR']].forEach(([team, position, label]) => {
      const item = team && stats.get(team.id);
      if (item) { item.position = position; item.label = label; }
    });

    const remaining = [...stats.values()]
      .filter(item => !item.position)
      .sort((a, b) =>
        b.lastRound - a.lastRound ||
        b.wins - a.wins ||
        (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst) ||
        (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) ||
        teamName(a.team).localeCompare(teamName(b.team), 'pt-BR')
      );
    let nextPosition = 5;
    remaining.forEach(item => {
      item.position = nextPosition;
      item.label = `${nextPosition}º LUGAR`;
      nextPosition++;
    });

    return [...stats.values()].sort((a, b) => a.position - b.position);
  }

  function medal(position) {
    if (position === 1) return '🏆';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}º`;
  }

  function render(state) {
    const matches = (state.rounds || []).flatMap(round => round.matches || []);
    const final = matches.find(match => String(match.phase || '').toUpperCase() === 'FINAL');
    const third = matches.find(match => String(match.phase || '').toUpperCase() === 'DISPUTA DE 3º LUGAR');
    const finished = final?.status === 'FINALIZADO' && (!third || third.status === 'FINALIZADO');
    if (!finished) {
      section.hidden = true;
      return;
    }

    const ranking = buildRanking(state);
    section.hidden = false;
    if (statusTarget) statusTarget.textContent = `${ranking.length} duplas classificadas`;
    rowsTarget.innerHTML = ranking.map(item => `
      <article class="ranking-row ranking-position-${item.position}">
        <span class="ranking-position">${medal(item.position)}</span>
        <div class="ranking-team">
          <strong>${V.esc(teamName(item.team))}</strong>
          <small>${item.games} jogo${item.games === 1 ? '' : 's'} • ${item.wins} vitória${item.wins === 1 ? '' : 's'} • ${item.losses} derrota${item.losses === 1 ? '' : 's'} • Sets ${item.setsFor}–${item.setsAgainst}</small>
        </div>
        <span class="ranking-label">${V.esc(item.label)}</span>
      </article>`).join('');
  }

  async function refreshRanking() {
    try { render(await V.request('estado')); }
    catch (_) {}
  }

  refreshRanking();
  setInterval(refreshRanking, 10000);
})();
