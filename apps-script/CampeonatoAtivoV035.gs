/** RESOLUÇÃO ROBUSTA DO CAMPEONATO ATUAL — V035 */
function v035StatusAberto_(status){
 const s=texto_(status).toUpperCase();
 return ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].indexOf(s)>=0;
}
function v035ResolverCampeonatoAtual_(){
 const lista=listarCampeonatos_();
 if(!lista.length)return null;
 const configId=texto_(obterConfig_().CAMPEONATO_ATIVO_ID),config=lista.find(c=>c.id===configId)||null;
 const aberto=lista.find(c=>v035StatusAberto_(c.status));
 const marcado=lista.find(c=>texto_(c.active).toUpperCase()==='SIM'&&texto_(c.status).toUpperCase()!=='CANCELADO');
 return aberto||marcado||config||lista[0]||null;
}
function v035SincronizarCampeonatoAtual_(){
 const atual=v035ResolverCampeonatoAtual_();if(!atual)return null;
 try{
  const cfg=obterConfig_();
  if(texto_(cfg.CAMPEONATO_ATIVO_ID)!==atual.id)definirConfig_('CAMPEONATO_ATIVO_ID',atual.id,'Identificador da edição ativa');
  if(texto_(cfg.CAMPEONATO_ATIVO_NOME)!==atual.name)definirConfig_('CAMPEONATO_ATIVO_NOME',atual.name,'Nome da edição ativa');
  const s=aba_(VOLEI.SHEETS.CAMPEONATOS),l=s.getLastRow();
  if(l>=2){
   const d=s.getRange(2,1,l-1,CAMPEONATOS_HEADERS.length).getValues();let mudou=false;
   d.forEach(r=>{if(!r[0])return;const desejado=texto_(r[0])===atual.id?'SIM':'NAO';if(texto_(r[12])!==desejado){r[12]=desejado;mudou=true;}});
   if(mudou)s.getRange(2,1,d.length,CAMPEONATOS_HEADERS.length).setValues(d);
  }
 }catch(err){try{log_('V035_ATIVO_SYNC_FALHA','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO',atual.id);}catch(ignore){}}
 return atual;
}
function campeonatoIdAtivo_(){const c=v035SincronizarCampeonatoAtual_();return c?c.id:'';}
function campeonatoNomeAtivo_(){const c=v035ResolverCampeonatoAtual_();return c?c.name:'Campeonato de Vôlei';}
function flexAnexarEstadoVolei_(e,admin){
 const atual=v035SincronizarCampeonatoAtual_();
 if(atual){
  e.championship=atual;
  const s=texto_(atual.status).toUpperCase();
  if(s==='NAO_INICIADO')e.status='SORTEADO';else if(s)e.status=s;
  if(atual.message)e.message=atual.message;
 }
 const base=flexVoleiRankingGlobal_(e);
 e.globalRankingPoints=flexOrdenarRanking_(base,'PONTOS');
 e.globalRankingWinRate=flexOrdenarRanking_(base,'APROVEITAMENTO');
 e.globalRankingIndex=typeof flexRankingIndiceV024_==='function'?flexRankingIndiceV024_(base):[];
 e.globalRankingTotalGames=base.reduce((t,x)=>t+x.games,0);
 e.championshipEditable=!!atual&&v035StatusAberto_(atual.status)&&flexVoleiNaoIniciado_();
 e.championshipTeams=typeof eq34CampeonatosEquipes_==='function'?eq34CampeonatosEquipes_():[];
 if(admin&&typeof flexVoleiLerAvulsos_==='function')e.freeMatches=flexVoleiLerAvulsos_();
 return e;
}
