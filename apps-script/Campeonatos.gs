/** Edições de campeonato, histórico e reutilização das mesmas equipes — V016 */
const CAMPEONATOS_HEADERS=['CAMPEONATO_ID','NOME','STATUS','CRIADO_EM','INICIADO_EM','FINALIZADO_EM','SORTEIO_ID','ORIGEM_EQUIPES','QTD_EQUIPES','MODELO_CHAVEAMENTO','CAMPEAO_ID','MENSAGEM','ATIVO'];
const HISTORICO_EQUIPES_HEADERS=['CAMPEONATO_ID','SORTEIO_ID'].concat(VOLEI.HEADERS.EQUIPES);
const HISTORICO_CHAVEAMENTO_HEADERS=['CAMPEONATO_ID'].concat(VOLEI.HEADERS.CHAVEAMENTO);

function garantirEstruturaCampeonatos_(){
 garantirAba_(VOLEI.SHEETS.CAMPEONATOS,CAMPEONATOS_HEADERS);
 garantirAba_(VOLEI.SHEETS.HISTORICO_EQUIPES,HISTORICO_EQUIPES_HEADERS);
 garantirAba_(VOLEI.SHEETS.HISTORICO_CHAVEAMENTO,HISTORICO_CHAVEAMENTO_HEADERS);
 return true;
}
function campeonatoIdAtivo_(){return texto_(obterConfig_().CAMPEONATO_ATIVO_ID);}
function campeonatoNomeAtivo_(){return texto_(obterConfig_().CAMPEONATO_ATIVO_NOME)||'Campeonato de Vôlei';}
function modeloCampeonatoAtivo_(){return texto_(obterConfig_().CAMPEONATO_MODELO)||'AUTOMATICO';}
function gerarCampeonatoId_(){return gerarId_('CAM');}
function mapaCampeonato_(r,row){return{row:row,id:texto_(r[0]),name:texto_(r[1]),status:texto_(r[2]),createdAt:r[3]||'',startedAt:r[4]||'',finishedAt:r[5]||'',drawId:texto_(r[6]),teamSource:texto_(r[7]),teamCount:numero_(r[8]),bracketModel:texto_(r[9]),championId:texto_(r[10]),message:texto_(r[11]),active:texto_(r[12]||'NAO')};}
function listarCampeonatos_(){
 garantirEstruturaCampeonatos_();const s=aba_(VOLEI.SHEETS.CAMPEONATOS),l=s.getLastRow();if(l<2)return[];
 return s.getRange(2,1,l-1,CAMPEONATOS_HEADERS.length).getValues().filter(r=>r[0]).map((r,i)=>mapaCampeonato_(r,i+2)).sort((a,b)=>{const da=interpretarData_(a.createdAt),db=interpretarData_(b.createdAt);return(db?db.getTime():0)-(da?da.getTime():0);});
}
function localizarCampeonato_(id){return listarCampeonatos_().find(c=>c.id===texto_(id))||null;}
function gravarRegistroCampeonato_(registro){
 garantirEstruturaCampeonatos_();const s=aba_(VOLEI.SHEETS.CAMPEONATOS),l=s.getLastRow();let row=0;
 if(l>=2){const ids=s.getRange(2,1,l-1,1).getDisplayValues().map(r=>texto_(r[0]));const i=ids.indexOf(registro.id);if(i>=0)row=i+2;}
 const values=[registro.id,registro.name,registro.status,registro.createdAt||new Date(),registro.startedAt||'',registro.finishedAt||'',registro.drawId||'',registro.teamSource||'MESMAS_EQUIPES',registro.teamCount||0,registro.bracketModel||'AUTOMATICO',registro.championId||'',registro.message||'',registro.active||'NAO'];
 if(row)s.getRange(row,1,1,values.length).setValues([values]);else s.appendRow(values);
 return registro;
}
function desativarOutrosCampeonatos_(id){const s=aba_(VOLEI.SHEETS.CAMPEONATOS),l=s.getLastRow();if(l<2)return;const d=s.getRange(2,1,l-1,CAMPEONATOS_HEADERS.length).getValues();d.forEach((r,i)=>{if(r[0]&&texto_(r[0])!==id&&texto_(r[12])==='SIM')s.getRange(i+2,13).setValue('NAO');});}
function substituirHistorico_(sheetName,id,cols,rows){
 const s=aba_(sheetName),l=s.getLastRow();let existentes=[];
 if(l>=2)existentes=s.getRange(2,1,l-1,cols).getValues().filter(r=>r[0]&&texto_(r[0])!==id);
 if(l>=2)s.getRange(2,1,l-1,cols).clearContent();
 const todos=existentes.concat(rows||[]);if(todos.length)s.getRange(2,1,todos.length,cols).setValues(todos);
}
function arquivarCampeonatoAtual_(nome,manterAtivo){
 garantirEstruturaCampeonatos_();const torneio=ultimoSorteio_(),equipesSheet=aba_(VOLEI.SHEETS.EQUIPES),chaveSheet=aba_(VOLEI.SHEETS.CHAVEAMENTO);
 const el=equipesSheet.getLastRow(),cl=chaveSheet.getLastRow();if(el<2||cl<2||!torneio)return null;
 let id=campeonatoIdAtivo_();if(!id)id=gerarCampeonatoId_();
 const equipes=equipesSheet.getRange(2,1,el-1,12).getValues().filter(r=>r[0]);
 const jogos=chaveSheet.getRange(2,1,cl-1,24).getValues().filter(r=>r[0]);
 substituirHistorico_(VOLEI.SHEETS.HISTORICO_EQUIPES,id,HISTORICO_EQUIPES_HEADERS.length,equipes.map(r=>[id,torneio.id].concat(r)));
 substituirHistorico_(VOLEI.SHEETS.HISTORICO_CHAVEAMENTO,id,HISTORICO_CHAVEAMENTO_HEADERS.length,jogos.map(r=>[id].concat(r)));
 const anterior=localizarCampeonato_(id),registro={
  id:id,name:texto_(nome)||(anterior&&anterior.name)||campeonatoNomeAtivo_(),status:torneio.status||'ARQUIVADO',
  createdAt:(anterior&&anterior.createdAt)||torneio.createdAt||new Date(),startedAt:(anterior&&anterior.startedAt)||torneio.realizedAt||'',
  finishedAt:torneio.finalizedAt||'',drawId:torneio.id,teamSource:(anterior&&anterior.teamSource)||'MESMAS_EQUIPES',teamCount:equipes.length,
  bracketModel:(anterior&&anterior.bracketModel)||modeloCampeonatoAtivo_(),championId:torneio.championId||'',message:torneio.message||'',active:manterAtivo?'SIM':'NAO'
 };
 gravarRegistroCampeonato_(registro);if(!manterAtivo)desativarOutrosCampeonatos_('');
 return registro;
}
function montarRepescagemCinco_(equipes,seed){
 const t=embaralharDeterministico_(equipes,seed),r0={index:0,name:'FASE INICIAL',matches:[]},r1={index:1,name:'REPESCAGEM',matches:[]},r2={index:2,name:'SEMIFINAL',matches:[]},r3={index:3,name:'DECISÕES',matches:[]};
 const j1=criarJogoCompacto_(1,0,'FASE INICIAL'),j2=criarJogoCompacto_(2,0,'FASE INICIAL');j1.team1=t[0];j1.team2=t[1];j2.team1=t[2];j2.team2=t[3];j1.nextGame=4;j1.nextSlot=1;j2.nextGame=4;j2.nextSlot=2;r0.matches=[j1,j2];
 const rep=criarJogoCompacto_(3,1,'REPESCAGEM');rep.team1Placeholder='Perdedor Jogo 1';rep.team2Placeholder='Perdedor Jogo 2';rep.nextGame=5;rep.nextSlot=2;r1.matches=[rep];
 const s1=criarJogoCompacto_(4,2,'SEMIFINAL'),s2=criarJogoCompacto_(5,2,'SEMIFINAL');s1.team1Placeholder='Vencedor Jogo 1';s1.team2Placeholder='Vencedor Jogo 2';s2.team1=t[4];s2.team2Placeholder='Vencedor Jogo 3';s1.nextGame=6;s1.nextSlot=1;s2.nextGame=6;s2.nextSlot=2;r2.matches=[s1,s2];
 const f=criarJogoCompacto_(6,3,'FINAL'),terceiro=criarJogoCompacto_(7,3,'DISPUTA DE 3º LUGAR');f.team1Placeholder='Vencedor Jogo 4';f.team2Placeholder='Vencedor Jogo 5';terceiro.team1Placeholder='Perdedor Jogo 4';terceiro.team2Placeholder='Perdedor Jogo 5';r3.matches=[f,terceiro];
 j1.status='LIBERADO';j1.availableAt=new Date();return[r0,r1,r2,r3];
}
function montarChaveamentoPorModelo_(equipes,seed,modelo){modelo=texto_(modelo).toUpperCase();if(modelo==='REPESCAGEM_5'&&equipes.length===5)return montarRepescagemCinco_(equipes,seed);return montarChaveamento_(equipes,seed);}
function novoCampeonato_(p){
 const b=lock_();b.waitLock(20000);try{
  garantirEstruturaCampeonatos_();const atual=ultimoSorteio_();
  if(atual&&['SORTEADO','EM_ANDAMENTO','EM_CONTAGEM'].indexOf(atual.status)>=0)throw Error('O campeonato atual ainda não foi finalizado ou cancelado.');
  const equipesAtuais=lerEquipes_();if(equipesAtuais.length<2)throw Error('Não existem duplas suficientes para gerar um novo campeonato.');
  arquivarCampeonatoAtual_('',false);
  const modo=texto_(p.modoEquipes||'MESMAS_EQUIPES').toUpperCase(),equipes=modo==='NOVAS_DUPLAS'?formarEquipes_():equipesAtuais.map(e=>Object.assign({},e));
  const campeonatoId=gerarCampeonatoId_(),sorteioId=gerarId_('SOR'),nome=texto_(p.nome)||('Campeonato '+(listarCampeonatos_().length+1)),modelo=texto_(p.modelo||'AUTOMATICO').toUpperCase(),seed=Utilities.getUuid(),agora=new Date();
  const embaralhadas=embaralharDeterministico_(equipes,seed).map((e,i)=>Object.assign(e,{bracketOrder:i+1})),rounds=montarChaveamentoPorModelo_(embaralhadas,seed,modelo),audit=hash_(JSON.stringify({campeonatoId:campeonatoId,sorteioId:sorteioId,seed:seed,equipes:embaralhadas,rounds:rounds}));
  gravarEquipes_(embaralhadas);gravarChaveamento_(sorteioId,rounds);aba_(VOLEI.SHEETS.SORTEIOS).appendRow([sorteioId,'SORTEADO','','',agora,agora,agora,agora,seed,audit,'ADMIN','Novo campeonato criado.','','']);
  desativarOutrosCampeonatos_(campeonatoId);gravarRegistroCampeonato_({id:campeonatoId,name:nome,status:'SORTEADO',createdAt:agora,startedAt:agora,finishedAt:'',drawId:sorteioId,teamSource:modo,teamCount:embaralhadas.length,bracketModel:modelo,championId:'',message:'Novo campeonato criado com histórico preservado.',active:'SIM'});
  definirConfig_('CAMPEONATO_ATIVO_ID',campeonatoId,'Identificador da edição ativa');definirConfig_('CAMPEONATO_ATIVO_NOME',nome,'Nome da edição ativa');definirConfig_('CAMPEONATO_MODELO',modelo,'Modelo de chaveamento da edição ativa');
  log_('NOVO_CAMPEONATO',sorteioId,'PAINEL_WEB','ADMIN',campeonatoId+' | '+nome+' | '+modo+' | '+modelo,'INFO',campeonatoId);
  return{message:'Novo campeonato criado. O campeonato anterior foi preservado no histórico.',championship:localizarCampeonato_(campeonatoId),championships:listarCampeonatos_(),state:obterEstadoAdmin_()};
 }finally{b.releaseLock();}
}
function lerEquipesHistoricas_(campeonatoId){const s=aba_(VOLEI.SHEETS.HISTORICO_EQUIPES),l=s.getLastRow();if(l<2)return[];return s.getRange(2,1,l-1,HISTORICO_EQUIPES_HEADERS.length).getValues().filter(r=>texto_(r[0])===campeonatoId).map(r=>({id:texto_(r[2]),adultId:texto_(r[3]),adult:texto_(r[4]),adultScore:numero_(r[5]),adultIndex:numero_(r[6]),childId:texto_(r[7]),child:texto_(r[8]),childScore:numero_(r[9]),childIndex:numero_(r[10]),totalIndex:numero_(r[11]),balanceOrder:numero_(r[12]),bracketOrder:numero_(r[13])}));}
function lerRoundsHistoricos_(campeonatoId,equipes){const s=aba_(VOLEI.SHEETS.HISTORICO_CHAVEAMENTO),l=s.getLastRow();if(l<2)return[];const eq={};equipes.forEach(e=>eq[e.id]=e);const g={};s.getRange(2,1,l-1,HISTORICO_CHAVEAMENTO_HEADERS.length).getValues().filter(r=>texto_(r[0])===campeonatoId).forEach(h=>{const r=h.slice(1),i=numero_(r[19]);if(!g[i])g[i]={index:i,name:texto_(r[2])||'RODADA '+(i+1),matches:[]};let scores;try{scores=r[23]?JSON.parse(texto_(r[23])):placarVazio_();}catch(ignore){scores=placarVazio_();}g[i].matches.push({game:numero_(r[1]),roundIndex:i,phase:texto_(r[2]),team1:r[3]?eq[texto_(r[3])]||{id:texto_(r[3]),adult:texto_(r[4]),child:''}:null,team2:r[5]?eq[texto_(r[5])]||{id:texto_(r[5]),adult:texto_(r[6]),child:''}:null,team1Placeholder:!r[3]?texto_(r[4]):'',team2Placeholder:!r[5]?texto_(r[6]):'',scores:scores,sets1:numero_(r[13]),sets2:numero_(r[14]),winnerId:texto_(r[15]),status:texto_(r[16]),finishedAt:r[17]||'',availableAt:r[18]||'',nextGame:numero_(r[20]),nextSlot:numero_(r[21]),startedAt:r[22]||''});});return Object.keys(g).map(Number).sort((a,b)=>a-b).map(k=>{g[k].matches.sort((a,b)=>a.game-b.game);return g[k];});}
function abrirCampeonato_(id){const c=localizarCampeonato_(id);if(!c)throw Error('Campeonato não encontrado.');if(c.active==='SIM'&&id===campeonatoIdAtivo_())return obterEstadoAdmin_();const teams=lerEquipesHistoricas_(id),rounds=lerRoundsHistoricos_(id,teams);return{version:VOLEI.VERSION,title:c.name,status:c.status,message:c.message,serverTime:new Date(),players:[],teams:teams,rounds:rounds,auditHash:'',championship:c,historyMode:true};}
function atualizarCampeonatoFinalizado_(){const id=campeonatoIdAtivo_();if(!id)return null;return arquivarCampeonatoAtual_(campeonatoNomeAtivo_(),true);}
