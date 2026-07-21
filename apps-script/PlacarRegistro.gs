/** Registro do placar, avanço do vencedor, disputa de 3º lugar e intervalo de 10 minutos */
function registrarResultado_(jogo,payload){
 jogo=numero_(jogo);payload=texto_(payload);if(!jogo)throw Error('Informe o jogo.');if(payload.indexOf('PLACAR|')!==0)throw Error('Preencha a pontuação dos sets antes de salvar.');
 const p=payload.split('|'),s1a=numeroOpcional_(p[1]),s1b=numeroOpcional_(p[2]),s2a=numeroOpcional_(p[3]),s2b=numeroOpcional_(p[4]),s3a=numeroOpcional_(p[5]),s3b=numeroOpcional_(p[6]),resultado=validarPlacar_(s1a,s1b,s2a,s2b,s3a,s3b);
 const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Chaveamento ainda não foi criado.');const dados=s.getRange(2,1,l-1,22).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
 const r=dados[i],status=texto_(r[16]);if(!r[3]||!r[5])throw Error('As duas equipes ainda não estão definidas para esta partida.');if(status==='FINALIZADO')throw Error('Esta partida já foi finalizada.');
 const disponivel=r[18]?interpretarData_(r[18]):null,agora=new Date();if(!disponivel||agora.getTime()<disponivel.getTime())throw Error('Respeite o intervalo de 10 minutos. Esta partida estará liberada em '+(disponivel?formatarData_(disponivel):'horário ainda não definido')+'.');
 const vencedorId=resultado.winnerSide===1?texto_(r[3]):texto_(r[5]),perdedorId=resultado.winnerSide===1?texto_(r[5]):texto_(r[3]);
 s.getRange(i+2,8,1,11).setValues([[s1a,s1b,s2a,s2b,s3a==null?'':s3a,s3b==null?'':s3b,resultado.sets1,resultado.sets2,vencedorId,'FINALIZADO',agora]]);
 const equipes=lerEquipes_();
 const proximoJogo=numero_(r[20]),proximoSlot=numero_(r[21]);
 if(proximoJogo){const ni=dados.findIndex(x=>numero_(x[1])===proximoJogo),equipe=equipes.filter(e=>e.id===vencedorId)[0];if(ni>=0&&equipe){const col=proximoSlot===1?4:6;s.getRange(ni+2,col,1,2).setValues([[equipe.id,nomeEquipe_(equipe)]])}}
 if(texto_(r[2]).toUpperCase()==='SEMIFINAL'){
  const semis=dados.map((x,idx)=>({row:x,index:idx})).filter(x=>texto_(x.row[2]).toUpperCase()==='SEMIFINAL').sort((a,b)=>numero_(a.row[1])-numero_(b.row[1]));
  const semiIndex=semis.findIndex(x=>numero_(x.row[1])===jogo),terceiroIndex=dados.findIndex(x=>texto_(x[2]).toUpperCase()==='DISPUTA DE 3º LUGAR'),equipePerdedora=equipes.filter(e=>e.id===perdedorId)[0];
  if(terceiroIndex>=0&&semiIndex>=0&&equipePerdedora){const col=semiIndex===0?4:6;s.getRange(terceiroIndex+2,col,1,2).setValues([[equipePerdedora.id,nomeEquipe_(equipePerdedora)]])}
 }
 const atualizados=s.getRange(2,1,l-1,22).getValues(),intervalo=Number(obterConfig_().INTERVALO_ENTRE_PARTIDAS_MINUTOS||10),proximaData=new Date(agora.getTime()+intervalo*60000);liberarProximaPartida_(atualizados,i,proximaData);
 const depois=s.getRange(2,1,l-1,22).getValues(),finalRow=depois.find(x=>texto_(x[2]).toUpperCase()==='FINAL'),terceiroRow=depois.find(x=>texto_(x[2]).toUpperCase()==='DISPUTA DE 3º LUGAR');
 const finalizada=!!finalRow&&texto_(finalRow[16])==='FINALIZADO'&&(!terceiroRow||texto_(terceiroRow[16])==='FINALIZADO'),campeaoId=finalRow?texto_(finalRow[15]):'';
 const torneio=ultimoSorteio_();if(torneio){if(finalizada)aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,2,1,13).setValues([['FINALIZADO',torneio.codeHash,torneio.codeFinal,torneio.createdAt,torneio.activatedAt,torneio.scheduledAt,torneio.realizedAt,torneio.seed,torneio.auditHash,torneio.activatedBy,terceiroRow?'Competição encerrada. Campeão e terceiro lugar definidos.':'Competição encerrada.',agora,campeaoId]]);else{aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,2).setValue('EM_ANDAMENTO');aba_(VOLEI.SHEETS.SORTEIOS).getRange(torneio.row,12).setValue('Competição em andamento.');}}
 log_('PLACAR_REGISTRADO',texto_(r[0]),'PAINEL_WEB','ADMIN','Jogo '+jogo+' | '+s1a+'-'+s1b+', '+s2a+'-'+s2b+(s3a==null?'':', '+s3a+'-'+s3b)+' | Vencedor '+vencedorId,'INFO',String(jogo));
 return{message:finalizada?'Placar registrado. Competição encerrada.':'Placar registrado. Próxima partida liberada em '+intervalo+' minutos.',state:obterEstadoAdmin_()};
}
function prioridadePartida_(r){const fase=texto_(r[2]).toUpperCase();if(fase==='DISPUTA DE 3º LUGAR')return-2;if(fase==='FINAL')return-1;return numero_(r[1]);}
function liberarProximaPartida_(dados,ignorarIndice,quando){const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),candidatas=[];for(let i=0;i<dados.length;i++){if(i===ignorarIndice)continue;const r=dados[i],status=texto_(r[16]);if(r[3]&&r[5]&&status==='AGUARDANDO'&&!r[18])candidatas.push({i,r});}candidatas.sort((a,b)=>prioridadePartida_(a.r)-prioridadePartida_(b.r));if(candidatas.length)s.getRange(candidatas[0].i+2,17,1,3).setValues([['AGUARDANDO','',quando]]);}
function atualizarLiberacoes_(){const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)return;const d=s.getRange(2,1,l-1,22).getValues();if(d.some(r=>['LIBERADO','EM_DISPUTA'].indexOf(texto_(r[16]))>=0))return;const agora=Date.now(),candidatas=[];for(let i=0;i<d.length;i++){const r=d[i],disp=r[18]?interpretarData_(r[18]):null;if(r[3]&&r[5]&&texto_(r[16])==='AGUARDANDO'&&disp&&disp.getTime()<=agora)candidatas.push({i,r});}candidatas.sort((a,b)=>prioridadePartida_(a.r)-prioridadePartida_(b.r));if(candidatas.length)s.getRange(candidatas[0].i+2,17).setValue('LIBERADO');}
