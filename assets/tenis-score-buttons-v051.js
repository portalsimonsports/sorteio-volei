(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin') return;
  const select = document.getElementById('tmMatchSelect');
  const saveNow = document.getElementById('tmStartMatch');
  const confirm = document.getElementById('tmSaveScore');
  if (!select || !saveNow || !confirm) return;

  function syncButtons() {
    const enabled = !!select.value;
    if (saveNow.disabled === enabled) saveNow.disabled = !enabled;
    if (confirm.disabled === enabled) confirm.disabled = !enabled;
    saveNow.textContent = 'Salvar agora';
  }

  select.addEventListener('change', () => setTimeout(syncButtons, 0));
  const observer = new MutationObserver(syncButtons);
  observer.observe(saveNow, { attributes: true, attributeFilter: ['disabled'] });
  observer.observe(confirm, { attributes: true, attributeFilter: ['disabled'] });
  observer.observe(select, { attributes: true, childList: true, subtree: true });
  syncButtons();
})();
