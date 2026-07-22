(() => {
  'use strict';
  if (!window.Volei) return;

  const V = window.Volei;
  const C = V.C || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const LOCAL_HISTORY_KEY = 'sorteio_volei_campeonatos_v016';

  function adminKey() {
    let key = localStorage.getItem(ADMIN_KEY_STORE) || '';
    if (!key) {
      key = String(prompt('Informe a chave administrativa gravada na aba CONFIG:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE, key);
    }
    return key;
  }

  function localHistory() {
    try { return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function saveLocalHistory(items) {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
  }

  function localRequest(action, params = {}) {
    const state = V.read();
    const history = localHistory();

    if (action === 'listarCampeonatos') return Promise.resolve(history);
    if (action === 'abrirCampeonato') {
      const item = history.find(entry => entry.id === params.id);
      if (!item) return Promise.reject(new Error('Campeonato não encontrado.'));
      return Promise.resolve(item.state);
    }
    if (action === 'novoCampeonato') {
      if (state.rounds?.length) {
        history.unshift({
          id: state.championship?.id || `CAM-${Date.now()}`,
          name: state.championship?.name || `Campeonato ${history.length + 1}`,
          status: state.status,
          teamCount: state.teams?.length || 0,
          createdAt: state.serverTime || new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          active: 'NAO',
          state: JSON.parse(JSON.stringify(state))
        });
      }
      const teams = params.modoEquipes === 'NOVAS_DUPLAS'
        ? window.VoleiTournament.balanceTeams(state.players)
        : (state.teams || []).map(team => ({ ...team }));
      if (teams.length < 2) return Promise.reject(new Error('Não existem duplas suficientes.'));
      const seed = `${Date.now()}-${Math.random()}`;
      const next = V.initialState();
      next.players = state.players || [];
      next.teams = teams;
      next.rounds = window.VoleiTournament.buildBracket(teams, seed);
      next.status = 'SORTEADO';
      next.message = 'Novo campeonato criado com histórico preservado.';
      next.championship = {
        id: `CAM-${Date.now()}`,
        name: params.nome || `Campeonato ${history.length + 1}`,
        bracketModel: params.modelo || 'AUTOMATICO',
        teamSource: params.modoEquipes || 'MESMAS_EQUIPES',
        active: 'SIM'
      };
      V.saveState(next);
      saveLocalHistory(history);
      return Promise.resolve({ message: next.message, state: next, championships: history });
    }
    return Promise.reject(new Error(`Ação de campeonato não implementada: ${action}`));
  }

  function remoteRequest(action, params = {}) {
    return new Promise((resolve, reject) => {
      const endpoint = String(C.API_BASE || '').trim();
      if (!endpoint) { reject(new Error('A URL do Apps Script não foi configurada.')); return; }
      let key;
      try { key = adminKey(); } catch (error) { reject(error); return; }
      const callback = `__voleiChamp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...params, acao: action, chave: key, callback, _: Date.now() });
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao acessar o Apps Script.')), 20000);

      function cleanup() {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      }
      function finish(error, value) {
        if (done) return;
        done = true;
        cleanup();
        if (error) reject(error); else resolve(value);
      }

      window[callback] = response => {
        if (!response?.ok) {
          const message = response?.erro || 'Falha ao processar o campeonato.';
          if (/chave administrativa/i.test(message)) localStorage.removeItem(ADMIN_KEY_STORE);
          finish(new Error(message));
          return;
        }
        finish(null, response.dados);
      };
      script.onerror = () => finish(new Error('A implantação atual do Apps Script não possui o módulo de campeonatos.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
      document.head.appendChild(script);
    });
  }

  V.championshipRequest = (action, params = {}) =>
    C.DEMO_MODE || !String(C.API_BASE || '').trim()
      ? localRequest(action, params)
      : remoteRequest(action, params);
})();
