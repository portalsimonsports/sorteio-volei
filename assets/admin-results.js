(() => {
  'use strict';
  if (!window.VoleiAdmin) return;

  const A = window.VoleiAdmin;
  const V = A.V;
  const el = A.element;
  const scoreGame = document.getElementById('scoreGame');
  const scoreInfo = document.getElementById('scoreGameInfo');
  const saveScore = document.getElementById('saveScore');
  const scoreIds = ['scoreS1A','scoreS1B','scoreS2A','scoreS2B','scoreS3A','scoreS3B'];
  const scoreInputs = scoreIds.map(id => document.getElementById(id)).filter(Boolean);
  const hasLegacyScoreFields = scoreInputs.length === scoreIds.length;
  const DRAFT_KEY = 'sorteio_volei_placar_rascunho_v1';
  let dirty = false;

  function matchName(match) {
    return `${V.teamName(match.team1)} × ${V.teamName(match.team2)}`;
  }

  function resultText(match) {
    const sets = match.scores || [[null, null], [null, null], [null, null]];
    const setText = sets
      .filter(set => set[0] !== null && set[1] !== null)
      .map(set => `${set[0]}–${set[1]}`)
      .join(' | ');
    return setText || 'Placar ainda não lançado';
  }

  function statusOf(match) {
    return String(match?.status || 'AGUARDANDO').toUpperCase();
  }

  function canSelect(match) {
    if (!match?.team1 || !match?.team2) return false;
    const status = statusOf(match);
    if (['BYE', 'VAZIO', 'FINALIZADO'].includes(status)) return false;
    if (['LIBERADO', 'EM_DISPUTA'].includes(status)) return true;
    if (!match.availableAt) return false;
    const date = V.date(match.availableAt);
    return !date || date.getTime() <= Date.now();
  }

  function availability(match) {
    const status = statusOf(match);
    if (status === 'FINALIZADO') return `Finalizada em ${V.dateTime(match.finishedAt)}`;
    if (!match.team1 || !match.team2) return 'Aguardando definição das equipes';
    if (['LIBERADO', 'EM_DISPUTA'].includes(status)) return 'Partida liberada para lançamento do placar';
    if (!match.availableAt) return 'Aguardando a partida anterior';
    const date = V.date(match.availableAt);
    if (date && date.getTime() > Date.now()) {
      return `Intervalo de 10 minutos. Liberada em ${V.dateTime(match.availableAt)}`;
    }
    return 'Partida liberada para lançamento do placar';
  }

  function readDraft() {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function saveDraft() {
    if (!hasLegacyScoreFields || !scoreGame?.value) return;
    const drafts = readDraft();
    drafts[scoreGame.value] = scoreInputs.map(input => input.value);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    dirty = scoreInputs.some(input => input.value !== '');
  }

  function clearDraft(game) {
    if (!hasLegacyScoreFields) { dirty = false; return; }
    const drafts = readDraft();
    delete drafts[String(game || scoreGame?.value || '')];
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    dirty = false;
  }

  function fillScore(match, force = false) {
    if (!hasLegacyScoreFields) return;
    if (!force && dirty && match && String(match.game) === String(scoreGame?.value || '')) {
      if (scoreInfo) scoreInfo.textContent = `${matchName(match)} — ${availability(match)} — placar digitado preservado`;
      if (saveScore) saveScore.disabled = !canSelect(match);
      return;
    }

    const draft = match ? readDraft()[String(match.game)] : null;
    const values = draft || [
      match?.scores?.[0]?.[0], match?.scores?.[0]?.[1],
      match?.scores?.[1]?.[0], match?.scores?.[1]?.[1],
      match?.scores?.[2]?.[0], match?.scores?.[2]?.[1]
    ];
    scoreInputs.forEach((input, index) => { input.value = values?.[index] ?? ''; });
    dirty = Boolean(draft && draft.some(value => value !== ''));
    if (scoreInfo) scoreInfo.textContent = match ? `${matchName(match)} — ${availability(match)}` : 'Nenhuma partida selecionada.';
    if (saveScore) saveScore.disabled = !match || !canSelect(match);
  }

  function selectedMatch() {
    if (!scoreGame) return null;
    return (A.getState()?.rounds || []).flatMap(round => round.matches || [])
      .find(match => String(match.game) === String(scoreGame.value));
  }

  function renderOptions(rounds) {
    if (!hasLegacyScoreFields || !scoreGame) return;
    const previous = scoreGame.value;
    scoreGame.replaceChildren();
    const first = el('option', '', 'Selecione uma partida');
    first.value = '';
    scoreGame.appendChild(first);

    const candidates = (rounds || []).flatMap(round => round.matches || []).filter(match => {
      V.match(match);
      return match.team1 && match.team2 && !['BYE', 'VAZIO', 'FINALIZADO'].includes(statusOf(match));
    });

    candidates.forEach(match => {
      const released = canSelect(match);
      const suffix = released ? 'LIBERADA' : 'AGUARDANDO LIBERAÇÃO';
      const option = el('option', '', `Jogo ${match.game} — ${match.phase || ''} — ${matchName(match)} — ${suffix}`);
      option.value = String(match.game);
      option.disabled = !released;
      scoreGame.appendChild(option);
    });

    const previousOption = [...scoreGame.options].find(option => option.value === previous && !option.disabled);
    const firstReleased = [...scoreGame.options].find(option => option.value && !option.disabled);
    if (previousOption) scoreGame.value = previous;
    else if (firstReleased) scoreGame.value = firstReleased.value;
    else scoreGame.value = '';

    fillScore(selectedMatch());
  }

  function appendPodium(rounds) {
    const matches = (rounds || []).flatMap(round => round.matches || []);
    const final = matches.find(match => String(match.phase || '').toUpperCase() === 'FINAL');
    const third = matches.find(match => String(match.phase || '').toUpperCase() === 'DISPUTA DE 3º LUGAR');
    const champion = V.winner(final || {});
    const thirdPlace = V.winner(third || {});

    if (champion) {
      const box = el('div', 'champion');
      box.append(el('span', '', 'Equipe campeã'), el('strong', '', V.teamName(champion)));
      A.ui.matchesAdmin?.appendChild(box);
    }
    if (thirdPlace) {
      const box = el('div', 'champion');
      box.append(el('span', '', '3º lugar'), el('strong', '', V.teamName(thirdPlace)));
      A.ui.matchesAdmin?.appendChild(box);
    }
  }

  function renderHistory(rounds) {
    if (!A.ui.matchesAdmin) return;
    A.ui.matchesAdmin.replaceChildren();
    if (!rounds?.length) {
      A.ui.matchesAdmin.appendChild(el('div', 'empty', 'O chaveamento será exibido depois do sorteio.'));
      return;
    }

    appendPodium(rounds);
    rounds.forEach(round => {
      const section = el('section');
      section.appendChild(el('h3', '', round.name));
      (round.matches || []).forEach(match => {
        V.match(match);
        const card = el('article', 'score-editor card');
        const title = el('strong', '', `Jogo ${match.game} — ${match.phase || round.name}`);
        const teams = el('div', 'availability', `${V.teamName(match.team1) || match.team1Placeholder || 'A definir'} × ${V.teamName(match.team2) || match.team2Placeholder || 'A definir'}`);
        const score = el('div', 'availability', `${resultText(match)} • Sets ${match.sets1} × ${match.sets2}`);
        const state = el('div', 'match-status', availability(match));
        card.append(title, teams, score, state);
        section.appendChild(card);
      });
      A.ui.matchesAdmin.appendChild(section);
    });
  }

  A.renderMatches = rounds => {
    // O placar automático V031 é responsável pelo seletor e pelos campos atuais.
    // O código legado só manipula o seletor quando todos os antigos scoreS*A/B ainda existirem.
    if (hasLegacyScoreFields) renderOptions(rounds || []);
    renderHistory(rounds || []);
  };
  A.selectedMatch = selectedMatch;
  A.fillScore = fillScore;
  A.clearScoreDraft = clearDraft;
  A.scoreIsDirty = () => dirty || scoreInputs.some(input => document.activeElement === input);
  A.canSelectMatch = canSelect;

  if (hasLegacyScoreFields && scoreGame) {
    scoreGame.addEventListener('change', () => {
      dirty = false;
      fillScore(selectedMatch(), true);
    });
    scoreInputs.forEach(input => input.addEventListener('input', saveDraft));
  }
})();
