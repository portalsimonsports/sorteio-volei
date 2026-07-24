/** PLACAR AUTOMÁTICO, CORREÇÃO SEGURA E ESTADO RÁPIDO — V031 */

const PA31_CACHE=Object.freeze({TM_PUBLIC:'TM_PUBLIC_V031'});

function pa31Payload_(valor){
  if(valor&&typeof valor==='object'&&!Array.isArray(valor))return valor;
  const s=texto_(valor);
  if(!s)return{};
  try{return JSON.parse(s)||{};}catch(ignore){return{};}
}
function pa31Scores_(valor){
  if(Array.isArray(valor))return valor;
  const o=pa31Payload_(valor);
  if(Array.isArray(o.scores))return o.scores;
  if(Array.isArray(o.placar))return o.placar;
  const s=texto_(valor);
  if(!s)return[];
  try{const x=JSON.parse(s);return Array.isArray(x)?x:[];}catch(ignore){return[];}
}
function pa31AnalisarParcial_(raw,bestOf,normalPoints,tiebreakPoints,minimumLead,mesmoAlvo){
  bestOf=Math.max(1,numero_(bestOf));normalPoints=Math.max(1,numero_(normalPoints));tiebreakPoints=Math.max(1,numero_(tiebreakPoints||normalPoints));minimumLead=Math.max(1,numero_(minimumLead));
  const needed=Math.floor(bestOf/2)+1,scores=pa31Scores_(raw),normalizados=[],completos=[];
  let sets1=0,sets2=0,partidaCompleta=false,winnerSide=0;
  for(let i=0;i<bestOf;i++){
    const par=Array.isArray(scores[i])?scores[i]:[null,null];
    const va=par[0],vb=par[1],a=va===''||va==null?null:Number(va),b=vb===''||vb==null?null:Number(vb);
    if(a!=null&&(!Number.isInteger(a)||a<0))throw Error('A pontuação deve usar números inteiros não negativos.');
    if(b!=null&&(!Number.isInteger(b)||b<0))throw Error('A pontuação deve usar números inteiros não negativos.');
    if(partidaCompleta){
      if((a!=null&&a!==0)||(b!=null&&b!==0))throw Error('Remova a pontuação dos sets posteriores ao encerramento da partida.');
      normalizados.push([null,null]);completos.push(false);continue;
    }
    normalizados.push([a,b]);
    if(a==null||b==null){completos.push(false);continue;}
    const alvo=mesmoAlvo?normalPoints:(bestOf>1&&i===bestOf-1?tiebreakPoints:normalPoints);
    const completo=a!==b&&Math.max(a,b)>=alvo&&Math.abs(a-b)>=minimumLead;
    completos.push(completo);
    if(completo){
      if(a>b)sets1++;else sets2++;
      if(sets1>=needed||sets2>=needed){partidaCompleta=true;winnerSide=sets1>sets2?1:2;}
    }else{
      for(let j=i+1;j<scores.length;j++){
        const depois=scores[j];
        if(Array.isArray(depois)&&depois.some(v=>v!==''&&v!=null&&Number(v)!==0))throw Error('Finalize o set atual antes de preencher o seguinte.');
      }
      break;
    }
  }
  return{scores:normalizados,completedSets:completos,sets1:sets1,sets2:sets2,needed:needed,matchComplete:partidaCompleta,winnerSide:winnerSide};
}
function pa31LimparCacheTm_(){try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}}
function pa31EscreverParcialVolei_(sheet,rowIndex,row,analise){
  const tres=[analise.scores[0]||[null,null],analise.scores[1]||[null,null],analise.scores[2]||[null,null]];
  const inicio=row[22]||new Date(),status=texto_(row[16])==='FINALIZADO'?'FINALIZADO':'EM_DISPUTA';
  sheet.getRange(rowIndex,8,1,6).setValues([[tres[0][0]==null?'':tres[0][0],tres[0][1]==null?'':tres[0][1],tres[1][0]==null?'':tres[1][0],tres[1][1]==null?'':tres[1][1],tres[2][0]==null?'':tres[2][0],tres[2][1]==null?'':tres[2][1]]]);
  sheet.getRange(rowIndex,14,1,5).setValues([[analise.sets1,analise.sets2,texto_(row[15]),status,row[17]||'']]);
  sheet.getRange(rowIndex,23,1,2).setValues([[inicio,JSON.stringify(analise.scores)]]);
}
function pa31DependenciaVolei_(dados,row){
  const deps=[],proximo=numero_(row[20]);
  if(proximo){const i=dados.findIndex(x=>numero_(x[1])===proximo);if(i>=0)deps.push({index:i,slot:numero_(row[21])||1,type:'WINNER'});}
  const fase=texto_(row[2]).toUpperCase();
  if(fase==='FASE INICIAL'){
    const iniciais=dados.map((x,i)=>({x:x,i:i})).filter(z=>texto_(z.x[2]).toUpperCase()==='FASE INICIAL').sort((a,b)=>numero_(a.x[1])-numero_(b.x[1]));
    const pos=iniciais.findIndex(z=>numero_(z.x[1])===numero_(row[1])),ri=dados.findIndex(x=>texto_(x[2]).toUpperCase()==='REPESCAGEM');
    if(pos>=0&&ri>=0)deps.push({index:ri,slot:pos===0?1:2,type:'LOSER'});
  }
  if(fase==='SEMIFINAL'){
    const semis=dados.map((x,i)=>({x:x,i:i})).filter(z=>texto_(z.x[2]).toUpperCase()==='SEMIFINAL').sort((a,b)=>numero_(a.x[1])-numero_(b.x[1]));
    const pos=semis.findIndex(z=>numero_(z.x[1])===numero_(row[1])),ti=dados.findIndex(x=>texto_(x[2]).toUpperCase()==='DISPUTA DE 3º LUGAR');
    if(pos>=0&&ti>=0)deps.push({index:ti,slot:pos===0?1:2,type:'LOSER'});
  }
  return deps;
}
function pa31CorrigirVolei_(jogo,payload){
  const resultado=validarPlacar_(payload),s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();
  if(l<2)throw Error('Nenhum jogo foi gerado.');
  const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===numero_(jogo));
  if(i<0)throw Error('Jogo não encontrado.');
  const r=dados[i],oldWinner=texto_(r[15]),newWinner=resultado.winnerSide===1?texto_(r[3]):texto_(r[5]),newLoser=resultado.winnerSide===1?texto_(r[5]):texto_(r[3]);
  if(texto_(r[16])!=='FINALIZADO')return registrarResultado_(jogo,payload);
  const deps=pa31DependenciaVolei_(dados,r);
  if(oldWinner!==newWinner){
    deps.forEach(dep=>{
      const dr=dados[dep.index],started=dr[22]||dr[17]||['EM_DISPUTA','FINALIZADO'].indexOf(texto_(dr[16]))>=0;
      if(started)throw Error('O vencedor não pode ser alterado porque uma partida dependente já foi iniciada.');
    });
  }
  const tres=[resultado.scores[0]||[null,null],resultado.scores[1]||[null,null],resultado.scores[2]||[null,null]],agora=new Date();
  s.getRange(i+2,8,1,11).setValues([[tres[0][0]==null?'':tres[0][0],tres[0][1]==null?'':tres[0][1],tres[1][0]==null?'':tres[1][0],tres[1][1]==null?'':tres[1][1],tres[2][0]==null?'':tres[2][0],tres[2][1]==null?'':tres[2][1],resultado.sets1,resultado.sets2,newWinner,'FINALIZADO',r[17]||agora]]);
  s.getRange(i+2,23,1,2).setValues([[r[22]||agora,JSON.stringify(resultado.scores)]]);
  if(oldWinner!==newWinner){
    const equipes=lerEquipes_(),winnerTeam=equipes.find(e=>e.id===newWinner),loserTeam=equipes.find(e=>e.id===newLoser);
    deps.forEach(dep=>{const team=dep.type==='WINNER'?winnerTeam:loserTeam;if(!team)return;const col=dep.slot===1?4:6;s.getRange(dep.index+2,col,1,2).setValues([[team.id,nomeEquipe_(team)]]);});
  }
  if(texto_(r[2]).toUpperCase()==='FINAL'){
    const torneio=ultimoSorteio_();if(torneio)aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,14).setValue(newWinner);
    try{atualizarCampeonatoFinalizado_();}catch(ignore){}
  }
  try{atualizarIndicesHistoricos_();}catch(ignore){}
  log_('PLACAR_CORRIGIDO',texto_(r[0]),'PAINEL_WEB','ADMIN','Jogo '+jogo+' | vencedor '+newWinner,'INFO',String(jogo));
  return{message:'Placar corrigido e classificação atualizada.',corrected:true,state:obterEstadoAdmin_()};
}
function salvarPlacarAutomaticoVolei_(jogo,payload){
  jogo=numero_(jogo);if(!jogo)throw Error('Selecione uma partida.');
  const p=pa31Payload_(payload),scores=Array.isArray(p.scores)?p.scores:pa31Scores_(payload),regras=regrasPartida_(),analise=pa31AnalisarParcial_(scores,regras.bestOf,regras.normalSetPoints,regras.tiebreakSetPoints,regras.minimumLead,false);
  const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Nenhum jogo foi gerado.');
  const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
  const r=dados[i];if(!r[3]||!r[5])throw Error('As equipes desta partida ainda não foram definidas.');
  if(analise.matchComplete){const completo=JSON.stringify({scores:analise.scores});return texto_(r[16])==='FINALIZADO'?pa31CorrigirVolei_(jogo,completo):registrarResultado_(jogo,completo);}
  if(texto_(r[16])==='FINALIZADO')throw Error('A correção precisa manter um resultado completo. Ajuste o placar até existir um vencedor.');
  pa31EscreverParcialVolei_(s,i+2,r,analise);
  return{message:'Placar parcial salvo automaticamente.',partial:true,analysis:analise,state:obterEstadoAdmin_()};
}

/* ---------- TÊNIS: leitura rápida em uma única abertura ---------- */
function pa31Rows_(sheet,width){if(!sheet)return[];const l=sheet.getLastRow();return l<2?[]:sheet.getRange(2,1,l-1,width).getValues();}
function pa31TmData_(){
  const book=ss_(),sh={};Object.keys(TM_SHEETS).forEach(k=>sh[k]=book.getSheetByName(TM_SHEETS[k]));sh.AVULSOS=book.getSheetByName(FLEX_V023.TM_AVULSOS);
  return{players:pa31Rows_(sh.JOGADORES,TM_HEADERS.JOGADORES.length),championships:pa31Rows_(sh.CAMPEONATOS,TM_HEADERS.CAMPEONATOS.length),participants:pa31Rows_(sh.PARTICIPANTES,TM_HEADERS.PARTICIPANTES.length),games:pa31Rows_(sh.JOGOS,TM_HEADERS.JOGOS.length),ranking:pa31Rows_(sh.RANKING,TM_HEADERS.RANKING.length),free:pa31Rows_(sh.AVULSOS,FLEX_V023.TM_HEADERS.length)};
}
function pa31TmPlayer_(r){return{id:texto_(r[0]),name:texto_(r[1]),age:numero_(r[2]),sex:tmNormalizarSexo_(r[3]),active:texto_(r[4]||'SIM').toUpperCase(),createdAt:r[5],observation:texto_(r[6])};}
function pa31TmChamp_(r){return{id:texto_(r[0]),name:texto_(r[1]),status:texto_(r[2]),bestOf:numero_(r[3]),setPoints:numero_(r[4]),minimumLead:numero_(r[5]),winPoints:numero_(r[6]),lossPoints:numero_(r[7]),maxGamesPerPlayer:numero_(r[8]),maxTotalGames:numero_(r[9]),turns:numero_(r[10]),autoStart:texto_(r[11]||'SIM').toUpperCase(),createdAt:r[12],startedAt:r[13],finishedAt:r[14],participantCount:numero_(r[15]),message:texto_(r[16])};}
function pa31TmGame_(r){return{championshipId:texto_(r[0]),game:numero_(r[1]),round:numero_(r[2]),player1Id:texto_(r[3]),player1:texto_(r[4]),player2Id:texto_(r[5]),player2:texto_(r[6]),scores:flexJson_(r[7],[]),sets1:numero_(r[8]),sets2:numero_(r[9]),winnerId:texto_(r[10]),status:texto_(r[11]),startedAt:r[12],finishedAt:r[13]};}
function pa31TmFree_(r){return{id:texto_(r[0]),groupId:texto_(r[1]),order:numero_(r[2]),status:texto_(r[3]),player1Id:texto_(r[4]),player1:texto_(r[5]),player2Id:texto_(r[6]),player2:texto_(r[7]),scores:flexJson_(r[8],[]),sets1:numero_(r[9]),sets2:numero_(r[10]),winnerId:texto_(r[11]),startedAt:r[12],finishedAt:r[13],bestOf:numero_(r[14]),setPoints:numero_(r[15]),minimumLead:numero_(r[16]),winPoints:numero_(r[17]),lossPoints:numero_(r[18]),createdAt:r[19]};}
function pa31TmRankGlobal_(players,champs,games,free){
  const stats={};players.forEach(p=>stats[p.id]={id:p.id,name:p.name,games:0,wins:0,losses:0,points:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0});
  const cmap={};champs.forEach(c=>cmap[c.id]=c);
  function apply(id,won,sf,sa,pf,pa,pts){const x=stats[id];if(!x)return;x.games++;if(won)x.wins++;else x.losses++;x.points+=numero_(pts);x.setsFor+=sf;x.setsAgainst+=sa;x.pointsFor+=pf;x.pointsAgainst+=pa;}
  games.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const c=cmap[g.championshipId]||{winPoints:3,lossPoints:0},p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);apply(g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?c.winPoints:c.lossPoints);apply(g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?c.winPoints:c.lossPoints);});
  free.filter(g=>g.status==='FINALIZADO'&&g.winnerId).forEach(g=>{const p1=g.scores.reduce((t,s)=>t+numero_(s[0]),0),p2=g.scores.reduce((t,s)=>t+numero_(s[1]),0);apply(g.player1Id,g.winnerId===g.player1Id,g.sets1,g.sets2,p1,p2,g.winnerId===g.player1Id?g.winPoints:g.lossPoints);apply(g.player2Id,g.winnerId===g.player2Id,g.sets2,g.sets1,p2,p1,g.winnerId===g.player2Id?g.winPoints:g.lossPoints);});
  return Object.keys(stats).map(id=>{const x=stats[id];x.winRate=x.games?Math.round(x.wins*1000/x.games)/10:0;x.setDiff=x.setsFor-x.setsAgainst;x.pointDiff=x.pointsFor-x.pointsAgainst;return x;});
}
function pa31TmEstadoRapido_(admin){
  const cache=CacheService.getScriptCache();if(!admin){const cached=cache.get(PA31_CACHE.TM_PUBLIC);if(cached){try{return JSON.parse(cached);}catch(ignore){}}}
  const data=pa31TmData_(),players=data.players.filter(r=>r[0]||r[1]).map(pa31TmPlayer_),champs=data.championships.filter(r=>r[0]).map(pa31TmChamp_),activeId=texto_(props_().getProperty('TM_CAMPEONATO_ATIVO')),champ=champs.find(c=>c.id===activeId)||champs[champs.length-1]||null;
  const participants=champ?data.participants.filter(r=>texto_(r[0])===champ.id).map(r=>({championshipId:texto_(r[0]),id:texto_(r[1]),name:texto_(r[2]),order:numero_(r[3]),selectedAt:r[4]})).sort((a,b)=>a.order-b.order):[];
  const games=data.games.filter(r=>!champ||texto_(r[0])===champ.id).map(pa31TmGame_).sort((a,b)=>a.game-b.game);
  const rank=champ?data.ranking.filter(r=>texto_(r[0])===champ.id).map(r=>({championshipId:texto_(r[0]),position:numero_(r[1]),id:texto_(r[2]),name:texto_(r[3]),games:numero_(r[4]),wins:numero_(r[5]),losses:numero_(r[6]),winRate:numero_(r[7]),points:numero_(r[8]),setsFor:numero_(r[9]),setsAgainst:numero_(r[10]),setDiff:numero_(r[11]),pointsFor:numero_(r[12]),pointsAgainst:numero_(r[13]),pointDiff:numero_(r[14]),updatedAt:r[15]})).sort((a,b)=>a.position-b.position):[];
  const free=data.free.filter(r=>r[0]).map(pa31TmFree_).sort((a,b)=>b.order-a.order),open=free.find(g=>g.status!=='FINALIZADO')||null,last=free.find(g=>g.status==='FINALIZADO'&&g.winnerId)||null;
  let winnerId='',winnerName='',loserId='',loserName='';if(last){winnerId=last.winnerId;if(winnerId===last.player1Id){winnerName=last.player1;loserId=last.player2Id;loserName=last.player2;}else{winnerName=last.player2;loserId=last.player1Id;loserName=last.player1;}}
  const allGames=data.games.map(pa31TmGame_),base=pa31TmRankGlobal_(players,champs,allGames,free),estado={version:'TM_V031',sport:'TENIS_DE_MESA',serverTime:new Date(),championship:champ,participants:participants,matches:games,ranking:rank,globalRankingPoints:flexOrdenarRanking_(base,'PONTOS'),globalRankingWinRate:flexOrdenarRanking_(base,'APROVEITAMENTO'),championshipEditable:champ?!games.some(g=>g.startedAt||g.finishedAt||['EM_ANDAMENTO','FINALIZADO'].indexOf(g.status)>=0):false,registrationOpen:true,freeCurrentWinnerId:winnerId,freeCurrentWinnerName:winnerName,freeLastLoserId:loserId,freeLastLoserName:loserName,freeOpenMatch:open};
  if(admin){estado.players=players;estado.championships=champs.slice().reverse();estado.freeMatches=free;}
  if(!admin)try{cache.put(PA31_CACHE.TM_PUBLIC,JSON.stringify(estado),20);}catch(ignore){}
  return estado;
}
function tmObterEstado_(admin){return pa31TmEstadoRapido_(!!admin);}function tmObterEstadoPublico_(){return pa31TmEstadoRapido_(false);}function tmObterEstadoAdmin_(){return pa31TmEstadoRapido_(true);}
function pa31AtualizarTmChampStatus_(champ,status,message){if(!champ)return;champ.status=status;champ.message=message||champ.message;if(status==='EM_ANDAMENTO'&&!champ.startedAt)champ.startedAt=new Date();if(status==='FINALIZADO'&&!champ.finishedAt)champ.finishedAt=new Date();tmAtualizarCampeonato_(champ);}
function pa31SalvarTmCampeonato_(game,payload){
  const champ=tmCampeonatoAtivo_();if(!champ)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
  const s=aba_(TM_SHEETS.JOGOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,TM_HEADERS.JOGOS.length).getValues():[],i=rows.findIndex(r=>texto_(r[0])===champ.id&&numero_(r[1])===numero_(game));if(i<0)throw Error('Partida não encontrada.');
  const r=rows[i],analysis=pa31AnalisarParcial_(payload,champ.bestOf,champ.setPoints,champ.setPoints,champ.minimumLead,true),wasFinal=texto_(r[11])==='FINALIZADO',agora=new Date();
  if(analysis.matchComplete){
    r[7]=JSON.stringify(analysis.scores.filter((x,index)=>index<champ.bestOf));r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]=analysis.winnerSide===1?texto_(r[3]):texto_(r[5]);r[11]='FINALIZADO';r[12]=r[12]||agora;r[13]=r[13]||agora;
    if(!wasFinal){const pending=rows.filter((x,index)=>index!==i&&texto_(x[0])===champ.id&&texto_(x[11])!=='FINALIZADO').sort((a,b)=>numero_(a[1])-numero_(b[1]));if(pending.length){const next=pending[0];next[11]=champ.autoStart==='SIM'?'EM_ANDAMENTO':'LIBERADO';if(champ.autoStart==='SIM')next[12]=agora;pa31AtualizarTmChampStatus_(champ,'EM_ANDAMENTO','Campeonato em andamento.');}else pa31AtualizarTmChampStatus_(champ,'FINALIZADO','Campeonato finalizado. Ranking consolidado.');}
  }else{if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');r[7]=JSON.stringify(analysis.scores);r[8]=analysis.sets1;r[9]=analysis.sets2;r[10]='';r[11]='EM_ANDAMENTO';r[12]=r[12]||agora;r[13]='';pa31AtualizarTmChampStatus_(champ,'EM_ANDAMENTO','Campeonato em andamento.');}
  s.getRange(2,1,rows.length,TM_HEADERS.JOGOS.length).setValues(rows);tmAtualizarRanking_(champ.id);pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar corrigido.':'Partida encerrada automaticamente.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,analysis:analysis,state:tmObterEstado_(true)};
}
function pa31SalvarTmAvulso_(id,payload){
  const s=aba_(FLEX_V023.TM_AVULSOS),l=s.getLastRow(),rows=l>=2?s.getRange(2,1,l-1,FLEX_V023.TM_HEADERS.length).getValues():[],i=rows.findIndex(r=>texto_(r[0])===texto_(id));if(i<0)throw Error('Jogo avulso não encontrado.');
  const r=rows[i],analysis=pa31AnalisarParcial_(payload,r[14],r[15],r[15],r[16],true),wasFinal=texto_(r[3])==='FINALIZADO',agora=new Date();
  if(analysis.matchComplete){r[3]='FINALIZADO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]=analysis.winnerSide===1?texto_(r[4]):texto_(r[6]);r[12]=r[12]||agora;r[13]=r[13]||agora;}
  else{if(wasFinal)throw Error('A correção precisa manter um vencedor definido.');r[3]='EM_ANDAMENTO';r[8]=JSON.stringify(analysis.scores);r[9]=analysis.sets1;r[10]=analysis.sets2;r[11]='';r[12]=r[12]||agora;r[13]='';}
  s.getRange(i+2,1,1,r.length).setValues([r]);pa31LimparCacheTm_();
  return{message:analysis.matchComplete?(wasFinal?'Placar avulso corrigido.':'Jogo encerrado automaticamente. O vencedor permanece.'):'Placar parcial salvo automaticamente.',partial:!analysis.matchComplete,analysis:analysis,state:tmObterEstado_(true)};
}
function salvarPlacarAutomaticoTenis_(p){const tipo=texto_(p.tipo||'CAMPEONATO').toUpperCase(),payload=p.placar||p.scores||p.payload;return tipo==='AVULSO'?pa31SalvarTmAvulso_(p.id,payload):pa31SalvarTmCampeonato_(p.jogo,payload);}

/** Roteador V031: mantém todas as ações anteriores e acrescenta o placar automático. */
function executarApi_(p){
 try{
  const a=texto_(p.acao||'estado');let d;
  switch(a){
   case'estado':d=obterEstadoPublico_();break;
   case'admin':exigirAdmin_(p.chave);d=obterEstadoAdmin_();break;
   case'inscrever':d=inscreverParticipante_(p);break;
   case'salvarJogador':exigirAdmin_(p.chave);d=salvarParticipante_(p,true);break;
   case'excluirJogador':exigirAdmin_(p.chave);d=excluirParticipante_(p.id);break;
   case'sortearAgora':exigirAdmin_(p.chave);d=realizarSorteioAgora_('PAINEL_WEB');break;
   case'iniciarContagem':exigirAdmin_(p.chave);d=iniciarContagemDireta_(p.segundos);break;
   case'gerarCodigo':exigirAdmin_(p.chave);d=gerarCodigoAtivacao_();break;
   case'ativar':d=ativarSorteio_(p.codigo,p.origem||'SITE');break;
   case'cancelar':exigirAdmin_(p.chave);d=cancelarSorteio_('PAINEL_WEB');break;
   case'salvarRegras':exigirAdmin_(p.chave);d=salvarRegrasPartida_(p);break;
   case'iniciarPartida':exigirAdmin_(p.chave);d=iniciarPartida_(p.jogo);break;
   case'registrarResultado':exigirAdmin_(p.chave);d=registrarResultado_(p.jogo,p.payload||p.vencedorId);break;
   case'salvarPlacarAutomatico':exigirAdmin_(p.chave);d=salvarPlacarAutomaticoVolei_(p.jogo,p.payload||p.placar||p.scores);break;
   case'listarCampeonatos':exigirAdmin_(p.chave);d=listarCampeonatos_();break;
   case'novoCampeonato':exigirAdmin_(p.chave);d=novoCampeonato_(p);break;
   case'abrirCampeonato':exigirAdmin_(p.chave);d=abrirCampeonato_(p.id);break;
   case'arquivarCampeonato':exigirAdmin_(p.chave);d=arquivarCampeonatoAtual_(p.nome||'',true);break;
   case'atualizarIndices':exigirAdmin_(p.chave);d={message:'Índices históricos atualizados.',players:atualizarIndicesHistoricos_(),state:obterEstadoAdmin_()};break;
   case'resetar':exigirAdmin_(p.chave);d=resetarSorteio_();break;
   case'limparTudo':exigirAdmin_(p.chave);d=limparTudo_();break;
   case'diagnostico':exigirAdmin_(p.chave);d=DIAGNOSTICO_SISTEMA();break;
   case'tmEstado':d=tmObterEstadoPublico_();break;
   case'tmInscrever':d=tmInscreverJogador_(p);break;
   case'tmAdmin':exigirAdmin_(p.chave);d=tmObterEstadoAdmin_();break;
   case'tmSalvarJogador':exigirAdmin_(p.chave);d=tmSalvarJogador_(p,true);pa31LimparCacheTm_();break;
   case'tmExcluirJogador':exigirAdmin_(p.chave);d=tmExcluirJogador_(p.id);pa31LimparCacheTm_();break;
   case'tmCriarCampeonato':exigirAdmin_(p.chave);d=tmCriarCampeonato_(p);pa31LimparCacheTm_();break;
   case'tmIniciarPartida':exigirAdmin_(p.chave);d=tmIniciarPartida_(p.jogo);pa31LimparCacheTm_();break;
   case'tmRegistrarResultado':exigirAdmin_(p.chave);d=tmRegistrarResultado_(p.jogo,p);pa31LimparCacheTm_();break;
   case'tmSalvarPlacarAutomatico':exigirAdmin_(p.chave);d=salvarPlacarAutomaticoTenis_(p);break;
   case'tmAbrirCampeonato':exigirAdmin_(p.chave);d=tmAbrirCampeonato_(p.id);pa31LimparCacheTm_();break;
   default:throw Error('Ação inválida: '+a);
  }
  return responder_({ok:true,dados:d,versao:'V031',dataHora:formatarData_(new Date())},p.callback);
 }catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V031',dataHora:formatarData_(new Date())},p.callback);}
}
