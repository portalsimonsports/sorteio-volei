(() => {
  'use strict';
  if (document.body?.dataset.page !== 'admin' || !window.Volei) return;

  const V = window.Volei;
  const C = V.C;
  const ui = {};
  let state = V.read();
  [
    'adminMode','adminStatus','drawNow','resetDraw','clearAll','refreshAdmin',
    'playerForm','playerId','playerName','playerAge','playerSex','playerScore','playerActive',
    'categoryPreview','playersTableBody','teamsPreview','matchesAdmin','sheetLink'
  ].forEach(id => ui[id] = document.getElementById(id));

  function element(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function busy(button, enabled, text = 'Processando...') {
    if (!button) return;
    if (enabled) {
      button.dataset.original = button.textContent;
      button.textContent = text;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.original || button.textContent;
      button.disabled = false;
    }
  }

  function sexLabel(value) {
    if (value === 'M') return 'Masculino';
    if (value === 'F') return 'Feminino';
    return 'Pendente';
  }

  function preview() {
    const playerAge = Number(ui.playerAge.value);
    const score = V.num(ui.playerScore.value);
    if (!Number.isInteger(playerAge) || playerAge < 1 || playerAge > 100) {
      ui.categoryPreview.textContent = 'Informe a idade, o sexo e a avaliação do jogo. Categoria automática.';
      return;
    }
    const category = V.category(playerAge);
    if (ui.playerSex) ui.playerSex.required = category.pot === 'A';
    const warning = score < 5 || score > 10 ? ' A avaliação deve estar entre 5 e 10.' : '';
    const sex = ui.playerSex?.value ? ` • ${sexLabel(ui.playerSex.value)}` : (category.pot === 'A' ? ' • Sexo pendente' : '');
    ui.categoryPreview.textContent = `${playerAge} anos • Pote ${category.pot} • ${category.label}${sex} • Avaliação ${V.fmt(score)}/10 • Índice ${V.fmt(V.index(score))}.${warning}`;
  }

  function addCell(row, text) { row.appendChild(element('td', '', text)); }

  function renderPlayers(players) {
    ui.playersTableBody.replaceChildren();
    if (!players.length) {
      const row = element('tr');
      const cell = element('td', '', 'Nenhum participante cadastrado.');
      cell.colSpan = 9;
      row.appendChild(cell);
      ui.playersTableBody.appendChild(row);
      return;
    }
    players.forEach(player => {
      const row = element('tr');
      addCell(row, player.id);
      addCell(row, player.name);
      addCell(row, player.age);
      addCell(row, player.pot === 'A' ? 'Adulto' : 'Criança');
      addCell(row, sexLabel(player.sex));
      addCell(row, V.fmt(player.score));
      addCell(row, V.fmt(player.adjustedScore));
      addCell(row, player.active);
      const actionsCell = element('td');
      const actions = element('div', 'actions');
      const edit = element('button', 'action edit', 'Editar');
      edit.type = 'button'; edit.dataset.action = 'edit'; edit.dataset.id = player.id;
      const remove = element('button', 'action delete', 'Excluir');
      remove.type = 'button'; remove.dataset.action = 'delete'; remove.dataset.id = player.id;
      actions.append(edit, remove); actionsCell.appendChild(actions); row.appendChild(actionsCell);
      ui.playersTableBody.appendChild(row);
    });
  }

  function renderTeams(teams) {
    ui.teamsPreview.replaceChildren();
    if (!teams.length) {
      const card = element('article', 'team card');
      card.appendChild(element('div', 'empty', 'Equipes ainda não sorteadas.'));
      ui.teamsPreview.appendChild(card);
      return;
    }
    teams.forEach((team, index) => {
      const card = element('article', 'team card');
      const head = element('div', 'team-head');
      head.append(element('span', '', `DUPLA ${String(index + 1).padStart(2, '0')}`));
      head.append(element('strong', '', team.type === 'ADULTOS' ? '2 adultos do mesmo sexo' : team.type === 'CRIANCAS' ? '2 crianças' : 'Mista'));
      const members = element('div', 'team-members');
      [[team.member1, team.member1Pot, team.member1Index], [team.member2, team.member2Pot, team.member2Index]].forEach(member => {
        const row = element('div', 'team-member');
        row.append(element('span', '', `${member[1] === 'A' ? 'Adulto' : 'Criança'}: ${member[0]}`), element('span', '', V.fmt(member[2])));
        members.appendChild(row);
      });
      card.append(head, members);
      ui.teamsPreview.appendChild(card);
    });
  }

  function render(next) {
    state = next;
    ui.adminMode.textContent = C.DEMO_MODE || !C.API_BASE ? 'Modo local do navegador' : 'Sincronizado com Google Sheets';
    ui.adminStatus.textContent = next.status;
    renderPlayers(next.players);
    renderTeams(next.teams);
    window.VoleiAdmin.renderMatches(next.rounds);
  }

  window.VoleiAdmin = { V, C, ui, element, busy, preview, render, renderMatches: () => {}, getState: () => state };
})();
