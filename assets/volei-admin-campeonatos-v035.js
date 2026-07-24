(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;
  const V = window.Volei;
  const A = window.VoleiAdmin;
  const target = document.getElementById('v035Championships');
  const counter = document.getElementById('v035ChampionshipsStatus');
  if (!target) return;
  let state = null;
  let items = [];

  const esc = value => V.esc ? V.esc(value) : String(value ?? '');
  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const openStatus = status => ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].includes(String(status || '').toUpperCase());
  const statusText = status => ({SORTEADO:'NÃO INICIADO',NAO_INICIADO:'NÃO INICIADO',EM_CONTAGEM:'PREPARANDO',EM_ANDAMENTO:'EM ANDAMENTO',FINALIZADO:'FINALIZADO',CANCELADO:'CANCELADO',AGENDADO:'AGENDADO'})[String(status || '').toUpperCase()] || String(status || 'CAMPEONATO');

  function currentId() {
    const open = items.find(item => openStatus(item.status));
    if (open) return String(open.id || '');
    const marked = items.find(item => String(item.active || '').toUpperCase() === 'SIM');
    return String(marked?.id || state?.championship?.id || items[0]?.id || '');
  }

  function dateText(value) {
    try {
      const d = V.date?.(value);
      if (d) return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    } catch (_) {}
    return String(value || '—');
  }

  function render() {
    const current = currentId();
    if (counter) counter.textContent = `${items.length} campeonato${items.length === 1 ? '' : 's'}`;
    if (!items.length) {
      target.innerHTML = '<div class="v035-empty">Nenhum campeonato cadastrado.</div>';
      return;
    }
    target.innerHTML = `<div class="v035-champ-list">${items.map(item => {
      const isCurrent = String(item.id) === current;
      const editable = isCurrent && state?.championshipEditable && openStatus(item.status);
      return `<article class="v035-champ-card${isCurrent ? ' current' : ''}"><div class="v035-champ-main"><strong>${esc(item.name || item.id)}</strong><small>${esc(statusText(item.status))} • ${n(item.teamCount)} equipe${n(item.teamCount) === 1 ? '' : 's'} • ${esc(dateText(item.createdAt))}</small><div class="v035-champ-tags">${isCurrent ? '<span class="v035-champ-tag current">Campeonato atual</span>' : ''}<span class="v035-champ-tag">${esc(statusText(item.status))}</span></div></div><div class="v035-champ-actions"><button class="btn secondary small" type="button" data-v035-open="${esc(item.id)}">Ver</button>${editable ? `<button class="btn primary small" type="button" data-v035-edit="${esc(item.id)}">Editar</button>` : ''}</div></article>`;
    }).join('')}</div>`;
  }

  async function load() {
    try {
      state = await V.request('admin');
      const result = await V.championshipRequest('listarCampeonatos');
      items = Array.isArray(result) ? result : [];
      render();
    } catch (error) {
      target.innerHTML = `<div class="v035-empty">Falha ao carregar campeonatos: ${esc(error.message || 'erro')}</div>`;
    }
  }

  target.addEventListener('click', async event => {
    const edit = event.target.closest('[data-v035-edit]');
    if (edit) {
      document.getElementById('v025ToggleEdit')?.click();
      document.getElementById('championshipForm')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const button = event.target.closest('[data-v035-open]');
    if (!button) return;
    try {
      const id = button.dataset.v035Open;
      const opened = id === currentId() && state ? state : await V.championshipRequest('abrirCampeonato',{id});
      if (A?.render) A.render(V.normalizeState ? V.normalizeState(opened) : opened);
      document.getElementById('teamsPreview')?.scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) {
      V.toast?.(error.message || 'Falha ao abrir campeonato.','error');
    }
  });

  load();
})();
