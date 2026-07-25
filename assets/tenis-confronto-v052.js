(() => {
  'use strict';
  if (document.body?.dataset.page !== 'tenis-mesa-admin' || !window.TenisMesa) return;
  const TM = window.TenisMesa;
  window.__TM52_SCORE_RULES = window.__TM52_SCORE_RULES || {};
  let quick = null;
  let activeFreeId = '';
  let refreshing = false;
  let decorating = false;

  const text = value => String(value ?? '').trim();
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const pairKey = (a, b) => {
    a = text(a); b = text(b);
    if (!a || !b) return '';
    return a < b ? `${a}||${b}` : `${b}||${a}`;
  };

  async function refreshQuick() {
    if (refreshing) return quick;
    refreshing = true;
    try { quick = await TM.request('tmPlacarEstadoRapido'); }
    catch (_) {}
    finally { refreshing = false; }
    return quick;
  }

  function h2h(match) {
    const key = pairKey(match?.player1Id, match?.player2Id);
    const row = key ? quick?.headToHead?.[key] : null;
    const w1 = num(row?.wins?.[match?.player1Id]);
    const w2 = num(row?.wins?.[match?.player2Id]);
    const games = num(row?.games);
    return { w1, w2, games };
  }

  function h2hText(match) {
    const d = h2h(match);
    const v1 = d.w1 === 1 ? 'vitória' : 'vitórias';
    const v2 = d.w2 === 1 ? 'vitória' : 'vitórias';
    const jogos = d.games === 1 ? 'jogo finalizado' : 'jogos finalizados';
    return `Confronto direto: ${match.player1} ${d.w1} ${v1} × ${d.w2} ${v2} ${match.player2} • ${d.games} ${jogos}`;
  }

  function addHeadToHead(root, match) {
    const head = root?.querySelector('.pa31-score-head > div');
    if (!head || !match) return;
    let el = head.querySelector('.tm52-head-to-head');
    if (!el) {
      el = document.createElement('small');
      el.className = 'tm52-head-to-head';
      head.appendChild(el);
    }
    el.textContent = h2hText(match);
  }

  function applyRuleLabels(root, points, lead) {
    root?.querySelectorAll('.pa31-set:not(.complete) header span').forEach(el => {
      el.textContent = `${points} pontos • diferença ${lead}`;
    });
  }

  function addFreeRuleBar(root, match) {
    if (!root || !match?.id) return;
    const current = window.__TM52_SCORE_RULES[match.id] || { points: num(match.setPoints) || 11, lead: num(match.minimumLead) || 2 };
    current.lead = 2;
    window.__TM52_SCORE_RULES[match.id] = current;
    let bar = root.querySelector('.tm52-rule-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'tm52-rule-bar';
      bar.innerHTML = '<strong>Pontos por set</strong><div class="tm52-rule-options"><button type="button" data-tm52-points="5">5 pontos</button><button type="button" data-tm52-points="11">11 pontos</button></div><span>Diferença mínima: 2</span>';
      const head = root.querySelector('.pa31-score-head');
      head?.insertAdjacentElement('afterend', bar);
      bar.addEventListener('click', event => {
        const button = event.target.closest('[data-tm52-points]');
        if (!button) return;
        const points = Number(button.dataset.tm52Points) || 11;
        window.__TM52_SCORE_RULES[match.id] = { points, lead: 2 };
        match.setPoints = points;
        match.minimumLead = 2;
        bar.querySelectorAll('[data-tm52-points]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.tm52Points) === points));
        applyRuleLabels(root, points, 2);
        root.querySelector('[data-pa31-save]')?.click();
      });
    }
    bar.querySelectorAll('[data-tm52-points]').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.tm52Points) === Number(current.points)));
    applyRuleLabels(root, current.points, 2);
  }

  function freeMatch() {
    return (quick?.freeMatches || []).find(item => text(item.id) === text(activeFreeId)) || null;
  }

  function championshipMatch() {
    const game = document.getElementById('tmMatchSelect')?.value;
    return (quick?.matches || []).find(item => String(item.game) === String(game)) || null;
  }

  function decorate() {
    if (decorating) return;
    decorating = true;
    try {
      const freeRoot = document.getElementById('pa31TennisModalRoot');
      const modal = document.getElementById('pa31TennisModal');
      const fm = freeMatch();
      if (freeRoot && modal && !modal.hidden && fm) {
        addHeadToHead(freeRoot, fm);
        addFreeRuleBar(freeRoot, fm);
      }
      const champRoot = document.getElementById('tmScoreFields');
      const cm = championshipMatch();
      if (champRoot && cm) addHeadToHead(champRoot, cm);
    } finally { decorating = false; }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-tm-free-score]');
    if (!button) return;
    activeFreeId = text(button.dataset.tmFreeScore);
    refreshQuick().then(() => setTimeout(decorate, 20));
  }, true);

  document.getElementById('tmMatchSelect')?.addEventListener('change', () => {
    refreshQuick().then(() => setTimeout(decorate, 20));
  });

  const observer = new MutationObserver(() => {
    setTimeout(decorate, 0);
    const status = document.querySelector('#pa31TennisModalRoot [data-pa31-status]')?.textContent || '';
    if (/encerrada|correção salva/i.test(status)) refreshQuick().then(decorate);
  });
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });

  refreshQuick().then(decorate);
})();
