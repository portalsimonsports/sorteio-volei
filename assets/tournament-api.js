(() => {
  'use strict';

  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  const S = window.VoleiScore;
  if (!B || !T || !S) return;

  function localRequest(action, params = {}) {
    try {
      if (action === 'estado' || action === 'admin') return Promise.resolve(B.readState());
      if (action === 'inscrever') return Promise.resolve(B.savePlayer(params, false));
      if (action === 'salvarJogador') return Promise.resolve(B.savePlayer(params, true));

      if (action === 'excluirJogador') {
        const state = B.readState();
        state.players = state.players.filter(player => player.id !== params.id);
        state.teams = [];
        state.rounds = [];
        state.status = 'INSCRICOES';
        B.saveState(state);
        return Promise.resolve({ message: 'Participante excluído.', state });
      }

      if (action === 'sortearAgora') return Promise.resolve(T.runDraw());
      if (action === 'registrarResultado') return Promise.resolve(S.registerScore(params));

      if (action === 'resetar') {
        const old = B.readState();
        const state = B.initialState();
        state.players = old.players;
        B.saveState(state);
        return Promise.resolve({ message: 'Sorteio reiniciado.', state });
      }

      if (action === 'limparTudo') {
        const state = B.initialState();
        B.saveState(state);
        return Promise.resolve({ message: 'Dados apagados.', state });
      }

      throw new Error(`Ação não implementada: ${action}`);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function toast(text, type = 'ok') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = text;
    wrap.appendChild(item);
    setTimeout(() => item.remove(), 4500);
  }

  window.Volei = {
    ...B,
    request: localRequest,
    validateScore: S.validateScore,
    teamName: team => team
      ? ([team.adult, team.child].filter(Boolean).join(' + ') || team.id || '')
      : '',
    dateTime: value => {
      const date = B.parseDate(value);
      return date
        ? date.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
        : '';
    },
    toast,
    winnerTeam: T.winnerTeam,
    winner: T.winnerTeam,
    date: B.parseDate,
    read: B.readState,
    match: B.normalizeMatch,
    index: B.adjustedIndex
  };
})();
