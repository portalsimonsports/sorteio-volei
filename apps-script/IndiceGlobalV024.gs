/** ÍNDICE GLOBAL DINÂMICO E RANKING SEM EXPOR O ÍNDICE TOTAL — V024 */
function flexDesempenhoAnteriorV024_(){
 const mapa={},s=aba_(VOLEI.SHEETS.DESEMPENHO),l=s.getLastRow();
 if(l<2)return mapa;
 s.getRange(2,1,l-1,DESEMPENHO_HEADERS.length).getValues().filter(r=>r[0]).forEach(r=>{
  mapa[texto_(r[0])]={championshipCount:numero_(r[5]),titles:numero_(r[16]),runners:numero_(r[17]),thirds:numero_(r[18]),fourths:numero_(r[19])};
 });
 return mapa;
}
function flexCalcularIndicesGlobaisV024_(rankingBase){
 garantirEstruturaDesempenho_();
 const jogadores=jogadoresBaseParaDesempenho_(),base=Array.isArray(rankingBase)?rankingBase:flexVoleiRankingGlobal_(),stats={},anteriores=flexDesempenhoAnteriorV024_();
 base.forEach(x=>stats[x.id]=x);
 const c=obterConfig_(),maximo=numero_(c.AJUSTE_HISTORICO_MAXIMO||2)||2,jogosConfianca=numero_(c.JOGOS_CONFIANCA_TOTAL||6)||6;
 const pv=Math.max(0,numero_(c.PESO_HISTORICO_VITORIAS||0.55)),ps=Math.max(0,numero_(c.PESO_HISTORICO_SETS||0.25)),pp=Math.max(0,numero_(c.PESO_HISTORICO_PONTOS||0.20)),somaPesos=pv+ps+pp||1;
 return jogadores.map(j=>{
  const x=stats[j.id]||{games:0,wins:0,losses:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0},ant=anteriores[j.id]||{};
  const totalSets=numero_(x.setsFor)+numero_(x.setsAgainst),totalPontos=numero_(x.pointsFor)+numero_(x.pointsAgainst);
  const indiceVitorias=x.games?(numero_(x.wins)-numero_(x.losses))/numero_(x.games):0;
  const indiceSets=totalSets?(numero_(x.setsFor)-numero_(x.setsAgainst))/totalSets:0;
  const indicePontos=totalPontos?(numero_(x.pointsFor)-numero_(x.pointsAgainst))/totalPontos:0;
  const confianca=limitarNumero_(numero_(x.games)/jogosConfianca,0,1),eficiencia=(pv*indiceVitorias+ps*indiceSets+pp*indicePontos)/somaPesos;
  const ajuste=arredondarIndice_(limitarNumero_(eficiencia*maximo*confianca,-maximo,maximo)),indiceAtual=arredondarIndice_(limitarNumero_(j.baseIndex+ajuste,1,10));
  return{id:j.id,name:j.name,pot:j.pot,age:j.age,baseIndex:j.baseIndex,championshipCount:numero_(ant.championshipCount),games:numero_(x.games),wins:numero_(x.wins),losses:numero_(x.losses),winRate:x.games?arredondarIndice_(numero_(x.wins)*100/numero_(x.games)):0,setsFor:numero_(x.setsFor),setsAgainst:numero_(x.setsAgainst),pointsFor:numero_(x.pointsFor),pointsAgainst:numero_(x.pointsAgainst),titles:numero_(ant.titles),runners:numero_(ant.runners),thirds:numero_(ant.thirds),fourths:numero_(ant.fourths),confidence:arredondarIndice_(confianca),adjustment:ajuste,currentIndex:indiceAtual};
 });
}
function atualizarIndicesHistoricos_(){
 const resultados=gravarIndicesHistoricos_(flexCalcularIndicesGlobaisV024_());
 log_('INDICES_GLOBAIS_ATUALIZADOS','','SISTEMA','SISTEMA','Partidas de campeonatos ativos, arquivados e avulsas computadas: '+resultados.reduce((s,x)=>s+x.games,0),'INFO','DESEMPENHO');
 return resultados;
}
function flexRankingIndiceV024_(rankingBase){
 return flexCalcularIndicesGlobaisV024_(rankingBase).sort((a,b)=>b.currentIndex-a.currentIndex||b.adjustment-a.adjustment||b.winRate-a.winRate||b.games-a.games||a.name.localeCompare(b.name,'pt-BR')).map((x,i)=>({position:i+1,id:x.id,name:x.name,games:x.games,wins:x.wins,losses:x.losses,points:0,winRate:x.winRate,setsFor:x.setsFor,setsAgainst:x.setsAgainst,setDiff:x.setsFor-x.setsAgainst,pointsFor:x.pointsFor,pointsAgainst:x.pointsAgainst,pointDiff:x.pointsFor-x.pointsAgainst,indexVariation:x.adjustment}));
}
function flexAnexarEstadoVolei_(e,admin){
 const base=flexVoleiRankingGlobal_();
 e.globalRankingPoints=flexOrdenarRanking_(base,'PONTOS');
 e.globalRankingWinRate=flexOrdenarRanking_(base,'APROVEITAMENTO');
 e.globalRankingIndex=flexRankingIndiceV024_(base);
 e.championshipEditable=flexVoleiNaoIniciado_()&&!!e.championship&&texto_(e.championship.active)==='SIM';
 if(admin)e.freeMatches=flexVoleiLerAvulsos_();
 return e;
}
