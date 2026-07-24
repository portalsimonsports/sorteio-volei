(() => {
  'use strict';
  if (!window.Volei?.request) return;

  const V = window.Volei;
  const original = V.request.bind(V);
  const inflight = new Map();
  const cache = new Map();
  const READ_TTL = { admin: 12000, estado: 4000 };
  const READ_ACTIONS = new Set(['admin','estado']);

  function cacheKey(action, params) {
    if (!READ_ACTIONS.has(action)) return '';
    return `${action}|${JSON.stringify(params || {})}`;
  }

  V.request = (action, params = {}) => {
    const key = cacheKey(action, params);
    if (!key) return original(action, params);

    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < (READ_TTL[action] || 0)) {
      return Promise.resolve(cached.value);
    }
    if (inflight.has(key)) return inflight.get(key);

    const promise = original(action, params)
      .then(value => {
        cache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, promise);
    return promise;
  };

  V.invalidateReadCache = action => {
    [...cache.keys()].forEach(key => {
      if (!action || key.startsWith(`${action}|`)) cache.delete(key);
    });
  };
})();
