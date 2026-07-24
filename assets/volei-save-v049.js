(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;
  const V = window.Volei;
  const originalRequest = V.request.bind(V);
  const cfg = window.VOLEI_CONFIG || V.C || {};
  const STORE = 'sorteio_volei_admin_key_v10';

  function key(force = false) {
    if (force) localStorage.removeItem(STORE);
    let value = String(localStorage.getItem(STORE) || '').trim();
    if (!value) {
      value = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!value) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(STORE, value);
    }
    return value;
  }

  function direct(action, params = {}, timeout = 20000, retryKey = false) {
    return new Promise((resolve, reject) => {
      const endpoint = String(cfg.API_BASE || '').trim();
      if (!endpoint) { reject(new Error('A URL do sistema não está configurada.')); return; }
      const clean = {};
      Object.entries(params || {}).forEach(([name, value]) => {
        if (value === undefined || value === null || name === 'chave') return;
        clean[name] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      });
      let admin;
      try { admin = key(retryKey); } catch (error) { reject(error); return; }
      const callback = `__voleiSave49_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...clean, acao:action, chave:admin, callback, _:Date.now() });
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao salvar o placar. A gravação não será repetida automaticamente.')), timeout);
      function cleanup(){clearTimeout(timer);script.remove();try{delete window[callback];}catch(_){window[callback]=undefined;}}
      function finish(error,value){if(done)return;done=true;cleanup();error?reject(error):resolve(value);}
      window[callback] = payload => {
        if (payload?.ok === true) { finish(null,payload.dados); return; }
        const message = payload?.erro || 'Falha ao salvar o placar.';
        if (!retryKey && /chave administrativa/i.test(message)) {
          done = true; cleanup(); localStorage.removeItem(STORE);
          direct(action,params,timeout,true).then(resolve,reject); return;
        }
        finish(new Error(message));
      };
      script.onerror = () => finish(new Error('A implantação recusou o salvamento do placar.'));
      script.src = `${endpoint}${endpoint.includes('?')?'&':'?'}${query}`;
      document.head.appendChild(script);
    });
  }

  function backgroundAfterSave(result) {
    if (result?.partial) return;
    const refresh = () => {
      V.invalidateReadCache?.();
      setTimeout(() => document.getElementById('refreshAdmin')?.click(), 120);
    };
    if (result?.indexRefreshRequired) direct('atualizarIndicesRapido',{},60000).catch(()=>{}).finally(refresh);
    else refresh();
  }

  V.request = function(action, params = {}) {
    if (action !== 'salvarPlacarAutomatico') return originalRequest(action,params);
    return direct('salvarPlacarRapido',params,20000).then(result => {
      backgroundAfterSave(result);
      return result;
    });
  };
})();
