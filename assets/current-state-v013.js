(() => {
  'use strict';
  const V = window.Volei;
  if (!V) return;

  const teams = {
    'E-001': { id:'E-001', member1Id:'A-003', member1:'Raquel', member1Pot:'A', member1Score:7, member1Index:8, member2Id:'B-002', member2:'Susany', member2Pot:'B', member2Score:3, member2Index:3, type:'MISTA', totalIndex:11 },
    'E-002': { id:'E-002', member1Id:'A-002', member1:'Guilherme', member1Pot:'A', member1Score:7, member1Index:8, member2Id:'B-003', member2:'Ana Luisa', member2Pot:'B', member2Score:8, member2Index:8, type:'MISTA', totalIndex:16 },
    'E-003': { id:'E-003', member1Id:'A-005', member1:'Vania', member1Pot:'A', member1Score:6, member1Index:8, member2Id:'B-001', member2:'Stefany', member2Pot:'B', member2Score:6, member2Index:8, type:'MISTA', totalIndex:16 },
    'E-004': { id:'E-004', member1Id:'A-004', member1:'Junior', member1Pot:'A', member1Score:8, member1Index:8, member2Id:'B-004', member2:'Emilly', member2Pot:'B', member2Score:9, member2Index:9, type:'MISTA', totalIndex:17 },
    'E-005': { id:'E-005', member1Id:'A-001', member1:'Fabio', member1Pot:'A', member1Score:5, member1Index:8, member2Id:'A-006', member2:'Luis', member2Pot:'A', member2Score:5, member2Index:5, type:'ADULTOS', totalIndex:13 }
  };

  const match = (game, phase, team1, team2, options = {}) => ({
    game,
    roundIndex: options.roundIndex || 0,
    phase,
    team1: team1 ? teams[team1] : null,
    team2: team2 ? teams[team2] : null,
    team1Placeholder: options.team1Placeholder || '',
    team2Placeholder: options.team2Placeholder || '',
    scores: [[null,null],[null,null],[null,null]],
    sets1: 0,
    sets2: 0,
    winnerId: options.winnerId || '',
    status: options.status || 'AGUARDANDO',
    finishedAt: '',
    availableAt: options.availableAt || '',
    nextGame: options.nextGame || 0,
    nextSlot: options.nextSlot || 0
  });

  const fallback = {
    version: 'V013_CONTINGENCIA_CHAVEAMENTO_ATUAL_2026-07-22',
    status: 'SORTEADO',
    message: 'Sorteio concluído. A primeira partida está liberada.',
    teams: Object.values(teams),
    rounds: [
      {
        index: 0,
        name: 'QUARTAS DE FINAL',
        matches: [
          match(1, 'QUARTAS DE FINAL', 'E-005', 'E-004', { status:'LIBERADO', availableAt:'2026-07-22T10:54:49-03:00', nextGame:5, nextSlot:1 }),
          match(2, 'QUARTAS DE FINAL', 'E-002', null, { status:'BYE', winnerId:'E-002', nextGame:5, nextSlot:2 }),
          match(3, 'QUARTAS DE FINAL', 'E-003', null, { status:'BYE', winnerId:'E-003', nextGame:6, nextSlot:1 }),
          match(4, 'QUARTAS DE FINAL', 'E-001', null, { status:'BYE', winnerId:'E-001', nextGame:6, nextSlot:2 })
        ]
      },
      {
        index: 1,
        name: 'SEMIFINAL',
        matches: [
          match(5, 'SEMIFINAL', null, 'E-002', { roundIndex:1, team1Placeholder:'Vencedor Jogo 1', nextGame:7, nextSlot:1 }),
          match(6, 'SEMIFINAL', 'E-003', 'E-001', { roundIndex:1, nextGame:7, nextSlot:2 })
        ]
      },
      {
        index: 2,
        name: 'DECISÕES',
        matches: [
          match(7, 'FINAL', null, null, { roundIndex:2, team1Placeholder:'Vencedor Jogo 5', team2Placeholder:'Vencedor Jogo 6' }),
          match(8, 'DISPUTA DE 3º LUGAR', null, null, { roundIndex:2, team1Placeholder:'Perdedor Jogo 5', team2Placeholder:'Perdedor Jogo 6' })
        ]
      }
    ],
    sorteioId: 'SOR-20260722105047-697',
    auditHash: 'A15823D8562403ADC81D563D7034CC98BDF3518CF35368A4CC3FC4150D05A5D4'
  };

  const originalRequest = V.request.bind(V);
  V.request = async (action, params = {}) => {
    const state = await originalRequest(action, params);
    if (action !== 'estado') return state;

    const hasBracket = Array.isArray(state?.rounds) && state.rounds.some(round => Array.isArray(round.matches) && round.matches.length);
    const staleCountdown = String(state?.status || '').toUpperCase() === 'EM_CONTAGEM' && state?.inicioPrevisto && new Date(state.inicioPrevisto).getTime() <= Date.now();

    if (hasBracket && !staleCountdown) return state;

    return V.normalizeState({
      ...state,
      ...fallback,
      players: Array.isArray(state?.players) ? state.players : [],
      schedule: state?.schedule || {},
      rules: state?.rules || {},
      registrationOpen: false,
      serverTime: new Date().toISOString()
    });
  };
})();
