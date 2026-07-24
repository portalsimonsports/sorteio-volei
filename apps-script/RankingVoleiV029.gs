/** RANKING GERAL DO VÔLEI — CAMPEONATOS ATUAIS, HISTÓRICOS E AVULSOS — V029 */
function rv29TextoChave_(v){return texto_(v).toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');}
function rv29ArrayJson_(v){if(Array.isArray(v))return v;const s=texto_(v);if(!s)return[];try{const a=JSON.parse(s);return Array.isArray(a)?a:[];}catch(ignore){return[];}}
function rv29IdsEquipe_(e,mapaNomes){
 const ids=[];function add(v){texto_(v).split('|').forEach(id=>{id=texto_(id);if(id&&ids.indexOf(id)<0)ids.push(id);});}
 if(!e)return ids;
 if(Array.isArray(e.members))e.members.forEach(m=>add(typeof m==='string'?m:m&&m.id));
 ['member1Id','member2Id','jogador1Id','jogador2Id','adultId','childId','adultoId','criancaId'].forEach(k=>add(e[k]));
 if(!ids.length){
  const nomes=[];if(Array.isArray(e.members))e.members.forEach(m=>{const n=texto_(typeof m==='string'?m:m&&m.name);if(n)nomes.push(n);});
  ['member1','member2','jogador1','jogador2','adult','child','adulto','crianca','name'].forEach(k=>{const n=texto_(e[k]);if(n)n.split(/\s*\+\s*/).forEach(x=>{x=texto_(x);if(x)nomes.push(x);});});
  nomes.forEach(n=>{const id=mapaNomes[rv29TextoChave_(n)];if(id)add(id);});
 }
 return ids;
}
function rv29Placar_(m){
 let s=Array.isArray(m&&m.scores)?m.scores:rv29ArrayJson_(m&&m.placarJson||m&&m.placar||m&&m.scoresJson);
 return s.filter(x=>Array.isArray(x)&&x.length>=2&&x[0]!==''&&x[1]!==''&&x[0]!=null&&x[1]!=null).map(x=>[numero_(x[0]),numero_(x[1])]);
}
function rv29SomarPartida_(stats,mapaNomes,m,chave,vistos){
 if(!m||vistos[chave])return;const status=texto_(m.status).toUpperCase(),placar=rv29Placar_(m),s1=numero_(m.sets1),s2=numero_(m.sets2);
 let lado=numero_(m.winnerSide||m.vencedorLado),winnerId=texto_(m.winnerId||m.vencedorId),e1=m.team1||m.equipe1,e2=m.team2||m.equipe2;
 if(!lado&&winnerId){if(winnerId===texto_(e1&&e1.id))lado=1;else if(winnerId===texto_(e2&&e2.id))lado=2;}
 if(!lado&&s1!==s2)lado=s1>s2?1:2;
 if(status!=='FINALIZADO'&&!lado)return;
 const ids1=rv29IdsEquipe_(e1,mapaNomes),ids2=rv29IdsEquipe_(e2,mapaNomes);if(!ids1.length||!ids2.length)return;
 const pf1=placar.reduce((t,x)=>t+numero_(x[0]),0),pf2=placar.reduce((t,x)=>t+numero_(x[1]),0),sets1=s1||placar.filter(x=>x[0]>x[1]).length,sets2=s2||placar.filter(x=>x[1]>x[0]).length;
 function aplicar(ids,venceu,sf,sa,pf,pa){ids.forEach(id=>{const x=stats[id];if(!x)return;x.games++;if(venceu){x.wins++;x.points+=2;}else{x.losses++;}x.setsFor+=sf;x.setsAgainst+=sa;x.pointsFor+=pf;x.pointsAgainst+=pa;});}
 aplicar(ids1,lado===1,sets1,sets2,pf1,pf2);aplicar(ids2,lado===2,sets2,sets1,pf2,pf1);vistos[chave]=true;
}
function rv29ProcessarEstado_(stats,mapaNomes,estado,prefixo,vistos){
 if(!estado)return;const rounds=Array.isArray(estado.rounds)?estado.rounds:(Array.isArray(estado.rodadas)?estado.rodadas:[]);let seq=0;
 rounds.forEach(r=>(Array.isArray(r.matches)?r.matches:(Array.isArray(r.jogos)?r.jogos:[])).forEach(m=>{seq++;rv29SomarPartida_(stats,mapaNomes,m,prefixo+'|'+texto_(m.game||m.jogo||seq),vistos);}));
 const jogos=Array.isArray(estado.matches)?estado.matches:(Array.isArray(estado.jogos)?estado.jogos:[]);jogos.forEach(m=>{seq++;rv29SomarPartida_(stats,mapaNomes,m,prefixo+'|'+texto_(m.game||m.jogo||seq),vistos);});
}
function flexVoleiRankingGlobal_(estadoAtual){
 const stats={},mapaNomes={},vistos={};lerJogadores_().forEach(p=>{stats[p.id]={id:p.id,name:p.name,games:0,wins:0,losses:0,points:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0};mapaNomes[rv29TextoChave_(p.name)]=p.id;});
 const atual=estadoAtual||obterEstadoPublicoSemVerificacao_(),idAtual=texto_(atual&&atual.championship&&atual.championship.id)||campeonatoIdAtivo_()||'ATUAL';rv29ProcessarEstado_(stats,mapaNomes,atual,idAtual,vistos);
 try{listarCampeonatos_().forEach(c=>{const equipes=lerEquipesHistoricas_(c.id),rounds=lerRoundsHistoricos_(c.id,equipes);rv29ProcessarEstado_(stats,mapaNomes,{rounds:rounds},c.id,vistos);});}catch(err){log_('RANKING_HISTORICO_CONTINGENCIA','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO','RANKING');}
 try{if(typeof flexVoleiLerAvulsos_==='function')flexVoleiLerAvulsos_().filter(j=>texto_(j.status).toUpperCase()==='FINALIZADO').forEach(j=>{const m={game:j.id,status:j.status,team1:j.team1,team2:j.team2,scores:j.scores,sets1:j.sets1,sets2:j.sets2,winnerSide:j.winnerSide};rv29SomarPartida_(stats,mapaNomes,m,'AVULSO|'+j.id,vistos);});}catch(err){log_('RANKING_AVULSO_CONTINGENCIA','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO','RANKING');}
 return Object.keys(stats).map(id=>{const x=stats[id];x.winRate=x.games?Math.round(x.wins*1000/x.games)/10:0;x.setDiff=x.setsFor-x.setsAgainst;x.pointDiff=x.pointsFor-x.pointsAgainst;return x;});
}
function flexAnexarEstadoVolei_(e,admin){
 const base=flexVoleiRankingGlobal_(e);e.globalRankingPoints=flexOrdenarRanking_(base,'PONTOS');e.globalRankingWinRate=flexOrdenarRanking_(base,'APROVEITAMENTO');e.globalRankingIndex=typeof flexRankingIndiceV024_==='function'?flexRankingIndiceV024_(base):[];e.globalRankingTotalGames=base.reduce((t,x)=>t+x.games,0);e.championshipEditable=flexVoleiNaoIniciado_()&&!!e.championship&&texto_(e.championship.active)==='SIM';if(admin&&typeof flexVoleiLerAvulsos_==='function')e.freeMatches=flexVoleiLerAvulsos_();return e;
}
