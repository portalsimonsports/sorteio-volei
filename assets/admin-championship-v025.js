(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin') return;
  const V = window.Volei;
  const A = window.VoleiAdmin;
  const F = window.FlexV023;
  if (!V || !A || !F || !V.championshipRequest) return;

  const form = document.getElementById('championshipForm');
  const historyTarget = document.getElementById('championshipHistory');
  const historyStatus = document.getElementById('championshipHistoryStatus');
  if (!form || !historyTarget) return;

  let state = null;
  let championships = [];
  let editMode = false;
  let rankingRender = null;

  const text = value => String(value ?? '').trim();
  const esc = F.esc;
  const num = F.num;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function dateText(value) {
    const date = V.date?.(value);
    return date ? date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : (text(value) || '—');
  }

  function activePlayerIds(currentState = state) {
    return F.activeIdsFromTeams(currentState || {});
  }

  function activePlayers() {
    return (state?.players || []).filter(player => String(player.active || 'SIM').toUpperCase() === 'SIM');
  }

  function selectedIds() {
    return [...form.querySelectorAll('input[name="v025ChampParticipant"]:checked')].map(input => input.value);
  }

  function settings() {
    const championshipSettings = state?.championship?.settings || {};
    return {
      name: state?.championship?.name || '',
      teamSize: championshipSettings.teamSize || state?.competition?.teamSize || 2,
      format: championshipSettings.format || state?.competition?.format || 'MATA_MATA',
      bracket: championshipSettings.bracketModel || 'AUTOMATICO',
      repeat: championshipSettings.repeticoesConfronto || 1,
      bestOf: championshipSettings.bestOf || state?.rules?.bestOf || 3,
      normal: championshipSettings.normalPoints || state?.rules?.normalSetPoints || 25,
      tie: championshipSettings.tiebreakPoints || state?.rules?.tiebreakSetPoints || 15,
      lead: championshipSettings.minimumLead || state?.rules?.minimumLead || 2
    };
  }

  function participantRows(selected = []) {
    const selectedSet = new Set(selected.map(text));
    return activePlayers().map(player => `
      <label class="v025-player-option">
        <input type="checkbox" name="v025ChampParticipant" value="${esc(player.id)}" ${selectedSet.has(text(player.id)) ? 'checked' : ''}>
        <span><strong>${esc(player.name)}</strong><small>${num(player.age)} anos</small></span>
      </label>`).join('');
  }

  function renderForm(forceEdit = false) {
    editMode = Boolean(forceEdit && state?.championshipEditable && state?.championship);
    const cfg = settings();
    const selected = editMode ? activePlayerIds() : activePlayers().map(player => player.id);
    const title = editMode ? `Editar ${state.championship.name}` : 'Gerar nova competição';
    const description = editMode
      ? 'Inclua ou retire participantes e gere novamente o chaveamento. Esta opção será bloqueada após o primeiro início real.'
      : 'Escolha diretamente os participantes que entrarão no campeonato. O sistema formará as equipes usando o índice interno.';

    form.innerHTML = `
      <div class="v025-form-heading">
        <div><span class="kicker">${editMode ? 'EDIÇÃO LIBERADA' : 'NOVA EDIÇÃO'}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></div>
        ${state?.championshipEditable ? `<button class="btn secondary small" type="button" id="v025ToggleEdit">${editMode ? 'Cancelar edição' : 'Editar campeonato atual'}</button>` : ''}
      </div>
      <div class="championship-form-grid v025-champ-grid">
        <label>Nome do campeonato<input id="v025ChampName" maxlength="60" value="${esc(editMode ? cfg.name : '')}" placeholder="Ex.: Campeonato 3"></label>
        <label>Participantes por equipe<select id="v025TeamSize">${[2,3,4,5,6].map(value => `<option value="${value}" ${Number(cfg.teamSize) === value ? 'selected' : ''}>${value} participantes</option>`).join('')}</select></label>
        <label>Formato<select id="v025Format"><option value="MATA_MATA" ${cfg.format !== 'TODOS_CONTRA_TODOS' ? 'selected' : ''}>Mata-mata</option><option value="TODOS_CONTRA_TODOS" ${cfg.format === 'TODOS_CONTRA_TODOS' ? 'selected' : ''}>Todos contra todos</option></select></label>
        <label>Modelo do mata-mata<select id="v025Bracket"><option value="AUTOMATICO" ${cfg.bracket !== 'REPESCAGEM_5' ? 'selected' : ''}>Automático</option><option value="REPESCAGEM_5" ${cfg.bracket === 'REPESCAGEM_5' ? 'selected' : ''}>5 equipes: folga e repescagem</option></select></label>
        <label>Confrontos por par<input id="v025Repeat" type="number" min="1" max="50" value="${num(cfg.repeat) || 1}"></label>
        <label>Sets<select id="v025BestOf"><option value="1" ${Number(cfg.bestOf) === 1 ? 'selected' : ''}>1 set</option><option value="3" ${Number(cfg.bestOf) === 3 ? 'selected' : ''}>Melhor de 3</option><option value="5" ${Number(cfg.bestOf) === 5 ? 'selected' : ''}>Melhor de 5</option></select></label>
        <label>Pontos normais<input id="v025Normal" type="number" min="1" max="99" value="${num(cfg.normal) || 25}"></label>
        <label>Pontos decisivo<input id="v025Tie" type="number" min="1" max="99" value="${num(cfg.tie) || 15}"></label>
        <label>Vantagem mínima<input id="v025Lead" type="number" min="1" max="10" value="${num(cfg.lead) || 2}"></label>
      </div>
      <div class="v025-selection-header">
        <div><strong>Participantes do campeonato</strong><small>Lista única. As equipes só serão formadas depois que você salvar.</small></div>
        <div class="flex-v023-toolbar"><button class="btn light small" type="button" id="v025SelectAll">Selecionar ativos</button><button class="btn light small" type="button" id="v025ClearAll">Limpar</button></div>
      </div>
      <div class="v025-player-list">${participantRows(selected)}</div>
      <div class="v025-form-footer">
        <span id="v025SelectedCount"></span>
        <button class="btn primary" id="v025SaveChampionship" type="submit">${editMode ? 'Salvar edição e gerar novamente' : 'Criar campeonato'}</button>
      </div>`;

    const updateCount = () => {
      const count = selectedIds().length;
      const target = document.getElementById('v025SelectedCount');
      if (target) target.textContent = `${count} participante${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`;
    };
    form.addEventListener('change', updateCount);
    document.getElementById('v025SelectAll')?.addEventListener('click', () => {
      form.querySelectorAll('input[name="v025ChampParticipant"]').forEach(input => { input.checked = true; });
      updateCount();
    });
    document.getElementById('v025ClearAll')?.addEventListener('click', () => {
      form.querySelectorAll('input[name="v025ChampParticipant"]').forEach(input => { input.checked = false; });
      updateCount();
    });
    document.getElementById('v025ToggleEdit')?.addEventListener('click', () => renderForm(!editMode));
    updateCount();
  }

  async function saveChampionship(event) {
    event.preventDefault();
    const participants = selectedIds();
    const teamSize = Number(document.getElementById('v025TeamSize')?.value || 2);
    if (participants.length < teamSize * 2) return V.toast(`Selecione pelo menos ${teamSize * 2} participantes.`, 'warn');
    if (participants.length % teamSize !== 0) return V.toast(`A quantidade selecionada precisa ser múltipla de ${teamSize}.`, 'warn');
    if (editMode && !state?.championshipEditable) return V.toast('O campeonato já foi iniciado e não pode mais ser editado.', 'error');

    const button = document.getElementById('v025SaveChampionship');
    const params = {
      campeonatoId: editMode ? state.championship.id : '',
      nome: document.getElementById('v025ChampName')?.value,
      participantes: JSON.stringify(participants),
      modoEquipes: 'NOVAS_DUPLAS',
      modelo: document.getElementById('v025Bracket')?.value || 'AUTOMATICO',
      tamanhoEquipe: teamSize,
      formatoCompeticao: document.getElementById('v025Format')?.value || 'MATA_MATA',
      repeticoesConfronto: document.getElementById('v025Repeat')?.value || 1,
      melhorDe: document.getElementById('v025BestOf')?.value || 3,
      pontosNormal: document.getElementById('v025Normal')?.value || 25,
      pontosDesempate: document.getElementById('v025Tie')?.value || 15,
      vantagemMinima: document.getElementById('v025Lead')?.value || 2
    };
    const verb = editMode ? 'salvar a edição e gerar novamente o chaveamento' : 'criar o campeonato';
    if (!confirm(`Confirma ${verb} com ${participants.length} participantes?`)) return;
    A.busy(button, true, editMode ? 'Salvando edição...' : 'Criando campeonato...');
    try {
      const result = await V.championshipRequest('novoCampeonato', params);
      V.toast(result?.message || (editMode ? 'Campeonato atualizado.' : 'Campeonato criado.'));
      await wait(700);
      location.reload();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(button, false);
    }
  }

  function teamMembers(team) {
    if (Array.isArray(team?.members) && team.members.length) return team.members.map(member => member.name).filter(Boolean);
    const ids = [];
    const first = text(team?.member1 || team?.adult);
    const second = text(team?.member2 || team?.child);
    if (first) ids.push(first);
    if (second && second !== first) ids.push(second);
    return ids;
  }

  function renderTeams(target, currentState) {
    const teams = currentState?.teams || [];
    target.innerHTML = teams.length
      ? `<div class="championship-teams-grid">${teams.map((team, index) => `<article class="championship-team-card"><span>EQUIPE ${index + 1}</span><strong>${esc(V.teamName(team) || `Equipe ${index + 1}`)}</strong><small>${teamMembers(team).map(esc).join(' • ')}</small></article>`).join('')}</div>`
      : '<div class="empty">Nenhuma equipe encontrada.</div>';
  }

  function renderHistory() {
    if (historyStatus) historyStatus.textContent = `${championships.length} campeonato${championships.length === 1 ? '' : 's'} preservado${championships.length === 1 ? '' : 's'}`;
    historyTarget.innerHTML = championships.length ? championships.map(item => {
      const active = item.active === 'SIM';
      const editable = active && state?.championshipEditable && state?.championship?.id === item.id;
      return `<article class="championship-history-card ${active ? 'championship-active' : ''}" data-championship-card="${esc(item.id)}">
        <div class="championship-history-head"><div><span>${active ? 'EDIÇÃO ATIVA' : 'HISTÓRICO'}</span><strong>${esc(item.name || item.id)}</strong></div><b>${esc(item.status || 'ARQUIVADO')}</b></div>
        <div class="championship-history-meta"><span>${num(item.teamCount)} equipes</span><span>${dateText(item.finishedAt || item.createdAt)}</span></div>
        <div class="championship-history-actions">
          ${editable ? `<button class="btn primary small" type="button" data-edit-current="${esc(item.id)}">Editar campeonato</button>` : ''}
          <button class="btn secondary small" type="button" data-show-teams="${esc(item.id)}">Ver equipes</button>
          <button class="btn light small" type="button" data-open-championship="${esc(item.id)}">${active ? 'Ver chaveamento atual' : 'Ver chaveamento preservado'}</button>
        </div>
        <div class="championship-teams-panel" data-team-panel="${esc(item.id)}" hidden></div>
      </article>`;
    }).join('') : '<div class="empty">Nenhum campeonato preservado.</div>';
  }

  async function loadHistory() {
    const result = await V.championshipRequest('listarCampeonatos');
    championships = Array.isArray(result) ? result : [];
    renderHistory();
  }

  function optionHtml() {
    return `<option value="">Selecione</option>${activePlayers().map(player => `<option value="${esc(player.id)}">${esc(player.name)} • ${num(player.age)} anos</option>`).join('')}`;
  }

  function installFreeMatches(afterElement) {
    const section = document.createElement('section');
    section.className = 'panel flex-v023-panel';
    section.id = 'v025VoleiFree';
    section.innerHTML = `<div class="panel-head"><div><span class="kicker">PARTIDA INDEPENDENTE</span><h2>Jogo avulso de vôlei</h2><p>Escolha diretamente um participante de cada lado. Não há seleção por equipes nem sorteio.</p></div></div>
      <div class="flex-v024-versus"><label>Participante 1<select id="v025VoleiP1">${optionHtml()}</select></label><div class="versus-mark">×</div><label>Participante 2<select id="v025VoleiP2">${optionHtml()}</select></label></div>
      <div class="flex-v023-grid" style="margin-top:12px"><label>Quantidade de jogos iguais<input id="v025VoleiRepeat" type="number" min="1" max="50" value="1"></label><label>Sets<select id="v025VoleiBest"><option value="1">1 set</option><option value="3" selected>Melhor de 3</option><option value="5">Melhor de 5</option></select></label><label>Pontos normais<input id="v025VoleiNormal" type="number" min="1" max="99" value="25"></label><label>Pontos decisivo<input id="v025VoleiTie" type="number" min="1" max="99" value="15"></label><label>Vantagem<input id="v025VoleiLead" type="number" min="1" max="10" value="2"></label></div>
      <div class="flex-v023-actions"><button class="btn primary" type="button" id="v025CreateVoleiFree">Criar jogo avulso</button></div><div class="flex-v023-free-list" id="v025VoleiFreeList"></div>`;
    afterElement.insertAdjacentElement('afterend', section);

    const modal = F.createScoreModal('volei');
    const render = () => {
      const list = section.querySelector('#v025VoleiFreeList');
      const matches = state?.freeMatches || [];
      list.innerHTML = matches.length ? matches.map(match => `<article class="flex-v023-free-item"><div><strong>${esc(match.team1?.name)} × ${esc(match.team2?.name)}</strong><small>Jogo ${num(match.order)} • ${esc(match.status)}</small></div><button class="btn secondary small" type="button" data-v025-free-score="${esc(match.id)}">${match.status === 'FINALIZADO' ? 'Ver placar' : 'Lançar placar'}</button></article>`).join('') : '<div class="flex-v023-empty">Nenhum jogo avulso registrado.</div>';
    };
    render();

    section.querySelector('#v025CreateVoleiFree').addEventListener('click', async () => {
      const p1 = section.querySelector('#v025VoleiP1').value;
      const p2 = section.querySelector('#v025VoleiP2').value;
      if (!p1 || !p2) return V.toast('Selecione os dois participantes.', 'warn');
      if (p1 === p2) return V.toast('Selecione participantes diferentes.', 'warn');
      try {
        const result = await V.championshipRequest('novoCampeonato', {
          tipo: 'AVULSO', jogador1: p1, jogador2: p2,
          repeticoesConfronto: section.querySelector('#v025VoleiRepeat').value,
          melhorDe: section.querySelector('#v025VoleiBest').value,
          pontosNormal: section.querySelector('#v025VoleiNormal').value,
          pontosDesempate: section.querySelector('#v025VoleiTie').value,
          vantagemMinima: section.querySelector('#v025VoleiLead').value
        });
        state = result.state || await V.request('admin');
        V.toast(result.message);
        render();
        rankingRender?.();
      } catch (error) { V.toast(error.message, 'error'); }
    });

    section.addEventListener('click', event => {
      const button = event.target.closest('[data-v025-free-score]');
      if (!button) return;
      const match = (state?.freeMatches || []).find(item => item.id === button.dataset.v025FreeScore);
      if (match) F.fillScoreModal(modal, match, false);
    });
    modal.querySelector('[data-score-start]').addEventListener('click', async () => {
      try {
        const result = await V.championshipRequest('novoCampeonato', { tipo: 'AVULSO_INICIAR', id: modal.dataset.matchId });
        state = result.state || await V.request('admin');
        V.toast(result.message); modal.hidden = true; render();
      } catch (error) { V.toast(error.message, 'error'); }
    });
    modal.querySelector('[data-score-save]').addEventListener('click', async () => {
      const match = (state?.freeMatches || []).find(item => item.id === modal.dataset.matchId);
      if (!match) return;
      try {
        const result = await V.championshipRequest('novoCampeonato', { tipo: 'AVULSO_RESULTADO', id: match.id, payload: JSON.stringify({ scores: F.scoresFromModal(modal, match.bestOf) }) });
        state = result.state || await V.request('admin');
        V.toast(result.message); modal.hidden = true; render(); rankingRender?.();
      } catch (error) { V.toast(error.message, 'error'); }
    });
  }

  historyTarget.addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-current]');
    if (edit) {
      renderForm(true);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const teamsButton = event.target.closest('[data-show-teams]');
    if (teamsButton) {
      const id = teamsButton.dataset.showTeams;
      const panel = historyTarget.querySelector(`[data-team-panel="${CSS.escape(id)}"]`);
      if (!panel) return;
      if (!panel.hidden) { panel.hidden = true; teamsButton.textContent = 'Ver equipes'; return; }
      try {
        const teamState = id === state?.championship?.id ? state : await V.championshipRequest('abrirCampeonato', { id });
        renderTeams(panel, teamState);
        panel.hidden = false;
        teamsButton.textContent = 'Ocultar equipes';
      } catch (error) { V.toast(error.message, 'error'); }
      return;
    }
    const open = event.target.closest('[data-open-championship]');
    if (!open) return;
    try {
      const opened = await V.championshipRequest('abrirCampeonato', { id: open.dataset.openChampionship });
      A.render(V.normalizeState(opened));
      document.getElementById('teamsPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { V.toast(error.message, 'error'); }
  });

  form.addEventListener('submit', saveChampionship);

  async function init() {
    state = await V.request('admin');
    await loadHistory();
    renderForm(Boolean(state.championshipEditable));
    const championshipPanel = form.closest('.panel');
    installFreeMatches(championshipPanel);
    const freeSection = document.getElementById('v025VoleiFree');
    const ranking = F.rankingPanel('Ranking geral do vôlei');
    freeSection.insertAdjacentElement('afterend', ranking);
    rankingRender = F.installRanking(ranking, () => state, 'volei');
  }

  init().catch(error => {
    console.error('Admin V025:', error);
    V.toast(`Falha ao carregar edição de campeonatos: ${error.message}`, 'error');
  });
})();
