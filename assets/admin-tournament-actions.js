(() => {
  'use strict';
  if (!window.VoleiAdmin) return;

  const A = window.VoleiAdmin;
  const V = A.V;
  const C = A.C;
  const ui = A.ui;
  const scoreForm = document.getElementById('scoreForm');
  const scoreGame = document.getElementById('scoreGame');
  const saveScore = document.getElementById('saveScore');

  scoreForm.noValidate = true;

  ui.drawNow.addEventListener('click', async () => {
    const seconds = Number(C.COUNTDOWN_SECONDS || 1200);
    if (!confirm('Iniciar a contagem regressiva pública até o horário da primeira partida?')) return;
    A.busy(ui.drawNow, true, 'Iniciando contagem...');
    try {
      await V.request('iniciarContagem', { segundos: seconds });
      V.toast('Contagem regressiva iniciada na página pública.');
      await A.refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(ui.drawNow, false);
    }
  });

  ui.resetDraw.addEventListener('click', async () => {
    if (!confirm('Reiniciar o sorteio mantendo os inscritos?')) return;
    try {
      await V.request('resetar');
      V.toast('Sorteio reiniciado.');
      await A.refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  ui.clearAll.addEventListener('click', async () => {
    const local = C.DEMO_MODE || !C.API_BASE;
    const text = local
      ? 'Apagar participantes, equipes, placares e chaveamento deste navegador?'
      : 'Apagar definitivamente participantes, equipes, placares e histórico da planilha?';
    if (!confirm(text)) return;
    try {
      await V.request('limparTudo');
      V.toast(local ? 'Dados locais apagados.' : 'Dados da planilha apagados.');
      await A.refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    }
  });

  function value(id) { return document.getElementById(id).value.trim(); }

  scoreForm.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopPropagation();

    if (!scoreGame.value) {
      V.toast('Selecione uma partida liberada.', 'warn');
      scoreGame.focus();
      return;
    }

    const score = {
      s1a: value('scoreS1A'), s1b: value('scoreS1B'),
      s2a: value('scoreS2A'), s2b: value('scoreS2B'),
      s3a: value('scoreS3A'), s3b: value('scoreS3B')
    };

    try {
      V.validateScore(score);
    } catch (error) {
      V.toast(error.message, 'warn');
      const emptyId = [
        ['scoreS1A', score.s1a], ['scoreS1B', score.s1b],
        ['scoreS2A', score.s2a], ['scoreS2B', score.s2b]
      ].find(([, entry]) => entry === '')?.[0];
      if (emptyId) document.getElementById(emptyId).focus();
      return;
    }

    if (!confirm('Confirmar o placar final desta partida?')) return;
    A.busy(saveScore, true, 'Salvando placar...');
    const game = scoreGame.value;
    try {
      const payload = ['PLACAR', score.s1a, score.s1b, score.s2a, score.s2b, score.s3a, score.s3b].join('|');
      await V.request('registrarResultado', { jogo: game, vencedorId: payload });
      A.clearScoreDraft?.(game);
      scoreForm.reset();
      V.toast(`Placar salvo. Intervalo de ${C.MATCH_INTERVAL_MINUTES || 10} minutos iniciado.`);
      await A.refresh();
    } catch (error) {
      V.toast(error.message, 'error');
    } finally {
      A.busy(saveScore, false);
    }
  });

  ui.sheetLink.href = C.SHEET_URL || '#';
  A.preview();
  A.refresh();
  setInterval(() => {
    if (!A.scoreIsDirty?.()) A.refresh();
  }, 10000);
  window.addEventListener('storage', event => {
    if (event.key === V.KEY && !A.scoreIsDirty?.()) A.refresh();
  });
})();
