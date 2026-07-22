/** Construção do chaveamento eliminatório compacto com disputa de 3º lugar */
function embaralharDeterministico_(lista,seed){const a=lista.slice();let e=parseInt(hash_(seed).slice(0,8),16)>>>0;function r(){e+=0x6D2B79F5;let t=e;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),x=a[i];a[i]=a[j];a[j]=x;}return a;}
function maiorPotenciaDoisAte_(n){let p=1;while(p*2<=n)p*=2;return Math.max(2,p);}
function nomeFasePorQuantidade_(n){if(n===2)return'FINAL';if(n===4)return'SEMIFINAL';if(n===8)return'QUARTAS DE FINAL';if(n===16)return'OITAVAS DE FINAL';return'FASE DE '+n;}
function todosJogos_(rounds){const jogos=[];rounds.forEach(r=>r.matches.forEach(m=>jogos.push(m)));return jogos;}
function atribuirVencedorMemoria_(rounds,match){if(!match.nextGame||!match.winnerId)return;let next=null;todosJogos_(rounds).some(m=>{if(m.game===match.nextGame){next=m;return true;}return false;});if(!next)return;const team=match.team1&&match.team1.id===match.winnerId?match.team1:match.team2;if(match.nextSlot===1)next.team1=team;else next.team2=team;}
function placarVazio_(){const quantidade=regrasPartida_().bestOf,sets=[];for(let i=0;i<quantidade;i++)sets.push([null,null]);return sets;}
function criarJogoCompacto_(game,roundIndex,phase){return{game:game,roundIndex:roundIndex,phase:phase,team1:null,team2:null,team1Placeholder:'',team2Placeholder:'',scores:placarVazio_(),sets1:0,sets2:0,winnerId:'',status:'AGUARDANDO',finishedAt:'',availableAt:'',startedAt:'',nextGame:0,nextSlot:0};}
function criarRodadasPrincipais_(quantidade,inicioIndice,inicioJogo){const rounds=[];let times=quantidade,indice=inicioIndice,jogo=inicioJogo;while(times>=2){const fase=nomeFasePorQuantidade_(times),matches=[];for(let i=0;i<times/2;i++)matches.push(criarJogoCompacto_(jogo++,indice,fase));rounds.push({index:indice,name:fase,matches:matches});times/=2;indice++;}return{rounds:rounds,nextGame:jogo};}
function atribuirEntradaCompacta_(match,slot,entrada){const teamKey=slot===1?'team1':'team2',placeholderKey=slot===1?'team1Placeholder':'team2Placeholder';if(entrada.team){match[teamKey]=entrada.team;return;}match[placeholderKey]='Vencedor Jogo '+entrada.source.game;entrada.source.nextGame=match.game;entrada.source.nextSlot=slot;}
function linkarRodadasCompactas_(rounds,inicio){for(let r=inicio;r<rounds.length-1;r++)rounds[r].matches.forEach((m,i)=>{const next=rounds[r+1].matches[Math.floor(i/2)];m.nextGame=next.game;m.nextSlot=i%2===0?1:2;if(i%2===0&&!next.team1)next.team1Placeholder='Vencedor Jogo '+m.game;if(i%2===1&&!next.team2)next.team2Placeholder='Vencedor Jogo '+m.game;});}
function montarChaveamento_(equipes,seed){
 seed=texto_(seed)||'CHAVEAMENTO';
 const sorteadas=embaralharDeterministico_(equipes,seed);
 if(sorteadas.length<2)throw Error('São necessárias pelo menos duas duplas.');
 const base=maiorPotenciaDoisAte_(sorteadas.length),quantidadePreliminar=sorteadas.length-base,quantidadeTimesPreliminar=quantidadePreliminar*2;
 const timesPreliminares=sorteadas.slice(0,quantidadeTimesPreliminar),timesDiretos=sorteadas.slice(quantidadeTimesPreliminar),rounds=[];
 let game=1,rodadaPreliminar=null;
 if(quantidadePreliminar>0){
  const fasePreliminar=sorteadas.length===7?'QUARTAS DE FINAL':'FASE PRELIMINAR';
  rodadaPreliminar={index:0,name:fasePreliminar,matches:[]};
  for(let i=0;i<quantidadePreliminar;i++){const m=criarJogoCompacto_(game++,0,fasePreliminar);m.team1=timesPreliminares[i*2];m.team2=timesPreliminares[i*2+1];rodadaPreliminar.matches.push(m);}
  rounds.push(rodadaPreliminar);
 }
 const principal=criarRodadasPrincipais_(base,quantidadePreliminar>0?1:0,game);principal.rounds.forEach(r=>rounds.push(r));game=principal.nextGame;
 const primeiraPrincipal=principal.rounds[0];
 if(quantidadePreliminar>0){
  const entradas=[];timesDiretos.forEach(team=>entradas.push({team:team}));rodadaPreliminar.matches.forEach(source=>entradas.push({source:source}));
  const ordem=embaralharDeterministico_(entradas,seed+'|ENTRANTES_PRINCIPAIS');
  primeiraPrincipal.matches.forEach((m,i)=>{atribuirEntradaCompacta_(m,1,ordem[i*2]);atribuirEntradaCompacta_(m,2,ordem[i*2+1]);});
  linkarRodadasCompactas_(rounds,1);
 }else{
  primeiraPrincipal.matches.forEach((m,i)=>{m.team1=sorteadas[i*2];m.team2=sorteadas[i*2+1];});
  linkarRodadasCompactas_(rounds,0);
 }
 let semis=null,finalRound=null;
 rounds.forEach(r=>{if(r.matches.some(m=>texto_(m.phase).toUpperCase()==='SEMIFINAL'))semis=r;if(r.matches.some(m=>texto_(m.phase).toUpperCase()==='FINAL'))finalRound=r;});
 if(semis&&semis.matches.length===2&&finalRound){finalRound.name='DECISÕES';const terceiro=criarJogoCompacto_(game++,finalRound.index,'DISPUTA DE 3º LUGAR');terceiro.team1Placeholder='Perdedor Jogo '+semis.matches[0].game;terceiro.team2Placeholder='Perdedor Jogo '+semis.matches[1].game;finalRound.matches.push(terceiro);}
 const first=todosJogos_(rounds).filter(m=>m.team1&&m.team2&&m.status==='AGUARDANDO').sort((a,b)=>a.roundIndex-b.roundIndex||a.game-b.game)[0];
 if(first){first.availableAt=new Date();first.status='LIBERADO';}
 return rounds;
}
