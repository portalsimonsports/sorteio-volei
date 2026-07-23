(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.VoleiAdmin || !window.Volei?.championshipRequest) return;
  const A = window.VoleiAdmin, V = window.Volei;
  const historyTarget = document.getElementById('championshipHistory');
  const form = document.getElementById('championshipForm');
  if (!historyTarget || !form) return;
  const text = value => String(value ?? '').trim();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function injectCompetitionFields() {
    const grid = form.querySelector('.championship-form-grid');
    const button = document.getElementById('createChampionship');
    if (!grid || !button || document.getElementById('championshipTeamSize')) return;
    const state = A.getState?.() || {}, rules = state.rules || {};
    const fields = document.createElement('div');
    fields.className = 'championship-v022-fields';
    fields.style.display = 'contents';
    fields.innerHTML = `
      <label>Participantes por equipe<select id="championshipTeamSize"><option value="2">2 participantes</option><option value="3">3 participantes</option><option value="4">4 participantes</option><option value="5">5 participantes</option><option value="6">6 participantes</option></select></label>
      <label>Formato da competição<select id="championshipCompetitionFormat"><option value="MATA_MATA">Mata-mata — um jogo por confronto</option><option value="TODOS_CONTRA_TODOS">Todos contra todos</option></select></label>
      <label>Sets por partida<select id="championshipBestOf"><option value="1">1 set</option><option value="3">Melhor de 3</option><option value="5">Melhor de 5</option></select></label>
      <label>Pontos dos sets normais<input id="championshipNormalPoints" type="number" min="1" max="99" step="1" value="${Number(rules.normalSetPoints || 25)}"></label>
      <label>Pontos do set decisivo<input id="championshipTiebreakPoints" type="number" min="1" max="99" step="1" value="${Number(rules.tiebreakSetPoints || 15)}"></label>
      <label>Vantagem mínima<input id="championshipMinimumLead" type="number" min="1" max="10" step="1" value="${Number(rules.minimumLead || 2)}"></label>`;
    grid.insertBefore(fields, button);
    document.getElementById('championshipBestOf').value = String(rules.bestOf || 3);
    const currentSize = Number(state.competition?.teamSize || 2);
    if ([2,3,4,5,6].includes(currentSize)) document.getElementById('championshipTeamSize').value = String(currentSize);
    const format = document.getElementById('championshipCompetitionFormat');
    format.value = state.competition?.format === 'TODOS_CONTRA_TODOS' ? 'TODOS_CONTRA_TODOS' : 'MATA_MATA';
    format.addEventListener('change', updateCompetitionNote);
    document.getElementById('championshipTeamSize').addEventListener('change', updateCompetitionNote);
    updateCompetitionNote();
  }

  function updateCompetitionNote() {
    const format = document.getElementById('championshipCompetitionFormat')?.value || 'MATA_MATA';
    const size = document.getElementById('championshipTeamSize')?.value || '2';
    const bracket = document.getElementById('championshipBracketMode');
    const note = document.getElementById('championshipBracketNote');
    if (bracket) bracket.disabled = format === 'TODOS_CONTRA_TODOS';
    if (!note) return;
    note.textContent = format === 'TODOS_CONTRA_TODOS'
      ? `Equipes de ${size} participantes jogam entre si. Com mais de quatro equipes, as quatro melhores avançam às semifinais; vencedoras fazem a final e perdedoras disputam o 3º lugar. Com duas equipes, são realizadas duas finais.`
      : `Equipes de ${size} participantes disputam mata-mata em jogo único. Com apenas duas equipes, o sistema gera duas finais e aplica os critérios agregados de desempate.`;
  }

  function unwrapState(value) { if (!value || typeof value !== 'object') return {}; if (value.state && typeof value.state === 'object') return unwrapState(value.state); if (value.dados && typeof value.dados === 'object') return unwrapState(value.dados); return value; }
  function addTeam(map, rawTeam) { if (!rawTeam || typeof rawTeam !== 'object') return; const team = window.VoleiBase?.normalizeTeam ? window.VoleiBase.normalizeTeam(rawTeam) : rawTeam; if (!team) return; const name = V.teamName(team), key = text(team.id) || name; if (key && name && !map.has(key)) map.set(key, team); }
  function addMatches(map, matches) { (Array.isArray(matches) ? matches : []).forEach(match => { addTeam(map, match?.team1 ?? match?.equipe1); addTeam(map, match?.team2 ?? match?.equipe2); }); }
  function collectTeams(rawState) { const state = unwrapState(rawState), map = new Map(); (Array.isArray(state.teams) ? state.teams : []).forEach(team => addTeam(map, team)); (Array.isArray(state.equipes) ? state.equipes : []).forEach(team => addTeam(map, team)); addMatches(map, state.matches); addMatches(map, state.jogos); (Array.isArray(state.rounds) ? state.rounds : []).forEach(round => { addMatches(map, round?.matches); addMatches(map, round?.jogos); }); return [...map.values()]; }
  function teamMembers(team) { if (Array.isArray(team?.members) && team.members.length) return team.members.map(member => ({ name:text(member.name), pot:text(member.pot) })); const joined = text(team?.adult); if (joined.includes(' + ') && !text(team?.child)) return joined.split(' + ').map(name => ({ name, pot:'' })); const members = []; const firstName = text(team?.member1 ?? team?.adult ?? team?.adulto), secondName = text(team?.member2 ?? team?.child ?? team?.crianca); if (firstName) members.push({ name:firstName, pot:text(team?.member1Pot) || 'A' }); if (secondName && secondName !== firstName) members.push({ name:secondName, pot:text(team?.member2Pot) || 'B' }); return members; }
  function memberLabel(member) { if (member.pot === 'A') return `Adulto: ${member.name}`; if (member.pot === 'B') return `Criança: ${member.name}`; return member.name; }
  function render(target, teams) { target.innerHTML = teams.length ? `<div class="championship-teams-title"><strong>Equipes desta edição</strong><span>${teams.length} equipe${teams.length === 1 ? '' : 's'}</span></div><div class="championship-teams-grid">${teams.map((team,index)=>{const members=teamMembers(team),name=V.teamName(team)||members.map(member=>member.name).join(' + ')||team.id||`Equipe ${index+1}`;return `<article class="championship-team-card"><span>EQUIPE ${String(index+1).padStart(2,'0')}</span><strong>${V.esc(name)}</strong><small>${members.map(member=>V.esc(memberLabel(member))).join(' • ')}</small></article>`;}).join('')}</div>` : '<div class="message error">Não foi possível reconstruir as equipes desta edição.</div>'; }

  form.addEventListener('submit', async event => {
    event.preventDefault(); event.stopImmediatePropagation();
    const name = text(document.getElementById('championshipName')?.value) || 'Novo campeonato';
    const params = {
      nome:name,
      modoEquipes:document.getElementById('championshipTeamMode')?.value || 'NOVAS_DUPLAS',
      modelo:document.getElementById('championshipBracketMode')?.value || 'AUTOMATICO',
      tamanhoEquipe:document.getElementById('championshipTeamSize')?.value || '2',
      formatoCompeticao:document.getElementById('championshipCompetitionFormat')?.value || 'MATA_MATA',
      melhorDe:document.getElementById('championshipBestOf')?.value || '3',
      pontosNormal:document.getElementById('championshipNormalPoints')?.value || '25',
      pontosDesempate:document.getElementById('championshipTiebreakPoints')?.value || '15',
      vantagemMinima:document.getElementById('championshipMinimumLead')?.value || '2'
    };
    if (!confirm(`Criar “${name}” com equipes de ${params.tamanhoEquipe} participantes no formato ${params.formatoCompeticao === 'TODOS_CONTRA_TODOS' ? 'todos contra todos' : 'mata-mata'}? O campeonato atual será preservado.`)) return;
    const button = document.getElementById('createChampionship'); A.busy(button,true,'Criando competição...');
    try { const result = await V.championshipRequest('novoCampeonato', params); V.toast(result?.message || 'Competição criada.'); if (result?.state) A.render(V.normalizeState(result.state)); await wait(800); location.reload(); }
    catch (error) { if (/tempo esgotado|processamento demorou/i.test(text(error?.message))) { V.toast('O processamento continua. Atualizando o painel em alguns segundos...'); await wait(5000); location.reload(); return; } V.toast(error.message,'error'); }
    finally { A.busy(button,false); }
  }, true);

  historyTarget.addEventListener('click', async event => {
    const button = event.target.closest('[data-toggle-championship-teams]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); const target = document.getElementById(button.dataset.target); if (!target) return;
    if (target.dataset.loaded === 'SIM') { target.hidden = !target.hidden; button.textContent = target.hidden ? 'Ver equipes' : 'Ocultar equipes'; return; }
    A.busy(button,true,'Carregando equipes...'); try { let state=A.getState(),teams=collectTeams(state); if (!teams.length) { state=await V.championshipRequest('abrirCampeonato',{id:button.dataset.toggleChampionshipTeams}); teams=collectTeams(state); } render(target,teams); target.dataset.loaded='SIM'; target.hidden=false; button.textContent='Ocultar equipes'; } catch(error) { target.innerHTML=`<div class="message error">${V.esc(error.message)}</div>`; target.hidden=false; V.toast(error.message,'error'); } finally { A.busy(button,false); }
  }, true);

  injectCompetitionFields();
})();
