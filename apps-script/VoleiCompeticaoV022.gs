/** Formatos de competição do vôlei — V022 */
function configCompeticaoV022_(p){
 const tamanho=numero_(p.tamanhoEquipe||p.teamSize||2),formato=texto_(p.formatoCompeticao||p.format||'MATA_MATA').toUpperCase(),modelo=texto_(p.modelo||'AUTOMATICO').toUpperCase(),melhorDe=numero_(p.melhorDe||3),normal=numero_(p.pontosNormal||25),desempate=numero_(p.pontosDesempate||15),vantagem=numero_(p.vantagemMinima||2);
 if([2,3,4,5,6].indexOf(tamanho)<0)throw Error('Escolha equipes com 2, 3, 4, 5 ou 6 participantes.');
 if(['MATA_MATA','TODOS_CONTRA_TODOS'].indexOf(formato)<0)throw Error('Escolha mata-mata ou todos contra todos.');
 if([1,3,5].indexOf(melhorDe)<0)throw Error('Escolha 1, 3 ou 5 sets.');
 if(normal<1||normal>99||desempate<1||desempate>99)throw Error('A pontuação dos sets deve estar entre 1 e 99.');
 if(vantagem<1||vantagem>10)throw Error('A vantagem mínima deve estar entre 1 e 10.');
 return{teamSize:tamanho,format:formato,bracketModel:modelo,bestOf:melhorDe,normalPoints:normal,tiebreakPoints:desempate,minimumLead:vantagem};
}
function salvarConfigCompeticaoV022_(c){
 definirConfig_('CAMPEONATO_TAMANHO_EQUIPE',c.teamSize,'Participantes por equipe');definirConfig_('CAMPEONATO_FORMATO',c.format,'MATA_MATA ou TODOS_CONTRA_TODOS');
 definirConfig_('MELHOR_DE_SETS',c.bestOf,'Quantidade máxima de sets');definirConfig_('FORMATO_PARTIDA','MELHOR_DE_'+c.bestOf,'Formato da partida');definirConfig_('SETS_PARA_VENCER',Math.floor(c.bestOf/2)+1,'Sets necessários para vencer');
 definirConfig_('PONTOS_SET_NORMAL',c.normalPoints,'Pontuação dos sets normais');definirConfig_('PONTOS_SET_DESEMPATE',c.tiebreakPoints,'Pontuação do set decisivo');definirConfig_('VANTAGEM_MINIMA_SET',c.minimumLead,'Vantagem mínima');
}
function modeloSerializadoV022_(c){return JSON.stringify({version:'V022',format:c.format,bracketModel:c.bracketModel,teamSize:c.teamSize,bestOf:c.bestOf,normalPoints:c.normalPoints,tiebreakPoints:c.tiebreakPoints,minimumLead:c.minimumLead});}
function interpretarModeloV022_(valor){const s=texto_(valor);if(s.indexOf('{')===0){try{return JSON.parse(s);}catch(ignore){}}return{format:'MATA_MATA',bracketModel:s||'AUTOMATICO',teamSize:2};}
function montarFinalDoisJogosV022_(equipes){const t=ordenarCabecasChave_(equipes),r={index:0,name:'FINAL EM DOIS JOGOS',matches:[]};for(let i=0;i<2;i++){const m=criarJogoCompacto_(i+1,0,'FINAL '+(i+1));m.team1=i===0?t[0]:t[1];m.team2=i===0?t[1]:t[0];r.matches.push(m);}r.matches[0].status='LIBERADO';r.matches[0].availableAt=new Date();return[r];}
function jogosTodosContraTodosV022_(equipes){
 let lista=ordenarCabecasChave_(equipes).slice();if(lista.length%2)lista.push(null);const n=lista.length,rodadas=[],fixo=lista[0],moveis=lista.slice(1),matches=[];let game=1;
 for(let r=0;r<n-1;r++){const ordem=[fixo].concat(moveis),grupo=[];for(let i=0;i<n/2;i++){const a=ordem[i],b=ordem[n-1-i];if(a&&b){const m=criarJogoCompacto_(game++,r,'FASE CLASSIFICATÓRIA');m.team1=r%2===0?a:b;m.team2=r%2===0?b:a;grupo.push(m);}}rodadas.push({index:r,name:'RODADA '+(r+1),matches:grupo});moveis.unshift(moveis.pop());}
 rodadas.forEach(x=>x.matches.forEach(m=>matches.push(m)));if(matches.length){matches[0].status='LIBERADO';matches[0].availableAt=new Date();}
 if(equipes.length>4){const ri=rodadas.length,s1=criarJogoCompacto_(game++,ri,'SEMIFINAL'),s2=criarJogoCompacto_(game++,ri,'SEMIFINAL');s1.team1Placeholder='1º colocado';s1.team2Placeholder='4º colocado';s2.team1Placeholder='2º colocado';s2.team2Placeholder='3º colocado';const rf={index:ri+1,name:'DECISÕES',matches:[]},f=criarJogoCompacto_(game++,ri+1,'FINAL'),t=criarJogoCompacto_(game++,ri+1,'DISPUTA DE 3º LUGAR');f.team1Placeholder='Vencedor da Semifinal 1';f.team2Placeholder='Vencedor da Semifinal 2';t.team1Placeholder='Perdedor da Semifinal 1';t.team2Placeholder='Perdedor da Semifinal 2';s1.nextGame=f.game;s1.nextSlot=1;s2.nextGame=f.game;s2.nextSlot=2;rodadas.push({index:ri,name:'SEMIFINAL',matches:[s1,s2]});rf.matches=[f,t];rodadas.push(rf);}
 return rodadas;
}
function montarCompeticaoV022_(equipes,seed,c){if(equipes.length===2)return montarFinalDoisJogosV022_(equipes);if(c.format==='TODOS_CONTRA_TODOS')return jogosTodosContraTodosV022_(equipes);return montarChaveamentoPorModelo_(equipes,seed,c.bracketModel);}
function classificacaoV022_(dados,equipes){
 const mapa={};equipes.forEach(e=>mapa[e.id]={team:e,games:0,wins:0,losses:0,setsFor:0,setsAgainst:0,pointsFor:0,pointsAgainst:0});
 dados.filter(r=>texto_(r[2]).toUpperCase()==='FASE CLASSIFICATÓRIA'&&texto_(r[16])==='FINALIZADO').forEach(r=>{const a=mapa[texto_(r[3])],b=mapa[texto_(r[5])];if(!a||!b)return;a.games++;b.games++;a.setsFor+=numero_(r[13]);a.setsAgainst+=numero_(r[14]);b.setsFor+=numero_(r[14]);b.setsAgainst+=numero_(r[13]);let scores=[];try{scores=JSON.parse(texto_(r[23])||'[]');}catch(ignore){}scores.forEach(x=>{a.pointsFor+=numero_(x[0]);a.pointsAgainst+=numero_(x[1]);b.pointsFor+=numero_(x[1]);b.pointsAgainst+=numero_(x[0]);});if(texto_(r[15])===a.team.id){a.wins++;b.losses++;}else{b.wins++;a.losses++;}});
 return Object.keys(mapa).map(id=>{const x=mapa[id];x.setDiff=x.setsFor-x.setsAgainst;x.pointDiff=x.pointsFor-x.pointsAgainst;x.points=x.wins*2;x.winRate=x.games?Math.round(x.wins*1000/x.games)/10:0;return x;}).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.setDiff-a.setDiff||b.pointDiff-a.pointDiff||b.pointsFor-a.pointsFor||nomeEquipe_(a.team).localeCompare(nomeEquipe_(b.team),'pt-BR'));
}
function definirSemifinaisClassificacaoV022_(s,dados,equipes){const ranking=classificacaoV022_(dados,equipes),semis=dados.map((r,i)=>({r:r,i:i})).filter(x=>texto_(x.r[2]).toUpperCase()==='SEMIFINAL').sort((a,b)=>numero_(a.r[1])-numero_(b.r[1]));if(ranking.length<4||semis.length!==2)return ranking;[[ranking[0].team,ranking[3].team],[ranking[1].team,ranking[2].team]].forEach((par,i)=>s.getRange(semis[i].i+2,4,1,4).setValues([[par[0].id,nomeEquipe_(par[0]),par[1].id,nomeEquipe_(par[1])]]));return ranking;}
