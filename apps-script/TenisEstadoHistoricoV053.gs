/** TÊNIS DE MESA — ESTADO/RANKING COM CAMADA HISTÓRICA MANUAL — V053 */
function tm53RankingGlobal_(){
  const base=(flexTmRankingGlobal_()||[]).map(x=>Object.assign({},x)),map={};base.forEach(x=>map[x.id]=x);
  if(typeof tm53AplicarRankingManual_==='function')tm53AplicarRankingManual_(map);
  return Object.values(map).map(x=>Object.assign(x,{winRate:x.games?Math.round(x.wins*1000/x.games)/10:0,setDiff:numero_(x.setsFor)-numero_(x.setsAgainst),pointDiff:numero_(x.pointsFor)-numero_(x.pointsAgainst)}));
}
function tm53ContarPartidasReaisFinalizadas_(){
  try{
    const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),games=tm51Sheet_(book,TM_SHEETS.JOGOS),free=tm51Sheet_(book,FLEX_V023.TM_AVULSOS);let total=0;
    tm51Rows_(games,TM_HEADERS.JOGOS.length).forEach(r=>{if(texto_(r[11])==='FINALIZADO')total++;});
    tm51Rows_(free,FLEX_V023.TM_HEADERS.length).forEach(r=>{if(texto_(r[3])==='FINALIZADO')total++;});
    return total;
  }catch(ignore){return 0;}
}
function tm50RankingEscopos_(){
  const champs=tmLerCampeonatos_().slice().reverse().map(c=>({id:c.id,name:c.name,status:c.status,createdAt:c.createdAt,ranking:tmLerRanking_(c.id)}));
  const geral=typeof tm53RankingGlobal_==='function'?tm53RankingGlobal_():flexTmRankingGlobal_();
  return{general:flexOrdenarRanking_(geral,'PONTOS'),free:tm50RankingAvulso_(),championships:champs};
}
function tmObterEstado_(admin){
  tmGarantirEstrutura_();flexGarantirEstruturaV023_();
  const campeonato=tmCampeonatoAtivo_(),base=typeof tm53RankingGlobal_==='function'?tm53RankingGlobal_():flexTmRankingGlobal_(),globalFinishedMatches=typeof tm53ContarPartidasReaisFinalizadas_==='function'?tm53ContarPartidasReaisFinalizadas_():Math.round(base.reduce((t,x)=>t+numero_(x.games),0)/2),estado={version:'TM_V053_2026-07-24',sport:'TENIS_DE_MESA',serverTime:new Date(),championship:campeonato,participants:campeonato?tmLerParticipantesCampeonato_(campeonato.id):[],matches:campeonato?tmLerJogos_(campeonato.id):[],ranking:campeonato?tmLerRanking_(campeonato.id):[],globalRankingPoints:flexOrdenarRanking_(base,'PONTOS'),globalRankingWinRate:flexOrdenarRanking_(base,'APROVEITAMENTO'),globalFinishedMatches:globalFinishedMatches,championshipEditable:campeonato?flexTmNaoIniciado_(campeonato.id):false,registrationOpen:true};
  if(admin){estado.players=tmLerJogadores_();estado.championships=tmLerCampeonatos_().slice().reverse();estado.freeMatches=flexTmLerAvulsos_();}
  return estado;
}
