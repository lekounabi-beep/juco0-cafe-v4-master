// AUTO-GENERATED — install SW + driver navigation offline fallback only
const SHELL_CACHE = "juco-driver-shell-v1";
const MAX_SHELL_ENTRIES = 3;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function trimShellCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_SHELL_ENTRIES) return;
  const excess = keys.slice(0, keys.length - MAX_SHELL_ENTRIES);
  await Promise.all(excess.map((key) => cache.delete(key)));
}

async function networkFirstDriverShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      await cache.put(request, response.clone());
      await trimShellCache(cache);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    if (offline) return offline;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Next bundles — avoids stale dev/prod chunk bugs.
  if (url.pathname.startsWith("/_next/")) return;

  const isDriverNav =
    request.mode === "navigate" &&
    (url.pathname === "/driver" || url.pathname.startsWith("/driver/"));

  if (!isDriverNav) return;

  event.respondWith(networkFirstDriverShell(request));
});
