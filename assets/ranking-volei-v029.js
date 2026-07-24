(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.Volei || !window.FlexV023) return;
  const V = window.Volei;
  const F = window.FlexV023;
  const text = value => String(value ?? '').trim();
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  let state = {};

  function teamIds(team, nameMap) {
    const ids = [];
    const add = value => text(value).split('|').filter(Boolean).forEach(id => { if (!ids.includes(id)) ids.push(id); });
    if (!team) return ids;
    if (Array.isArray(team.members)) team.members.forEach(member => add(typeof member === 'string' ? member : member?.id));
    ['member1Id','member2Id','jogador1Id','jogador2Id','adultId','childId'].forEach(key => add(team[key]));
    if (!ids.length) {
      const names = [];
      if (Array.isArray(team.members)) team.members.forEach(member => names.push(text(typeof member === 'string' ? member : member?.name)));
      ['member1','member2','adult','child','name'].forEach(key => text(team[key]).split(/\s*\+\s*/).forEach(name => names.push(text(name))));
      names.filter(Boolean).forEach(name => add(nameMap.get(name.toLocaleLowerCase('pt-BR')) || ''));
    }
    return ids;
  }

  function scores(match) {
    if (Array.isArray(match?.scores)) return match.scores.filter(pair => Array.isArray(pair) && pair.length >= 2 && pair[0] != null && pair[1] != null);
    return [];
  }

  function fallbackRanking(current) {
    const players = Array.isArray(current?.players) ? current.players : [];
    const nameMap = new Map(players.map(player => [text(player.name).toLocaleLowerCase('pt-BR'), text(player.id)]));
    const stats = new Map(players.map(player => [text(player.id), {
      id:text(player.id), name:text(player.name), games:0, wins:0, losses:0, points:0,
      setsFor:0, setsAgainst:0, pointsFor:0, pointsAgainst:0,
      baseIndex:num(player.adjustedScore || player.currentIndex || player.score || 5)
    }]));
    const matches = [];
    (current?.rounds || []).forEach(round => (round.matches || []).forEach(match => matches.push(match)));
    (current?.matches || []).forEach(match => matches.push(match));
    const seen = new Set();
    matches.forEach((match,index) => {
      const key = text(match.game || match.jogo || index + 1);
      if (seen.has(key)) return;
      const status = text(match.status).toUpperCase();
      const set1 = num(match.sets1), set2 = num(match.sets2);
      let side = num(match.winnerSide);
      const winner = text(match.winnerId || match.vencedorId);
      const team1 = match.team1 || match.equipe1, team2 = match.team2 || match.equipe2;
      if (!side && winner) {
        if (winner === text(team1?.id)) side = 1;
        if (winner === text(team2?.id)) side = 2;
      }
      if (!side && set1 !== set2) side = set1 > set2 ? 1 : 2;
      if (status !== 'FINALIZADO' && !side) return;
      const ids1 = teamIds(team1,nameMap), ids2 = teamIds(team2,nameMap);
      if (!ids1.length || !ids2.length) return;
      const placar = scores(match);
      const pf1 = placar.reduce((total,pair) => total + num(pair[0]),0);
      const pf2 = placar.reduce((total,pair) => total + num(pair[1]),0);
      const sf1 = set1 || placar.filter(pair => num(pair[0]) > num(pair[1])).length;
      const sf2 = set2 || placar.filter(pair => num(pair[1]) > num(pair[0])).length;
      const apply = (ids,won,sf,sa,pf,pa) => ids.forEach(id => {
        const item = stats.get(id); if (!item) return;
        item.games++; if (won) { item.wins++; item.points += 2; } else item.losses++;
        item.setsFor += sf; item.setsAgainst += sa; item.pointsFor += pf; item.pointsAgainst += pa;
      });
      apply(ids1,side === 1,sf1,sf2,pf1,pf2); apply(ids2,side === 2,sf2,sf1,pf2,pf1); seen.add(key);
    });
    return [...stats.values()].map(item => ({...item,
      winRate:item.games ? Math.round(item.wins * 1000 / item.games) / 10 : 0,
      setDiff:item.setsFor-item.setsAgainst, pointDiff:item.pointsFor-item.pointsAgainst
    }));
  }

  function positions(list,criterion) {
    const sorted = [...list];
    if (criterion === 'APROVEITAMENTO') sorted.sort((a,b) => b.winRate-a.winRate || b.points-a.points || b.wins-a.wins || b.setDiff-a.setDiff || b.pointDiff-a.pointDiff || a.name.localeCompare(b.name,'pt-BR'));
    else sorted.sort((a,b) => b.points-a.points || b.winRate-a.winRate || b.wins-a.wins || b.setDiff-a.setDiff || b.pointDiff-a.pointDiff || a.name.localeCompare(b.name,'pt-BR'));
    return sorted.map((item,index) => ({...item,position:index+1}));
  }

  function indexRanking(base) {
    return base.map(item => {
      const totalSets = item.setsFor + item.setsAgainst;
      const totalPoints = item.pointsFor + item.pointsAgainst;
      const victoryEfficiency = item.games ? (item.wins-item.losses)/item.games : 0;
      const setEfficiency = totalSets ? (item.setsFor-item.setsAgainst)/totalSets : 0;
      const pointEfficiency = totalPoints ? (item.pointsFor-item.pointsAgainst)/totalPoints : 0;
      const confidence = Math.min(item.games/6,1);
      const variation = Math.max(-2,Math.min(2,(victoryEfficiency*.55+setEfficiency*.25+pointEfficiency*.20)*2*confidence));
      return {...item,indexVariation:Math.round(variation*10)/10,_hiddenIndex:Math.max(1,Math.min(10,num(item.baseIndex||5)+variation))};
    }).sort((a,b) => b._hiddenIndex-a._hiddenIndex || b.indexVariation-a.indexVariation || b.winRate-a.winRate || b.games-a.games || a.name.localeCompare(b.name,'pt-BR')).map((item,index) => ({...item,position:index+1}));
  }

  function prepare(current) {
    const fallback = fallbackRanking(current);
    const backend = Array.isArray(current.globalRankingPoints) ? current.globalRankingPoints : [];
    const base = backend.some(item => num(item.games)>0) ? backend : fallback;
    current.globalRankingPoints = positions(base,'PONTOS');
    current.globalRankingWinRate = Array.isArray(current.globalRankingWinRate) && current.globalRankingWinRate.some(item=>num(item.games)>0) ? current.globalRankingWinRate : positions(base,'APROVEITAMENTO');
    current.globalRankingIndex = Array.isArray(current.globalRankingIndex) && current.globalRankingIndex.some(item=>num(item.games)>0) ? current.globalRankingIndex : indexRanking(base);
    return current;
  }

  async function load() {
    state = prepare(await V.request('estado'));
    let panel = document.getElementById('flexGlobalRanking-public');
    if (!panel) { panel = F.rankingPanel('Ranking geral do vôlei'); document.querySelector('main')?.appendChild(panel); }
    const render = F.installRanking(panel,() => state,'volei');
    setInterval(async () => { try { state = prepare(await V.request('estado')); render?.(); } catch (_) {} },10000);
  }
  load().catch(error => console.error('Ranking do vôlei V029:',error));
})();
