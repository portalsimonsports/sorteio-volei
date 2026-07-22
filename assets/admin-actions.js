(() => {
  'use strict';
  if (!window.VoleiAdmin) return;

  const A = window.VoleiAdmin;
  const V = A.V;
  const ui = A.ui;
  let lastConnectionError = '';

  async function refresh(silent = false) {
    if (!silent) A.busy(ui.refreshAdmin, true, 'Atualizando...');
    try {
      A.render(await V.request('admin'));
      lastConnectionError = '';
    } catch (error) {
      A.render(V.read());
      ui.adminMode.textContent = 'Sem conexão com o Apps Script';
      ui.adminMode.title = error.message;
      if (!silent || error.message !== lastConnectionError) {
        V.toast(error.message, 'error');
        lastConnectionError = error.message;
      }
    } finally {
      if (!silent) A.busy(ui.refreshAdmin, false);
    }
  }

  ui.playerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const params = {
      id: ui.playerId.value,
      nome: ui.playerName.value,
      dataNascimento: ui.playerBirth.value,
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
      await refresh(true);
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(button, false);
    }
  });

  ui.playerBirth.addEventListener('input', A.preview);
  ui.playerScore.addEventListener('input', A.preview);

  ui.playersTableBody.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const player = A.getState().players.find(item => item.id === button.dataset.id);
    if (!player) return;

    if (button.dataset.action === 'edit') {
      ui.playerId.value = player.id;
      ui.playerName.value = player.name;
      ui.playerBirth.value = V.dateInput(player.birthDate);
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
      await refresh(true);
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  ui.refreshAdmin.addEventListener('click', () => refresh(false));
  A.refresh = refresh;
})();
