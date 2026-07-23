/** Atualização correta do status do campeonato no primeiro início — V023 */
function flexTmMarcarCampeonatoIniciado_(campeonato,agora){
 if(!campeonato)return null;
 if(!campeonato.startedAt)campeonato.startedAt=agora||new Date();
 if(texto_(campeonato.status).toUpperCase()!=='FINALIZADO')campeonato.status='EM_ANDAMENTO';
 campeonato.message='Campeonato em andamento.';
 return tmAtualizarCampeonato_(campeonato);
}
function tmIniciarPartida_(jogo){
 tmGarantirEstrutura_();const campeonato=tmCampeonatoAtivo_();if(!campeonato)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
 const s=aba_(TM_SHEETS.JOGOS),l=s.getLastRow(),dados=l>=2?s.getRange(2,1,l-1,TM_HEADERS.JOGOS.length).getValues():[],alvo=Number(jogo),agora=new Date();let indice=-1;
 for(let i=0;i<dados.length;i++){if(texto_(dados[i][0])!==campeonato.id)continue;if(numero_(dados[i][1])===alvo)indice=i;else if(texto_(dados[i][11])==='EM_ANDAMENTO')throw Error('Já existe outra partida em andamento.');}
 if(indice<0)throw Error('Partida não encontrada.');if(texto_(dados[indice][11])==='FINALIZADO')throw Error('Esta partida já foi finalizada.');
 dados[indice][11]='EM_ANDAMENTO';dados[indice][12]=dados[indice][12]||agora;flexTmMarcarCampeonatoIniciado_(campeonato,dados[indice][12]);s.getRange(2,1,dados.length,TM_HEADERS.JOGOS.length).setValues(dados);
 return{message:'Partida '+alvo+' iniciada.',state:tmObterEstado_(true)};
}
function tmRegistrarResultado_(jogo,p){
 tmGarantirEstrutura_();const campeonato=tmCampeonatoAtivo_();if(!campeonato)throw Error('Nenhum campeonato de tênis de mesa está ativo.');
 const placar=tmValidarPlacar_(tmPlacarParametro_(p||{}),campeonato),s=aba_(TM_SHEETS.JOGOS),l=s.getLastRow(),dados=l>=2?s.getRange(2,1,l-1,TM_HEADERS.JOGOS.length).getValues():[],alvo=Number(jogo),agora=new Date();let indice=-1;
 for(let i=0;i<dados.length;i++){if(texto_(dados[i][0])===campeonato.id&&numero_(dados[i][1])===alvo){indice=i;break;}}
 if(indice<0)throw Error('Partida não encontrada.');const r=dados[indice];if(texto_(r[11])==='FINALIZADO')throw Error('Esta partida já foi finalizada.');
 r[7]=JSON.stringify(placar.scores);r[8]=placar.sets1;r[9]=placar.sets2;r[10]=placar.winnerSlot==='1'?texto_(r[3]):texto_(r[5]);r[11]='FINALIZADO';r[12]=r[12]||agora;r[13]=agora;flexTmMarcarCampeonatoIniciado_(campeonato,r[12]);
 const pendentes=dados.filter(x=>texto_(x[0])===campeonato.id&&texto_(x[11])!=='FINALIZADO').sort((a,b)=>numero_(a[1])-numero_(b[1]));
 if(pendentes.length){const proxima=pendentes[0];proxima[11]=campeonato.autoStart==='SIM'?'EM_ANDAMENTO':'LIBERADO';if(campeonato.autoStart==='SIM')proxima[12]=agora;campeonato.status='EM_ANDAMENTO';campeonato.message='Campeonato em andamento.';tmAtualizarCampeonato_(campeonato);}else{campeonato.status='FINALIZADO';campeonato.finishedAt=agora;campeonato.message='Campeonato finalizado. Ranking consolidado.';tmAtualizarCampeonato_(campeonato);}
 s.getRange(2,1,dados.length,TM_HEADERS.JOGOS.length).setValues(dados);tmAtualizarRanking_(campeonato.id);
 return{message:pendentes.length?(campeonato.autoStart==='SIM'?'Resultado salvo e próxima partida iniciada automaticamente.':'Resultado salvo e próxima partida liberada.'):'Resultado salvo. Campeonato finalizado.',state:tmObterEstado_(true)};
}
