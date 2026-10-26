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
 *
 * Self-healing: if the first download of a page was interrupted (weak network, app
 * closed too early), the worker quietly downloads the missing pages the next time
 * the app is opened online, so Gita / Aarti / bhajan pages end up saved on the phone.
 */
const CACHE_VERSION = "v4";
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
  "./menu.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./krishna-hero.jpg",
  "./krishna-bg2.jpg",
  "./profile-photo.jpg"
];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", function (e) {
  e.waitUntil(healCache(true).then(function () { return self.skipWaiting(); }));
});

// Download one file and store a clean copy (works even if the server redirected it).
function addClean(cache, url) {
  return fetch(new Request(url, { cache: "reload" })).then(function (res) {
    if (!res || !res.ok) throw new Error("bad response for " + url);
    if (res.redirected) {
      return res.blob().then(function (blob) {
        return cache.put(url, new Response(blob, { status: 200, statusText: "OK", headers: res.headers }));
      });
    }
    return cache.put(url, res);
  });
}

// Save every file in PRECACHE. force = download all again; otherwise only the missing ones.
var lastHeal = 0;
function healCache(force) {
  var now = Date.now();
  if (!force && now - lastHeal < 5 * 60 * 1000) return Promise.resolve();
  lastHeal = now;
  var failed = 0;
  return caches.open(CACHE).then(function (cache) {
    return Promise.all(PRECACHE.map(function (url) {
      var check = force ? Promise.resolve(null) : cache.match(url);
      return check.then(function (hit) {
        return hit ? null : addClean(cache, url).catch(function () { failed++; });   // one failure never blocks the rest
      });
    }));
  }).then(function () {
    if (failed) lastHeal = 0;      // something is still missing: try again the next time a page opens
  });
}

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf("krishna-vani-") === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return healCache(false); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       // chat/voice (POST) goes straight to the server

  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.indexOf("/api/") === 0 || url.pathname === "/health") return;
    if (req.mode === "navigate") e.waitUntil(healCache(false));   // fill any page not saved yet
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
