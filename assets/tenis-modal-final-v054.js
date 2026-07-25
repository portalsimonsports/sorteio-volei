(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin') return;

  function patchModal() {
    const modal=document.getElementById('pa31TennisModal');
    if(!modal||modal.hidden)return;
    const root=modal.querySelector('.pa31-scoreboard');if(!root)return;
    const correction=/Modo de correção|Resultado finalizado/i.test(root.textContent||'');
    if(!correction)return;
    const inputs=[...root.querySelectorAll('[data-pa31-value][data-set="0"]')];
    if(inputs.length<2)return;
    const a=Number(inputs.find(i=>i.dataset.side==='0')?.value||0),b=Number(inputs.find(i=>i.dataset.side==='1')?.value||0);
    const leadMatch=(root.querySelector('.pa31-set header span')?.textContent||'').match(/diferença\s+(\d+)/i),lead=Math.max(1,Number(leadMatch?.[1]||2));
    if(a===b||Math.max(a,b)<=0||Math.abs(a-b)<lead)return;
    const sets=root.querySelector('.pa31-sets');if(sets)sets.textContent=`Sets ${a>b?1:0} × ${b>a?1:0}`;
    const first=root.querySelector('.pa31-set');if(first){first.classList.add('complete');const label=first.querySelector('header span');if(label)label.textContent='Encerrado';}
  }
  const observer=new MutationObserver(()=>patchModal());
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','value','class']});
  document.addEventListener('click',event=>{if(event.target.closest('[data-pa31-save], [data-pa31-delta]')){setTimeout(patchModal,80);setTimeout(patchModal,350);}},true);
})();
