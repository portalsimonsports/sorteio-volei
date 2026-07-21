/** Estados consumidos pela página pública e pelo painel */
function mensagemStatus_(status){return({INSCRICOES:'Inscrições abertas.',RASCUNHO:'Inscrições abertas.',AGENDADO:'Código gerado. Aguardando ativação.',EM_CONTAGEM:'Sorteio ativado. Acompanhe a contagem regressiva.',SORTEADO:'Sorteio concluído. A primeira partida está liberada.',EM_ANDAMENTO:'Competição em andamento.',FINALIZADO:'Competição encerrada.',CANCELADO:'O sorteio foi cancelado.'})[status]||status;}
function obterEstadoPublico_(){verificarContagem_();atualizarLiberacoes_();return obterEstadoPublicoSemVerificacao_();}
function obterEstadoAdmin_(){verificarContagem_();atualizarLiberacoes_();return obterEstadoAdminSemVerificacao_();}
function obterEstadoPublicoSemVerificacao_(){const c=obterConfig_(),a=ultimoSorteio_()||{status:'INSCRICOES',message:'Inscrições abertas.'},mostrar=['SORTEADO','EM_ANDAMENTO','FINALIZADO'].indexOf(a.status)>=0;return{
 version:VOLEI.VERSION,title:texto_(c.TITULO_EVENTO||'Sorteio de Duplas de Vôlei'),status:a.status,message:a.message||mensagemStatus_(a.status),serverTime:new Date(),
 rules:{bestOf:3,setsToWin:2,normalSetPoints:25,tiebreakSetPoints:15,minimumLead:2,matchIntervalMinutes:Number(c.INTERVALO_ENTRE_PARTIDAS_MINUTOS||10)},
 players:lerJogadores_().map(p=>({id:p.id,name:p.name,birthDate:p.birthDate,age:p.age,pot:p.pot,category:p.category,categoryLabel:p.pot==='A'?'Adulto':'Criança',score:p.score,adjustedScore:p.adjustedScore,active:p.active,createdAt:p.createdAt})),
 teams:mostrar?lerEquipes_():[],rounds:mostrar?lerRounds_():[],inicioPrevisto:a.scheduledAt||'',realizadoEm:a.realizedAt||'',seed:a.seed||'',auditHash:a.auditHash||'',sorteioId:a.id||'',championId:a.championId||''
};}
function obterEstadoAdminSemVerificacao_(){const e=obterEstadoPublicoSemVerificacao_(),a=ultimoSorteio_();e.codigoAtivacao=a&&a.codeFinal?'••••'+a.codeFinal:'';e.diagnostico={spreadsheetId:VOLEI.SPREADSHEET_ID,webAppUrl:ScriptApp.getService().getUrl()||''};return e;}
