/** SEQUÊNCIA AVULSA DO TÊNIS: VENCEDOR PERMANECE — V024 */
function flexTmSequenciaAvulsaV024_(){
 const jogos=flexTmLerAvulsos_(),aberto=jogos.find(j=>j.status!=='FINALIZADO')||null,ultimo=jogos.find(j=>j.status==='FINALIZADO'&&j.winnerId)||null;
 let vencedorId='',perdedorId='',vencedorNome='',perdedorNome='';
 if(ultimo){vencedorId=ultimo.winnerId;if(vencedorId===ultimo.player1Id){perdedorId=ultimo.player2Id;vencedorNome=ultimo.player1;perdedorNome=ultimo.player2;}else{perdedorId=ultimo.player1Id;vencedorNome=ultimo.player2;perdedorNome=ultimo.player1;}}
 return{matches:jogos,openMatch:aberto,currentWinnerId:vencedorId,currentWinnerName:vencedorNome,lastLoserId:perdedorId,lastLoserName:perdedorNome,lastFinished:ultimo};
}
function flexTmCriarAvulsos_(p){
 flexGarantirEstruturaV023_();const sequencia=flexTmSequenciaAvulsaV024_();if(sequencia.openMatch)throw Error('Finalize o jogo avulso atual antes de criar o próximo.');
 const mapa={};tmLerJogadores_().forEach(j=>mapa[j.id]=j);let id1=texto_(p.jogador1||p.player1Id),id2=texto_(p.jogador2||p.player2Id);
 if(sequencia.currentWinnerId){const desafiante=id2&&id2!==sequencia.currentWinnerId?id2:(id1&&id1!==sequencia.currentWinnerId?id1:sequencia.lastLoserId);id1=sequencia.currentWinnerId;id2=desafiante;}
 if(!mapa[id1]||!mapa[id2]||id1===id2)throw Error('Selecione dois participantes diferentes.');
 const cfg=flexTmConfig_(p),anteriores=sequencia.matches,grupo=anteriores.length?(anteriores[0].groupId||gerarId_('TMAVLGR')):gerarId_('TMAVLGR'),ordem=anteriores.reduce((m,j)=>Math.max(m,numero_(j.order)),0)+1,agora=new Date();
 aba_(FLEX_V023.TM_AVULSOS).appendRow([gerarId_('TMAVL'),grupo,ordem,'LIBERADO',id1,mapa[id1].name,id2,mapa[id2].name,'[]',0,0,'','','',cfg.bestOf,cfg.setPoints,cfg.minimumLead,cfg.winPoints,cfg.lossPoints,agora]);
 return{message:sequencia.currentWinnerId?'Novo jogo criado. O vencedor anterior permanece e enfrenta o desafiante selecionado.':'Primeiro jogo avulso criado.',state:tmObterEstado_(true)};
}
function flexTmAtualizarAvulso_(id,iniciar,p){
 const s=aba_(FLEX_V023.TM_AVULSOS),l=s.getLastRow();if(l<2)throw Error('Jogo avulso não encontrado.');
 const d=s.getRange(2,1,l-1,FLEX_V023.TM_HEADERS.length).getValues(),i=d.findIndex(r=>texto_(r[0])===id);if(i<0)throw Error('Jogo avulso não encontrado.');
 const r=d[i],agora=new Date();if(texto_(r[3])==='FINALIZADO')throw Error('Este jogo avulso já foi finalizado.');
 if(iniciar){r[3]='EM_ANDAMENTO';r[12]=r[12]||agora;}else{const res=flexValidarPlacar_(tmPlacarParametro_(p||{}),r[14],r[15],r[15],r[16],true);r[3]='FINALIZADO';r[8]=JSON.stringify(res.scores);r[9]=res.sets1;r[10]=res.sets2;r[11]=res.winnerSide===1?texto_(r[4]):texto_(r[6]);r[12]=r[12]||agora;r[13]=agora;}
 s.getRange(i+2,1,1,r.length).setValues([r]);
 return{message:iniciar?'Jogo avulso iniciado.':'Resultado salvo. O vencedor permanecerá selecionado para o próximo jogo.',state:tmObterEstado_(true)};
}
function tmObterEstado_(admin){
 tmGarantirEstrutura_();flexGarantirEstruturaV023_();const campeonato=tmCampeonatoAtivo_(),base=flexTmRankingGlobal_(),sequencia=flexTmSequenciaAvulsaV024_(),estado={version:'TM_V024_2026-07-23',sport:'TENIS_DE_MESA',serverTime:new Date(),championship:campeonato,participants:campeonato?tmLerParticipantesCampeonato_(campeonato.id):[],matches:campeonato?tmLerJogos_(campeonato.id):[],ranking:campeonato?tmLerRanking_(campeonato.id):[],globalRankingPoints:flexOrdenarRanking_(base,'PONTOS'),globalRankingWinRate:flexOrdenarRanking_(base,'APROVEITAMENTO'),championshipEditable:campeonato?flexTmNaoIniciado_(campeonato.id):false,registrationOpen:true,freeCurrentWinnerId:sequencia.currentWinnerId,freeCurrentWinnerName:sequencia.currentWinnerName,freeLastLoserId:sequencia.lastLoserId,freeLastLoserName:sequencia.lastLoserName,freeOpenMatch:sequencia.openMatch};
 if(admin){estado.players=tmLerJogadores_();estado.championships=tmLerCampeonatos_().slice().reverse();estado.freeMatches=sequencia.matches;}
 return estado;
}
