(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  async function run() {
    const state = await TM.request('tmAdmin');
    if (!state?.championshipEditable || !state?.championship) return;
    const selected = new Set((state.participants || []).map(item => String(item.id || '')));
    const target = document.getElementById('tmPlayers');
    const apply = () => {
      document.querySelectorAll('[data-select-player]').forEach(input => {
        input.checked = selected.has(String(input.dataset.selectPlayer || ''));
      });
      const count = document.querySelectorAll('[data-select-player]:checked').length;
      const badge = document.getElementById('tmSelectedCount');
      if (badge) badge.textContent = `${count} participante${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`;
    };
    apply();
    if (target) new MutationObserver(apply).observe(target, { childList: true, subtree: true });
    setTimeout(apply, 250);
    setTimeout(apply, 900);
  }
  run().catch(error => console.error('Flex V023 seleção:', error));
})();
