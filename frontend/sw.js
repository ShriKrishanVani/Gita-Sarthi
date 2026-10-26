/* श्री कृष्ण वाणी - service worker
 * Lets the app pages (home, Gita, Aarti, profile, support) open without internet.
 *
 * - On first visit it saves the main pages and images on the phone.
 * - Pages and scripts: tries the internet first (so updates arrive), and falls back
 *   to the saved copy when offline or when the network is slow.
 * - Images: saved copy first (fast, works offline).
 * - Google Fonts: saved after the first load so the Hindi fonts also work offline.
 * - Chat (/api/chat), health check and every POST request are never touched.
 *
 * When you add or rename a file in PRECACHE below, change CACHE_VERSION (v2 -> v3)
 * so phones pick up the new list.
 */
const CACHE_VERSION = "v2";
const CACHE = "krishna-vani-" + CACHE_VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./gita.html",
  "./gita-data.js",
  "./aarti.html",
  "./profile.html",
  "./support.html",
  "./connect.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./krishna-hero.jpg",
  "./krishna-bg2.jpg",
  "./profile-photo.jpg"
];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // add each file on its own, so one missing file never blocks the whole install
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf("krishna-vani-") === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       // chat/voice (POST) goes straight to the server

  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf("/api/") === 0 || url.pathname === "/health") return;
    if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname)) {
      e.respondWith(cacheFirst(req));
    } else {
      e.respondWith(networkFirst(req));
    }
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(req));
  }
  // anything else (YouTube, Google Apps Script leads form, etc.) is left alone
});

function networkFirst(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (cached) {
      var net = fetch(req);
      net.catch(function () {});                           // avoid "unhandled" noise if we stop waiting

      var result = cached
        ? Promise.race([net, new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error("slow network")); }, NETWORK_TIMEOUT_MS);
          })])
        : net;

      return result.then(function (res) {
        if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      }).catch(function () {
        if (cached) return cached;
        if (req.mode === "navigate") {
          return cache.match("./index.html").then(function (home) {
            return home || new Response("Offline", { status: 503, statusText: "Offline" });
          });
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      });
    });
  });
}

function cacheFirst(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () {
        return new Response("", { status: 504, statusText: "Offline" });
      });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var fresh = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      }).catch(function () { return cached; });
      return cached || fresh;
    });
  });
}
