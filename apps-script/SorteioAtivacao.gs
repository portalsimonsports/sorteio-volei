/** Código de ativação e contagem regressiva */
function iniciarContagemDireta_(segundos){
 validarPotes_();
 const b=lock_();b.waitLock(15000);
 try{
  const duracao=Math.max(5,numero_(segundos)||Number(obterConfig_().DURACAO_CONTAGEM_SEGUNDOS||600));
  const id=gerarId_('SOR'),agora=new Date(),inicio=new Date(agora.getTime()+duracao*1000);
  limparAbaixoCabecalho_(VOLEI.SHEETS.EQUIPES,12);
  limparAbaixoCabecalho_(VOLEI.SHEETS.CHAVEAMENTO,22);
  aba_(VOLEI.SHEETS.SORTEIOS).appendRow([id,'EM_CONTAGEM','','',agora,agora,inicio,'','','','ADMIN','Sorteio iniciado. Acompanhe a contagem regressiva.','','']);
  log_('CONTAGEM_INICIADA',id,'PAINEL_WEB','ADMIN','Duração: '+duracao+' segundos | Início previsto: '+formatarData_(inicio),'INFO',id);
  return{message:'Contagem regressiva iniciada.',inicioPrevisto:inicio,segundos:duracao,state:obterEstadoPublicoSemVerificacao_()};
 }finally{b.releaseLock();}
}
function gerarCodigoAtivacao_(){validarPotes_();const codigo=String(Math.floor(100000+Math.random()*900000)),id=gerarId_('SOR');aba_(VOLEI.SHEETS.SORTEIOS).appendRow([id,'AGENDADO',hashCodigo_(codigo),codigo.slice(-2),new Date(),'','','','','','ADMIN','Código gerado. Aguardando ativação.','','']);log_('CODIGO_GERADO',id,'PAINEL_WEB','ADMIN','Final **'+codigo.slice(-2),'INFO',id);return{message:'Código de ativação gerado.',codigo,sorteioId:id,expiraMinutos:Number(obterConfig_().ATIVACAO_EXPIRA_MINUTOS||30)};}
function ativarSorteio_(codigo,origem){codigo=String(codigo||'').replace(/\D/g,'');if(codigo.length!==6)throw Error('O código deve conter seis dígitos.');const b=lock_();b.waitLock(15000);try{const atual=ultimoSorteio_();if(!atual||atual.status!=='AGENDADO')throw Error('O sorteio atual não está aguardando ativação.');const criado=interpretarData_(atual.createdAt),expira=Number(obterConfig_().ATIVACAO_EXPIRA_MINUTOS||30);if(Date.now()>criado.getTime()+expira*60000)throw Error('O código de ativação expirou.');if(!compararSeguro_(hashCodigo_(codigo),atual.codeHash))throw Error('Código de ativação inválido.');const agora=new Date(),inicio=new Date(agora.getTime()+Number(obterConfig_().DURACAO_CONTAGEM_SEGUNDOS||600)*1000);aba_(VOLEI.SHEETS.SORTEIOS).getRange(atual.row,2,1,11).setValues([['EM_CONTAGEM',atual.codeHash,atual.codeFinal,atual.createdAt,agora,inicio,'','','',origem||'SITE','Sorteio ativado. Acompanhe a contagem regressiva.']]);log_('SORTEIO_ATIVADO',atual.id,origem||'SITE','CODIGO','Início previsto: '+formatarData_(inicio),'INFO',atual.id);return{message:'Sorteio ativado.',inicioPrevisto:inicio,state:obterEstadoPublicoSemVerificacao_()};}finally{b.releaseLock();}}
function verificarContagem_(){const atual=ultimoSorteio_();if(!atual||atual.status!=='EM_CONTAGEM'||!atual.scheduledAt)return;const inicio=interpretarData_(atual.scheduledAt);if(!inicio||Date.now()<inicio.getTime())return;const b=lock_();if(!b.tryLock(1000))return;try{const novamente=ultimoSorteio_();if(novamente&&novamente.status==='EM_CONTAGEM')realizarSorteioNaLinha_(novamente,'AUTOMATICO');}finally{b.releaseLock();}}
