(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;

  const V = window.Volei;
  const C = V.C;
  const ui = {};
  let current = null;
  let countdownTimer = null;

  [
    'connectionDot','connectionText','eventTitle','eventMessage','auditLine',
    'countA','countB','countTeams','countAHero','countBHero','countTeamsHero',
    'potAList','potBList','teamsGrid','balanceSummary','bracket',
    'signupForm','signupName','signupBirth','signupScore','signupButton','signupMessage',
    'countdownStage','countdownClock','countdownMessage','countdownProgress'
  ].forEach(id => ui[id] = document.getElementById(id));

  function connection(mode, text) {
    ui.connectionDot.className = `status-dot ${mode}`;
    ui.connectionText.textContent = text;
  }

  function players(target, list) {
    target.innerHTML = list.length
      ? list.map(player => `
        <div class="player">
          <span class="player-avatar">${V.esc(player.name.charAt(0).toUpperCase())}</span>
          <strong>${V.esc(player.name)}</strong>
          <span class="age-pill">${V.esc(player.age)} anos</span>
        </div>`).join('')
      : '<div class="empty">Nenhum participante inscrito.</div>';
  }

  function teams(list) {
    ui.teamsGrid.innerHTML = list.length
      ? list.map((team, index) => `
        <article class="team card">
          <div class="team-head"><span>DUPLA ${String(index + 1).padStart(2, '0')}</span><span class="team-icon">🏐</span></div>
          <div class="team-members">
            <div class="team-member"><span class="member-role">Adulto</span><strong>${V.esc(team.adult)}</strong></div>
            <div class="team-member"><span class="member-role">Criança</span><strong>${V.esc(team.child)}</strong></div>
          </div>
        </article>`).join('')
      : '<article class="team card"><div class="empty">Equipes ainda não sorteadas.</div></article>';
  }

  function scoreCells(match, side) {
    return match.scores.map(set => `<b>${set?.[side] === null || set?.[side] === undefined ? '–' : V.esc(set[side])}</b>`).join('');
  }

  function status(match) {
    if (match.status === 'FINALIZADO') return `Finalizada${match.finishedAt ? ' • ' + V.dateTime(match.finishedAt) : ''}`;
    if (!match.team1 || !match.team2) return 'Aguardando definição das equipes';
    if (!match.availableAt) return 'Aguardando a partida anterior';
    const date = V.date(match.availableAt);
    return date && date.getTime() > Date.now()
      ? `Intervalo • liberada em ${V.dateTime(match.availableAt)}`
      : 'Partida liberada';
  }

  function bracket(rounds) {
    ui.bracket.innerHTML = rounds.length
      ? rounds.map(round => `
        <section class="round">
          <h3>${V.esc(round.name)}</h3>
          <div class="matches">
            ${round.matches.map(match => {
              V.match(match);
              const teamA = V.teamName(match.team1) || match.team1Placeholder || 'A definir';
              const teamB = V.teamName(match.team2) || match.team2Placeholder || 'A definir';
              return `<article class="match card">
                <div class="match-top"><span>Jogo ${V.esc(match.game)}</span><span>${V.esc(match.phase || round.name)}</span></div>
                <div class="score-head"><span></span><b>1º</b><b>2º</b><b>3º</b><b>Sets</b></div>
                <div class="score-row ${match.winnerId === match.team1?.id ? 'winner' : ''}"><span>${V.esc(teamA)}</span>${scoreCells(match, 0)}<strong>${match.sets1}</strong></div>
                <div class="score-row ${match.winnerId === match.team2?.id ? 'winner' : ''}"><span>${V.esc(teamB)}</span>${scoreCells(match, 1)}<strong>${match.sets2}</strong></div>
                <span class="match-status">${V.esc(status(match))}</span>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')
      : '<article class="match card"><div class="empty">Chaveamento aguardando o sorteio.</div></article>';
  }

  function stopCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    ui.countdownStage.hidden = true;
    document.body.classList.remove('countdown-active');
  }

  function startCountdown(state) {
    const target = V.date(state.inicioPrevisto);
    if (!target) {
      stopCountdown();
      return;
    }

    ui.countdownStage.hidden = false;
    document.body.classList.add('countdown-active');
    ui.countdownMessage.textContent = 'Preparando a formação das duplas, a final e a disputa de terceiro lugar.';
    const total = Math.max(1, Number(state.rules?.countdownSeconds || 600));

    const update = () => {
      const remaining = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 1000));
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      ui.countdownClock.textContent = `${minutes}:${seconds}`;
      ui.countdownProgress.style.width = `${Math.max(0, Math.min(100, ((total - remaining) / total) * 100))}%`;
      if (remaining <= 0) {
        ui.countdownMessage.textContent = 'Realizando o sorteio...';
        clearInterval(countdownTimer);
        countdownTimer = null;
        setTimeout(refresh, 1200);
      }
    };

    if (countdownTimer) clearInterval(countdownTimer);
    update();
    countdownTimer = setInterval(update, 1000);
  }

  function render(state) {
    current = state;
    const active = state.players.filter(player => String(player.active || 'SIM').toUpperCase() === 'SIM');
    const adults = active.filter(player => player.pot === 'A').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const children = active.filter(player => player.pot === 'B').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const teamCount = Math.min(adults.length, children.length);

    ui.eventTitle.textContent = state.title;
    ui.eventMessage.textContent = state.message;
    ui.countA.textContent = adults.length;
    ui.countB.textContent = children.length;
    ui.countTeams.textContent = teamCount;
    ui.countAHero.textContent = adults.length;
    ui.countBHero.textContent = children.length;
    ui.countTeamsHero.textContent = teamCount;

    players(ui.potAList, adults);
    players(ui.potBList, children);
    teams(state.teams);
    bracket(state.rounds);

    ui.balanceSummary.textContent = state.teams.length
      ? `${state.teams.length} duplas formadas para a competição.`
      : 'As equipes serão reveladas após a contagem regressiva.';
    ui.auditLine.textContent = C.DEMO_MODE || !C.API_BASE
      ? 'Modo local'
      : 'Dados sincronizados • Atualização automática';
    connection(C.DEMO_MODE || !C.API_BASE ? 'warn' : 'ok', C.DEMO_MODE || !C.API_BASE ? 'Modo local' : 'Sincronizado');

    const counting = String(state.status || '').toUpperCase() === 'EM_CONTAGEM';
    if (counting) startCountdown(state);
    else stopCountdown();

    const closed = ['EM_CONTAGEM', 'SORTEADO', 'EM_ANDAMENTO', 'FINALIZADO', 'ENCERRADO'].includes(String(state.status || '').toUpperCase());
    [...ui.signupForm.elements].forEach(element => element.disabled = closed);
    if (closed) {
      ui.signupButton.textContent = 'Inscrições encerradas';
    } else {
      ui.signupButton.textContent = 'Confirmar inscrição';
    }
  }

  async function refresh() {
    try {
      render(await V.request('estado'));
    } catch (error) {
      connection('warn', error.message);
      if (!current) render(V.read());
    }
  }

  ui.signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    ui.signupMessage.className = 'message';
    ui.signupMessage.textContent = '';
    const old = ui.signupButton.textContent;
    ui.signupButton.disabled = true;
    ui.signupButton.textContent = 'Inscrevendo...';
    try {
      const result = await V.request('inscrever', {
        nome: ui.signupName.value,
        dataNascimento: ui.signupBirth.value,
        nota: ui.signupScore.value
      });
      ui.signupMessage.className = 'message ok';
      ui.signupMessage.textContent = result.message || result.mensagem || 'Inscrição confirmada.';
      ui.signupForm.reset();
      await refresh();
    } catch (error) {
      ui.signupMessage.className = 'message error';
      ui.signupMessage.textContent = error.message;
    } finally {
      ui.signupButton.disabled = false;
      ui.signupButton.textContent = old;
    }
  });

  refresh();
  setInterval(refresh, Number(C.POLL_INTERVAL_MS || 5000));
  window.addEventListener('storage', event => {
    if (event.key === V.KEY) refresh();
  });
})();
