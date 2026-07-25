/** TÊNIS DE MESA — EXCLUSÃO DE JOGOS AVULSOS E RECÁLCULO DOS RANKINGS — V066 */
function tm66ExcluirJogoAvulso_(p){
  const id=texto_(p&&p.id);
  if(!id)throw Error('Jogo avulso não informado.');
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID);
  const sheet=book.getSheetByName(FLEX_V023.TM_AVULSOS);
  if(!sheet||sheet.getLastRow()<2)throw Error('Jogo avulso não encontrado.');
  const width=FLEX_V023.TM_HEADERS.length;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues();
  const index=rows.findIndex(r=>texto_(r[0])===id);
  if(index<0)throw Error('Jogo avulso não encontrado.');
  const row=rows[index];
  const status=texto_(row[3]).toUpperCase();
  const confronto=[texto_(row[5]),texto_(row[7])].filter(Boolean).join(' × ');
  sheet.deleteRow(index+2);
  try{CacheService.getScriptCache().remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}
  return{
    message:(status==='FINALIZADO'?'Jogo, placar e resultado excluídos':'Jogo avulso excluído')+(confronto?' — '+confronto:'')+'. Todos os rankings foram recalculados.',
    deletedId:id,
    state:tmObterEstado_(true)
  };
}
function tm66ResponderExcluirJogoAvulso_(p){
  try{
    if(typeof tm51ExigirAdminRapido_==='function')tm51ExigirAdminRapido_(p.chave);
    else exigirAdmin_(p.chave);
    return responder_({ok:true,dados:tm66ExcluirJogoAvulso_(p),versao:'V066',dataHora:formatarData_(new Date())},p.callback);
  }catch(err){
    return responder_({ok:false,erro:mensagemErro_(err),versao:'V066',dataHora:formatarData_(new Date())},p.callback);
  }
}
