/*
 * wavernrs service worker.
 *
 * Registered by js/pwa.js as /sw.js?v=<asset stamp>, so every deploy that
 * bumps the stamp installs a fresh worker, which takes over straight away
 * (skipWaiting + clients.claim) and deletes the caches of older versions.
 *
 * What it does, and nothing more:
 *   - pages (navigations and the router's Accept: text/html fetches):
 *     network first; the last good copy only if the network is slow (4s) or
 *     down; /offline only when the network actually fails and nothing is cached
 *   - /js and /css with ?v=: cache first, re-checked once in the background
 *   - same-origin images and icons: stale-while-revalidate
 *   - everything else goes straight to the network: API calls, audio/video,
 *     other origins, non-GET, Range requests, /status.json, /sw.js
 *
 * KILL SWITCH: if this worker ever misbehaves, set KILL = true below and
 * deploy. Browsers re-check /sw.js on every navigation (it is served with
 * max-age=0), the killed worker installs immediately, wipes every wavernrs
 * cache, unregisters itself and reloads open tabs onto the plain network.
 * Setting localStorage wv_no_sw = 1 does the same for one browser.
 */
'use strict';

var KILL = false;
var CACHE_VERSION = 'wv1';
var STAMP = (function () {
  try { return new URL(self.location.href).searchParams.get('v') || 'dev'; } catch (_) { return 'dev'; }
})();
var Q = STAMP === 'dev' ? '' : '?v=' + STAMP;
var STATIC_CACHE = 'wv-static-' + CACHE_VERSION + '-' + STAMP;
var PAGE_CACHE = 'wv-pages-' + CACHE_VERSION;
var IMG_CACHE = 'wv-img-' + CACHE_VERSION;
var KEEP = [STATIC_CACHE, PAGE_CACHE, IMG_CACHE];
var OFFLINE_URL = '/offline';
var NET_TIMEOUT = 4000;
var MAX_PAGES = 40;
var MAX_IMGS = 60;

var PRECACHE = [
  '/css/style.css' + Q,
  '/js/api.js' + Q,
  '/js/layout.js' + Q,
  '/js/player.js' + Q,
  '/js/router.js' + Q,
  '/icons/icon-192.png',
  '/icons/favicon-32.png',
  '/logo.png'
];

function isWvCache(name) { return /^wv-(static|pages|img)-/.test(name); }

self.addEventListener('install', function (event) {
  if (KILL) { self.skipWaiting(); return; }
  event.waitUntil((async function () {
    var cache = await caches.open(STATIC_CACHE);
    var off = await fetch(new Request(OFFLINE_URL, { cache: 'reload', credentials: 'same-origin' }));
    if (!off.ok) throw new Error('offline page ' + off.status);
    await cache.put(OFFLINE_URL, await cleanCopy(off));
    await Promise.all(PRECACHE.map(function (u) {
      return fetch(new Request(u, { cache: 'reload', credentials: 'same-origin' })).then(function (r) {
        if (r.ok) return cache.put(u, r);
      }).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var names = await caches.keys();
    if (KILL) {
      await Promise.all(names.filter(isWvCache).map(function (n) { return caches.delete(n); }));
      await self.registration.unregister();
      var list = await self.clients.matchAll({ type: 'window' });
      list.forEach(function (c) { try { c.navigate(c.url); } catch (_) {} });
      return;
    }
    await Promise.all(names.filter(function (n) { return isWvCache(n) && KEEP.indexOf(n) < 0; }).map(function (n) { return caches.delete(n); }));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (_) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', function (event) {
  var d = event.data;
  var type = d && (d.type || d);
  if (type === 'SKIP_WAITING') self.skipWaiting();
  else if (type === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', version: STAMP, cache: CACHE_VERSION });
});

// A redirected response cannot be handed to a navigation, so store a clean copy.
async function cleanCopy(res) {
  if (!res.redirected) return res;
  var body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

function pageKey(url) {
  var p = url.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  if (!p || p === '/index') p = '/';
  return p;
}

function isStaticAsset(url) {
  return /^\/(js|css)\//.test(url.pathname) && url.searchParams.has('v');
}
function isImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(url.pathname);
}
function wantsHtml(req) {
  if (req.mode === 'navigate') return true;
  var a = req.headers.get('accept') || '';
  return a.indexOf('text/html') >= 0;
}

self.addEventListener('fetch', function (event) {
  if (KILL) return;
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  var p = url.pathname;
  if (p.indexOf('/api/') === 0 || p === '/api' || p === '/sw.js' || p === '/status.json' || p === '/manifest.json') return;
  if (/\.(mp3|m4a|mp4|mov|webm|ogg|oga|wav|flac|m3u8|ts)$/i.test(p)) return;
  if (req.cache === 'no-store') return;

  if (isStaticAsset(url)) { event.respondWith(cacheFirst(event, req)); return; }
  if (isImage(url)) { event.respondWith(staleWhileRevalidate(event, req)); return; }
  if (wantsHtml(req) && !/\.[a-z0-9]+$/i.test(p.replace(/\.html$/, ''))) { event.respondWith(networkFirstPage(event, req, url)); return; }
});

// Versioned assets come from the cache, but each one is re-checked once per
// worker lifetime in the background, so a file edited without a new ?v stamp
// still reaches people on their next load instead of being stuck forever.
var rechecked = {};
async function cacheFirst(event, req) {
  var cache = await caches.open(STATIC_CACHE);
  var hit = await cache.match(req);
  function refresh() {
    return fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic' && !res.redirected) {
        return cache.put(req, res.clone()).then(function () { return res; }, function () { return res; });
      }
      return res;
    });
  }
  if (hit) {
    if (!rechecked[req.url]) { rechecked[req.url] = 1; event.waitUntil(refresh().catch(function () {})); }
    return hit;
  }
  rechecked[req.url] = 1;
  try {
    return await refresh();
  } catch (err) {
    // Offline with a page cached under an older deploy: its ?v= no longer
    // matches, so hand back this deploy's copy of the same file.
    var same = await cache.match(req, { ignoreSearch: true });
    if (same) return same;
    throw err;
  }
}

async function staleWhileRevalidate(event, req) {
  var cache = await caches.open(IMG_CACHE);
  var hit = await cache.match(req);
  var net = fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic' && !res.redirected) {
      return cache.put(req, res.clone()).then(function () { trim(IMG_CACHE, MAX_IMGS); return res; }, function () { return res; });
    }
    return res;
  });
  if (hit) { event.waitUntil(net.catch(function () {})); return hit; }
  return net;
}

async function networkFirstPage(event, req, url) {
  var key = pageKey(url);
  var cache = await caches.open(PAGE_CACHE);

  var network = (async function () {
    var res = null;
    if (req.mode === 'navigate' && event.preloadResponse) {
      try { res = await event.preloadResponse; } catch (_) { res = null; }
    }
    if (!res) res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic' && !res.redirected && key !== OFFLINE_URL) {
      var copy = res.clone();
      event.waitUntil(cache.put(key, copy).then(function () { return trim(PAGE_CACHE, MAX_PAGES); }).catch(function () {}));
    }
    return res;
  })();

  var timer;
  var slow = new Promise(function (resolve) { timer = setTimeout(resolve, NET_TIMEOUT); });
  try {
    var first = await Promise.race([network.then(function (r) { return { r: r }; }), slow.then(function () { return null; })]);
    if (first) { clearTimeout(timer); return first.r; }
    // Slow network: the last good copy if there is one, otherwise keep waiting.
    var cached = await cache.match(key);
    if (cached) { event.waitUntil(network.catch(function () {})); return cached; }
    return await network;
  } catch (err) {
    clearTimeout(timer);
    var copy2 = await cache.match(key);
    if (copy2) return copy2;
    // The in-app router handles its own failed fetches (toast / offline card),
    // so only real page loads get the offline page. 503 keeps it out of caches.
    if (req.mode === 'navigate') {
      var off = await caches.match(OFFLINE_URL);
      if (off) {
        return new Response(await off.blob(), {
          status: 503, statusText: 'Offline',
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Wv-Offline': '1' }
        });
      }
    }
    throw err;
  }
}

async function trim(name, max) {
  try {
    var c = await caches.open(name);
    var keys = await c.keys();
    for (var i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
  } catch (_) {}
}
