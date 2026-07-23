(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.VoleiAdmin || !window.Volei?.championshipRequest) return;

  const A = window.VoleiAdmin;
  const V = window.Volei;
  const historyTarget = document.getElementById('championshipHistory');
  if (!historyTarget) return;

  function text(value) {
    return String(value ?? '').trim();
  }

  function unwrapState(value) {
    if (!value || typeof value !== 'object') return {};
    if (value.state && typeof value.state === 'object') return value.state;
    if (value.dados && typeof value.dados === 'object') return value.dados;
    return value;
  }

  function addTeam(map, rawTeam) {
    if (!rawTeam || typeof rawTeam !== 'object') return;
    const team = window.VoleiBase?.normalizeTeam ? window.VoleiBase.normalizeTeam(rawTeam) : rawTeam;
    if (!team) return;
    const name = V.teamName(team);
    const key = text(team.id) || name;
    if (!key || !name) return;
    if (!map.has(key)) map.set(key, team);
  }

  function collectTeams(rawState) {
    const state = unwrapState(rawState);
    const map = new Map();

    (Array.isArray(state.teams) ? state.teams : []).forEach(team => addTeam(map, team));
    (Array.isArray(state.equipes) ? state.equipes : []).forEach(team => addTeam(map, team));

    (Array.isArray(state.rounds) ? state.rounds : []).forEach(round => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach(match => {
        addTeam(map, match?.team1);
        addTeam(map, match?.team2);
      });
    });

    return [...map.values()];
  }

  function teamMembers(team) {
    const members = [];
    const firstName = text(team?.member1 ?? team?.adult ?? team?.adulto);
    const secondName = text(team?.member2 ?? team?.child ?? team?.crianca);
    const firstPot = text(team?.member1Pot) || (text(team?.member1Id ?? team?.adultId).startsWith('B-') ? 'B' : 'A');
    const secondPot = text(team?.member2Pot) || (text(team?.member2Id ?? team?.childId).startsWith('A-') ? 'A' : 'B');
    if (firstName) members.push({ name:firstName, pot:firstPot });
    if (secondName && secondName !== firstName) members.push({ name:secondName, pot:secondPot });
    return members;
  }

  function memberLabel(member) {
    if (member.pot === 'A') return `Adulto: ${member.name}`;
    if (member.pot === 'B') return `Criança: ${member.name}`;
    return member.name;
  }

  function render(target, teams) {
    target.innerHTML = teams.length
      ? `<div class="championship-teams-title"><strong>Duplas desta edição</strong><span>${teams.length} dupla${teams.length === 1 ? '' : 's'}</span></div>
         <div class="championship-teams-grid">${teams.map((team, index) => {
           const members = teamMembers(team);
           const name = V.teamName(team) || members.map(member => member.name).join(' + ') || team.id || `Dupla ${index + 1}`;
           return `<article class="championship-team-card">
             <span>DUPLA ${String(index + 1).padStart(2, '0')}</span>
             <strong>${V.esc(name)}</strong>
             <small>${members.map(member => V.esc(memberLabel(member))).join(' • ')}</small>
           </article>`;
         }).join('')}</div>`
      : '<div class="message error">As duplas não vieram na resposta do campeonato. Atualize a implantação do Apps Script para a versão V016.</div>';
  }

  historyTarget.addEventListener('click', async event => {
    const button = event.target.closest('[data-toggle-championship-teams]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const target = document.getElementById(button.dataset.target);
    if (!target) return;

    if (target.dataset.loaded === 'SIM') {
      target.hidden = !target.hidden;
      button.textContent = target.hidden ? 'Ver duplas' : 'Ocultar duplas';
      return;
    }

    A.busy(button, true, 'Carregando duplas...');
    try {
      const card = button.closest('.championship-history-card');
      let state = card?.classList.contains('championship-active') ? A.getState() : null;
      let teams = collectTeams(state);

      if (!teams.length) {
        state = await V.championshipRequest('abrirCampeonato', { id:button.dataset.toggleChampionshipTeams });
        teams = collectTeams(state);
      }

      if (!teams.length && card?.classList.contains('championship-active')) {
        try {
          state = await V.request('admin');
          teams = collectTeams(state);
        } catch (_) {}
      }

      render(target, teams);
      target.dataset.loaded = 'SIM';
      target.hidden = false;
      button.textContent = 'Ocultar duplas';
    } catch (error) {
      target.innerHTML = `<div class="message error">${V.esc(error.message)}</div>`;
      target.hidden = false;
      V.toast(error.message, 'error');
    } finally {
      A.busy(button, false);
    }
  }, true);
})();
