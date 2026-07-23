/** Estados consumidos pela página pública e pelo painel */
function mensagemStatus_(status){return({INSCRICOES:'Inscrições abertas.',RASCUNHO:'Inscrições abertas.',AGENDADO:'Código gerado. Aguardando ativação.',EM_CONTAGEM:'Sorteio iniciado. Acompanhe a contagem regressiva.',SORTEADO:'Sorteio concluído. A primeira partida está liberada.',EM_ANDAMENTO:'Competição em andamento.',FINALIZADO:'Competição encerrada.',CANCELADO:'O sorteio foi cancelado.'})[status]||status;}
function obterEstadoPublico_(){verificarContagem_();atualizarLiberacoes_();return obterEstadoPublicoSemVerificacao_();}
function obterEstadoAdmin_(){verificarContagem_();atualizarLiberacoes_();return obterEstadoAdminSemVerificacao_();}
function dataEventoIso_(valor){const s=texto_(valor),m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:s;}
function estadoHistoricoDeContingencia_(){
 try{
  let id=typeof campeonatoIdAtivo_==='function'?campeonatoIdAtivo_():'';
  if(!id&&typeof listarCampeonatos_==='function'){const lista=listarCampeonatos_();if(lista.length)id=lista[0].id;}
  if(!id||typeof lerEquipesHistoricas_!=='function'||typeof lerRoundsHistoricos_!=='function')return null;
  const teams=lerEquipesHistoricas_(id),rounds=lerRoundsHistoricos_(id,teams);
  if(!teams.length&&!rounds.length)return null;
  const campeonato=typeof localizarCampeonato_==='function'?localizarCampeonato_(id):null;
  return{teams:teams,rounds:rounds,championship:campeonato};
 }catch(err){log_('FALHA_CONTINGENCIA_HISTORICO','','SISTEMA','SISTEMA',mensagemErro_(err),'AVISO','HISTORICO');return null;}
}
function obterEstadoPublicoSemVerificacao_(){
 const c=obterConfig_(),a=ultimoSorteio_()||{status:'INSCRICOES',message:'Inscrições abertas.'},mostrar=['SORTEADO','EM_ANDAMENTO','FINALIZADO'].indexOf(a.status)>=0;
 let teams=mostrar?lerEquipes_():[],rounds=mostrar?lerRounds_():[];
 if(mostrar&&(!teams.length||!rounds.length)){const historico=estadoHistoricoDeContingencia_();if(historico){if(!teams.length)teams=historico.teams;if(!rounds.length)rounds=historico.rounds;}}
 const matches=[];rounds.forEach(r=>r.matches.forEach(m=>matches.push(m)));
 const terceiro=matches.filter(m=>texto_(m.phase).toUpperCase()==='DISPUTA DE 3º LUGAR')[0],agenda={eventDate:dataEventoIso_(c.DATA_EVENTO||'22/07/2026'),registrationCloseTime:texto_(c.ENCERRAMENTO_INSCRICOES||'09:50'),countdownStartTime:texto_(c.INICIO_CONTAGEM||'09:55'),firstMatchTime:texto_(c.PRIMEIRA_PARTIDA_HORARIO||'10:15'),timezone:VOLEI.TIMEZONE},regras=regrasPartida_();
 regras.countdownSeconds=Number(c.DURACAO_CONTAGEM_SEGUNDOS||600);regras.thirdPlaceMatch=texto_(c.DISPUTA_TERCEIRO_LUGAR||'ATIVA').toUpperCase()==='ATIVA';
 return{
  version:VOLEI.VERSION,title:texto_(c.TITULO_EVENTO||'Sorteio de Duplas de Vôlei'),status:a.status,message:a.message||mensagemStatus_(a.status),serverTime:new Date(),registrationOpen:inscricoesPublicasAbertas_(),schedule:agenda,
  rules:regras,
  players:lerJogadores_().map(p=>({id:p.id,name:p.name,birthDate:p.birthDate,age:p.age,pot:p.pot,category:p.category,categoryLabel:p.pot==='A'?'Adulto':'Criança',score:p.score,adjustedScore:p.adjustedScore,active:p.active,createdAt:p.createdAt})),
  teams:teams,rounds:rounds,inicioPrevisto:a.scheduledAt||'',realizadoEm:a.realizedAt||'',seed:a.seed||'',auditHash:a.auditHash||'',sorteioId:a.id||'',championId:a.championId||'',thirdPlaceId:terceiro?texto_(terceiro.winnerId):''
 };
}
function obterEstadoAdminSemVerificacao_(){const e=obterEstadoPublicoSemVerificacao_(),a=ultimoSorteio_();e.codigoAtivacao=a&&a.codeFinal?'••••'+a.codeFinal:'';e.diagnostico={spreadsheetId:VOLEI.SPREADSHEET_ID,webAppUrl:ScriptApp.getService().getUrl()||''};return e;}
