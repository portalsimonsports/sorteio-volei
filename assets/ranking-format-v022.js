(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei) return;
  const V = window.Volei, section = document.getElementById('classificacao'), target = document.getElementById('finalRankingRows'), status = document.getElementById('rankingStatus');
  if (!section || !target) return;
  let lastState = null, rendering = false;
  const name = team => V.teamName(team) || team?.id || 'Equipe';
  const medal = position => position === 1 ? '🏆' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}º`;

  function renderRows(rows, label) {
    rendering = true;
    section.hidden = false;
    if (status) status.textContent = label;
    target.innerHTML = rows.map(item => `<article class="ranking-row ranking-position-${item.position}"><div class="ranking-summary" style="cursor:default"><span class="ranking-position">${medal(item.position)}</span><span class="ranking-team"><strong>${V.esc(name(item.team))}</strong><small>${item.games} jogo${item.games === 1 ? '' : 's'} • ${item.wins} vitória${item.wins === 1 ? '' : 's'} • ${item.losses} derrota${item.losses === 1 ? '' : 's'} • Sets ${item.setsFor}–${item.setsAgainst}</small></span><span class="ranking-label">${Number(item.points || 0)} pts • ${Number(item.winRate || 0).toLocaleString('pt-BR')}%</span></div></article>`).join('');
    queueMicrotask(() => { rendering = false; });
  }

  function aggregateTwoFinals(state) {
    const matches = (state.rounds || []).flatMap(round => round.matches || []).filter(match => /^FINAL\s+[12]$/i.test(String(match.phase || '')) && match.status === 'FINALIZADO');
    if (matches.length < 2) return [];
    const map = new Map();
    (state.teams || []).forEach(team => map.set(team.id, { team, games:0, wins:0, losses:0, setsFor:0, setsAgainst:0, pointsFor:0, pointsAgainst:0 }));
    matches.forEach(match => {
      const a = map.get(match.team1?.id), b = map.get(match.team2?.id); if (!a || !b) return;
      a.games++; b.games++; a.setsFor += Number(match.sets1 || 0); a.setsAgainst += Number(match.sets2 || 0); b.setsFor += Number(match.sets2 || 0); b.setsAgainst += Number(match.sets1 || 0);
      (match.scores || []).forEach(set => { a.pointsFor += Number(set?.[0] || 0); a.pointsAgainst += Number(set?.[1] || 0); b.pointsFor += Number(set?.[1] || 0); b.pointsAgainst += Number(set?.[0] || 0); });
      if (match.winnerId === a.team.id) { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
    });
    const secondWinner = matches[1]?.winnerId || '';
    return [...map.values()].map(item => ({ ...item, setDiff:item.setsFor-item.setsAgainst, pointDiff:item.pointsFor-item.pointsAgainst, winRate:item.games ? Math.round(item.wins*1000/item.games)/10 : 0, points:item.wins*2 })).sort((a,b) => b.wins-a.wins || b.setDiff-a.setDiff || b.pointDiff-a.pointDiff || b.pointsFor-a.pointsFor || (b.team.id === secondWinner ? 1 : -1)).map((item,index) => ({ ...item, position:index+1 }));
  }

  function isAlternativeRanking(state) {
    const matches = (state?.rounds || []).flatMap(round => round.matches || []);
    return state?.competition?.format === 'TODOS_CONTRA_TODOS' || matches.filter(match => /^FINAL\s+[12]$/i.test(String(match.phase || ''))).length === 2;
  }

  function render(state) {
    lastState = state;
    const matches = (state.rounds || []).flatMap(round => round.matches || []), hasStandardFinal = matches.some(match => String(match.phase || '').toUpperCase() === 'FINAL');
    const twoFinals = matches.filter(match => /^FINAL\s+[12]$/i.test(String(match.phase || '')));
    if (twoFinals.length === 2 && state.status === 'FINALIZADO') { const rows = aggregateTwoFinals(state); if (rows.length) renderRows(rows, 'Classificação após duas finais'); return; }
    if (state.competition?.format !== 'TODOS_CONTRA_TODOS' || (state.status === 'FINALIZADO' && hasStandardFinal)) return;
    const rows = Array.isArray(state.competition?.standings) ? state.competition.standings : [];
    if (rows.length) renderRows(rows, state.status === 'FINALIZADO' ? 'Classificação final' : 'Classificação da fase todos contra todos');
  }

  new MutationObserver(() => {
    if (!rendering && section.hidden && lastState && isAlternativeRanking(lastState)) render(lastState);
  }).observe(section, { attributes:true, attributeFilter:['hidden'] });

  async function refresh() { try { render(await V.request('estado')); } catch (_) {} }
  refresh(); setInterval(refresh, 10000);
})();
