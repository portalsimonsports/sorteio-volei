(() => {
  'use strict';
  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  if (!B || !T) return;

  const THIRD = T.THIRD_PLACE_PHASE || 'DISPUTA DE 3º LUGAR';

  function shuffle(items, seed) {
    let value = T.hash32(seed);
    const list = [...items];
    const random = () => {
      value = value + 0x6D2B79F5 | 0;
      let result = Math.imul(value ^ value >>> 15, 1 | value);
      result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
    for (let index = list.length - 1; index > 0; index--) {
      const selected = Math.floor(random() * (index + 1));
      [list[index], list[selected]] = [list[selected], list[index]];
    }
    return list;
  }

  function lowerPowerOfTwo(value) {
    let result = 1;
    while (result * 2 <= value) result *= 2;
    return Math.max(2, result);
  }

  function phaseForCount(teamCount) {
    if (teamCount === 2) return 'FINAL';
    if (teamCount === 4) return 'SEMIFINAL';
    if (teamCount === 8) return 'QUARTAS DE FINAL';
    if (teamCount === 16) return 'OITAVAS DE FINAL';
    return `FASE DE ${teamCount}`;
  }

  function createMatch(game, roundIndex, phase) {
    return B.normalizeMatch({
      game, roundIndex, phase,
      team1: null, team2: null,
      team1Placeholder: '', team2Placeholder: '',
      winnerId: '', status: 'AGUARDANDO',
      finishedAt: '', availableAt: '', nextGame: 0, nextSlot: 0
    });
  }

  function allMatches(rounds) {
    return rounds.flatMap(round => round.matches);
  }

  function setSlot(match, slot, entrant) {
    const teamKey = slot === 1 ? 'team1' : 'team2';
    const placeholderKey = slot === 1 ? 'team1Placeholder' : 'team2Placeholder';
    if (entrant.team) {
      match[teamKey] = entrant.team;
      return;
    }
    match[placeholderKey] = `Vencedor Jogo ${entrant.source.game}`;
    entrant.source.nextGame = match.game;
    entrant.source.nextSlot = slot;
  }

  function buildMainRounds(base, startIndex, startGame) {
    const rounds = [];
    let teamCount = base;
    let game = startGame;
    let roundIndex = startIndex;
    while (teamCount >= 2) {
      const phase = phaseForCount(teamCount);
      const matches = [];
      for (let index = 0; index < teamCount / 2; index++) {
        matches.push(createMatch(game++, roundIndex, phase));
      }
      rounds.push({ index: roundIndex, name: phase, matches });
      teamCount /= 2;
      roundIndex++;
    }
    return { rounds, nextGame: game };
  }

  function linkFollowingRounds(rounds, startRoundIndex) {
    for (let round = startRoundIndex; round < rounds.length - 1; round++) {
      rounds[round].matches.forEach((match, index) => {
        const next = rounds[round + 1].matches[Math.floor(index / 2)];
        match.nextGame = next.game;
        match.nextSlot = index % 2 === 0 ? 1 : 2;
        if (!next.team1 && index % 2 === 0) next.team1Placeholder = `Vencedor Jogo ${match.game}`;
        if (!next.team2 && index % 2 === 1) next.team2Placeholder = `Vencedor Jogo ${match.game}`;
      });
    }
  }

  function compactBuildBracket(teams, seed) {
    const shuffled = shuffle(teams, seed);
    if (shuffled.length < 2) throw new Error('São necessárias pelo menos duas duplas.');

    const base = lowerPowerOfTwo(shuffled.length);
    const preliminaryCount = shuffled.length - base;
    const preliminaryTeamCount = preliminaryCount * 2;
    const directTeams = shuffled.slice(preliminaryTeamCount);
    const preliminaryTeams = shuffled.slice(0, preliminaryTeamCount);
    const rounds = [];
    let game = 1;

    let preliminaryRound = null;
    if (preliminaryCount > 0) {
      preliminaryRound = { index: 0, name: preliminaryCount === 1 ? 'FASE PRELIMINAR' : 'FASE PRELIMINAR', matches: [] };
      for (let index = 0; index < preliminaryCount; index++) {
        const match = createMatch(game++, 0, 'FASE PRELIMINAR');
        match.team1 = preliminaryTeams[index * 2];
        match.team2 = preliminaryTeams[index * 2 + 1];
        preliminaryRound.matches.push(match);
      }
      rounds.push(preliminaryRound);
    }

    const main = buildMainRounds(base, preliminaryCount > 0 ? 1 : 0, game);
    rounds.push(...main.rounds);
    game = main.nextGame;

    const firstMainRound = main.rounds[0];
    if (preliminaryCount > 0) {
      const entrants = shuffle([
        ...directTeams.map(team => ({ team })),
        ...preliminaryRound.matches.map(source => ({ source }))
      ], `${seed}|ENTRANTES_PRINCIPAIS`);
      firstMainRound.matches.forEach((match, index) => {
        setSlot(match, 1, entrants[index * 2]);
        setSlot(match, 2, entrants[index * 2 + 1]);
      });
      linkFollowingRounds(rounds, 1);
    } else {
      firstMainRound.matches.forEach((match, index) => {
        match.team1 = shuffled[index * 2];
        match.team2 = shuffled[index * 2 + 1];
      });
      linkFollowingRounds(rounds, 0);
    }

    const semifinalRound = rounds.find(round => round.matches.some(match => String(match.phase).toUpperCase() === 'SEMIFINAL'));
    const finalRound = rounds.find(round => round.matches.some(match => String(match.phase).toUpperCase() === 'FINAL'));
    if (semifinalRound?.matches.length === 2 && finalRound) {
      finalRound.name = 'DECISÕES';
      finalRound.matches.push(B.normalizeMatch({
        game: game++, roundIndex: finalRound.index, phase: THIRD,
        team1: null, team2: null,
        team1Placeholder: `Perdedor Jogo ${semifinalRound.matches[0].game}`,
        team2Placeholder: `Perdedor Jogo ${semifinalRound.matches[1].game}`,
        winnerId: '', status: 'AGUARDANDO', finishedAt: '', availableAt: '', nextGame: 0, nextSlot: 0
      }));
    }

    const firstPlayable = allMatches(rounds)
      .filter(match => match.team1 && match.team2 && match.status === 'AGUARDANDO')
      .sort((a, b) => Number(a.roundIndex) - Number(b.roundIndex) || Number(a.game) - Number(b.game))[0];
    if (firstPlayable) {
      firstPlayable.availableAt = new Date().toISOString();
      firstPlayable.status = 'LIBERADO';
    }
    return rounds;
  }

  function compactRunDraw() {
    const state = B.readState();
    const teams = T.balanceTeams(state.players);
    const seed = `${Date.now()}-${Math.random()}`;
    state.teams = teams;
    state.rounds = compactBuildBracket(teams, seed);
    state.status = 'SORTEADO';
    state.message = 'Duplas formadas. Chaveamento disponível.';
    state.auditHash = T.hash32(JSON.stringify({ teams, rounds: state.rounds, seed })).toString(16).toUpperCase();
    B.saveState(state);
    return { message: 'Sorteio realizado.', state };
  }

  T.buildBracket = compactBuildBracket;
  T.runDraw = compactRunDraw;
})();
