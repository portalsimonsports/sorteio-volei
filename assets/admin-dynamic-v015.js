(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.VoleiAdmin) return;

  const A = window.VoleiAdmin;
  const V = A.V;
  const C = A.C;
  const scoreForm = document.getElementById('scoreForm');
  const scoreGame = document.getElementById('scoreGame');
  const scoreSetsContainer = document.getElementById('scoreSetsContainer');
  const saveScore = document.getElementById('saveScore');
  const startMatch = document.getElementById('startMatch');
  const rulesForm = document.getElementById('rulesForm');
  const ruleBestOf = document.getElementById('ruleBestOf');
  const ruleNormalPoints = document.getElementById('ruleNormalPoints');
  const ruleTiePoints = document.getElementById('ruleTiePoints');
  const ruleMinimumLead = document.getElementById('ruleMinimumLead');
  const ruleSummary = document.getElementById('ruleSummary');
  const saveRules = document.getElementById('saveRules');
  let dirty = false;
  let initializedRules = false;

  if (!scoreForm || !scoreGame || !scoreSetsContainer) return;

  function backendSupportsV15() {
    if (C.DEMO_MODE || !C.API_BASE) return true;
    return /V015/i.test(String(A.getState()?.version || ''));
  }

  function normalizedRules(source = {}) {
    const bestOfRaw = Number(source.bestOf ?? source.melhorDe ?? C.BEST_OF_SETS ?? 3);
    const bestOf = [1, 3, 5].includes(bestOfRaw) ? bestOfRaw : 3;
    return {
      bestOf,
      setsToWin: Math.floor(bestOf / 2) + 1,
      normalSetPoints: Math.max(1, Number(source.normalSetPoints ?? C.NORMAL_SET_POINTS ?? 25)),
      tiebreakSetPoints: Math.max(1, Number(source.tiebreakSetPoints ?? C.TIEBREAK_SET_POINTS ?? 15)),
      minimumLead: Math.max(1, Number(source.minimumLead ?? C.MINIMUM_LEAD ?? 2)),
      matchIntervalMinutes: Math.max(0, Number(source.matchIntervalMinutes ?? C.MATCH_INTERVAL_MINUTES ?? 10))
    };
  }

  function currentRules() {
    return normalizedRules(A.getState()?.rules || {});
  }

  function formRules() {
    return normalizedRules({
      bestOf: Number(ruleBestOf?.value || 3),
      normalSetPoints: Number(ruleNormalPoints?.value || 25),
      tiebreakSetPoints: Number(ruleTiePoints?.value || 15),
      minimumLead: Number(ruleMinimumLead?.value || 2),
      matchIntervalMinutes: currentRules().matchIntervalMinutes
    });
  }

  function updateRuleSummary(rules = formRules()) {
    if (!ruleSummary) return;
    const last = rules.bestOf > 1 ? `; set decisivo a ${rules.tiebreakSetPoints}` : '';
    ruleSummary.textContent = `Melhor de ${rules.bestOf} • ${rules.setsToWin} set${rules.setsToWin === 1 ? '' : 's'} para vencer • sets normais a ${rules.normalSetPoints}${last} • vantagem mínima de ${rules.minimumLead}.`;
  }

  function updateBackendAvailability() {
    const supported = backendSupportsV15();
    if (saveRules) {
      saveRules.disabled = !supported;
      saveRules.title = supported ? '' : 'Publique o Apps Script V015 para habilitar esta configuração.';
    }
    if (!supported && ruleSummary) {
      ruleSummary.textContent = 'O painel já está atualizado. Publique o Apps Script V015 para alterar sets e pontuação.';
    }
  }

  function fillRules(state) {
    if (!rulesForm || initializedRules && document.activeElement?.closest('#rulesForm')) return;
    const rules = normalizedRules(state?.rules || {});
    if (ruleBestOf) ruleBestOf.value = String(rules.bestOf);
    if (ruleNormalPoints) ruleNormalPoints.value = String(rules.normalSetPoints);
    if (ruleTiePoints) ruleTiePoints.value = String(rules.tiebreakSetPoints);
    if (ruleMinimumLead) ruleMinimumLead.value = String(rules.minimumLead);
    updateRuleSummary(rules);
    initializedRules = true;
    updateBackendAvailability();
  }

  function selectedMatch() {
    return (A.getState()?.rounds || []).flatMap(round => round.matches || [])
      .find(match => String(match.game) === String(scoreGame.value));
  }

  function targetForSet(index, rules) {
    return rules.bestOf > 1 && index === rules.bestOf - 1 ? rules.tiebreakSetPoints : rules.normalSetPoints;
  }

  function renderScoreFields(force = false) {
    const match = selectedMatch();
    const rules = currentRules();
    if (!force && dirty && match) return;
    scoreSetsContainer.className = 'dynamic-set-grid';
    scoreSetsContainer.replaceChildren();
    for (let index = 0; index < rules.bestOf; index++) {
      const title = document.createElement('div');
      title.className = 'dynamic-set-title';
      title.textContent = `${index + 1}º set — ${targetForSet(index, rules)} pontos`;
      scoreSetsContainer.appendChild(title);
      [0, 1].forEach(side => {
        const label = document.createElement('label');
        label.textContent = `Equipe ${side + 1}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.inputMode = 'numeric';
        input.dataset.scoreSet = String(index);
        input.dataset.scoreSide = String(side);
        input.value = match?.scores?.[index]?.[side] ?? '';
        input.addEventListener('input', () => { dirty = true; });
        label.appendChild(input);
        scoreSetsContainer.appendChild(label);
      });
    }
    dirty = false;
    updateMatchButtons(match);
  }

  function updateMatchButtons(match = selectedMatch()) {
    if (!startMatch) return;
    const supported = backendSupportsV15();
    const selectable = Boolean(match && A.canSelectMatch?.(match));
    startMatch.disabled = !supported || !selectable || String(match?.status || '').toUpperCase() === 'FINALIZADO';
    if (!supported) {
      startMatch.textContent = 'Publique o Apps Script V015 para registrar o início';
      startMatch.classList.remove('match-started');
      return;
    }
    if (match?.startedAt) {
      startMatch.textContent = `Iniciada às ${V.dateTime(match.startedAt, true)}`;
      startMatch.classList.add('match-started');
    } else {
      startMatch.textContent = 'Registrar início da partida';
      startMatch.classList.remove('match-started');
    }
  }

  function readScores() {
    const rules = currentRules();
    return Array.from({ length: rules.bestOf }, (_, index) => [0, 1].map(side => {
      const input = scoreSetsContainer.querySelector(`[data-score-set="${index}"][data-score-side="${side}"]`);
      return input?.value === '' ? null : Number(input?.value);
    }));
  }

  async function requestAdmin(action, params = {}) {
    if (C.DEMO_MODE || !C.API_BASE) {
      const state = V.read();
      if (action === 'salvarRegras') {
        state.rules = {
          ...(state.rules || {}),
          bestOf: Number(params.melhorDe),
          setsToWin: Math.floor(Number(params.melhorDe) / 2) + 1,
          normalSetPoints: Number(params.pontosNormal),
          tiebreakSetPoints: Number(params.pontosDesempate),
          minimumLead: Number(params.vantagemMinima)
        };
        VoleiBase.saveState(state);
        return { message: 'Configuração salva.', state };
      }
      if (action === 'iniciarPartida') {
        const match = state.rounds.flatMap(round => round.matches).find(item => Number(item.game) === Number(params.jogo));
        if (!match) throw new Error('Jogo não encontrado.');
        match.startedAt = match.startedAt || new Date().toISOString();
        match.status = 'EM_DISPUTA';
        VoleiBase.saveState(state);
        return { message: 'Início registrado.', state };
      }
    }
    return V.request(action, params);
  }

  if (rulesForm) {
    ['change', 'input'].forEach(type => rulesForm.addEventListener(type, () => {
      if (backendSupportsV15()) updateRuleSummary(formRules());
    }));
    rulesForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!backendSupportsV15()) {
        V.toast('Publique o Apps Script V015 antes de alterar sets e pontuação.', 'warn');
        return;
      }
      const rules = formRules();
      A.busy(saveRules, true, 'Salvando regras...');
      try {
        const result = await requestAdmin('salvarRegras', {
          melhorDe: rules.bestOf,
          pontosNormal: rules.normalSetPoints,
          pontosDesempate: rules.tiebreakSetPoints,
          vantagemMinima: rules.minimumLead
        });
        V.toast('Formato das partidas atualizado.');
        initializedRules = false;
        if (result?.state) A.render(result.state); else await A.refresh();
      } catch (error) {
        V.toast(error.message, 'error');
      } finally {
        A.busy(saveRules, false);
      }
    });
  }

  if (startMatch) {
    startMatch.addEventListener('click', async () => {
      if (!backendSupportsV15()) {
        V.toast('Publique o Apps Script V015 para registrar o horário de início.', 'warn');
        return;
      }
      const match = selectedMatch();
      if (!match) {
        V.toast('Selecione uma partida liberada.', 'warn');
        return;
      }
      A.busy(startMatch, true, 'Registrando início...');
      try {
        const result = await requestAdmin('iniciarPartida', { jogo: match.game });
        V.toast('Horário real de início registrado.');
        if (result?.state) A.render(result.state); else await A.refresh();
      } catch (error) {
        V.toast(error.message, 'error');
      } finally {
        A.busy(startMatch, false);
      }
    });
  }

  scoreForm.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const match = selectedMatch();
    if (!match || !A.canSelectMatch?.(match)) {
      V.toast('Selecione uma partida liberada.', 'warn');
      return;
    }
    const rules = currentRules();
    const scores = readScores();
    try {
      V.validateScore({ scores }, rules);
    } catch (error) {
      V.toast(error.message, 'warn');
      return;
    }
    if (!confirm('Confirmar o placar final desta partida?')) return;
    A.busy(saveScore, true, 'Salvando placar...');
    try {
      let params;
      if (backendSupportsV15()) {
        params = { jogo: match.game, payload: JSON.stringify({ scores }) };
      } else {
        if (rules.bestOf !== 3) throw new Error('O backend atual aceita somente melhor de 3. Publique o Apps Script V015 para usar outro formato.');
        const legacy = scores.slice(0, 3).flat().map(value => value ?? '');
        params = { jogo: match.game, vencedorId: ['PLACAR', ...legacy].join('|') };
      }
      const result = await V.request('registrarResultado', params);
      dirty = false;
      V.toast(`Placar salvo. Intervalo de ${rules.matchIntervalMinutes} minutos iniciado.`);
      if (result?.state) A.render(result.state); else await A.refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(saveScore, false);
    }
  }, true);

  scoreGame.addEventListener('change', () => {
    dirty = false;
    renderScoreFields(true);
  });

  const originalRenderMatches = A.renderMatches;
  A.renderMatches = rounds => {
    originalRenderMatches(rounds);
    fillRules(A.getState());
    renderScoreFields(true);
  };
  A.scoreIsDirty = () => dirty || Boolean(document.activeElement?.closest('#scoreSetsContainer'));
  fillRules(A.getState());
  renderScoreFields(true);
})();
