(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;

  const TM = window.TenisMesa;
  const LIST_ID = 'tmFreeMatches';
  const KEY_STORE = 'sorteio_volei_admin_key_v10';
  let processing = false;
  let modalResolve = null;

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

  function ensureDeleteModal() {
    let modal = document.getElementById('tm67DeleteModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'tm67DeleteModal';
    modal.className = 'tm67-delete-modal';
    modal.hidden = true;
    modal.dataset.busy = 'false';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tm67DeleteTitle');
    modal.setAttribute('aria-describedby', 'tm67DeleteDescription');
    modal.innerHTML = `
      <div class="tm67-delete-dialog" data-tm67-dialog>
        <button class="tm67-delete-close" type="button" aria-label="Fechar" data-tm67-cancel>×</button>
        <div class="tm67-delete-icon" aria-hidden="true">🗑️</div>
        <span class="tm67-delete-kicker">Ação permanente</span>
        <h2 class="tm67-delete-title" id="tm67DeleteTitle">Excluir este jogo?</h2>
        <p class="tm67-delete-copy" id="tm67DeleteDescription">Confirme a remoção definitiva deste confronto.</p>
        <div class="tm67-delete-match" data-tm67-match></div>
        <div class="tm67-delete-warning"><span aria-hidden="true">⚠️</span><span>O jogo, o placar e o resultado serão removidos. Todos os rankings serão recalculados automaticamente.</span></div>
        <div class="tm67-delete-actions">
          <button class="tm67-delete-action tm67-delete-cancel" type="button" data-tm67-cancel>Cancelar</button>
          <button class="tm67-delete-action tm67-delete-confirm" type="button" data-tm67-confirm>Excluir jogo</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const cancel = () => {
      if (modal.dataset.busy === 'true') return;
      closeDeleteModal(false);
    };

    modal.querySelectorAll('[data-tm67-cancel]').forEach(button => button.addEventListener('click', cancel));
    modal.querySelector('[data-tm67-confirm]')?.addEventListener('click', () => {
      if (!modalResolve || modal.dataset.busy === 'true') return;
      modal.dataset.busy = 'true';
      const confirmButton = modal.querySelector('[data-tm67-confirm]');
      confirmButton.disabled = true;
      confirmButton.textContent = 'Excluindo...';
      const resolve = modalResolve;
      modalResolve = null;
      resolve(true);
    });
    modal.addEventListener('click', event => {
      if (event.target === modal) cancel();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) cancel();
    });
    return modal;
  }

  function openDeleteModal(title) {
    const modal = ensureDeleteModal();
    modal.hidden = false;
    modal.dataset.busy = 'false';
    modal.querySelector('[data-tm67-match]').textContent = title;
    const confirmButton = modal.querySelector('[data-tm67-confirm]');
    confirmButton.disabled = false;
    confirmButton.textContent = 'Excluir jogo';
    document.body.classList.add('tm67-modal-open');
    setTimeout(() => modal.querySelector('.tm67-delete-cancel')?.focus(), 40);
    return new Promise(resolve => { modalResolve = resolve; });
  }

  function closeDeleteModal(result = false) {
    const modal = document.getElementById('tm67DeleteModal');
    if (!modal) return;
    if (modalResolve) {
      const resolve = modalResolve;
      modalResolve = null;
      resolve(result);
    }
    modal.hidden = true;
    modal.dataset.busy = 'false';
    document.body.classList.remove('tm67-modal-open');
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
    const title = item?.querySelector('strong')?.textContent?.trim() || 'Este jogo';
    const confirmed = await openDeleteModal(title);
    if (!confirmed) return;

    processing = true;
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Excluindo...';

    try {
      const result = await requestDelete(id);
      item?.remove();
      closeDeleteModal();
      TM.toast(result?.message || 'Jogo excluído. Rankings recalculados.');
      window.dispatchEvent(new CustomEvent('tm54-history-changed'));
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      closeDeleteModal();
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
    ensureDeleteModal();
    installButtons();
    new MutationObserver(installButtons).observe(list, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
