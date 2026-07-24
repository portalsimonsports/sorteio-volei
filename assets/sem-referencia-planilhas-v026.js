(() => {
  'use strict';

  const exactReplacements = [
    [/Conectando ao Google Sheets\.\.\./gi, 'Carregando dados...'],
    [/Sincronizado com Google Sheets/gi, 'Dados atualizados'],
    [/Planilha Google/gi, 'Dados administrativos'],
    [/Abrir planilha administrativa/gi, ''],
    [/histórico da planilha/gi, 'histórico do sistema'],
    [/Dados da planilha apagados/gi, 'Dados do sistema apagados'],
    [/Google Sheets/gi, 'sistema'],
    [/planilhas?/gi, 'dados']
  ];

  function sanitizeText(value) {
    let output = String(value ?? '');
    exactReplacements.forEach(([pattern, replacement]) => { output = output.replace(pattern, replacement); });
    return output;
  }

  function hideAdministrativeLinks() {
    ['sheetLink', 'tmSheetLink'].forEach(id => {
      const link = document.getElementById(id);
      if (!link) return;
      const section = link.closest('section');
      if (section) { section.hidden = true; section.setAttribute('aria-hidden', 'true'); }
      else { link.hidden = true; link.setAttribute('aria-hidden', 'true'); }
    });
  }

  function sanitizeNode(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const clean = sanitizeText(root.nodeValue);
      if (clean !== root.nodeValue) root.nodeValue = clean;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const clean = sanitizeText(node.nodeValue);
      if (clean !== node.nodeValue) node.nodeValue = clean;
    }
    hideAdministrativeLinks();
  }

  function ensureTennisBootstrapFields() {
    if (document.body?.dataset.page !== 'tenis-mesa-admin') return;
    const form = document.getElementById('tmTournamentForm');
    if (!form || document.getElementById('tmBestOf')) return;
    const bootstrap = document.createElement('div');
    bootstrap.hidden = true;
    bootstrap.setAttribute('aria-hidden', 'true');
    bootstrap.innerHTML = '<input id="tmTournamentName"><select id="tmBestOf"><option value="3">3</option></select><input id="tmSetPoints" value="11"><input id="tmMinimumLead" value="2"><input id="tmWinPoints" value="3"><input id="tmLossPoints" value="0"><input id="tmMaxGamesPlayer" value="0"><input id="tmMaxGamesTotal" value="0"><input id="tmTurns" value="1"><select id="tmAutoStart"><option value="SIM">SIM</option></select><button id="tmCreateTournament" type="submit">Carregar</button>';
    form.appendChild(bootstrap);
  }

  function installTennisRecovery() {
    if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
    const status = document.getElementById('tmAdminConnection');
    const refresh = document.getElementById('tmRefresh');
    const footerVersion = document.querySelector('.tm-footer span:last-child');
    if (footerVersion) footerVersion.textContent = 'V030';
    let attempts = 0;

    async function recover() {
      if (attempts >= 4) return;
      const current = String(status?.textContent || '');
      if (!/não foi possível|falha|carregando/i.test(current) && attempts > 0) return;
      attempts++;
      try {
        const state = await window.TenisMesa.request('tmAdmin');
        if (status) status.textContent = state?._fallback ? 'Dados de contingência carregados' : 'Dados atualizados';
        if (refresh && attempts === 1) setTimeout(() => refresh.click(), 50);
      } catch (error) {
        if (status) status.textContent = `Falha temporária: ${sanitizeText(error.message || 'não foi possível atualizar')}`;
      }
    }

    setTimeout(recover, 900);
    const timer = setInterval(() => {
      recover();
      if (attempts >= 4 || !/não foi possível|falha|carregando/i.test(String(status?.textContent || ''))) clearInterval(timer);
    }, 6000);
  }

  const originalConfirm = window.confirm.bind(window);
  window.confirm = message => originalConfirm(sanitizeText(message));
  const originalAlert = window.alert.bind(window);
  window.alert = message => originalAlert(sanitizeText(message));
  const originalPrompt = window.prompt.bind(window);
  window.prompt = (message, defaultValue) => originalPrompt(sanitizeText(message), defaultValue);

  ensureTennisBootstrapFields();
  sanitizeNode(document);
  new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(sanitizeNode);
      if (record.type === 'characterData') sanitizeNode(record.target);
    });
    hideAdministrativeLinks();
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  installTennisRecovery();
})();
