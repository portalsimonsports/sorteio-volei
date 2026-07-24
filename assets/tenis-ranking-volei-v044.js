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
  const fmt=v=>TM.fmt?TM.fmt(v):num(v).toLocaleString('pt-BR',{maximumFractionDigits:1});
  function icon(pos){return pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':pos===4?'⭐':'';}
  function score(match){const sets=Array.isArray(match.scores)?match.scores.filter(s=>Array.isArray(s)&&s[0]!=null&&s[1]!=null):[];return sets.length?sets.map(s=>`${num(s[0])}–${num(s[1])}`).join(' | '):'Placar não informado';}
  function gamesFor(item){return(state?.matches||[]).filter(m=>m.status==='FINALIZADO'&&(m.player1Id===item.id||m.player2Id===item.id)).sort((a,b)=>num(a.game)-num(b.game));}
  function gameMarkup(item,match){const is1=match.player1Id===item.id,opponent=is1?match.player2:match.player1,won=match.winnerId===item.id;return`<article class="trv44-match ${won?'trv44-win':'trv44-loss'}"><div class="trv44-match-head"><strong>Jogo ${num(match.game)}${match.round?` • Rodada ${num(match.round)}`:''}</strong><span class="trv44-result">${won?'VITÓRIA':'DERROTA'}</span></div><div class="trv44-opponent">Contra ${esc(opponent||'Adversário')}</div><div class="trv44-score">${esc(score(match))} • Sets ${is1?num(match.sets1):num(match.sets2)}–${is1?num(match.sets2):num(match.sets1)}</div>${match.finishedAt?`<small>Finalizado em ${esc(TM.dateTime?TM.dateTime(match.finishedAt):String(match.finishedAt))}</small>`:''}</article>`;}
  function render(data){state=data||state||{};rendering=true;const ranking=state.ranking||[];if(!ranking.length){target.innerHTML='<div class="trv44-empty" data-trv44-root>O ranking aparecerá após a geração dos jogos.</div>';rendering=false;return;}target.innerHTML=`<div class="trv44-root" data-trv44-root><div class="trv44-header"><span>Pos.</span><span>Participante</span><span>Pts</span><span>Aprov.</span></div>${ranking.map(item=>{const pos=num(item.position),open=expanded===item.id,games=gamesFor(item),medal=icon(pos);return`<article class="trv44-row top-${pos}${open?' open':''}" data-trv44-id="${esc(item.id)}"><button class="trv44-summary" type="button" aria-expanded="${open?'true':'false'}"><span class="trv44-pos">${medal?`<span class="trv44-medal">${medal}</span>`:''}<b>${pos}º</b></span><span class="trv44-name"><strong>${esc(item.name)}</strong><small>${num(item.wins)} vitória(s) • ${num(item.losses)} derrota(s)${num(item.games)?` • ${num(item.games)} jogo${num(item.games)===1?'':'s'}`:''}</small></span><span class="trv44-stat"><span>Pts</span>${num(item.points)}</span><span class="trv44-stat"><span>Aprov.</span>${fmt(item.winRate)}%</span><span class="trv44-more">${open?'Ocultar jogos':'Ver jogos'} <b>${open?'−':'+'}</b></span></button><div class="trv44-games" ${open?'':'hidden'}>${games.length?games.map(m=>gameMarkup(item,m)).join(''):'<div class="trv44-empty">Nenhuma partida finalizada.</div>'}</div></article>`;}).join('')}</div>`;rendering=false;}
  target.addEventListener('click',e=>{const btn=e.target.closest('.trv44-summary');if(!btn)return;const row=btn.closest('[data-trv44-id]');if(!row)return;expanded=expanded===row.dataset.trv44Id?'':row.dataset.trv44Id;render(state);});
  const observer=new MutationObserver(()=>{if(rendering||target.querySelector('[data-trv44-root]')||!state)return;queueMicrotask(()=>render(state));});observer.observe(target,{childList:true});
  async function refresh(){try{const next=await TM.request(isPublic?'tmEstado':'tmAdmin');render(next);}catch(_){}timer=setTimeout(refresh,isPublic?15000:20000);}
  refresh();window.addEventListener('beforeunload',()=>clearTimeout(timer));
})();