(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei;
  const esc = V.esc, num = V.num;
  function members(team) {
    if (Array.isArray(team?.members) && team.members.length) return team.members.map(m => typeof m === 'string' ? m : m.name).filter(Boolean);
    return [team?.member1, team?.member2, team?.adult, team?.child].filter(Boolean);
  }
  function name(team) { return V.teamName(team) || team?.name || team?.id || 'Equipe'; }
  function render(state) {
    const champ = state?.championship, status = String(champ?.status || state?.status || '').toUpperCase();
    const matches = (state?.rounds || []).flatMap(round => round.matches || []);
    const upcoming = champ && ['SORTEADO','NAO_INICIADO'].includes(status) && matches.length;
    let panel = document.getElementById('pa31NextVolley');
    if (!upcoming) { panel?.remove(); return; }
    if (!panel) { panel = document.createElement('section'); panel.id='pa31NextVolley'; panel.className='section compact pa31-next-panel'; const bracket=document.getElementById('chaveamento'); bracket?.parentNode?.insertBefore(panel,bracket); }
    panel.innerHTML = `<div class="section-head"><div><span class="kicker">PRÓXIMO CAMPEONATO</span><h2>${esc(champ.name || 'Campeonato preparado')}</h2><p>Equipes e jogos definidos, aguardando o primeiro início.</p></div><span class="audit">${matches.length} jogos</span></div><div class="pa31-next-grid">${(state.teams||[]).map(team=>`<article class="pa31-next-card"><strong>${esc(name(team))}</strong><small>${members(team).map(esc).join(' • ') || 'Integrantes definidos'}</small></article>`).join('')}</div><div class="pa31-next-games">${matches.map(match=>`<div class="pa31-next-game">Jogo ${num(match.game)} — ${esc(name(match.team1))} × ${esc(name(match.team2))} <span class="pa31-next-status">${esc(match.status)}</span></div>`).join('')}</div>`;
  }
  async function refresh(){try{render(await V.request('estado'));}catch(_){} }
  refresh(); setInterval(refresh,15000);
})();
