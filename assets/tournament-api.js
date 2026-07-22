(() => {
  'use strict';

  const B = window.VoleiBase;
  const T = window.VoleiTournament;
  const S = window.VoleiScore;
  if (!B || !T || !S) return;

  const C = B.C || {};
  const ADMIN_KEY_STORE = 'sorteio_volei_admin_key_v10';
  const ADMIN_ACTIONS = new Set([
    'admin', 'salvarJogador', 'excluirJogador', 'sortearAgora', 'iniciarContagem',
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

      if (action === 'iniciarContagem') {
        const state = B.readState();
        const seconds = Number(params.segundos || C.COUNTDOWN_SECONDS || 1200);
        state.status = 'EM_CONTAGEM';
        state.message = 'Contagem regressiva iniciada.';
        state.inicioPrevisto = new Date(Date.now() + seconds * 1000).toISOString();
        state.rules = { ...(state.rules || {}), countdownSeconds: seconds };
        B.saveState(state);
        setTimeout(() => T.runDraw(), seconds * 1000);
        return Promise.resolve({ message: 'Contagem regressiva iniciada.', state });
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
      key = String(prompt('Informe a chave administrativa gravada na aba CONFIG:') || '').trim();
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

  function buildQuery(action, params = {}, retryingKey = false) {
    const clean = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) clean[key] = value;
    });
    const query = new URLSearchParams({ ...clean, acao: action, _: Date.now() });
    if (ADMIN_ACTIONS.has(action)) query.set('chave', adminKey(retryingKey));
    return query;
  }

  function decodePayload(text) {
    const source = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!source) throw new Error('O Apps Script respondeu sem conteúdo.');
    if (source.startsWith('<')) throw new Error('A implantação exige login ou não está liberada para acesso público.');
    try {
      return JSON.parse(source);
    } catch (_) {
      const wrapped = source.match(/^[A-Za-z_$][0-9A-Za-z_$.]*\((.*)\);?$/s);
      if (wrapped) return JSON.parse(wrapped[1]);
      throw new Error('O Apps Script devolveu uma resposta inválida.');
    }
  }

  function processResponse(action, response, retryingKey, retryFunction) {
    if (!response || response.ok !== true) {
      const message = response?.erro || 'Falha na comunicação com o Apps Script.';
      if (ADMIN_ACTIONS.has(action) && !retryingKey && /chave administrativa/i.test(message)) {
        localStorage.removeItem(ADMIN_KEY_STORE);
        return retryFunction(true);
      }
      throw new Error(message);
    }
    return normalizeResult(action, response.dados);
  }

  async function fetchRequest(action, params = {}, retryingKey = false) {
    const endpoint = String(C.API_BASE || '').trim();
    if (!endpoint) throw new Error('A URL do Apps Script ainda não foi configurada.');
    const query = buildQuery(action, params, retryingKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`, {
        method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
        redirect: 'follow', referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = decodePayload(await response.text());
      return await processResponse(action, payload, retryingKey, force => fetchRequest(action, params, force));
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Tempo esgotado ao consultar o Apps Script.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function jsonpRequest(action, params = {}, retryingKey = false) {
    return new Promise((resolve, reject) => {
      const endpoint = String(C.API_BASE || '').trim();
      if (!endpoint) {
        reject(new Error('A URL do Apps Script ainda não foi configurada.'));
        return;
      }

      let query;
      try {
        query = buildQuery(action, params, retryingKey);
      } catch (error) {
        reject(error);
        return;
      }

      const callback = `__voleiJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      query.set('callback', callback);
      const script = document.createElement('script');
      let finished = false;
      const timer = setTimeout(() => finish(new Error('Tempo esgotado ao consultar o Apps Script.')), 18000);

      function cleanup() {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      }

      function finish(error, value) {
        if (finished) return;
        finished = true;
        cleanup();
        if (error) reject(error); else resolve(value);
      }

      window[callback] = async response => {
        try {
          const value = await processResponse(action, response, retryingKey, force => jsonpRequest(action, params, force));
          finish(null, value);
        } catch (error) {
          finish(error);
        }
      };

      script.onerror = () => finish(new Error('A implantação /exec recusou o carregamento externo.'));
      script.src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
      document.head.appendChild(script);
    });
  }

  async function remoteRequest(action, params = {}) {
    try {
      return await jsonpRequest(action, params);
    } catch (jsonpError) {
      try {
        return await fetchRequest(action, params);
      } catch (fetchError) {
        const detail = jsonpError?.message || fetchError?.message || 'falha desconhecida';
        throw new Error(`Não foi possível acessar o Apps Script: ${detail}`);
      }
    }
  }

  function request(action, params = {}) {
    return C.DEMO_MODE || !String(C.API_BASE || '').trim()
      ? localRequest(action, params)
      : remoteRequest(action, params);
  }

  function validatePlayer(params) {
    const score = B.num(params?.score ?? params?.nota);
    if (!Number.isInteger(score) || score < 5 || score > 10) {
      throw new Error('Avalie o seu jogo com uma nota inteira de 5 a 10.');
    }
    return B.validatePlayer(params);
  }

  function configureRatingField() {
    ['signupScore', 'playerScore'].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.min = '5';
      input.max = '10';
      input.step = '1';
      input.placeholder = '5 a 10';
      const label = input.closest('label');
      if (label?.firstChild?.nodeType === Node.TEXT_NODE) {
        label.firstChild.nodeValue = 'Como você avalia o seu jogo? (5 a 10)';
      }
    });
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

  window.Volei = {
    ...B,
    request,
    validatePlayer,
    validateScore: S.validateScore,
    teamName: team => team
      ? ([team.member1, team.member2].filter(Boolean).join(' + ') || [team.adult, team.child].filter(Boolean).join(' + ') || team.id || '')
      : '',
    dateTime: value => {
      const date = B.parseDate(value);
      return date
        ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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

  configureRatingField();
})();
