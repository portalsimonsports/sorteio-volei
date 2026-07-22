(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;

  const V = window.Volei;
  const C = V.C;
  const ui = {};
  const THIRD_PLACE_PHASE = 'DISPUTA DE 3º LUGAR';
  const EVENT_TIMEZONE = C.EVENT_TIMEZONE || 'America/Sao_Paulo';
  const EVENT_DATE = String(C.EVENT_DATE || '2026-07-22');
  const REGISTRATION_CLOSE_TIME = String(C.REGISTRATION_CLOSE_TIME || '09:50');
  const COUNTDOWN_START_TIME = String(C.COUNTDOWN_START_TIME || '09:55');
  const FIRST_MATCH_TIME = String(C.FIRST_MATCH_TIME || '10:15');
  let current = null;
  let countdownTimer = null;
  let liveTimer = null;
  let weatherTimer = null;

  [
    'connectionDot','connectionText','eventTitle','eventMessage','auditLine',
    'countA','countB','countTeams','countAHero','countBHero','countTeamsHero',
    'potAList','potBList','teamsGrid','balanceSummary','bracket',
    'signupForm','signupName','signupAge','signupScore','signupButton','signupMessage',
    'countdownStage','countdownClock','countdownMessage','countdownProgress',
    'placementSummary','championName','thirdPlaceName',
    'liveTime','liveDate','weatherIcon','weatherTemperature','weatherCondition','weatherWind',
    'firstMatchCountdown','firstMatchTarget'
  ].forEach(id => ui[id] = document.getElementById(id));

  function connection(mode, text) {
    ui.connectionDot.className = `status-dot ${mode}`;
    ui.connectionText.textContent = text;
  }

  function players(target, list) {
    target.innerHTML = list.length
      ? list.map(player => `<div class="player"><span class="player-avatar">${V.esc(player.name.charAt(0).toUpperCase())}</span><strong>${V.esc(player.name)}</strong><span class="age-pill">${V.esc(player.age)} anos</span></div>`).join('')
      : '<div class="empty">Nenhum participante inscrito.</div>';
  }

  function memberRole(pot) { return String(pot).toUpperCase() === 'A' ? 'Adulto' : 'Criança'; }

  function teams(list) {
    ui.teamsGrid.innerHTML = list.length
      ? list.map((team, index) => `<article class="team card">
          <div class="team-head"><span>DUPLA ${String(index + 1).padStart(2, '0')}</span><span class="team-icon">🏐</span></div>
          <div class="team-members">
            <div class="team-member"><span class="member-role">${memberRole(team.member1Pot)}</span><strong>${V.esc(team.member1)}</strong></div>
            <div class="team-member"><span class="member-role">${memberRole(team.member2Pot)}</span><strong>${V.esc(team.member2)}</strong></div>
          </div>
        </article>`).join('')
      : '<article class="team card"><div class="empty">Equipes ainda não sorteadas.</div></article>';
  }

  function scoreCells(match, side) {
    return match.scores.map(set => `<b>${set?.[side] === null || set?.[side] === undefined ? '–' : V.esc(set[side])}</b>`).join('');
  }

  function matchStatus(match) {
    if (match.status === 'BYE') return 'Classificada diretamente para a próxima fase';
    if (match.status === 'VAZIO') return 'Confronto não utilizado';
    if (match.status === 'FINALIZADO') return `Finalizada${match.finishedAt ? ' • ' + V.dateTime(match.finishedAt) : ''}`;
    if (!match.team1 || !match.team2) return 'Aguardando definição das equipes';
    if (!match.availableAt) return 'Aguardando a partida anterior';
    const date = V.date(match.availableAt);
    return date && date.getTime() > Date.now() ? `Intervalo • liberada em ${V.dateTime(match.availableAt)}` : 'Partida liberada';
  }

  function phaseClass(match) {
    const phase = String(match.phase || '').toUpperCase();
    if (phase === THIRD_PLACE_PHASE) return 'third-place-match';
    if (phase === 'FINAL') return 'final-match';
    if (match.status === 'BYE') return 'bye-match';
    return '';
  }

  function displayTeam(match, side) {
    const team = side === 1 ? match.team1 : match.team2;
    const placeholder = side === 1 ? match.team1Placeholder : match.team2Placeholder;
    if (team) return V.teamName(team);
    if (match.status === 'BYE') return 'BYE — classificação direta';
    return placeholder || 'A definir';
  }

  function loserOf(match) {
    if (!match?.winnerId || !match.team1 || !match.team2) return null;
    return match.team1.id === match.winnerId ? match.team2 : match.team1;
  }

  function ensureThirdPlaceRound(rounds) {
    const normalized = (rounds || []).map(round => ({ ...round, matches: [...(round.matches || [])] }));
    const all = normalized.flatMap(round => round.matches);
    if (all.some(match => String(match.phase || '').toUpperCase() === THIRD_PLACE_PHASE)) return normalized;
    const semifinals = all.filter(match => String(match.phase || '').toUpperCase() === 'SEMIFINAL').sort((a, b) => Number(a.game) - Number(b.game));
    if (semifinals.length < 2) return normalized;
    let decisions = normalized.find(round => round.matches.some(match => String(match.phase || '').toUpperCase() === 'FINAL'));
    if (!decisions) { decisions = { index: normalized.length, name: 'DECISÕES', matches: [] }; normalized.push(decisions); }
    else decisions.name = 'DECISÕES';
    const synthetic = {
      game: Math.max(0, ...all.map(match => Number(match.game) || 0)) + 1,
      roundIndex: Number(decisions.index || normalized.length - 1), phase: THIRD_PLACE_PHASE,
      team1: loserOf(semifinals[0]), team2: loserOf(semifinals[1]),
      team1Placeholder: `Perdedor Jogo ${semifinals[0].game}`, team2Placeholder: `Perdedor Jogo ${semifinals[1].game}`,
      scores: [[null, null], [null, null], [null, null]], sets1: 0, sets2: 0,
      winnerId: '', status: 'AGUARDANDO', finishedAt: '', availableAt: '', nextGame: 0, nextSlot: 0
    };
    V.match(synthetic);
    decisions.matches.push(synthetic);
    return normalized;
  }

  function renderPlacements(rounds) {
    const matches = rounds.flatMap(round => round.matches);
    const final = matches.find(match => String(match.phase || '').toUpperCase() === 'FINAL');
    const third = matches.find(match => String(match.phase || '').toUpperCase() === THIRD_PLACE_PHASE);
    if (!final && !third) { ui.placementSummary.hidden = true; return; }
    ui.placementSummary.hidden = false;
    ui.championName.textContent = final && V.winner(final) ? V.teamName(V.winner(final)) : 'A definir';
    ui.thirdPlaceName.textContent = third && V.winner(third) ? V.teamName(V.winner(third)) : 'A definir';
  }

  function bracket(sourceRounds) {
    const rounds = ensureThirdPlaceRound(sourceRounds);
    ui.bracket.innerHTML = rounds.length
      ? rounds.map(round => {
        const decisions = round.matches.some(match => ['FINAL', THIRD_PLACE_PHASE].includes(String(match.phase || '').toUpperCase()));
        return `<section class="round ${decisions ? 'decisions-round' : ''}"><h3>${V.esc(round.name)}</h3><div class="matches">${round.matches.map(match => {
          V.match(match);
          const phase = String(match.phase || round.name).toUpperCase();
          const phaseLabel = phase === THIRD_PLACE_PHASE ? '🥉 DISPUTA DE 3º LUGAR' : phase === 'FINAL' ? '🏆 FINAL' : phase;
          return `<article class="match card ${phaseClass(match)}">
            <div class="match-top"><span>Jogo ${V.esc(match.game)}</span><span>${V.esc(phaseLabel)}</span></div>
            <div class="score-head"><span>Dupla</span><b>1º</b><b>2º</b><b>3º</b><b>Sets</b></div>
            <div class="score-row ${match.winnerId === match.team1?.id ? 'winner' : ''}"><span>${V.esc(displayTeam(match, 1))}</span>${scoreCells(match, 0)}<strong>${match.sets1}</strong></div>
            <div class="score-row ${match.winnerId === match.team2?.id ? 'winner' : ''}"><span>${V.esc(displayTeam(match, 2))}</span>${scoreCells(match, 1)}<strong>${match.sets2}</strong></div>
            <span class="match-status">${V.esc(matchStatus(match))}</span></article>`;
        }).join('')}</div></section>`;
      }).join('')
      : '<article class="match card"><div class="empty">Chaveamento aguardando o sorteio.</div></article>';
    renderPlacements(rounds);
  }

  function zonedParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: EVENT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  }

  function zonedDate(year, month, day, hour, minute) {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const guessed = zonedParts(new Date(utcGuess));
    const representedUtc = Date.UTC(+guessed.year, +guessed.month - 1, +guessed.day, +guessed.hour, +guessed.minute, +guessed.second);
    return new Date(utcGuess - (representedUtc - utcGuess));
  }

  function eventMoment(time) {
    const [year, month, day] = EVENT_DATE.split('-').map(Number);
    const [hour, minute] = String(time).split(':').map(Number);
    return zonedDate(year, month, day, hour, minute);
  }

  function registrationIsOpen(state, now = new Date()) {
    if (typeof state?.registrationOpen === 'boolean') return state.registrationOpen;
    const blockedStatus = ['EM_CONTAGEM','SORTEADO','EM_ANDAMENTO','FINALIZADO','ENCERRADO'].includes(String(state?.status || '').toUpperCase());
    return !blockedStatus && now.getTime() < eventMoment(REGISTRATION_CLOSE_TIME).getTime();
  }

  function stopCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    ui.countdownStage.hidden = true;
    document.body.classList.remove('countdown-active');
  }

  function startCountdown(target, totalSeconds) {
    ui.countdownStage.hidden = false;
    document.body.classList.add('countdown-active');
    ui.countdownMessage.textContent = 'Preparando as duplas, o chaveamento, a final e a disputa de terceiro lugar.';
    const total = Math.max(1, Number(totalSeconds || C.COUNTDOWN_SECONDS || 1200));
    const update = () => {
      const remaining = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 1000));
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      ui.countdownClock.textContent = `${minutes}:${seconds}`;
      ui.countdownProgress.style.width = `${Math.max(0, Math.min(100, ((total - remaining) / total) * 100))}%`;
      if (remaining <= 0) { clearInterval(countdownTimer); countdownTimer = null; ui.countdownMessage.textContent = 'Primeira partida iniciada.'; setTimeout(refresh, 1200); }
    };
    if (countdownTimer) clearInterval(countdownTimer);
    update();
    countdownTimer = setInterval(update, 1000);
  }

  function updateLiveInformation() {
    const now = new Date();
    ui.liveTime.textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: EVENT_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    ui.liveDate.textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: EVENT_TIMEZONE, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now);
    const target = eventMoment(FIRST_MATCH_TIME);
    const seconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
    const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = seconds % 60;
    ui.firstMatchCountdown.textContent = seconds > 0
      ? `${days ? String(days).padStart(2, '0') + 'd ' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : 'INICIADA';
    ui.firstMatchTarget.textContent = `Início: ${new Intl.DateTimeFormat('pt-BR', { timeZone: EVENT_TIMEZONE, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(target)}`;

    const countdownStart = eventMoment(COUNTDOWN_START_TIME);
    if (now >= countdownStart && now < target) startCountdown(target, Math.round((target - countdownStart) / 1000));
    else if (String(current?.status || '').toUpperCase() !== 'EM_CONTAGEM') stopCountdown();
  }

  function windDirection(degrees) {
    const points = ['N','NNE','NE','ENE','L','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
    const normalized = ((Number(degrees) % 360) + 360) % 360;
    return points[Math.round(normalized / 22.5) % 16];
  }

  function weatherDescription(code) {
    const map = {0:['Céu limpo','☀️'],1:['Predominantemente limpo','🌤️'],2:['Parcialmente nublado','⛅'],3:['Nublado','☁️'],45:['Neblina','🌫️'],48:['Neblina com geada','🌫️'],51:['Garoa fraca','🌦️'],53:['Garoa moderada','🌦️'],55:['Garoa intensa','🌧️'],61:['Chuva fraca','🌦️'],63:['Chuva moderada','🌧️'],65:['Chuva forte','🌧️'],80:['Pancadas fracas','🌦️'],81:['Pancadas moderadas','🌧️'],82:['Pancadas fortes','⛈️'],95:['Trovoadas','⛈️'],96:['Trovoadas com granizo','⛈️'],99:['Trovoadas fortes com granizo','⛈️']};
    return map[Number(code)] || ['Condição variável', '🌤️'];
  }

  async function updateWeather() {
    const latitude = Number(C.WEATHER_LATITUDE), longitude = Number(C.WEATHER_LONGITUDE);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude); url.searchParams.set('longitude', longitude);
      url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m');
      url.searchParams.set('timezone', EVENT_TIMEZONE);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao consultar o clima.');
      const weather = (await response.json()).current || {};
      const [description, icon] = weatherDescription(weather.weather_code);
      ui.weatherIcon.textContent = icon;
      ui.weatherTemperature.textContent = `${Math.round(Number(weather.temperature_2m))}°C`;
      ui.weatherCondition.textContent = description;
      ui.weatherWind.textContent = `Vento: ${Math.round(Number(weather.wind_speed_10m))} km/h • ${windDirection(weather.wind_direction_10m)} (${Math.round(Number(weather.wind_direction_10m))}°)`;
    } catch {
      ui.weatherCondition.textContent = 'Clima temporariamente indisponível';
      ui.weatherWind.textContent = 'Nova tentativa automática em alguns minutos';
    }
  }

  function startLiveServices() {
    if (liveTimer) clearInterval(liveTimer);
    if (weatherTimer) clearInterval(weatherTimer);
    updateLiveInformation(); updateWeather();
    liveTimer = setInterval(updateLiveInformation, 1000);
    weatherTimer = setInterval(updateWeather, 10 * 60 * 1000);
  }

  function render(state) {
    current = state;
    const active = state.players.filter(player => String(player.active || 'SIM').toUpperCase() === 'SIM');
    const adults = active.filter(player => player.pot === 'A').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const children = active.filter(player => player.pot === 'B').sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const teamCount = Math.floor(active.length / 2);
    ui.eventTitle.textContent = state.title;
    ui.eventMessage.textContent = state.message;
    [ui.countA, ui.countAHero].forEach(item => item.textContent = adults.length);
    [ui.countB, ui.countBHero].forEach(item => item.textContent = children.length);
    [ui.countTeams, ui.countTeamsHero].forEach(item => item.textContent = teamCount);
    players(ui.potAList, adults); players(ui.potBList, children); teams(state.teams); bracket(state.rounds);
    ui.balanceSummary.textContent = state.teams.length ? `${state.teams.length} duplas formadas para a competição.` : 'As equipes serão reveladas após a contagem regressiva.';
    ui.auditLine.textContent = C.DEMO_MODE || !C.API_BASE ? 'Modo local' : 'Dados sincronizados • Atualização automática';
    connection(C.DEMO_MODE || !C.API_BASE ? 'warn' : 'ok', C.DEMO_MODE || !C.API_BASE ? 'Modo local' : 'Sincronizado');

    const scheduledTarget = eventMoment(FIRST_MATCH_TIME);
    const statusCounting = String(state.status || '').toUpperCase() === 'EM_CONTAGEM';
    if (statusCounting) startCountdown(V.date(state.inicioPrevisto) || scheduledTarget, state.rules?.countdownSeconds || C.COUNTDOWN_SECONDS);
    else updateLiveInformation();

    const open = registrationIsOpen(state);
    [...ui.signupForm.elements].forEach(element => element.disabled = !open);
    ui.signupButton.textContent = open ? 'Confirmar inscrição' : 'Inscrições encerradas';
  }

  async function refresh() {
    try { render(await V.request('estado')); }
    catch (error) { connection('warn', error.message); if (!current) render(V.read()); }
  }

  ui.signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    ui.signupMessage.className = 'message'; ui.signupMessage.textContent = '';
    if (!registrationIsOpen(current)) { ui.signupMessage.className = 'message error'; ui.signupMessage.textContent = 'As inscrições foram encerradas às 09h50.'; return; }
    const old = ui.signupButton.textContent;
    ui.signupButton.disabled = true; ui.signupButton.textContent = 'Inscrevendo...';
    try {
      const age = Number(ui.signupAge.value);
      const result = await V.request('inscrever', {
        nome: ui.signupName.value,
        idade: age,
        dataNascimento: V.syntheticBirthDate(age),
        nota: ui.signupScore.value
      });
      ui.signupMessage.className = 'message ok';
      ui.signupMessage.textContent = result.message || result.mensagem || 'Inscrição confirmada.';
      ui.signupForm.reset(); await refresh();
    } catch (error) {
      ui.signupMessage.className = 'message error'; ui.signupMessage.textContent = error.message;
    } finally {
      ui.signupButton.disabled = !registrationIsOpen(current);
      ui.signupButton.textContent = registrationIsOpen(current) ? old : 'Inscrições encerradas';
    }
  });

  startLiveServices(); refresh();
  setInterval(refresh, Number(C.POLL_INTERVAL_MS || 5000));
  window.addEventListener('storage', event => { if (event.key === V.KEY) refresh(); });
})();
