(() => {
  'use strict';

  const B = window.VoleiBase;
  if (!B) return;

  const THIRD_PLACE_PHASE = 'DISPUTA DE 3º LUGAR';

  function balanceTeams(players) {
    const active = players.filter(player => String(player.active || 'SIM').toUpperCase() === 'SIM');
    const adults = active
      .filter(player => player.pot === 'A')
      .sort((a, b) => B.num(b.adjustedScore) - B.num(a.adjustedScore) || a.name.localeCompare(b.name, 'pt-BR'));
    const children = active
      .filter(player => player.pot === 'B')
      .sort((a, b) => B.num(a.adjustedScore) - B.num(b.adjustedScore) || a.name.localeCompare(b.name, 'pt-BR'));

    if (adults.length !== children.length) {
      throw new Error(`A quantidade precisa ser igual. Adultos: ${adults.length}; crianças: ${children.length}.`);
    }
    if (adults.length < 2) throw new Error('São necessários pelo menos dois adultos e duas crianças.');

    return adults.map((adult, index) => {
      const child = children[index];
      return {
        id: `E-${String(index + 1).padStart(3, '0')}`,
        adultId: adult.id,
        adult: adult.name,
        adultIndex: B.num(adult.adjustedScore),
        childId: child.id,
        child: child.name,
        childIndex: B.num(child.adjustedScore),
        totalIndex: B.num(adult.adjustedScore) + B.num(child.adjustedScore)
      };
    });
  }

  function hash32(text) {
    let hash = 2166136261;
    for (const char of String(text)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shuffle(items, seed) {
    let value = hash32(seed);
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

  function nextPowerOfTwo(value) {
    let result = 1;
    while (result < Math.max(2, value)) result *= 2;
    return result;
  }

  function phaseName(size, roundIndex, totalRounds) {
    const remaining = size / Math.pow(2, roundIndex + 1);
    if (roundIndex === totalRounds - 1) return 'FINAL';
    if (remaining === 2) return 'SEMIFINAL';
    if (remaining === 4) return 'QUARTAS DE FINAL';
    if (remaining === 8) return 'OITAVAS DE FINAL';
    return `RODADA ${roundIndex + 1}`;
  }

  function winnerTeam(match) {
    if (!match?.winnerId) return null;
    if (match.team1?.id === match.winnerId) return match.team1;
    if (match.team2?.id === match.winnerId) return match.team2;
    return null;
  }

  function loserTeam(match) {
    if (!match?.winnerId || !match?.team1 || !match?.team2) return null;
    if (match.team1.id === match.winnerId) return match.team2;
    if (match.team2.id === match.winnerId) return match.team1;
    return null;
  }

  function allMatches(rounds) {
    return rounds.flatMap(round => round.matches);
  }

  function advanceWinner(rounds, match) {
    if (!match.nextGame || !match.winnerId) return;
    const next = allMatches(rounds)
      .find(item => Number(item.game) === Number(match.nextGame));
    const team = winnerTeam(match);
    if (!next || !team) return;
    if (Number(match.nextSlot) === 1) next.team1 = team;
    else next.team2 = team;
  }

  function advanceLoserToThird(rounds, match) {
    if (String(match?.phase || '').toUpperCase() !== 'SEMIFINAL') return;
    const thirdPlace = allMatches(rounds)
      .find(item => String(item.phase || '').toUpperCase() === THIRD_PLACE_PHASE);
    const loser = loserTeam(match);
    if (!thirdPlace || !loser) return;

    const semifinals = allMatches(rounds)
      .filter(item => String(item.phase || '').toUpperCase() === 'SEMIFINAL')
      .sort((a, b) => Number(a.game) - Number(b.game));
    const semifinalIndex = semifinals.findIndex(item => Number(item.game) === Number(match.game));
    if (semifinalIndex === 0) thirdPlace.team1 = loser;
    if (semifinalIndex === 1) thirdPlace.team2 = loser;
  }

  function createInitialSlots(teams, size, seed) {
    const matchCount = size / 2;
    const byeCount = size - teams.length;
    const pairingTypes = shuffle([
      ...Array(byeCount).fill('BYE'),
      ...Array(matchCount - byeCount).fill('MATCH')
    ], `${seed}|TIPOS_DE_CONFRONTO`);

    const slots = [];
    let teamIndex = 0;

    pairingTypes.forEach((type, matchIndex) => {
      if (type === 'BYE') {
        const team = teams[teamIndex++];
        const teamOnLeft = hash32(`${seed}|LADO_BYE|${matchIndex}`) % 2 === 0;
        slots.push(teamOnLeft ? team : null, teamOnLeft ? null : team);
        return;
      }

      slots.push(teams[teamIndex++] || null, teams[teamIndex++] || null);
    });

    return slots;
  }

  function buildBracket(teams, seed) {
    const shuffled = shuffle(teams, seed);
    const size = nextPowerOfTwo(shuffled.length);
    const totalRounds = Math.log2(size);
    const slots = createInitialSlots(shuffled, size, seed);

    const rounds = [];
    let game = 1;
    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
      const matches = [];
      const matchCount = size / Math.pow(2, roundIndex + 1);
      for (let index = 0; index < matchCount; index++) {
        matches.push(B.normalizeMatch({
          game: game++, roundIndex,
          phase: phaseName(size, roundIndex, totalRounds),
          team1: null, team2: null,
          team1Placeholder: '', team2Placeholder: '',
          winnerId: '', status: 'AGUARDANDO',
          nextGame: 0, nextSlot: 0
        }));
      }
      rounds.push({ index: roundIndex, name: phaseName(size, roundIndex, totalRounds), matches });
    }

    rounds[0].matches.forEach((match, index) => {
      match.team1 = slots[index * 2];
      match.team2 = slots[index * 2 + 1];
      if (match.team1 && !match.team2) {
        match.winnerId = match.team1.id;
        match.status = 'BYE';
      } else if (!match.team1 && match.team2) {
        match.winnerId = match.team2.id;
        match.status = 'BYE';
      }
    });

    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      rounds[roundIndex].matches.forEach((match, index) => {
        const next = rounds[roundIndex + 1].matches[Math.floor(index / 2)];
        match.nextGame = next.game;
        match.nextSlot = index % 2 === 0 ? 1 : 2;
        if (match.winnerId) advanceWinner(rounds, match);
      });
    }

    for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
      rounds[roundIndex].matches.forEach((match, index) => {
        if (!match.team1) match.team1Placeholder = `Vencedor Jogo ${rounds[roundIndex - 1].matches[index * 2].game}`;
        if (!match.team2) match.team2Placeholder = `Vencedor Jogo ${rounds[roundIndex - 1].matches[index * 2 + 1].game}`;
      });
    }

    if (shuffled.length >= 4 && totalRounds >= 2) {
      const semifinals = rounds[totalRounds - 2].matches;
      const finalRound = rounds[totalRounds - 1];
      finalRound.name = 'DECISÕES';
      finalRound.matches.push(B.normalizeMatch({
        game: game++,
        roundIndex: totalRounds - 1,
        phase: THIRD_PLACE_PHASE,
        team1: null,
        team2: null,
        team1Placeholder: `Perdedor Jogo ${semifinals[0].game}`,
        team2Placeholder: `Perdedor Jogo ${semifinals[1].game}`,
        winnerId: '',
        status: 'AGUARDANDO',
        nextGame: 0,
        nextSlot: 0
      }));
    }

    const firstPlayable = allMatches(rounds)
      .find(match => match.team1 && match.team2 && match.status === 'AGUARDANDO');
    if (firstPlayable) {
      firstPlayable.availableAt = new Date().toISOString();
      firstPlayable.status = 'LIBERADO';
    }
    return rounds;
  }

  function runDraw() {
    const state = B.readState();
    const teams = balanceTeams(state.players);
    const seed = `${Date.now()}-${Math.random()}`;
    state.teams = teams;
    state.rounds = buildBracket(teams, seed);
    state.status = 'SORTEADO';
    state.message = teams.length >= 4
      ? 'Equipes sorteadas. Haverá final e disputa de 3º lugar.'
      : 'Equipes sorteadas e chaveamento disponível.';
    state.auditHash = hash32(JSON.stringify({ teams, rounds: state.rounds, seed }))
      .toString(16).toUpperCase();
    B.saveState(state);
    return { message: 'Sorteio realizado.', state };
  }

  window.VoleiTournament = {
    THIRD_PLACE_PHASE,
    balanceTeams,
    hash32,
    winnerTeam,
    loserTeam,
    advanceWinner,
    advanceLoserToThird,
    buildBracket,
    runDraw
  };
})();
