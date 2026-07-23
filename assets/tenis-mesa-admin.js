(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const ui = {};
  [
    'tmAdminConnection','tmRefresh','tmSheetLink','tmPlayerForm','tmPlayerId','tmPlayerName','tmPlayerAge',
    'tmPlayerSex','tmPlayerActive','tmPlayers','tmSelectAll','tmSelectNone','tmSelectedCount','tmTournamentForm',
    'tmTournamentName','tmBestOf','tmSetPoints','tmMinimumLead','tmWinPoints','tmLossPoints','tmMaxGamesPlayer',
    'tmMaxGamesTotal','tmTurns','tmAutoStart','tmCreateTournament','tmCurrentSummary','tmChampionships',
    'tmAdminRanking','tmAdminMatches','tmMatchSelect','tmScoreFields','tmStartMatch','tmSaveScore','tmScoreForm'
  ].forEach(id => ui[id] = document.getElementById(id));

  let state = { players: [], participants: [], matches: [], ranking: [], championships: [] };
  const selected = new Set();
  let initializedSelection = false;

  function empty(text) {
    const div = document.createElement('div');
    div.className = 'tm-empty';
    div.textContent = text;
    return div;
  }

  function updateSelectedCount() {
    ui.tmSelectedCount.textContent = `${selected.size} participante${selected.size === 1 ? '' : 's'} selecionado${selected.size === 1 ? '' : 's'}`;
  }

  function renderPlayers() {
    ui.tmPlayers.replaceChildren();
    const players = state.players || [];
    if (!players.length) {
      ui.tmPlayers.appendChild(empty('Nenhum participante cadastrado.'));
      return;
    }
    if (!initializedSelection) {
      players.filter(player => player.active === 'SIM').forEach(player => selected.add(player.id));
      initializedSelection = true;
    }
    players.forEach(player => {
      const row = document.createElement('div');
      row.className = 'tm-player-row';
      row.innerHTML = `
        <input type="checkbox" data-select-player="${TM.esc(player.id)}" ${selected.has(player.id) ? 'checked' : ''} ${player.active !== 'SIM' ? 'disabled' : ''}>
        <div style="display:flex;align-items:center;gap:10px"><span class="tm-player-avatar">${TM.esc(player.name.charAt(0).toUpperCase())}</span><div><strong>${TM.esc(player.name)}</strong><small>${player.age} anos${player.sex ? ` • ${player.sex === 'M' ? 'Masculino' : 'Feminino'}` : ''}</small></div></div>
        <span class="tm-chip ${player.active === 'SIM' ? '' : 'dark'}">${TM.esc(player.active)}</span>
        <div style="display:flex;gap:6px"><button class="tm-mini-action" type="button" data-edit-player="${TM.esc(player.id)}">Editar</button><button class="tm-mini-action" type="button" data-delete-player="${TM.esc(player.id)}">Excluir</button></div>`;
      ui.tmPlayers.appendChild(row);
    });
    updateSelectedCount();
  }

  function renderRanking() {
    ui.tmAdminRanking.replaceChildren();
    if (!state.ranking?.length) {
      ui.tmAdminRanking.appendChild(empty('Ranking aguardando jogos.'));
      return;
    }
    state.ranking.forEach(item => {
      const row = document.createElement('article');
      row.className = `tm-rank-row top-${item.position}`;
      row.innerHTML = `
        <div class="tm-position">${item.position}º</div>
        <div class="tm-rank-name"><strong>${TM.esc(item.name)}</strong><small>Saldo de pontos ${item.pointDiff > 0 ? '+' : ''}${item.pointDiff}</small></div>
        <div class="tm-stat">${item.points} pts</div><div class="tm-stat">${item.games} J</div>
        <div class="tm-stat">${item.wins} V</div><div class="tm-stat">${item.losses} D</div>
        <div class="tm-stat">${TM.fmt(item.winRate)}%</div><div class="tm-stat">${item.setDiff > 0 ? '+' : ''}${item.setDiff} sets</div>`;
      ui.tmAdminRanking.appendChild(row);
    });
  }

  function scoreSummary(match) {
    if (!match.scores?.length) return 'Sem placar';
    return `${match.scores.map(s => `${s[0]}–${s[1]}`).join(' | ')} • Sets ${match.sets1} × ${match.sets2}`;
  }

  function renderMatches() {
    ui.tmAdminMatches.replaceChildren();
    if (!state.matches?.length) {
      ui.tmAdminMatches.appendChild(empty('Nenhuma partida gerada.'));
      return;
    }
    state.matches.forEach(match => {
      const card = document.createElement('article');
      card.className = `tm-match${match.status === 'EM_ANDAMENTO' ? ' live' : ''}${match.status === 'FINALIZADO' ? ' final' : ''}`;
      card.innerHTML = `
        <div class="tm-match-head"><strong>Jogo ${match.game} • Rodada ${match.round}</strong><span class="tm-match-status">${TM.esc(match.status)}</span></div>
        <div class="tm-versus"><article><strong>${TM.esc(match.player1)}</strong><small>${match.sets1} sets</small></article><span>×</span><article><strong>${TM.esc(match.player2)}</strong><small>${match.sets2} sets</small></article></div>
        <div class="tm-score-summary">${TM.esc(scoreSummary(match))}</div>
        <div class="tm-match-time">${match.startedAt ? `<span>Início: ${TM.esc(TM.dateTime(match.startedAt))}</span>` : ''}${match.finishedAt ? `<span>Término: ${TM.esc(TM.dateTime(match.finishedAt))}</span>` : ''}</div>`;
      ui.tmAdminMatches.appendChild(card);
    });
  }

  function renderMatchSelect() {
    const current = ui.tmMatchSelect.value;
    ui.tmMatchSelect.innerHTML = '<option value="">Selecione uma partida</option>';
    (state.matches || []).forEach(match => {
      const option = document.createElement('option');
      option.value = String(match.game);
      option.textContent = `Jogo ${match.game} — ${match.player1} × ${match.player2} — ${match.status}`;
      ui.tmMatchSelect.appendChild(option);
    });
    if ([...ui.tmMatchSelect.options].some(option => option.value === current)) ui.tmMatchSelect.value = current;
    renderScoreFields();
  }

  function renderScoreFields() {
    ui.tmScoreFields.replaceChildren();
    const match = state.matches?.find(item => String(item.game) === ui.tmMatchSelect.value);
    const bestOf = Number(state.championship?.bestOf || ui.tmBestOf.value || 3);
    if (!match) {
      ui.tmScoreFields.appendChild(empty('Selecione uma partida para lançar o placar.'));
      ui.tmStartMatch.disabled = true;
      ui.tmSaveScore.disabled = true;
      return;
    }
    ui.tmStartMatch.disabled = match.status === 'FINALIZADO' || match.status === 'EM_ANDAMENTO';
    ui.tmSaveScore.disabled = match.status === 'FINALIZADO';
    for (let index = 0; index < bestOf; index++) {
      const score = match.scores?.[index] || ['', ''];
      const card = document.createElement('div');
      card.className = 'tm-score-set';
      card.innerHTML = `<strong>${index + 1}º set</strong><div class="tm-score-pair"><label>${TM.esc(match.player1)}<input type="number" min="0" step="1" data-score-a="${index}" value="${score[0] ?? ''}"></label><label>${TM.esc(match.player2)}<input type="number" min="0" step="1" data-score-b="${index}" value="${score[1] ?? ''}"></label></div>`;
      ui.tmScoreFields.appendChild(card);
    }
  }

  function renderChampionships() {
    ui.tmChampionships.replaceChildren();
    if (!state.championships?.length) {
      ui.tmChampionships.appendChild(empty('Nenhum campeonato preservado.'));
      return;
    }
    state.championships.forEach(championship => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.openChampionship = championship.id;
      button.innerHTML = `<span><strong>${TM.esc(championship.name)}</strong><small>${TM.esc(championship.status)} • ${championship.participantCount} participantes • ${TM.dateTime(championship.createdAt)}</small></span><span>Ver</span>`;
      ui.tmChampionships.appendChild(button);
    });
  }

  function render() {
    const championship = state.championship;
    ui.tmAdminConnection.textContent = 'Sincronizado com Google Sheets';
    ui.tmCurrentSummary.textContent = championship
      ? `${championship.name} • ${championship.status} • melhor de ${championship.bestOf} • ${championship.setPoints} pontos por set • ${state.matches.length} jogos`
      : 'Nenhum campeonato de tênis de mesa foi gerado.';
    renderPlayers();
    renderRanking();
    renderMatches();
    renderMatchSelect();
    renderChampionships();
  }

  async function refresh(showError = false) {
    ui.tmRefresh.disabled = true;
    try {
      state = await TM.request('tmAdmin');
      render();
    } catch (error) {
      ui.tmAdminConnection.textContent = 'Falha de sincronização';
      if (showError) TM.toast(error.message, 'error');
    } finally { ui.tmRefresh.disabled = false; }
  }

  ui.tmPlayerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const params = {
      id: ui.tmPlayerId.value,
      nome: ui.tmPlayerName.value,
      idade: ui.tmPlayerAge.value,
      sexo: ui.tmPlayerSex.value,
      ativo: ui.tmPlayerActive.value
    };
    try {
      const result = await TM.request('tmSalvarJogador', params);
      TM.toast(result.message || 'Participante salvo.');
      ui.tmPlayerForm.reset();
      ui.tmPlayerId.value = '';
      ui.tmPlayerActive.value = 'SIM';
      state = result.state || await TM.request('tmAdmin');
      initializedSelection = false;
      selected.clear();
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  ui.tmPlayers.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-select-player]');
    if (!checkbox) return;
    if (checkbox.checked) selected.add(checkbox.dataset.selectPlayer); else selected.delete(checkbox.dataset.selectPlayer);
    updateSelectedCount();
  });

  ui.tmPlayers.addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-player]');
    if (edit) {
      const player = state.players.find(item => item.id === edit.dataset.editPlayer);
      if (!player) return;
      ui.tmPlayerId.value = player.id;
      ui.tmPlayerName.value = player.name;
      ui.tmPlayerAge.value = player.age;
      ui.tmPlayerSex.value = player.sex || '';
      ui.tmPlayerActive.value = player.active || 'SIM';
      ui.tmPlayerName.focus();
      return;
    }
    const remove = event.target.closest('[data-delete-player]');
    if (!remove || !confirm('Excluir este participante do cadastro de tênis de mesa?')) return;
    try {
      const result = await TM.request('tmExcluirJogador', { id: remove.dataset.deletePlayer });
      TM.toast(result.message || 'Participante excluído.');
      state = result.state;
      selected.delete(remove.dataset.deletePlayer);
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  ui.tmSelectAll.addEventListener('click', () => {
    (state.players || []).filter(player => player.active === 'SIM').forEach(player => selected.add(player.id));
    renderPlayers();
  });
  ui.tmSelectNone.addEventListener('click', () => { selected.clear(); renderPlayers(); });

  ui.tmTournamentForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (selected.size < 2) return TM.toast('Selecione pelo menos dois participantes.', 'warn');
    ui.tmCreateTournament.disabled = true;
    try {
      const result = await TM.request('tmCriarCampeonato', {
        nome: ui.tmTournamentName.value,
        participantes: [...selected],
        melhorDe: ui.tmBestOf.value,
        pontosSet: ui.tmSetPoints.value,
        vantagemMinima: ui.tmMinimumLead.value,
        pontosVitoria: ui.tmWinPoints.value,
        pontosDerrota: ui.tmLossPoints.value,
        maxJogosParticipante: ui.tmMaxGamesPlayer.value,
        maxJogosTotal: ui.tmMaxGamesTotal.value,
        turnos: ui.tmTurns.value,
        inicioAutomatico: ui.tmAutoStart.value
      });
      TM.toast(result.message || 'Jogos gerados.');
      state = result.state;
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
    finally { ui.tmCreateTournament.disabled = false; }
  });

  ui.tmMatchSelect.addEventListener('change', renderScoreFields);
  ui.tmStartMatch.addEventListener('click', async () => {
    if (!ui.tmMatchSelect.value) return;
    try {
      const result = await TM.request('tmIniciarPartida', { jogo: ui.tmMatchSelect.value });
      TM.toast(result.message || 'Partida iniciada.');
      state = result.state;
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  ui.tmScoreForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ui.tmMatchSelect.value) return TM.toast('Selecione uma partida.', 'warn');
    const bestOf = Number(state.championship?.bestOf || 3);
    const scores = [];
    for (let index = 0; index < bestOf; index++) {
      const a = ui.tmScoreFields.querySelector(`[data-score-a="${index}"]`)?.value ?? '';
      const b = ui.tmScoreFields.querySelector(`[data-score-b="${index}"]`)?.value ?? '';
      if (a === '' && b === '') continue;
      scores.push([a, b]);
    }
    ui.tmSaveScore.disabled = true;
    try {
      const result = await TM.request('tmRegistrarResultado', { jogo: ui.tmMatchSelect.value, placar: scores });
      TM.toast(result.message || 'Resultado salvo.');
      state = result.state;
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
    finally { ui.tmSaveScore.disabled = false; }
  });

  ui.tmChampionships.addEventListener('click', async event => {
    const button = event.target.closest('[data-open-championship]');
    if (!button) return;
    try {
      const result = await TM.request('tmAbrirCampeonato', { id: button.dataset.openChampionship });
      TM.toast(result.message || 'Campeonato selecionado.');
      state = result.state;
      render();
    } catch (error) { TM.toast(error.message, 'error'); }
  });

  ui.tmRefresh.addEventListener('click', () => refresh(true));
  if (ui.tmSheetLink) ui.tmSheetLink.href = TM.C.SHEET_URL;
  refresh(true);
})();
