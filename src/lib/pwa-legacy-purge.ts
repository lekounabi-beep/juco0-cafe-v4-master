/** One-time purge of legacy caching SW (juco-* caches). Does not block new install SW. */
export const PWA_LEGACY_PURGE_SCRIPT = `
(function () {
  var KEY = 'juco_legacy_purge_v3';
  if (!('serviceWorker' in navigator) || sessionStorage.getItem(KEY)) return;

  function purgeLegacyCaches() {
    if (!('caches' in window)) return Promise.resolve(false);
    return caches.keys().then(function (keys) {
      var legacy = keys.filter(function (k) { return k.indexOf('juco-') === 0; });
      if (!legacy.length) return false;
      return Promise.all(legacy.map(function (k) { return caches.delete(k); })).then(function () { return true; });
    });
  }

  function unregisterLegacyWorkers() {
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      if (!regs.length) return false;
      return Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () { return true; });
    });
  }

  Promise.all([purgeLegacyCaches(), unregisterLegacyWorkers()]).then(function (results) {
    sessionStorage.setItem(KEY, '1');
    if (results[0] || results[1]) location.reload();
  });
})();
`.trim();
