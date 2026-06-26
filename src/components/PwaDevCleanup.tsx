import Script from 'next/script';

/**
 * Dev/tunnel only: unregister stale service workers before the app boots.
 * Prevents installed PWAs from serving broken cached shells over public tunnel + next dev.
 */
export function PwaDevCleanup() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Script id="pwa-dev-cleanup" strategy="beforeInteractive">
      {`
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register = function () {
    return Promise.reject(new Error('SW disabled in dev'));
  };
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    return Promise.all(regs.map(function (r) { return r.unregister(); }));
  });
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    });
  }
})();
      `}
    </Script>
  );
}
