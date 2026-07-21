(() => {
  'use strict';

  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  if (!B || !T) return;
  const C = B.C;

  function optionalPoint(value) {
    if (value === '' || value === undefined || value === null) return null;
    const point = Number(value);
    if (!Number.isInteger(point) || point < 0) {
      throw new Error('A pontuação deve usar números inteiros não negativos.');
    }
    return point;
  }

  function validateSet(team1, team2, target, setNumber) {
    team1 = optionalPoint(team1);
    team2 = optionalPoint(team2);
    if (team1 === null || team2 === null) {
      throw new Error(`Preencha a pontuação do ${setNumber}º set.`);
    }
    if (team1 === team2) throw new Error(`O ${setNumber}º set não pode terminar empatado.`);
    if (Math.max(team1, team2) < target || Math.abs(team1 - team2) < 2) {
      throw new Error(
        `Placar inválido no ${setNumber}º set. O vencedor precisa atingir ${target} pontos e abrir vantagem mínima de 2.`
      );
    }
    return team1 > team2 ? 1 : 2;
  }

  function validateScore(values) {
    const s1a = optionalPoint(values.s1a);
    const s1b = optionalPoint(values.s1b);
    const s2a = optionalPoint(values.s2a);
    const s2b = optionalPoint(values.s2b);
    const s3a = optionalPoint(values.s3a);
    const s3b = optionalPoint(values.s3b);

    const winner1 = validateSet(s1a, s1b, Number(C.NORMAL_SET_POINTS || 25), 1);
    const winner2 = validateSet(s2a, s2b, Number(C.NORMAL_SET_POINTS || 25), 2);

    let sets1 = Number(winner1 === 1) + Number(winner2 === 1);
    let sets2 = Number(winner1 === 2) + Number(winner2 === 2);

    if (sets1 === 1 && sets2 === 1) {
      const winner3 = validateSet(s3a, s3b, Number(C.TIEBREAK_SET_POINTS || 15), 3);
      if (winner3 === 1) sets1++;
      else sets2++;
    } else if ((s3a !== null && s3a !== 0) || (s3b !== null && s3b !== 0)) {
      throw new Error('O 3º set só deve ser preenchido quando a partida estiver empatada em 1 set a 1.');
    }

    return {
      scores: [[s1a, s1b], [s2a, s2b], [s3a, s3b]],
      sets1, sets2,
      winnerSide: sets1 === 2 ? 1 : 2
    };
  }

  function decodeScore(params) {
    if (!params.vencedorId && !params.payload) return params;
    const parts = String(params.vencedorId || params.payload).split('|');
    if (parts[0] !== 'PLACAR') return params;
    return {
      s1a: parts[1], s1b: parts[2], s2a: parts[3],
      s2b: parts[4], s3a: parts[5], s3b: parts[6]
    };
  }

  function matchPriority(match) {
    const phase = String(match.phase || '').toUpperCase();
    if (phase === T.THIRD_PLACE_PHASE) return -2;
    if (phase === 'FINAL') return -1;
    return Number(match.game);
  }

  function registerScore(params) {
    const state = B.readState();
    const all = state.rounds.flatMap(round => round.matches);
    const match = all.find(item => Number(item.game) === Number(params.jogo ?? params.game));

    if (!match) throw new Error('Jogo não encontrado.');
    if (!match.team1 || !match.team2) throw new Error('As duas equipes ainda não estão definidas.');
    if (match.status === 'FINALIZADO') throw new Error('Esta partida já foi finalizada.');

    const available = B.parseDate(match.availableAt);
    if (available && available.getTime() > Date.now()) {
      throw new Error(`Respeite o intervalo de ${C.MATCH_INTERVAL_MINUTES || 10} minutos entre partidas.`);
    }

    const result = validateScore(decodeScore(params));
    match.scores = result.scores;
    match.sets1 = result.sets1;
    match.sets2 = result.sets2;
    match.winnerId = result.winnerSide === 1 ? match.team1.id : match.team2.id;
    match.status = 'FINALIZADO';
    match.finishedAt = new Date().toISOString();
    T.advanceWinner(state.rounds, match);
    T.advanceLoserToThird(state.rounds, match);

    const next = all
      .filter(item => Number(item.game) !== Number(match.game))
      .filter(item => item.team1 && item.team2 && item.status === 'AGUARDANDO' && !item.availableAt)
      .sort((a, b) => matchPriority(a) - matchPriority(b))[0];

    if (next) {
      next.availableAt = new Date(
        Date.now() + Number(C.MATCH_INTERVAL_MINUTES || 10) * 60000
      ).toISOString();
    }

    const final = all.find(item => String(item.phase || '').toUpperCase() === 'FINAL');
    const thirdPlace = all.find(item => String(item.phase || '').toUpperCase() === T.THIRD_PLACE_PHASE);
    const competitionFinished = final?.status === 'FINALIZADO' && (!thirdPlace || thirdPlace.status === 'FINALIZADO');

    if (competitionFinished) {
      state.status = 'ENCERRADO';
      state.message = thirdPlace
        ? 'Competição encerrada. Campeão e terceiro lugar definidos.'
        : 'Competição encerrada.';
    } else {
      state.status = 'EM_ANDAMENTO';
      state.message = 'Competição em andamento.';
    }

    B.saveState(state);
    return {
      message: competitionFinished
        ? 'Placar registrado. Competição encerrada.'
        : `Placar registrado. Próxima partida liberada em ${C.MATCH_INTERVAL_MINUTES || 10} minutos.`,
      state
    };
  }

  window.VoleiScore = { validateScore, registerScore };
})();
