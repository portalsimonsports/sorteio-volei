(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const ranking = document.getElementById('tmRanking');
  if (!ranking) return;

  const cache = new Map();
  const CACHE_MS = 60000;
  let modal = null;
  let lastTrigger = null;

  function currentScope() {
    const controls = document.getElementById('tmRankingScopesV050');
    const active = [...(controls?.querySelectorAll('[data-tm-scope]') || [])].find(button => button.classList.contains('primary'));
    const scope = active?.dataset.tmScope || 'GERAL';
    const championshipId = scope === 'CAMPEONATO' ? String(controls?.querySelector('#tmRankingChampionshipV050')?.value || '') : '';
    return { scope, championshipId };
  }

  function plural(total, singular, pluralText) {
    return `${total} ${total === 1 ? singular : pluralText}`;
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'tm68-modal';
    modal.id = 'tm68RankingDetailsModal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tm68ModalTitle');
    modal.innerHTML = `
      <div class="tm68-dialog">
        <button class="tm68-modal-close" type="button" aria-label="Fechar" data-tm68-close>×</button>
        <header class="tm68-modal-head">
          <span class="tm68-modal-kicker" data-tm68-kicker>Detalhamento</span>
          <h2 class="tm68-modal-title" id="tm68ModalTitle">Resultados do participante</h2>
          <p class="tm68-modal-summary" data-tm68-summary></p>
        </header>
        <div class="tm68-modal-body" data-tm68-body></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-tm68-close]')?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
    return modal;
  }

  function openModal(playerName, type) {
    const dialog = ensureModal();
    const isWins = type === 'VITORIAS';
    dialog.dataset.type = type;
    dialog.querySelector('[data-tm68-kicker]').textContent = isWins ? 'Jogos vencidos' : 'Jogos perdidos';
    dialog.querySelector('#tm68ModalTitle').textContent = `${isWins ? 'Vitórias' : 'Derrotas'} de ${playerName}`;
    dialog.querySelector('[data-tm68-summary]').textContent = 'Carregando os confrontos deste recorte...';
    dialog.querySelector('[data-tm68-body]').innerHTML = '<div class="tm68-loading">Consultando os resultados...</div>';
    dialog.hidden = false;
    document.body.classList.add('tm68-modal-open');
    setTimeout(() => dialog.querySelector('[data-tm68-close]')?.focus(), 30);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('tm68-modal-open');
    lastTrigger?.focus?.();
  }

  function resultCard(item, type) {
    const isHistory = item.kind === 'HISTORICO';
    const isWins = type === 'VITORIAS';
    const source = isHistory ? 'Histórico consolidado' : (item.source === 'CAMPEONATO' ? 'Campeonato' : 'Jogo avulso');
    const date = item.dateText ? `<span class="tm68-result-date">${TM.esc(item.dateText)}</span>` : '';
    let resultLine = '';
    let sourceLine = TM.esc(item.sourceLabel || source);
    let note = '';

    if (isHistory) {
      resultLine = `${plural(Number(item.wins || 0), 'vitória', 'vitórias')} e ${plural(Number(item.losses || 0), 'derrota', 'derrotas')} neste lançamento`;
      sourceLine += ` • ${Number(item.games || 0)} confrontos • base ${Number(item.basePoints || 0)} pontos • diferença ${Number(item.minimumLead || 2)}`;
      if (item.observation) note = `<p class="tm68-result-note">${TM.esc(item.observation)}</p>`;
    } else {
      resultLine = `${isWins ? 'Vitória' : 'Derrota'} • ${TM.esc(item.scoreText || 'Placar não informado')} • Sets ${Number(item.setsFor || 0)} × ${Number(item.setsAgainst || 0)}`;
      if (item.game) sourceLine += ` • Jogo ${Number(item.game)}`;
    }

    return `<article class="tm68-result-card ${isWins ? 'win' : 'loss'}${isHistory ? ' history' : ''}">
      <div class="tm68-result-meta"><span class="tm68-result-badge">${source}</span>${date}</div>
      <h3>contra ${TM.esc(item.opponent || 'Adversário')}</h3>
      <p class="tm68-result-line">${resultLine}</p>
      <p class="tm68-result-source">${sourceLine}</p>${note}
    </article>`;
  }

  function renderDetails(data, type) {
    const dialog = ensureModal();
    const isWins = type === 'VITORIAS';
    const total = Number(data?.total || 0);
    dialog.querySelector('[data-tm68-summary]').textContent = `${plural(total, isWins ? 'vitória' : 'derrota', isWins ? 'vitórias' : 'derrotas')} no recorte selecionado.`;
    const body = dialog.querySelector('[data-tm68-body]');
    const items = Array.isArray(data?.items) ? data.items : [];
    body.innerHTML = items.length ? `<div class="tm68-result-list">${items.map(item => resultCard(item, type)).join('')}</div>` : `<div class="tm68-empty">Nenhum resultado encontrado neste recorte.</div>`;
  }

  function renderError(error) {
    const dialog = ensureModal();
    dialog.querySelector('[data-tm68-summary]').textContent = 'Não foi possível carregar o detalhamento.';
    dialog.querySelector('[data-tm68-body]').innerHTML = `<div class="tm68-empty">${TM.esc(error?.message || 'Falha ao consultar os resultados.')}</div>`;
  }

  async function showDetails(button) {
    lastTrigger = button;
    const playerName = String(button.dataset.tm68Player || '').trim();
    const type = String(button.dataset.tm68Type || '').trim();
    if (!playerName || !['VITORIAS', 'DERROTAS'].includes(type)) return;
    const { scope, championshipId } = currentScope();
    const key = [scope, championshipId, playerName, type].join('|');
    openModal(playerName, type);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.savedAt < CACHE_MS) {
      renderDetails(cached.data, type);
      return;
    }
    try {
      const data = await TM.request('tmRankingDetalhes', {
        jogadorNome: playerName,
        tipo: type,
        escopo: scope,
        campeonatoId: championshipId
      });
      cache.set(key, { savedAt: Date.now(), data });
      renderDetails(data, type);
    } catch (error) {
      renderError(error);
    }
  }

  function makeClickable(row, statIndex, type, playerName) {
    const stats = row.querySelectorAll(':scope > .tm-stat');
    const cell = stats[statIndex];
    if (!cell || cell.querySelector('[data-tm68-detail]')) return;
    const value = Number((cell.textContent || '').replace(/[^0-9-]/g, '')) || 0;
    cell.classList.add('tm68-clickable-stat');
    cell.innerHTML = `<button type="button" class="tm68-record-button" data-tm68-detail data-tm68-type="${type}" data-tm68-player="${TM.esc(playerName)}" aria-label="Ver ${type === 'VITORIAS' ? 'vitórias' : 'derrotas'} de ${TM.esc(playerName)}" ${value < 1 ? 'disabled' : ''}><span>${type === 'VITORIAS' ? 'Vitórias' : 'Derrotas'}</span><strong>${value}</strong></button>`;
  }

  function enhanceRanking() {
    ranking.querySelectorAll('article.tm-rank-row').forEach(row => {
      if (row.dataset.tm68Ready === '1') return;
      const playerName = row.querySelector('.tm-rank-name strong')?.textContent?.trim();
      if (!playerName) return;
      makeClickable(row, 2, 'VITORIAS', playerName);
      makeClickable(row, 3, 'DERROTAS', playerName);
      row.dataset.tm68Ready = '1';
    });
  }

  ranking.addEventListener('click', event => {
    const button = event.target.closest('[data-tm68-detail]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    showDetails(button);
  });

  new MutationObserver(enhanceRanking).observe(ranking, { childList: true, subtree: true });
  document.getElementById('tmRankingScopesV050')?.addEventListener('click', () => setTimeout(enhanceRanking, 40));
  enhanceRanking();
})();
