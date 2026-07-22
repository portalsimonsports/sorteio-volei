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

  function dateText(value) {
    if (!value) return '—';
    const date = V.date(value);
    return date ? date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : text(value);
  }

  function modelLabel(value) {
    if (value === 'REPESCAGEM_5') return '5 duplas • uma folga + repescagem';
    return 'Automático pela quantidade de duplas';
  }

  function renderHistory() {
    historyStatus.textContent = `${championships.length} campeonato${championships.length === 1 ? '' : 's'} preservado${championships.length === 1 ? '' : 's'}`;
    historyTarget.innerHTML = championships.length
      ? championships.map(item => `
          <article class="championship-history-card ${item.active === 'SIM' ? 'championship-active' : ''}">
            <div class="championship-history-head">
              <div><span>${item.active === 'SIM' ? 'EDIÇÃO ATIVA' : 'HISTÓRICO'}</span><strong>${V.esc(item.name || item.id)}</strong></div>
              <b>${V.esc(item.status || 'ARQUIVADO')}</b>
            </div>
            <div class="championship-history-meta">
              <span>${Number(item.teamCount || 0)} duplas</span>
              <span>${V.esc(modelLabel(item.bracketModel))}</span>
              <span>${dateText(item.finishedAt || item.createdAt)}</span>
            </div>
            <button class="btn secondary small" type="button" data-open-championship="${V.esc(item.id)}">${item.active === 'SIM' ? 'Ver edição atual' : 'Ver chaveamento preservado'}</button>
          </article>`).join('')
      : '<div class="empty">Nenhum campeonato arquivado. O campeonato atual será preservado automaticamente ao criar uma nova edição.</div>';
  }

  async function loadHistory() {
    historyStatus.textContent = 'Carregando histórico...';
    try {
      const result = await V.championshipRequest('listarCampeonatos');
      championships = Array.isArray(result) ? result : [];
      renderHistory();
    } catch (error) {
      historyStatus.textContent = 'Histórico indisponível';
      historyTarget.innerHTML = `<div class="message error">${V.esc(error.message)}</div>`;
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
      V.toast(error.message, 'error');
    } finally {
      A.busy(createButton, false);
    }
  });

  historyTarget.addEventListener('click', async event => {
    const button = event.target.closest('[data-open-championship]');
    if (!button) return;
    const id = button.dataset.openChampionship;
    const item = championships.find(entry => entry.id === id);
    try {
      const state = await V.championshipRequest('abrirCampeonato', { id });
      setHistoryMode(item?.active !== 'SIM', item?.name || id);
      A.render(V.normalizeState(state));
      document.getElementById('matchesAdmin')?.scrollIntoView({ behavior:'smooth', block:'start' });
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

  loadHistory();
})();
