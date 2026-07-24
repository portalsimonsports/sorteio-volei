/** EQUIPES AGRUPADAS POR CAMPEONATO NA PÁGINA PÚBLICA — V032 */
const EQ32_CACHE='VOLEI_EQUIPES_CAMPEONATOS_V032';
function eq32EquipePublica_(e){
 if(!e)return null;
 const membros=[];
 if(Array.isArray(e.members))e.members.forEach(m=>{const n=texto_(typeof m==='string'?m:m&&m.name);if(n)membros.push(n);});
 if(!membros.length){const adulto=texto_(e.adult),crianca=texto_(e.child);if(adulto)adulto.split(/\s*\+\s*/).forEach(n=>{n=texto_(n);if(n)membros.push(n);});if(crianca)membros.push(crianca);}
 return{id:texto_(e.id),name:texto_(e.name)||membros.join(' + ')||'Equipe',members:Array.from(new Set(membros)),teamSize:numero_(e.teamSize)||membros.length};
}
function eq32CampeonatosEquipes_(){
 const cache=CacheService.getScriptCache();try{const cached=cache.get(EQ32_CACHE);if(cached)return JSON.parse(cached);}catch(ignore){}
 const campeonatos=listarCampeonatos_(),ativo=campeonatoIdAtivo_(),historico={};
 try{const s=aba_(VOLEI.SHEETS.HISTORICO_EQUIPES),l=s.getLastRow();if(l>=2)s.getRange(2,1,l-1,HISTORICO_EQUIPES_HEADERS.length).getValues().filter(r=>r[0]&&r[2]).forEach(r=>{const id=texto_(r[0]);if(!historico[id])historico[id]=[];historico[id].push(eq32EquipePublica_(equipeHistoricaLinhaV022_(r)));});}catch(ignore){}
 const atuais=(lerEquipes_()||[]).map(eq32EquipePublica_).filter(Boolean);
 const lista=campeonatos.map(c=>({id:c.id,name:c.name,status:c.status,active:c.id===ativo||texto_(c.active)==='SIM',createdAt:c.createdAt||'',teamCount:c.id===ativo?atuais.length:numero_(c.teamCount),teams:(c.id===ativo?atuais:(historico[c.id]||[])).filter(Boolean)}));
 if(ativo&&!lista.some(c=>c.id===ativo))lista.unshift({id:ativo,name:campeonatoNomeAtivo_(),status:texto_(ultimoSorteio_()&&ultimoSorteio_().status)||'SORTEADO',active:true,createdAt:'',teamCount:atuais.length,teams:atuais});
 try{cache.put(EQ32_CACHE,JSON.stringify(lista),20);}catch(ignore){}
 return lista;
}
function flexAnexarEstadoVolei_(e,admin){
 const base=flexVoleiRankingGlobal_(e);e.globalRankingPoints=flexOrdenarRanking_(base,'PONTOS');e.globalRankingWinRate=flexOrdenarRanking_(base,'APROVEITAMENTO');e.globalRankingIndex=typeof flexRankingIndiceV024_==='function'?flexRankingIndiceV024_(base):[];e.globalRankingTotalGames=base.reduce((t,x)=>t+x.games,0);e.championshipEditable=flexVoleiNaoIniciado_()&&!!e.championship&&texto_(e.championship.active)==='SIM';e.championshipTeams=eq32CampeonatosEquipes_();if(admin&&typeof flexVoleiLerAvulsos_==='function')e.freeMatches=flexVoleiLerAvulsos_();return e;
}
