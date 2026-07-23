(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const ui = {};
  [
    'tmConnection','tmChampionshipName','tmChampionshipMessage','tmParticipantCount','tmGameCount',
    'tmFinishedCount','tmLeader','tmRules','tmRanking','tmMatches','tmSignupForm','tmSignupName',
    'tmSignupAge','tmSignupSex','tmSignupButton','tmSignupMessage'
  ].forEach(id => ui[id] = document.getElementById(id));

  function empty(text) {
    const div = document.createElement('div');
    div.className = 'tm-empty';
    div.textContent = text;
    return div;
  }

  function scoreText(match) {
    if (!Array.isArray(match.scores) || !match.scores.length) return 'Placar ainda não registrado';
    return match.scores.map(score => `${score[0]}–${score[1]}`).join(' | ') + ` • Sets ${match.sets1} × ${match.sets2}`;
  }

  function renderRanking(ranking = []) {
    ui.tmRanking.replaceChildren();
    if (!ranking.length) {
      ui.tmRanking.appendChild(empty('O ranking aparecerá após a geração dos jogos.'));
      return;
    }
    const header = document.createElement('div');
    header.className = 'tm-rank-row header';
    ['Pos.','Participante','Pts','J','V','D','Aprov.','Saldo sets'].forEach(text => {
      const span = document.createElement('span');
      span.textContent = text;
      header.appendChild(span);
    });
    ui.tmRanking.appendChild(header);
    ranking.forEach(item => {
      const row = document.createElement('article');
      row.className = `tm-rank-row top-${item.position}`;
      row.innerHTML = `
        <div class="tm-position">${item.position}º</div>
        <div class="tm-rank-name"><strong>${TM.esc(item.name)}</strong><small>${item.pointsFor}–${item.pointsAgainst} pontos disputados</small></div>
        <div class="tm-stat"><span>Pontos</span>${item.points}</div>
        <div class="tm-stat"><span>Jogos</span>${item.games}</div>
        <div class="tm-stat"><span>Vitórias</span>${item.wins}</div>
        <div class="tm-stat"><span>Derrotas</span>${item.losses}</div>
        <div class="tm-stat"><span>Aproveitamento</span>${TM.fmt(item.winRate)}%</div>
        <div class="tm-stat"><span>Saldo de sets</span>${item.setDiff > 0 ? '+' : ''}${item.setDiff}</div>`;
      ui.tmRanking.appendChild(row);
    });
  }

  function renderMatches(matches = []) {
    ui.tmMatches.replaceChildren();
    if (!matches.length) {
      ui.tmMatches.appendChild(empty('Os jogos ainda não foram gerados.'));
      return;
    }
    matches.forEach(match => {
      const card = document.createElement('article');
      const live = match.status === 'EM_ANDAMENTO';
      const final = match.status === 'FINALIZADO';
      card.className = `tm-match${live ? ' live' : ''}${final ? ' final' : ''}`;
      const p1Winner = match.winnerId && match.winnerId === match.player1Id;
      const p2Winner = match.winnerId && match.winnerId === match.player2Id;
      card.innerHTML = `
        <div class="tm-match-head"><strong>Jogo ${match.game} <small>• Rodada ${match.round}</small></strong><span class="tm-match-status">${TM.esc(match.status)}</span></div>
        <div class="tm-versus">
          <article class="${p1Winner ? 'winner' : ''}"><strong>${TM.esc(match.player1)}</strong><small>${final ? `${match.sets1} sets` : 'Participante 1'}</small></article>
          <span>×</span>
          <article class="${p2Winner ? 'winner' : ''}"><strong>${TM.esc(match.player2)}</strong><small>${final ? `${match.sets2} sets` : 'Participante 2'}</small></article>
        </div>
        <div class="tm-score-summary">${TM.esc(scoreText(match))}</div>
        <div class="tm-match-time">${match.startedAt ? `<span>Início: ${TM.esc(TM.dateTime(match.startedAt))}</span>` : ''}${match.finishedAt ? `<span>Término: ${TM.esc(TM.dateTime(match.finishedAt))}</span>` : ''}</div>`;
      ui.tmMatches.appendChild(card);
    });
  }

  function render(state) {
    const championship = state.championship;
    const ranking = state.ranking || [];
    const matches = state.matches || [];
    ui.tmConnection.textContent = 'Sincronizado com Google Sheets';
    ui.tmChampionshipName.textContent = championship?.name || 'Nenhum campeonato ativo';
    ui.tmChampionshipMessage.textContent = championship?.message || 'As inscrições estão abertas. O administrador ainda não gerou os jogos.';
    ui.tmParticipantCount.textContent = state.participants?.length || 0;
    ui.tmGameCount.textContent = matches.length;
    ui.tmFinishedCount.textContent = matches.filter(match => match.status === 'FINALIZADO').length;
    ui.tmLeader.textContent = ranking[0]?.name || 'A definir';
    ui.tmRules.textContent = championship
      ? `Melhor de ${championship.bestOf} • ${championship.setPoints} pontos por set • vantagem mínima de ${championship.minimumLead} • vitória vale ${championship.winPoints} ponto(s)`
      : 'Formato ainda não definido.';
    renderRanking(ranking);
    renderMatches(matches);
  }

  async function refresh(showError = false) {
    try {
      render(await TM.request('tmEstado'));
    } catch (error) {
      ui.tmConnection.textContent = 'Falha de sincronização';
      if (showError) TM.toast(error.message, 'error');
    }
  }

  ui.tmSignupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const params = {
      nome: ui.tmSignupName.value,
      idade: ui.tmSignupAge.value,
      sexo: ui.tmSignupSex.value
    };
    ui.tmSignupButton.disabled = true;
    ui.tmSignupButton.textContent = 'Inscrevendo...';
    try {
      const result = await TM.request('tmInscrever', params);
      ui.tmSignupMessage.textContent = result.message || 'Inscrição confirmada.';
      ui.tmSignupForm.reset();
      TM.toast(result.message || 'Inscrição confirmada.');
      await refresh();
    } catch (error) {
      ui.tmSignupMessage.textContent = error.message;
      TM.toast(error.message, 'error');
    } finally {
      ui.tmSignupButton.disabled = false;
      ui.tmSignupButton.textContent = 'Confirmar inscrição';
    }
  });

  refresh(true);
  setInterval(() => refresh(false), 5000);
})();
