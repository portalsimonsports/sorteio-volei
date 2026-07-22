(() => {
  'use strict';
  const A = window.VoleiAdmin;
  if (!A) return;

  const V = A.V;
  const ui = A.ui;

  A.preview = function previewRating() {
    const playerAge = Number(ui.playerAge.value);
    if (!Number.isInteger(playerAge) || playerAge < 1 || playerAge > 100) {
      ui.categoryPreview.textContent = 'Informe a idade e a avaliação. Categoria automática.';
      return;
    }

    const category = V.category(playerAge);
    try {
      const rating = V.parseRating(ui.playerScore.value, {
        id: ui.playerId.value,
        previousScore: ui.playerScore.dataset.originalScore,
        previousAdjusted: ui.playerScore.dataset.originalAdjusted
      });
      const mode = rating.legacy
        ? 'registro anterior preservado'
        : rating.manual
          ? 'valor exato informado com *'
          : rating.score >= 5 && rating.score <= 7
            ? `ajuste automático +${8 - rating.score}`
            : 'sem ajuste';
      ui.categoryPreview.textContent = `${playerAge} anos • Pote ${category.pot} • ${category.label} • Nota ${rating.score} • Índice ${rating.adjustedScore} • ${mode}.`;
    } catch (error) {
      ui.categoryPreview.textContent = `${playerAge} anos • Pote ${category.pot} • ${category.label} • ${error.message}`;
    }
  };
})();
