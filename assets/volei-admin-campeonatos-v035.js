(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;
  const V = window.Volei;
  const target = document.getElementById('v035Championships');
  const counter = document.getElementById('v035ChampionshipsStatus');
  if (!target) return;

  let state = null;
  let items = [];
  const detailCache = new Map();

  const esc = value => V.esc ? V.esc(value) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const openStatus = status => ['SORTEADO','NAO_INICIADO','EM_CONTAGEM','EM_ANDAMENTO','AGENDADO'].includes(String(status || '').toUpperCase());
  const statusText = status => ({SORTEADO:'NÃO INICIADO',NAO_INICIADO:'NÃO INICIADO',EM_CONTAGEM:'PREPARANDO',EM_ANDAMENTO:'EM ANDAMENTO',FINALIZADO:'FINALIZADO',CANCELADO:'CANCELADO',AGENDADO:'AGENDADO'})[String(status || '').toUpperCase()] || String(status || 'CAMPEONATO');

  function currentId() {
    const open = items.find(item => openStatus(item.status));
    if (open) return String(open.id || '');
    const marked = items.find(item => String(item.active || '').toUpperCase() === 'SIM');
    return String(marked?.id || state?.championship?.id || items[0]?.id || '');
  }

  function dateText(value) {
    try {
      const d = V.date?.(value);
      if (d) return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    } catch (_) {}
    return String(value || '—');
  }

  function teamMembers(team) {
    const names = [];
    const seen = new Set();
    const add = value => {
      String(value ?? '').split(/\s*\+\s*/).forEach(part => {
        const name = String(part || '').trim();
        const key = name.toLocaleLowerCase('pt-BR');
        if (name && !seen.has(key)) { seen.add(key); names.push(name); }
      });
    };
    if (Array.isArray(team?.members)) team.members.forEach(member => add(typeof member === 'string' ? member : member?.name));
    [team?.member1,team?.member2,team?.adult,team?.child,team?.jogador1,team?.jogador2].forEach(add);
    return names;
  }

  function teamName(team) {
    if (!team) return 'A definir';
    if (team.name) return String(team.name);
    const members = teamMembers(team);
    return members.length ? members.join(' + ') : String(V.teamName?.(team) || team.id || 'A definir');
  }

  function flattenMatches(source) {
    const out = [];
    (Array.isArray(source?.rounds) ? source.rounds : []).forEach(round => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach(match => out.push(match));
    });
    return out;
  }

  function scoreText(match) {
    const scores = Array.isArray(match?.scores) ? match.scores.filter(pair => Array.isArray(pair) && pair.length >= 2 && pair[0] !== '' && pair[0] != null && pair[1] !== '' && pair[1] != null) : [];
    if (scores.length) return scores.map(pair => `${n(pair[0])}×${n(pair[1])}`).join(' • ');
    if (Number.isFinite(Number(match?.sets1)) || Number.isFinite(Number(match?.sets2))) return `${n(match?.sets1)}×${n(match?.sets2)} sets`;
    return 'Sem placar';
  }

  function renderDetail(panel, source) {
    const teams = Array.isArray(source?.teams) ? source.teams : [];
    const matches = flattenMatches(source);
    panel.innerHTML = `
      <div class="v035-detail-block">
        <div class="v035-detail-head"><strong>Equipes</strong><span>${teams.length}</span></div>
        <div class="v035-detail-teams">${teams.length ? teams.map((team,index) => {
          const members = teamMembers(team);
          return `<article><span>EQUIPE ${String(index+1).padStart(2,'0')}</span><strong>${esc(teamName(team))}</strong>${members.length ? `<small>${esc(members.join(' • '))}</small>` : ''}</article>`;
        }).join('') : '<div class="v035-empty">Nenhuma equipe registrada nesta edição.</div>'}</div>
      </div>
      <div class="v035-detail-block">
        <div class="v035-detail-head"><strong>Jogos</strong><span>${matches.length}</span></div>
        <div class="v035-detail-games">${matches.length ? matches.map(match => `<article><div><span>JOGO ${n(match.game)}${match.phase ? ` • ${esc(match.phase)}` : ''}</span><strong>${esc(teamName(match.team1))} × ${esc(teamName(match.team2))}</strong></div><div class="v035-game-result"><b>${esc(scoreText(match))}</b><small>${esc(statusText(match.status))}</small></div></article>`).join('') : '<div class="v035-empty">Nenhum jogo registrado nesta edição.</div>'}</div>
      </div>`;
  }

  function render() {
    const current = currentId();
    if (counter) counter.textContent = `${items.length} campeonato${items.length === 1 ? '' : 's'}`;
    if (!items.length) {
      target.innerHTML = '<div class="v035-empty">Nenhum campeonato cadastrado.</div>';
      return;
    }
    target.innerHTML = `<div class="v035-champ-list">${items.map(item => {
      const isCurrent = String(item.id) === current;
      const editable = isCurrent && state?.championshipEditable && openStatus(item.status);
      return `<article class="v035-champ-card${isCurrent ? ' current' : ''}" data-v035-card="${esc(item.id)}"><div class="v035-champ-main"><strong>${esc(item.name || item.id)}</strong><small>${esc(statusText(item.status))} • ${n(item.teamCount)} equipe${n(item.teamCount) === 1 ? '' : 's'} • ${esc(dateText(item.createdAt))}</small><div class="v035-champ-tags">${isCurrent ? '<span class="v035-champ-tag current">Campeonato atual</span>' : ''}<span class="v035-champ-tag">${esc(statusText(item.status))}</span></div></div><div class="v035-champ-actions"><button class="btn secondary small" type="button" data-v035-open="${esc(item.id)}">Ver</button>${editable ? `<button class="btn primary small" type="button" data-v035-edit="${esc(item.id)}">Editar</button>` : ''}</div><div class="v035-champ-detail" data-v035-detail="${esc(item.id)}" hidden></div></article>`;
    }).join('')}</div>`;
  }

  async function load() {
    try {
      state = await V.request('admin');
      const result = await V.championshipRequest('listarCampeonatos');
      items = Array.isArray(result) ? result : [];
      render();
    } catch (error) {
      target.innerHTML = `<div class="v035-empty">Falha ao carregar campeonatos: ${esc(error.message || 'erro')}</div>`;
    }
  }

  target.addEventListener('click', async event => {
    const edit = event.target.closest('[data-v035-edit]');
    if (edit) {
      document.getElementById('v025ToggleEdit')?.click();
      document.getElementById('championshipForm')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }

    const button = event.target.closest('[data-v035-open]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const id = String(button.dataset.v035Open || '');
    const panel = target.querySelector(`[data-v035-detail="${CSS.escape(id)}"]`);
    if (!panel) return;

    if (!panel.hidden) {
      panel.hidden = true;
      button.textContent = 'Ver';
      return;
    }

    target.querySelectorAll('[data-v035-detail]').forEach(other => { other.hidden = true; });
    target.querySelectorAll('[data-v035-open]').forEach(other => { other.textContent = 'Ver'; });
    panel.hidden = false;
    button.textContent = 'Ocultar';

    if (detailCache.has(id)) {
      renderDetail(panel, detailCache.get(id));
      panel.scrollIntoView({behavior:'smooth',block:'nearest'});
      return;
    }

    panel.innerHTML = '<div class="v035-empty">Carregando equipes e jogos...</div>';
    button.disabled = true;
    try {
      let opened;
      if (id === currentId() && state) {
        opened = state;
      } else {
        opened = await V.championshipRequest('abrirCampeonato',{id});
      }
      if (!opened || typeof opened !== 'object') throw new Error('A edição não retornou dados para visualização.');
      detailCache.set(id, opened);
      renderDetail(panel, opened);
      panel.scrollIntoView({behavior:'smooth',block:'nearest'});
    } catch (error) {
      panel.innerHTML = `<div class="v035-empty error">${esc(error.message || 'Falha ao abrir a edição.')}</div>`;
      V.toast?.(error.message || 'Falha ao abrir a edição.','error');
    } finally {
      button.disabled = false;
    }
  });

  load();
})();
