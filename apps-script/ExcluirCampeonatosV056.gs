/** EXCLUSÃO CONTROLADA DE CAMPEONATOS — V056 */
function ec56FiltrarAba_(book,nome,largura,predicado){
  const s=book.getSheetByName(nome);if(!s||s.getLastRow()<2)return 0;
  const qtd=s.getLastRow()-1,dados=s.getRange(2,1,qtd,largura).getValues(),mantidas=[];let removidas=0;
  dados.forEach(r=>{const preenchida=r.some(v=>v!==''&&v!=null);if(!preenchida)return;if(predicado(r)){removidas++;}else mantidas.push(r);});
  s.getRange(2,1,qtd,largura).clearContent();
  if(mantidas.length)s.getRange(2,1,mantidas.length,largura).setValues(mantidas);
  return removidas;
}
function ec56LimparCorpo_(book,nome,largura){const s=book.getSheetByName(nome);if(!s||s.getLastRow()<2)return 0;const qtd=s.getLastRow()-1;s.getRange(2,1,qtd,Math.min(largura,s.getMaxColumns())).clearContent();return qtd;}
function ec56LimparCaches_(){try{const c=CacheService.getScriptCache();if(typeof PA31_CACHE!=='undefined'&&PA31_CACHE&&PA31_CACHE.TM_PUBLIC)c.remove(PA31_CACHE.TM_PUBLIC);}catch(ignore){}}

function ec56ExcluirVolei_(id){
  id=texto_(id);if(!id)throw Error('Campeonato não informado.');garantirEstrutura_();
  const campeonato=localizarCampeonato_(id);if(!campeonato)throw Error('Campeonato de vôlei não encontrado.');
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),ativo=id===campeonatoIdAtivo_()||texto_(campeonato.active).toUpperCase()==='SIM',sorteioId=texto_(campeonato.drawId);
  const jogosHistoricos=ec56FiltrarAba_(book,VOLEI.SHEETS.HISTORICO_CHAVEAMENTO,HISTORICO_CHAVEAMENTO_HEADERS.length,r=>texto_(r[0])===id);
  const equipesHistoricas=ec56FiltrarAba_(book,VOLEI.SHEETS.HISTORICO_EQUIPES,HISTORICO_EQUIPES_HEADERS.length,r=>texto_(r[0])===id);
  const registrosCampeonato=ec56FiltrarAba_(book,VOLEI.SHEETS.CAMPEONATOS,CAMPEONATOS_HEADERS.length,r=>texto_(r[0])===id);
  const sorteios=sorteioId?ec56FiltrarAba_(book,VOLEI.SHEETS.SORTEIOS,VOLEI.HEADERS.SORTEIOS.length,r=>texto_(r[0])===sorteioId):0;
  let jogosAtuais=0,equipesAtuais=0;
  if(ativo){
    jogosAtuais=ec56LimparCorpo_(book,VOLEI.SHEETS.CHAVEAMENTO,VOLEI.HEADERS.CHAVEAMENTO.length);
    equipesAtuais=ec56LimparCorpo_(book,VOLEI.SHEETS.EQUIPES,VOLEI.HEADERS.EQUIPES.length);
    definirConfig_('CAMPEONATO_ATIVO_ID','','Identificador da edição ativa');
    definirConfig_('CAMPEONATO_ATIVO_NOME','','Nome da edição ativa');
    definirConfig_('CAMPEONATO_MODELO','','Configuração completa da edição ativa');
  }
  try{atualizarIndicesHistoricos_();}catch(err){log_('EXCLUSAO_CAMPEONATO_RECALCULO_FALHOU',sorteioId,'PAINEL_WEB','ADMIN',mensagemErro_(err),'AVISO',id);}
  ec56LimparCaches_();
  log_('CAMPEONATO_EXCLUIDO',sorteioId,'PAINEL_WEB','ADMIN',id+' | '+campeonato.name+' | jogos históricos '+jogosHistoricos+' | jogos atuais '+jogosAtuais,'INFO',id);
  return{message:'Campeonato de vôlei excluído. Jogos relacionados removidos e rankings recalculados.',deleted:{championships:registrosCampeonato,historicalGames:jogosHistoricos,currentGames:jogosAtuais,historicalTeams:equipesHistoricas,currentTeams:equipesAtuais,draws:sorteios},championships:listarCampeonatos_(),state:obterEstadoAdmin_()};
}

function ec56ExcluirTenis_(id){
  id=texto_(id);if(!id)throw Error('Campeonato não informado.');tmGarantirEstrutura_();
  const campeonato=tmLocalizarCampeonato_(id);if(!campeonato)throw Error('Campeonato de tênis de mesa não encontrado.');
  const book=SpreadsheetApp.openById(VOLEI.SPREADSHEET_ID),ativo=texto_(props_().getProperty('TM_CAMPEONATO_ATIVO'))===id;
  const jogos=ec56FiltrarAba_(book,TM_SHEETS.JOGOS,TM_HEADERS.JOGOS.length,r=>texto_(r[0])===id);
  const participantes=ec56FiltrarAba_(book,TM_SHEETS.PARTICIPANTES,TM_HEADERS.PARTICIPANTES.length,r=>texto_(r[0])===id);
  const ranking=ec56FiltrarAba_(book,TM_SHEETS.RANKING,TM_HEADERS.RANKING.length,r=>texto_(r[0])===id);
  const campeonatos=ec56FiltrarAba_(book,TM_SHEETS.CAMPEONATOS,TM_HEADERS.CAMPEONATOS.length,r=>texto_(r[0])===id);
  let historicos=0,confrontosHistoricos=0;
  const hs=book.getSheetByName(typeof TM53_SHEET!=='undefined'?TM53_SHEET:'TM_HISTORICO_MANUAL');
  if(hs&&hs.getLastRow()>=2){
    const largura=Math.max(17,typeof TM54_HEADERS!=='undefined'?TM54_HEADERS.length:17),dados=hs.getRange(2,1,hs.getLastRow()-1,Math.min(largura,hs.getMaxColumns())).getValues();
    dados.forEach(r=>{if(texto_(r[14]).toUpperCase()==='CAMPEONATO'&&texto_(r[15])===id)confrontosHistoricos+=numero_(r[5]);});
    historicos=ec56FiltrarAba_(book,hs.getName(),Math.min(largura,hs.getMaxColumns()),r=>texto_(r[14]).toUpperCase()==='CAMPEONATO'&&texto_(r[15])===id);
  }
  const restantes=tmLerCampeonatos_();
  if(ativo){const proximo=restantes.length?restantes[restantes.length-1]:null;if(proximo)props_().setProperty('TM_CAMPEONATO_ATIVO',proximo.id);else props_().deleteProperty('TM_CAMPEONATO_ATIVO');}
  restantes.forEach(c=>{try{tmAtualizarRanking_(c.id);}catch(ignore){}});
  ec56LimparCaches_();
  return{message:'Campeonato de tênis de mesa excluído. Jogos, vínculos e históricos relacionados foram removidos e os rankings atualizados.',deleted:{championships:campeonatos,games:jogos,participants:participantes,rankingRows:ranking,manualHistoryRows:historicos,manualHistoryGames:confrontosHistoricos},state:tmObterEstadoAdmin_()};
}

function ec56ResponderVolei_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:ec56ExcluirVolei_(p.id||p.campeonatoId),versao:'V056',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V056',dataHora:formatarData_(new Date())},p.callback);}}
function ec56ResponderTenis_(p){try{exigirAdmin_(p.chave);return responder_({ok:true,dados:ec56ExcluirTenis_(p.id||p.campeonatoId),versao:'V056',dataHora:formatarData_(new Date())},p.callback);}catch(err){return responder_({ok:false,erro:mensagemErro_(err),versao:'V056',dataHora:formatarData_(new Date())},p.callback);}}
