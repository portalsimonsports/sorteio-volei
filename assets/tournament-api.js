(() => {
  'use strict';

  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  const S = window.VoleiScore;
  if (!B || !T || !S) return;

  const C = B.C || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v5';
  const ADMIN_ACTIONS = new Set([
    'admin', 'salvarJogador', 'excluirJogador', 'sortearAgora',
    'gerarCodigo', 'cancelar', 'registrarResultado', 'resetar',
    'limparTudo', 'diagnostico'
  ]);

  try {
    const informed = new URLSearchParams(location.search).get('chave');
    if (informed) localStorage.setItem(ADMIN_KEY_STORE, informed.trim());
  } catch (_) {}

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

  function adminKey(forceNew = false) {
    if (forceNew) localStorage.removeItem(ADMIN_KEY_STORE);
    let key = localStorage.getItem(ADMIN_KEY_STORE) || '';
    if (!key) {
      key = String(prompt('Informe a chave administrativa gerada pelo Apps Script:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE, key);
    }
    return key;
  }

  function normalizeResult(action, data) {
    if (action === 'estado' || action === 'admin') return B.normalizeState(data || {});
    if (data && data.state) data.state = B.normalizeState(data.state);
    if (data && data.estado) {
      data.state = B.normalizeState(data.estado);
      delete data.estado;
    }
    return data;
  }

  function remoteRequest(action, params = {}, retryingKey = false) {
    return new Promise((resolve, reject) => {
      const endpoint = String(C.API_BASE || '').trim();
      if (!endpoint) {
        reject(new Error('A URL do Apps Script ainda não foi configurada.'));
        return;
      }

      const callback = `__voleiJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...params, acao: action, callback, _: Date.now() });
      if (ADMIN_ACTIONS.has(action)) {
        try {
          query.set('chave', adminKey(retryingKey));
        } catch (error) {
          reject(error);
          return;
        }
      }

      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao consultar o Apps Script.')), 25000);

      function cleanup() {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      }

      function finish(error, value) {
        cleanup();
        if (error) reject(error);
        else resolve(value);
      }

      window[callback] = response => {
        if (!response || response.ok !== true) {
          const message = response?.erro || 'Falha na comunicação com o Apps Script.';
          cleanup();
          if (ADMIN_ACTIONS.has(action) && !retryingKey && /chave administrativa/i.test(message)) {
            localStorage.removeItem(ADMIN_KEY_STORE);
            remoteRequest(action, params, true).then(resolve, reject);
            return;
          }
          reject(new Error(message));
          return;
        }
        finish(null, normalizeResult(action, response.dados));
      };

      script.onerror = () => finish(new Error('Não foi possível acessar o Apps Script. Verifique a implantação /exec.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  function request(action, params = {}) {
    return C.DEMO_MODE || !String(C.API_BASE || '').trim()
      ? localRequest(action, params)
      : remoteRequest(action, params);
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
    request,
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
    index: B.adjustedIndex,
    clearAdminKey: () => localStorage.removeItem(ADMIN_KEY_STORE)
  };
})();
