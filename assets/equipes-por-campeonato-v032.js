(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei;
  const esc = V.esc || (value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const grid = document.getElementById('teamsGrid');
  const summary = document.getElementById('balanceSummary');
  const heading = document.querySelector('#equipes .section-head h2');
  if (!grid) return;
  let rendering = false, lastState = null;

  function teamMembers(team) {
    if (Array.isArray(team?.members) && team.members.length) return team.members.map(m => typeof m === 'string' ? m : m?.name).filter(Boolean);
    return [team?.adult, team?.child, team?.member1, team?.member2].filter(Boolean);
  }
  function teamName(team, index) {
    return team?.name || V.teamName?.(team) || `Equipe ${String(index + 1).padStart(2, '0')}`;
  }
  function fallbackGroups(state) {
    const champ = state?.championship;
    if (!champ && !(state?.teams || []).length) return [];
    return [{ id:champ?.id || 'ATUAL', name:champ?.name || 'Campeonato atual', status:champ?.status || state?.status || '', active:true, teamCount:(state?.teams || []).length, teams:state?.teams || [] }];
  }
  function groupsFromState(state) {
    const groups = Array.isArray(state?.championshipTeams) && state.championshipTeams.length ? state.championshipTeams : fallbackGroups(state);
    return groups.filter(group => Array.isArray(group.teams) && (group.teams.length || group.active));
  }
  function renderTeam(team, index) {
    const members = teamMembers(team);
    return `<article class="eq32-team"><div class="eq32-team-head"><strong>${esc(teamName(team,index))}</strong><span class="eq32-ball">🏐</span></div><div class="eq32-members">${members.length ? members.map(name => `<div class="eq32-member">${esc(name)}</div>`).join('') : '<div class="eq32-empty">Integrantes não disponíveis.</div>'}</div></article>`;
  }
  function render(state) {
    lastState = state || lastState || {};
    const groups = groupsFromState(lastState);
    rendering = true;
    if (heading) heading.textContent = 'Equipes formadas';
    if (summary) summary.textContent = groups.length > 1 ? 'Selecione um campeonato para consultar as equipes formadas naquela edição.' : (groups[0] ? `${groups[0].teamCount || groups[0].teams.length} equipe(s) formada(s) para ${groups[0].name}.` : 'As equipes aparecerão após a geração do campeonato.');
    if (!groups.length) {
      grid.innerHTML = '<div class="eq32-empty" data-eq32-root>Nenhum campeonato com equipes disponível.</div>';
      rendering = false;
      return;
    }
    const activeIndex = Math.max(0, groups.findIndex(group => group.active));
    grid.innerHTML = `<div class="eq32-list" data-eq32-root>${groups.map((group,index) => {
      const open = index === activeIndex;
      const count = group.teamCount || group.teams.length;
      return `<section class="eq32-champ${group.active?' active':''}${open?' open':''}" data-eq32-champ="${esc(group.id)}"><button class="eq32-toggle" type="button" aria-expanded="${open?'true':'false'}"><span class="eq32-title"><strong>${esc(group.name || `Campeonato ${index+1}`)}</strong><small>${esc(group.status || (group.active?'Atual':'Histórico'))}</small><span class="eq32-meta"><span class="eq32-badge">${count} equipe${count===1?'':'s'}</span>${group.active?'<span class="eq32-badge current">Campeonato atual</span>':''}</span></span><span class="eq32-arrow">⌄</span></button><div class="eq32-body"><div class="eq32-teams">${group.teams.length?group.teams.map(renderTeam).join(''):'<div class="eq32-empty">As equipes desta edição ainda não estão disponíveis.</div>'}</div></div></section>`;
    }).join('')}</div>`;
    rendering = false;
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.eq32-toggle');
    if (!button) return;
    const card = button.closest('.eq32-champ');
    const wasOpen = card.classList.contains('open');
    grid.querySelectorAll('.eq32-champ.open').forEach(item => { item.classList.remove('open'); item.querySelector('.eq32-toggle')?.setAttribute('aria-expanded','false'); });
    if (!wasOpen) { card.classList.add('open'); button.setAttribute('aria-expanded','true'); }
  });

  const observer = new MutationObserver(() => {
    if (rendering || grid.querySelector('[data-eq32-root]')) return;
    if (lastState) render(lastState);
  });
  observer.observe(grid,{childList:true,subtree:false});

  async function refresh() {
    try { render(await V.request('estado')); } catch (_) { if (lastState) render(lastState); }
  }
  refresh();
  setInterval(refresh,20000);
})();
