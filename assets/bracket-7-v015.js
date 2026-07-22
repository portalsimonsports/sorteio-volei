(() => {
  'use strict';
  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  if (!B || !T?.buildBracket) return;

  const compactBuild = T.buildBracket;

  function buildBracket(teams, seed) {
    const rounds = compactBuild(teams, seed);
    if (teams.length === 7 && rounds[0]) {
      rounds[0].name = 'QUARTAS DE FINAL';
      rounds[0].matches.forEach(match => { match.phase = 'QUARTAS DE FINAL'; });
      const semifinals = rounds.find(round => round.matches.some(match => String(match.phase || '').toUpperCase() === 'SEMIFINAL'));
      semifinals?.matches.forEach(match => {
        if ((match.team1 && !match.team2 && match.team2Placeholder) || (match.team2 && !match.team1 && match.team1Placeholder)) {
          match.directAdvance = true;
        }
      });
    }
    return rounds;
  }

  function runDraw() {
    const state = B.readState();
    const teams = T.balanceTeams(state.players);
    const seed = `${Date.now()}-${Math.random()}`;
    state.teams = teams;
    state.rounds = buildBracket(teams, seed);
    state.status = 'SORTEADO';
    state.message = teams.length === 7
      ? 'Duplas formadas: três quartas de final e uma classificação direta para a semifinal.'
      : 'Duplas formadas. Chaveamento disponível.';
    state.auditHash = T.hash32(JSON.stringify({ teams, rounds: state.rounds, seed })).toString(16).toUpperCase();
    B.saveState(state);
    return { message: 'Sorteio realizado.', state };
  }

  T.buildBracket = buildBracket;
  T.runDraw = runDraw;
})();
