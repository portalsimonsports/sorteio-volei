(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin') return;
  window.__TM53_MANUAL_SAVE_UNTIL = 0;
  window.__TM53_SUPPRESS_MANUAL_SAVE = false;
  document.addEventListener('click', event => {
    if (event.target.closest('[data-tm52-points]')) {
      window.__TM53_SUPPRESS_MANUAL_SAVE = true;
      setTimeout(() => { window.__TM53_SUPPRESS_MANUAL_SAVE = false; }, 0);
      return;
    }
    if (window.__TM53_SUPPRESS_MANUAL_SAVE) return;
    const button = event.target.closest('[data-pa31-save], #tmStartMatch, #tmSaveScore');
    if (!button) return;
    window.__TM53_MANUAL_SAVE_UNTIL = Date.now() + 1800;
  }, true);
})();
