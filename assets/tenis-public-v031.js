(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  const esc = TM.esc, num = TM.num;
  const ui = {};
  ['tmConnection','tmChampionshipName','tmChampionshipMessage','tmParticipantCount','tmGameCount','tmFinishedCount','tmLeader','tmRules','tmRanking','tmMatches','tmSignupForm','tmSignupName','tmSignupAge','tmSignupSex','tmSignupButton','tmSignupMessage'].forEach(id => ui[id] = document.getElementById(id));
  let state = null, scopeData = null, scopeMode = 'GERAL', scopeChampionshipId = '', scopePromise = null;
  let retryTimer = null, heroMode = 'CAMPEONATO', heroPauseUntil = 0, networkRendered = false;
  const CACHE_KEY='tenis_mesa_estado_publico_v054';

  function cacheRead(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return x?.value&&Date.now()-Number(x.savedAt||0)<600000?x.value:null;}catch(_){return null;}}
  function cacheWrite(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),value}));}catch(_){} }
  function quickState(){return new Promise((resolve,reject)=>{const endpoint=String(window.VOLEI_CONFIG?.API_BASE||'').trim();if(!endpoint)return reject(new Error('Serviço não configurado.'));const callback=`__tmPublicV054_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');let done=false;const timer=setTimeout(()=>finish(new Error('Tempo esgotado.')),12000);function finish(error,value){if(done)return;done=true;clearTimeout(timer);script.remove();try{delete window[callback];}catch(_){window[callback]=undefined;}error?reject(error):resolve(value);}window[callback]=response=>{if(response?.ok===true){cacheWrite(response.dados);finish(null,response.dados);}else finish(new Error(response?.erro||'Falha ao atualizar.'));};script.onerror=()=>finish(new Error('Falha de conexão.'));const query=new URLSearchParams({acao:'tmEstado',callback,_:Date.now()});script.src=`${endpoint}${endpoint.includes('?')?'&':'?'}${query}`;document.head.appendChild(script);});}
  const empty = text => `<div class="tm-empty">${esc(text)}</div>`;
  const scoreText = match => Array.isArray(match.scores) && match.scores.length ? `${match.scores.map(set => `${num(set[0])}–${num(set[1])}`).join(' | ')} • Sets ${num(match.sets1)} × ${num(match.sets2)}` : 'Placar ainda não registrado';

  function rankingPrincipal(data){const global=Array.isArray(data?.globalRankingPoints)?data.globalRankingPoints.filter(item=>num(item.games)>0):[];return global.length?global:(Array.isArray(data?.ranking)?data.ranking:[]);}
  function currentChampScope(){const id=scopeChampionshipId||state?.championship?.id||'';return(scopeData?.championships||[]).find(c=>String(c.id)===String(id))||null;}
  function rankingAtual(){
    if(scopeMode==='AVULSOS')return scopeData?((Array.isArray(scopeData.free)?scopeData.free:[])):null;
    if(scopeMode==='CAMPEONATO'){const champ=currentChampScope();return champ?champ.ranking:null;}
    if(scopeData&&Array.isArray(scopeData.general))return scopeData.general;
    return rankingPrincipal(state||{});
  }

  function ensureScopeControls(){
    if(!ui.tmRanking)return;
    let controls=document.getElementById('tmRankingScopesV050');
    if(!controls){
      controls=document.createElement('div');controls.id='tmRankingScopesV050';
      controls.innerHTML=`<button type="button" class="tm-button secondary" data-tm-scope="GERAL">Geral</button><button type="button" class="tm-button secondary" data-tm-scope="CAMPEONATO">Campeonatos</button><button type="button" class="tm-button secondary" data-tm-scope="AVULSOS">Jogos avulsos</button><select id="tmRankingChampionshipV050" style="display:none;min-height:48px;border:1px solid #cad7df;border-radius:16px;padding:0 14px;font:inherit;font-weight:800;background:#fff"></select>`;
      ui.tmRanking.parentElement?.insertBefore(controls,ui.tmRanking);
      controls.addEventListener('click',event=>{const button=event.target.closest('[data-tm-scope]');if(!button)return;scopeMode=button.dataset.tmScope;updateScopeControls();const rank=rankingAtual();if(rank!==null)renderRanking(rank);});
      controls.querySelector('#tmRankingChampionshipV050')?.addEventListener('change',event=>{scopeChampionshipId=event.target.value;const rank=rankingAtual();if(rank!==null)renderRanking(rank);});
    }
    updateScopeControls();
  }
  function updateScopeControls(){
    const controls=document.getElementById('tmRankingScopesV050');if(!controls)return;
    controls.querySelectorAll('[data-tm-scope]').forEach(button=>{const active=button.dataset.tmScope===scopeMode;button.classList.toggle('primary',active);button.classList.toggle('secondary',!active);});
    const select=controls.querySelector('#tmRankingChampionshipV050');if(!select)return;
    const championships=scopeData?.championships||[];
    const current=scopeChampionshipId||state?.championship?.id||championships[0]?.id||'';
    const old=select.value;
    if(championships.length){select.innerHTML=championships.map(champ=>`<option value="${esc(champ.id)}">${esc(champ.name)} — ${esc(String(champ.status||'').replaceAll('_',' '))}</option>`).join('');const chosen=[...select.options].some(o=>o.value===String(old))?old:([...select.options].some(o=>o.value===String(current))?String(current):select.options[0]?.value||'');select.value=chosen;scopeChampionshipId=chosen;}
    select.style.display=scopeMode==='CAMPEONATO'?'':'none';
  }
  async function loadScopes(force=false){
    if(scopePromise)return scopePromise;
    scopePromise=TM.request('tmRankingEscopos').then(data=>{if(data&&typeof data==='object')scopeData=data;ensureScopeControls();updateScopeControls();const rank=rankingAtual();if(rank!==null)renderRanking(rank);renderHero();return data;}).catch(()=>null).finally(()=>{scopePromise=null;});
    return scopePromise;
  }

  function ensureHeroSwitch(){
    const hero=ui.tmChampionshipName?.closest('.tm-hero');if(!hero)return;
    let controls=document.getElementById('tmHeroScopesV054');
    if(!controls){
      controls=document.createElement('div');controls.id='tmHeroScopesV054';controls.className='tm54-hero-switch';
      controls.innerHTML='<button type="button" data-tm54-hero="CAMPEONATO">Campeonato</button><button type="button" data-tm54-hero="AVULSOS">Jogos avulsos</button>';
      const message=ui.tmChampionshipMessage;message?.insertAdjacentElement('afterend',controls);
      const caption=document.createElement('div');caption.id='tmHeroCaptionV054';caption.className='tm54-hero-caption';controls.insertAdjacentElement('afterend',caption);
      controls.addEventListener('click',event=>{const button=event.target.closest('[data-tm54-hero]');if(!button)return;heroMode=button.dataset.tm54Hero;heroPauseUntil=Date.now()+20000;renderHero();});
    }
  }
  function championshipSummary(){
    const champ=state?.championship||null;
    const scoped=(scopeData?.championships||[]).find(c=>String(c.id)===String(champ?.id||''));
    const matches=Array.isArray(state?.matches)?state.matches:[];
    const ranking=scoped?.ranking||state?.ranking||[];
    return{name:champ?.name||'Nenhum campeonato ativo',message:champ?.message||'O próximo campeonato ainda não foi gerado.',participants:scoped?.summary?.participants??state?.participants?.length??0,games:scoped?.summary?.games??matches.length,finished:scoped?.summary?.finished??matches.filter(m=>String(m.status).toUpperCase()==='FINALIZADO').length,leader:scoped?.summary?.leader||ranking[0]?.name||'A definir',caption:'Classificação e jogos da edição atualmente selecionada.'};
  }
  function freeSummary(){const s=scopeData?.freeSummary||state?.rankingSummaries?.free||{};return{name:'Jogos avulsos',message:'Confrontos independentes e histórico consolidado classificado como avulso.',participants:num(s.participants),games:num(s.games),finished:num(s.finished),leader:s.leader||scopeData?.free?.[0]?.name||'A definir',caption:'Resultados reais e históricos avulsos são somados neste painel.'};}
  function renderHero(){
    if(!state)return;ensureHeroSwitch();
    const data=heroMode==='AVULSOS'?freeSummary():championshipSummary();
    if(ui.tmChampionshipName)ui.tmChampionshipName.textContent=data.name;
    if(ui.tmChampionshipMessage)ui.tmChampionshipMessage.textContent=data.message;
    if(ui.tmParticipantCount)ui.tmParticipantCount.textContent=data.participants;
    if(ui.tmGameCount)ui.tmGameCount.textContent=data.games;
    if(ui.tmFinishedCount)ui.tmFinishedCount.textContent=data.finished;
    if(ui.tmLeader)ui.tmLeader.textContent=data.leader;
    const caption=document.getElementById('tmHeroCaptionV054');if(caption)caption.textContent=data.caption;
    document.querySelectorAll('[data-tm54-hero]').forEach(button=>button.classList.toggle('active',button.dataset.tm54Hero===heroMode));
  }

  function renderRanking(ranking=[]){
    if(!ui.tmRanking)return;
    if(!ranking.length){ui.tmRanking.innerHTML=empty(scopeMode==='AVULSOS'?'O ranking de jogos avulsos aparecerá após o primeiro confronto finalizado ou histórico atribuído a Jogos avulsos.':'O ranking aparecerá após os primeiros resultados.');ui.tmRanking.scrollLeft=0;return;}
    ui.tmRanking.innerHTML=`<div class="tm-rank-row header"><span>Pos.</span><span>Participante</span><span>Pts</span><span>J</span><span>V</span><span>D</span><span>Aprov.</span><span>Saldo sets</span></div>${ranking.map(item=>`<article class="tm-rank-row top-${num(item.position)}"><div class="tm-position">${num(item.position)}º</div><div class="tm-rank-name"><strong>${esc(item.name)}</strong><small>${num(item.pointsFor)}–${num(item.pointsAgainst)} pontos disputados</small></div><div class="tm-stat"><span>Pontos</span>${num(item.points)}</div><div class="tm-stat"><span>Jogos</span>${num(item.games)}</div><div class="tm-stat"><span>Vitórias</span>${num(item.wins)}</div><div class="tm-stat"><span>Derrotas</span>${num(item.losses)}</div><div class="tm-stat"><span>Aproveitamento</span>${TM.fmt(item.winRate)}%</div><div class="tm-stat"><span>Saldo de sets</span>${num(item.setDiff)>0?'+':''}${num(item.setDiff)}</div></article>`).join('')}`;
    ui.tmRanking.scrollLeft=0;
  }
  function renderMatches(matches=[]){if(!ui.tmMatches)return;ui.tmMatches.innerHTML=matches.length?matches.map(match=>`<article class="tm-match${match.status==='EM_ANDAMENTO'?' live':''}${match.status==='FINALIZADO'?' final':''}"><div class="tm-match-head"><strong>Jogo ${num(match.game)} <small>• Rodada ${num(match.round)}</small></strong><span class="tm-match-status">${esc(match.status)}</span></div><div class="tm-versus"><article class="${match.winnerId===match.player1Id?'winner':''}"><strong>${esc(match.player1)}</strong><small>${match.status==='FINALIZADO'?`${num(match.sets1)} sets`:'Participante 1'}</small></article><span>×</span><article class="${match.winnerId===match.player2Id?'winner':''}"><strong>${esc(match.player2)}</strong><small>${match.status==='FINALIZADO'?`${num(match.sets2)} sets`:'Participante 2'}</small></article></div><div class="tm-score-summary">${esc(scoreText(match))}</div></article>`).join(''):empty('Os jogos ainda não foram gerados.');}
  function ensureNextPanel(data){let panel=document.getElementById('pa31NextTennis');const champ=data.championship,upcoming=champ&&['NAO_INICIADO','SORTEADO'].includes(String(champ.status||'').toUpperCase())&&(data.matches||[]).length;if(!upcoming){panel?.remove();return;}if(!panel){panel=document.createElement('section');panel.id='pa31NextTennis';panel.className='tm-panel tm-span-12 pa31-next-panel';document.querySelector('.tm-grid')?.insertBefore(panel,document.getElementById('ranking'));}panel.innerHTML=`<div class="tm-panel-head"><div><span class="tm-kicker" style="background:#e7faf4;color:#087556">PRÓXIMO CAMPEONATO</span><h2>${esc(champ.name||'Campeonato preparado')}</h2><p>Participantes e confrontos já definidos, aguardando o início.</p></div><span class="tm-chip">${(data.matches||[]).length} jogos</span></div><div class="pa31-next-grid">${(data.participants||[]).map(p=>`<article class="pa31-next-card"><strong>${esc(p.name)}</strong><small>Participante ${num(p.order)}</small></article>`).join('')}</div><div class="pa31-next-games">${(data.matches||[]).map(m=>`<div class="pa31-next-game">Jogo ${num(m.game)} — ${esc(m.player1)} × ${esc(m.player2)} <span class="pa31-next-status">${esc(m.status)}</span></div>`).join('')}</div>`;}
  function render(data,note=''){
    state=data||{};networkRendered=true;
    if(ui.tmConnection)ui.tmConnection.textContent=note||(state._fallback?'Exibindo os últimos dados disponíveis':'Dados atualizados');
    const champ=state.championship;
    if(ui.tmRules)ui.tmRules.textContent=champ?`${champ.bestOf===1?'1 set':`Melhor de ${champ.bestOf}`} • ${champ.setPoints} pontos por set • diferença mínima de ${champ.minimumLead} • vitória vale ${champ.winPoints} ponto(s)`:'Formato ainda não definido.';
    ensureScopeControls();renderHero();const rank=rankingAtual();if(rank!==null)renderRanking(rank);renderMatches(state.matches||[]);ensureNextPanel(state);
  }
  async function refresh(silent=false){
    clearTimeout(retryTimer);
    try{const data=await quickState();render(data);await loadScopes(true);}
    catch(error){const cached=cacheRead();if(cached&&!state)render(cached,'Exibindo os últimos dados disponíveis');else if(ui.tmConnection)ui.tmConnection.textContent='Atualização temporariamente indisponível. Nova tentativa automática.';if(!silent&&!state)TM.toast('Não foi possível atualizar agora. O sistema tentará novamente.','warn');retryTimer=setTimeout(()=>refresh(true),12000);}
  }
  ui.tmSignupForm?.addEventListener('submit',async event=>{event.preventDefault();ui.tmSignupButton.disabled=true;ui.tmSignupButton.textContent='Inscrevendo...';try{const result=await TM.request('tmInscrever',{nome:ui.tmSignupName.value,idade:ui.tmSignupAge.value,sexo:ui.tmSignupSex.value});ui.tmSignupMessage.textContent=result.message||'Inscrição confirmada.';ui.tmSignupForm.reset();TM.toast(result.message||'Inscrição confirmada.');refresh(true);}catch(error){ui.tmSignupMessage.textContent=error.message;TM.toast(error.message,'error');}finally{ui.tmSignupButton.disabled=false;ui.tmSignupButton.textContent='Confirmar inscrição';}});

  const cached=cacheRead();if(cached)setTimeout(()=>{if(!networkRendered&&!state)render(cached,'Exibindo os últimos dados disponíveis');},1400);
  refresh(Boolean(cached));
  setInterval(()=>refresh(true),20000);
  setInterval(()=>{if(Date.now()<heroPauseUntil||!scopeData?.freeSummary?.games)return;heroMode=heroMode==='CAMPEONATO'?'AVULSOS':'CAMPEONATO';renderHero();},10000);
})();
