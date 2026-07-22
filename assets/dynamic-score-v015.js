(() => {
  'use strict';
  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  const S = window.VoleiScore;
  if (!B || !T || !S) return;

  function normalizedRules(source = {}) {
    const bestOfRaw = Number(source.bestOf ?? source.melhorDe ?? B.C.BEST_OF_SETS ?? 3);
    const bestOf = [1, 3, 5].includes(bestOfRaw) ? bestOfRaw : 3;
    return {
      bestOf,
      setsToWin: Math.floor(bestOf / 2) + 1,
      normalSetPoints: Math.max(1, Number(source.normalSetPoints ?? source.pontosSetNormal ?? B.C.NORMAL_SET_POINTS ?? 25)),
      tiebreakSetPoints: Math.max(1, Number(source.tiebreakSetPoints ?? source.pontosSetDesempate ?? B.C.TIEBREAK_SET_POINTS ?? 15)),
      minimumLead: Math.max(1, Number(source.minimumLead ?? source.vantagemMinima ?? B.C.MINIMUM_LEAD ?? 2)),
      matchIntervalMinutes: Math.max(0, Number(source.matchIntervalMinutes ?? B.C.MATCH_INTERVAL_MINUTES ?? 10))
    };
  }

  function point(value) {
    if (value === '' || value === undefined || value === null) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error('A pontuação deve usar números inteiros não negativos.');
    return parsed;
  }

  function validateSet(a, b, target, lead, number) {
    a = point(a); b = point(b);
    if (a === null || b === null) throw new Error(`Preencha a pontuação do ${number}º set.`);
    if (a === b) throw new Error(`O ${number}º set não pode terminar empatado.`);
    if (Math.max(a, b) < target || Math.abs(a - b) < lead) {
      throw new Error(`Placar inválido no ${number}º set. O vencedor precisa atingir ${target} pontos e abrir vantagem mínima de ${lead}.`);
    }
    return { a, b, winner: a > b ? 1 : 2 };
  }

  function scoresFromValues(values = {}) {
    if (Array.isArray(values.scores)) return values.scores;
    return [
      [values.s1a, values.s1b],
      [values.s2a, values.s2b],
      [values.s3a, values.s3b],
      [values.s4a, values.s4b],
      [values.s5a, values.s5b]
    ];
  }

  function validateScore(values = {}, rulesSource = {}) {
    const rules = normalizedRules(rulesSource.bestOf ? rulesSource : (B.readState().rules || rulesSource));
    const supplied = scoresFromValues(values);
    const scores = [];
    let sets1 = 0;
    let sets2 = 0;

    for (let index = 0; index < rules.bestOf; index++) {
      const raw = supplied[index] || [null, null];
      const a = point(raw[0]);
      const b = point(raw[1]);
      const finished = sets1 >= rules.setsToWin || sets2 >= rules.setsToWin;
      if (finished) {
        if ((a !== null && a !== 0) || (b !== null && b !== 0)) throw new Error(`O ${index + 1}º set não deve ser preenchido porque a partida já terminou.`);
        scores.push([null, null]);
        continue;
      }
      const target = rules.bestOf > 1 && index === rules.bestOf - 1 ? rules.tiebreakSetPoints : rules.normalSetPoints;
      const set = validateSet(a, b, target, rules.minimumLead, index + 1);
      scores.push([set.a, set.b]);
      if (set.winner === 1) sets1++; else sets2++;
    }

    if (sets1 < rules.setsToWin && sets2 < rules.setsToWin) throw new Error(`A partida exige ${rules.setsToWin} sets vencidos para definir a dupla vencedora.`);
    return { scores, sets1, sets2, winnerSide: sets1 > sets2 ? 1 : 2, rules };
  }

  function decode(params = {}) {
    const payload = String(params.payload ?? params.vencedorId ?? '').trim();
    if (payload.startsWith('{')) {
      try { return JSON.parse(payload); } catch (_) { throw new Error('O placar enviado é inválido.'); }
    }
    if (payload.startsWith('PLACAR|')) {
      const p = payload.split('|');
      return { scores: [[p[1], p[2]], [p[3], p[4]], [p[5], p[6]]] };
    }
    return params;
  }

  function registerScore(params) {
    const state = B.readState();
    const all = state.rounds.flatMap(round => round.matches);
    const match = all.find(item => Number(item.game) === Number(params.jogo ?? params.game));
    if (!match) throw new Error('Jogo não encontrado.');
    if (!match.team1 || !match.team2) throw new Error('As duas equipes ainda não estão definidas.');
    if (match.status === 'FINALIZADO') throw new Error('Esta partida já foi finalizada.');
    const available = B.parseDate(match.availableAt);
    if (available && available.getTime() > Date.now()) throw new Error(`Respeite o intervalo de ${normalizedRules(state.rules).matchIntervalMinutes} minutos entre partidas.`);

    const now = new Date().toISOString();
    const result = validateScore(decode(params), state.rules || {});
    match.startedAt = match.startedAt || now;
    match.scores = result.scores;
    match.sets1 = result.sets1;
    match.sets2 = result.sets2;
    match.winnerId = result.winnerSide === 1 ? match.team1.id : match.team2.id;
    match.status = 'FINALIZADO';
    match.finishedAt = now;
    T.advanceWinner(state.rounds, match);
    T.advanceLoserToThird(state.rounds, match);

    const next = all.filter(item => Number(item.game) !== Number(match.game))
      .filter(item => item.team1 && item.team2 && item.status === 'AGUARDANDO' && !item.availableAt)
      .sort((a, b) => Number(a.roundIndex) - Number(b.roundIndex) || Number(a.game) - Number(b.game))[0];
    if (next) next.availableAt = new Date(Date.now() + result.rules.matchIntervalMinutes * 60000).toISOString();

    const final = all.find(item => String(item.phase || '').toUpperCase() === 'FINAL');
    const third = all.find(item => String(item.phase || '').toUpperCase() === T.THIRD_PLACE_PHASE);
    const finished = final?.status === 'FINALIZADO' && (!third || third.status === 'FINALIZADO');
    state.status = finished ? 'ENCERRADO' : 'EM_ANDAMENTO';
    state.message = finished ? 'Competição encerrada. Campeão e terceiro lugar definidos.' : 'Competição em andamento.';
    B.saveState(state);
    return { message: finished ? 'Placar registrado. Competição encerrada.' : `Placar registrado. Próxima partida liberada em ${result.rules.matchIntervalMinutes} minutos.`, state };
  }

  S.normalizedRules = normalizedRules;
  S.validateScore = validateScore;
  S.registerScore = registerScore;
})();
