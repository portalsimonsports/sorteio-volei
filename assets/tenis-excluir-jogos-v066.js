(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const LIST_ID = 'tmFreeMatches';
  const KEY_STORE = 'sorteio_volei_admin_key_v10';
  let processing = false;

  function adminKey(force = false) {
    if (force) localStorage.removeItem(KEY_STORE);
    let key = String(localStorage.getItem(KEY_STORE) || '').trim();
    if (!key) {
      key = String(prompt('Informe a chave administrativa:') || '').trim();
      if (!key) throw new Error('Chave administrativa não informada.');
      localStorage.setItem(KEY_STORE, key);
    }
    return key;
  }

  async function requestDelete(id, retry = false) {
    try {
      return await TM.request('tmExcluirJogoAvulso', {
        id,
        chave: adminKey(retry)
      });
    } catch (error) {
      if (!retry && /chave administrativa/i.test(error?.message || '')) {
        localStorage.removeItem(KEY_STORE);
        return requestDelete(id, true);
      }
      throw error;
    }
  }

  function installButtons() {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    list.querySelectorAll('.flex-v023-free-item').forEach(item => {
      const scoreButton = item.querySelector('[data-tm-free-score]');
      if (!scoreButton || item.querySelector('[data-tm66-delete-free]')) return;

      let actions = item.querySelector('.tm66-free-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'tm66-free-actions';
        actions.style.cssText = 'display:grid;gap:10px;width:100%;min-width:180px';
        scoreButton.insertAdjacentElement('beforebegin', actions);
        actions.appendChild(scoreButton);
      }

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'tm-button secondary';
      deleteButton.dataset.tm66DeleteFree = scoreButton.dataset.tmFreeScore;
      deleteButton.textContent = 'Excluir jogo';
      deleteButton.style.cssText = 'background:#fff1f1;border-color:#efb4b4;color:#a71919';
      actions.appendChild(deleteButton);
    });
  }

  async function deleteMatch(button) {
    if (processing) return;
    const id = String(button.dataset.tm66DeleteFree || '').trim();
    if (!id) return;

    const item = button.closest('.flex-v023-free-item');
    const title = item?.querySelector('strong')?.textContent?.trim() || 'este jogo';
    const confirmed = confirm(`Excluir ${title}?\n\nO jogo, o placar e o resultado serão removidos. Todos os rankings serão recalculados.`);
    if (!confirmed) return;

    processing = true;
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Excluindo...';

    try {
      const result = await requestDelete(id);
      item?.remove();
      TM.toast(result?.message || 'Jogo excluído. Rankings recalculados.');
      window.dispatchEvent(new CustomEvent('tm54-history-changed'));
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      TM.toast(error?.message || 'Não foi possível excluir o jogo.', 'error');
      button.disabled = false;
      button.textContent = oldText;
    } finally {
      processing = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-tm66-delete-free]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    deleteMatch(button);
  });

  const start = () => {
    const list = document.getElementById(LIST_ID);
    if (!list) return;
    installButtons();
    new MutationObserver(installButtons).observe(list, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
