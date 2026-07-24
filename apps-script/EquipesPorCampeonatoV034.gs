/** EQUIPES POR CAMPEONATO — TODOS OS STATUS + SNAPSHOT DESDE A CRIAÇÃO — V034 */
const EQ34_CACHE='VOLEI_EQUIPES_CAMPEONATOS_V034';

function eq34ChaveNome_(v){
  let s=texto_(v).toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
  try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(ignore){}
  return s;
}
function eq34AdicionarNome_(lista,vistos,valor){
  const bruto=texto_(valor);if(!bruto)return;
  bruto.split(/\s*\+\s*/).forEach(parte=>{
    const nome=texto_(parte);if(!nome)return;
    const chave=eq34ChaveNome_(nome);if(!chave||vistos[chave])return;
    vistos[chave]=true;lista.push(nome);
  });
}
function eq34EquipePublica_(e){
  if(!e)return null;
  const membros=[],vistos={};
  if(Array.isArray(e.members))e.members.forEach(m=>eq34AdicionarNome_(membros,vistos,typeof m==='string'?m:m&&m.name));
  ['adult','child','member1','member2','jogador1','jogador2'].forEach(k=>eq34AdicionarNome_(membros,vistos,e[k]));
  if(!membros.length&&e.name)eq34AdicionarNome_(membros,vistos,e.name);
  return{id:texto_(e.id),name:texto_(e.name)||membros.join(' + ')||'Equipe',members:membros,teamSize:numero_(e.teamSize)||membros.length};
}
function eq34SnapshotAtivo_(){
  try{
    const id=campeonatoIdAtivo_();if(!id)return false;
    const s=aba_(VOLEI.SHEETS.EQUIPES),l=s.getLastRow();if(l<2)return false;
    const rows=s.getRange(2,1,l-1,12).getValues().filter(r=>r[0]);if(!rows.length)return false;
    const campeonato=localizarCampeonato_(id),sorteio=ultimoSorteio_(),drawId=texto_(campeonato&&campeonato.drawId)||texto_(sorteio&&sorteio.id);
    const assinatura=hash_(JSON.stringify(rows));
    const props=PropertiesService.getScriptProperties(),key='EQ34_SNAPSHOT_'+id;
    if(props.getProperty(key)===assinatura)return false;
    substituirHistorico_(VOLEI.SHEETS.HISTORICO_EQUIPES,id,HISTORICO_EQUIPES_HEADERS.length,rows.map(r=>[id,drawId].concat(r)));
    props.setProperty(key,assinatura);
    const cache=CacheService.getScriptCache();cache.remove(EQ34_CACHE);try{cache.remove('VOLEI_EQUIPES_CAMPEONATOS_V032');}catch(ignore){}
    return true;
  }catch(err){
    try{log_('EQ34_SNAPSHOT_FALHA','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO','EQUIPES');}catch(ignore){}
    return false;
  }
}
function eq34CampeonatosEquipes_(){
  eq34SnapshotAtivo_();
  const cache=CacheService.getScriptCache();try{const cached=cache.get(EQ34_CACHE);if(cached)return JSON.parse(cached);}catch(ignore){}
  const campeonatos=listarCampeonatos_(),ativo=campeonatoIdAtivo_(),historico={};
  try{
    const s=aba_(VOLEI.SHEETS.HISTORICO_EQUIPES),l=s.getLastRow();
    if(l>=2)s.getRange(2,1,l-1,HISTORICO_EQUIPES_HEADERS.length).getValues().filter(r=>r[0]&&r[2]).forEach(r=>{
      const id=texto_(r[0]),e=eq34EquipePublica_(equipeHistoricaLinhaV022_(r));if(!e)return;
      if(!historico[id])historico[id]={};
      const chave=texto_(e.id)||eq34ChaveNome_(e.name);historico[id][chave]=e;
    });
  }catch(err){try{log_('EQ34_HISTORICO_FALHA','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO','EQUIPES');}catch(ignore){}}
  const atuais=(lerEquipes_()||[]).map(eq34EquipePublica_).filter(Boolean);
  const lista=campeonatos.map(c=>{
    const hist=Object.values(historico[c.id]||{}),ehAtivo=c.id===ativo||texto_(c.active)==='SIM',teams=ehAtivo&&atuais.length?atuais:hist;
    return{id:c.id,name:c.name,status:c.status,active:ehAtivo,createdAt:c.createdAt||'',startedAt:c.startedAt||'',finishedAt:c.finishedAt||'',teamCount:teams.length||numero_(c.teamCount),teams:teams};
  });
  if(ativo&&!lista.some(c=>c.id===ativo)){
    const campeonato=localizarCampeonato_(ativo);
    lista.unshift({id:ativo,name:campeonato&&campeonato.name||campeonatoNomeAtivo_(),status:campeonato&&campeonato.status||'SORTEADO',active:true,createdAt:campeonato&&campeonato.createdAt||'',startedAt:campeonato&&campeonato.startedAt||'',finishedAt:campeonato&&campeonato.finishedAt||'',teamCount:atuais.length,teams:atuais});
  }
  try{cache.put(EQ34_CACHE,JSON.stringify(lista),20);}catch(ignore){}
  return lista;
}
function flexAnexarEstadoVolei_(e,admin){
  const base=flexVoleiRankingGlobal_(e);
  e.globalRankingPoints=flexOrdenarRanking_(base,'PONTOS');
  e.globalRankingWinRate=flexOrdenarRanking_(base,'APROVEITAMENTO');
  e.globalRankingIndex=typeof flexRankingIndiceV024_==='function'?flexRankingIndiceV024_(base):[];
  e.globalRankingTotalGames=base.reduce((t,x)=>t+x.games,0);
  e.championshipEditable=flexVoleiNaoIniciado_()&&!!e.championship&&texto_(e.championship.active)==='SIM';
  e.championshipTeams=eq34CampeonatosEquipes_();
  if(admin&&typeof flexVoleiLerAvulsos_==='function')e.freeMatches=flexVoleiLerAvulsos_();
  return e;
}
