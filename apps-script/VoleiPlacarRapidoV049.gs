/** VÔLEI — SALVAMENTO RÁPIDO DO PLACAR — V049 */
function vo49Match_(jogo,analise,status,winnerId,inicio,fim){
  return{game:numero_(jogo),scores:analise.scores,sets1:analise.sets1,sets2:analise.sets2,winnerId:texto_(winnerId),status:texto_(status),startedAt:inicio||'',finishedAt:fim||''};
}
function vo49Corrigir_(jogo,payload){
  const resultado=validarPlacar_(payload),s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();
  if(l<2)throw Error('Nenhum jogo foi gerado.');
  const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===numero_(jogo));
  if(i<0)throw Error('Jogo não encontrado.');
  const r=dados[i],oldWinner=texto_(r[15]),newWinner=resultado.winnerSide===1?texto_(r[3]):texto_(r[5]),newLoser=resultado.winnerSide===1?texto_(r[5]):texto_(r[3]);
  if(texto_(r[16])!=='FINALIZADO')return registrarResultado_(jogo,payload,{rapido:true});
  const deps=pa31DependenciaVolei_(dados,r);
  if(oldWinner!==newWinner){
    deps.forEach(dep=>{const dr=dados[dep.index],started=dr[22]||dr[17]||['EM_DISPUTA','FINALIZADO'].indexOf(texto_(dr[16]))>=0;if(started)throw Error('O vencedor não pode ser alterado porque uma partida dependente já foi iniciada.');});
  }
  const tres=[resultado.scores[0]||[null,null],resultado.scores[1]||[null,null],resultado.scores[2]||[null,null]],agora=new Date(),inicio=r[22]||agora;
  s.getRange(i+2,8,1,11).setValues([[tres[0][0]==null?'':tres[0][0],tres[0][1]==null?'':tres[0][1],tres[1][0]==null?'':tres[1][0],tres[1][1]==null?'':tres[1][1],tres[2][0]==null?'':tres[2][0],tres[2][1]==null?'':tres[2][1],resultado.sets1,resultado.sets2,newWinner,'FINALIZADO',r[17]||agora]]);
  s.getRange(i+2,23,1,2).setValues([[inicio,JSON.stringify(resultado.scores)]]);
  if(oldWinner!==newWinner){
    const equipes=lerEquipes_(),winnerTeam=equipes.find(e=>e.id===newWinner),loserTeam=equipes.find(e=>e.id===newLoser);
    deps.forEach(dep=>{const team=dep.type==='WINNER'?winnerTeam:loserTeam;if(!team)return;const col=dep.slot===1?4:6;s.getRange(dep.index+2,col,1,2).setValues([[team.id,nomeEquipe_(team)]]);});
  }
  if(texto_(r[2]).toUpperCase()==='FINAL'){
    const torneio=ultimoSorteio_();if(torneio)aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,14).setValue(newWinner);
    try{atualizarCampeonatoFinalizado_();}catch(ignore){}
  }
  log_('PLACAR_CORRIGIDO',texto_(r[0]),'PAINEL_WEB','ADMIN','Jogo '+jogo+' | vencedor '+newWinner,'INFO',String(jogo));
  return{message:'Placar corrigido e classificação atualizada.',partial:false,corrected:true,indexRefreshRequired:true,refreshRequired:true,savedMatch:vo49Match_(jogo,resultado,'FINALIZADO',newWinner,inicio,agora)};
}
function vo49Salvar_(p){
  const jogo=numero_(p.jogo);if(!jogo)throw Error('Selecione uma partida.');
  const payload=p.payload||p.placar||p.scores,regras=regrasPartida_(),analise=pa31AnalisarParcial_(payload,regras.bestOf,regras.normalSetPoints,regras.tiebreakSetPoints,regras.minimumLead,false);
  const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Nenhum jogo foi gerado.');
  const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
  const r=dados[i];if(!r[3]||!r[5])throw Error('As equipes desta partida ainda não foram definidas.');
  if(analise.matchComplete){
    const completo=JSON.stringify({scores:analise.scores});
    return texto_(r[16])==='FINALIZADO'?vo49Corrigir_(jogo,completo):registrarResultado_(jogo,completo,{rapido:true});
  }
  if(texto_(r[16])==='FINALIZADO')throw Error('A correção precisa manter um resultado completo. Ajuste o placar até existir um vencedor.');
  pa31EscreverParcialVolei_(s,i+2,r,analise);
  return{message:'Placar parcial salvo automaticamente.',partial:true,corrected:false,indexRefreshRequired:false,refreshRequired:false,savedMatch:vo49Match_(jogo,analise,'EM_DISPUTA','',r[22]||new Date(),'')};
}
function vo49AtualizarIndices_(){
  atualizarIndicesHistoricos_();
  return{message:'Índices e ranking atualizados.'};
}
function vo49Responder_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:vo49Salvar_(p),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}}
function vo49ResponderIndices_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:vo49AtualizarIndices_(),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V049',dataHora:formatarData_(new Date())},p.callback);}}
