(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.VoleiAdmin || !window.Volei?.championshipRequest) return;

  const A = window.VoleiAdmin;
  const V = window.Volei;
  const form = document.getElementById('championshipForm');
  const nameInput = document.getElementById('championshipName');
  const teamMode = document.getElementById('championshipTeamMode');
  const bracketMode = document.getElementById('championshipBracketMode');
  const createButton = document.getElementById('createChampionship');
  const historyTarget = document.getElementById('championshipHistory');
  const historyStatus = document.getElementById('championshipHistoryStatus');
  const viewer = document.getElementById('championshipViewer');
  const viewerName = document.getElementById('championshipViewerName');
  const backButton = document.getElementById('backToCurrentChampionship');
  if (!form || !historyTarget) return;

  let championships = [];

  function text(value) { return String(value ?? '').trim(); }
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function dateText(value) {
    if (!value) return '—';
    const date = V.date(value);
    return date ? date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : text(value);
  }

  function modelLabel(value) {
    if (value === 'REPESCAGEM_5') return '5 duplas • uma folga + repescagem';
    return 'Automático pela quantidade de duplas';
  }

  function safeId(value) {
    return text(value).replace(/[^0-9A-Za-z_-]/g, '_');
  }

  function teamMembers(team) {
    const members = [];
    if (text(team?.member1)) members.push({ name:text(team.member1), pot:text(team.member1Pot) });
    if (text(team?.member2)) members.push({ name:text(team.member2), pot:text(team.member2Pot) });
    if (!members.length && text(team?.adult)) members.push({ name:text(team.adult), pot:'A' });
    if (!members.some(member => member.name === text(team?.child)) && text(team?.child)) members.push({ name:text(team.child), pot:'B' });
    return members;
  }

  function memberLabel(member) {
    if (member.pot === 'A') return `Adulto: ${member.name}`;
    if (member.pot === 'B') return `Criança: ${member.name}`;
    return member.name;
  }

  function renderChampionshipTeams(target, state) {
    const teams = Array.isArray(state?.teams) ? state.teams : [];
    target.innerHTML = teams.length
      ? `<div class="championship-teams-title"><strong>Duplas desta edição</strong><span>${teams.length} dupla${teams.length === 1 ? '' : 's'}</span></div>
         <div class="championship-teams-grid">${teams.map((team, index) => {
           const members = teamMembers(team);
           const name = V.teamName(team) || members.map(member => member.name).join(' + ') || team.id || `Dupla ${index + 1}`;
           return `<article class="championship-team-card">
             <span>DUPLA ${String(index + 1).padStart(2, '0')}</span>
             <strong>${V.esc(name)}</strong>
             <small>${members.map(member => V.esc(memberLabel(member))).join(' • ')}</small>
           </article>`;
         }).join('')}</div>`
      : '<div class="empty">Nenhuma dupla foi encontrada no histórico desta edição.</div>';
  }

  function renderHistory() {
    historyStatus.textContent = `${championships.length} campeonato${championships.length === 1 ? '' : 's'} preservado${championships.length === 1 ? '' : 's'}`;
    historyTarget.innerHTML = championships.length
      ? championships.map(item => {
          const targetId = `championship-teams-${safeId(item.id)}`;
          return `<article class="championship-history-card ${item.active === 'SIM' ? 'championship-active' : ''}">
            <div class="championship-history-head">
              <div><span>${item.active === 'SIM' ? 'EDIÇÃO ATIVA' : 'HISTÓRICO'}</span><strong>${V.esc(item.name || item.id)}</strong></div>
              <b>${V.esc(item.status || 'ARQUIVADO')}</b>
            </div>
            <div class="championship-history-meta">
              <span>${Number(item.teamCount || 0)} duplas</span>
              <span>${V.esc(modelLabel(item.bracketModel))}</span>
              <span>${dateText(item.finishedAt || item.createdAt)}</span>
            </div>
            <div class="championship-history-actions">
              <button class="btn secondary small" type="button" data-toggle-championship-teams="${V.esc(item.id)}" data-target="${targetId}">Ver duplas</button>
              <button class="btn light small" type="button" data-open-championship="${V.esc(item.id)}">${item.active === 'SIM' ? 'Ver edição atual' : 'Ver chaveamento preservado'}</button>
            </div>
            <div class="championship-teams-panel" id="${targetId}" hidden></div>
          </article>`;
        }).join('')
      : '<div class="empty">Nenhum campeonato arquivado. O campeonato atual será preservado automaticamente ao criar uma nova edição.</div>';
  }

  async function loadHistory() {
    historyStatus.textContent = 'Carregando histórico...';
    try {
      const result = await V.championshipRequest('listarCampeonatos');
      championships = Array.isArray(result) ? result : [];
      renderHistory();
      return championships;
    } catch (error) {
      historyStatus.textContent = 'Histórico indisponível';
      historyTarget.innerHTML = `<div class="message error">${V.esc(error.message)}</div>`;
      throw error;
    }
  }

  function setHistoryMode(enabled, name = '') {
    document.body.classList.toggle('championship-history-mode', enabled);
    viewer.hidden = !enabled;
    viewerName.textContent = name;
    ['drawNow','resetDraw','clearAll','playerForm','rulesForm','scoreForm'].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      if (element.tagName === 'FORM') [...element.elements].forEach(control => control.disabled = enabled);
      else element.disabled = enabled;
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = text(nameInput.value) || `Campeonato ${championships.length + 1}`;
    const mode = teamMode.value;
    const model = bracketMode.value;
    const warning = mode === 'MESMAS_EQUIPES'
      ? `Criar “${name}” reutilizando exatamente as mesmas duplas? O chaveamento atual será preservado no histórico.`
      : `Criar “${name}” formando novas duplas com os participantes ativos? O chaveamento atual será preservado no histórico.`;
    if (!confirm(warning)) return;

    A.busy(createButton, true, 'Criando campeonato...');
    try {
      const result = await V.championshipRequest('novoCampeonato', { nome: name, modoEquipes: mode, modelo: model });
      V.toast(result?.message || 'Novo campeonato criado.');
      setHistoryMode(false);
      if (result?.state) A.render(V.normalizeState(result.state)); else await A.refresh();
      nameInput.value = '';
      await loadHistory();
      document.getElementById('matchesAdmin')?.scrollIntoView({ behavior:'smooth', block:'start' });
    } catch (error) {
      const processingTimeout = /processamento demorou|tempo esgotado/i.test(text(error?.message));
      if (processingTimeout) {
        V.toast('O processamento continua. Verificando se o campeonato foi criado...');
        await wait(4000);
        try {
          await loadHistory();
          const created = championships.find(item => item.active === 'SIM' && text(item.name) === name);
          if (created) {
            setHistoryMode(false);
            await A.refresh();
            nameInput.value = '';
            V.toast(`${created.name} criado corretamente.`);
            document.getElementById('matchesAdmin')?.scrollIntoView({ behavior:'smooth', block:'start' });
            return;
          }
        } catch (_) {}
      }
      V.toast(error.message, 'error');
    } finally {
      A.busy(createButton, false);
    }
  });

  historyTarget.addEventListener('click', async event => {
    const teamButton = event.target.closest('[data-toggle-championship-teams]');
    if (teamButton) {
      const target = document.getElementById(teamButton.dataset.target);
      if (!target) return;
      if (target.dataset.loaded === 'SIM') {
        target.hidden = !target.hidden;
        teamButton.textContent = target.hidden ? 'Ver duplas' : 'Ocultar duplas';
        return;
      }

      A.busy(teamButton, true, 'Carregando duplas...');
      try {
        const state = await V.championshipRequest('abrirCampeonato', { id:teamButton.dataset.toggleChampionshipTeams });
        renderChampionshipTeams(target, state);
        target.dataset.loaded = 'SIM';
        target.hidden = false;
        teamButton.textContent = 'Ocultar duplas';
      } catch (error) {
        V.toast(error.message, 'error');
      } finally {
        A.busy(teamButton, false);
      }
      return;
    }

    const button = event.target.closest('[data-open-championship]');
    if (!button) return;
    const id = button.dataset.openChampionship;
    const item = championships.find(entry => entry.id === id);
    try {
      const state = await V.championshipRequest('abrirCampeonato', { id });
      setHistoryMode(item?.active !== 'SIM', item?.name || id);
      A.render(V.normalizeState(state));
      document.getElementById('teamsPreview')?.scrollIntoView({ behavior:'smooth', block:'start' });
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  backButton?.addEventListener('click', async () => {
    setHistoryMode(false);
    await A.refresh();
  });

  bracketMode.addEventListener('change', () => {
    const note = document.getElementById('championshipBracketNote');
    if (!note) return;
    note.textContent = bracketMode.value === 'REPESCAGEM_5'
      ? 'Disponível quando existirem exatamente cinco duplas: duas partidas iniciais, repescagem, duas semifinais, terceiro lugar e final.'
      : 'O sistema calcula automaticamente fases preliminares, quartas, semifinais, terceiro lugar e final conforme a quantidade de duplas.';
  });

  loadHistory().catch(() => {});
})();
