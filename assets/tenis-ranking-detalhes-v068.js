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

  function normalizeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
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

  function historyStandardResult(item, type) {
    const isWins = type === 'VITORIAS';
    const winnerPoints = Math.max(1, Number(item.basePoints || 5));
    const lead = Math.max(1, Number(item.minimumLead || 2));
    const loserPoints = Math.max(0, winnerPoints - lead);
    const playerPoints = isWins ? winnerPoints : loserPoints;
    const opponentPoints = isWins ? loserPoints : winnerPoints;
    return {
      scoreText: `${playerPoints} × ${opponentPoints}`,
      setsText: isWins ? '1 × 0' : '0 × 1',
      quantity: Math.max(0, Number(item.count || (isWins ? item.wins : item.losses) || 0))
    };
  }

  function describeItem(item, type) {
    const isHistory = item.kind === 'HISTORICO';
    const isWins = type === 'VITORIAS';
    const standard = isHistory ? historyStandardResult(item, type) : null;
    const source = isHistory ? 'Histórico consolidado' : (item.source === 'CAMPEONATO' ? 'Campeonato' : 'Jogo avulso');
    const sourceLabel = String(item.sourceLabel || source).trim();
    const scoreText = isHistory ? standard.scoreText : String(item.scoreText || 'Placar não informado');
    const setsText = isHistory ? standard.setsText : `${Number(item.setsFor || 0)} × ${Number(item.setsAgainst || 0)}`;
    const quantity = isHistory ? standard.quantity : Math.max(1, Number(item.count || 1));
    const extra = [];

    if (isHistory) {
      extra.push(`diferença ${Math.max(1, Number(item.minimumLead || 2))}`);
    } else if (item.game) {
      extra.push(`Jogo ${Number(item.game)}`);
    }

    return {
      opponent: String(item.opponent || 'Adversário').trim(),
      source,
      sourceLabel,
      scoreText,
      setsText,
      quantity,
      dateText: String(item.dateText || '').trim(),
      observation: String(item.observation || '').trim(),
      extra: extra.join(' • '),
      isHistory,
      resultLabel: isWins ? 'vitória' : 'derrota'
    };
  }

  function groupByOpponent(items, type) {
    const groups = new Map();

    items.forEach(item => {
      const detail = describeItem(item, type);
      const opponentKey = normalizeName(detail.opponent) || 'adversario';
      let group = groups.get(opponentKey);
      if (!group) {
        group = {
          opponent: detail.opponent,
          total: 0,
          latestDate: '',
          details: new Map(),
          observations: new Set()
        };
        groups.set(opponentKey, group);
      }

      group.total += detail.quantity;
      if (!group.latestDate && detail.dateText) group.latestDate = detail.dateText;
      if (detail.observation) group.observations.add(detail.observation);

      const detailKey = [detail.scoreText, detail.setsText, detail.source, detail.sourceLabel, detail.extra].join('|');
      let accumulated = group.details.get(detailKey);
      if (!accumulated) {
        accumulated = { ...detail, quantity: 0, dates: [] };
        group.details.set(detailKey, accumulated);
      }
      accumulated.quantity += detail.quantity;
      if (detail.dateText && !accumulated.dates.includes(detail.dateText)) accumulated.dates.push(detail.dateText);
    });

    return [...groups.values()]
      .map(group => ({ ...group, details: [...group.details.values()].sort((a, b) => b.quantity - a.quantity) }))
      .sort((a, b) => b.total - a.total || a.opponent.localeCompare(b.opponent, 'pt-BR'));
  }

  function groupedCard(group, type) {
    const isWins = type === 'VITORIAS';
    const resultWord = isWins ? 'vitória' : 'derrota';
    const resultWords = isWins ? 'vitórias' : 'derrotas';
    const date = group.latestDate ? `<span class="tm68-result-date">Último registro: ${TM.esc(group.latestDate)}</span>` : '';
    const breakdown = group.details.map(detail => {
      const sourceText = [detail.sourceLabel, detail.extra].filter(Boolean).join(' • ');
      const datesText = detail.dates.length > 1 ? ` • ${plural(detail.dates.length, 'lançamento', 'lançamentos')}` : '';
      return `<div class="tm68-breakdown-row">
        <strong>${plural(detail.quantity, resultWord, resultWords)}</strong>
        <span>${TM.esc(detail.scoreText)} • Sets ${TM.esc(detail.setsText)}</span>
        <small>${TM.esc(sourceText)}${datesText}</small>
      </div>`;
    }).join('');
    const notes = [...group.observations];
    const note = notes.length ? `<details class="tm68-group-notes"><summary>Observações (${notes.length})</summary>${notes.map(value => `<p>${TM.esc(value)}</p>`).join('')}</details>` : '';

    return `<article class="tm68-result-card tm68-opponent-card ${isWins ? 'win' : 'loss'}">
      <div class="tm68-result-meta"><span class="tm68-result-badge">${plural(group.total, resultWord, resultWords)}</span>${date}</div>
      <h3>contra ${TM.esc(group.opponent)}</h3>
      <p class="tm68-opponent-total">${plural(group.total, resultWord, resultWords)} contra este participante no recorte selecionado.</p>
      <div class="tm68-breakdown-list">${breakdown}</div>${note}
    </article>`;
  }

  function renderDetails(data, type) {
    const dialog = ensureModal();
    const isWins = type === 'VITORIAS';
    const total = Number(data?.total || 0);
    const items = Array.isArray(data?.items) ? data.items : [];
    const groups = groupByOpponent(items, type);
    const opponentCount = groups.length;
    dialog.querySelector('[data-tm68-summary]').textContent = `${plural(total, isWins ? 'vitória' : 'derrota', isWins ? 'vitórias' : 'derrotas')} contra ${plural(opponentCount, 'adversário', 'adversários')} no recorte selecionado.`;
    const body = dialog.querySelector('[data-tm68-body]');
    body.innerHTML = groups.length ? `<div class="tm68-result-list">${groups.map(group => groupedCard(group, type)).join('')}</div>` : `<div class="tm68-empty">Nenhum resultado encontrado neste recorte.</div>`;
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