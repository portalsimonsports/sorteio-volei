/** Criação segura da nova edição — carregado após Campeonatos.gs */
function novoCampeonato_(p){
 const b=lock_();b.waitLock(30000);
 try{
  garantirEstruturaCampeonatos_();
  const atual=ultimoSorteio_();
  if(atual&&['SORTEADO','EM_ANDAMENTO','EM_CONTAGEM'].indexOf(atual.status)>=0)throw Error('O campeonato atual ainda não foi finalizado ou cancelado.');
  const equipesAtuais=lerEquipes_();
  if(equipesAtuais.length<2)throw Error('Não existem equipes suficientes para gerar um novo campeonato.');
  const cfg=configCompeticaoV022_(p),modo=texto_(p.modoEquipes||'MESMAS_EQUIPES').toUpperCase();
  if(modo==='MESMAS_EQUIPES'&&equipesAtuais.some(e=>tamanhoEquipeV022_(e)!==cfg.teamSize))throw Error('As equipes atuais não possuem '+cfg.teamSize+' participantes. Escolha formar novas equipes ou mantenha o tamanho atual.');
  const base=modo==='NOVAS_DUPLAS'?formarEquipesTamanhoV022_(cfg.teamSize):recalcularEquipesFlexiveisV022_(equipesAtuais),equipes=ordenarCabecasChave_(base);
  const seed=Utilities.getUuid(),rounds=montarCompeticaoV022_(equipes,seed,cfg);
  arquivarCampeonatoAtual_('',false);
  salvarConfigCompeticaoV022_(cfg);
  const campeonatoId=gerarCampeonatoId_(),sorteioId=gerarId_('SOR'),nome=texto_(p.nome)||('Campeonato '+(listarCampeonatos_().length+1)),agora=new Date(),modelo=modeloSerializadoV022_(cfg),audit=hash_(JSON.stringify({campeonatoId:campeonatoId,sorteioId:sorteioId,seed:seed,criterio:'EQUILIBRIO_INDICE_FORMATO_V022',config:cfg,equipes:equipes,rounds:rounds}));
  gravarEquipes_(equipes);gravarChaveamento_(sorteioId,rounds);
  aba_(VOLEI.SHEETS.SORTEIOS).appendRow([sorteioId,'SORTEADO','','',agora,agora,agora,agora,seed,audit,'ADMIN','Novo campeonato criado: '+cfg.format+' com equipes de '+cfg.teamSize+'.','','']);
  desativarOutrosCampeonatos_(campeonatoId);
  gravarRegistroCampeonato_({id:campeonatoId,name:nome,status:'SORTEADO',createdAt:agora,startedAt:agora,finishedAt:'',drawId:sorteioId,teamSource:modo,teamCount:equipes.length,bracketModel:modelo,championId:'',message:'Equipes de '+cfg.teamSize+' participantes • '+(cfg.format==='TODOS_CONTRA_TODOS'?'todos contra todos':'mata-mata')+' • melhor de '+cfg.bestOf+'.',active:'SIM'});
  definirConfig_('CAMPEONATO_ATIVO_ID',campeonatoId,'Identificador da edição ativa');definirConfig_('CAMPEONATO_ATIVO_NOME',nome,'Nome da edição ativa');definirConfig_('CAMPEONATO_MODELO',modelo,'Configuração completa da edição ativa');
  log_('NOVO_CAMPEONATO',sorteioId,'PAINEL_WEB','ADMIN',campeonatoId+' | '+nome+' | equipes '+cfg.teamSize+' | '+cfg.format+' | melhor de '+cfg.bestOf,'INFO',campeonatoId);
  return{message:'Novo campeonato criado com '+equipes.length+' equipes de '+cfg.teamSize+' participantes.',championship:localizarCampeonato_(campeonatoId),championships:listarCampeonatos_(),state:obterEstadoAdmin_()};
 }finally{b.releaseLock();}
}
