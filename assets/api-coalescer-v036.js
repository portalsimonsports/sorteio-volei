(() => {
  'use strict';
  if (!window.Volei?.request) return;

  const V = window.Volei;
  const original = V.request.bind(V);
  const inflight = new Map();
  const cache = new Map();
  const READ_TTL = { admin: 12000, estado: 4000 };
  const READ_ACTIONS = new Set(['admin','estado']);
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';

  function cacheKey(action, params) {
    if (!READ_ACTIONS.has(action)) return '';
    return `${action}|${JSON.stringify(params || {})}`;
  }

  function normalized(action, value) {
    if ((action === 'admin' || action === 'estado') && typeof V.normalizeState === 'function') {
      return V.normalizeState(value || {});
    }
    return value;
  }

  function longJsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      const endpoint = String(V.C?.API_BASE || '').trim();
      if (!endpoint) { reject(new Error('A URL do sistema não está configurada.')); return; }

      const query = new URLSearchParams({ ...params, acao: action, _: Date.now() });
      if (action === 'admin') {
        let key = localStorage.getItem(ADMIN_KEY_STORE) || '';
        if (!key) {
          key = String(prompt('Informe a chave administrativa:') || '').trim();
          if (!key) { reject(new Error('Chave administrativa não informada.')); return; }
          localStorage.setItem(ADMIN_KEY_STORE, key);
        }
        query.set('chave', key);
      }

      const callback = `__voleiRead36_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      query.set('callback', callback);
      const script = document.createElement('script');
      let done = false;
      const timeoutMs = action === 'admin' ? 55000 : 35000;
      const timer = setTimeout(() => finish(new Error('A consulta demorou mais que o limite esperado. Tente Atualizar painel novamente.')), timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      }
      function finish(error, value) {
        if (done) return;
        done = true;
        cleanup();
        error ? reject(error) : resolve(value);
      }

      window[callback] = response => {
        if (!response?.ok) {
          const message = response?.erro || 'Falha ao carregar os dados.';
          if (action === 'admin' && /chave administrativa/i.test(message)) localStorage.removeItem(ADMIN_KEY_STORE);
          finish(new Error(message));
          return;
        }
        finish(null, normalized(action, response.dados));
      };
      script.onerror = () => finish(new Error('A implantação recusou a consulta externa.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
      document.head.appendChild(script);
    });
  }

  V.request = (action, params = {}) => {
    const key = cacheKey(action, params);
    if (!key) return original(action, params);

    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < (READ_TTL[action] || 0)) return Promise.resolve(cached.value);
    if (inflight.has(key)) return inflight.get(key);

    const promise = longJsonp(action, params)
      .then(value => {
        cache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, promise);
    return promise;
  };

  V.invalidateReadCache = action => {
    [...cache.keys()].forEach(key => {
      if (!action || key.startsWith(`${action}|`)) cache.delete(key);
    });
  };
})();
