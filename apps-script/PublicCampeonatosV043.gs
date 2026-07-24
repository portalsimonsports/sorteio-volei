/** ENDPOINT PÚBLICO DIRETO — CAMPEONATOS E EQUIPES — V043 */
function pc43StatusAberto_(status){
  const s=texto_(status).toUpperCase();
  return ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].indexOf(s)>=0;
}
function pc43EquipeLinha_(r,offset){
  offset=numero_(offset||0);
  const id=texto_(r[offset]),adultId=texto_(r[offset+1]),adult=texto_(r[offset+2]),childId=texto_(r[offset+5]),child=texto_(r[offset+6]);
  if(!id)return null;
  const membros=[],vistos={};
  function add(valor){
    texto_(valor).split(/\s*\+\s*/).forEach(nome=>{
      nome=texto_(nome);if(!nome)return;
      const k=nome.toLocaleLowerCase('pt-BR');if(vistos[k])return;
      vistos[k]=true;membros.push(nome);
    });
  }
  add(adult);add(child);
  return{id:id,name:membros.join(' + ')||adult||child||id,members:membros,teamSize:Math.max(1,membros.length),memberIds:[adultId,childId].filter(Boolean)};
}
function pc43Lista_(){
  garantirEstruturaCampeonatos_();
  const campSheet=aba_(VOLEI.SHEETS.CAMPEONATOS),cl=campSheet.getLastRow();
  if(cl<2)return[];
  const campRows=campSheet.getRange(2,1,cl-1,CAMPEONATOS_HEADERS.length).getValues().filter(r=>r[0]);
  const porCampeonato={};
  try{
    const hist=aba_(VOLEI.SHEETS.HISTORICO_EQUIPES),hl=hist.getLastRow();
    if(hl>=2)hist.getRange(2,1,hl-1,HISTORICO_EQUIPES_HEADERS.length).getValues().forEach(r=>{
      const cid=texto_(r[0]);if(!cid||!r[2])return;
      const e=pc43EquipeLinha_(r,2);if(!e)return;
      if(!porCampeonato[cid])porCampeonato[cid]={};
      porCampeonato[cid][e.id]=e;
    });
  }catch(ignore){}
  let atuais=[];
  try{
    const eq=aba_(VOLEI.SHEETS.EQUIPES),el=eq.getLastRow();
    if(el>=2)atuais=eq.getRange(2,1,el-1,12).getValues().map(r=>pc43EquipeLinha_(r,0)).filter(Boolean);
  }catch(ignore){}
  const lista=campRows.map(r=>{
    const id=texto_(r[0]),status=texto_(r[2]),active=texto_(r[12]).toUpperCase()==='SIM';
    let teams=Object.values(porCampeonato[id]||{});
    if(active&&atuais.length)teams=atuais;
    return{id:id,name:texto_(r[1])||'Campeonato',status:status,active:active,createdAt:r[3]||'',startedAt:r[4]||'',finishedAt:r[5]||'',teamCount:numero_(r[8])||teams.length,teams:teams};
  });
  lista.sort((a,b)=>{
    if(a.active!==b.active)return a.active?-1:1;
    const ao=pc43StatusAberto_(a.status),bo=pc43StatusAberto_(b.status);if(ao!==bo)return ao?-1:1;
    const da=interpretarData_(a.createdAt),db=interpretarData_(b.createdAt);return(db?db.getTime():0)-(da?da.getTime():0);
  });
  return lista;
}
function pc43Responder_(p){
  try{return responder_({ok:true,dados:pc43Lista_(),versao:VOLEI.VERSION,dataHora:formatarData_(new Date())},p.callback);}
  catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:VOLEI.VERSION,dataHora:formatarData_(new Date())},p.callback);}
}
function doGet(e){
  const p=e&&e.parameter||{};
  if(texto_(p.acao)==='publicCampeonatos')return pc43Responder_(p);
  return executarApi_(p);
}
function doPost(e){
  let b={};try{if(e&&e.postData&&e.postData.contents)b=JSON.parse(e.postData.contents);}catch(ignore){}
  const p=Object.assign({},e&&e.parameter||{},b||{});
  if(texto_(p.acao)==='publicCampeonatos')return pc43Responder_(p);
  return executarApi_(p);
}
