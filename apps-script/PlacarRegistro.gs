/** Registro do placar, horário real, avanço do vencedor e disputa de 3º lugar */
function registrarResultado_(jogo,payload){
 jogo=numero_(jogo);if(!jogo)throw Error('Informe o jogo.');const resultado=validarPlacar_(payload);
 const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Chaveamento ainda não foi criado.');const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
 const r=dados[i],status=texto_(r[16]);if(!r[3]||!r[5])throw Error('As duas equipes ainda não estão definidas para esta partida.');if(status==='FINALIZADO')throw Error('Esta partida já foi finalizada.');
 const disponivel=r[18]?interpretarData_(r[18]):null,agora=new Date();if(disponivel&&agora.getTime()<disponivel.getTime())throw Error('Respeite o intervalo. Esta partida estará liberada em '+formatarData_(disponivel)+'.');
 const inicio=r[22]?interpretarData_(r[22]):agora,vencedorId=resultado.winnerSide===1?texto_(r[3]):texto_(r[5]),perdedorId=resultado.winnerSide===1?texto_(r[5]):texto_(r[3]);
 const tres=[resultado.scores[0]||[null,null],resultado.scores[1]||[null,null],resultado.scores[2]||[null,null]];
 s.getRange(i+2,8,1,11).setValues([[tres[0][0]==null?'':tres[0][0],tres[0][1]==null?'':tres[0][1],tres[1][0]==null?'':tres[1][0],tres[1][1]==null?'':tres[1][1],tres[2][0]==null?'':tres[2][0],tres[2][1]==null?'':tres[2][1],resultado.sets1,resultado.sets2,vencedorId,'FINALIZADO',agora]]);
 s.getRange(i+2,23,1,2).setValues([[inicio,JSON.stringify(resultado.scores)]]);
 const equipes=lerEquipes_(),proximoJogo=numero_(r[20]),proximoSlot=numero_(r[21]);
 if(proximoJogo){const ni=dados.findIndex(x=>numero_(x[1])===proximoJogo),equipe=equipes.filter(e=>e.id===vencedorId)[0];if(ni>=0&&equipe){const col=proximoSlot===1?4:6;s.getRange(ni+2,col,1,2).setValues([[equipe.id,nomeEquipe_(equipe)]])}}
 if(texto_(r[2]).toUpperCase()==='SEMIFINAL'){
  const semis=dados.map((x,idx)=>({row:x,index:idx})).filter(x=>texto_(x.row[2]).toUpperCase()==='SEMIFINAL').sort((a,b)=>numero_(a.row[1])-numero_(b.row[1]));
  const semiIndex=semis.findIndex(x=>numero_(x.row[1])===jogo),terceiroIndex=dados.findIndex(x=>texto_(x[2]).toUpperCase()==='DISPUTA DE 3º LUGAR'),equipePerdedora=equipes.filter(e=>e.id===perdedorId)[0];
  if(terceiroIndex>=0&&semiIndex>=0&&equipePerdedora){const col=semiIndex===0?4:6;s.getRange(terceiroIndex+2,col,1,2).setValues([[equipePerdedora.id,nomeEquipe_(equipePerdedora)]])}
 }
 const atualizados=s.getRange(2,1,l-1,24).getValues(),intervalo=resultado.rules.matchIntervalMinutes,proximaData=new Date(agora.getTime()+intervalo*60000);liberarProximaPartida_(atualizados,i,proximaData);
 const depois=s.getRange(2,1,l-1,24).getValues(),finalRow=depois.find(x=>texto_(x[2]).toUpperCase()==='FINAL'),terceiroRow=depois.find(x=>texto_(x[2]).toUpperCase()==='DISPUTA DE 3º LUGAR');
 const finalizada=!!finalRow&&texto_(finalRow[16])==='FINALIZADO'&&(!terceiroRow||texto_(terceiroRow[16])==='FINALIZADO'),campeaoId=finalRow?texto_(finalRow[15]):'';
 const torneio=ultimoSorteio_();if(torneio){if(finalizada)aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,2,1,13).setValues([['FINALIZADO',torneio.codeHash,torneio.codeFinal,torneio.createdAt,torneio.activatedAt,torneio.scheduledAt,torneio.realizedAt,torneio.seed,torneio.auditHash,torneio.activatedBy,terceiroRow?'Competição encerrada. Campeão e terceiro lugar definidos.':'Competição encerrada.',agora,campeaoId]]);else{aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,2).setValue('EM_ANDAMENTO');aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,12).setValue('Competição em andamento.');}}
 const resumo=resultado.scores.filter(x=>x&&x[0]!=null&&x[1]!=null).map(x=>x[0]+'-'+x[1]).join(', ');
 log_('PLACAR_REGISTRADO',texto_(r[0]),'PAINEL_WEB','ADMIN','Jogo '+jogo+' | '+resumo+' | Início '+formatarData_(inicio)+' | Término '+formatarData_(agora)+' | Vencedor '+vencedorId,'INFO',String(jogo));
 return{message:finalizada?'Placar registrado. Competição encerrada.':'Placar registrado. Próxima partida liberada em '+intervalo+' minutos.',state:obterEstadoAdmin_()};
}
function prioridadePartida_(r){const fase=texto_(r[2]).toUpperCase();if(fase==='DISPUTA DE 3º LUGAR')return-2;if(fase==='FINAL')return-1;return numero_(r[1]);}
function liberarProximaPartida_(dados,ignorarIndice,quando){const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),candidatas=[];for(let i=0;i<dados.length;i++){if(i===ignorarIndice)continue;const r=dados[i],status=texto_(r[16]);if(r[3]&&r[5]&&status==='AGUARDANDO'&&!r[18])candidatas.push({i,r});}candidatas.sort((a,b)=>prioridadePartida_(a.r)-prioridadePartida_(b.r));if(candidatas.length)s.getRange(candidatas[0].i+2,17,1,3).setValues([['AGUARDANDO','',quando]]);}
function atualizarLiberacoes_(){const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)return;const d=s.getRange(2,1,l-1,24).getValues();if(d.some(r=>['LIBERADO','EM_DISPUTA'].indexOf(texto_(r[16]))>=0))return;const agora=Date.now(),candidatas=[];for(let i=0;i<d.length;i++){const r=d[i],disp=r[18]?interpretarData_(r[18]):null;if(r[3]&&r[5]&&texto_(r[16])==='AGUARDANDO'&&disp&&disp.getTime()<=agora)candidatas.push({i,r});}candidatas.sort((a,b)=>prioridadePartida_(a.r)-prioridadePartida_(b.r));if(candidatas.length)s.getRange(candidatas[0].i+2,17).setValue('LIBERADO');}
