(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.VoleiAdmin) return;
  const A = window.VoleiAdmin;
  const V = A.V;
  const form = document.getElementById('rulesForm');
  const best = document.getElementById('ruleBestOf');
  const normal = document.getElementById('ruleNormalPoints');
  const tie = document.getElementById('ruleTiePoints');
  const lead = document.getElementById('ruleMinimumLead');
  const summary = document.getElementById('ruleSummary');
  const save = document.getElementById('saveRules');
  if (!form) return;

  const n = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const text = value => String(value ?? '').trim();

  function rulesFrom(source = {}) {
    const bestOfRaw = n(source.bestOf ?? source.melhorDe, 3);
    const bestOf = [1,3,5].includes(bestOfRaw) ? bestOfRaw : 3;
    return {
      bestOf,
      setsToWin: Math.floor(bestOf / 2) + 1,
      normalSetPoints: Math.max(1, n(source.normalSetPoints ?? source.normalPoints, 25)),
      tiebreakSetPoints: Math.max(1, n(source.tiebreakSetPoints ?? source.tiebreakPoints, 15)),
      minimumLead: Math.max(1, n(source.minimumLead, 2))
    };
  }

  function readForm() {
    return rulesFrom({
      bestOf: best?.value,
      normalSetPoints: normal?.value,
      tiebreakSetPoints: tie?.value,
      minimumLead: lead?.value
    });
  }

  function renderSummary(rules) {
    if (!summary) return;
    const decisive = rules.bestOf > 1 ? ` • set decisivo a ${rules.tiebreakSetPoints}` : '';
    summary.textContent = `Melhor de ${rules.bestOf} • ${rules.setsToWin} set${rules.setsToWin === 1 ? '' : 's'} para vencer • sets normais a ${rules.normalSetPoints}${decisive} • vantagem mínima de ${rules.minimumLead}.`;
  }

  function fill(state) {
    const rules = rulesFrom(state?.rules || state?.championship?.settings || {});
    if (best) best.value = String(rules.bestOf);
    if (normal) normal.value = String(rules.normalSetPoints);
    if (tie) tie.value = String(rules.tiebreakSetPoints);
    if (lead) lead.value = String(rules.minimumLead);
    if (save) { save.disabled = false; save.title = ''; }
    renderSummary(rules);
  }

  function participantIds(state) {
    const ids = [];
    (state?.teams || []).forEach(team => {
      if (Array.isArray(team?.members)) team.members.forEach(member => member?.id && ids.push(text(member.id)));
      const a = text(team?.adultId || team?.member1Id);
      const b = text(team?.childId || team?.member2Id);
      a.split('|').filter(Boolean).forEach(id => ids.push(id));
      b.split('|').filter(Boolean).forEach(id => ids.push(id));
    });
    return [...new Set(ids.filter(Boolean))];
  }

  function editParams(state, rules) {
    const settings = state?.championship?.settings || {};
    const ids = participantIds(state);
    return {
      campeonatoId: state?.championship?.id || '',
      nome: state?.championship?.name || '',
      participantes: JSON.stringify(ids),
      modoEquipes: 'NOVAS_DUPLAS',
      modelo: settings.bracketModel || 'AUTOMATICO',
      tamanhoEquipe: n(settings.teamSize ?? state?.competition?.teamSize, 2),
      formatoCompeticao: settings.format || state?.competition?.format || 'MATA_MATA',
      repeticoesConfronto: n(settings.repeticoesConfronto, 1),
      melhorDe: rules.bestOf,
      pontosNormal: rules.normalSetPoints,
      pontosDesempate: rules.tiebreakSetPoints,
      vantagemMinima: rules.minimumLead
    };
  }

  ['input','change'].forEach(type => form.addEventListener(type, () => renderSummary(readForm())));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const rules = readForm();
    const state = A.getState?.() || {};
    A.busy?.(save, true, 'Salvando regras...');
    try {
      let result;
      if (state?.championship && state?.championshipEditable && typeof V.championshipRequest === 'function') {
        const params = editParams(state, rules);
        const ids = JSON.parse(params.participantes || '[]');
        if (!ids.length) throw new Error('Não foi possível identificar os participantes do campeonato atual.');
        result = await V.championshipRequest('novoCampeonato', params);
        V.toast?.('Formato atualizado e chaveamento do campeonato não iniciado regenerado.');
      } else {
        result = await V.request('salvarRegras', {
          melhorDe: rules.bestOf,
          pontosNormal: rules.normalSetPoints,
          pontosDesempate: rules.tiebreakSetPoints,
          vantagemMinima: rules.minimumLead
        });
        V.toast?.('Formato das partidas atualizado.');
      }
      V.invalidateReadCache?.();
      if (result?.state) A.render?.(result.state);
      else if (typeof A.refresh === 'function') await A.refresh();
      else setTimeout(() => location.reload(), 500);
    } catch (error) {
      V.toast?.(error.message || 'Não foi possível salvar o formato das partidas.', 'error');
    } finally {
      A.busy?.(save, false);
    }
  }, true);

  const originalRender = A.render;
  if (typeof originalRender === 'function') {
    A.render = state => {
      const result = originalRender(state);
      fill(state);
      return result;
    };
  }
  fill(A.getState?.() || {});
})();