(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const select = document.getElementById('tmMatchSelect');
  const root = document.getElementById('tmScoreFields');
  const form = document.getElementById('tmScoreForm');
  const saveNow = document.getElementById('tmStartMatch');
  const confirm = document.getElementById('tmSaveScore');
  if (!select || !root || !form || !saveNow || !confirm) return;
  let saving = false;

  function syncButtons() {
    const enabled = !!select.value && !saving;
    if (saveNow.disabled === enabled) saveNow.disabled = !enabled;
    if (confirm.disabled === enabled) confirm.disabled = !enabled;
    saveNow.textContent = saving ? 'Salvando...' : 'Salvar agora';
    confirm.textContent = saving ? 'Salvando...' : 'Confirmar placar';
  }

  function visibleScores() {
    const auto = [...root.querySelectorAll('[data-pa31-value]')];
    if (auto.length) {
      const bySet = {};
      auto.forEach(input => {
        const set = Number(input.dataset.set || 0), side = Number(input.dataset.side || 0);
        if (!bySet[set]) bySet[set] = ['', ''];
        bySet[set][side] = input.value;
      });
      return Object.keys(bySet).map(Number).sort((a,b)=>a-b).map(index => bySet[index]);
    }
    const scores = [];
    const aInputs = [...root.querySelectorAll('[data-score-a]')];
    aInputs.forEach(input => {
      const index = Number(input.dataset.scoreA || 0);
      const b = root.querySelector(`[data-score-b="${index}"]`);
      const av = input.value ?? '', bv = b?.value ?? '';
      if (av !== '' || bv !== '') scores.push([av, bv]);
    });
    return scores;
  }

  async function saveVisibleScore() {
    if (saving) return;
    if (!select.value) { TM.toast?.('Selecione uma partida.', 'warn'); return; }
    const scores = visibleScores();
    if (!scores.length) { TM.toast?.('Informe o placar da partida.', 'warn'); return; }
    saving = true; syncButtons();
    try {
      const result = await TM.request('tmSalvarPlacarAutomatico', { tipo:'CAMPEONATO', jogo:select.value, placar:scores });
      TM.toast?.(result?.message || (result?.partial ? 'Placar salvo.' : 'Resultado salvo.'));
    } catch (error) {
      TM.toast?.(error?.message || 'Não foi possível salvar o placar.', 'error');
    } finally {
      saving = false; syncButtons();
    }
  }

  // Captura no window antes dos listeners antigos do formulário/botões.
  window.addEventListener('click', event => {
    const button = event.target.closest?.('#tmStartMatch');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    saveVisibleScore();
  }, true);

  window.addEventListener('submit', event => {
    if (event.target !== form) return;
    event.preventDefault(); event.stopImmediatePropagation();
    saveVisibleScore();
  }, true);

  select.addEventListener('change', () => setTimeout(syncButtons, 0));
  const observer = new MutationObserver(syncButtons);
  observer.observe(saveNow, { attributes: true, attributeFilter: ['disabled'] });
  observer.observe(confirm, { attributes: true, attributeFilter: ['disabled'] });
  observer.observe(select, { attributes: true, childList: true, subtree: true });
  syncButtons();
})();
