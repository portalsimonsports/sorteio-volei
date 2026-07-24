(() => {
  'use strict';
  const page=document.body?.dataset.page||'';
  const isPublic=page==='tenis-mesa-public',isAdmin=page==='tenis-mesa-admin';
  if((!isPublic&&!isAdmin)||!window.TenisMesa)return;
  const TM=window.TenisMesa,target=document.getElementById(isPublic?'tmRanking':'tmAdminRanking');
  if(!target)return;
  let state=null,expanded='',rendering=false,timer=null;
  const esc=TM.esc||((v)=>String(v??''));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  function medal(pos){return pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':pos===4?'⭐':`${pos}º`;}
  function label(pos){return pos===1?'1º LUGAR':pos===2?'2º LUGAR':pos===3?'3º LUGAR':pos===4?'4º LUGAR':`${pos}º LUGAR`;}
  function score(match){const sets=Array.isArray(match.scores)?match.scores.filter(s=>Array.isArray(s)&&s[0]!=null&&s[1]!=null):[];return sets.length?sets.map(s=>`${num(s[0])}–${num(s[1])}`).join(' | '):'Placar não informado';}
  function gamesFor(item){return(state?.matches||[]).filter(m=>m.status==='FINALIZADO'&&(m.player1Id===item.id||m.player2Id===item.id)).sort((a,b)=>num(a.game)-num(b.game));}
  function gameMarkup(item,match){const is1=match.player1Id===item.id,opponent=is1?match.player2:match.player1,won=match.winnerId===item.id;return`<article class="trv33-match ${won?'trv33-win':'trv33-loss'}"><div class="trv33-match-head"><strong>Jogo ${num(match.game)}${match.round?` • Rodada ${num(match.round)}`:''}</strong><span class="trv33-result">${won?'VITÓRIA':'DERROTA'}</span></div><div class="trv33-opponent">Contra ${esc(opponent||'Adversário')}</div><div class="trv33-score">${esc(score(match))} • Sets ${is1?num(match.sets1):num(match.sets2)}–${is1?num(match.sets2):num(match.sets1)}</div>${match.finishedAt?`<small>Finalizado em ${esc(TM.dateTime?TM.dateTime(match.finishedAt):String(match.finishedAt))}</small>`:''}</article>`;}
  function render(data){state=data||state||{};rendering=true;const ranking=state.ranking||[];if(!ranking.length){target.innerHTML='<div class="trv33-empty" data-trv33-root>O ranking aparecerá após os primeiros resultados.</div>';rendering=false;return;}target.innerHTML=`<div class="trv33-root" data-trv33-root>${ranking.map(item=>{const pos=num(item.position),open=expanded===item.id,games=gamesFor(item);return`<article class="trv33-row trv33-pos-${pos}${open?' open':''}" data-trv33-id="${esc(item.id)}"><button class="trv33-summary" type="button" aria-expanded="${open?'true':'false'}"><span class="trv33-position">${medal(pos)}</span><span class="trv33-player"><strong>${esc(item.name)}</strong><small>${num(item.points)} pts • ${num(item.games)} jogo${num(item.games)===1?'':'s'} • ${num(item.wins)} vitória${num(item.wins)===1?'':'s'} • ${TM.fmt?TM.fmt(item.winRate):num(item.winRate)}% aproveitamento • Sets ${num(item.setsFor)}–${num(item.setsAgainst)}</small></span><span class="trv33-label">${label(pos)}</span><span class="trv33-toggle">${open?'Ocultar jogos':'Ver jogos'} <b>${open?'−':'+'}</b></span></button><div class="trv33-games" ${open?'':'hidden'}>${games.length?games.map(m=>gameMarkup(item,m)).join(''):'<div class="trv33-empty">Nenhuma partida finalizada.</div>'}</div></article>`;}).join('')}</div>`;rendering=false;}
  target.addEventListener('click',e=>{const btn=e.target.closest('.trv33-summary');if(!btn)return;const row=btn.closest('[data-trv33-id]');expanded=expanded===row.dataset.trv33Id?'':row.dataset.trv33Id;render(state);});
  const observer=new MutationObserver(()=>{if(rendering||target.querySelector('[data-trv33-root]')||!state)return;queueMicrotask(()=>render(state));});observer.observe(target,{childList:true});
  async function refresh(){try{const next=await TM.request(isPublic?'tmEstado':'tmAdmin');render(next);}catch(_){}timer=setTimeout(refresh,isPublic?15000:20000);}
  refresh();window.addEventListener('beforeunload',()=>clearTimeout(timer));
})();