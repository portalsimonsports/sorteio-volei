/** Configuração administrativa do formato das partidas e horário real de início */
function regrasPartida_(){
 const c=obterConfig_();
 let melhorDe=numero_(c.MELHOR_DE_SETS||String(c.FORMATO_PARTIDA||'').replace(/\D/g,'')||3);
 if([1,3,5].indexOf(melhorDe)<0)melhorDe=3;
 const setsParaVencer=Math.floor(melhorDe/2)+1;
 return{
  bestOf:melhorDe,
  setsToWin:setsParaVencer,
  normalSetPoints:Math.max(1,numero_(c.PONTOS_SET_NORMAL||25)),
  tiebreakSetPoints:Math.max(1,numero_(c.PONTOS_SET_DESEMPATE||15)),
  minimumLead:Math.max(1,numero_(c.VANTAGEM_MINIMA_SET||2)),
  matchIntervalMinutes:Math.max(0,numero_(c.INTERVALO_ENTRE_PARTIDAS_MINUTOS||10))
 };
}
function salvarRegrasPartida_(p){
 const melhorDe=numero_(p.melhorDe),normal=numero_(p.pontosNormal),desempate=numero_(p.pontosDesempate),vantagem=numero_(p.vantagemMinima);
 if([1,3,5].indexOf(melhorDe)<0)throw Error('Escolha 1, 3 ou 5 sets.');
 if(normal<1||normal>99||desempate<1||desempate>99)throw Error('A pontuação dos sets deve estar entre 1 e 99.');
 if(vantagem<1||vantagem>10)throw Error('A vantagem mínima deve estar entre 1 e 10.');
 const atual=ultimoSorteio_();
 if(atual&&['SORTEADO','EM_ANDAMENTO'].indexOf(texto_(atual.status).toUpperCase())>=0)throw Error('O formato não pode ser alterado depois que o chaveamento foi iniciado.');
 definirConfig_('MELHOR_DE_SETS',melhorDe,'Quantidade máxima de sets por partida: 1, 3 ou 5');
 definirConfig_('FORMATO_PARTIDA','MELHOR_DE_'+melhorDe,'Formato da partida');
 definirConfig_('SETS_PARA_VENCER',Math.floor(melhorDe/2)+1,'Sets necessários para vencer');
 definirConfig_('PONTOS_SET_NORMAL',normal,'Pontuação-alvo dos sets normais');
 definirConfig_('PONTOS_SET_DESEMPATE',desempate,'Pontuação-alvo do último set decisivo');
 definirConfig_('VANTAGEM_MINIMA_SET',vantagem,'Vantagem mínima para encerrar o set');
 log_('REGRAS_PARTIDA_ATUALIZADAS',atual?atual.id:'','PAINEL_WEB','ADMIN','Melhor de '+melhorDe+' | normal '+normal+' | decisivo '+desempate+' | vantagem '+vantagem,'INFO','REGRAS');
 return{message:'Formato das partidas atualizado.',state:obterEstadoAdminSemVerificacao_()};
}
function iniciarPartida_(jogo){
 jogo=numero_(jogo);if(!jogo)throw Error('Informe a partida.');
 const s=aba_(VOLEI.SHEETS.CHAVEAMENTO),l=s.getLastRow();if(l<2)throw Error('Chaveamento ainda não foi criado.');
 const dados=s.getRange(2,1,l-1,24).getValues(),i=dados.findIndex(r=>numero_(r[1])===jogo);if(i<0)throw Error('Jogo não encontrado.');
 const r=dados[i],status=texto_(r[16]).toUpperCase();
 if(!r[3]||!r[5])throw Error('As duas equipes ainda não estão definidas.');
 if(status==='FINALIZADO')throw Error('Esta partida já foi finalizada.');
 const disponivel=r[18]?interpretarData_(r[18]):null,agora=new Date();
 if(disponivel&&agora.getTime()<disponivel.getTime())throw Error('A partida estará liberada em '+formatarData_(disponivel)+'.');
 let inicio=r[22]?interpretarData_(r[22]):null;
 if(!inicio){inicio=agora;s.getRange(i+2,23).setValue(inicio);}
 s.getRange(i+2,17).setValue('EM_DISPUTA');
 log_('PARTIDA_INICIADA',texto_(r[0]),'PAINEL_WEB','ADMIN','Jogo '+jogo+' | '+formatarData_(inicio),'INFO',String(jogo));
 return{message:'Início da partida registrado.',state:obterEstadoAdminSemVerificacao_()};
}
