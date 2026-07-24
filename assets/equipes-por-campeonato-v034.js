(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei;
  const esc = V.esc || (value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const grid = document.getElementById('teamsGrid');
  const summary = document.getElementById('balanceSummary');
  const heading = document.querySelector('#equipes .section-head h2');
  if (!grid) return;
  let rendering = false, lastState = null, openedId = '';

  function key(value) {
    let s = String(value ?? '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch (_) {}
    return s;
  }
  function uniqueNames(values) {
    const out = [], seen = new Set();
    const add = value => {
      String(value ?? '').split(/\s*\+\s*/).forEach(part => {
        const name = part.trim(); if (!name) return;
        const k = key(name); if (!k || seen.has(k)) return;
        seen.add(k); out.push(name);
      });
    };
    values.forEach(add);
    return out;
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
  function fallbackGroups(state) {
    const champ = state?.championship;
    if (!champ && !(state?.teams || []).length) return [];
    return [{ id:champ?.id || 'ATUAL', name:champ?.name || 'Campeonato atual', status:champ?.status || state?.status || '', active:true, teamCount:(state?.teams || []).length, teams:state?.teams || [] }];
  }
  function groupsFromState(state) {
    const groups = Array.isArray(state?.championshipTeams) && state.championshipTeams.length ? state.championshipTeams : fallbackGroups(state);
    return groups.map(group => ({...group, teams:Array.isArray(group.teams) ? group.teams : []}));
  }
  function renderTeam(team, index) {
    const members = teamMembers(team);
    return `<article class="eq32-team"><div class="eq32-team-head"><strong>${esc(teamName(team,index))}</strong><span class="eq32-ball">🏐</span></div><div class="eq32-members">${members.length ? members.map(name => `<div class="eq32-member">${esc(name)}</div>`).join('') : '<div class="eq32-empty">Integrantes não disponíveis.</div>'}</div></article>`;
  }
  function statusText(status) {
    const s = String(status || '').toUpperCase();
    return ({NAO_INICIADO:'NÃO INICIADO',SORTEADO:'NÃO INICIADO',EM_CONTAGEM:'PREPARANDO',EM_ANDAMENTO:'EM ANDAMENTO',FINALIZADO:'FINALIZADO',CANCELADO:'CANCELADO'})[s] || s || 'CAMPEONATO';
  }
  function render(state) {
    lastState = state || lastState || {};
    const groups = groupsFromState(lastState);
    rendering = true;
    if (heading) heading.textContent = 'Equipes por campeonato';
    if (summary) summary.textContent = groups.length > 1 ? 'Toque em um campeonato para visualizar as equipes daquela edição.' : (groups[0] ? `${groups[0].teamCount || groups[0].teams.length} equipe(s) registrada(s) em ${groups[0].name}.` : 'As equipes aparecerão após a geração do campeonato.');
    if (!groups.length) {
      grid.innerHTML = '<div class="eq32-empty" data-eq34-root>Nenhum campeonato disponível.</div>';
      rendering = false; return;
    }
    const active = groups.find(group => group.active);
    if (!openedId) openedId = active?.id || groups[0]?.id || '';
    grid.innerHTML = `<div class="eq32-list" data-eq34-root>${groups.map((group,index) => {
      const open = String(group.id) === String(openedId);
      const count = Number(group.teamCount || group.teams.length || 0);
      return `<section class="eq32-champ${group.active?' active':''}${open?' open':''}" data-eq34-champ="${esc(group.id)}"><button class="eq32-toggle" type="button" aria-expanded="${open?'true':'false'}"><span class="eq32-title"><strong>${esc(group.name || `Campeonato ${index+1}`)}</strong><small>${esc(statusText(group.status))}</small><span class="eq32-meta"><span class="eq32-badge">${count} equipe${count===1?'':'s'}</span>${group.active?'<span class="eq32-badge current">Edição atual</span>':''}</span></span><span class="eq32-arrow">⌄</span></button><div class="eq32-body"><div class="eq32-teams">${group.teams.length ? group.teams.map(renderTeam).join('') : `<div class="eq32-empty">${count ? `${count} equipe(s) registrada(s), aguardando sincronização dos integrantes.` : 'Nenhuma equipe registrada nesta edição.'}</div>`}</div></div></section>`;
    }).join('')}</div>`;
    rendering = false;
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.eq32-toggle'); if (!button) return;
    const card = button.closest('[data-eq34-champ]'); if (!card) return;
    const id = card.dataset.eq34Champ || '';
    openedId = openedId === id ? '' : id;
    render(lastState);
  });

  const observer = new MutationObserver(() => {
    if (rendering || grid.querySelector('[data-eq34-root]')) return;
    if (lastState) render(lastState);
  });
  observer.observe(grid,{childList:true,subtree:false});

  async function refresh() {
    try { render(await V.request('estado')); } catch (_) { if (lastState) render(lastState); }
  }
  refresh();
  setInterval(refresh,20000);
})();
