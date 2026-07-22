(() => {
  'use strict';
  const V = window.Volei;
  if (!V) return;

  function parseDateTime(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const numericDate = new Date(value);
      return Number.isNaN(numericDate.getTime()) ? null : numericDate;
    }
    const text = String(value).trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
      return new Date(+match[3], +match[2] - 1, +match[1], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    }
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
      return new Date(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function dateTime(value, includeSeconds = false) {
    const date = parseDateTime(value);
    if (!date) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {})
    });
  }

  V.date = parseDateTime;
  V.dateTime = dateTime;
  if (window.VoleiBase) window.VoleiBase.parseDate = parseDateTime;
})();
