(() => {
  'use strict';
  if (!window.Volei) return;
  window.Volei.teamName = team => team
    ? ([team.member1, team.member2].filter(Boolean).join(' + ') || [team.adult, team.child].filter(Boolean).join(' + ') || team.id || '')
    : '';
})();
