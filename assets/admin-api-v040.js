(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;

  const V = window.Volei;
  const C = V.C || {};
  const STORE = 'sorteio_volei_admin_key_v10';
  const CACHE_PREFIX = 'sorteio_volei_read_v040_';
  const PROTECTED = new Set([
    'admin','salvarJogador','excluirJogador','sortearAgora','iniciarContagem','gerarCodigo','cancelar',
    'salvarRegras','iniciarPartida','registrarResultado','salvarPlacarAutomatico',
    'listarCampeonatos','novoCampeonato','abrirCampeonato','arquivarCampeonato','atualizarIndices',
    'resetar','limparTudo','diagnostico'
  ]);
  const READS = new Set(['admin','estado','listarCampeonatos','abrirCampeonato']);
  const TTL = { admin:15000, estado:5000, listarCampeonatos:15000, abrirCampeonato:15000 };
  const memory = new Map();
  const inflight = new Map();
  let readQueue = Promise.resolve();

  function endpoint() {
    const url = String(C.API_BASE || '').trim();
    if (!url) throw new Error('A URL do sistema não está configurada.');
    return url;
  }

  function adminKey(force = false) {
    if (force) localStorage.removeItem(STORE);
    let key = String(localStorage.getItem(STORE) || '').trim();
    if (!key) {
      key = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(STORE, key);
    }
    return key;
  }

  function paramsFor(action, params = {}, forceKey = false) {
    const clean = {};
    Object.entries(params || {}).forEach(([k,v]) => { if (v !== undefined && v !== null) clean[k] = v; });
    if (PROTECTED.has(action)) clean.chave = adminKey(forceKey);
    clean.acao = action;
    clean._ = Date.now();
    return clean;
  }

  function decode(text) {
    const source = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!source) throw new Error('A implantação respondeu sem conteúdo.');
    if (source.startsWith('<')) throw new Error('A implantação não está liberada para acesso externo.');
    try { return JSON.parse(source); } catch (_) {
      const wrapped = source.match(/^[A-Za-z_$][0-9A-Za-z_$.]*\((.*)\);?$/s);
      if (wrapped) return JSON.parse(wrapped[1]);
      throw new Error('A implantação devolveu uma resposta inválida.');
    }
  }

  function unwrap(action, payload) {
    if (!payload?.ok) throw new Error(payload?.erro || 'Falha ao processar a solicitação.');
    const value = payload.dados;
    if ((action === 'admin' || action === 'estado') && typeof V.normalizeState === 'function') return V.normalizeState(value || {});
    return value;
  }

  async function viaFetch(action, params, forceKey = false, timeoutMs = 60000) {
    const query = new URLSearchParams(paramsFor(action, params, forceKey));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${endpoint()}${endpoint().includes('?') ? '&' : '?'}${query}`, {
        method:'GET', mode:'cors', credentials:'omit', cache:'no-store', redirect:'follow', referrerPolicy:'no-referrer', signal:controller.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return unwrap(action, decode(await res.text()));
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Tempo esgotado ao consultar a implantação.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  function viaJsonp(action, params, forceKey = false, timeoutMs = 90000) {
    return new Promise((resolve,reject) => {
      let query;
      try { query = new URLSearchParams(paramsFor(action, params, forceKey)); }
      catch (error) { reject(error); return; }
      const callback = `__voleiV040_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      query.set('callback', callback);
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao consultar a implantação.')), timeoutMs);
      const cleanup = () => {
        clearTimeout(timer); script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      };
      const finish = (error,value) => { if (done) return; done = true; cleanup(); error ? reject(error) : resolve(value); };
      window[callback] = payload => {
        try { finish(null, unwrap(action,payload)); }
        catch (error) { finish(error); }
      };
      script.onerror = () => finish(new Error('A conexão externa com a implantação falhou.'));
      script.src = `${endpoint()}${endpoint().includes('?') ? '&' : '?'}${query}`;
      document.head.appendChild(script);
    });
  }

  function cacheKey(action, params) {
    const clean = { ...(params || {}) }; delete clean.chave; delete clean._;
    return `${action}|${JSON.stringify(clean)}`;
  }
  function saveCache(key,value) {
    const record = { at:Date.now(), value };
    memory.set(key,record);
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record)); } catch (_) {}
  }
  function readCache(key, maxAge) {
    let record = memory.get(key);
    if (!record) {
      try { record = JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || 'null'); } catch (_) {}
    }
    return record && Date.now()-Number(record.at||0) <= maxAge ? record.value : null;
  }

  async function readRemote(action, params = {}, retryKey = false) {
    try { return await viaFetch(action,params,retryKey,55000); }
    catch (fetchError) {
      try { return await viaJsonp(action,params,retryKey,65000); }
      catch (jsonpError) {
        const message = String(jsonpError?.message || fetchError?.message || 'Falha de conexão.');
        if (!retryKey && PROTECTED.has(action) && /chave administrativa/i.test(message)) {
          localStorage.removeItem(STORE);
          return readRemote(action,params,true);
        }
        throw new Error(message);
      }
    }
  }

  async function writeRemote(action, params = {}, retryKey = false) {
    try {
      return await viaJsonp(action,params,retryKey,120000);
    } catch (error) {
      const message = String(error?.message || error || 'Falha ao salvar.');
      if (!retryKey && /chave administrativa/i.test(message)) {
        localStorage.removeItem(STORE);
        return writeRemote(action,params,true);
      }
      // Não repetimos automaticamente uma gravação após erro de rede, evitando duplicidade.
      throw new Error(message);
    }
  }

  function request(action, params = {}) {
    if (!READS.has(action)) return writeRemote(action,params,false).then(value => {
      memory.clear();
      try { Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
      return value;
    });

    const key = cacheKey(action,params);
    const ttl = TTL[action] || 5000;
    const fresh = readCache(key,ttl);
    if (fresh != null) return Promise.resolve(fresh);
    if (inflight.has(key)) return inflight.get(key);

    const task = () => readRemote(action,params,false)
      .then(value => { saveCache(key,value); return value; })
      .catch(error => {
        const stale = readCache(key,5*60*1000);
        if (stale != null) {
          console.warn('V040 usando último estado válido:', error);
          return stale;
        }
        throw error;
      });

    const promise = (readQueue = readQueue.catch(() => {}).then(task)).finally(() => inflight.delete(key));
    inflight.set(key,promise);
    return promise;
  }

  V.request = request;
  V.championshipRequest = request;
  V.invalidateReadCache = () => {
    memory.clear();
    try { Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
  };
  V.clearAdminKey = () => localStorage.removeItem(STORE);
})();
