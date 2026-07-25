/** TÊNIS DE MESA — EDIÇÃO SEGURA DO HISTÓRICO CONSOLIDADO — V055 */
function tm55EditarHistorico_(p){
  const id=texto_(p.id||p.registroId||p.recordId);
  if(!id)throw Error('Lançamento histórico não informado.');

  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),players=tm54PlayersBook_(book),map={};
  players.forEach(j=>map[j.id]=j);

  const a=texto_(p.jogadorA||p.playerAId),b=texto_(p.jogadorB||p.playerBId),games=numero_(p.confrontos||p.games),winsA=numero_(p.vitoriasA||p.winsA),winsB=numero_(p.vitoriasB||p.winsB),base=numero_(p.pontosBase||p.basePoints),lead=2,origin=texto_(p.origem||p.origin||'AVULSO').toUpperCase();
  if(!map[a]||!map[b]||a===b)throw Error('Selecione dois participantes diferentes.');
  if(!Number.isInteger(games)||games<1)throw Error('Informe a quantidade de confrontos.');
  if(!Number.isInteger(winsA)||winsA<0||!Number.isInteger(winsB)||winsB<0)throw Error('Informe corretamente as vitórias de cada participante.');
  if(winsA+winsB!==games)throw Error('A soma das vitórias precisa ser igual à quantidade de confrontos.');
  if([5,11].indexOf(base)<0)throw Error('Selecione 5 ou 11 pontos como pontuação-base.');
  if(['AVULSO','CAMPEONATO'].indexOf(origin)<0)throw Error('Selecione Jogos avulsos ou Campeonato.');

  let championshipId='',championshipName='';
  if(origin==='CAMPEONATO'){
    championshipId=texto_(p.campeonatoId||p.championshipId);
    const champs=tm54ChampsBook_(book),champ=champs.find(c=>c.id===championshipId);
    if(!champ)throw Error('Selecione o campeonato do histórico.');
    const ps=tm51Sheet_(book,TM_SHEETS.PARTICIPANTES),ids=tm51Rows_(ps,TM_HEADERS.PARTICIPANTES.length).filter(r=>texto_(r[0])===championshipId).map(r=>texto_(r[1]));
    if(ids.indexOf(a)<0||ids.indexOf(b)<0)throw Error('Os dois participantes precisam pertencer ao campeonato selecionado.');
    championshipName=champ.name;
  }

  const s=tm54Sheet_(book,false);
  if(!s||s.getLastRow()<2)throw Error('Lançamento histórico não encontrado.');
  const ids=s.getRange(2,1,s.getLastRow()-1,1).getDisplayValues().map(r=>texto_(r[0])),index=ids.indexOf(id);
  if(index<0)throw Error('Lançamento histórico não encontrado.');

  const rowIndex=index+2,old=s.getRange(rowIndex,1,1,TM54_HEADERS.length).getValues()[0],createdAt=old[12]||new Date();
  const row=[id,a,map[a].name,b,map[b].name,games,winsA,winsB,base,lead,1,0,createdAt,texto_(p.observacao||p.observation),origin,championshipId,championshipName];
  s.getRange(rowIndex,1,1,TM54_HEADERS.length).setValues([row]);

  try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  try{if(typeof tm54LimparMemo_==='function')tm54LimparMemo_();}catch(ignore){}
  return{message:'Lançamento histórico atualizado.',record:tm53Registro_(row),state:tm53Estado_()};
}
function tm55ResponderEditar_(p){
  try{tm51ExigirAdminRapido_(p.chave);return responder_({ok:true,dados:tm55EditarHistorico_(p),versao:'V055',dataHora:formatarData_(new Date())},p.callback);}
  catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V055',dataHora:formatarData_(new Date())},p.callback);}
}
