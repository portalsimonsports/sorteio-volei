/** Formação de equipes de 2 a 6 participantes — V022 */
function equipeFlexivelV022_(membros,indice,id){
 const total=membros.reduce((s,p)=>s+indiceParticipante_(p),0),nomes=membros.map(p=>p.name),ids=membros.map(p=>p.id);
 if(membros.length===2){const e=criarEquipe_(membros[0],membros[1],indice);e.id=id||e.id;e.teamSize=2;e.members=membros.map(p=>({id:p.id,name:p.name,pot:p.pot,age:p.age,sex:sexoParticipante_(p),index:indiceParticipante_(p)}));e.name=nomes.join(' + ');return e;}
 return{id:id||'E-'+('000'+(indice+1)).slice(-3),adultId:ids.join('|'),adult:nomes.join(' + '),adultScore:'',adultIndex:'',childId:'',child:'',childScore:'',childIndex:'',totalIndex:arredondarIndice_(total),balanceOrder:indice+1,bracketOrder:'',teamSize:membros.length,name:nomes.join(' + '),members:membros.map(p=>({id:p.id,name:p.name,pot:p.pot,age:p.age,sex:sexoParticipante_(p),index:indiceParticipante_(p)}))};
}
function formarEquipesTamanhoV022_(tamanho){
 tamanho=numero_(tamanho||2);if([2,3,4,5,6].indexOf(tamanho)<0)throw Error('Escolha equipes com 2, 3, 4, 5 ou 6 participantes.');
 if(tamanho===2)return formarEquipes_();
 atualizarIndicesHistoricos_();const jogadores=lerJogadores_().filter(p=>p.active==='SIM');
 if(jogadores.length<tamanho*2)throw Error('São necessários pelo menos '+(tamanho*2)+' participantes ativos para formar duas equipes de '+tamanho+'.');
 if(jogadores.length%tamanho!==0)throw Error('O total de '+jogadores.length+' participantes não é múltiplo de '+tamanho+'. Ative ou desative participantes antes de gerar as equipes.');
 const qtd=jogadores.length/tamanho,ordenados=jogadores.slice().sort((a,b)=>indiceParticipante_(b)-indiceParticipante_(a)||((a.pot==='A'&&b.pot==='A')?numero_(b.age)-numero_(a.age):0)||a.name.localeCompare(b.name,'pt-BR')),grupos=Array.from({length:qtd},()=>[]);
 let pos=0,direcao=1;ordenados.forEach(p=>{grupos[pos].push(p);if(qtd>1){if(direcao===1&&pos===qtd-1)direcao=-1;else if(direcao===-1&&pos===0)direcao=1;else pos+=direcao;}});
 return ordenarEquipesPorForca_(grupos.map((g,i)=>equipeFlexivelV022_(g,i))).map((e,i)=>Object.assign(e,{balanceOrder:i+1}));
}
function idsEquipeFlexivelV022_(e){return texto_(e.adultId).split('|').filter(Boolean).concat(texto_(e.childId)?[texto_(e.childId)]:[]);}
function recalcularEquipesFlexiveisV022_(equipes){
 atualizarIndicesHistoricos_();const mapa={};lerJogadores_().forEach(p=>mapa[p.id]=p);
 return ordenarEquipesPorForca_(equipes.map((e,i)=>{const ids=idsEquipeFlexivelV022_(e),membros=ids.map(id=>mapa[id]).filter(Boolean);if(membros.length>=2)return equipeFlexivelV022_(membros,i,e.id);return Object.assign({},e,{balanceOrder:i+1});}));
}
function tamanhoEquipeV022_(e){const ids=idsEquipeFlexivelV022_(e);return ids.length||2;}
