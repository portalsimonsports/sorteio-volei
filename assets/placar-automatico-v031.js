(() => {
  'use strict';
  const page = document.body?.dataset.page || '';
  const isVolley = page === 'admin';
  const isTennis = page === 'tenis-mesa-admin';
  if (!isVolley && !isTennis) return;

  const API = isVolley ? window.Volei : window.TenisMesa;
  if (!API) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const adminKey = () => localStorage.getItem('sorteio_volei_admin_key_v10') || '';
  const cloneScores = (scores, bestOf) => Array.from({ length: bestOf }, (_, i) => {
    const pair = Array.isArray(scores?.[i]) ? scores[i] : [0, 0];
    return [Math.max(0, num(pair[0])), Math.max(0, num(pair[1]))];
  });

  function analyze(scores, rules) {
    const needed = Math.floor(rules.bestOf / 2) + 1;
    let sets1 = 0, sets2 = 0, matchComplete = false, winnerSide = 0, currentSet = 0;
    const completed = [];
    for (let i = 0; i < rules.bestOf; i++) {
      const [a, b] = scores[i] || [0, 0];
      if (matchComplete) { completed.push(false); continue; }
      const target = rules.sameTarget ? rules.normal : (rules.bestOf > 1 && i === rules.bestOf - 1 ? rules.tie : rules.normal);
      const done = a !== b && Math.max(a, b) >= target && Math.abs(a - b) >= rules.lead;
      completed.push(done);
      if (done) {
        if (a > b) sets1++; else sets2++;
        if (sets1 >= needed || sets2 >= needed) { matchComplete = true; winnerSide = sets1 > sets2 ? 1 : 2; currentSet = i; }
        else currentSet = Math.min(i + 1, rules.bestOf - 1);
      } else { currentSet = i; break; }
    }
    return { needed, sets1, sets2, completed, matchComplete, winnerSide, currentSet };
  }

  class ScoreController {
    constructor({ root, match, rules, names, save, onState, compact = false }) {
      this.root = root; this.match = match; this.rules = rules; this.names = names; this.saveFn = save; this.onState = onState;
      this.scores = cloneScores(match.scores, rules.bestOf); this.timer = null; this.saving = false; this.queued = false; this.compact = compact;
      this.render();
    }
    render() {
      const result = analyze(this.scores, this.rules);
      const correction = String(this.match.status || '').toUpperCase() === 'FINALIZADO';
      this.root.className = `pa31-scoreboard${this.compact ? ' compact' : ''}`;
      this.root.innerHTML = `<div class="pa31-score-head"><div><strong>${esc(this.names[0])} × ${esc(this.names[1])}</strong><small>${correction ? 'Modo de correção: o resultado pode ser ajustado.' : 'Cada alteração é salva automaticamente.'}</small></div><div class="pa31-sets">Sets ${result.sets1} × ${result.sets2}</div></div><div class="pa31-set-list">${Array.from({ length: this.rules.bestOf }, (_, index) => this.setMarkup(index, result)).join('')}</div><div class="pa31-save-line"><span data-pa31-status>${correction ? 'Resultado finalizado — edição permitida' : 'Pronto para atualizar'}</span><button type="button" data-pa31-save>Salvar agora</button></div>`;
      this.root.querySelectorAll('[data-pa31-delta]').forEach(button => button.addEventListener('click', () => {
        const index = Number(button.dataset.set), side = Number(button.dataset.side), delta = Number(button.dataset.pa31Delta);
        this.scores[index][side] = Math.max(0, this.scores[index][side] + delta);
        this.render();
        const next = analyze(this.scores, this.rules);
        this.scheduleSave(next.matchComplete ? 40 : 220);
      }));
      this.root.querySelectorAll('[data-pa31-value]').forEach(input => input.addEventListener('change', () => {
        const index = Number(input.dataset.set), side = Number(input.dataset.side);
        this.scores[index][side] = Math.max(0, Math.floor(num(input.value)));
        this.render(); this.scheduleSave(180);
      }));
      this.root.querySelector('[data-pa31-save]')?.addEventListener('click', () => this.persist(true));
    }
    setMarkup(index, result) {
      const [a, b] = this.scores[index], target = this.rules.sameTarget ? this.rules.normal : (this.rules.bestOf > 1 && index === this.rules.bestOf - 1 ? this.rules.tie : this.rules.normal);
      const complete = result.completed[index], afterFinish = result.matchComplete && index > result.currentSet;
      return `<article class="pa31-set ${complete ? 'complete' : ''} ${afterFinish ? 'after-finish' : ''}"><header><strong>${index + 1}º set</strong><span>${complete ? 'Encerrado' : `${target} pontos • diferença ${this.rules.lead}`}</span></header><div class="pa31-side"><span>${esc(this.names[0])}</span><button type="button" data-pa31-delta="-1" data-set="${index}" data-side="0" aria-label="Diminuir ponto de ${esc(this.names[0])}">−</button><input data-pa31-value data-set="${index}" data-side="0" type="number" min="0" value="${a}"><button type="button" data-pa31-delta="1" data-set="${index}" data-side="0" aria-label="Aumentar ponto de ${esc(this.names[0])}">+</button></div><div class="pa31-side"><span>${esc(this.names[1])}</span><button type="button" data-pa31-delta="-1" data-set="${index}" data-side="1" aria-label="Diminuir ponto de ${esc(this.names[1])}">−</button><input data-pa31-value data-set="${index}" data-side="1" type="number" min="0" value="${b}"><button type="button" data-pa31-delta="1" data-set="${index}" data-side="1" aria-label="Aumentar ponto de ${esc(this.names[1])}">+</button></div></article>`;
    }
    status(text, type = '') { const el = this.root.querySelector('[data-pa31-status]'); if (el) { el.textContent = text; el.dataset.type = type; } }
    scheduleSave(delay) { clearTimeout(this.timer); this.status('Alteração pendente...', 'pending'); this.timer = setTimeout(() => this.persist(false), delay); }
    async persist(manual) {
      clearTimeout(this.timer);
      if (this.saving) { this.queued = true; return; }
      this.saving = true; this.status('Salvando...', 'saving');
      try {
        const result = await this.saveFn(this.scores);
        const saved = result?.savedMatch ? { ...this.match, ...result.savedMatch } : this.findUpdatedMatch(result?.state);
        if (saved) this.match = saved;
        if (this.onState) this.onState(result?.state || null, result);
        this.status(result?.partial ? 'Placar salvo' : (result?.corrected ? 'Correção salva' : 'Partida encerrada automaticamente'), 'ok');
        if (!result?.partial) { this.scores = cloneScores(this.match.scores?.length ? this.match.scores : this.scores, this.rules.bestOf); setTimeout(() => this.render(), 180); }
      } catch (error) {
        this.status(error.message || 'Não foi possível salvar. A alteração permanece nesta tela.', 'error');
        if (manual) API.toast?.(error.message || 'Não foi possível salvar o placar.', 'error');
      } finally {
        this.saving = false;
        if (this.queued) { this.queued = false; this.persist(false); }
      }
    }
    findUpdatedMatch(state) {
      if (!state) return null;
      if (this.match.id) return (state.freeMatches || []).find(item => item.id === this.match.id) || null;
      return (state.matches || []).find(item => String(item.game) === String(this.match.game)) || null;
    }
  }

  let state = null, controller = null;
  const flattenVolley = data => (data?.rounds || []).flatMap(round => round.matches || []);

  function ensureModal(id, rootId) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement('div'); modal.id = id; modal.className = 'pa31-modal'; modal.hidden = true;
      modal.innerHTML = `<div class="pa31-modal-card"><button type="button" class="pa31-close" aria-label="Fechar">×</button><div id="${rootId}"></div></div>`;
      document.body.appendChild(modal);
      modal.querySelector('.pa31-close').addEventListener('click', () => { modal.hidden = true; });
      modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
    }
    return modal;
  }

  function volleyRules(data) {
    const champ = data?.championship || {}, settings = champ.settings || {}, r = data?.rules || {};
    return {
      bestOf:num(champ.bestOf || settings.bestOf || r.bestOf || 3),
      normal:num(champ.normalPoints || settings.normalPoints || r.normalSetPoints || 25),
      tie:num(champ.tiebreakPoints || settings.tiebreakPoints || r.tiebreakSetPoints || 15),
      lead:num(champ.minimumLead || settings.minimumLead || r.minimumLead || 2),
      sameTarget:false
    };
  }

  function patchVolley(savedMatch) {
    if (!savedMatch || !state) return;
    (state.rounds || []).forEach(round => (round.matches || []).forEach((match, index) => {
      if (String(match.game) === String(savedMatch.game)) round.matches[index] = { ...match, ...savedMatch };
    }));
  }

  function renderVolleyScoreList() {
    let list = document.getElementById('pa49VolleyScoreList');
    const form = document.getElementById('scoreForm');
    if (!form) return;
    if (!list) { list = document.createElement('div'); list.id = 'pa49VolleyScoreList'; list.className = 'flex-v023-free-list'; form.insertAdjacentElement('afterend', list); }
    const matches = flattenVolley(state).filter(match => match.team1 && match.team2);
    list.innerHTML = matches.length ? matches.map(match => `<article class="flex-v023-free-item"><div><strong>Jogo ${num(match.game)} — ${esc(API.teamName(match.team1))} × ${esc(API.teamName(match.team2))}</strong><small>${esc(match.phase || '')} • ${esc(match.status || '')} • Sets ${num(match.sets1)} × ${num(match.sets2)}</small></div><button class="btn secondary" type="button" data-volley-score="${num(match.game)}">${String(match.status).toUpperCase()==='FINALIZADO'?'Editar placar':'Atualizar placar'}</button></article>`).join('') : '<div class="pa31-empty">Nenhuma partida disponível para placar.</div>';
  }

  function openVolley(match, modal) {
    if (!match) return;
    modal.hidden = false;
    controller = new ScoreController({
      root:modal.querySelector('#pa49VolleyModalRoot'), match, rules:volleyRules(state),
      names:[API.teamName(match.team1), API.teamName(match.team2)], compact:true,
      save:scores => API.request('salvarPlacarAutomatico', { jogo:match.game, payload:JSON.stringify({ scores }), chave:adminKey() }),
      onState:(newState,result) => {
        if (newState) state = newState;
        else if (result?.savedMatch) patchVolley(result.savedMatch);
        renderVolleyScoreList();
      }
    });
  }

  async function installVolley() {
    const form = document.getElementById('scoreForm'), select = document.getElementById('scoreGame'), root = document.getElementById('scoreSetsContainer');
    if (!form || !select || !root) return;
    const actions = form.querySelector('.match-control-actions'); if (actions) actions.style.display = 'none';
    root.innerHTML = '<div class="pa31-empty">Selecione uma partida ou use o botão Atualizar placar abaixo.</div>';
    const modal = ensureModal('pa49VolleyModal','pa49VolleyModalRoot');
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-volley-score]'); if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation();
      openVolley(flattenVolley(state).find(item => String(item.game) === String(button.dataset.volleyScore)), modal);
    }, true);
    state = await API.request('admin');
    const populate = keep => {
      const matches = flattenVolley(state).filter(match => match.team1 && match.team2);
      select.innerHTML = '<option value="">Selecione uma partida</option>' + matches.map(match => `<option value="${match.game}">Jogo ${match.game} — ${esc(API.teamName(match.team1))} × ${esc(API.teamName(match.team2))} — ${esc(match.status)}</option>`).join('');
      if (keep && [...select.options].some(o => o.value === String(keep))) select.value = String(keep);
    };
    populate(); renderVolleyScoreList();
    select.addEventListener('change', () => {
      const match = flattenVolley(state).find(item => String(item.game) === select.value);
      if (match) openVolley(match,modal);
    }, true);
  }

  function readTennisCache() {
    try { return JSON.parse(localStorage.getItem('tenis_mesa_estado_admin_v030') || 'null')?.value || null; } catch (_) { return null; }
  }
  function mergeTennisQuick(base, quick) {
    return { ...(base || {}), ...(quick || {}), matches:Array.isArray(quick?.matches)?quick.matches:(base?.matches||[]), freeMatches:Array.isArray(quick?.freeMatches)?quick.freeMatches:(base?.freeMatches||[]) };
  }
  function patchTennis(result) {
    if (!result?.savedMatch || !state) return;
    if (result.savedMatch.id) {
      const list = Array.isArray(state.freeMatches) ? state.freeMatches.slice() : [];
      const i = list.findIndex(item => item.id === result.savedMatch.id); if (i >= 0) list[i] = result.savedMatch; else list.unshift(result.savedMatch); state.freeMatches = list;
    } else {
      const list = Array.isArray(state.matches) ? state.matches.slice() : [];
      const i = list.findIndex(item => String(item.game) === String(result.savedMatch.game)); if (i >= 0) list[i] = result.savedMatch;
      if (result.nextMatch) { const n = list.findIndex(item => String(item.game) === String(result.nextMatch.game)); if (n >= 0) list[n] = result.nextMatch; }
      state.matches = list;
    }
  }
  function renderTennisFreeList() {
    const list = document.getElementById('tmFreeMatches'); if (!list || !state) return;
    const games = state.freeMatches || [];
    list.innerHTML = games.length ? games.map(match => `<article class="flex-v023-free-item"><div><strong>${esc(match.player1)} × ${esc(match.player2)}</strong><small>Jogo ${num(match.order)} • ${esc(match.status)} • Sets ${num(match.sets1)} × ${num(match.sets2)}</small></div><button class="tm-button secondary" type="button" data-tm-free-score="${esc(match.id)}">${match.status === 'FINALIZADO' ? 'Editar placar' : 'Atualizar placar'}</button></article>`).join('') : '<div class="flex-v023-empty">Nenhum confronto avulso registrado.</div>';
  }

  async function installTennis() {
    const form = document.getElementById('tmScoreForm'), select = document.getElementById('tmMatchSelect'), root = document.getElementById('tmScoreFields');
    if (!form || !select || !root) return;
    state = readTennisCache() || { matches:[], freeMatches:[] };
    const modal = ensureModal('pa31TennisModal','pa31TennisModalRoot');
    const populate = keep => {
      select.innerHTML = '<option value="">Selecione uma partida</option>' + (state.matches || []).map(match => `<option value="${match.game}">Jogo ${match.game} — ${esc(match.player1)} × ${esc(match.player2)} — ${esc(match.status)}</option>`).join('');
      if (keep && [...select.options].some(o => o.value === String(keep))) select.value = String(keep);
    };
    const openChampionship = () => {
      const match = (state.matches || []).find(item => String(item.game) === select.value);
      if (!match) { root.innerHTML = '<div class="pa31-empty">Selecione uma partida para abrir o placar automático.</div>'; controller = null; return; }
      const champ = state.championship || {};
      const rules = { bestOf:num(champ.bestOf || 1), normal:num(champ.setPoints || 11), tie:num(champ.setPoints || 11), lead:num(champ.minimumLead || 2), sameTarget:true };
      controller = new ScoreController({ root, match, rules, names:[match.player1, match.player2], save:scores => API.request('tmSalvarPlacarAutomatico', { tipo:'CAMPEONATO', jogo:match.game, placar:scores, chave:adminKey() }), onState:(newState,result) => { if(newState) state=newState; else patchTennis(result); populate(match.game); renderTennisFreeList(); } });
    };
    form.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); controller?.persist(true); }, true);
    document.getElementById('tmStartMatch')?.addEventListener('click', event => { if (controller) { event.preventDefault(); event.stopImmediatePropagation(); controller.persist(true); } }, true);
    document.addEventListener('click', async event => {
      const button = event.target.closest('[data-tm-free-score]'); if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation();
      let match = (state.freeMatches || []).find(item => item.id === button.dataset.tmFreeScore);
      if (!match) {
        try { state = mergeTennisQuick(state, await API.request('tmPlacarEstadoRapido')); renderTennisFreeList(); match = (state.freeMatches || []).find(item => item.id === button.dataset.tmFreeScore); } catch (_) {}
      }
      if (!match) return;
      const rules = { bestOf:num(match.bestOf || 1), normal:num(match.setPoints || 11), tie:num(match.setPoints || 11), lead:num(match.minimumLead || 2), sameTarget:true };
      modal.hidden = false;
      controller = new ScoreController({ root:modal.querySelector('#pa31TennisModalRoot'), match, rules, names:[match.player1, match.player2], compact:true, save:scores => API.request('tmSalvarPlacarAutomatico', { tipo:'AVULSO', id:match.id, placar:scores, chave:adminKey() }), onState:(newState,result) => { if(newState) state=newState; else patchTennis(result); renderTennisFreeList(); } });
    }, true);
    populate(); renderTennisFreeList(); select.addEventListener('change', openChampionship, true);
    try { state = mergeTennisQuick(state, await API.request('tmPlacarEstadoRapido')); populate(select.value); renderTennisFreeList(); if(select.value)openChampionship(); }
    catch (_) { try { state = await API.request('tmAdmin'); populate(select.value); renderTennisFreeList(); } catch (_) {} }
  }

  (isVolley ? installVolley() : installTennis()).catch(error => API.toast?.(error.message || 'Não foi possível carregar o placar automático.', 'error'));
})();
