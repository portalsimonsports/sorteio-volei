(() => {
  'use strict';
  if (!window.VoleiAdmin) return;

  const A = window.VoleiAdmin;
  const V = A.V;
  const ui = A.ui;
  let firstLoad = true;

  async function refresh() {
    A.busy(ui.refreshAdmin, true, 'Atualizando...');
    try {
      const adminState = await V.request('admin');
      A.render(adminState);
      ui.adminMode.textContent = 'Sincronizado com Google Sheets';
    } catch (adminError) {
      try {
        const publicState = await V.request('estado');
        A.render(publicState);
        ui.adminMode.textContent = 'Chaveamento sincronizado';
        if (firstLoad) V.toast('O painel carregou o chaveamento pela consulta pública.', 'warn');
      } catch (publicError) {
        ui.adminMode.textContent = 'Sem conexão com Apps Script';
        A.render(V.read());
        if (firstLoad) V.toast(publicError.message || adminError.message, 'error');
      }
    } finally {
      firstLoad = false;
      A.busy(ui.refreshAdmin, false);
    }
  }

  ui.playerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const playerAge = Number(ui.playerAge.value);
    if (playerAge >= 18 && !ui.playerSex.value) {
      V.toast('Informe o sexo do participante adulto.', 'warn');
      ui.playerSex.focus();
      return;
    }
    const params = {
      id: ui.playerId.value,
      nome: ui.playerName.value,
      idade: playerAge,
      sexo: ui.playerSex.value,
      dataNascimento: V.syntheticBirthDate(playerAge),
      nota: ui.playerScore.value,
      notaAnterior: ui.playerScore.dataset.originalScore || '',
      indiceAnterior: ui.playerScore.dataset.originalAdjusted || '',
      ativo: ui.playerActive.value
    };
    try {
      V.validatePlayer(params);
    } catch (error) {
      V.toast(error.message, 'warn');
      return;
    }

    const button = ui.playerForm.querySelector('button[type="submit"]');
    A.busy(button, true, 'Salvando...');
    try {
      const result = await V.request('salvarJogador', params);
      V.toast(result?.message || 'Participante salvo.');
      ui.playerForm.reset();
      ui.playerId.value = '';
      ui.playerActive.value = 'SIM';
      ui.playerSex.value = '';
      delete ui.playerScore.dataset.originalScore;
      delete ui.playerScore.dataset.originalAdjusted;
      A.preview();
      if (result?.state) A.render(result.state); else await refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(button, false);
    }
  });

  ui.playerAge.addEventListener('input', A.preview);
  ui.playerSex.addEventListener('change', A.preview);
  ui.playerScore.addEventListener('input', A.preview);

  ui.playersTableBody.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const player = A.getState().players.find(item => item.id === button.dataset.id);
    if (!player) return;

    if (button.dataset.action === 'edit') {
      ui.playerId.value = player.id;
      ui.playerName.value = player.name;
      ui.playerAge.value = player.age;
      ui.playerSex.value = player.sex || '';
      ui.playerScore.value = V.ratingEditValue ? V.ratingEditValue(player) : player.score;
      ui.playerScore.dataset.originalScore = String(player.score);
      ui.playerScore.dataset.originalAdjusted = String(player.adjustedScore);
      ui.playerActive.value = player.active || 'SIM';
      A.preview();
      ui.playerName.focus();
      return;
    }

    if (!confirm(`Excluir ${player.name}?`)) return;
    try {
      const result = await V.request('excluirJogador', { id: player.id });
      V.toast('Participante excluído.');
      if (result?.state) A.render(result.state); else await refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  ui.refreshAdmin.addEventListener('click', refresh);
  A.refresh = refresh;
})();
