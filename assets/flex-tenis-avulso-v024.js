(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.FlexV023) return;
  const F=window.FlexV023;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function locate(){for(let i=0;i<40;i++){const section=document.getElementById('flexTmFree');if(section)return section;await sleep(250);}return null;}
  async function run(){
    if(!window.TenisMesa)return;
    const TM=window.TenisMesa,section=await locate();if(!section)return;
    let state=await TM.request('tmAdmin');
    document.getElementById('flexScoreModal-tm')?.remove();
    const modal=F.createScoreModal('tm');
    const options=()=>`<option value="">Selecione</option>${(state.players||[]).filter(p=>String(p.active||'SIM').toUpperCase()==='SIM').map(p=>`<option value="${F.esc(p.id)}">${F.esc(p.name)}</option>`).join('')}`;
    section.innerHTML=`<div class="tm-panel-head"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">Sequência livre</span><h2>Jogos avulsos de tênis de mesa</h2><p>O vencedor permanece no primeiro seletor. O segundo participante pode ser mantido para repetir o confronto ou trocado por outro desafiante.</p></div></div><div class="flex-v024-current-winner" id="v024TmWinnerNote" hidden></div><div class="flex-v024-versus"><label><span id="v024TmFirstLabel">Participante 1</span><select id="v024TmPlayer1">${options()}</select></label><div class="versus-mark">×</div><label>Desafiante<select id="v024TmPlayer2">${options()}</select></label></div><div class="flex-v023-grid" style="margin-top:12px"><label>Sets<select id="v024TmBest"><option value="1">1 set</option><option value="3" selected>Melhor de 3</option><option value="5">Melhor de 5</option><option value="7">Melhor de 7</option></select></label><label>Pontos por set<input id="v024TmPoints" type="number" min="1" max="99" value="11"></label><label>Vantagem mínima<input id="v024TmLead" type="number" min="1" max="10" value="2"></label><label>Pontos por vitória<input id="v024TmWin" type="number" min="0" max="20" value="3"></label><label>Pontos por derrota<input id="v024TmLoss" type="number" min="0" max="20" value="0"></label></div><div class="flex-v023-actions"><button class="tm-button primary" type="button" id="v024TmNewGame">Novo jogo</button></div><div class="flex-v023-free-list" id="v024TmList"></div>`;
    const first=section.querySelector('#v024TmPlayer1'),second=section.querySelector('#v024TmPlayer2'),button=section.querySelector('#v024TmNewGame'),note=section.querySelector('#v024TmWinnerNote'),firstLabel=section.querySelector('#v024TmFirstLabel');
    function renderSelectors(){
      const open=state.freeOpenMatch,winner=state.freeCurrentWinnerId||'',loser=state.freeLastLoserId||'';
      first.disabled=false;second.disabled=false;button.disabled=false;
      if(open){first.value=open.player1Id;second.value=open.player2Id;first.disabled=true;second.disabled=true;button.disabled=true;firstLabel.textContent='Participante 1';note.hidden=false;note.textContent='Finalize o jogo avulso atual antes de criar o próximo.';return;}
      if(winner){first.value=winner;first.disabled=true;firstLabel.textContent='Vencedor atual';if(!second.value||second.value===winner)second.value=loser&&loser!==winner?loser:'';note.hidden=false;note.textContent=`${state.freeCurrentWinnerName||'O vencedor'} permanece selecionado até perder.`;}
      else{firstLabel.textContent='Participante 1';note.hidden=true;if(first.value&&second.value===first.value)second.value='';}
    }
    function renderList(){const matches=state.freeMatches||[];section.querySelector('#v024TmList').innerHTML=matches.length?matches.map(m=>`<article class="flex-v023-free-item"><div><strong>${F.esc(m.player1)} × ${F.esc(m.player2)}</strong><small>Jogo ${F.num(m.order)} • ${F.esc(m.status)} • melhor de ${F.num(m.bestOf)}${m.winnerId?` • vencedor: ${F.esc(m.winnerId===m.player1Id?m.player1:m.player2)}`:''}</small></div><button class="tm-button secondary" type="button" data-v024-tm-score="${F.esc(m.id)}">${m.status==='FINALIZADO'?'Ver placar':'Lançar placar'}</button></article>`).join(''):'<div class="flex-v023-empty">Nenhum jogo avulso registrado.</div>';}
    function render(){renderSelectors();renderList();}
    render();
    first.addEventListener('change',()=>{if(first.value===second.value)second.value='';});second.addEventListener('change',()=>{if(second.value===first.value){TM.toast('O desafiante precisa ser diferente do vencedor.','warn');second.value='';}});
    button.addEventListener('click',async()=>{if(!first.value||!second.value)return TM.toast('Selecione os dois participantes.','warn');if(first.value===second.value)return TM.toast('Selecione participantes diferentes.','warn');button.disabled=true;try{const result=await TM.request('tmCriarCampeonato',{tipo:'AVULSO',jogador1:first.value,jogador2:second.value,melhorDe:section.querySelector('#v024TmBest').value,pontosSet:section.querySelector('#v024TmPoints').value,vantagemMinima:section.querySelector('#v024TmLead').value,pontosVitoria:section.querySelector('#v024TmWin').value,pontosDerrota:section.querySelector('#v024TmLoss').value});state=result.state;TM.toast(result.message);render();}catch(error){TM.toast(error.message,'error');button.disabled=false;}});
    section.addEventListener('click',event=>{const target=event.target.closest('[data-v024-tm-score]');if(!target)return;const match=(state.freeMatches||[]).find(m=>m.id===target.dataset.v024TmScore);if(match)F.fillScoreModal(modal,match,true);});
    modal.querySelector('[data-score-start]').addEventListener('click',async()=>{try{const result=await TM.request('tmCriarCampeonato',{tipo:'AVULSO_INICIAR',id:modal.dataset.matchId});state=result.state;TM.toast(result.message);modal.hidden=true;render();}catch(error){TM.toast(error.message,'error');}});
    modal.querySelector('[data-score-save]').addEventListener('click',async()=>{const match=(state.freeMatches||[]).find(m=>m.id===modal.dataset.matchId);if(!match)return;try{const result=await TM.request('tmCriarCampeonato',{tipo:'AVULSO_RESULTADO',id:match.id,placar:F.scoresFromModal(modal,match.bestOf)});TM.toast(result.message);modal.hidden=true;setTimeout(()=>location.reload(),500);}catch(error){TM.toast(error.message,'error');}});
  }
  run().catch(error=>console.error('Tênis avulso V024:',error));
})();
