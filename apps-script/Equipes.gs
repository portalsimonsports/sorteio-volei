/** Formação e leitura das duplas com índice histórico e desempate etário — V018 */
function indiceParticipante_(p){const n=numeroOpcional_(p&&p.currentIndex!=null?p.currentIndex:p&&p.adjustedScore);return n==null?numero_(p&&p.baseIndex):n;}
function ordenarAdultosSelecao_(lista){return lista.slice().sort((x,y)=>indiceParticipante_(y)-indiceParticipante_(x)||numero_(y.age)-numero_(x.age)||x.name.localeCompare(y.name));}
function ordenarAdultosPareamento_(lista){return lista.slice().sort((x,y)=>indiceParticipante_(y)-indiceParticipante_(x)||numero_(x.age)-numero_(y.age)||x.name.localeCompare(y.name));}
function ordenarCriancas_(lista){return lista.slice().sort((x,y)=>indiceParticipante_(x)-indiceParticipante_(y)||numero_(x.age)-numero_(y.age)||x.name.localeCompare(y.name));}
function criarEquipe_(p1,p2,indice){const i1=indiceParticipante_(p1),i2=indiceParticipante_(p2);return{
 id:'E-'+('000'+(indice+1)).slice(-3),
 adultId:p1.id,adult:p1.name,adultScore:p1.score,adultIndex:i1,
 childId:p2.id,child:p2.name,childScore:p2.score,childIndex:i2,
 totalIndex:arredondarIndice_(i1+i2),balanceOrder:indice+1,bracketOrder:''
};}
function parearMesmoPote_(participantes,equipes,pote){
 if(!participantes.length)return;if(participantes.length%2!==0)throw Error('Quantidade excedente inválida no Pote '+pote+'.');
 const ordenados=pote==='A'?ordenarAdultosPareamento_(participantes):participantes.slice().sort((a,b)=>indiceParticipante_(b)-indiceParticipante_(a)||numero_(a.age)-numero_(b.age)||a.name.localeCompare(b.name));
 const metade=ordenados.length/2,ancoras=ordenados.slice(0,metade),parceiros=ordenados.slice(metade).sort((a,b)=>indiceParticipante_(a)-indiceParticipante_(b)||numero_(a.age)-numero_(b.age)||a.name.localeCompare(b.name));
 for(let i=0;i<metade;i++)equipes.push(criarEquipe_(ancoras[i],parceiros[i],equipes.length));
}
function formarEquipes_(){
 atualizarIndicesHistoricos_();
 const p=validarPotes_(),quantidadeMista=Math.min(p.adults.length,p.children.length),equipes=[];
 const selecionadosAdultos=ordenarAdultosSelecao_(p.adults).slice(0,quantidadeMista),idsAdultos={};selecionadosAdultos.forEach(x=>idsAdultos[x.id]=true);
 const adultosMistos=ordenarAdultosPareamento_(selecionadosAdultos),criancasMistas=ordenarCriancas_(p.children).slice(0,quantidadeMista),idsCriancas={};criancasMistas.forEach(x=>idsCriancas[x.id]=true);
 for(let i=0;i<quantidadeMista;i++)equipes.push(criarEquipe_(adultosMistos[i],criancasMistas[i],equipes.length));
 parearMesmoPote_(p.adults.filter(x=>!idsAdultos[x.id]),equipes,'A');
 parearMesmoPote_(p.children.filter(x=>!idsCriancas[x.id]),equipes,'B');
 if(equipes.length*2!==p.total)throw Error('Não foi possível formar todas as duplas. Verifique a quantidade de participantes ativos.');
 return ordenarEquipesPorForca_(equipes).map((e,i)=>Object.assign(e,{balanceOrder:i+1}));
}
function ordenarEquipesPorForca_(equipes){return equipes.slice().sort((a,b)=>numero_(b.totalIndex)-numero_(a.totalIndex)||Math.abs(numero_(a.adultIndex)-numero_(a.childIndex))-Math.abs(numero_(b.adultIndex)-numero_(b.childIndex))||texto_(a.id).localeCompare(texto_(b.id)));}
function recalcularForcaEquipes_(equipes){
 atualizarIndicesHistoricos_();const jogadores={},atuais=lerJogadores_();atuais.forEach(p=>jogadores[p.id]=p);
 return ordenarEquipesPorForca_(equipes.map((e,i)=>{
  const p1=jogadores[e.adultId],p2=jogadores[e.childId],i1=p1?indiceParticipante_(p1):numero_(e.adultIndex),i2=p2?indiceParticipante_(p2):numero_(e.childIndex);
  return Object.assign({},e,{adult:p1?p1.name:e.adult,adultScore:p1?p1.score:e.adultScore,adultIndex:i1,child:p2?p2.name:e.child,childScore:p2?p2.score:e.childScore,childIndex:i2,totalIndex:arredondarIndice_(i1+i2),balanceOrder:i+1});
 }));
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
