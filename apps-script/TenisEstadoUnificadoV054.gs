/** TÊNIS DE MESA — ESTADO PÚBLICO UNIFICADO COM TODOS OS RANKINGS — V054 */
function tmObterEstado_(admin){
  const d=tm54Data_(),activeId=texto_(props_().getProperty('TM_CAMPEONATO_ATIVO')),champ=d.champs.find(c=>c.id===activeId)||d.champs[d.champs.length-1]||null,scopes=tm54BuildScopes_(),current=champ?tm54CurrentChamp_(scopes,champ.id):null;
  const estado={version:'TM_V054_2026-07-25',sport:'TENIS_DE_MESA',serverTime:new Date(),championship:champ,participants:champ?d.participants.filter(r=>texto_(r[0])===champ.id).map(r=>({championshipId:texto_(r[0]),id:texto_(r[1]),name:texto_(r[2]),order:numero_(r[3]),selectedAt:r[4]})).sort((a,b)=>a.order-b.order):[],matches:champ?d.games.filter(g=>g.championshipId===champ.id).sort((a,b)=>a.game-b.game):[],ranking:current?current.ranking:[],globalRankingPoints:scopes.general,globalRankingWinRate:flexOrdenarRanking_(scopes.general,'APROVEITAMENTO'),globalFinishedMatches:scopes.generalSummary.finished,rankingSummaries:{general:scopes.generalSummary,free:scopes.freeSummary,current:current?current.summary:null},rankingScopes:scopes,championshipEditable:champ?!d.games.some(g=>g.championshipId===champ.id&&(g.startedAt||g.finishedAt||['EM_ANDAMENTO','FINALIZADO'].indexOf(g.status)>=0)):false,registrationOpen:true};
  if(admin){estado.players=d.players;estado.championships=d.champs.slice().reverse();estado.freeMatches=d.free.slice().sort((a,b)=>b.order-a.order);}
  return estado;
}
function tmObterEstadoPublico_(){return tmObterEstado_(false);}function tmObterEstadoAdmin_(){return tmObterEstado_(true);}
