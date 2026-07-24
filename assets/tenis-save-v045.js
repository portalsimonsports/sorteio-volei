(() => {
  'use strict';
  if (!window.TenisMesa || !document.body?.dataset.page?.startsWith('tenis-mesa')) return;
  const base = window.TenisMesa;
  const cfg = window.VOLEI_CONFIG || base.C || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
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
      const callback = `__tmSave45_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...clean, acao: action, chave: key, callback, _: Date.now() });
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao salvar o placar. A gravação não será repetida automaticamente.')), 90000);
      function cleanup() { clearTimeout(timer); script.remove(); try { delete window[callback]; } catch (_) { window[callback] = undefined; } }
      function finish(error, value) { if (done) return; done = true; cleanup(); error ? reject(error) : resolve(value); }
      window[callback] = payload => {
        if (payload?.ok === true) { finish(null, payload.dados); return; }
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
