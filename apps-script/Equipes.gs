/** Formação e leitura das duplas — mistas ou com participantes do mesmo pote */
function ordenarAdultos_(lista){return lista.slice().sort((x,y)=>y.adjustedScore-x.adjustedScore||numero_(x.age)-numero_(y.age)||x.name.localeCompare(y.name));}
function ordenarCriancas_(lista){return lista.slice().sort((x,y)=>x.adjustedScore-y.adjustedScore||x.name.localeCompare(y.name));}
function criarEquipe_(p1,p2,indice){return{
 id:'E-'+('000'+(indice+1)).slice(-3),
 adultId:p1.id,adult:p1.name,adultScore:p1.score,adultIndex:p1.adjustedScore,
 childId:p2.id,child:p2.name,childScore:p2.score,childIndex:p2.adjustedScore,
 totalIndex:p1.adjustedScore+p2.adjustedScore,balanceOrder:indice+1,bracketOrder:''
};}
function parearExtremos_(participantes,equipes){const restantes=participantes.slice().sort((a,b)=>a.adjustedScore-b.adjustedScore||numero_(a.age)-numero_(b.age)||a.name.localeCompare(b.name));while(restantes.length>=2){const menor=restantes.shift(),maior=restantes.pop();equipes.push(criarEquipe_(maior,menor,equipes.length));}}
function formarEquipes_(){
 const p=validarPotes_(),adultos=ordenarAdultos_(p.adults),criancas=ordenarCriancas_(p.children),equipes=[],mistas=Math.min(adultos.length,criancas.length);
 for(let i=0;i<mistas;i++)equipes.push(criarEquipe_(adultos[i],criancas[i],equipes.length));
 parearExtremos_(adultos.slice(mistas),equipes);
 parearExtremos_(criancas.slice(mistas),equipes);
 if(equipes.length*2!==p.total)throw Error('Não foi possível formar todas as duplas. Verifique a quantidade de participantes ativos.');
 return equipes;
}
function gravarEquipes_(equipes){
 const s=aba_(VOLEI.SHEETS.EQUIPES);limparAbaixoCabecalho_(VOLEI.SHEETS.EQUIPES,12);if(!equipes.length)return;
 s.getRange(2,1,equipes.length,12).setValues(equipes.map(e=>[e.id,e.adultId,e.adult,e.adultScore,e.adultIndex,e.childId,e.child,e.childScore,e.childIndex,e.totalIndex,e.balanceOrder,e.bracketOrder]));
}
function lerEquipes_(){
 const s=aba_(VOLEI.SHEETS.EQUIPES),l=s.getLastRow();if(l<2)return[];
 return s.getRange(2,1,l-1,12).getValues().filter(r=>r[0]).map(r=>({
  id:texto_(r[0]),adultId:texto_(r[1]),adult:texto_(r[2]),adultScore:numero_(r[3]),adultIndex:numero_(r[4]),
  childId:texto_(r[5]),child:texto_(r[6]),childScore:numero_(r[7]),childIndex:numero_(r[8]),totalIndex:numero_(r[9]),
  balanceOrder:numero_(r[10]),bracketOrder:numero_(r[11])
 }));
}
function nomeEquipe_(equipe){return equipe?[equipe.adult,equipe.child].filter(Boolean).join(' + '):'';}
