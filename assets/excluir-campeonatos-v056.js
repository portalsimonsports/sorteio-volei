(() => {
  'use strict';
  const page=document.body?.dataset.page||'';
  if(!['admin','tenis-mesa-admin'].includes(page))return;
  const KEY_STORE='sorteio_volei_admin_key_v10';
  function adminKey(force=false){if(force)localStorage.removeItem(KEY_STORE);let key=String(localStorage.getItem(KEY_STORE)||'').trim();if(!key){key=String(prompt('Informe a chave administrativa:')||'').trim();if(!key)throw new Error('Chave administrativa não informada.');localStorage.setItem(KEY_STORE,key);}return key;}

  function injectVolei(){
    document.querySelectorAll('[data-v035-card]').forEach(card=>{
      const id=card.dataset.v035Card,actions=card.querySelector('.v035-champ-actions');
      if(!id||!actions||actions.querySelector('[data-ec56-delete]'))return;
      const b=document.createElement('button');b.type='button';b.className='btn danger small';b.dataset.ec56Delete=id;b.dataset.ec56Sport='volei';b.textContent='Excluir';actions.appendChild(b);
    });
    document.querySelectorAll('[data-championship-card]').forEach(card=>{
      const id=card.dataset.championshipCard,actions=card.querySelector('.championship-history-actions');
      if(!id||!actions||actions.querySelector('[data-ec56-delete]'))return;
      const b=document.createElement('button');b.type='button';b.className='btn danger small';b.dataset.ec56Delete=id;b.dataset.ec56Sport='volei';b.textContent='Excluir campeonato';actions.appendChild(b);
    });
  }
  function injectTenis(){
    const root=document.getElementById('tmChampionships');if(!root)return;
    root.querySelectorAll('[data-open-championship]').forEach(open=>{
      const id=open.dataset.openChampionship;if(!id||root.querySelector(`[data-ec56-delete="${CSS.escape(id)}"]`))return;
      const b=document.createElement('button');b.type='button';b.className='tm-button secondary ec56-tennis-delete';b.dataset.ec56Delete=id;b.dataset.ec56Sport='tenis';b.textContent='Excluir campeonato';b.style.cssText='margin-top:-6px;margin-bottom:12px;background:#fff1f1;color:#9f1d1d;border-color:#efb6b6;';open.insertAdjacentElement('afterend',b);
    });
  }
  function inject(){page==='admin'?injectVolei():injectTenis();}
  async function removeRemote(sport,id,retry=false){
    const params={id,chave:adminKey(retry)};
    try{
      if(sport==='volei'){
        if(!window.Volei?.championshipRequest)throw new Error('API administrativa do vôlei indisponível.');
        return await window.Volei.championshipRequest('excluirCampeonato',params);
      }
      if(!window.TenisMesa?.request)throw new Error('API administrativa do tênis indisponível.');
      return await window.TenisMesa.request('tmExcluirCampeonato',params);
    }catch(error){
      if(!retry&&/chave administrativa/i.test(String(error?.message||'')))return removeRemote(sport,id,true);
      throw error;
    }
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-ec56-delete]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const id=button.dataset.ec56Delete,sport=button.dataset.ec56Sport;
    const nome=button.closest('[data-v035-card],[data-championship-card]')?.querySelector('strong')?.textContent?.trim()||button.previousElementSibling?.querySelector?.('strong')?.textContent?.trim()||'este campeonato';
    const aviso=`Excluir ${nome}?\n\nSerão apagados o campeonato, todos os jogos e resultados ligados a ele. No tênis, históricos consolidados atribuídos a esse campeonato também serão removidos. Os demais campeonatos e jogos avulsos serão preservados.\n\nEsta ação não pode ser desfeita.`;
    if(!confirm(aviso))return;
    button.disabled=true;const original=button.textContent;button.textContent='Excluindo...';
    try{
      const result=await removeRemote(sport,id,false);
      if(sport==='volei')window.Volei?.toast?.(result?.message||'Campeonato excluído.');else window.TenisMesa?.toast?.(result?.message||'Campeonato excluído.');
      setTimeout(()=>location.reload(),650);
    }catch(error){
      if(sport==='volei')window.Volei?.toast?.(error.message||'Não foi possível excluir o campeonato.','error');else window.TenisMesa?.toast?.(error.message||'Não foi possível excluir o campeonato.','error');
      button.disabled=false;button.textContent=original;
    }
  },true);

  const observer=new MutationObserver(inject);observer.observe(document.body,{childList:true,subtree:true});
  inject();setTimeout(inject,700);setTimeout(inject,1800);
})();
