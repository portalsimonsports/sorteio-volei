(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public' || !window.TenisMesa) return;
  const TM = window.TenisMesa, F = window.FlexV023;
  const esc = TM.esc, num = TM.num;
  const ui = {};
  ['tmConnection','tmChampionshipName','tmChampionshipMessage','tmParticipantCount','tmGameCount','tmFinishedCount','tmLeader','tmRules','tmRanking','tmMatches','tmSignupForm','tmSignupName','tmSignupAge','tmSignupSex','tmSignupButton','tmSignupMessage'].forEach(id => ui[id] = document.getElementById(id));
  let state = null, retryTimer = null, globalPanel = null, globalRender = null;
  const CACHE_KEY='tenis_mesa_estado_publico_v031';
  function cacheRead(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')?.value||null;}catch(_){return null;}}
  function cacheWrite(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),value}));}catch(_){}}
  function quickState(){return new Promise((resolve,reject)=>{const endpoint=String(window.VOLEI_CONFIG?.API_BASE||'').trim();if(!endpoint)return reject(new Error('Serviço não configurado.'));const callback=`__tmPublicV031_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error('Tempo esgotado.')),9000);function finish(error,value){if(done)return;done=true;clearTimeout(timer);script.remove();try{delete window[callback];}catch(_){window[callback]=undefined;}error?reject(error):resolve(value);}window[callback]=response=>{if(response?.ok===true){cacheWrite(response.dados);finish(null,response.dados);}else finish(new Error(response?.erro||'Falha ao atualizar.'));};script.onerror=()=>finish(new Error('Falha de conexão.'));const query=new URLSearchParams({acao:'tmEstado',callback,_:Date.now()});script.src=`${endpoint}${endpoint.includes('?')?'&':'?'}${query}`;document.head.appendChild(script);});}
  const empty = text => `<div class="tm-empty">${esc(text)}</div>`;
  const scoreText = match => Array.isArray(match.scores) && match.scores.length ? `${match.scores.map(set => `${num(set[0])}–${num(set[1])}`).join(' | ')} • Sets ${num(match.sets1)} × ${num(match.sets2)}` : 'Placar ainda não registrado';

  function renderRanking(ranking = []) {
    if (!ui.tmRanking) return;
    if (!ranking.length) { ui.tmRanking.innerHTML = empty('O ranking aparecerá após os primeiros resultados.'); return; }
    ui.tmRanking.innerHTML = `<div class="tm-rank-row header"><span>Pos.</span><span>Participante</span><span>Pts</span><span>J</span><span>V</span><span>D</span><span>Aprov.</span><span>Saldo sets</span></div>${ranking.map(item => `<article class="tm-rank-row top-${num(item.position)}"><div class="tm-position">${num(item.position)}º</div><div class="tm-rank-name"><strong>${esc(item.name)}</strong><small>${num(item.pointsFor)}–${num(item.pointsAgainst)} pontos disputados</small></div><div class="tm-stat"><span>Pontos</span>${num(item.points)}</div><div class="tm-stat"><span>Jogos</span>${num(item.games)}</div><div class="tm-stat"><span>Vitórias</span>${num(item.wins)}</div><div class="tm-stat"><span>Derrotas</span>${num(item.losses)}</div><div class="tm-stat"><span>Aproveitamento</span>${TM.fmt(item.winRate)}%</div><div class="tm-stat"><span>Saldo de sets</span>${num(item.setDiff)>0?'+':''}${num(item.setDiff)}</div></article>`).join('')}`;
  }
  function renderMatches(matches = []) {
    if (!ui.tmMatches) return;
    ui.tmMatches.innerHTML = matches.length ? matches.map(match => `<article class="tm-match${match.status==='EM_ANDAMENTO'?' live':''}${match.status==='FINALIZADO'?' final':''}"><div class="tm-match-head"><strong>Jogo ${num(match.game)} <small>• Rodada ${num(match.round)}</small></strong><span class="tm-match-status">${esc(match.status)}</span></div><div class="tm-versus"><article class="${match.winnerId===match.player1Id?'winner':''}"><strong>${esc(match.player1)}</strong><small>${match.status==='FINALIZADO'?`${num(match.sets1)} sets`:'Participante 1'}</small></article><span>×</span><article class="${match.winnerId===match.player2Id?'winner':''}"><strong>${esc(match.player2)}</strong><small>${match.status==='FINALIZADO'?`${num(match.sets2)} sets`:'Participante 2'}</small></article></div><div class="tm-score-summary">${esc(scoreText(match))}</div></article>`).join('') : empty('Os jogos ainda não foram gerados.');
  }
  function ensureNextPanel(data) {
    let panel = document.getElementById('pa31NextTennis');
    const champ = data.championship, upcoming = champ && ['NAO_INICIADO','SORTEADO'].includes(String(champ.status||'').toUpperCase()) && (data.matches||[]).length;
    if (!upcoming) { panel?.remove(); return; }
    if (!panel) { panel = document.createElement('section'); panel.id='pa31NextTennis'; panel.className='tm-panel tm-span-12 pa31-next-panel'; document.querySelector('.tm-grid')?.insertBefore(panel, document.getElementById('ranking')); }
    panel.innerHTML = `<div class="tm-panel-head"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">PRÓXIMO CAMPEONATO</span><h2>${esc(champ.name||'Campeonato preparado')}</h2><p>Participantes e confrontos já definidos, aguardando o início.</p></div><span class="tm-chip">${(data.matches||[]).length} jogos</span></div><div class="pa31-next-grid">${(data.participants||[]).map(p=>`<article class="pa31-next-card"><strong>${esc(p.name)}</strong><small>Participante ${num(p.order)}</small></article>`).join('')}</div><div class="pa31-next-games">${(data.matches||[]).map(m=>`<div class="pa31-next-game">Jogo ${num(m.game)} — ${esc(m.player1)} × ${esc(m.player2)} <span class="pa31-next-status">${esc(m.status)}</span></div>`).join('')}</div>`;
  }
  function installGlobal(data) {
    if (!F?.rankingPanel) return;
    if (!globalPanel) { globalPanel = F.rankingPanel('Ranking geral do tênis de mesa'); document.querySelector('.tm-grid')?.appendChild(globalPanel); globalRender = F.installRanking(globalPanel, () => state, 'tenis'); }
    globalRender?.();
  }
  function render(data, note = '') {
    state = data || {};
    const champ = state.championship, ranking = state.ranking || [], matches = state.matches || [];
    if (ui.tmConnection) ui.tmConnection.textContent = note || (state._fallback ? 'Exibindo os últimos dados disponíveis' : 'Dados atualizados');
    if (ui.tmChampionshipName) ui.tmChampionshipName.textContent = champ?.name || 'Nenhum campeonato ativo';
    if (ui.tmChampionshipMessage) ui.tmChampionshipMessage.textContent = champ?.message || 'As inscrições estão abertas. O próximo campeonato ainda não foi gerado.';
    if (ui.tmParticipantCount) ui.tmParticipantCount.textContent = state.participants?.length || 0;
    if (ui.tmGameCount) ui.tmGameCount.textContent = matches.length;
    if (ui.tmFinishedCount) ui.tmFinishedCount.textContent = matches.filter(m=>m.status==='FINALIZADO').length;
    if (ui.tmLeader) ui.tmLeader.textContent = ranking[0]?.name || 'A definir';
    if (ui.tmRules) ui.tmRules.textContent = champ ? `Melhor de ${champ.bestOf} • ${champ.setPoints} pontos por set • diferença mínima de ${champ.minimumLead} • vitória vale ${champ.winPoints} ponto(s)` : 'Formato ainda não definido.';
    renderRanking(ranking); renderMatches(matches); ensureNextPanel(state); installGlobal(state);
  }
  async function refresh(silent = false) {
    clearTimeout(retryTimer);
    try { render(await quickState()); }
    catch (error) {
      const cached = cacheRead();
      if (cached) render(cached, 'Exibindo os últimos dados disponíveis');
      else if (ui.tmConnection) ui.tmConnection.textContent = 'Atualização temporariamente indisponível. Nova tentativa automática.';
      if (!silent && !cached) TM.toast('Não foi possível atualizar agora. O sistema tentará novamente.', 'warn');
      retryTimer = setTimeout(() => refresh(true), 12000);
    }
  }
  ui.tmSignupForm?.addEventListener('submit', async event => {
    event.preventDefault(); ui.tmSignupButton.disabled=true; ui.tmSignupButton.textContent='Inscrevendo...';
    try { const result=await TM.request('tmInscrever',{nome:ui.tmSignupName.value,idade:ui.tmSignupAge.value,sexo:ui.tmSignupSex.value}); ui.tmSignupMessage.textContent=result.message||'Inscrição confirmada.';ui.tmSignupForm.reset();TM.toast(result.message||'Inscrição confirmada.');refresh(true); }
    catch(error){ui.tmSignupMessage.textContent=error.message;TM.toast(error.message,'error');}
    finally{ui.tmSignupButton.disabled=false;ui.tmSignupButton.textContent='Confirmar inscrição';}
  });
  const cached = cacheRead(); if (cached) render(cached,'Exibindo os últimos dados disponíveis');
  refresh(Boolean(cached)); setInterval(() => refresh(true), 20000);
})();
