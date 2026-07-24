(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei;
  const esc = V.esc || (value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const grid = document.getElementById('teamsGrid');
  const summary = document.getElementById('balanceSummary');
  const heading = document.querySelector('#equipes .section-head h2');
  if (!grid) return;
  let rendering = false, lastGroups = [], openedId = '';

  function key(value) {
    let s = String(value ?? '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch (_) {}
    return s;
  }
  function uniqueNames(values) {
    const out = [], seen = new Set();
    const add = value => String(value ?? '').split(/\s*\+\s*/).forEach(part => {
      const name = part.trim(); if (!name) return;
      const k = key(name); if (!k || seen.has(k)) return;
      seen.add(k); out.push(name);
    });
    values.forEach(add); return out;
  }
  function teamMembers(team) {
    const values = [];
    if (Array.isArray(team?.members)) team.members.forEach(m => values.push(typeof m === 'string' ? m : m?.name));
    ['adult','child','member1','member2','jogador1','jogador2'].forEach(field => values.push(team?.[field]));
    if (!values.some(Boolean) && team?.name) values.push(team.name);
    return uniqueNames(values);
  }
  function teamName(team, index) {
    const members = teamMembers(team);
    return team?.name || V.teamName?.(team) || members.join(' + ') || `Equipe ${String(index + 1).padStart(2, '0')}`;
  }
  function statusText(status) {
    const s = String(status || '').toUpperCase();
    return ({NAO_INICIADO:'NÃO INICIADO',SORTEADO:'NÃO INICIADO',EM_CONTAGEM:'PREPARANDO',EM_ANDAMENTO:'EM ANDAMENTO',FINALIZADO:'FINALIZADO',CANCELADO:'CANCELADO'})[s] || s || 'CAMPEONATO';
  }
  function normalizeGroups(groups) {
    const seen = new Set();
    return (Array.isArray(groups) ? groups : []).filter(group => group && group.id && !seen.has(String(group.id)) && seen.add(String(group.id))).map(group => ({
      ...group,
      active: group.active === true || String(group.active || '').toUpperCase() === 'SIM',
      teams: Array.isArray(group.teams) ? group.teams : []
    })).sort((a,b) => {
      const aOpen = ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].includes(String(a.status||'').toUpperCase()) ? 1 : 0;
      const bOpen = ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].includes(String(b.status||'').toUpperCase()) ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      const da = Date.parse(a.createdAt || '') || 0, db = Date.parse(b.createdAt || '') || 0;
      return db - da;
    });
  }
  function fallbackFromState(state) {
    const groups = Array.isArray(state?.championshipTeams) ? state.championshipTeams : [];
    if (groups.length) return normalizeGroups(groups);
    const champ = state?.championship;
    if (!champ && !(state?.teams || []).length) return [];
    return normalizeGroups([{ id:champ?.id || 'ATUAL', name:champ?.name || 'Campeonato atual', status:champ?.status || state?.status || '', active:true, teamCount:(state?.teams || []).length, teams:state?.teams || [] }]);
  }
  function renderTeam(team, index) {
    const members = teamMembers(team);
    return `<article class="eq32-team"><div class="eq32-team-head"><strong>${esc(teamName(team,index))}</strong><span class="eq32-ball">🏐</span></div><div class="eq32-members">${members.length ? members.map(name => `<div class="eq32-member">${esc(name)}</div>`).join('') : '<div class="eq32-empty">Integrantes não disponíveis.</div>'}</div></article>`;
  }
  function render(groups) {
    lastGroups = normalizeGroups(groups);
    rendering = true;
    if (heading) heading.textContent = 'Equipes por campeonato';
    if (summary) summary.textContent = lastGroups.length ? 'Toque em um campeonato para visualizar as equipes daquela edição.' : 'As equipes aparecerão após a geração do campeonato.';
    if (!lastGroups.length) {
      grid.innerHTML = '<div class="eq32-empty" data-eq42-root>Nenhum campeonato disponível.</div>';
      rendering = false; return;
    }
    const current = lastGroups.find(group => group.active) || lastGroups.find(group => ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].includes(String(group.status||'').toUpperCase())) || lastGroups[0];
    if (!openedId || !lastGroups.some(group => String(group.id) === String(openedId))) openedId = current?.id || lastGroups[0]?.id || '';
    grid.innerHTML = `<div class="eq32-list" data-eq42-root>${lastGroups.map((group,index) => {
      const open = String(group.id) === String(openedId);
      const count = Number(group.teamCount || group.teams.length || 0);
      const currentBadge = group.active ? '<span class="eq32-badge current">Edição atual</span>' : '';
      return `<section class="eq32-champ${group.active?' active':''}${open?' open':''}" data-eq42-champ="${esc(group.id)}"><button class="eq32-toggle" type="button" aria-expanded="${open?'true':'false'}"><span class="eq32-title"><strong>${esc(group.name || `Campeonato ${index+1}`)}</strong><small>${esc(statusText(group.status))}</small><span class="eq32-meta"><span class="eq32-badge">${count} equipe${count===1?'':'s'}</span>${currentBadge}</span></span><span class="eq32-arrow">⌄</span></button><div class="eq32-body"><div class="eq32-teams">${group.teams.length ? group.teams.map(renderTeam).join('') : `<div class="eq32-empty">${count ? `${count} equipe(s) registrada(s), aguardando sincronização dos integrantes.` : 'Nenhuma equipe registrada nesta edição.'}</div>`}</div></div></section>`;
    }).join('')}</div>`;
    rendering = false;
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.eq32-toggle'); if (!button) return;
    const card = button.closest('[data-eq42-champ]'); if (!card) return;
    const id = card.dataset.eq42Champ || '';
    openedId = openedId === id ? '' : id;
    render(lastGroups);
  });

  const observer = new MutationObserver(() => {
    if (rendering || grid.querySelector('[data-eq42-root]')) return;
    if (lastGroups.length) render(lastGroups);
  });
  observer.observe(grid,{childList:true,subtree:false});

  async function refresh() {
    let state = null;
    try { state = await V.request('estado'); } catch (_) {}
    try {
      const groups = await V.request('publicCampeonatos');
      if (Array.isArray(groups) && groups.length) { render(groups); return; }
    } catch (_) {}
    render(fallbackFromState(state || {}));
  }
  refresh();
  setInterval(refresh,20000);
})();
