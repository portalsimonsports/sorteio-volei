(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;

  const V = window.Volei;
  const A = window.VoleiAdmin;
  const text = value => String(value ?? '').trim();
  const esc = value => window.VoleiBase?.esc ? window.VoleiBase.esc(value) : text(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function unwrap(value) {
    let current = value;
    for (let i = 0; i < 4; i++) {
      if (!current || typeof current !== 'object') break;
      if (current.state && typeof current.state === 'object') { current = current.state; continue; }
      if (current.dados && typeof current.dados === 'object') { current = current.dados; continue; }
      break;
    }
    return current || {};
  }

  function teamName(team) {
    if (!team) return '';
    if (text(team.name)) return text(team.name);
    const members = teamMembers(team);
    if (members.length) return members.join(' + ');
    return text(V.teamName?.(team) || team.id);
  }

  function teamMembers(team) {
    const names = [];
    if (Array.isArray(team?.members)) {
      team.members.forEach(member => {
        const name = text(typeof member === 'string' ? member : member?.name);
        if (name) names.push(name);
      });
    }
    [team?.member1, team?.member2, team?.adult, team?.child, team?.jogador1, team?.jogador2].forEach(value => {
      const raw = text(value);
      if (!raw) return;
      raw.split(/\s*\+\s*/).forEach(name => {
        name = text(name);
        if (name && !names.includes(name)) names.push(name);
      });
    });
    return names;
  }

  function collectTeams(rawValue) {
    const raw = unwrap(rawValue);
    const map = new Map();

    function add(team) {
      if (!team || typeof team !== 'object') return;
      const name = teamName(team);
      const key = text(team.id) || name;
      if (!key || !name) return;
      if (!map.has(key)) map.set(key, team);
    }

    function addMatch(match) {
      if (!match || typeof match !== 'object') return;
      add(match.team1 || match.equipe1);
      add(match.team2 || match.equipe2);
    }

    (Array.isArray(raw.teams) ? raw.teams : []).forEach(add);
    (Array.isArray(raw.equipes) ? raw.equipes : []).forEach(add);
    (Array.isArray(raw.matches) ? raw.matches : []).forEach(addMatch);
    (Array.isArray(raw.jogos) ? raw.jogos : []).forEach(addMatch);
    (Array.isArray(raw.rounds) ? raw.rounds : []).forEach(round => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach(addMatch);
      (Array.isArray(round?.jogos) ? round.jogos : []).forEach(addMatch);
    });
    (Array.isArray(raw.rodadas) ? raw.rodadas : []).forEach(round => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach(addMatch);
      (Array.isArray(round?.jogos) ? round.jogos : []).forEach(addMatch);
    });

    return [...map.values()];
  }

  function render(panel, teams) {
    panel.innerHTML = `<div class="championship-teams-title"><strong>Equipes desta edição</strong><span>${teams.length} equipe${teams.length === 1 ? '' : 's'}</span></div><div class="championship-teams-grid">${teams.map((team, index) => {
      const members = teamMembers(team);
      return `<article class="championship-team-card"><span>EQUIPE ${String(index + 1).padStart(2, '0')}</span><strong>${esc(teamName(team) || `Equipe ${index + 1}`)}</strong><small>${esc(members.join(' • '))}</small></article>`;
    }).join('')}</div>`;
  }

  async function loadTeams(id) {
    const sources = [];
    try { sources.push(await V.championshipRequest('abrirCampeonato', { id })); } catch (_) {}
    try { sources.push(await V.request('admin')); } catch (_) {}
    try { sources.push(A?.getState?.()); } catch (_) {}

    const merged = new Map();
    sources.forEach(source => collectTeams(source).forEach(team => {
      const key = text(team.id) || teamName(team);
      if (key && !merged.has(key)) merged.set(key, team);
    }));
    return [...merged.values()];
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-show-teams]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const id = text(button.dataset.showTeams);
    const history = document.getElementById('championshipHistory');
    const panel = history?.querySelector(`[data-team-panel="${CSS.escape(id)}"]`);
    if (!panel) return;

    if (!panel.hidden && panel.dataset.v028Loaded === 'SIM') {
      panel.hidden = true;
      button.textContent = 'Ver equipes';
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Carregando equipes...';
    panel.hidden = false;
    panel.innerHTML = '<div class="empty">Carregando equipes desta edição...</div>';

    try {
      const teams = await loadTeams(id);
      if (!teams.length) throw new Error('As equipes desta edição não foram retornadas. Atualize a página e tente novamente.');
      render(panel, teams);
      panel.dataset.v028Loaded = 'SIM';
      button.textContent = 'Ocultar equipes';
    } catch (error) {
      panel.innerHTML = `<div class="message error">${esc(error.message)}</div>`;
      button.textContent = 'Tentar carregar equipes';
      V.toast?.(error.message, 'error');
    } finally {
      button.disabled = false;
      if (button.textContent === original) button.textContent = 'Ver equipes';
    }
  }, true);
})();
