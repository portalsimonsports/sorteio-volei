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
  function rulesFrom(source = {}) {
    const bestOfRaw = n(source.bestOf ?? source.melhorDe, 3);
    const bestOf = [1,3,5].includes(bestOfRaw) ? bestOfRaw : 3;
    return {
      bestOf,
      setsToWin: Math.floor(bestOf / 2) + 1,
      normalSetPoints: Math.max(1, n(source.normalSetPoints, 25)),
      tiebreakSetPoints: Math.max(1, n(source.tiebreakSetPoints, 15)),
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
    const rules = rulesFrom(state?.rules || {});
    if (best) best.value = String(rules.bestOf);
    if (normal) normal.value = String(rules.normalSetPoints);
    if (tie) tie.value = String(rules.tiebreakSetPoints);
    if (lead) lead.value = String(rules.minimumLead);
    if (save) { save.disabled = false; save.title = ''; }
    renderSummary(rules);
  }

  ['input','change'].forEach(type => form.addEventListener(type, () => renderSummary(readForm())));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const rules = readForm();
    A.busy?.(save, true, 'Salvando regras...');
    try {
      const result = await V.request('salvarRegras', {
        melhorDe: rules.bestOf,
        pontosNormal: rules.normalSetPoints,
        pontosDesempate: rules.tiebreakSetPoints,
        vantagemMinima: rules.minimumLead
      });
      V.invalidateReadCache?.();
      V.toast?.('Formato das partidas atualizado.');
      if (result?.state) A.render?.(result.state); else await A.refresh?.();
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
