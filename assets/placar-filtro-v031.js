(() => {
  'use strict';
  const configs = [
    { id: 'scoreGame', allowed: ['LIBERADO','EM_DISPUTA','FINALIZADO'] },
    { id: 'tmMatchSelect', allowed: ['LIBERADO','EM_ANDAMENTO','FINALIZADO'] }
  ];
  function apply(config) {
    const select = document.getElementById(config.id);
    if (!select) return;
    [...select.options].forEach(option => {
      if (!option.value) return;
      const status = String(option.textContent || '').split('—').pop().trim().toUpperCase();
      option.hidden = !config.allowed.includes(status);
      option.disabled = !config.allowed.includes(status);
    });
    const selected = select.options[select.selectedIndex];
    if (selected?.disabled) {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  configs.forEach(config => {
    const select = document.getElementById(config.id);
    if (!select) return;
    apply(config);
    new MutationObserver(() => apply(config)).observe(select, { childList: true, subtree: true });
  });
})();
