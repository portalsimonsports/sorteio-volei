/** TÊNIS DE MESA — HISTÓRICO CONSOLIDADO NÃO DESTRUTIVO — V053 */
const TM53_SHEET='TM_HISTORICO_MANUAL';
const TM53_HEADERS=['REGISTRO_ID','JOGADOR_A_ID','JOGADOR_A','JOGADOR_B_ID','JOGADOR_B','CONFRONTOS','VITORIAS_A','VITORIAS_B','PONTOS_BASE','VANTAGEM','PONTOS_VITORIA','PONTOS_DERROTA','CRIADO_EM','OBSERVACAO'];

function tm53Sheet_(book,create){
  let s=book.getSheetByName(TM53_SHEET);
  if(!s&&create){s=book.insertSheet(TM53_SHEET);s.getRange(1,1,1,TM53_HEADERS.length).setValues([TM53_HEADERS]);s.setFrozenRows(1);}
  if(s&&s.getLastRow()<1)s.getRange(1,1,1,TM53_HEADERS.length).setValues([TM53_HEADERS]);
  return s;
}
function tm53RowsBook_(book,create){const s=tm53Sheet_(book,!!create);if(!s||s.getLastRow()<2)return[];return s.getRange(2,1,s.getLastRow()-1,TM53_HEADERS.length).getValues().filter(r=>r[0]);}
function tm53Registro_(r){return{id:texto_(r[0]),playerAId:texto_(r[1]),playerA:texto_(r[2]),playerBId:texto_(r[3]),playerB:texto_(r[4]),games:numero_(r[5]),winsA:numero_(r[6]),winsB:numero_(r[7]),basePoints:numero_(r[8]),minimumLead:numero_(r[9]),winPoints:numero_(r[10]),lossPoints:numero_(r[11]),createdAt:r[12]||'',observation:texto_(r[13])};}
function tm53LerRegistros_(){const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);return tm53RowsBook_(book,false).map(tm53Registro_);}
function tm53PlayersBook_(book){const s=tm51Sheet_(book,TM_SHEETS.JOGADORES),rows=tm51Rows_(s,TM_HEADERS.JOGADORES.length);return rows.filter(r=>r[0]&&r[1]).map(r=>({id:texto_(r[0]),name:texto_(r[1]),active:texto_(r[4]||'SIM').toUpperCase()}));}
function tm53Estado_(){const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);return{players:tm53PlayersBook_(book),records:tm53RowsBook_(book,false).map(tm53Registro_)};}
function tm53Salvar_(p){
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),players=tm53PlayersBook_(book),map={};players.forEach(j=>map[j.id]=j);
  const a=texto_(p.jogadorA||p.playerAId),b=texto_(p.jogadorB||p.playerBId),games=numero_(p.confrontos||p.games),winsA=numero_(p.vitoriasA||p.winsA),winsB=numero_(p.vitoriasB||p.winsB),base=numero_(p.pontosBase||p.basePoints),lead=2;
  if(!map[a]||!map[b]||a===b)throw Error('Selecione dois participantes diferentes.');
  if(!Number.isInteger(games)||games<1)throw Error('Informe a quantidade de confrontos.');
  if(!Number.isInteger(winsA)||winsA<0||!Number.isInteger(winsB)||winsB<0)throw Error('Informe corretamente as vitórias de cada participante.');
  if(winsA+winsB!==games)throw Error('A soma das vitórias precisa ser igual à quantidade de confrontos.');
  if([5,11].indexOf(base)<0)throw Error('Selecione 5 ou 11 pontos como pontuação-base.');
  const s=tm53Sheet_(book,true),id=gerarId_('TMHIST'),agora=new Date(),row=[id,a,map[a].name,b,map[b].name,games,winsA,winsB,base,lead,1,0,agora,texto_(p.observacao||p.observation)];
  s.getRange(s.getLastRow()+1,1,1,row.length).setValues([row]);
  try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:'Histórico consolidado adicionado sem alterar as partidas existentes.',record:tm53Registro_(row),state:tm53Estado_()};
}
function tm53Excluir_(p){
  const id=texto_(p.id),book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),s=tm53Sheet_(book,false);if(!id||!s||s.getLastRow()<2)throw Error('Lançamento histórico não encontrado.');
  const ids=s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().map(r=>texto_(r[0])),i=ids.indexOf(id);if(i<0)throw Error('Lançamento histórico não encontrado.');
  s.deleteRow(i+2);try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:'Lançamento histórico removido. As partidas reais permanecem intactas.',state:tm53Estado_()};
}
function tm53AplicarRankingManual_(stats){
  let registros=[];try{registros=tm53LerRegistros_();}catch(ignore){return stats;}
  registros.forEach(h=>{
    const a=stats[h.playerAId],b=stats[h.playerBId];if(!a||!b||h.games<1)return;
    const winScore=Math.max(1,h.basePoints),loseScore=Math.max(0,winScore-2),wp=numero_(h.winPoints),lp=numero_(h.lossPoints);
    a.games+=h.games;a.wins+=h.winsA;a.losses+=h.winsB;a.points+=h.winsA*wp+h.winsB*lp;a.setsFor+=h.winsA;a.setsAgainst+=h.winsB;a.pointsFor+=h.winsA*winScore+h.winsB*loseScore;a.pointsAgainst+=h.winsA*loseScore+h.winsB*winScore;
    b.games+=h.games;b.wins+=h.winsB;b.losses+=h.winsA;b.points+=h.winsB*wp+h.winsA*lp;b.setsFor+=h.winsB;b.setsAgainst+=h.winsA;b.pointsFor+=h.winsB*winScore+h.winsA*loseScore;b.pointsAgainst+=h.winsB*loseScore+h.winsA*winScore;
  });
  return stats;
}
function tm53AdicionarHeadToHead_(out,rows){
  (rows||[]).forEach(r=>{const h=tm53Registro_(r),key=tm52PairKey_(h.playerAId,h.playerBId);if(!key||h.games<1)return;if(!out[key])out[key]={players:[h.playerAId,h.playerBId],games:0,wins:{}};out[key].games+=h.games;out[key].wins[h.playerAId]=numero_(out[key].wins[h.playerAId])+h.winsA;out[key].wins[h.playerBId]=numero_(out[key].wins[h.playerBId])+h.winsB;});
  return out;
}
function tm53AnalisarPlacar_(payload,bestOf,setPoints,minimumLead,finalizarManual){
  const analysis=pa31AnalisarParcial_(payload,bestOf,setPoints,setPoints,minimumLead,true);
  if(analysis.matchComplete||texto_(finalizarManual).toUpperCase()!=='SIM'||numero_(bestOf)!==1)return analysis;
  const pair=Array.isArray(analysis.scores&&analysis.scores[0])?analysis.scores[0]:[0,0],a=numero_(pair[0]),b=numero_(pair[1]),lead=Math.max(1,numero_(minimumLead)||2);
  if(a===b||Math.max(a,b)<=0||Math.abs(a-b)<lead)return analysis;
  return Object.assign({},analysis,{sets1:a>b?1:0,sets2:b>a?1:0,completed:[true],matchComplete:true,winnerSide:a>b?1:2,currentSet:0,manualFinalized:true});
}
function tm53ResponderEstado_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm53Estado_(),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}}
function tm53ResponderSalvar_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm53Salvar_(p),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}}
function tm53ResponderExcluir_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm53Excluir_(p),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V053',dataHora:formatarData_(new Date())},p.callback);}}
