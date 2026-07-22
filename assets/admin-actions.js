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
      A.render(await V.request('admin'));
      ui.adminMode.textContent = 'Sincronizado com Google Sheets';
    } catch (error) {
      ui.adminMode.textContent = 'Sem conexão com Apps Script';
      A.render(V.read());
      if (firstLoad) V.toast(error.message, 'error');
    } finally {
      firstLoad = false;
      A.busy(ui.refreshAdmin, false);
    }
  }

  ui.playerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const playerAge = Number(ui.playerAge.value);
    const params = {
      id: ui.playerId.value,
      nome: ui.playerName.value,
      idade: playerAge,
      dataNascimento: V.syntheticBirthDate(playerAge),
      nota: ui.playerScore.value,
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
      await V.request('salvarJogador', params);
      V.toast('Participante salvo.');
      ui.playerForm.reset();
      ui.playerId.value = '';
      ui.playerActive.value = 'SIM';
      A.preview();
      await refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(button, false);
    }
  });

  ui.playerAge.addEventListener('input', A.preview);
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
      ui.playerScore.value = player.score;
      ui.playerActive.value = player.active || 'SIM';
      A.preview();
      ui.playerName.focus();
      return;
    }

    if (!confirm(`Excluir ${player.name}?`)) return;
    try {
      await V.request('excluirJogador', { id: player.id });
      V.toast('Participante excluído.');
      await refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  ui.refreshAdmin.addEventListener('click', refresh);
  A.refresh = refresh;
})();
