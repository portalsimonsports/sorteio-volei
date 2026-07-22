/** Construção do chaveamento eliminatório com disputa de 3º lugar */
function embaralharDeterministico_(lista,seed){const a=lista.slice();let e=parseInt(hash_(seed).slice(0,8),16)>>>0;function r(){e+=0x6D2B79F5;let t=e;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1)),x=a[i];a[i]=a[j];a[j]=x;}return a;}
function proximaPotenciaDois_(n){let p=1;while(p<Math.max(2,n))p*=2;return p;}
function nomeFase_(size,round,total){const restantes=size/Math.pow(2,round+1);if(round===total-1)return'FINAL';if(restantes===2)return'SEMIFINAL';if(restantes===4)return'QUARTAS DE FINAL';if(restantes===8)return'OITAVAS DE FINAL';return'RODADA '+(round+1);}
function todosJogos_(rounds){const jogos=[];rounds.forEach(r=>r.matches.forEach(m=>jogos.push(m)));return jogos;}
function atribuirVencedorMemoria_(rounds,match){if(!match.nextGame||!match.winnerId)return;let next=null;todosJogos_(rounds).some(m=>{if(m.game===match.nextGame){next=m;return true;}return false;});if(!next)return;const team=match.team1&&match.team1.id===match.winnerId?match.team1:match.team2;if(match.nextSlot===1)next.team1=team;else next.team2=team;}
function criarSlotsIniciais_(equipes,size,seed){const quantidadeJogos=size/2,quantidadeByes=size-equipes.length,tipos=[];for(let i=0;i<quantidadeByes;i++)tipos.push('BYE');for(let i=quantidadeByes;i<quantidadeJogos;i++)tipos.push('JOGO');const ordem=embaralharDeterministico_(tipos,seed+'|TIPOS_DE_CONFRONTO'),slots=[];let indiceEquipe=0;ordem.forEach((tipo,indiceJogo)=>{if(tipo==='BYE'){const equipe=equipes[indiceEquipe++],equipeNaEsquerda=parseInt(hash_(seed+'|LADO_BYE|'+indiceJogo).slice(0,8),16)%2===0;slots.push(equipeNaEsquerda?equipe:null,equipeNaEsquerda?null:equipe);return;}slots.push(equipes[indiceEquipe++]||null,equipes[indiceEquipe++]||null);});return slots;}
function montarChaveamento_(equipes,seed){
 seed=texto_(seed)||'CHAVEAMENTO';
 const size=proximaPotenciaDois_(equipes.length),total=Math.log(size)/Math.log(2),slots=criarSlotsIniciais_(equipes,size,seed),rounds=[];let game=1;
 for(let r=0;r<total;r++){
  const count=size/Math.pow(2,r+1),matches=[];
  for(let i=0;i<count;i++)matches.push({game:game++,roundIndex:r,phase:nomeFase_(size,r,total),team1:null,team2:null,team1Placeholder:'',team2Placeholder:'',scores:[[null,null],[null,null],[null,null]],sets1:0,sets2:0,winnerId:'',status:'AGUARDANDO',finishedAt:'',availableAt:'',nextGame:0,nextSlot:0});
  rounds.push({index:r,name:nomeFase_(size,r,total),matches});
 }
 for(let i=0;i<rounds[0].matches.length;i++){
  const m=rounds[0].matches[i];m.team1=slots[i*2];m.team2=slots[i*2+1];
  if(m.team1&&!m.team2){m.winnerId=m.team1.id;m.status='BYE';}
  else if(!m.team1&&m.team2){m.winnerId=m.team2.id;m.status='BYE';}
 }
 for(let r=0;r<rounds.length-1;r++)rounds[r].matches.forEach((m,i)=>{const next=rounds[r+1].matches[Math.floor(i/2)];m.nextGame=next.game;m.nextSlot=i%2===0?1:2;if(m.winnerId)atribuirVencedorMemoria_(rounds,m);});
 for(let r=1;r<rounds.length;r++)rounds[r].matches.forEach((m,i)=>{const p1=rounds[r-1].matches[i*2],p2=rounds[r-1].matches[i*2+1];if(!m.team1)m.team1Placeholder='Vencedor Jogo '+p1.game;if(!m.team2)m.team2Placeholder='Vencedor Jogo '+p2.game;});
 if(equipes.length>=4&&total>=2){
  const semis=rounds[total-2].matches,finalRound=rounds[total-1];
  finalRound.name='DECISÕES';
  finalRound.matches.push({game:game++,roundIndex:total-1,phase:'DISPUTA DE 3º LUGAR',team1:null,team2:null,team1Placeholder:'Perdedor Jogo '+semis[0].game,team2Placeholder:'Perdedor Jogo '+semis[1].game,scores:[[null,null],[null,null],[null,null]],sets1:0,sets2:0,winnerId:'',status:'AGUARDANDO',finishedAt:'',availableAt:'',nextGame:0,nextSlot:0});
 }
 const first=todosJogos_(rounds).filter(m=>m.team1&&m.team2&&m.status==='AGUARDANDO').sort((a,b)=>a.roundIndex-b.roundIndex||a.game-b.game)[0];
 if(first){first.availableAt=new Date();first.status='LIBERADO';}
 return rounds;
}
