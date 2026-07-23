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
    exactReplacements.forEach(([pattern, replacement]) => {
      output = output.replace(pattern, replacement);
    });
    return output;
  }

  function hideAdministrativeLinks() {
    ['sheetLink', 'tmSheetLink'].forEach(id => {
      const link = document.getElementById(id);
      if (!link) return;
      const section = link.closest('section');
      if (section) {
        section.hidden = true;
        section.setAttribute('aria-hidden', 'true');
      } else {
        link.hidden = true;
        link.setAttribute('aria-hidden', 'true');
      }
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

  const originalConfirm = window.confirm.bind(window);
  window.confirm = message => originalConfirm(sanitizeText(message));

  const originalAlert = window.alert.bind(window);
  window.alert = message => originalAlert(sanitizeText(message));

  const originalPrompt = window.prompt.bind(window);
  window.prompt = (message, defaultValue) => originalPrompt(sanitizeText(message), defaultValue);

  sanitizeNode(document);
  new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(sanitizeNode);
      if (record.type === 'characterData') sanitizeNode(record.target);
    });
    hideAdministrativeLinks();
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
