const CACHE_NAME = "alice-v1";
const STATIC_CACHE = "alice-static-v1";
const DYNAMIC_CACHE = "alice-dynamic-v1";

// Install: no precaching of HTML pages — only register the SW
self.addEventListener("install", (event) => {
  // Skip waiting so new SW takes over immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for everything, cache only static assets (JS/CSS/images)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (agent server, API calls)
  if (url.origin !== location.origin) return;

  // Skip in development (Vite HMR needs direct WebSocket, not SW-proxied)
  if (url.hostname === "localhost" && (url.port === "5173" || url.port === "8082")) return;

  // Navigation requests: ALWAYS go to network. No caching HTML.
  // If server is down, show offline page immediately.
  if (request.mode === "navigate") {
    event.respondWith(navigationNetworkOnly(request));
    return;
  }

  // Static assets (JS, CSS, images, SVG, fonts): cache-first for offline speed
  const ext = url.pathname.split(".").pop()?.toLowerCase() || "";
  const isStatic = ["js", "css", "svg", "png", "jpg", "jpeg", "gif", "webp", "woff", "woff2", "ttf", "ico"].includes(ext);

  if (isStatic) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: network-first, cache as fallback
  event.respondWith(networkFirst(request));
});

// Cache-first for static assets (JS, CSS, images)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// Network-first for API calls and other requests
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Offline — server not reachable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Navigation: network ONLY — never serve cached HTML
// If server is down, show offline page immediately
async function navigationNetworkOnly(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Server is down — return offline page (not cached HTML)
    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) return offlinePage;
    return new Response("Alice is offline — server not reachable", {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
}
