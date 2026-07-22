/** Validação dinâmica: 1, 3 ou 5 sets, pontuações e vantagem configuráveis */
function normalizarPlacarPayload_(payload){
 if(Array.isArray(payload))return payload;
 const texto=texto_(payload);
 if(texto.indexOf('{')===0){let objeto;try{objeto=JSON.parse(texto);}catch(e){throw Error('O placar enviado é inválido.');}if(!objeto||!Array.isArray(objeto.scores))throw Error('O placar enviado não contém os sets.');return objeto.scores;}
 if(texto.indexOf('PLACAR|')===0){const p=texto.split('|');return[[p[1],p[2]],[p[3],p[4]],[p[5],p[6]]];}
 throw Error('Preencha a pontuação dos sets antes de salvar.');
}
function validarSet_(a,b,alvo,numeroSet,vantagem){a=numeroOpcional_(a);b=numeroOpcional_(b);if(a==null||b==null)throw Error('Preencha a pontuação do '+numeroSet+'º set.');if(a<0||b<0||Math.floor(a)!==a||Math.floor(b)!==b)throw Error('A pontuação dos sets deve usar números inteiros não negativos.');if(a===b)throw Error('O '+numeroSet+'º set não pode terminar empatado.');if(Math.max(a,b)<alvo||Math.abs(a-b)<vantagem)throw Error('Placar inválido no '+numeroSet+'º set. O vencedor precisa atingir '+alvo+' pontos e abrir vantagem mínima de '+vantagem+'.');return{a:a,b:b,winner:a>b?1:2};}
function validarPlacar_(payload){
 let scores;if(arguments.length>1)scores=[[arguments[0],arguments[1]],[arguments[2],arguments[3]],[arguments[4],arguments[5]]];else scores=normalizarPlacarPayload_(payload);
 const regras=regrasPartida_(),normalizados=[];let sets1=0,sets2=0;
 for(let i=0;i<regras.bestOf;i++){
  const bruto=scores[i]||[null,null],a=numeroOpcional_(bruto[0]),b=numeroOpcional_(bruto[1]),encerrada=sets1>=regras.setsToWin||sets2>=regras.setsToWin;
  if(encerrada){if((a!=null&&a!==0)||(b!=null&&b!==0))throw Error('O '+(i+1)+'º set não deve ser preenchido porque a partida já terminou.');normalizados.push([null,null]);continue;}
  const alvo=regras.bestOf>1&&i===regras.bestOf-1?regras.tiebreakSetPoints:regras.normalSetPoints,set=validarSet_(a,b,alvo,i+1,regras.minimumLead);normalizados.push([set.a,set.b]);if(set.winner===1)sets1++;else sets2++;
 }
 if(sets1<regras.setsToWin&&sets2<regras.setsToWin)throw Error('A partida exige '+regras.setsToWin+' sets vencidos para definir a dupla vencedora.');
 return{scores:normalizados,sets1:sets1,sets2:sets2,winnerSide:sets1>sets2?1:2,rules:regras};
}
