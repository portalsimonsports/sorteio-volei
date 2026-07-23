(() => {
  'use strict';
  if (document.body?.dataset.page !== 'public' || !window.FlexV023) return;
  const {installRanking,rankingPanel}=window.FlexV023;
  async function run(){if(!window.Volei)return;const V=window.Volei;let state=await V.request('estado');const rp=rankingPanel('Ranking geral do vôlei');document.querySelector('main')?.appendChild(rp);const render=installRanking(rp,()=>state,'volei');setInterval(async()=>{try{state=await V.request('estado');render?.();}catch(_){}},10000);}
  run().catch(error=>console.error('Flex V023:',error));
})();
