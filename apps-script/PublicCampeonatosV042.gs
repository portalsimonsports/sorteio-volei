/** ENDPOINT PÚBLICO LEVE — CAMPEONATOS E EQUIPES — V042 */
function pc42Responder_(p){
  try{
    const dados=typeof eq34CampeonatosEquipes_==='function'?eq34CampeonatosEquipes_():[];
    return responder_({ok:true,dados:dados,versao:VOLEI.VERSION,dataHora:formatarData_(new Date())},p.callback);
  }catch(err){
    return responder_({ok:false,erro:mensagemErro_(err),versao:VOLEI.VERSION,dataHora:formatarData_(new Date())},p.callback);
  }
}
function doGet(e){
  const p=e&&e.parameter||{};
  if(texto_(p.acao)==='publicCampeonatos')return pc42Responder_(p);
  return executarApi_(p);
}
function doPost(e){
  let b={};
  try{if(e&&e.postData&&e.postData.contents)b=JSON.parse(e.postData.contents);}catch(ignore){}
  const p=Object.assign({},e&&e.parameter||{},b||{});
  if(texto_(p.acao)==='publicCampeonatos')return pc42Responder_(p);
  return executarApi_(p);
}
