(() => {
  'use strict';

  const C = window.VOLEI_CONFIG || {};
  const KEY = 'sorteio_volei_independente_v5';
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
    const birth = parseDate(value);
    if (!birth) return -1;
    let result = reference.getFullYear() - birth.getFullYear();
    if (
      reference.getMonth() < birth.getMonth() ||
      (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())
    ) result--;
    return result;
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
    const birthDate = dateInput(params.birthDate ?? params.dataNascimento);
    const playerAge = age(birthDate);
    const score = num(params.score ?? params.nota);
    const playerCategory = category(playerAge);
    const active = String(params.active ?? params.ativo ?? 'SIM').toUpperCase();

    if (name.length < 2) throw new Error('Informe o nome do participante.');
    if (!birthDate || playerAge < 0 || playerAge > 100) {
      throw new Error('Informe uma data de nascimento válida.');
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
      birthDate,
      age: playerAge,
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
      version: C.VERSION || 'V005',
      title: C.APP_NAME || 'Sorteio de Duplas de Vôlei',
      status: 'INSCRICOES',
      message: 'Inscrições abertas.',
      serverTime: new Date().toISOString(),
      players: [],
      teams: [],
      rounds: [],
      auditHash: ''
    };
  }

  function normalizeTeam(team) {
    if (!team) return null;
    return {
      id: team.id,
      adultId: team.adultId ?? team.adultoId,
      adult: team.adult ?? team.adulto,
      adultIndex: num(team.adultIndex ?? team.indiceAdulto),
      childId: team.childId ?? team.criancaId,
      child: team.child ?? team.crianca,
      childIndex: num(team.childIndex ?? team.indiceCrianca),
      totalIndex: num(team.totalIndex ?? team.indiceTotal)
    };
  }

  function normalizeMatch(match) {
    match.team1 = normalizeTeam(match.team1);
    match.team2 = normalizeTeam(match.team2);
    match.scores = Array.isArray(match.scores)
      ? match.scores
      : [[null, null], [null, null], [null, null]];
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
    state.version = state.version || C.VERSION || 'V005';
    state.title = state.title || C.APP_NAME || 'Sorteio de Duplas de Vôlei';
    state.status = state.status || 'INSCRICOES';
    state.message = state.message || 'Inscrições abertas.';
    state.players = Array.isArray(state.players) ? state.players : (state.jogadores || []);
    state.teams = (Array.isArray(state.teams) ? state.teams : (state.equipes || []))
      .map(normalizeTeam);
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
    const id = params.id ||
      `${valid.pot}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const duplicate = state.players.some(player =>
      player.id !== id &&
      normalizeName(player.name ?? player.nome) === valid.name &&
      dateInput(player.birthDate ?? player.dataNascimento) === valid.birthDate
    );
    if (duplicate) throw new Error('Este participante já está inscrito.');

    const player = {
      id,
      name: valid.name,
      birthDate: valid.birthDate,
      age: valid.age,
      pot: valid.pot,
      category: valid.category,
      categoryLabel: valid.categoryLabel,
      score: valid.score,
      adjustedScore: valid.adjustedScore,
      active: admin ? valid.active : 'SIM',
      createdAt: params.createdAt || new Date().toISOString()
    };

    const index = state.players.findIndex(item => item.id === id);
    if (index >= 0) state.players.splice(index, 1, player);
    else state.players.push(player);

    state.status = 'INSCRICOES';
    state.message = 'Inscrições abertas.';
    state.teams = [];
    state.rounds = [];
    saveState(state);

    return {
      message: admin
        ? 'Participante salvo.'
        : `Inscrição confirmada no Pote ${player.pot} — ${player.categoryLabel}.`,
      player,
      state
    };
  }

  window.VoleiBase = {
    C, KEY, esc, num, fmt, normalizeName, parseDate, dateInput, age, category,
    adjustedIndex, validatePlayer, initialState, normalizeTeam, normalizeMatch,
    normalizeState, readState, saveState, savePlayer
  };
})();
