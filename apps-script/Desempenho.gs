/** Índice histórico individual, com confiança progressiva e auditoria — V018 */
const DESEMPENHO_HEADERS=[
 'PARTICIPANTE_ID','NOME','POTE','IDADE','INDICE_BASE','CAMPEONATOS','JOGOS','VITORIAS','DERROTAS','APROVEITAMENTO',
 'SETS_PRO','SETS_CONTRA','SALDO_SETS','PONTOS_PRO','PONTOS_CONTRA','SALDO_PONTOS','TITULOS','VICES','TERCEIROS','QUARTOS',
 'FATOR_CONFIANCA','AJUSTE_HISTORICO','INDICE_ATUAL','ATUALIZADO_EM'
];
function limitarNumero_(valor,minimo,maximo){return Math.max(minimo,Math.min(maximo,Number(valor)||0));}
function arredondarIndice_(valor){return Math.round((Number(valor)||0)*10)/10;}
function garantirEstruturaDesempenho_(){
 garantirAba_(VOLEI.SHEETS.DESEMPENHO,DESEMPENHO_HEADERS);
 const s=aba_(VOLEI.SHEETS.JOGADORES);
 if(s.getMaxColumns()<14)s.insertColumnsAfter(s.getMaxColumns(),14-s.getMaxColumns());
 s.getRange(1,1,1,14).setValues([VOLEI.HEADERS.JOGADORES]);
 return true;
}
function jogadoresBaseParaDesempenho_(){
 const s=aba_(VOLEI.SHEETS.JOGADORES),l=s.getLastRow();if(l<2)return[];
 return s.getRange(2,1,l-1,14).getValues().filter(r=>r[0]||r[1]).map((r,i)=>({
  row:i+2,id:texto_(r[0]),name:texto_(r[1]),age:numero_(r[3]),pot:texto_(r[4]).toUpperCase(),baseIndex:numero_(r[7]),active:texto_(r[8]||'SIM').toUpperCase()
 }));
}
function membrosHistoricosPorEquipe_(){
 const mapa={},s=aba_(VOLEI.SHEETS.HISTORICO_EQUIPES),l=s.getLastRow();if(l<2)return mapa;
 s.getRange(2,1,l-1,HISTORICO_EQUIPES_HEADERS.length).getValues().filter(r=>r[0]&&r[2]).forEach(r=>{
  const chave=texto_(r[0])+'|'+texto_(r[2]),ids=[texto_(r[3]),texto_(r[7])].filter(Boolean);
  mapa[chave]=Array.from(new Set(ids));
 });
 return mapa;
}
function placarHistorico_(r){
 let sets=[];try{const p=texto_(r[24]);if(p)sets=JSON.parse(p);}catch(ignore){}
 if(!Array.isArray(sets)||!sets.length)sets=[[r[8],r[9]],[r[10],r[11]],[r[12],r[13]]];
 return sets.filter(s=>Array.isArray(s)&&numeroOpcional_(s[0])!=null&&numeroOpcional_(s[1])!=null).map(s=>[numero_(s[0]),numero_(s[1])]);
}
function novaEstatistica_(jogador){return{
 id:jogador.id,name:jogador.name,pot:jogador.pot,age:jogador.age,baseIndex:jogador.baseIndex,championships:{},games:0,wins:0,losses:0,
 setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0,titles:0,runners:0,thirds:0,fourths:0
};}
function aplicarPartidaAoParticipante_(st,campeonatoId,venceu,setsPro,setsContra,pontosPro,pontosContra){
 st.championships[campeonatoId]=true;st.games++;if(venceu)st.wins++;else st.losses++;
 st.setsFor+=setsPro;st.setsAgainst+=setsContra;st.pointsFor+=pontosPro;st.pointsAgainst+=pontosContra;
}
function calcularIndicesHistoricos_(){
 garantirEstruturaDesempenho_();const jogadores=jogadoresBaseParaDesempenho_(),stats={},membros=membrosHistoricosPorEquipe_();
 jogadores.forEach(j=>stats[j.id]=novaEstatistica_(j));
 const s=aba_(VOLEI.SHEETS.HISTORICO_CHAVEAMENTO),l=s.getLastRow(),vistos={};
 if(l>=2)s.getRange(2,1,l-1,HISTORICO_CHAVEAMENTO_HEADERS.length).getValues().forEach(r=>{
  const campeonatoId=texto_(r[0]),jogo=numero_(r[2]),status=texto_(r[17]).toUpperCase(),chaveJogo=campeonatoId+'|'+jogo;
  if(!campeonatoId||!jogo||status!=='FINALIZADO'||vistos[chaveJogo])return;vistos[chaveJogo]=true;
  const equipe1=texto_(r[4]),equipe2=texto_(r[6]),vencedor=texto_(r[16]);if(!equipe1||!equipe2||!vencedor)return;
  const placar=placarHistorico_(r),sets1=placar.filter(x=>x[0]>x[1]).length,sets2=placar.filter(x=>x[1]>x[0]).length,pontos1=placar.reduce((a,x)=>a+x[0],0),pontos2=placar.reduce((a,x)=>a+x[1],0);
  (membros[campeonatoId+'|'+equipe1]||[]).forEach(id=>{if(stats[id])aplicarPartidaAoParticipante_(stats[id],campeonatoId,equipe1===vencedor,sets1,sets2,pontos1,pontos2);});
  (membros[campeonatoId+'|'+equipe2]||[]).forEach(id=>{if(stats[id])aplicarPartidaAoParticipante_(stats[id],campeonatoId,equipe2===vencedor,sets2,sets1,pontos2,pontos1);});
  const fase=texto_(r[3]).toUpperCase();
  if(fase==='FINAL'){
   const perdedor=vencedor===equipe1?equipe2:equipe1;
   (membros[campeonatoId+'|'+vencedor]||[]).forEach(id=>{if(stats[id])stats[id].titles++;});
   (membros[campeonatoId+'|'+perdedor]||[]).forEach(id=>{if(stats[id])stats[id].runners++;});
  }
  if(fase==='DISPUTA DE 3º LUGAR'){
   const quarto=vencedor===equipe1?equipe2:equipe1;
   (membros[campeonatoId+'|'+vencedor]||[]).forEach(id=>{if(stats[id])stats[id].thirds++;});
   (membros[campeonatoId+'|'+quarto]||[]).forEach(id=>{if(stats[id])stats[id].fourths++;});
  }
 });
 const c=obterConfig_(),maximo=numero_(c.AJUSTE_HISTORICO_MAXIMO||2)||2,jogosConfianca=numero_(c.JOGOS_CONFIANCA_TOTAL||6)||6;
 const pesoVitorias=numero_(c.PESO_HISTORICO_VITORIAS||0.55),pesoSets=numero_(c.PESO_HISTORICO_SETS||0.25),pesoPontos=numero_(c.PESO_HISTORICO_PONTOS||0.10),pesoColocacao=numero_(c.PESO_HISTORICO_COLOCACAO||0.10);
 return jogadores.map(j=>{
  const st=stats[j.id],campeonatos=Object.keys(st.championships).length,totalSets=st.setsFor+st.setsAgainst,totalPontos=st.pointsFor+st.pointsAgainst;
  const indiceVitorias=st.games?(st.wins-st.losses)/st.games:0,indiceSets=totalSets?(st.setsFor-st.setsAgainst)/totalSets:0,indicePontos=totalPontos?(st.pointsFor-st.pointsAgainst)/totalPontos:0;
  const indiceColocacao=campeonatos?(st.titles+st.runners*0.5+st.thirds*0.25)/campeonatos:0,confianca=limitarNumero_(st.games/jogosConfianca,0,1);
  const bruto=pesoVitorias*indiceVitorias+pesoSets*indiceSets+pesoPontos*indicePontos+pesoColocacao*indiceColocacao;
  const ajuste=arredondarIndice_(limitarNumero_(bruto*maximo*confianca,-maximo,maximo)),indiceAtual=arredondarIndice_(limitarNumero_(st.baseIndex+ajuste,1,10));
  return Object.assign(st,{championshipCount:campeonatos,confidence:arredondarIndice_(confianca),adjustment:ajuste,currentIndex:indiceAtual,winRate:st.games?arredondarIndice_(st.wins*100/st.games):0});
 });
}
function gravarIndicesHistoricos_(resultados){
 garantirEstruturaDesempenho_();const s=aba_(VOLEI.SHEETS.DESEMPENHO),agora=new Date();limparAbaixoCabecalho_(VOLEI.SHEETS.DESEMPENHO,DESEMPENHO_HEADERS.length);
 if(resultados.length)s.getRange(2,1,resultados.length,DESEMPENHO_HEADERS.length).setValues(resultados.map(r=>[
  r.id,r.name,r.pot,r.age,r.baseIndex,r.championshipCount,r.games,r.wins,r.losses,r.winRate,r.setsFor,r.setsAgainst,r.setsFor-r.setsAgainst,
  r.pointsFor,r.pointsAgainst,r.pointsFor-r.pointsAgainst,r.titles,r.runners,r.thirds,r.fourths,r.confidence,r.adjustment,r.currentIndex,agora
 ]));
 const jogadores=aba_(VOLEI.SHEETS.JOGADORES),mapa={};resultados.forEach(r=>mapa[r.id]=r);
 if(jogadores.getLastRow()>=2){const ids=jogadores.getRange(2,1,jogadores.getLastRow()-1,1).getDisplayValues(),valores=ids.map(r=>{const x=mapa[texto_(r[0])];return[x?x.adjustment:0,x?x.currentIndex:'',agora];});jogadores.getRange(2,12,valores.length,3).setValues(valores);}
 return resultados;
}
function atualizarIndicesHistoricos_(){
 const resultados=gravarIndicesHistoricos_(calcularIndicesHistoricos_());
 log_('INDICES_HISTORICOS_ATUALIZADOS','','SISTEMA','SISTEMA','Participantes processados: '+resultados.length,'INFO','DESEMPENHO');
 return resultados;
}
function obterIndiceAtualParticipante_(id,base){
 const s=aba_(VOLEI.SHEETS.JOGADORES),l=s.getLastRow();if(l<2)return numero_(base);const ids=s.getRange(2,1,l-1,1).getDisplayValues().map(r=>texto_(r[0])),i=ids.indexOf(texto_(id));if(i<0)return numero_(base);
 const atual=numeroOpcional_(s.getRange(i+2,13).getValue());return atual==null?numero_(base):atual;
}
