(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;

  const V = window.Volei;
  const section = document.getElementById('classificacao');
  const rowsTarget = document.getElementById('finalRankingRows');
  const statusTarget = document.getElementById('rankingStatus');
  if (!section || !rowsTarget) return;

  let expandedTeamId = '';
  let lastState = null;

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

  function scoreText(match) {
    const sets = (match.scores || [])
      .filter(set => set?.[0] !== null && set?.[0] !== '' && set?.[1] !== null && set?.[1] !== '')
      .map(set => `${set[0]}–${set[1]}`);
    return sets.length ? sets.join(' | ') : 'Placar não informado';
  }

  function timeText(match) {
    const start = match.startedAt ? V.dateTime(match.startedAt, true) : '';
    const finish = match.finishedAt ? V.dateTime(match.finishedAt, true) : '';
    if (start && finish) return `Início ${start} • Término ${finish}`;
    if (finish) return `Resultado registrado em ${finish}`;
    if (start) return `Iniciada em ${start}`;
    return '';
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
      lastRound: -1, position: 0, label: '', matches: []
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
      first.matches.push(match);
      second.matches.push(match);
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

  function matchDetails(item) {
    return item.matches
      .sort((a, b) => Number(a.game) - Number(b.game))
      .map(match => {
        const isTeam1 = match.team1?.id === item.team.id;
        const opponent = isTeam1 ? match.team2 : match.team1;
        const won = match.winnerId === item.team.id;
        const exactTime = timeText(match);
        return `
          <article class="ranking-match ${won ? 'ranking-match-win' : 'ranking-match-loss'}">
            <div class="ranking-match-head">
              <strong>Jogo ${match.game} — ${V.esc(match.phase || 'PARTIDA')}</strong>
              <span>${won ? 'VITÓRIA' : 'DERROTA'}</span>
            </div>
            <div class="ranking-match-opponent">Contra ${V.esc(teamName(opponent))}</div>
            <div class="ranking-match-score">${V.esc(scoreText(match))} • Sets ${match.sets1}–${match.sets2}</div>
            ${exactTime ? `<small>${V.esc(exactTime)}</small>` : ''}
          </article>`;
      }).join('');
  }

  function render(state) {
    lastState = state;
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
    rowsTarget.innerHTML = ranking.map(item => {
      const expanded = expandedTeamId === item.team.id;
      return `
        <article class="ranking-row ranking-position-${item.position} ${expanded ? 'ranking-expanded' : ''}" data-team-id="${V.esc(item.team.id)}">
          <button class="ranking-summary" type="button" aria-expanded="${expanded}" aria-controls="ranking-games-${V.esc(item.team.id)}">
            <span class="ranking-position">${medal(item.position)}</span>
            <span class="ranking-team">
              <strong>${V.esc(teamName(item.team))}</strong>
              <small>${item.games} jogo${item.games === 1 ? '' : 's'} • ${item.wins} vitória${item.wins === 1 ? '' : 's'} • ${item.losses} derrota${item.losses === 1 ? '' : 's'} • Sets ${item.setsFor}–${item.setsAgainst}</small>
            </span>
            <span class="ranking-label">${V.esc(item.label)}</span>
            <span class="ranking-toggle">${expanded ? 'Ocultar jogos' : 'Ver jogos'} <b>${expanded ? '−' : '+'}</b></span>
          </button>
          <div class="ranking-games" id="ranking-games-${V.esc(item.team.id)}" ${expanded ? '' : 'hidden'}>
            ${matchDetails(item) || '<p>Nenhuma partida registrada.</p>'}
          </div>
        </article>`;
    }).join('');
  }

  rowsTarget.addEventListener('click', event => {
    const button = event.target.closest('.ranking-summary');
    if (!button) return;
    const row = button.closest('[data-team-id]');
    const teamId = row?.dataset.teamId || '';
    expandedTeamId = expandedTeamId === teamId ? '' : teamId;
    if (lastState) render(lastState);
  });

  async function refreshRanking() {
    try { render(await V.request('estado')); }
    catch (_) {}
  }

  refreshRanking();
  setInterval(refreshRanking, 10000);
})();
