/** Formação e leitura das duplas */
function formarEquipes_(){
 const p=validarPotes_();
 const adultos=p.adults.sort((x,y)=>
  y.adjustedScore-x.adjustedScore||
  numero_(x.age)-numero_(y.age)||
  x.name.localeCompare(y.name)
 );
 const criancas=p.children.sort((x,y)=>
  x.adjustedScore-y.adjustedScore||
  x.name.localeCompare(y.name)
 );
 return adultos.map((adulto,i)=>{const crianca=criancas[i];return{
  id:'E-'+('000'+(i+1)).slice(-3),adultId:adulto.id,adult:adulto.name,adultScore:adulto.score,adultIndex:adulto.adjustedScore,
  childId:crianca.id,child:crianca.name,childScore:crianca.score,childIndex:crianca.adjustedScore,
  totalIndex:adulto.adjustedScore+crianca.adjustedScore,balanceOrder:i+1,bracketOrder:''
 };});
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
function nomeEquipe_(equipe){return equipe?equipe.adult+' + '+equipe.child:'';}
