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
    scores: options.scores || [[null,null],[null,null],[null,null]],
    sets1: options.sets1 || 0,
    sets2: options.sets2 || 0,
    winnerId: options.winnerId || '',
    status: options.status || 'AGUARDANDO',
    startedAt: options.startedAt || '',
    finishedAt: options.finishedAt || '',
    availableAt: options.availableAt || '',
    nextGame: options.nextGame || 0,
    nextSlot: options.nextSlot || 0
  });

  const fallback = {
    version: 'V015_SETS_PONTOS_HORARIO_REAL_CHAVEAMENTO_7_2026-07-22',
    status: 'FINALIZADO',
    message: 'Competição encerrada. Classificação final definida.',
    rules: { bestOf:3, setsToWin:2, normalSetPoints:25, tiebreakSetPoints:15, minimumLead:2, matchIntervalMinutes:10 },
    teams: Object.values(teams),
    rounds: [
      {
        index: 0,
        name: 'FASE PRELIMINAR',
        matches: [
          match(1, 'FASE PRELIMINAR', 'E-005', 'E-004', { status:'FINALIZADO', winnerId:'E-004', sets1:0, sets2:2, scores:[[13,25],[20,25],[null,null]], finishedAt:'22/07/2026 11:56:05', nextGame:2, nextSlot:1 })
        ]
      },
      {
        index: 1,
        name: 'SEMIFINAL',
        matches: [
          match(2, 'SEMIFINAL', 'E-004', 'E-002', { roundIndex:1, status:'FINALIZADO', winnerId:'E-002', sets1:0, sets2:2, scores:[[14,25],[9,25],[null,null]], finishedAt:'22/07/2026 12:15:56', nextGame:4, nextSlot:1 }),
          match(3, 'SEMIFINAL', 'E-003', 'E-001', { roundIndex:1, status:'FINALIZADO', winnerId:'E-003', sets1:2, sets2:0, scores:[[25,18],[25,13],[null,null]], finishedAt:'22/07/2026 12:46:24', nextGame:4, nextSlot:2 })
        ]
      },
      {
        index: 2,
        name: 'DECISÕES',
        matches: [
          match(4, 'FINAL', 'E-002', 'E-003', { roundIndex:2, status:'FINALIZADO', winnerId:'E-002', sets1:2, sets2:0, scores:[[25,15],[25,18],[null,null]], finishedAt:'22/07/2026 14:41:40' }),
          match(5, 'DISPUTA DE 3º LUGAR', 'E-004', 'E-001', { roundIndex:2, status:'FINALIZADO', winnerId:'E-004', sets1:2, sets2:1, scores:[[20,25],[25,15],[15,10]], finishedAt:'22/07/2026 14:28:01' })
        ]
      }
    ],
    sorteioId: 'SOR-20260722105047-697',
    auditHash: 'A15823D8562403ADC81D563D7034CC98BDF3518CF35368A4CC3FC4150D05A5D4'
  };

  const originalRequest = V.request.bind(V);
  V.request = async (action, params = {}) => {
    try {
      const state = await originalRequest(action, params);
      if (action !== 'estado') return state;
      const hasBracket = Array.isArray(state?.rounds) && state.rounds.some(round => Array.isArray(round.matches) && round.matches.length);
      if (hasBracket) return state;
      return V.normalizeState({
        ...state,
        ...fallback,
        players: Array.isArray(state?.players) ? state.players : [],
        schedule: state?.schedule || {}, rules: state?.rules || fallback.rules, registrationOpen: false,
        serverTime: new Date().toISOString()
      });
    } catch (error) {
      if (action !== 'estado') throw error;
      return V.normalizeState({ ...fallback, players: [], schedule: {}, registrationOpen: false, serverTime: new Date().toISOString() });
    }
  };
})();
