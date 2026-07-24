/** PROTEÇÕES DO PLACAR AUTOMÁTICO — V031 */

function salvarPlacarAutomaticoVolei_(jogo,payload){
  jogo=numero_(jogo);if(!jogo)throw Error('Selecione uma partida.');
  const p=pa31Payload_(payload),scores=Array.isArray(p.scores)?p.scores:pa31Scores_(payload),regras=regrasPartida_(),analise=pa31AnalisarParcial_(scores,regras.bestOf,regras.normalSetPoints,regras.tiebreakSetPoints,regras.minimumLead,false);
  const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Nenhum jogo foi gerado.');
  const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
  const r=dados[i],status=texto_(r[16]).toUpperCase();if(!r[3]||!r[5])throw Error('As equipes desta partida ainda não foram definidas.');
  if(['LIBERADO','EM_DISPUTA','FINALIZADO'].indexOf(status)<0)throw Error('Esta partida ainda não está liberada para atualização do placar.');
  const disponivel=r[18]?interpretarData_(r[18]):null;if(status!=='FINALIZADO'&&disponivel&&disponivel.getTime()>Date.now())throw Error('Esta partida ainda não está liberada.');
  if(analise.matchComplete){const completo=JSON.stringify({scores:analise.scores});return status==='FINALIZADO'?pa31CorrigirVolei_(jogo,completo):registrarResultado_(jogo,completo);}
  if(status==='FINALIZADO')throw Error('A correção precisa manter um resultado completo. Ajuste o placar até existir um vencedor.');
  pa31EscreverParcialVolei_(s,i+2,r,analise);
  return{message:'Placar parcial salvo automaticamente.',partial:true,analysis:analise,state:obterEstadoAdmin_()};
}

function pa31SalvarTmCampeonato_(game,payload){
  const champ=tmCampeonatoAtivo_();if(!champ)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
  const s=aba_(TM_SHEETS.JOGOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,TM_HEADERS.JOGOS.length).getValues():[],i=rows.findIndex(r=>texto_(r[0])===champ.id&&numero_(r[1])===numero_(game));if(i<0)throw Error('Partida não encontrada.');
  const r=rows[i],status=texto_(r[11]).toUpperCase();if(['LIBERADO','EM_ANDAMENTO','FINALIZADO'].indexOf(status)<0)throw Error('Esta partida ainda não está liberada para atualização do placar.');
  const analysis=pa31AnalisarParcial_(payload,champ.bestOf,champ.setPoints,champ.setPoints,champ.minimumLead,true),wasFinal=status==='FINALIZADO',agora=new Date();
  if(analysis.matchComplete){
    r[7]=JSON.stringify(analysis.scores.filter((x,index)=>index<champ.bestOf));r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]=analysis.winnerSide===1?texto_(r[3]):texto_(r[5]);r[11]='FINALIZADO';r[12]=r[12]||agora;r[13]=r[13]||agora;
    if(!wasFinal){const pending=rows.filter((x,index)=>index!==i&&texto_(x[0])===champ.id&&texto_(x[11])!=='FINALIZADO').sort((a,b)=>numero_(a[1])-numero_(b[1]));if(pending.length){const next=pending[0];next[11]=champ.autoStart==='SIM'?'EM_ANDAMENTO':'LIBERADO';if(champ.autoStart==='SIM')next[12]=agora;pa31AtualizarTmChampStatus_(champ,'EM_ANDAMENTO','Campeonato em andamento.');}else pa31AtualizarTmChampStatus_(champ,'FINALIZADO','Campeonato finalizado. Ranking consolidado.');}
  }else{
    if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');
    r[7]=JSON.stringify(analysis.scores);r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]='';r[11]='EM_ANDAMENTO';r[12]=r[12]||agora;r[13]='';pa31AtualizarTmChampStatus_(champ,'EM_ANDAMENTO','Campeonato em andamento.');
  }
  s.getRange(2,1,rows.length,TM_HEADERS.JOGOS.length).setValues(rows);tmAtualizarRanking_(champ.id);pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar corrigido.':'Partida encerrada automaticamente.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,analysis:analysis,state:tmObterEstado_(true)};
}

function pa31SalvarTmAvulso_(id,payload){
  const s=aba_(FLEX_V023.TM_AVULSOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,FLEX_V023.TM_HEADERS.length).getValues():[],i=rows.findIndex(r=>texto_(r[0])===texto_(id));if(i<0)throw Error('Jogo avulso não encontrado.');
  const r=rows[i],status=texto_(r[3]).toUpperCase();if(['LIBERADO','EM_ANDAMENTO','FINALIZADO'].indexOf(status)<0)throw Error('Este jogo ainda não está liberado.');
  const analysis=pa31AnalisarParcial_(payload,r[14],r[15],r[15],r[16],true),wasFinal=status==='FINALIZADO',oldWinner=texto_(r[11]),newWinner=analysis.matchComplete?(analysis.winnerSide===1?texto_(r[4]):texto_(r[6])):'',agora=new Date();
  if(wasFinal&&oldWinner&&newWinner&&oldWinner!==newWinner){
    const grupo=texto_(r[1]),ordem=numero_(r[2]),posterior=rows.some((x,index)=>index!==i&&texto_(x[1])===grupo&&numero_(x[2])>ordem);
    if(posterior)throw Error('O vencedor não pode ser alterado porque o jogo seguinte da sequência já foi criado. Corrija apenas a pontuação sem trocar o vencedor.');
  }
  if(analysis.matchComplete){r[3]='FINALIZADO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]=newWinner;r[12]=r[12]||agora;r[13]=r[13]||agora;}
  else{if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');r[3]='EM_ANDAMENTO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]='';r[12]=r[12]||agora;r[13]='';}
  s.getRange(i+2,1,1,r.length).setValues([r]);pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar avulso corrigido.':'Jogo encerrado automaticamente. O vencedor permanece.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,analysis:analysis,state:tmObterEstado_(true)};
}
