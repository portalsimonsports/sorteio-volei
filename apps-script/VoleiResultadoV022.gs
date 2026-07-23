/** Progressão dos novos formatos — V022 */
function formatoAtualV022_(){return texto_(obterConfig_().CAMPEONATO_FORMATO||'MATA_MATA').toUpperCase();}
function finalizarTorneioV022_(campeaoId,mensagem,agora){const torneio=ultimoSorteio_();if(!torneio)return;aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,2,1,13).setValues([['FINALIZADO',torneio.codeHash,torneio.codeFinal,torneio.createdAt,torneio.activatedAt,torneio.scheduledAt,torneio.realizedAt,torneio.seed,torneio.auditHash,torneio.activatedBy,mensagem,agora,campeaoId]]);}
function campeaoFinalDoisJogosV022_(dados){
 const finais=dados.filter(r=>/^FINAL\s+[12]$/i.test(texto_(r[2]))&&texto_(r[16])==='FINALIZADO').sort((a,b)=>numero_(a[1])-numero_(b[1]));if(finais.length<2)return null;
 const ids=[texto_(finais[0][3]),texto_(finais[0][5])],stats={};ids.forEach(id=>stats[id]={id:id,wins:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0});
 finais.forEach(r=>{const a=stats[texto_(r[3])],b=stats[texto_(r[5])];if(!a||!b)return;a.setsFor+=numero_(r[13]);a.setsAgainst+=numero_(r[14]);b.setsFor+=numero_(r[14]);b.setsAgainst+=numero_(r[13]);if(texto_(r[15])===a.id)a.wins++;else b.wins++;let scores=[];try{scores=JSON.parse(texto_(r[23])||'[]');}catch(ignore){}scores.forEach(x=>{a.pointsFor+=numero_(x[0]);a.pointsAgainst+=numero_(x[1]);b.pointsFor+=numero_(x[1]);b.pointsAgainst+=numero_(x[0]);});});
 const lista=Object.values(stats).map(x=>Object.assign(x,{setDiff:x.setsFor-x.setsAgainst,pointDiff:x.pointsFor-x.pointsAgainst})).sort((a,b)=>b.wins-a.wins||b.setDiff-a.setDiff||b.pointDiff-a.pointDiff||b.pointsFor-a.pointsFor);
 if(lista[0].wins===lista[1].wins&&lista[0].setDiff===lista[1].setDiff&&lista[0].pointDiff===lista[1].pointDiff&&lista[0].pointsFor===lista[1].pointsFor)return texto_(finais[1][15]);
 return lista[0].id;
}
function processarPosResultadoV022_(s,dados,equipes,agora){
 const formato=formatoAtualV022_(),finaisDuplas=dados.filter(r=>/^FINAL\s+[12]$/i.test(texto_(r[2])));
 if(finaisDuplas.length===2){const campeao=campeaoFinalDoisJogosV022_(dados);if(campeao){finalizarTorneioV022_(campeao,'Competição encerrada em duas finais. Critérios: vitórias, saldo de sets, saldo de pontos, pontos marcados e segunda final.',agora);return{handled:true,finished:true,championId:campeao,message:'Competição encerrada após as duas finais.'};}return{handled:true,finished:false};}
 if(formato!=='TODOS_CONTRA_TODOS')return{handled:false};
 const classificatorios=dados.filter(r=>texto_(r[2]).toUpperCase()==='FASE CLASSIFICATÓRIA'),todosFinalizados=classificatorios.length&&classificatorios.every(r=>texto_(r[16])==='FINALIZADO');if(!todosFinalizados)return{handled:true,finished:false};
 if(equipes.length<=4){const ranking=classificacaoV022_(dados,equipes),campeao=ranking[0]&&ranking[0].team.id;if(campeao){finalizarTorneioV022_(campeao,'Todos contra todos encerrado. Campeão definido pela classificação geral.',agora);return{handled:true,finished:true,championId:campeao,message:'Todos contra todos encerrado. Classificação final definida.'};}return{handled:true,finished:false};}
 const semis=dados.filter(r=>texto_(r[2]).toUpperCase()==='SEMIFINAL');if(semis.some(r=>!r[3]||!r[5])){definirSemifinaisClassificacaoV022_(s,dados,equipes);return{handled:true,finished:false,playoffsCreated:true};}
 const finalRow=dados.find(r=>texto_(r[2]).toUpperCase()==='FINAL'),terceiroRow=dados.find(r=>texto_(r[2]).toUpperCase()==='DISPUTA DE 3º LUGAR'),finalizada=finalRow&&texto_(finalRow[16])==='FINALIZADO'&&terceiroRow&&texto_(terceiroRow[16])==='FINALIZADO';
 if(finalizada){const campeao=texto_(finalRow[15]);finalizarTorneioV022_(campeao,'Todos contra todos encerrado. Quatro melhores disputaram semifinais, final e terceiro lugar.',agora);return{handled:true,finished:true,championId:campeao,message:'Competição encerrada com final e terceiro lugar.'};}
 return{handled:true,finished:false};
}
function classificacaoAtualV022_(){try{const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)return[];return classificacaoV022_(s.getRange(2,1,l-1,24).getValues(),lerEquipes_()).map((x,i)=>({position:i+1,team:x.team,games:x.games,wins:x.wins,losses:x.losses,points:x.points,winRate:x.winRate,setsFor:x.setsFor,setsAgainst:x.setsAgainst,setDiff:x.setDiff,pointsFor:x.pointsFor,pointsAgainst:x.pointsAgainst,pointDiff:x.pointDiff}));}catch(ignore){return[];}}
