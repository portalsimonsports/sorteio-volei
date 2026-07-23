(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const F = window.FlexV023;
  const text = value => String(value ?? '').trim();
  const esc = value => F?.esc ? F.esc(value) : text(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  let state = { players: [], participants: [], freeMatches: [], championships: [] };
  let editMode = false;
  let rankingRender = null;

  const free = {
    panel: document.getElementById('tmFreeMatchPanel'),
    p1: document.getElementById('tmFreePlayer1'),
    p2: document.getElementById('tmFreePlayer2'),
    label1: document.getElementById('tmFreePlayer1Label'),
    note: document.getElementById('tmFreeWinnerNote'),
    bestOf: document.getElementById('tmFreeBestOf'),
    points: document.getElementById('tmFreeSetPoints'),
    lead: document.getElementById('tmFreeMinimumLead'),
    win: document.getElementById('tmFreeWinPoints'),
    loss: document.getElementById('tmFreeLossPoints'),
    create: document.getElementById('tmFreeNewGame'),
    list: document.getElementById('tmFreeMatches')
  };

  function activePlayers() {
    const fromState = (state.players || []).filter(player => text(player.active || 'SIM').toUpperCase() === 'SIM');
    if (fromState.length) return fromState;
    return [...document.querySelectorAll('#tmPlayers [data-select-player]')].map(input => {
      const row = input.closest('.tm-player-row');
      return { id: input.dataset.selectPlayer, name: row?.querySelector('strong')?.textContent || input.dataset.selectPlayer, active: input.disabled ? 'NAO' : 'SIM' };
    }).filter(player => player.active === 'SIM');
  }

  function optionMarkup(selected = '') {
    return `<option value="">Selecione um participante</option>${activePlayers().map(player => `<option value="${esc(player.id)}" ${text(player.id) === text(selected) ? 'selected' : ''}>${esc(player.name)}</option>`).join('')}`;
  }

  function populateFreeSelectors() {
    if (!free.p1 || !free.p2) return;
    const current1 = free.p1.value;
    const current2 = free.p2.value;
    free.p1.innerHTML = optionMarkup(current1);
    free.p2.innerHTML = optionMarkup(current2);
    applyWinnerPersistence();
  }

  function applyWinnerPersistence() {
    if (!free.p1 || !free.p2) return;
    const open = state.freeOpenMatch;
    const winnerId = text(state.freeCurrentWinnerId);
    const loserId = text(state.freeLastLoserId);

    free.p1.disabled = false;
    free.p2.disabled = false;
    free.create.disabled = false;
    free.label1.textContent = 'Participante 1';
    free.note.hidden = true;

    if (open) {
      free.p1.value = text(open.player1Id);
      free.p2.value = text(open.player2Id);
      free.p1.disabled = true;
      free.p2.disabled = true;
      free.create.disabled = true;
      free.note.hidden = false;
      free.note.textContent = 'Finalize o confronto atual antes de criar um novo jogo.';
      return;
    }

    if (winnerId) {
      free.p1.value = winnerId;
      free.p1.disabled = true;
      free.label1.textContent = 'Vencedor atual';
      if (!free.p2.value || free.p2.value === winnerId) free.p2.value = loserId && loserId !== winnerId ? loserId : '';
      free.note.hidden = false;
      free.note.textContent = `${state.freeCurrentWinnerName || 'O vencedor'} permanece selecionado até perder.`;
    }
  }

  function scoreSummary(match) {
    if (!Array.isArray(match.scores) || !match.scores.length) return 'Placar pendente';
    return `${match.scores.map(set => `${set[0]} × ${set[1]}`).join(' | ')} • Sets ${num(match.sets1)} × ${num(match.sets2)}`;
  }

  function renderFreeMatches() {
    if (!free.list) return;
    const matches = state.freeMatches || [];
    free.list.innerHTML = matches.length ? matches.map(match => {
      const winner = match.winnerId ? (match.winnerId === match.player1Id ? match.player1 : match.player2) : '';
      return `<article class="flex-v023-free-item">
        <div><strong>${esc(match.player1)} × ${esc(match.player2)}</strong><small>Jogo ${num(match.order)} • ${esc(match.status)}${winner ? ` • vencedor: ${esc(winner)}` : ''}<br>${esc(scoreSummary(match))}</small></div>
        <button class="tm-button secondary" type="button" data-tm-free-score="${esc(match.id)}">${match.status === 'FINALIZADO' ? 'Ver placar' : 'Lançar placar'}</button>
      </article>`;
    }).join('') : '<div class="flex-v023-empty">Nenhum confronto avulso registrado.</div>';
    applyWinnerPersistence();
  }

  function createScoreModal() {
    if (F?.createScoreModal) return F.createScoreModal('tm-v027');
    const modal = document.createElement('div');
    modal.className = 'flex-v023-modal';
    modal.id = 'tmFreeScoreModalV027';
    modal.hidden = true;
    modal.innerHTML = '<div class="flex-v023-modal-card"><h2 data-score-title>Lançar placar</h2><p data-score-description></p><div class="flex-v023-score-grid" data-score-fields></div><div class="flex-v023-actions"><button type="button" class="tm-button secondary" data-score-start>Registrar início</button><button type="button" class="tm-button primary" data-score-save>Salvar placar</button><button type="button" class="tm-button secondary" data-score-close>Fechar</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('[data-score-close]').addEventListener('click', () => { modal.hidden = true; });
    return modal;
  }

  const modal = createScoreModal();

  function openScore(match) {
    if (!match || !modal) return;
    if (F?.fillScoreModal) {
      F.fillScoreModal(modal, match, true);
      return;
    }
    modal.dataset.matchId = match.id;
    modal.querySelector('[data-score-title]').textContent = `${match.player1} × ${match.player2}`;
    modal.querySelector('[data-score-description]').textContent = `Melhor de ${match.bestOf}.`;
    modal.querySelector('[data-score-fields]').innerHTML = Array.from({ length: num(match.bestOf) || 3 }, (_, index) => `<strong>${index + 1}º set</strong><label>${esc(match.player1)}<input type="number" min="0" data-flex-score="${index}-0"></label><label>${esc(match.player2)}<input type="number" min="0" data-flex-score="${index}-1"></label>`).join('');
    modal.hidden = false;
  }

  function modalScores(bestOf) {
    if (F?.scoresFromModal) return F.scoresFromModal(modal, bestOf);
    return Array.from({ length: num(bestOf) || 3 }, (_, index) => [0, 1].map(side => {
      const value = modal.querySelector(`[data-flex-score="${index}-${side}"]`)?.value ?? '';
      return value === '' ? null : Number(value);
    }));
  }

  async function createFreeGame() {
    const player1 = free.p1.value;
    const player2 = free.p2.value;
    if (!player1 || !player2) return TM.toast('Selecione os dois participantes do confronto.', 'warn');
    if (player1 === player2) return TM.toast('Selecione participantes diferentes.', 'warn');
    free.create.disabled = true;
    try {
      const result = await TM.request('tmCriarCampeonato', {
        tipo: 'AVULSO',
        jogador1: player1,
        jogador2: player2,
        melhorDe: free.bestOf.value,
        pontosSet: free.points.value,
        vantagemMinima: free.lead.value,
        pontosVitoria: free.win.value,
        pontosDerrota: free.loss.value
      });
      state = result.state || state;
      TM.toast(result.message || 'Novo confronto criado.');
      populateFreeSelectors();
      renderFreeMatches();
      rankingRender?.();
    } catch (error) {
      TM.toast(error.message, 'error');
    } finally {
      free.create.disabled = Boolean(state.freeOpenMatch);
    }
  }

  function selectedParticipantIds() {
    return [...document.querySelectorAll('#tmPlayers [data-select-player]:checked')].map(input => input.dataset.selectPlayer);
  }

  function setSelectedParticipantIds(ids) {
    const selected = new Set((ids || []).map(text));
    document.querySelectorAll('#tmPlayers [data-select-player]').forEach(input => {
      const shouldCheck = selected.has(text(input.dataset.selectPlayer));
      if (input.checked !== shouldCheck) {
        input.checked = shouldCheck;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function installTournamentEditor() {
    const oldForm = document.getElementById('tmTournamentForm');
    if (!oldForm) return;
    const championship = state.championship || {};
    editMode = Boolean(state.championshipEditable && championship.id);
    const form = document.createElement('form');
    form.id = 'tmTournamentForm';
    form.innerHTML = `<div class="v025-form-heading"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">${editMode ? 'EDIÇÃO DISPONÍVEL' : 'NOVO CAMPEONATO'}</span><h3>${editMode ? `Editar ${esc(championship.name || 'campeonato atual')}` : 'Gerar campeonato'}</h3><p>${editMode ? 'Inclua ou retire participantes e gere os jogos novamente. A edição será bloqueada após o primeiro início.' : 'Selecione os participantes na lista acima e gere os jogos.'}</p></div></div>
      <div class="tm-form-grid cols-3">
        <label>Nome<input id="tmTournamentName" maxlength="60" value="${esc(editMode ? championship.name || '' : '')}" placeholder="Ex.: Campeonato de Julho"></label>
        <label>Sets por jogo<select id="tmBestOf"><option value="1">1 set</option><option value="3">Melhor de 3</option><option value="5">Melhor de 5</option><option value="7">Melhor de 7</option></select></label>
        <label>Pontos por set<input id="tmSetPoints" type="number" min="1" max="99" value="${num(championship.setPoints) || 11}"></label>
        <label>Vantagem mínima<input id="tmMinimumLead" type="number" min="1" max="10" value="${num(championship.minimumLead) || 2}"></label>
        <label>Pontos por vitória<input id="tmWinPoints" type="number" min="0" max="20" value="${championship.winPoints ?? 3}"></label>
        <label>Pontos por derrota<input id="tmLossPoints" type="number" min="0" max="20" value="${championship.lossPoints ?? 0}"></label>
        <label>Máximo por participante<input id="tmMaxGamesPlayer" type="number" min="0" max="100" value="${num(championship.maxGamesPerPlayer)}"><small>0 = sem limite</small></label>
        <label>Máximo total<input id="tmMaxGamesTotal" type="number" min="0" max="1000" value="${num(championship.maxTotalGames)}"><small>0 = sem limite</small></label>
        <label>Repetições de cada confronto<input id="tmTurns" type="number" min="1" max="50" value="${num(championship.turns) || 1}"></label>
        <label>Próximo jogo automático<select id="tmAutoStart"><option value="SIM">SIM</option><option value="NAO">NÃO</option></select></label>
      </div>
      <div class="tm-actions"><button class="tm-button primary" id="tmCreateTournament" type="submit">${editMode ? 'Salvar edição e gerar novamente' : 'Gerar jogos com os selecionados'}</button></div>`;
    oldForm.replaceWith(form);
    form.querySelector('#tmBestOf').value = String(championship.bestOf || 3);
    form.querySelector('#tmAutoStart').value = championship.autoStart || 'SIM';
    if (editMode) setTimeout(() => setSelectedParticipantIds((state.participants || []).map(item => item.id)), 50);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const participants = selectedParticipantIds();
      if (participants.length < 2) return TM.toast('Selecione pelo menos dois participantes.', 'warn');
      const button = form.querySelector('#tmCreateTournament');
      button.disabled = true;
      try {
        const result = await TM.request('tmCriarCampeonato', {
          campeonatoId: editMode ? championship.id : '',
          nome: form.querySelector('#tmTournamentName').value,
          participantes,
          melhorDe: form.querySelector('#tmBestOf').value,
          pontosSet: form.querySelector('#tmSetPoints').value,
          vantagemMinima: form.querySelector('#tmMinimumLead').value,
          pontosVitoria: form.querySelector('#tmWinPoints').value,
          pontosDerrota: form.querySelector('#tmLossPoints').value,
          maxJogosParticipante: form.querySelector('#tmMaxGamesPlayer').value,
          maxJogosTotal: form.querySelector('#tmMaxGamesTotal').value,
          repeticoesConfronto: form.querySelector('#tmTurns').value,
          inicioAutomatico: form.querySelector('#tmAutoStart').value
        });
        TM.toast(result.message || 'Campeonato salvo.');
        setTimeout(() => location.reload(), 600);
      } catch (error) {
        TM.toast(error.message, 'error');
        button.disabled = false;
      }
    });
  }

  function installGlobalRanking() {
    if (!F?.rankingPanel || document.getElementById('flexGlobalRanking-tenis-mesa-admin')) return;
    const panel = F.rankingPanel('Ranking geral do tênis de mesa');
    free.panel.insertAdjacentElement('afterend', panel);
    rankingRender = F.installRanking(panel, () => state, 'tenis');
  }

  async function loadState() {
    const status = document.getElementById('tmAdminConnection');
    try {
      state = await TM.request('tmAdmin');
      if (status) status.textContent = 'Dados atualizados';
      populateFreeSelectors();
      renderFreeMatches();
      installTournamentEditor();
      installGlobalRanking();
    } catch (error) {
      if (status) status.textContent = 'Não foi possível atualizar os dados';
      populateFreeSelectors();
      TM.toast(error.message, 'error');
    }
  }

  free.p1?.addEventListener('change', () => { if (free.p1.value === free.p2.value) free.p2.value = ''; });
  free.p2?.addEventListener('change', () => {
    if (free.p1.value === free.p2.value) {
      TM.toast('O desafiante deve ser diferente do participante que permanece.', 'warn');
      free.p2.value = '';
    }
  });
  free.create?.addEventListener('click', createFreeGame);
  free.list?.addEventListener('click', event => {
    const button = event.target.closest('[data-tm-free-score]');
    if (!button) return;
    const match = (state.freeMatches || []).find(item => item.id === button.dataset.tmFreeScore);
    openScore(match);
  });

  modal?.querySelector('[data-score-start]')?.addEventListener('click', async () => {
    try {
      const result = await TM.request('tmCriarCampeonato', { tipo: 'AVULSO_INICIAR', id: modal.dataset.matchId });
      state = result.state || state;
      TM.toast(result.message || 'Confronto iniciado.');
      modal.hidden = true;
      renderFreeMatches();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  modal?.querySelector('[data-score-save]')?.addEventListener('click', async () => {
    const match = (state.freeMatches || []).find(item => item.id === modal.dataset.matchId);
    if (!match) return;
    try {
      const result = await TM.request('tmCriarCampeonato', {
        tipo: 'AVULSO_RESULTADO',
        id: match.id,
        placar: modalScores(match.bestOf)
      });
      state = result.state || state;
      TM.toast(result.message || 'Resultado salvo. O vencedor permanece.');
      modal.hidden = true;
      populateFreeSelectors();
      renderFreeMatches();
      rankingRender?.();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  const playersTarget = document.getElementById('tmPlayers');
  if (playersTarget) new MutationObserver(populateFreeSelectors).observe(playersTarget, { childList: true, subtree: true });

  populateFreeSelectors();
  renderFreeMatches();
  loadState();
})();
