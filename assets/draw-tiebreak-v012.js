(() => {
  'use strict';

  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  if (!B || !T) return;

  function teamFromMembers(member1, member2, index) {
    const type = member1.pot === member2.pot
      ? (member1.pot === 'A' ? 'ADULTOS' : 'CRIANCAS')
      : 'MISTA';

    return B.normalizeTeam({
      id: `E-${String(index + 1).padStart(3, '0')}`,
      member1Id: member1.id,
      member1: member1.name,
      member1Pot: member1.pot,
      member1Score: B.num(member1.score),
      member1Index: B.num(member1.adjustedScore),
      member2Id: member2.id,
      member2: member2.name,
      member2Pot: member2.pot,
      member2Score: B.num(member2.score),
      member2Index: B.num(member2.adjustedScore),
      type,
      totalIndex: B.num(member1.adjustedScore) + B.num(member2.adjustedScore)
    });
  }

  function pairExtremes(list, teams) {
    const remaining = [...list].sort((a, b) =>
      B.num(a.adjustedScore) - B.num(b.adjustedScore) ||
      Number(a.age || 0) - Number(b.age || 0) ||
      a.name.localeCompare(b.name, 'pt-BR')
    );

    while (remaining.length >= 2) {
      const lower = remaining.shift();
      const higher = remaining.pop();
      teams.push(teamFromMembers(higher, lower, teams.length));
    }
  }

  function balanceTeams(players) {
    const active = players.filter(player => String(player.active || 'SIM').toUpperCase() === 'SIM');
    if (active.length < 4) throw new Error('São necessários pelo menos quatro participantes ativos.');
    if (active.length % 2 !== 0) throw new Error('A quantidade total de participantes precisa ser par para formar todas as duplas.');

    const adults = active.filter(player => player.pot === 'A').sort((a, b) =>
      B.num(b.adjustedScore) - B.num(a.adjustedScore) ||
      Number(a.age || 0) - Number(b.age || 0) ||
      a.name.localeCompare(b.name, 'pt-BR')
    );

    const children = active.filter(player => player.pot === 'B').sort((a, b) =>
      B.num(a.adjustedScore) - B.num(b.adjustedScore) ||
      a.name.localeCompare(b.name, 'pt-BR')
    );

    const mixedCount = Math.min(adults.length, children.length);
    const teams = [];

    for (let index = 0; index < mixedCount; index++) {
      teams.push(teamFromMembers(adults[index], children[index], teams.length));
    }

    pairExtremes(adults.slice(mixedCount), teams);
    pairExtremes(children.slice(mixedCount), teams);
    return teams;
  }

  function runDraw() {
    const state = B.readState();
    const teams = balanceTeams(state.players);
    const seed = `${Date.now()}-${Math.random()}`;

    state.teams = teams;
    state.rounds = T.buildBracket(teams, seed);
    state.status = 'SORTEADO';
    state.message = teams.length >= 4
      ? 'Duplas formadas. Haverá final e disputa de 3º lugar.'
      : 'Duplas formadas e chaveamento disponível.';
    state.auditHash = T.hash32(JSON.stringify({ teams, rounds: state.rounds, seed })).toString(16).toUpperCase();
    B.saveState(state);
    return { message: 'Sorteio realizado.', state };
  }

  T.balanceTeams = balanceTeams;
  T.runDraw = runDraw;
})();
