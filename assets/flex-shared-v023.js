(() => {
  'use strict';
  const page = document.body?.dataset.page || '';
  const isTennis = page.startsWith('tenis-mesa');
  if (!document.querySelector('link[data-flex-v023]')) { const link=document.createElement('link'); link.rel='stylesheet'; link.href='assets/flex-rankings-v023.css?v=20260725-1610'; link.dataset.flexV023='1'; document.head.appendChild(link); }
  if (page === 'tenis-mesa-admin') { const script=document.createElement('script'); script.src='assets/flex-tenis-selection-fix-v023.js?v=20260723-1930'; script.defer=true; document.head.appendChild(script); }
  const text = value => String(value ?? '').trim();
  const esc = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const signed = value => { const n=num(value); return `${n>0?'+':''}${n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`; };
  const positionIcon = position => ({1:'🥇',2:'🥈',3:'🥉',4:'⭐'}[num(position)] || '');
  const criterionConfig = {
    PONTOS:{field:'points',direction:-1,label:'Pts'},
    APROVEITAMENTO:{field:'winRate',direction:-1,label:'Aprov.'},
    JOGOS:{field:'games',direction:-1,label:'J'},
    VITORIAS:{field:'wins',direction:-1,label:'V'},
    DERROTAS:{field:'losses',direction:1,label:'D'},
    SALDO_SETS:{field:'setDiff',direction:-1,label:'Saldo'},
    INDICE:{field:'indexVariation',direction:-1,label:'Variação'}
  };
  function sortRanking(items=[],criterion='PONTOS'){
    const config=criterionConfig[criterion]||criterionConfig.PONTOS;
    return items.filter(item=>num(item.games)>0).slice().sort((a,b)=>{
      const primary=(num(a[config.field])-num(b[config.field]))*config.direction;
      if(primary)return primary;
      if(num(a.points)!==num(b.points))return num(b.points)-num(a.points);
      if(num(a.winRate)!==num(b.winRate))return num(b.winRate)-num(a.winRate);
      if(num(a.setDiff)!==num(b.setDiff))return num(b.setDiff)-num(a.setDiff);
      if(num(a.wins)!==num(b.wins))return num(b.wins)-num(a.wins);
      if(num(a.losses)!==num(b.losses))return num(a.losses)-num(b.losses);
      return text(a.name).localeCompare(text(b.name),'pt-BR');
    }).map((item,index)=>Object.assign({},item,{position:index+1}));
  }
  function panel(title, description, id) { const section=document.createElement('section');section.className=isTennis?'tm-panel tm-span-12 flex-v023-panel':'panel flex-v023-panel';section.id=id;section.innerHTML=`<div class="${isTennis?'tm-panel-head':'panel-head'}"><div><span class="${isTennis?'tm-kicker':'kicker'}">Histórico geral</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div></div>`;return section; }
  function rankRows(items=[],criterion='PONTOS'){
    const played=sortRanking(items,criterion);if(!played.length)return'<div class="flex-v023-empty">O ranking geral aparecerá após o primeiro resultado finalizado.</div>';
    const config=criterionConfig[criterion]||criterionConfig.PONTOS,indexMode=criterion==='INDICE';
    const value=item=>{
      if(indexMode)return signed(item.indexVariation);
      if(criterion==='APROVEITAMENTO')return `${num(item.winRate).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
      if(criterion==='SALDO_SETS')return `${num(item.setDiff)>0?'+':''}${num(item.setDiff)}`;
      return num(item[config.field]);
    };
    const fourthLabel=criterion==='APROVEITAMENTO'?'Pts':'Aprov.';
    const fourthValue=item=>criterion==='APROVEITAMENTO'?num(item.points):`${num(item.winRate).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
    const header=`<span>Pos.</span><span>Participante</span><span>${config.label}</span><span>${fourthLabel}</span><span>J</span><span>V</span><span>Saldo</span>`;
    return`<div class="flex-v023-rank-row header">${header}</div>${played.map(item=>{const position=num(item.position),icon=positionIcon(position);return`<article class="flex-v023-rank-row top-${position} ${indexMode?'index-mode':''}"><div class="flex-v023-pos">${icon?`<span class="flex-v023-medal">${icon}</span>`:''}<b>${position}º</b></div><div class="flex-v023-name"><strong>${esc(item.name)}</strong><small>${num(item.wins)} vitória(s) • ${num(item.losses)} derrota(s)</small></div><div class="flex-v023-stat ${indexMode?'variation':''}"><span>${config.label}</span>${value(item)}</div><div class="flex-v023-stat"><span>${fourthLabel}</span>${fourthValue(item)}</div><div class="flex-v023-stat">${num(item.games)}</div><div class="flex-v023-stat">${num(item.wins)}</div><div class="flex-v023-stat">${num(item.setDiff)>0?'+':''}${num(item.setDiff)}</div></article>`;}).join('')}`;
  }
  function installRanking(target,stateGetter,prefix){const wrap=target.querySelector('[data-flex-ranking]');if(!wrap)return;let criterion=localStorage.getItem(`${prefix}_ranking_criterion`)||'PONTOS';if(isTennis&&criterion==='INDICE')criterion='PONTOS';const render=()=>{const state=stateGetter()||{};const list=criterion==='INDICE'?state.globalRankingIndex:state.globalRankingPoints;target.dataset.flexCriterion=criterion;target.querySelectorAll('[data-flex-criterion]').forEach(btn=>btn.classList.toggle('active',btn.dataset.flexCriterion===criterion));wrap.innerHTML=rankRows(Array.isArray(list)?list:[],criterion);};target.addEventListener('click',event=>{const btn=event.target.closest('[data-flex-criterion]');if(!btn)return;criterion=btn.dataset.flexCriterion;localStorage.setItem(`${prefix}_ranking_criterion`,criterion);render();});render();return render;}
  function rankingPanel(title){const description=isTennis?'Todos os jogos finalizados, dentro ou fora de campeonatos, são computados. Ordene por pontuação, aproveitamento, jogos, vitórias, derrotas ou saldo de sets.':'Todos os jogos finalizados são computados. No modo Índice, o valor total fica oculto e somente a variação positiva ou negativa é exibida.';const section=panel(title,description,`flexGlobalRanking-${page}`);const buttons=isTennis?'<button class="tm-button secondary" type="button" data-flex-criterion="PONTOS">Pontuação</button><button class="tm-button secondary" type="button" data-flex-criterion="APROVEITAMENTO">Aproveitamento</button><button class="tm-button secondary" type="button" data-flex-criterion="JOGOS">Jogos</button><button class="tm-button secondary" type="button" data-flex-criterion="VITORIAS">Vitórias</button><button class="tm-button secondary" type="button" data-flex-criterion="DERROTAS">Derrotas</button><button class="tm-button secondary" type="button" data-flex-criterion="SALDO_SETS">Saldo de sets</button>':'<button class="btn secondary small" type="button" data-flex-criterion="PONTOS">Por pontos</button><button class="btn secondary small" type="button" data-flex-criterion="APROVEITAMENTO">Por aproveitamento</button><button class="btn secondary small" type="button" data-flex-criterion="INDICE">Por índice</button>';section.insertAdjacentHTML('beforeend',`<div class="flex-v023-toolbar">${buttons}</div><div class="flex-v023-ranking" data-flex-ranking></div>`);return section;}
  function activeIdsFromTeams(state){const ids=[];(state?.teams||[]).forEach(team=>{if(Array.isArray(team.members))team.members.forEach(member=>member?.id&&ids.push(text(member.id)));else{text(team.adultId).split('|').filter(Boolean).forEach(id=>ids.push(id));if(text(team.childId))ids.push(text(team.childId));}});return[...new Set(ids)];}
  function checks(players,name,selected=[]){const set=new Set(selected);return(players||[]).filter(p=>text(p.active||'SIM').toUpperCase()==='SIM').map(p=>`<label class="flex-v023-check"><input type="checkbox" name="${esc(name)}" value="${esc(p.id)}" ${set.has(text(p.id))?'checked':''}><span>${esc(p.name)} <small>${num(p.age)?`• ${num(p.age)} anos`:''}</small></span></label>`).join('');}
  function selectedValues(root,name){return[...root.querySelectorAll(`input[name="${name}"]:checked`)].map(input=>input.value);}
  function createScoreModal(kind){let modal=document.getElementById(`flexScoreModal-${kind}`);if(modal)return modal;modal=document.createElement('div');modal.className='flex-v023-modal';modal.id=`flexScoreModal-${kind}`;modal.hidden=true;modal.innerHTML=`<div class="flex-v023-modal-card"><h2 data-score-title>Lançar placar</h2><p data-score-description></p><div class="flex-v023-score-grid" data-score-fields></div><div class="flex-v023-actions"><button type="button" class="${kind==='tm'?'tm-button secondary':'btn secondary'}" data-score-start>Registrar início</button><button type="button" class="${kind==='tm'?'tm-button primary':'btn primary'}" data-score-save>Salvar placar</button><button type="button" class="${kind==='tm'?'tm-button secondary':'btn light'}" data-score-close>Fechar</button></div></div>`;document.body.appendChild(modal);modal.querySelector('[data-score-close]').addEventListener('click',()=>{modal.hidden=true;});modal.addEventListener('click',event=>{if(event.target===modal)modal.hidden=true;});return modal;}
  function fillScoreModal(modal,match,sameTarget){modal.dataset.matchId=match.id;modal.querySelector('[data-score-title]').textContent=`${sameTarget?match.player1:match.team1?.name} × ${sameTarget?match.player2:match.team2?.name}`;modal.querySelector('[data-score-description]').textContent=`Melhor de ${match.bestOf}. O resultado final será incluído no ranking geral.`;const fields=modal.querySelector('[data-score-fields]'),labels=sameTarget?[match.player1,match.player2]:[match.team1?.name,match.team2?.name];fields.innerHTML=Array.from({length:num(match.bestOf)},(_,index)=>`<strong>${index+1}º set</strong><label>${esc(labels[0])}<input type="number" min="0" step="1" data-flex-score="${index}-0" value="${match.scores?.[index]?.[0]??''}"></label><label>${esc(labels[1])}<input type="number" min="0" step="1" data-flex-score="${index}-1" value="${match.scores?.[index]?.[1]??''}"></label>`).join('');modal.querySelector('[data-score-start]').disabled=match.status==='FINALIZADO'||Boolean(match.startedAt);modal.querySelector('[data-score-save]').disabled=match.status==='FINALIZADO';modal.hidden=false;}
  function scoresFromModal(modal,bestOf){return Array.from({length:num(bestOf)},(_,index)=>[0,1].map(side=>{const value=modal.querySelector(`[data-flex-score="${index}-${side}"]`)?.value??'';return value===''?null:Number(value);}));}
  window.FlexV023={text,esc,num,wait,panel,rankRows,sortRanking,installRanking,rankingPanel,activeIdsFromTeams,checks,selectedValues,createScoreModal,fillScoreModal,scoresFromModal,signed,positionIcon};
})();