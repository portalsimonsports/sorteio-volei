(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const target = document.getElementById('tmAdminRanking');
  if (!target) return;

  const STORAGE_KEY = 'tm_admin_ranking_criterion_v064';
  const CRITERIA = {
    PONTOS: { label: 'Pontuação', field: 'points', direction: -1 },
    APROVEITAMENTO: { label: 'Aproveitamento', field: 'winRate', direction: -1 },
    JOGOS: { label: 'Jogos', field: 'games', direction: -1 },
    VITORIAS: { label: 'Vitórias', field: 'wins', direction: -1 },
    DERROTAS: { label: 'Derrotas', field: 'losses', direction: 1 },
    SALDO_SETS: { label: 'Saldo de sets', field: 'setDiff', direction: -1 }
  };

  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = TM.esc || (value => String(value ?? ''));
  let criterion = localStorage.getItem(STORAGE_KEY) || 'PONTOS';
  if (!CRITERIA[criterion]) criterion = 'PONTOS';
  let state = null;
  let rendering = false;
  let refreshTimer = null;

  function sourceRanking() {
    const global = Array.isArray(state?.globalRankingPoints)
      ? state.globalRankingPoints.filter(item => num(item.games) > 0)
      : [];
    const current = Array.isArray(state?.ranking)
      ? state.ranking.filter(item => num(item.games) > 0)
      : [];
    return global.length ? global : current;
  }

  function sortedRanking() {
    const config = CRITERIA[criterion] || CRITERIA.PONTOS;
    return sourceRanking().slice().sort((a, b) => {
      const primary = (num(a[config.field]) - num(b[config.field])) * config.direction;
      if (primary) return primary;
      if (num(a.points) !== num(b.points)) return num(b.points) - num(a.points);
      if (num(a.winRate) !== num(b.winRate)) return num(b.winRate) - num(a.winRate);
      if (num(a.setDiff) !== num(b.setDiff)) return num(b.setDiff) - num(a.setDiff);
      if (num(a.wins) !== num(b.wins)) return num(b.wins) - num(a.wins);
      if (num(a.losses) !== num(b.losses)) return num(a.losses) - num(b.losses);
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    }).map((item, index) => ({ ...item, displayPosition: index + 1 }));
  }

  function ensureToolbar() {
    const panel = target.closest('.tm-panel');
    if (!panel) return null;
    let toolbar = panel.querySelector('#tm64RankingToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'tm64RankingToolbar';
      toolbar.className = 'tm64-ranking-toolbar';
      toolbar.innerHTML = `<div class="tm64-ranking-buttons">${Object.entries(CRITERIA).map(([key, config]) => `<button type="button" data-tm64-criterion="${key}">${config.label}</button>`).join('')}</div><small>Saldo de sets = sets vencidos − sets perdidos. Em “Derrotas”, quem tem menos derrotas aparece primeiro.</small>`;
      target.insertAdjacentElement('beforebegin', toolbar);
      toolbar.addEventListener('click', event => {
        const button = event.target.closest('[data-tm64-criterion]');
        if (!button) return;
        criterion = button.dataset.tm64Criterion;
        localStorage.setItem(STORAGE_KEY, criterion);
        render();
      });
    }
    toolbar.querySelectorAll('[data-tm64-criterion]').forEach(button => {
      const active = button.dataset.tm64Criterion === criterion;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    return toolbar;
  }

  function render() {
    if (!state) return;
    rendering = true;
    ensureToolbar();
    const ranking = sortedRanking();
    target.replaceChildren();
    if (!ranking.length) {
      const empty = document.createElement('div');
      empty.className = 'tm-empty';
      empty.textContent = 'Ranking aguardando jogos.';
      target.appendChild(empty);
      rendering = false;
      return;
    }

    ranking.forEach(item => {
      const position = item.displayPosition;
      const row = document.createElement('article');
      row.className = `tm-rank-row top-${position}`;
      row.dataset.tm64Criterion = criterion;
      row.innerHTML = `
        <div class="tm-position">${position}º</div>
        <div class="tm-rank-name"><strong>${esc(item.name)}</strong><small>Saldo de pontos ${num(item.pointDiff) > 0 ? '+' : ''}${num(item.pointDiff)}</small></div>
        <div class="tm-stat">${num(item.points)} pts</div>
        <div class="tm-stat">${num(item.games)} J</div>
        <div class="tm-stat">${num(item.wins)} V</div>
        <div class="tm-stat">${num(item.losses)} D</div>
        <div class="tm-stat">${TM.fmt ? TM.fmt(num(item.winRate)) : num(item.winRate).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</div>
        <div class="tm-stat">${num(item.setDiff) > 0 ? '+' : ''}${num(item.setDiff)} sets</div>`;
      target.appendChild(row);
    });
    rendering = false;
  }

  async function refresh() {
    clearTimeout(refreshTimer);
    try {
      state = await TM.request('tmAdmin');
      render();
    } catch (_) {
      if (state) render();
    }
  }

  function scheduleRefresh(delay = 250) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, delay);
  }

  const observer = new MutationObserver(() => {
    if (rendering) return;
    scheduleRefresh(180);
  });
  observer.observe(target, { childList: true });

  document.getElementById('tmRefresh')?.addEventListener('click', () => scheduleRefresh(500));
  window.addEventListener('tm54-history-changed', () => scheduleRefresh(300));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRefresh(150); });

  refresh();
})();