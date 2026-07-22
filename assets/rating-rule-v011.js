(() => {
  'use strict';
  const B = window.VoleiBase;
  const V = window.Volei;
  if (!B || !V) return;

  const originalNum = B.num;

  function parseRating(value, params = {}) {
    const text = String(value ?? '').trim().replace(',', '.');
    const match = text.match(/^(10|[0-9])(\*)?$/);
    if (!match) {
      throw new Error('Informe uma nota de 5 a 10. Para manter o valor exato, use *: 5*, 6*, 7* ou 4*.');
    }

    const score = Number(match[1]);
    const manual = Boolean(match[2]);
    const previousScore = Number(params.previousScore ?? params.notaAnterior);
    const previousAdjusted = Number(params.previousAdjusted ?? params.indiceAnterior);
    const legacy = !manual && score < 5 && params.id && Number.isFinite(previousScore) && score === previousScore;

    if (!manual && score < 5 && !legacy) {
      throw new Error('Notas abaixo de 5 não são aceitas. Para manter o valor exato, digite o número seguido de *; exemplo: 4*.');
    }

    let adjustedScore;
    if (legacy && Number.isFinite(previousAdjusted)) adjustedScore = previousAdjusted;
    else if (manual) adjustedScore = score;
    else if (score === 5) adjustedScore = 8;
    else if (score === 6) adjustedScore = 8;
    else if (score === 7) adjustedScore = 8;
    else adjustedScore = score;

    return { text, score, manual, legacy, adjustedScore };
  }

  function num(value) {
    const text = String(value ?? '').trim().replace(/\*$/, '');
    return originalNum(text);
  }

  function adjustedIndex(value) {
    try { return parseRating(value).adjustedScore; }
    catch (_) { return num(value); }
  }

  function validatePlayer(params) {
    const name = B.normalizeName(params.name ?? params.nome);
    let playerAge = Number(params.age ?? params.idade);
    if (!Number.isInteger(playerAge)) playerAge = B.age(params.birthDate ?? params.dataNascimento);
    const rating = parseRating(params.score ?? params.nota, {
      id: params.id,
      previousScore: params.previousScore ?? params.notaAnterior,
      previousAdjusted: params.previousAdjusted ?? params.indiceAnterior
    });
    const playerCategory = B.category(playerAge);
    const active = String(params.active ?? params.ativo ?? 'SIM').toUpperCase();

    if (name.length < 2) throw new Error('Informe o nome do participante.');
    if (!Number.isInteger(playerAge) || playerAge < 1 || playerAge > 100) {
      throw new Error('Informe uma idade válida entre 1 e 100 anos.');
    }
    if (!['SIM', 'NAO'].includes(active)) throw new Error('O campo ativo deve ser SIM ou NAO.');

    return {
      name,
      age: playerAge,
      birthDate: B.syntheticBirthDate(playerAge),
      pot: playerCategory.pot,
      category: playerCategory.code,
      categoryLabel: playerCategory.label,
      score: rating.score,
      adjustedScore: rating.adjustedScore,
      scoreManual: rating.manual,
      active
    };
  }

  function savePlayer(params, admin = false) {
    const state = B.readState();
    const valid = validatePlayer(params);
    const id = params.id || `${valid.pot}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const duplicate = state.players.some(player =>
      player.id !== id && B.normalizeName(player.name ?? player.nome) === valid.name && Number(player.age ?? player.idade) === valid.age
    );
    if (duplicate) throw new Error('Este participante já está inscrito.');

    const old = state.players.find(item => item.id === id) || {};
    const player = {
      id, name: valid.name, age: valid.age, birthDate: valid.birthDate,
      pot: valid.pot, category: valid.category, categoryLabel: valid.categoryLabel,
      score: valid.score, adjustedScore: valid.adjustedScore,
      active: admin ? valid.active : 'SIM', createdAt: old.createdAt || params.createdAt || new Date().toISOString()
    };

    const index = state.players.findIndex(item => item.id === id);
    if (index >= 0) state.players.splice(index, 1, player); else state.players.push(player);
    state.status = 'INSCRICOES';
    state.message = 'Inscrições abertas.';
    state.teams = [];
    state.rounds = [];
    B.saveState(state);
    return { message: admin ? 'Participante salvo.' : `Inscrição confirmada no Pote ${player.pot} — ${player.categoryLabel}.`, player, state };
  }

  function editValue(player) {
    const score = Number(player?.score);
    const adjusted = Number(player?.adjustedScore);
    if (score < 5) return String(score);
    if (score >= 5 && score <= 7 && adjusted === score) return `${score}*`;
    return String(score);
  }

  function configureField(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = 'text';
    input.inputMode = 'text';
    input.maxLength = 3;
    input.removeAttribute('min');
    input.removeAttribute('max');
    input.removeAttribute('step');
    input.placeholder = 'Ex.: 5, 6, 7 ou 5*';
    input.autocomplete = 'off';
    const label = input.closest('label');
    if (label?.firstChild?.nodeType === Node.TEXT_NODE) {
      label.firstChild.nodeValue = 'Como você avalia o seu jogo?';
    }
    if (label && !label.querySelector('.rating-help')) {
      const help = document.createElement('small');
      help.className = 'rating-help';
      help.textContent = '5, 6 e 7 são ajustados para 8. Use * para manter o valor exato: 5*, 6*, 7* ou 4*.';
      label.appendChild(help);
    }
  }

  B.num = num;
  B.parseRating = parseRating;
  B.adjustedIndex = adjustedIndex;
  B.validatePlayer = validatePlayer;
  B.savePlayer = savePlayer;

  V.num = num;
  V.parseRating = parseRating;
  V.adjustedIndex = adjustedIndex;
  V.index = adjustedIndex;
  V.validatePlayer = validatePlayer;
  V.ratingEditValue = editValue;

  configureField('signupScore');
  configureField('playerScore');
})();
