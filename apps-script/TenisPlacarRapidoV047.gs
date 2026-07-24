/** TÊNIS DE MESA — PLACAR DIRETO + RECORTES DE RANKING — V051 */
function tm51ExigirAdminRapido_(chave){
  const props=PropertiesService.getScriptProperties(),esperada=texto_(props.getProperty('ADMIN_KEY'));
  if(!esperada){exigirAdmin_(chave);return;}
  if(!chave||!compararSeguro_(chave,esperada))throw Error('Chave administrativa inválida.');
}
function tm51Sheet_(book,nome){const s=book.getSheetByName(nome);if(!s)throw Error('Aba obrigatória não encontrada: '+nome);return s;}
function tm51Rows_(sheet,width){const l=sheet.getLastRow();return l<2?[]:sheet.getRange(2,1,l-1,width).getValues();}
function tm51Contexto_(){
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);
  return{book:book,champSheet:tm51Sheet_(book,TM_SHEETS.CAMPEONATOS),gamesSheet:tm51Sheet_(book,TM_SHEETS.JOGOS),freeSheet:tm51Sheet_(book,FLEX_V023.TM_AVULSOS)};
}
function tm51Campeonato_(ctx,idSolicitado){
  const rows=tm51Rows_(ctx.champSheet,TM_HEADERS.CAMPEONATOS.length);if(!rows.length)return null;
  const ativo=texto_(idSolicitado)||texto_(PropertiesService.getScriptProperties().getProperty('TM_CAMPEONATO_ATIVO'));
  let index=ativo?rows.findIndex(r=>texto_(r[0])===ativo):-1;if(index<0)index=rows.length-1;
  return{index:index,rowIndex:index+2,row:rows[index],champ:pa31TmChamp_(rows[index])};
}
function tm51AtualizarStatus_(ctx,info,status,message,agora){
  if(!info||!info.row)return;
  const r=info.row.slice(),atual=texto_(r[2]);
  if(atual===status&&(!message||texto_(r[16])===message))return;
  r[2]=status;if(status==='EM_ANDAMENTO'&&!r[13])r[13]=agora;if(status==='FINALIZADO'&&!r[14])r[14]=agora;if(message)r[16]=message;
  ctx.champSheet.getRange(info.rowIndex,1,1,TM_HEADERS.CAMPEONATOS.length).setValues([r]);info.row=r;info.champ=pa31TmChamp_(r);
}
function tm51SalvarCampeonato_(p){
  const ctx=tm51Contexto_(),info=tm51Campeonato_(ctx,p.campeonatoId);if(!info)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
  const champ=info.champ,jogo=numero_(p.jogo),payload=p.placar||p.scores||p.payload;if(!jogo)throw Error('Selecione uma partida.');
  const rows=tm51Rows_(ctx.gamesSheet,TM_HEADERS.JOGOS.length),i=rows.findIndex(r=>texto_(r[0])===champ.id&&numero_(r[1])===jogo);if(i<0)throw Error('Partida não encontrada.');
  const r=rows[i].slice(),analysis=pa31AnalisarParcial_(payload,champ.bestOf,champ.setPoints,champ.setPoints,champ.minimumLead,true),wasFinal=texto_(r[11])==='FINALIZADO',agora=new Date();
  let nextRow=null,nextIndex=-1;
  if(analysis.matchComplete){
    r[7]=JSON.stringify(analysis.scores.slice(0,champ.bestOf));r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]=analysis.winnerSide===1?texto_(r[3]):texto_(r[5]);r[11]='FINALIZADO';r[12]=r[12]||agora;r[13]=agora;
    if(!wasFinal){
      const pending=rows.map((x,index)=>({x:x,index:index})).filter(z=>z.index!==i&&texto_(z.x[0])===champ.id&&texto_(z.x[11])!=='FINALIZADO').sort((a,b)=>numero_(a.x[1])-numero_(b.x[1]));
      if(pending.length){nextRow=pending[0].x.slice();nextIndex=pending[0].index;nextRow[11]=champ.autoStart==='SIM'?'EM_ANDAMENTO':'LIBERADO';if(champ.autoStart==='SIM')nextRow[12]=nextRow[12]||agora;tm51AtualizarStatus_(ctx,info,'EM_ANDAMENTO','Campeonato em andamento.',agora);}
      else tm51AtualizarStatus_(ctx,info,'FINALIZADO','Campeonato finalizado. Ranking consolidado.',agora);
    }
  }else{
    if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');
    r[7]=JSON.stringify(analysis.scores);r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]='';r[11]='EM_ANDAMENTO';r[12]=r[12]||agora;r[13]='';tm51AtualizarStatus_(ctx,info,'EM_ANDAMENTO','Campeonato em andamento.',agora);
  }
  ctx.gamesSheet.getRange(i+2,1,1,TM_HEADERS.JOGOS.length).setValues([r]);
  if(nextRow&&nextIndex>=0)ctx.gamesSheet.getRange(nextIndex+2,1,1,TM_HEADERS.JOGOS.length).setValues([nextRow]);
  try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:analysis.matchComplete?(wasFinal?'Placar corrigido.':'Partida encerrada automaticamente.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,corrected:wasFinal&&analysis.matchComplete,analysis:analysis,savedMatch:pa31TmGame_(r),nextMatch:nextRow?pa31TmGame_(nextRow):null,championshipId:champ.id,rankingRefreshRequired:analysis.matchComplete,refreshRequired:true};
}
function tm51SalvarAvulso_(p){
  const ctx=tm51Contexto_(),id=texto_(p.id),payload=p.placar||p.scores||p.payload;if(!id)throw Error('Jogo avulso não encontrado.');
  const rows=tm51Rows_(ctx.freeSheet,FLEX_V023.TM_HEADERS.length),i=rows.findIndex(r=>texto_(r[0])===id);if(i<0)throw Error('Jogo avulso não encontrado.');
  const r=rows[i].slice(),analysis=pa31AnalisarParcial_(payload,r[14],r[15],r[15],r[16],true),wasFinal=texto_(r[3])==='FINALIZADO',agora=new Date();
  if(analysis.matchComplete){r[3]='FINALIZADO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]=analysis.winnerSide===1?texto_(r[4]):texto_(r[6]);r[12]=r[12]||agora;r[13]=agora;}
  else{if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');r[3]='EM_ANDAMENTO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]='';r[12]=r[12]||agora;r[13]='';}
  ctx.freeSheet.getRange(i+2,1,1,FLEX_V023.TM_HEADERS.length).setValues([r]);try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{message:analysis.matchComplete?(wasFinal?'Placar avulso corrigido.':'Jogo encerrado automaticamente. O vencedor permanece.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,corrected:wasFinal&&analysis.matchComplete,analysis:analysis,savedMatch:pa31TmFree_(r),rankingRefreshRequired:false,refreshRequired:true};
}
function tm47EstadoPlacar_(){
  const ctx=tm51Contexto_(),info=tm51Campeonato_(ctx,''),champ=info?info.champ:null,gameRows=tm51Rows_(ctx.gamesSheet,TM_HEADERS.JOGOS.length),freeRows=tm51Rows_(ctx.freeSheet,FLEX_V023.TM_HEADERS.length);
  return{championship:champ,matches:champ?gameRows.filter(r=>texto_(r[0])===champ.id).map(pa31TmGame_):[],freeMatches:freeRows.filter(r=>r[0]).map(pa31TmFree_)};
}
function tm47RecalcularRanking_(p){
  const champ=texto_(p.campeonatoId)?tmLocalizarCampeonato_(p.campeonatoId):tmCampeonatoAtivo_();
  if(!champ)throw Error('Campeonato de tênis não encontrado.');
  tmAtualizarRanking_(champ.id);pa31LimparCacheTm_();
  return{message:'Ranking atualizado.',championshipId:champ.id};
}
function tm50RankingAvulso_(){
  const stats={};
  tmLerJogadores_().forEach(j=>stats[j.id]={id:j.id,name:j.name,games:0,wins:0,losses:0,points:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0});
  function add(id,won,sf,sa,pf,pa,pts){const x=stats[id];if(!x)return;x.games++;if(won)x.wins++;else x.losses++;x.points+=numero_(pts);x.setsFor+=numero_(sf);x.setsAgainst+=numero_(sa);x.pointsFor+=numero_(pf);x.pointsAgainst+=numero_(pa);}
  flexTmLerAvulsos_().filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);add(g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?g.winPoints:g.lossPoints);add(g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?g.winPoints:g.lossPoints);});
  const list=Object.values(stats).filter(x=>x.games>0).map(x=>Object.assign(x,{winRate:x.games?Math.round(x.wins*1000/x.games)/10:0,setDiff:x.setsFor-x.setsAgainst,pointDiff:x.pointsFor-x.pointsAgainst}));
  return flexOrdenarRanking_(list,'PONTOS');
}
function tm50RankingEscopos_(){
  const champs=tmLerCampeonatos_().slice().reverse().map(c=>({id:c.id,name:c.name,status:c.status,createdAt:c.createdAt,ranking:tmLerRanking_(c.id)}));
  return{general:flexOrdenarRanking_(flexTmRankingGlobal_(),'PONTOS'),free:tm50RankingAvulso_(),championships:champs};
}
function tm47Salvar_(p){return texto_(p.tipo||'CAMPEONATO').toUpperCase()==='AVULSO'?tm51SalvarAvulso_(p):tm51SalvarCampeonato_(p);}
function tm47Responder_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm47Salvar_(p),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}}
function tm47ResponderEstado_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm47EstadoPlacar_(),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}}
function tm47ResponderRanking_(p){try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm47RecalcularRanking_(p),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}}
function tm50ResponderEscopos_(p){try{return responder_({ok:true,dados:tm50RankingEscopos_(),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V051',dataHora:formatarData_(new Date())},p.callback);}}
