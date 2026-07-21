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

  ui.drawNow.addEventListener('click', async () => {
    if (!confirm('Realizar o sorteio e montar o chaveamento agora?')) return;
    A.busy(ui.drawNow, true, 'Sorteando...');
    try {
      await V.request('sortearAgora');
      V.toast('Sorteio realizado.');
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

  function value(id) {
    return document.getElementById(id).value;
  }

  scoreForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!scoreGame.value) {
      V.toast('Selecione uma partida liberada.', 'warn');
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
      return;
    }

    if (!confirm('Confirmar o placar final desta partida?')) return;
    A.busy(saveScore, true, 'Salvando placar...');
    try {
      const payload = [
        'PLACAR', score.s1a, score.s1b, score.s2a,
        score.s2b, score.s3a, score.s3b
      ].join('|');
      await V.request('registrarResultado', {
        jogo: scoreGame.value,
        vencedorId: payload
      });
      V.toast(`Placar salvo. Intervalo de ${C.MATCH_INTERVAL_MINUTES || 10} minutos iniciado.`);
      scoreForm.reset();
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
  setInterval(A.refresh, 10000);
  window.addEventListener('storage', event => {
    if (event.key === V.KEY) A.refresh();
  });
})();
