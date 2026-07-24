/** TÊNIS DE MESA — SALVAMENTO RÁPIDO DE PLACAR — V049 */
function tm47AtualizarStatusCampeonato_(champ,status,message){
  if(!champ||texto_(champ.status)===status)return;
  champ.status=status;champ.message=message||champ.message;
  if(status==='EM_ANDAMENTO'&&!champ.startedAt)champ.startedAt=new Date();
  if(status==='FINALIZADO'&&!champ.finishedAt)champ.finishedAt=new Date();
  tmAtualizarCampeonato_(champ);
}
function tm47SalvarCampeonato_(p){
  const champ=tmCampeonatoAtivo_();if(!champ)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
  const jogo=numero_(p.jogo),payload=p.placar||p.scores||p.payload;if(!jogo)throw Error('Selecione uma partida.');
  const s=aba_(TM_SHEETS.JOGOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,TM_HEADERS.JOGOS.length).getValues():[];
  const i=rows.findIndex(r=>texto_(r[0])===champ.id&&numero_(r[1])===jogo);if(i<0)throw Error('Partida não encontrada.');
  const r=rows[i],analysis=pa31AnalisarParcial_(payload,champ.bestOf,champ.setPoints,champ.setPoints,champ.minimumLead,true),wasFinal=texto_(r[11])==='FINALIZADO',agora=new Date();
  let nextRow=null,nextIndex=-1;
  if(analysis.matchComplete){
    r[7]=JSON.stringify(analysis.scores.filter((x,index)=>index<champ.bestOf));r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]=analysis.winnerSide===1?texto_(r[3]):texto_(r[5]);r[11]='FINALIZADO';r[12]=r[12]||agora;r[13]=agora;
    if(!wasFinal){
      const pending=rows.map((x,index)=>({x,index})).filter(z=>z.index!==i&&texto_(z.x[0])===champ.id&&texto_(z.x[11])!=='FINALIZADO').sort((a,b)=>numero_(a.x[1])-numero_(b.x[1]));
      if(pending.length){nextRow=pending[0].x;nextIndex=pending[0].index;nextRow[11]=champ.autoStart==='SIM'?'EM_ANDAMENTO':'LIBERADO';if(champ.autoStart==='SIM')nextRow[12]=nextRow[12]||agora;tm47AtualizarStatusCampeonato_(champ,'EM_ANDAMENTO','Campeonato em andamento.');}
      else tm47AtualizarStatusCampeonato_(champ,'FINALIZADO','Campeonato finalizado. Ranking consolidado.');
    }
  }else{
    if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');
    r[7]=JSON.stringify(analysis.scores);r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]='';r[11]='EM_ANDAMENTO';r[12]=r[12]||agora;r[13]='';tm47AtualizarStatusCampeonato_(champ,'EM_ANDAMENTO','Campeonato em andamento.');
  }
  s.getRange(i+2,1,1,TM_HEADERS.JOGOS.length).setValues([r]);
  if(nextRow&&nextIndex>=0)s.getRange(nextIndex+2,1,1,TM_HEADERS.JOGOS.length).setValues([nextRow]);
  pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar corrigido.':'Partida encerrada automaticamente.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,corrected:wasFinal&&analysis.matchComplete,analysis:analysis,savedMatch:pa31TmGame_(r),nextMatch:nextRow?pa31TmGame_(nextRow):null,championshipId:champ.id,rankingRefreshRequired:analysis.matchComplete,refreshRequired:true};
}
function tm47SalvarAvulso_(p){
  const id=texto_(p.id),payload=p.placar||p.scores||p.payload;if(!id)throw Error('Jogo avulso não encontrado.');
  const s=aba_(FLEX_V023.TM_AVULSOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,FLEX_V023.TM_HEADERS.length).getValues():[],i=rows.findIndex(r=>texto_(r[0])===id);if(i<0)throw Error('Jogo avulso não encontrado.');
  const r=rows[i],analysis=pa31AnalisarParcial_(payload,r[14],r[15],r[15],r[16],true),wasFinal=texto_(r[3])==='FINALIZADO',agora=new Date();
  if(analysis.matchComplete){r[3]='FINALIZADO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]=analysis.winnerSide===1?texto_(r[4]):texto_(r[6]);r[12]=r[12]||agora;r[13]=agora;}
  else{if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');r[3]='EM_ANDAMENTO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]='';r[12]=r[12]||agora;r[13]='';}
  s.getRange(i+2,1,1,FLEX_V023.TM_HEADERS.length).setValues([r]);pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar avulso corrigido.':'Jogo encerrado automaticamente. O vencedor permanece.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,corrected:wasFinal&&analysis.matchComplete,analysis:analysis,savedMatch:pa31TmFree_(r),rankingRefreshRequired:false,refreshRequired:true};
}
function tm47EstadoPlacar_(){
  const champ=tmCampeonatoAtivo_();
  return{championship:champ,matches:champ?tmLerJogos_(champ.id):[],freeMatches:flexTmLerAvulsos_()};
}
function tm47RecalcularRanking_(p){
  const champ=texto_(p.campeonatoId)?tmLocalizarCampeonato_(p.campeonatoId):tmCampeonatoAtivo_();
  if(!champ)throw Error('Campeonato de tênis não encontrado.');
  tmAtualizarRanking_(champ.id);pa31LimparCacheTm_();
  return{message:'Ranking atualizado.',championshipId:champ.id};
}
function tm47Salvar_(p){return texto_(p.tipo||'CAMPEONATO').toUpperCase()==='AVULSO'?tm47SalvarAvulso_(p):tm47SalvarCampeonato_(p);}
function tm47Responder_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:tm47Salvar_(p),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}}
function tm47ResponderEstado_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:tm47EstadoPlacar_(),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}}
function tm47ResponderRanking_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:tm47RecalcularRanking_(p),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}}
