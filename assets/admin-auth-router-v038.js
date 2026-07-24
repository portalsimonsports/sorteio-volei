(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei?.request) return;

  const V = window.Volei;
  const original = V.request.bind(V);
  const STORE = 'sorteio_volei_admin_key_v10';
  const PROTECTED = new Set([
    'admin','salvarJogador','excluirJogador','sortearAgora','iniciarContagem','gerarCodigo','cancelar',
    'salvarRegras','iniciarPartida','registrarResultado','salvarPlacarAutomatico',
    'listarCampeonatos','novoCampeonato','abrirCampeonato','arquivarCampeonato','atualizarIndices',
    'resetar','limparTudo','diagnostico'
  ]);

  function getKey(forcePrompt = false) {
    if (forcePrompt) localStorage.removeItem(STORE);
    let key = String(localStorage.getItem(STORE) || '').trim();
    if (!key) {
      key = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(STORE, key);
    }
    return key;
  }

  async function request(action, params = {}, retrying = false) {
    if (!PROTECTED.has(action)) return original(action, params);
    let key;
    try { key = getKey(retrying); }
    catch (error) { return Promise.reject(error); }

    try {
      return await original(action, { ...(params || {}), chave: key });
    } catch (error) {
      const message = String(error?.message || error || '');
      if (!retrying && /chave administrativa/i.test(message)) {
        localStorage.removeItem(STORE);
        return request(action, params, true);
      }
      throw error;
    }
  }

  V.request = (action, params = {}) => request(action, params, false);
})();
