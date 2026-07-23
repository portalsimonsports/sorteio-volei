(() => {
  'use strict';
  const C = window.VOLEI_CONFIG || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const ADMIN_ACTIONS = new Set([
    'tmAdmin','tmSalvarJogador','tmExcluirJogador','tmCriarCampeonato',
    'tmIniciarPartida','tmRegistrarResultado','tmAbrirCampeonato'
  ]);

  try {
    const informed = new URLSearchParams(location.search).get('chave');
    if (informed) localStorage.setItem(ADMIN_KEY_STORE, informed.trim());
  } catch (_) {}

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function num(value) {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmt(value, digits = 1) {
    return num(value).toLocaleString('pt-BR', { maximumFractionDigits: digits });
  }

  function dateTime(value) {
    if (!value) return '';
    const text = String(value);
    let date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (match) date = new Date(+match[3], +match[2] - 1, +match[1], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    }
    return Number.isNaN(date.getTime()) ? text : date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function adminKey(forceNew = false) {
    if (forceNew) localStorage.removeItem(ADMIN_KEY_STORE);
    let key = localStorage.getItem(ADMIN_KEY_STORE) || '';
    if (!key) {
      key = String(prompt('Informe a chave administrativa gravada na aba CONFIG:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(ADMIN_KEY_STORE, key);
    }
    return key;
  }

  function buildQuery(action, params = {}, retryingKey = false) {
    const clean = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      clean[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    const query = new URLSearchParams({ ...clean, acao: action, _: Date.now() });
    if (ADMIN_ACTIONS.has(action)) query.set('chave', adminKey(retryingKey));
    return query;
  }

  function processResponse(action, response, retryingKey, retry) {
    if (!response || response.ok !== true) {
      const message = response?.erro || 'Falha na comunicação com o Apps Script.';
      if (ADMIN_ACTIONS.has(action) && !retryingKey && /chave administrativa/i.test(message)) {
        localStorage.removeItem(ADMIN_KEY_STORE);
        return retry(true);
      }
      throw new Error(message);
    }
    return response.dados;
  }

  function jsonp(action, params = {}, retryingKey = false) {
    return new Promise((resolve, reject) => {
      const endpoint = String(C.API_BASE || '').trim();
      if (!endpoint) return reject(new Error('A URL do Apps Script não está configurada.'));
      let query;
      try { query = buildQuery(action, params, retryingKey); } catch (error) { reject(error); return; }
      const callback = `__tmJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      query.set('callback', callback);
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
      window[callback] = async response => {
        try {
          const value = await processResponse(action, response, retryingKey, force => jsonp(action, params, force));
          finish(null, value);
        } catch (error) { finish(error); }
      };
      script.onerror = () => finish(new Error('A implantação do Apps Script recusou o carregamento externo.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
      document.head.appendChild(script);
    });
  }

  async function fetchRequest(action, params = {}, retryingKey = false) {
    const endpoint = String(C.API_BASE || '').trim();
    const query = buildQuery(action, params, retryingKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`, {
        method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = JSON.parse((await response.text()).trim());
      return await processResponse(action, payload, retryingKey, force => fetchRequest(action, params, force));
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Tempo esgotado ao acessar o Apps Script.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function request(action, params = {}) {
    try { return await jsonp(action, params); }
    catch (jsonpError) {
      try { return await fetchRequest(action, params); }
      catch (_) { throw jsonpError; }
    }
  }

  function toast(text, type = 'ok') {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = text;
    wrap.appendChild(item);
    setTimeout(() => item.remove(), 5200);
  }

  window.TenisMesa = Object.freeze({ C, request, esc, num, fmt, dateTime, toast });
})();
