/** JOGOS AVULSOS DO VÔLEI POR DOIS SELETORES — V024 */
function flexVoleiRegrasAvulsoV024_(p){
 const melhorDe=numero_(p.melhorDe||3),normal=numero_(p.pontosNormal||25),desempate=numero_(p.pontosDesempate||15),vantagem=numero_(p.vantagemMinima||2);
 if([1,3,5].indexOf(melhorDe)<0)throw Error('Escolha 1, 3 ou 5 sets.');
 if(normal<1||normal>99||desempate<1||desempate>99)throw Error('A pontuação dos sets deve estar entre 1 e 99.');
 if(vantagem<1||vantagem>10)throw Error('A vantagem mínima deve estar entre 1 e 10.');
 return{bestOf:melhorDe,normalPoints:normal,tiebreakPoints:desempate,minimumLead:vantagem};
}
function flexVoleiCriarAvulsos_(p){
 flexGarantirEstruturaV023_();
 const ids1=flexArray_(p.equipe1||p.team1||p.participantesEquipe1||(p.jogador1?[p.jogador1]:[])),ids2=flexArray_(p.equipe2||p.team2||p.participantesEquipe2||(p.jogador2?[p.jogador2]:[]));
 const e1=flexVoleiEquipeJson_(ids1),e2=flexVoleiEquipeJson_(ids2);
 if(e1.members.some(a=>e2.members.some(b=>a.id===b.id)))throw Error('Selecione participantes diferentes para os dois lados.');
 if(e1.members.length!==e2.members.length)throw Error('Os dois lados precisam ter a mesma quantidade de participantes.');
 if(e1.members.length<1||e1.members.length>6)throw Error('Cada lado deve possuir de 1 a 6 participantes.');
 const cfg=flexVoleiRegrasAvulsoV024_(p),repeticoes=flexRepeticoes_(p,1),grupo=gerarId_('AVLGR'),agora=new Date(),s=aba_(FLEX_V023.VOLEI_AVULSOS),linhas=[];
 for(let i=0;i<repeticoes;i++)linhas.push([gerarId_('AVL'),grupo,i+1,'LIBERADO',JSON.stringify(e1),JSON.stringify(e2),'[]',0,0,'','','',cfg.bestOf,cfg.normalPoints,cfg.tiebreakPoints,cfg.minimumLead,agora]);
 s.getRange(s.getLastRow()+1,1,linhas.length,linhas[0].length).setValues(linhas);
 return{message:repeticoes+' jogo'+(repeticoes===1?' avulso criado.':'s avulsos criados.')+' Os resultados entrarão no ranking geral e no cálculo do índice.',freeMatches:flexVoleiLerAvulsos_(),state:obterEstadoAdmin_()};
}
function flexVoleiAtualizarAvulso_(id,iniciar,payload){
 const s=aba_(FLEX_V023.VOLEI_AVULSOS),l=s.getLastRow();if(l<2)throw Error('Jogo avulso não encontrado.');
 const d=s.getRange(2,1,l-1,FLEX_V023.VOLEI_HEADERS.length).getValues(),i=d.findIndex(r=>texto_(r[0])===id);if(i<0)throw Error('Jogo avulso não encontrado.');
 const r=d[i],status=texto_(r[3]).toUpperCase(),agora=new Date();if(status==='FINALIZADO')throw Error('Este jogo avulso já foi finalizado.');
 if(iniciar){r[3]='EM_DISPUTA';r[10]=r[10]||agora;}else{const obj=flexObjeto_(payload),res=flexValidarPlacar_(obj.scores||obj.placar||payload,r[12],r[13],r[14],r[15],false);r[3]='FINALIZADO';r[6]=JSON.stringify(res.scores);r[7]=res.sets1;r[8]=res.sets2;r[9]=res.winnerSide;r[10]=r[10]||agora;r[11]=agora;}
 s.getRange(i+2,1,1,r.length).setValues([r]);
 if(!iniciar)try{atualizarIndicesHistoricos_();}catch(erro){log_('INDICE_AVULSO_PENDENTE',id,'SISTEMA','SISTEMA',erro.message,'ALERTA',id);}
 return{message:iniciar?'Jogo avulso iniciado.':'Resultado avulso salvo, ranking e índice atualizados.',state:obterEstadoAdmin_()};
}
