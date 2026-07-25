(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public') return;
  const ranking=document.getElementById('tmRanking');if(!ranking)return;
  function reset(){ranking.scrollLeft=0;}
  document.addEventListener('click',event=>{if(event.target.closest('[data-tm-scope]'))setTimeout(reset,0);},true);
  document.addEventListener('change',event=>{if(event.target.closest('#tmRankingChampionshipV050'))setTimeout(reset,0);},true);
  new MutationObserver(reset).observe(ranking,{childList:true});
})();
