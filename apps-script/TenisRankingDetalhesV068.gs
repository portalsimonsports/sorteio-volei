/** TÊNIS DE MESA — DETALHAMENTO DE VITÓRIAS E DERROTAS — V068 */
function tm68TextoNormalizado_(valor){
  return texto_(valor).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function tm68DataMs_(valor){
  if(valor instanceof Date)return valor.getTime();
  try{const d=typeof interpretarData_==='function'?interpretarData_(valor):new Date(valor);return d&&!isNaN(d.getTime())?d.getTime():0;}catch(ignore){return 0;}
}
function tm68DataTexto_(valor){
  if(!valor)return'';
  try{const d=valor instanceof Date?valor:(typeof interpretarData_==='function'?interpretarData_(valor):new Date(valor));return d&&!isNaN(d.getTime())?formatarData_(d):texto_(valor);}catch(ignore){return texto_(valor);}
}
function tm68PlacarOrientado_(scores,lado){
  return(scores||[]).filter(par=>Array.isArray(par)&&par.length>=2&&par[0]!==''&&par[0]!=null&&par[1]!==''&&par[1]!=null).map(par=>lado===1?[numero_(par[0]),numero_(par[1])]:[numero_(par[1]),numero_(par[0])]);
}
function tm68PlacarTexto_(scores){return(scores||[]).map(par=>numero_(par[0])+' × '+numero_(par[1])).join(' | ');}
function tm68DetalhesRanking_(p){
  const tipo=texto_(p.tipo||'VITORIAS').toUpperCase(),escopo=texto_(p.escopo||'GERAL').toUpperCase(),campeonatoId=texto_(p.campeonatoId),jogadorIdInformado=texto_(p.jogadorId),nomeInformado=tm68TextoNormalizado_(p.jogadorNome);
  if(['VITORIAS','DERROTAS'].indexOf(tipo)<0)throw Error('Selecione vitórias ou derrotas.');
  if(['GERAL','CAMPEONATO','AVULSOS'].indexOf(escopo)<0)throw Error('Recorte de ranking inválido.');
  if(escopo==='CAMPEONATO'&&!campeonatoId)throw Error('Selecione o campeonato.');
  const d=tm54Data_(),jogador=d.players.find(j=>j.id===jogadorIdInformado)||d.players.find(j=>tm68TextoNormalizado_(j.name)===nomeInformado);
  if(!jogador)throw Error('Participante não encontrado.');
  const cmap={};d.champs.forEach(c=>cmap[c.id]=c);
  const itens=[];
  function aceitaResultado(venceu){return tipo==='VITORIAS'?venceu:!venceu;}
  function adicionarJogo(g,origem){
    if(!g||g.status!=='FINALIZADO'||!g.winnerId)return;
    if(jogador.id!==g.player1Id&&jogador.id!==g.player2Id)return;
    if(origem==='CAMPEONATO'){
      if(escopo==='AVULSOS')return;
      if(escopo==='CAMPEONATO'&&g.championshipId!==campeonatoId)return;
    }else{
      if(escopo==='CAMPEONATO')return;
    }
    const lado=jogador.id===g.player1Id?1:2,venceu=g.winnerId===jogador.id;if(!aceitaResultado(venceu))return;
    const adversario=lado===1?g.player2:g.player1,placar=tm68PlacarOrientado_(g.scores,lado),data=g.finishedAt||g.startedAt||g.createdAt||'';
    const champ=origem==='CAMPEONATO'?(cmap[g.championshipId]||null):null;
    itens.push({
      id:origem==='CAMPEONATO'?'CAMPEONATO:'+g.championshipId+':'+g.game:'AVULSO:'+g.id,
      kind:'JOGO',source:origem,sourceLabel:origem==='CAMPEONATO'?(champ?champ.name:'Campeonato'):'Jogo avulso',championshipId:g.championshipId||'',game:origem==='CAMPEONATO'?numero_(g.game):numero_(g.order),opponent:adversario,won:venceu,count:1,scores:placar,scoreText:tm68PlacarTexto_(placar),setsFor:lado===1?numero_(g.sets1):numero_(g.sets2),setsAgainst:lado===1?numero_(g.sets2):numero_(g.sets1),date:data,dateText:tm68DataTexto_(data),sortTime:tm68DataMs_(data)
    });
  }
  d.games.forEach(g=>adicionarJogo(g,'CAMPEONATO'));
  d.free.forEach(g=>adicionarJogo(g,'AVULSO'));
  d.manual.forEach(h=>{
    if(jogador.id!==h.playerAId&&jogador.id!==h.playerBId)return;
    if(escopo==='AVULSOS'&&h.origin!=='AVULSO')return;
    if(escopo==='CAMPEONATO'&&(h.origin!=='CAMPEONATO'||h.championshipId!==campeonatoId))return;
    const ladoA=jogador.id===h.playerAId,vitorias=ladoA?numero_(h.winsA):numero_(h.winsB),derrotas=ladoA?numero_(h.winsB):numero_(h.winsA),quantidade=tipo==='VITORIAS'?vitorias:derrotas;if(quantidade<1)return;
    const adversario=ladoA?h.playerB:h.playerA,data=h.createdAt||'';
    itens.push({id:'HISTORICO:'+h.id,kind:'HISTORICO',source:h.origin==='CAMPEONATO'?'CAMPEONATO':'AVULSO',sourceLabel:h.origin==='CAMPEONATO'?(h.championshipName||'Campeonato'):'Histórico avulso',championshipId:h.championshipId||'',opponent:adversario,won:tipo==='VITORIAS',count:quantidade,wins:vitorias,losses:derrotas,games:numero_(h.games),basePoints:numero_(h.basePoints),minimumLead:numero_(h.minimumLead)||2,observation:h.observation||'',date:data,dateText:tm68DataTexto_(data),sortTime:tm68DataMs_(data)});
  });
  itens.sort((a,b)=>numero_(b.sortTime)-numero_(a.sortTime)||String(a.opponent||'').localeCompare(String(b.opponent||''),'pt-BR'));
  return{playerId:jogador.id,playerName:jogador.name,type:tipo,scope:escopo,championshipId:campeonatoId,total:itens.reduce((t,item)=>t+Math.max(1,numero_(item.count)),0),items:itens.map(item=>{const x=Object.assign({},item);delete x.sortTime;return x;})};
}
function tm68ResponderDetalhesRanking_(p){
  try{return responder_({ok:true,dados:tm68DetalhesRanking_(p),versao:'V068',dataHora:formatarData_(new Date())},p.callback);}
  catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V068',dataHora:formatarData_(new Date())},p.callback);}
}
