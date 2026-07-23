(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin') return;
  const TM = window.TenisMesa;
  const F = window.FlexV023;
  if (!TM || !F) return;

  let state = null;
  let editMode = false;
  let rankingRender = null;
  const text = value => String(value ?? '').trim();
  const esc = F.esc;
  const num = F.num;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function selectedParticipantIds() {
    return [...document.querySelectorAll('[data-select-player]:checked')].map(input => input.dataset.selectPlayer);
  }

  function setSelected(ids) {
    const selected = new Set((ids || []).map(text));
    document.querySelectorAll('[data-select-player]').forEach(input => {
      input.checked = selected.has(text(input.dataset.selectPlayer));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function replaceTournamentForm() {
    const oldForm = document.getElementById('tmTournamentForm');
    if (!oldForm) return null;
    const oldChamp = state?.championship || {};
    const form = document.createElement('form');
    form.id = 'tmTournamentForm';
    form.innerHTML = `<div class="v025-form-heading"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">${state?.championshipEditable ? 'EDIÇÃO DISPONÍVEL' : 'NOVO CAMPEONATO'}</span><h3 id="v025TmFormTitle">${state?.championshipEditable ? `Editar ${esc(oldChamp.name || 'campeonato atual')}` : 'Gerar campeonato'}</h3><p>Selecione os participantes na lista acima. A edição será bloqueada somente quando a primeira partida começar.</p></div>${state?.championshipEditable ? '<button class="tm-button secondary" type="button" id="v025TmEditCurrent">Editar campeonato atual</button>' : ''}</div>
      <div class="tm-form-grid cols-3">
        <label>Nome do campeonato<input id="tmTournamentName" maxlength="60" placeholder="Ex.: Campeonato de Julho"></label>
        <label>Sets por jogo<select id="tmBestOf"><option value="1">1 set</option><option value="3" selected>Melhor de 3</option><option value="5">Melhor de 5</option><option value="7">Melhor de 7</option></select></label>
        <label>Pontos por set<input id="tmSetPoints" type="number" min="1" max="99" value="11"></label>
        <label>Vantagem mínima<input id="tmMinimumLead" type="number" min="1" max="10" value="2"></label>
        <label>Pontos por vitória<input id="tmWinPoints" type="number" min="0" max="20" value="3"></label>
        <label>Pontos por derrota<input id="tmLossPoints" type="number" min="0" max="20" value="0"></label>
        <label>Máximo por participante<input id="tmMaxGamesPlayer" type="number" min="0" max="100" value="0"><small>0 = sem limite</small></label>
        <label>Máximo total<input id="tmMaxGamesTotal" type="number" min="0" max="1000" value="0"><small>0 = sem limite</small></label>
        <label>Repetições de cada confronto<input id="tmTurns" type="number" min="1" max="50" value="1"></label>
        <label>Próximo jogo automático<select id="tmAutoStart"><option value="SIM">SIM</option><option value="NAO">NÃO</option></select></label>
      </div>
      <div class="tm-actions"><button class="tm-button primary" id="tmCreateTournament" type="submit">${state?.championshipEditable ? 'Salvar edição e gerar novamente' : 'Gerar jogos com os selecionados'}</button></div>`;
    oldForm.replaceWith(form);

    function fillEdit() {
      if (!state?.championshipEditable || !state?.championship) return;
      editMode = true;
      const c = state.championship;
      form.querySelector('#v025TmFormTitle').textContent = `Editar ${c.name}`;
      form.querySelector('#tmTournamentName').value = c.name || '';
      form.querySelector('#tmBestOf').value = String(c.bestOf || 3);
      form.querySelector('#tmSetPoints').value = String(c.setPoints || 11);
      form.querySelector('#tmMinimumLead').value = String(c.minimumLead || 2);
      form.querySelector('#tmWinPoints').value = String(c.winPoints ?? 3);
      form.querySelector('#tmLossPoints').value = String(c.lossPoints ?? 0);
      form.querySelector('#tmMaxGamesPlayer').value = String(c.maxGamesPerPlayer || 0);
      form.querySelector('#tmMaxGamesTotal').value = String(c.maxTotalGames || 0);
      form.querySelector('#tmTurns').value = String(c.turns || 1);
      form.querySelector('#tmAutoStart').value = c.autoStart || 'SIM';
      form.querySelector('#tmCreateTournament').textContent = 'Salvar edição e gerar novamente';
      setSelected((state.participants || []).map(item => item.id));
    }

    form.querySelector('#v025TmEditCurrent')?.addEventListener('click', () => {
      fillEdit();
      document.getElementById('tmPlayers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const participants = selectedParticipantIds();
      if (participants.length < 2) return TM.toast('Selecione pelo menos dois participantes.', 'warn');
      if (editMode && !state?.championshipEditable) return TM.toast('O campeonato já foi iniciado e não pode ser editado.', 'error');
      const button = form.querySelector('#tmCreateTournament');
      button.disabled = true;
      try {
        const result = await TM.request('tmCriarCampeonato', {
          campeonatoId: editMode ? state.championship.id : '',
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
        await wait(600);
        location.reload();
      } catch (error) { TM.toast(error.message, 'error'); }
      finally { button.disabled = false; }
    });

    if (state?.championshipEditable) fillEdit();
    return form;
  }

  function options() {
    return `<option value="">Selecione</option>${(state?.players || []).filter(player => player.active === 'SIM').map(player => `<option value="${esc(player.id)}">${esc(player.name)}</option>`).join('')}`;
  }

  function installFreeSection(anchor) {
    const section = document.createElement('section');
    section.className = 'tm-panel tm-span-12';
    section.id = 'v025TmFree';
    section.innerHTML = `<div class="tm-panel-head"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">JOGO AVULSO</span><h2>Sequência livre — o vencedor permanece</h2><p>Escolha dois participantes. Depois de cada resultado, o vencedor fica selecionado e você pode repetir o jogo ou trocar somente o desafiante.</p></div></div>
      <div class="flex-v024-current-winner" id="v025TmWinnerNote" hidden></div>
      <div class="flex-v024-versus"><label><span id="v025TmFirstLabel">Participante 1</span><select id="v025TmP1">${options()}</select></label><div class="versus-mark">×</div><label>Desafiante<select id="v025TmP2">${options()}</select></label></div>
      <div class="flex-v023-grid" style="margin-top:12px"><label>Sets<select id="v025TmBest"><option value="1">1 set</option><option value="3" selected>Melhor de 3</option><option value="5">Melhor de 5</option><option value="7">Melhor de 7</option></select></label><label>Pontos por set<input id="v025TmPoints" type="number" min="1" max="99" value="11"></label><label>Vantagem<input id="v025TmLead" type="number" min="1" max="10" value="2"></label><label>Pontos vitória<input id="v025TmWin" type="number" min="0" max="20" value="3"></label><label>Pontos derrota<input id="v025TmLoss" type="number" min="0" max="20" value="0"></label></div>
      <div class="tm-actions"><button class="tm-button primary" type="button" id="v025TmNewGame">Novo jogo</button></div><div class="flex-v023-free-list" id="v025TmFreeList"></div>`;
    anchor.insertAdjacentElement('afterend', section);

    const p1 = section.querySelector('#v025TmP1');
    const p2 = section.querySelector('#v025TmP2');
    const button = section.querySelector('#v025TmNewGame');
    const note = section.querySelector('#v025TmWinnerNote');
    const firstLabel = section.querySelector('#v025TmFirstLabel');
    const modal = F.createScoreModal('tm');

    function render() {
      const open = state?.freeOpenMatch;
      const winner = state?.freeCurrentWinnerId || '';
      const loser = state?.freeLastLoserId || '';
      p1.disabled = false; p2.disabled = false; button.disabled = false;
      if (open) {
        p1.value = open.player1Id; p2.value = open.player2Id;
        p1.disabled = true; p2.disabled = true; button.disabled = true;
        firstLabel.textContent = 'Participante 1'; note.hidden = false;
        note.textContent = 'Finalize o jogo atual antes de criar o próximo.';
      } else if (winner) {
        p1.value = winner; p1.disabled = true; firstLabel.textContent = 'Vencedor atual';
        if (!p2.value || p2.value === winner) p2.value = loser && loser !== winner ? loser : '';
        note.hidden = false; note.textContent = `${state.freeCurrentWinnerName || 'O vencedor'} permanece selecionado até perder.`;
      } else {
        p1.disabled = false; firstLabel.textContent = 'Participante 1'; note.hidden = true;
      }
      const matches = state?.freeMatches || [];
      section.querySelector('#v025TmFreeList').innerHTML = matches.length ? matches.map(match => `<article class="flex-v023-free-item"><div><strong>${esc(match.player1)} × ${esc(match.player2)}</strong><small>Jogo ${num(match.order)} • ${esc(match.status)}${match.winnerId ? ` • vencedor: ${esc(match.winnerId === match.player1Id ? match.player1 : match.player2)}` : ''}</small></div><button class="tm-button secondary" type="button" data-v025-tm-score="${esc(match.id)}">${match.status === 'FINALIZADO' ? 'Ver placar' : 'Lançar placar'}</button></article>`).join('') : '<div class="flex-v023-empty">Nenhum jogo avulso registrado.</div>';
    }
    render();

    p1.addEventListener('change', () => { if (p1.value === p2.value) p2.value = ''; });
    p2.addEventListener('change', () => { if (p1.value === p2.value) { TM.toast('O desafiante deve ser diferente.', 'warn'); p2.value = ''; } });
    button.addEventListener('click', async () => {
      if (!p1.value || !p2.value) return TM.toast('Selecione os dois participantes.', 'warn');
      if (p1.value === p2.value) return TM.toast('Selecione participantes diferentes.', 'warn');
      try {
        const result = await TM.request('tmCriarCampeonato', {
          tipo: 'AVULSO', jogador1: p1.value, jogador2: p2.value,
          melhorDe: section.querySelector('#v025TmBest').value,
          pontosSet: section.querySelector('#v025TmPoints').value,
          vantagemMinima: section.querySelector('#v025TmLead').value,
          pontosVitoria: section.querySelector('#v025TmWin').value,
          pontosDerrota: section.querySelector('#v025TmLoss').value
        });
        state = result.state;
        TM.toast(result.message);
        render(); rankingRender?.();
      } catch (error) { TM.toast(error.message, 'error'); }
    });
    section.addEventListener('click', event => {
      const target = event.target.closest('[data-v025-tm-score]');
      if (!target) return;
      const match = (state?.freeMatches || []).find(item => item.id === target.dataset.v025TmScore);
      if (match) F.fillScoreModal(modal, match, true);
    });
    modal.querySelector('[data-score-start]').addEventListener('click', async () => {
      try {
        const result = await TM.request('tmCriarCampeonato', { tipo: 'AVULSO_INICIAR', id: modal.dataset.matchId });
        state = result.state; TM.toast(result.message); modal.hidden = true; render();
      } catch (error) { TM.toast(error.message, 'error'); }
    });
    modal.querySelector('[data-score-save]').addEventListener('click', async () => {
      const match = (state?.freeMatches || []).find(item => item.id === modal.dataset.matchId);
      if (!match) return;
      try {
        const result = await TM.request('tmCriarCampeonato', { tipo: 'AVULSO_RESULTADO', id: match.id, placar: F.scoresFromModal(modal, match.bestOf) });
        state = result.state; TM.toast(result.message); modal.hidden = true; render(); rankingRender?.();
      } catch (error) { TM.toast(error.message, 'error'); }
    });
  }

  function installHistoryEditButton() {
    const container = document.getElementById('tmChampionships');
    if (!container || !state?.championshipEditable || !state?.championship) return;
    const apply = () => {
      const activeButton = [...container.querySelectorAll('[data-open-championship]')].find(button => button.dataset.openChampionship === state.championship.id);
      if (!activeButton || container.querySelector('[data-v025-edit-tm]')) return;
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'v025-tm-edit-history'; edit.dataset.v025EditTm = state.championship.id;
      edit.innerHTML = `<span><strong>Editar ${esc(state.championship.name)}</strong><small>Permitido porque nenhuma partida foi iniciada.</small></span><span>Editar</span>`;
      edit.addEventListener('click', () => {
        editMode = true;
        setSelected((state.participants || []).map(item => item.id));
        replaceTournamentForm();
        document.getElementById('tmTournamentForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      activeButton.insertAdjacentElement('afterend', edit);
    };
    apply();
    new MutationObserver(apply).observe(container, { childList: true, subtree: true });
  }

  async function init() {
    state = await TM.request('tmAdmin');
    replaceTournamentForm();
    const generator = document.getElementById('tmTournamentForm')?.closest('.tm-panel');
    if (!generator) throw new Error('Painel do campeonato não encontrado.');
    installFreeSection(generator);
    const free = document.getElementById('v025TmFree');
    const ranking = F.rankingPanel('Ranking geral do tênis de mesa');
    free.insertAdjacentElement('afterend', ranking);
    rankingRender = F.installRanking(ranking, () => state, 'tenis');
    installHistoryEditButton();
  }

  init().catch(error => {
    console.error('Tênis V025:', error);
    TM.toast(`Falha ao carregar jogos avulsos: ${error.message}`, 'error');
  });
})();
