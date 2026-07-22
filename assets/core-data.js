(() => {
  'use strict';

  const C = window.VOLEI_CONFIG || {};
  const KEY = 'sorteio_volei_independente_v10';
  const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function num(value) {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmt(value) {
    return num(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
      .split(' ').map((word, index) => {
        if (index > 0 && CONNECTORS.has(word)) return word;
        return word ? word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1) : '';
      }).join(' ');
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const text = String(value).trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
    match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return new Date(+match[3], +match[2] - 1, +match[1]);
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateInput(value) {
    const date = parseDate(value);
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function age(value, reference = new Date()) {
    const direct = Number(value);
    if (Number.isInteger(direct) && direct >= 0 && direct <= 120) return direct;
    const birth = parseDate(value);
    if (!birth) return -1;
    let result = reference.getFullYear() - birth.getFullYear();
    if (
      reference.getMonth() < birth.getMonth() ||
      (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())
    ) result--;
    return result;
  }

  function syntheticBirthDate(playerAge, reference = new Date()) {
    return `${reference.getFullYear() - Number(playerAge)}-01-01`;
  }

  function category(value) {
    return value >= 18
      ? { pot: 'A', code: 'ADULTO', label: 'Adulto' }
      : { pot: 'B', code: 'CRIANCA', label: 'Criança' };
  }

  function adjustedIndex(value) {
    const score = num(value);
    if (score === 5) return 7.5;
    if (score === 4) return 6.8;
    if (score === 3) return 6;
    if (score === 2 || score === 1 || score === 0) return 8;
    return score;
  }

  function validatePlayer(params) {
    const name = normalizeName(params.name ?? params.nome);
    let playerAge = Number(params.age ?? params.idade);
    if (!Number.isInteger(playerAge)) playerAge = age(params.birthDate ?? params.dataNascimento);
    const score = num(params.score ?? params.nota);
    const playerCategory = category(playerAge);
    const active = String(params.active ?? params.ativo ?? 'SIM').toUpperCase();

    if (name.length < 2) throw new Error('Informe o nome do participante.');
    if (!Number.isInteger(playerAge) || playerAge < 1 || playerAge > 100) {
      throw new Error('Informe uma idade válida entre 1 e 100 anos.');
    }
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      throw new Error('A nota de desempenho deve ser um número inteiro de 0 a 10.');
    }
    if (playerCategory.pot === 'A' && score < 5) {
      throw new Error('Para adultos, a nota mínima de desempenho é 5.');
    }
    if (!['SIM', 'NAO'].includes(active)) throw new Error('O campo ativo deve ser SIM ou NAO.');

    return {
      name,
      age: playerAge,
      birthDate: syntheticBirthDate(playerAge),
      pot: playerCategory.pot,
      category: playerCategory.code,
      categoryLabel: playerCategory.label,
      score,
      adjustedScore: adjustedIndex(score),
      active
    };
  }

  function initialState() {
    return {
      version: C.VERSION || 'V010',
      title: C.APP_NAME || 'Sorteio de Duplas de Vôlei',
      status: 'INSCRICOES',
      message: 'Inscrições abertas.',
      serverTime: new Date().toISOString(),
      players: [], teams: [], rounds: [], auditHash: ''
    };
  }

  function inferredPot(id, fallback = '') {
    const text = String(id || '').toUpperCase();
    if (text.startsWith('A-')) return 'A';
    if (text.startsWith('B-')) return 'B';
    return fallback;
  }

  function normalizeTeam(team) {
    if (!team) return null;
    const member1Id = team.member1Id ?? team.jogador1Id ?? team.adultId ?? team.adultoId ?? '';
    const member2Id = team.member2Id ?? team.jogador2Id ?? team.childId ?? team.criancaId ?? '';
    const member1 = team.member1 ?? team.jogador1 ?? team.adult ?? team.adulto ?? '';
    const member2 = team.member2 ?? team.jogador2 ?? team.child ?? team.crianca ?? '';
    const member1Pot = team.member1Pot ?? team.pote1 ?? inferredPot(member1Id, 'A');
    const member2Pot = team.member2Pot ?? team.pote2 ?? inferredPot(member2Id, 'B');
    const member1Index = num(team.member1Index ?? team.indice1 ?? team.adultIndex ?? team.indiceAdulto);
    const member2Index = num(team.member2Index ?? team.indice2 ?? team.childIndex ?? team.indiceCrianca);
    return {
      id: team.id,
      member1Id, member1, member1Pot,
      member1Score: num(team.member1Score ?? team.nota1 ?? team.adultScore),
      member1Index,
      member2Id, member2, member2Pot,
      member2Score: num(team.member2Score ?? team.nota2 ?? team.childScore),
      member2Index,
      type: team.type ?? team.tipo ?? (member1Pot === member2Pot ? (member1Pot === 'A' ? 'ADULTOS' : 'CRIANCAS') : 'MISTA'),
      totalIndex: num(team.totalIndex ?? team.indiceTotal ?? member1Index + member2Index),
      adultId: member1Pot === 'A' ? member1Id : (member2Pot === 'A' ? member2Id : ''),
      adult: member1Pot === 'A' ? member1 : (member2Pot === 'A' ? member2 : ''),
      childId: member1Pot === 'B' ? member1Id : (member2Pot === 'B' ? member2Id : ''),
      child: member1Pot === 'B' ? member1 : (member2Pot === 'B' ? member2 : '')
    };
  }

  function normalizeMatch(match) {
    match.team1 = normalizeTeam(match.team1);
    match.team2 = normalizeTeam(match.team2);
    match.scores = Array.isArray(match.scores) ? match.scores : [[null, null], [null, null], [null, null]];
    while (match.scores.length < 3) match.scores.push([null, null]);
    match.sets1 = Number(match.sets1 || 0);
    match.sets2 = Number(match.sets2 || 0);
    match.status = String(match.status || 'AGUARDANDO').toUpperCase();
    match.winnerId = match.winnerId || '';
    match.finishedAt = match.finishedAt || '';
    match.availableAt = match.availableAt || '';
    return match;
  }

  function normalizeState(state) {
    state.version = state.version || C.VERSION || 'V010';
    state.title = state.title || C.APP_NAME || 'Sorteio de Duplas de Vôlei';
    state.status = state.status || 'INSCRICOES';
    state.message = state.message || 'Inscrições abertas.';
    state.players = (Array.isArray(state.players) ? state.players : (state.jogadores || [])).map(player => ({
      ...player,
      name: player.name ?? player.nome ?? '',
      age: Number.isInteger(Number(player.age ?? player.idade)) ? Number(player.age ?? player.idade) : age(player.birthDate ?? player.dataNascimento),
      pot: player.pot || category(age(player.birthDate ?? player.dataNascimento)).pot,
      active: String(player.active ?? player.ativo ?? 'SIM').toUpperCase(),
      score: num(player.score ?? player.nota),
      adjustedScore: num(player.adjustedScore ?? player.indiceAjustado ?? adjustedIndex(player.score ?? player.nota))
    }));
    state.teams = (Array.isArray(state.teams) ? state.teams : (state.equipes || [])).map(normalizeTeam);
    state.rounds = Array.isArray(state.rounds) ? state.rounds : [];
    state.rounds.forEach(round => {
      round.matches = Array.isArray(round.matches) ? round.matches.map(normalizeMatch) : [];
    });
    return state;
  }

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      return state && Array.isArray(state.players) ? normalizeState(state) : initialState();
    } catch {
      return initialState();
    }
  }

  function saveState(state) {
    const next = normalizeState({ ...state, serverTime: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function savePlayer(params, admin = false) {
    const state = readState();
    const valid = validatePlayer(params);
    const id = params.id || `${valid.pot}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const duplicate = state.players.some(player =>
      player.id !== id && normalizeName(player.name ?? player.nome) === valid.name && Number(player.age ?? player.idade) === valid.age
    );
    if (duplicate) throw new Error('Este participante já está inscrito.');

    const player = {
      id, name: valid.name, age: valid.age, birthDate: valid.birthDate,
      pot: valid.pot, category: valid.category, categoryLabel: valid.categoryLabel,
      score: valid.score, adjustedScore: valid.adjustedScore,
      active: admin ? valid.active : 'SIM', createdAt: params.createdAt || new Date().toISOString()
    };

    const index = state.players.findIndex(item => item.id === id);
    if (index >= 0) state.players.splice(index, 1, player); else state.players.push(player);
    state.status = 'INSCRICOES';
    state.message = 'Inscrições abertas.';
    state.teams = [];
    state.rounds = [];
    saveState(state);
    return {
      message: admin ? 'Participante salvo.' : `Inscrição confirmada no Pote ${player.pot} — ${player.categoryLabel}.`,
      player, state
    };
  }

  window.VoleiBase = {
    C, KEY, esc, num, fmt, normalizeName, parseDate, dateInput, age, syntheticBirthDate,
    category, adjustedIndex, validatePlayer, initialState, normalizeTeam, normalizeMatch,
    normalizeState, readState, saveState, savePlayer
  };
})();
