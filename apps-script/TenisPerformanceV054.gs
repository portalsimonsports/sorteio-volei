/** TÊNIS DE MESA — MEMÓRIA CURTA POR EXECUÇÃO PARA EVITAR LEITURAS DUPLICADAS — V054 */
var TM54_DATA_MEMO_=null;
var TM54_DATA_MEMO_AT_=0;
function tm54Data_(){
  const now=Date.now();
  if(TM54_DATA_MEMO_&&now-TM54_DATA_MEMO_AT_<800)return TM54_DATA_MEMO_;
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),players=tm54PlayersBook_(book),champs=tm54ChampsBook_(book),participants=tm51Rows_(tm51Sheet_(book,TM_SHEETS.PARTICIPANTES),TM_HEADERS.PARTICIPANTES.length),games=tm51Rows_(tm51Sheet_(book,TM_SHEETS.JOGOS),TM_HEADERS.JOGOS.length).filter(r=>r[0]).map(pa31TmGame_),free=tm51Rows_(tm51Sheet_(book,FLEX_V023.TM_AVULSOS),FLEX_V023.TM_HEADERS.length).filter(r=>r[0]).map(pa31TmFree_),manual=tm53RowsBook_(book,false).map(tm53Registro_);
  TM54_DATA_MEMO_={players:players,champs:champs,participants:participants,games:games,free:free,manual:manual};TM54_DATA_MEMO_AT_=now;return TM54_DATA_MEMO_;
}
function tm54LimparMemo_(){TM54_DATA_MEMO_=null;TM54_DATA_MEMO_AT_=0;}
