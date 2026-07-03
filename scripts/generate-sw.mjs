/**
 * Generates public/sw.js — customer + driver PWA caching (no third-party frameworks).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const swSource = `// AUTO-GENERATED — customer SWR + image cache + driver shell offline fallback
const SHELL_CACHE = "juco-shell-v1";
const IMAGES_CACHE = "juco-images-v1";
const DRIVER_SHELL_CACHE = "juco-driver-shell-v1";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/notification.mp3",
];

const MAX_SHELL_ENTRIES = 3;
const MAX_DRIVER_SHELL_ENTRIES = 3;
const MAX_IMAGE_ENTRIES = 120;

const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin",
  "/checkout",
  "/order-success",
];

const NEVER_CACHE_PATHS = new Set(["/checkout", "/order-success"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.slice(0, keys.length - maxEntries);
  await Promise.all(excess.map((key) => cache.delete(key)));
}

function isNeverCachePath(pathname) {
  if (NEVER_CACHE_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/track/")) return true;
  return NEVER_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function staleWhileRevalidateHome(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        void cache.put(request, response.clone());
        void trimCache(cache, MAX_SHELL_ENTRIES);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    void fetchPromise;
    return cached;
  }

  const response = await fetchPromise;
  if (response) return response;

  const offline = await caches.match("/offline.html");
  if (offline) return offline;
  return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_IMAGE_ENTRIES);
    }
    return response;
  } catch {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function networkFirstDriverShell(request) {
  const cache = await caches.open(DRIVER_SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      await cache.put(request, response.clone());
      await trimCache(cache, MAX_DRIVER_SHELL_ENTRIES);
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

  // Never intercept Next bundles or RSC flight data — avoids stale dev/prod chunk bugs.
  if (url.pathname.startsWith("/_next/")) return;

  const isDriverNav =
    request.mode === "navigate" &&
    (url.pathname === "/driver" || url.pathname.startsWith("/driver/"));

  if (isDriverNav) {
    event.respondWith(networkFirstDriverShell(request));
    return;
  }

  if (isNeverCachePath(url.pathname)) return;

  if (url.pathname.startsWith("/images/")) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  const isHomeNav = request.mode === "navigate" && url.pathname === "/";
  if (isHomeNav) {
    event.respondWith(staleWhileRevalidateHome(request));
  }
});
`;

fs.writeFileSync(path.join(root, "public", "sw.js"), swSource, "utf8");
console.log("[generate-sw] Wrote customer + driver sw.js");
