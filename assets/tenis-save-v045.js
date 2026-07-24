(() => {
  'use strict';
  if (!window.TenisMesa || !document.body?.dataset.page?.startsWith('tenis-mesa')) return;
  const base = window.TenisMesa;
  const cfg = window.VOLEI_CONFIG || base.C || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const CACHE_ADMIN = 'tenis_mesa_estado_admin_v030';
  const SAVE_ACTIONS = new Set(['tmSalvarPlacarAutomatico']);

  function adminKey(forceNew = false) {
    if (forceNew) localStorage.removeItem(ADMIN_KEY_STORE);
    let key = localStorage.getItem(ADMIN_KEY_STORE) || '';
    if (!key) {
      key = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE, key);
    }
    return key;
  }

  function patchCachedState(result) {
    if (!result?.savedMatch) return result;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_ADMIN) || 'null');
      const state = cached?.value && typeof cached.value === 'object' ? { ...cached.value } : null;
      if (!state) return result;
      if (result.savedMatch.id) {
        const free = Array.isArray(state.freeMatches) ? state.freeMatches.slice() : [];
        const i = free.findIndex(item => item.id === result.savedMatch.id);
        if (i >= 0) free[i] = result.savedMatch; else free.unshift(result.savedMatch);
        state.freeMatches = free;
        if (result.savedMatch.status === 'FINALIZADO' && result.savedMatch.winnerId) {
          state.freeCurrentWinnerId = result.savedMatch.winnerId;
          state.freeCurrentWinnerName = result.savedMatch.winnerId === result.savedMatch.player1Id ? result.savedMatch.player1 : result.savedMatch.player2;
        }
      } else {
        const matches = Array.isArray(state.matches) ? state.matches.slice() : [];
        const i = matches.findIndex(item => String(item.game) === String(result.savedMatch.game));
        if (i >= 0) matches[i] = result.savedMatch;
        if (result.nextMatch) {
          const n = matches.findIndex(item => String(item.game) === String(result.nextMatch.game));
          if (n >= 0) matches[n] = result.nextMatch;
        }
        state.matches = matches;
      }
      localStorage.setItem(CACHE_ADMIN, JSON.stringify({ savedAt: Date.now(), value: state }));
      return { ...result, state };
    } catch (_) { return result; }
  }

  function scheduleFullRefresh(result) {
    if (result?.partial) return;
    setTimeout(() => document.getElementById('tmRefresh')?.click(), 350);
  }

  function saveOnce(action, params = {}, retryingKey = false) {
    return new Promise((resolve, reject) => {
      const endpoint = String(cfg.API_BASE || '').trim();
      if (!endpoint) { reject(new Error('O endereço do serviço de dados não está configurado.')); return; }
      const clean = {};
      Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || key === 'chave') return;
        clean[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      });
      let key;
      try { key = adminKey(retryingKey); } catch (error) { reject(error); return; }
      const callback = `__tmSave47_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const remoteAction = action === 'tmSalvarPlacarAutomatico' ? 'tmSalvarPlacarRapido' : action;
      const query = new URLSearchParams({ ...clean, acao: remoteAction, chave: key, callback, _: Date.now() });
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao salvar o placar. A gravação não será repetida automaticamente.')), 35000);
      function cleanup() { clearTimeout(timer); script.remove(); try { delete window[callback]; } catch (_) { window[callback] = undefined; } }
      function finish(error, value) { if (done) return; done = true; cleanup(); error ? reject(error) : resolve(value); }
      window[callback] = payload => {
        if (payload?.ok === true) {
          const result = patchCachedState(payload.dados);
          scheduleFullRefresh(result);
          finish(null, result);
          return;
        }
        const message = payload?.erro || 'Falha ao salvar o placar.';
        if (!retryingKey && /chave administrativa/i.test(message)) {
          done = true; cleanup(); localStorage.removeItem(ADMIN_KEY_STORE);
          saveOnce(action, params, true).then(resolve, reject); return;
        }
        finish(new Error(message));
      };
      script.onerror = () => finish(new Error('A implantação recusou o salvamento do placar.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  const wrapped = Object.freeze({
    ...base,
    request(action, params = {}) {
      if (SAVE_ACTIONS.has(action)) return saveOnce(action, params);
      return base.request(action, params);
    }
  });
  window.TenisMesa = wrapped;
})();
