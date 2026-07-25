/** TÊNIS DE MESA — ESTABILIDADE, ORIGEM DO HISTÓRICO E RESUMOS POR ESCOPO — V054 */
const TM54_HEADERS=['REGISTRO_ID','JOGADOR_A_ID','JOGADOR_A','JOGADOR_B_ID','JOGADOR_B','CONFRONTOS','VITORIAS_A','VITORIAS_B','PONTOS_BASE','VANTAGEM','PONTOS_VITORIA','PONTOS_DERROTA','CRIADO_EM','OBSERVACAO','ORIGEM','CAMPEONATO_ID','CAMPEONATO'];

function tm54Sheet_(book,create){
  let s=book.getSheetByName(TM53_SHEET);
  if(!s&&create)s=book.insertSheet(TM53_SHEET);
  if(!s)return null;
  if(s.getMaxColumns()<TM54_HEADERS.length)s.insertColumnsAfter(s.getMaxColumns(),TM54_HEADERS.length-s.getMaxColumns());
  const atual=s.getRange(1,1,1,TM54_HEADERS.length).getDisplayValues()[0];
  if(atual.join('|')!==TM54_HEADERS.join('|'))s.getRange(1,1,1,TM54_HEADERS.length).setValues([TM54_HEADERS]);
  s.setFrozenRows(1);
  return s;
}
function tm53RowsBook_(book,create){const s=tm54Sheet_(book,!!create);if(!s||s.getLastRow()<2)return[];return s.getRange(2,1,s.getLastRow()-1,TM54_HEADERS.length).getValues().filter(r=>r[0]);}
function tm53Registro_(r){
  const origemBruta=texto_(r[14]).toUpperCase(),origem=origemBruta==='CAMPEONATO'?'CAMPEONATO':'AVULSO';
  return{id:texto_(r[0]),playerAId:texto_(r[1]),playerA:texto_(r[2]),playerBId:texto_(r[3]),playerB:texto_(r[4]),games:numero_(r[5]),winsA:numero_(r[6]),winsB:numero_(r[7]),basePoints:numero_(r[8]),minimumLead:numero_(r[9]),winPoints:numero_(r[10]),lossPoints:numero_(r[11]),createdAt:r[12]||'',observation:texto_(r[13]),origin:origem,championshipId:texto_(r[15]),championshipName:texto_(r[16])};
}
function tm53LerRegistros_(){const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);return tm53RowsBook_(book,false).map(tm53Registro_);}
function tm54PlayersBook_(book){const s=tm51Sheet_(book,TM_SHEETS.JOGADORES);return tm51Rows_(s,TM_HEADERS.JOGADORES.length).filter(r=>r[0]&&r[1]).map(pa31TmPlayer_);}
function tm54ChampsBook_(book){const s=tm51Sheet_(book,TM_SHEETS.CAMPEONATOS);return tm51Rows_(s,TM_HEADERS.CAMPEONATOS.length).filter(r=>r[0]).map(pa31TmChamp_);}
function tm53Estado_(){const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);return{players:tm54PlayersBook_(book),championships:tm54ChampsBook_(book).slice().reverse(),records:tm53RowsBook_(book,false).map(tm53Registro_)};}
function tm53Salvar_(p){
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),players=tm54PlayersBook_(book),map={};players.forEach(j=>map[j.id]=j);
  const a=texto_(p.jogadorA||p.playerAId),b=texto_(p.jogadorB||p.playerBId),games=numero_(p.confrontos||p.games),winsA=numero_(p.vitoriasA||p.winsA),winsB=numero_(p.vitoriasB||p.winsB),base=numero_(p.pontosBase||p.basePoints),lead=2,origin=texto_(p.origem||p.origin||'AVULSO').toUpperCase();
  if(!map[a]||!map[b]||a===b)throw Error('Selecione dois participantes diferentes.');
  if(!Number.isInteger(games)||games<1)throw Error('Informe a quantidade de confrontos.');
  if(!Number.isInteger(winsA)||winsA<0||!Number.isInteger(winsB)||winsB<0)throw Error('Informe corretamente as vitórias de cada participante.');
  if(winsA+winsB!==games)throw Error('A soma das vitórias precisa ser igual à quantidade de confrontos.');
  if([5,11].indexOf(base)<0)throw Error('Selecione 5 ou 11 pontos como pontuação-base.');
  if(['AVULSO','CAMPEONATO'].indexOf(origin)<0)throw Error('Selecione Jogos avulsos ou Campeonato.');
  let championshipId='',championshipName='';
  if(origin==='CAMPEONATO'){
    championshipId=texto_(p.campeonatoId||p.championshipId);const champs=tm54ChampsBook_(book),champ=champs.find(c=>c.id===championshipId);if(!champ)throw Error('Selecione o campeonato do histórico.');
    const ps=tm51Sheet_(book,TM_SHEETS.PARTICIPANTES),ids=tm51Rows_(ps,TM_HEADERS.PARTICIPANTES.length).filter(r=>texto_(r[0])===championshipId).map(r=>texto_(r[1]));
    if(ids.indexOf(a)<0||ids.indexOf(b)<0)throw Error('Os dois participantes precisam pertencer ao campeonato selecionado.');
    championshipName=champ.name;
  }
  const s=tm54Sheet_(book,true),id=gerarId_('TMHIST'),agora=new Date(),row=[id,a,map[a].name,b,map[b].name,games,winsA,winsB,base,lead,1,0,agora,texto_(p.observacao||p.observation),origin,championshipId,championshipName];
  s.getRange(s.getLastRow()+1,1,1,TM54_HEADERS.length).setValues([row]);
  try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:'Histórico consolidado adicionado sem alterar as partidas existentes.',record:tm53Registro_(row),state:tm53Estado_()};
}
function tm53Excluir_(p){
  const id=texto_(p.id),book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),s=tm54Sheet_(book,false);if(!id||!s||s.getLastRow()<2)throw Error('Lançamento histórico não encontrado.');
  const ids=s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().map(r=>texto_(r[0])),i=ids.indexOf(id);if(i<0)throw Error('Lançamento histórico não encontrado.');
  s.deleteRow(i+2);try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:'Lançamento histórico removido. As partidas reais permanecem intactas.',state:tm53Estado_()};
}
function tm53AplicarRankingManual_(stats,filtro){
  let registros=[];try{registros=tm53LerRegistros_();}catch(ignore){return stats;}const aceita=typeof filtro==='function'?filtro:function(){return true;};
  registros.filter(aceita).forEach(h=>{const a=stats[h.playerAId],b=stats[h.playerBId];if(!a||!b||h.games<1)return;const winScore=Math.max(1,h.basePoints),loseScore=Math.max(0,winScore-2),wp=numero_(h.winPoints),lp=numero_(h.lossPoints);a.games+=h.games;a.wins+=h.winsA;a.losses+=h.winsB;a.points+=h.winsA*wp+h.winsB*lp;a.setsFor+=h.winsA;a.setsAgainst+=h.winsB;a.pointsFor+=h.winsA*winScore+h.winsB*loseScore;a.pointsAgainst+=h.winsA*loseScore+h.winsB*winScore;b.games+=h.games;b.wins+=h.winsB;b.losses+=h.winsA;b.points+=h.winsB*wp+h.winsA*lp;b.setsFor+=h.winsB;b.setsAgainst+=h.winsA;b.pointsFor+=h.winsB*winScore+h.winsA*loseScore;b.pointsAgainst+=h.winsB*loseScore+h.winsA*winScore;});
  return stats;
}
function tm54BaseStats_(players,allowed){const out={},ok=allowed?new Set(allowed):null;players.forEach(p=>{if(ok&&!ok.has(p.id))return;out[p.id]={id:p.id,name:p.name,games:0,wins:0,losses:0,points:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0};});return out;}
function tm54Apply_(stats,id,won,sf,sa,pf,pa,pts){const x=stats[id];if(!x)return;x.games++;if(won)x.wins++;else x.losses++;x.points+=numero_(pts);x.setsFor+=numero_(sf);x.setsAgainst+=numero_(sa);x.pointsFor+=numero_(pf);x.pointsAgainst+=numero_(pa);}
function tm54Finish_(stats,keepZeros){const list=Object.values(stats),has=list.some(x=>x.games>0);return flexOrdenarRanking_(list.filter(x=>keepZeros&&has?true:x.games>0).map(x=>Object.assign(x,{winRate:x.games?Math.round(x.wins*1000/x.games)/10:0,setDiff:x.setsFor-x.setsAgainst,pointDiff:x.pointsFor-x.pointsAgainst})),'PONTOS');}
function tm54ApplyManualRows_(stats,records,filter){records.filter(filter).forEach(h=>{const a=stats[h.playerAId],b=stats[h.playerBId];if(!a||!b)return;const wp=numero_(h.winPoints),lp=numero_(h.lossPoints),w=Math.max(1,h.basePoints),l=Math.max(0,w-2);a.games+=h.games;a.wins+=h.winsA;a.losses+=h.winsB;a.points+=h.winsA*wp+h.winsB*lp;a.setsFor+=h.winsA;a.setsAgainst+=h.winsB;a.pointsFor+=h.winsA*w+h.winsB*l;a.pointsAgainst+=h.winsA*l+h.winsB*w;b.games+=h.games;b.wins+=h.winsB;b.losses+=h.winsA;b.points+=h.winsB*wp+h.winsA*lp;b.setsFor+=h.winsB;b.setsAgainst+=h.winsA;b.pointsFor+=h.winsB*w+h.winsA*l;b.pointsAgainst+=h.winsB*l+h.winsA*w;});}
function tm54Data_(){
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),players=tm54PlayersBook_(book),champs=tm54ChampsBook_(book),participants=tm51Rows_(tm51Sheet_(book,TM_SHEETS.PARTICIPANTES),TM_HEADERS.PARTICIPANTES.length),games=tm51Rows_(tm51Sheet_(book,TM_SHEETS.JOGOS),TM_HEADERS.JOGOS.length).filter(r=>r[0]).map(pa31TmGame_),free=tm51Rows_(tm51Sheet_(book,FLEX_V023.TM_AVULSOS),FLEX_V023.TM_HEADERS.length).filter(r=>r[0]).map(pa31TmFree_),manual=tm53RowsBook_(book,false).map(tm53Registro_);return{players:players,champs:champs,participants:participants,games:games,free:free,manual:manual};
}
function tm54BuildScopes_(){
  const d=tm54Data_(),cmap={};d.champs.forEach(c=>cmap[c.id]=c);
  const generalStats=tm54BaseStats_(d.players);d.games.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const c=cmap[g.championshipId]||{winPoints:1,lossPoints:0},p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);tm54Apply_(generalStats,g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?c.winPoints:c.lossPoints);tm54Apply_(generalStats,g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?c.winPoints:c.lossPoints);});d.free.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);tm54Apply_(generalStats,g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?g.winPoints:g.lossPoints);tm54Apply_(generalStats,g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?g.winPoints:g.lossPoints);});tm54ApplyManualRows_(generalStats,d.manual,function(){return true;});
  const general=tm54Finish_(generalStats,false),manualTotal=d.manual.reduce((t,h)=>t+h.games,0),realFinished=d.games.filter(g=>g.status==='FINALIZADO').length+d.free.filter(g=>g.status==='FINALIZADO').length;
  const freeStats=tm54BaseStats_(d.players);d.free.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);tm54Apply_(freeStats,g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?g.winPoints:g.lossPoints);tm54Apply_(freeStats,g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?g.winPoints:g.lossPoints);});tm54ApplyManualRows_(freeStats,d.manual,h=>h.origin==='AVULSO');const freeRanking=tm54Finish_(freeStats,false),freeManual=d.manual.filter(h=>h.origin==='AVULSO').reduce((t,h)=>t+h.games,0),freeIds={};d.free.forEach(g=>{freeIds[g.player1Id]=1;freeIds[g.player2Id]=1;});d.manual.filter(h=>h.origin==='AVULSO').forEach(h=>{freeIds[h.playerAId]=1;freeIds[h.playerBId]=1;});
  const championships=d.champs.slice().reverse().map(c=>{const ids=d.participants.filter(r=>texto_(r[0])===c.id).map(r=>texto_(r[1])),stats=tm54BaseStats_(d.players,ids),cg=d.games.filter(g=>g.championshipId===c.id);cg.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);tm54Apply_(stats,g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?c.winPoints:c.lossPoints);tm54Apply_(stats,g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?c.winPoints:c.lossPoints);});tm54ApplyManualRows_(stats,d.manual,h=>h.origin==='CAMPEONATO'&&h.championshipId===c.id);const manualGames=d.manual.filter(h=>h.origin==='CAMPEONATO'&&h.championshipId===c.id).reduce((t,h)=>t+h.games,0),ranking=tm54Finish_(stats,true);return{id:c.id,name:c.name,status:c.status,createdAt:c.createdAt,ranking:ranking,summary:{participants:ids.length,games:cg.length+manualGames,finished:cg.filter(g=>g.status==='FINALIZADO').length+manualGames,leader:ranking[0]?ranking[0].name:'A definir'}};});
  return{general:general,free:freeRanking,championships:championships,generalSummary:{participants:general.filter(x=>x.games>0).length,games:d.games.length+d.free.length+manualTotal,finished:realFinished+manualTotal,leader:general[0]?general[0].name:'A definir'},freeSummary:{participants:Object.keys(freeIds).length,games:d.free.length+freeManual,finished:d.free.filter(g=>g.status==='FINALIZADO').length+freeManual,leader:freeRanking[0]?freeRanking[0].name:'A definir',rules:(d.free[0]?{bestOf:d.free[0].bestOf,setPoints:d.free[0].setPoints,minimumLead:d.free[0].minimumLead,winPoints:d.free[0].winPoints,lossPoints:d.free[0].lossPoints}:{bestOf:1,setPoints:11,minimumLead:2,winPoints:1,lossPoints:0})}};
}
function tm53RankingGlobal_(){return tm54BuildScopes_().general;}
function tm50RankingAvulso_(){return tm54BuildScopes_().free;}
function tm50RankingEscopos_(){return tm54BuildScopes_();}
function tm54CurrentChamp_(scopes,id){return(scopes.championships||[]).find(c=>c.id===id)||null;}
function tmObterEstado_(admin){
  const d=tm54Data_(),activeId=texto_(props_().getProperty('TM_CAMPEONATO_ATIVO')),champ=d.champs.find(c=>c.id===activeId)||d.champs[d.champs.length-1]||null,scopes=tm54BuildScopes_(),current=champ?tm54CurrentChamp_(scopes,champ.id):null,estado={version:'TM_V054_2026-07-25',sport:'TENIS_DE_MESA',serverTime:new Date(),championship:champ,participants:champ?d.participants.filter(r=>texto_(r[0])===champ.id).map(r=>({championshipId:texto_(r[0]),id:texto_(r[1]),name:texto_(r[2]),order:numero_(r[3]),selectedAt:r[4]})).sort((a,b)=>a.order-b.order):[],matches:champ?d.games.filter(g=>g.championshipId===champ.id).sort((a,b)=>a.game-b.game):[],ranking:current?current.ranking:[],globalRankingPoints:scopes.general,globalRankingWinRate:flexOrdenarRanking_(scopes.general,'APROVEITAMENTO'),globalFinishedMatches:scopes.generalSummary.finished,rankingSummaries:{general:scopes.generalSummary,free:scopes.freeSummary,current:current?current.summary:null},championshipEditable:champ?!d.games.some(g=>g.championshipId===champ.id&&(g.startedAt||g.finishedAt||['EM_ANDAMENTO','FINALIZADO'].indexOf(g.status)>=0)):false,registrationOpen:true};
  if(admin){estado.players=d.players;estado.championships=d.champs.slice().reverse();estado.freeMatches=d.free.slice().sort((a,b)=>b.order-a.order);}
  return estado;
}
function tmObterEstadoPublico_(){return tmObterEstado_(false);}function tmObterEstadoAdmin_(){return tmObterEstado_(true);}
