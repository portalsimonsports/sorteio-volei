(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-public' || !window.FlexV023) return;
  const {installRanking,rankingPanel}=window.FlexV023;
  async function run(){if(!window.TenisMesa)return;const TM=window.TenisMesa;let state=await TM.request('tmEstado');const rp=rankingPanel('Ranking geral do tênis de mesa');document.querySelector('.tm-grid')?.appendChild(rp);const render=installRanking(rp,()=>state,'tenis');setInterval(async()=>{try{state=await TM.request('tmEstado');render?.();}catch(_){}},10000);}
  run().catch(error=>console.error('Flex V023:',error));
})();
