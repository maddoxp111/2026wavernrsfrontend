// wavernrs in-app navigation.
//
// Only #view is swapped, so the shell and the player stay alive across pages.
// On top of that this file adds what makes it feel like an app rather than a
// website:
//   - a page-HTML cache (keyed by pathname; the HTML never depends on ?query)
//     filled by hover/touch/focus intent and an idle warm-up
//   - a thin top progress bar that only shows when something is actually slow
//   - a crossfade between pages (View Transitions where safe, CSS otherwise)
//   - scroll restoration on back/forward (and on reload)
//   - a route announcer + focus management for keyboard / screen-reader users
//   - in-app 404s and offline handling instead of a full reload that would
//     kill the player
//
// Page contract (unchanged): inline scripts are re-run on every visit, so no
// top-level let/const/class in them; timers go in window._pageCleanup.
// window.navigate stays the single entry point (layout.js wraps it), and a
// 'wv-navigate' window event fires after every in-app navigation.
window._pageCleanup = [];

(function () {
  'use strict';

  var TTL = 10 * 60 * 1000;          // cached page HTML lifetime
  var REVALIDATE_AFTER = 60 * 1000;  // refresh a used entry in the background after this
  var SHOW_DELAY = 120;              // progress bar / dimming only for slower navigations
  var SETTLE_CAP = 4000;             // stop waiting for a page's first data after this
  var HOVER_DELAY = 65;
  var MAX_ENTRIES = 40;

  // Pages that are not in-app (no #view) or must never be served from cache.
  var NO_SPA = /^\/(login|register|status|auth-callback)(\.html)?$/;
  var NO_PREFETCH = /^\/(login|register|status|auth-callback|discover|games|logout|api)(\/|\.html$|$)/;
  var ALIASES = { '/discover': '/browse' };
  var WARM = ['/index', '/browse', '/charts', '/archive', '/album', '/track', '/artist',
    '/playlist', '/search', '/library', '/archive-artist', '/resources'];

  var _pages = new Map();       // key -> { t, p, html }
  var _standalone = {};         // keys learned to have no #view
  var _inflightLow = 0;

  var _origPush = history.pushState;
  var _origReplace = history.replaceState;

  var _curKey = null;           // history entry key of the rendered page
  var _scrollMap = new Map();   // entry key -> #wv-content scrollTop
  var _lastPS = location.pathname + location.search;
  var _lastHash = location.hash;
  var _pop = null;              // { ps, y } handed from popstate to navigate
  var _forceNext = false;
  var _navActive = 0;           // gen of the navigation still in progress, 0 when idle
  var _lastKeyAt = 0;
  var _vtToken = 0;
  var _track = null;            // api() settle tracker for the current navigation

  function now() { return Date.now(); }
  function content() { return document.getElementById('wv-content'); }
  function curView() { return document.getElementById('view'); }
  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }
  function conn() { return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null; }
  function saveData() {
    var c = conn();
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  }
  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (_) {}
  }

  // ── Keys ──────────────────────────────────────────────────────────────
  function pageKey(pathname) {
    var p = String(pathname || '/').replace(/\.html$/, '').replace(/\/+$/, '');
    if (!p || p === '/index') return '/index';
    return p;
  }
  function fetchPathFor(key) { return key === '/index' ? '/' : key; }
  function newEntryKey() { return 'k' + now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function isPlainObj(o) {
    if (!o || typeof o !== 'object') return false;
    var pr = Object.getPrototypeOf(o);
    return pr === Object.prototype || pr === null;
  }
  function withKey(state, key) {
    if (state == null) return { wvKey: key };
    if (isPlainObj(state)) {
      if (state.wvKey === key) return state;
      var o = {};
      for (var k in state) if (Object.prototype.hasOwnProperty.call(state, k)) o[k] = state[k];
      o.wvKey = key;
      return o;
    }
    return state;
  }

  // ── Styles (injected once) ────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('wv-router-css')) return;
    var css =
      '#wv-progress{position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;height:10px;z-index:10001;pointer-events:none;opacity:0;overflow:hidden;transition:opacity .35s ease .12s}' +
      '#wv-progress.on{opacity:1;transition:opacity .1s ease}' +
      '#wv-progress .wv-progress-bar{position:absolute;left:0;top:0;width:100%;height:3px;background:var(--brand);' +
        'background:linear-gradient(90deg,color-mix(in srgb,var(--brand) 30%,transparent) 0%,var(--brand) 45%,color-mix(in srgb,var(--brand) 72%,#fff) 100%);' +
        'transform:translate3d(-100%,0,0);transition:transform .28s cubic-bezier(.2,.8,.2,1);will-change:transform;border-radius:0 3px 3px 0}' +
      '#wv-progress .wv-progress-bar::after{content:"";position:absolute;right:0;top:0;width:120px;height:3px;border-radius:0 3px 3px 0;' +
        'box-shadow:0 0 12px 1px var(--brand),0 0 5px 0 var(--brand);opacity:.9}' +
      '#view.wv-nav-dim{opacity:.55;transition:opacity .22s ease}' +
      'html.wv-nav-busy{cursor:progress}' +
      '#view[tabindex="-1"]:focus{outline:none}' +
      '#view.wv-view-enter{animation:wv-view-in .2s cubic-bezier(.2,.8,.2,1) both}' +
      '@keyframes wv-view-in{from{opacity:0;transform:translate3d(0,8px,0)}to{opacity:1;transform:none}}' +
      'html.wv-vt #wv-content{view-transition-name:wv-view}' +
      'html.wv-vt::view-transition{pointer-events:none}' +
      'html.wv-vt::view-transition-group(root){animation:none}' +
      'html.wv-vt::view-transition-old(root),html.wv-vt::view-transition-new(root){animation:none;mix-blend-mode:normal}' +
      'html.wv-vt::view-transition-group(wv-view){animation-duration:.22s}' +
      'html.wv-vt::view-transition-old(wv-view){animation:none;mix-blend-mode:normal}' +
      'html.wv-vt::view-transition-new(wv-view){animation:wv-vt-in .22s cubic-bezier(.2,.8,.2,1) both;mix-blend-mode:normal}' +
      '@keyframes wv-vt-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '.wv-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}' +
      '.wv-offline-card{max-width:440px;margin:56px auto 0;padding:32px 24px;text-align:center;border:1px solid var(--border,var(--hair));border-radius:12px;background:var(--surface)}' +
      '.wv-offline-ic{width:56px;height:56px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface-2);color:var(--text-2)}' +
      '.wv-offline-card h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--text)}' +
      '.wv-offline-card p{margin:8px 0 20px;font-size:14px;line-height:1.55;color:var(--text-2)}' +
      '.wv-offline-card button{min-height:40px;padding:0 20px}' +
      '@media (max-width:520px){.wv-offline-card{margin-top:32px;padding:28px 18px}}' +
      '@media (prefers-reduced-motion:reduce){#view.wv-view-enter{animation:none}#view.wv-nav-dim{transition:none}' +
        '#wv-progress .wv-progress-bar{transition:none}#wv-progress .wv-progress-bar::after{display:none}}';
    var st = document.createElement('style');
    st.id = 'wv-router-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // ── Progress bar ──────────────────────────────────────────────────────
  var Bar = (function () {
    var el = null, bar = null, val = 0, timer = null, fadeT = null, active = false;
    function ensure() {
      if (el && el.isConnected) return;
      el = document.createElement('div');
      el.id = 'wv-progress';
      el.setAttribute('aria-hidden', 'true');
      bar = document.createElement('div');
      bar.className = 'wv-progress-bar';
      el.appendChild(bar);
      document.body.appendChild(el);
    }
    function set(v) {
      val = v;
      bar.style.transform = 'translate3d(' + ((v - 1) * 100).toFixed(2) + '%,0,0)';
    }
    function trickle() {
      var step = val < 0.3 ? 0.07 : val < 0.55 ? 0.035 : val < 0.75 ? 0.015 : val < 0.88 ? 0.005 : 0;
      if (step) set(Math.min(0.9, val + step * (0.55 + Math.random() * 0.9)));
    }
    return {
      get active() { return active; },
      start: function () {
        ensure();
        clearTimeout(fadeT);
        if (!active) {
          active = true;
          bar.style.transition = 'none';
          set(0);
          void bar.offsetWidth;
          bar.style.transition = '';
          el.classList.add('on');
          set(0.14);
        }
        clearInterval(timer);
        timer = setInterval(trickle, 240);
      },
      bump: function (v) { if (active && val < v) set(v); },
      done: function () {
        if (!active) return;
        active = false;
        clearInterval(timer);
        set(1);
        fadeT = setTimeout(function () {
          el.classList.remove('on');
          fadeT = setTimeout(function () { if (!active) { bar.style.transition = 'none'; set(0); } }, 480);
        }, 180);
      },
      cancel: function () {
        if (!active) return;
        active = false;
        clearInterval(timer);
        el.classList.remove('on');
      }
    };
  })();

  // ── api() settle tracking: the bar finishes when the new page's first
  //    data has landed, not merely when its HTML is in. ──────────────────
  function wrapApi() {
    var orig = window.api;
    if (typeof orig !== 'function' || orig._wvRouterTracked) return;
    var wrapped = function (path, opts) {
      var p = orig.apply(this, arguments);
      try {
        var t = _track;
        var isGet = !opts || !opts.method || String(opts.method).toUpperCase() === 'GET';
        if (t && !t.finished && isGet && t.gen === (window._wvNavGen || 0) && p && typeof p.then === 'function') {
          t.n++;
          var done = function () { t.n--; t.check(); };
          p.then(done, done);
        }
      } catch (_) {}
      return p;
    };
    try { for (var k in orig) { if (Object.prototype.hasOwnProperty.call(orig, k)) wrapped[k] = orig[k]; } } catch (_) {}
    wrapped._wvRouterTracked = true;
    try { window.api = wrapped; } catch (_) {}
  }

  function trackSettle(gen, onSettled) {
    var t = { gen: gen, n: 0, finished: false, grace: null };
    var cap = setTimeout(finish, SETTLE_CAP);
    function finish() {
      if (t.finished) return;
      t.finished = true;
      clearTimeout(cap);
      clearTimeout(t.grace);
      if (_track === t) _track = null;
      try { onSettled(); } catch (_) {}
    }
    t.check = function () {
      if (t.finished) return;
      clearTimeout(t.grace);
      if (t.n <= 0) t.grace = setTimeout(function () { if (t.n <= 0) finish(); }, 90);
    };
    _track = t;
    return t;
  }

  // ── Page HTML cache ───────────────────────────────────────────────────
  function evict() {
    if (_pages.size <= MAX_ENTRIES) return;
    var oldestK = null, oldestT = Infinity;
    _pages.forEach(function (e, k) { if (e.t < oldestT) { oldestT = e.t; oldestK = k; } });
    if (oldestK) _pages.delete(oldestK);
  }

  function fetchPage(key, prio, background) {
    var entry = { t: now(), p: null, html: null };
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 15000) : null;
    var init = { credentials: 'same-origin', headers: { Accept: 'text/html' } };
    if (ctrl) init.signal = ctrl.signal;
    if (prio) init.priority = prio;
    entry.p = fetch(fetchPathFor(key), init).then(function (res) {
      return res.text().then(function (html) {
        return { ok: res.ok, status: res.status, html: html, url: res.url || '' };
      });
    }).then(function (r) {
      clearTimeout(to);
      var finalKey = key;
      try { if (r.url) finalKey = pageKey(new URL(r.url).pathname); } catch (_) {}
      var hasView = /\bid\s*=\s*(["'])view\1|\bid\s*=\s*view[\s>]/.test(r.html);
      r.hasView = hasView;
      r.swOffline = finalKey !== key && /^\/offline$/.test(finalKey);
      if (r.ok && r.status === 200 && finalKey === key && hasView && !NO_SPA.test(key)) {
        entry.html = r.html;
        if (background) { entry.t = now(); _pages.set(key, entry); evict(); }
      } else {
        if (r.ok && !hasView && finalKey === key) _standalone[key] = 1;
        if (_pages.get(key) === entry) _pages.delete(key);
      }
      return r;
    }, function (err) {
      clearTimeout(to);
      if (_pages.get(key) === entry) _pages.delete(key);
      throw err;
    });
    entry.p.catch(function () {});
    if (!background) { _pages.set(key, entry); evict(); }
    return entry.p;
  }

  function freshEntry(key) {
    var e = _pages.get(key);
    if (!e) return null;
    if (now() - e.t > TTL) { _pages.delete(key); return null; }
    return e;
  }

  function prefetchable(u) {
    var target;
    try { target = new URL(u, location.href); } catch (_) { return null; }
    if (target.origin !== location.origin) return null;
    var p = target.pathname;
    if (NO_PREFETCH.test(p) || /\.[a-z0-9]{2,5}$/i.test(p.replace(/\.html$/, ''))) return null;
    var key = pageKey(ALIASES[pageKey(p)] || p);
    if (_standalone[key]) return null;
    return key;
  }

  function prefetch(u, prio) {
    var key = prefetchable(u);
    if (!key) return null;
    if (freshEntry(key)) return _pages.get(key).p;
    if (navigator.onLine === false) return null;
    if (prio === 'low') {
      if (_inflightLow >= 2 || saveData()) return null;
      _inflightLow++;
      var p = fetchPage(key, 'low');
      var dec = function () { _inflightLow--; };
      p.then(dec, dec);
      return p;
    }
    return fetchPage(key, prio);
  }

  async function loadPage(key) {
    var e = freshEntry(key);
    if (e) {
      try {
        var r = await e.p;
        if (r && r.ok && !r.swOffline) {
          if (e.html && now() - e.t > REVALIDATE_AFTER) {
            setTimeout(function () { if (_pages.get(key) === e && navigator.onLine !== false) fetchPage(key, 'low', true); }, 1500);
          }
          return { ok: r.ok, status: r.status, html: r.html, url: r.url, hasView: r.hasView, cached: !!e.html };
        }
      } catch (_) {}
    }
    var fr = await fetchPage(key, 'high');
    return fr;
  }

  // ── Scroll restoration ────────────────────────────────────────────────
  function rememberScroll() {
    var c = content();
    if (!_curKey || !c) return;
    _scrollMap.delete(_curKey);
    _scrollMap.set(_curKey, c.scrollTop);
    if (_scrollMap.size > 200) _scrollMap.delete(_scrollMap.keys().next().value);
  }
  function persistScroll() {
    try {
      var arr = [];
      _scrollMap.forEach(function (y, k) { arr.push([k, y]); });
      sessionStorage.setItem('wv_scroll_v1', JSON.stringify(arr.slice(-100)));
    } catch (_) {}
  }
  function loadPersistedScroll() {
    try {
      var arr = JSON.parse(sessionStorage.getItem('wv_scroll_v1') || '[]');
      if (Array.isArray(arr)) arr.forEach(function (p) { if (p && typeof p[1] === 'number') _scrollMap.set(String(p[0]), p[1]); });
    } catch (_) {}
  }

  // Wait until the page has grown tall enough (its data usually arrives after
  // the scripts run), then jump there. Any user scroll input cancels it.
  function restoreScroll(y, gen) {
    var c = content();
    if (!c || !(y > 0)) return;
    var t0 = now(), stopped = false;
    function stop() { stopped = true; off(); }
    function off() {
      c.removeEventListener('wheel', stop);
      c.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop, true);
    }
    c.addEventListener('wheel', stop, { passive: true });
    c.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop, true);
    (function tick() {
      if (stopped || gen !== (window._wvNavGen || 0) || !c.isConnected) { off(); return; }
      var max = c.scrollHeight - c.clientHeight;
      if (max >= y - 1) { c.scrollTop = y; off(); return; }
      if (now() - t0 > 3000) { if (max > 0) c.scrollTop = Math.min(y, max); off(); return; }
      requestAnimationFrame(tick);
    })();
  }

  function scrollToHash(hash, gen) {
    var id;
    try { id = decodeURIComponent(String(hash || '').slice(1)); } catch (_) { id = ''; }
    if (!id) return;
    var t0 = now();
    (function tick() {
      if (gen !== (window._wvNavGen || 0)) return;
      var el = document.getElementById(id);
      if (el && el.closest('#wv-content')) {
        try { el.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (_) {}
        return;
      }
      if (now() - t0 < 2000) setTimeout(tick, 100);
    })();
  }

  // ── Accessibility: announcer + focus ──────────────────────────────────
  var _announcer = null;
  function announce(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!text) return;
    if (!_announcer || !_announcer.isConnected) {
      _announcer = document.createElement('div');
      _announcer.id = 'wv-route-announcer';
      _announcer.className = 'wv-sr-only';
      _announcer.setAttribute('aria-live', 'polite');
      _announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(_announcer);
    }
    _announcer.textContent = '';
    setTimeout(function () { if (_announcer) _announcer.textContent = text; }, 60);
  }
  function pageName(fallback) {
    var v = curView();
    var h = v && v.querySelector('h1');
    var t = h ? (h.textContent || '').replace(/\s+/g, ' ').trim() : '';
    return t || fallback || document.title;
  }
  function isTextEntry(el) {
    if (!el || !el.tagName) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag !== 'INPUT') return false;
    return !/^(button|submit|reset|checkbox|radio|range|color|file|image)$/i.test(el.type || '');
  }
  function focusView() {
    var v = curView();
    if (!v) return;
    var ae = document.activeElement;
    if (ae && ae !== document.body && ae !== document.documentElement && (isTextEntry(ae) || v.contains(ae))) return;
    if (ae && ae.closest && ae.closest('[role=dialog],[aria-modal=true]')) return;
    if (!v.hasAttribute('tabindex')) {
      v.setAttribute('tabindex', '-1');
      v.addEventListener('blur', function rm() { v.removeEventListener('blur', rm); if (v.getAttribute('tabindex') === '-1') v.removeAttribute('tabindex'); });
    }
    try { v.focus({ preventScroll: true }); } catch (_) { try { v.focus(); } catch (_) {} }
  }

  // ── Swap helpers ──────────────────────────────────────────────────────
  function syncHeadStyles(doc) {
    var next = Array.prototype.map.call(doc.head ? doc.head.querySelectorAll('style') : [], function (s) { return s.textContent; });
    var prev = Array.prototype.slice.call(document.querySelectorAll('style[data-wv-page-style]'));
    var same = prev.length === next.length && prev.every(function (el, i) { return el.textContent === next[i]; });
    if (same) return;
    prev.forEach(function (el) { el.remove(); });
    next.forEach(function (txt) {
      var s2 = document.createElement('style');
      s2.setAttribute('data-wv-page-style', '1');
      s2.textContent = txt;
      document.head.appendChild(s2);
    });
  }

  // Same-origin <script src> the page expects but this document never loaded
  // (ratings.js, playlists.js, ...). Before, landing on /album from another
  // page left its rating widget missing.
  function loadMissingScripts(doc) {
    var have = {};
    Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
      try { have[new URL(s.src, location.href).pathname] = 1; } catch (_) {}
    });
    var list = [];
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (s) {
      var u;
      try { u = new URL(s.getAttribute('src'), location.href); } catch (_) { return; }
      if (u.origin !== location.origin || have[u.pathname] || !/\.js$/.test(u.pathname)) return;
      have[u.pathname] = 1;
      list.push(u.href);
    });
    if (!list.length) return null;
    return Promise.all(list.map(function (href) {
      return new Promise(function (res) {
        var el = document.createElement('script');
        el.src = href;
        el.async = false;
        el.onload = el.onerror = function () { res(); };
        setTimeout(res, 5000);
        document.head.appendChild(el);
      });
    }));
  }

  var _runningScripts = false;
  function runInlineScripts(doc) {
    _runningScripts = true;
    try { runInlineScriptsNow(doc); } finally { _runningScripts = false; }
  }
  function runInlineScriptsNow(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('script:not([src])'), function (pageScript) {
      var type = (pageScript.getAttribute('type') || '').trim().toLowerCase();
      if (type && !/^(text|application)\/(javascript|ecmascript)$|^module$/.test(type)) return;
      var s = document.createElement('script');
      if (type === 'module') s.type = 'module';
      s.textContent = pageScript.textContent;
      document.head.appendChild(s);
      if (type !== 'module') s.remove();
    });
  }

  // Sample the content area: if anything else sits on top of it (drawer,
  // sheet, full player, toast, popover), a view transition would paint the
  // page over it for a moment, so use the plain CSS entrance instead.
  function canViewTransition() {
    if (typeof document.startViewTransition !== 'function' || reducedMotion() || document.hidden) return false;
    var c = content();
    if (!c || !c.isConnected) return false;
    var r = c.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var l = Math.max(0, r.left), t = Math.max(0, r.top), rr = Math.min(vw, r.right), b = Math.min(vh, r.bottom);
    if (rr - l < 80 || b - t < 80) return false;
    var toasts = document.getElementById('wv-toasts');
    if (toasts && toasts.childElementCount) return false;
    if (document.querySelector('dialog[open],[aria-modal="true"]')) return false;
    var pts = [[0.5, 0.45], [0.15, 0.15], [0.85, 0.15], [0.15, 0.75], [0.85, 0.75]];
    for (var i = 0; i < pts.length; i++) {
      var x = l + (rr - l) * pts[i][0], y = t + (b - t) * pts[i][1];
      var el = document.elementFromPoint(x, y);
      if (!el || !(el === c || c.contains(el))) return false;
    }
    return true;
  }

  function closeOverlays() {
    var d = document.getElementById('wv-drawer');
    if (d && d.classList.contains('open') && typeof window.closeMobileDrawer === 'function') {
      try { window.closeMobileDrawer(); } catch (_) {}
    }
    var s = document.getElementById('wv-suggest');
    if (s && !s.classList.contains('wvqs')) s.remove();
    // Account menu + notifications panel (layout.js exposes a closer), and the
    // theme picker: none of them should survive into the next page.
    if (typeof window._wvCloseShellOverlays === 'function') {
      try { window._wvCloseShellOverlays(); } catch (_) {}
    }
    var tp = document.getElementById('wv-theme-picker');
    if (tp) tp.remove();
  }

  function offlineCardHTML() {
    return '<div class="wv-offline-card" role="alert">' +
      '<div class="wv-offline-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M9.5 5.2A15 15 0 0 1 22 8.8"/><path d="M5 12.6a10 10 0 0 1 3.4-2"/><path d="M14.6 10.4A10 10 0 0 1 19 12.6"/>' +
      '<path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M3 3l18 18"/></svg></div>' +
      '<h2>you\'re offline rn</h2>' +
      '<p>this page couldn\'t load. it\'ll open as soon as you\'re back online.</p>' +
      '<button type="button" class="wv-pill brand" onclick="window.wvRouter&&window.wvRouter.retry()">Try again</button>' +
      '</div>';
  }

  function showOfflineView(gen) {
    var v = curView();
    if (!v) return;
    var fresh = document.createElement('div');
    fresh.id = 'view';
    fresh.innerHTML = offlineCardHTML();
    v.replaceWith(fresh);
    document.querySelectorAll('style[data-wv-page-style]').forEach(function (el) { el.remove(); });
    document.title = 'offline — wavernrs';
    if (typeof window._wvRestoreTabTitle === 'function') { try { window._wvRestoreTabTitle(document.title); } catch (_) {} }
    if (typeof window._updateNavActive === 'function') { try { window._updateNavActive(); } catch (_) {} }
    var c = content();
    if (c) c.scrollTop = 0;
    _lastPS = location.pathname + location.search;
    _lastHash = location.hash;
    var once = function () {
      window.removeEventListener('online', once);
      if (gen === (window._wvNavGen || 0) && document.querySelector('#view .wv-offline-card')) retry();
    };
    window.addEventListener('online', once);
    window._pageCleanup.push(function () { window.removeEventListener('online', once); });
  }

  function retry() {
    _forceNext = true;
    window.navigate(location.pathname + location.search + location.hash);
  }

  // ── navigate ──────────────────────────────────────────────────────────
  // Any unexpected failure falls back to a real page load, so a link can
  // never just do nothing.
  function navigate(url, opts) {
    return navigateInner(url, opts).catch(function () {
      try {
        var t = new URL(url, location.href);
        if (t.pathname + t.search !== location.pathname + location.search || !curView()) location.assign(t.href);
      } catch (_) {}
    });
  }

  async function navigateInner(url, opts) {
    opts = opts || {};
    // A page that navigates away while its own scripts are still starting up
    // (e.g. /tracker with no slug going to /archive) is a redirect: replace
    // the entry, or Back would land on it and bounce straight forward again.
    if (!opts.replace && (_runningScripts || document.readyState === 'loading')) {
      var o2 = {};
      for (var ok in opts) if (Object.prototype.hasOwnProperty.call(opts, ok)) o2[ok] = opts[ok];
      o2.replace = true;
      opts = o2;
    }
    var target;
    try { target = new URL(url, location.href); } catch (_) { location.assign(url); return; }

    var pop = _pop; _pop = null;
    var fromPopstate = !!(pop && pop.ps === target.pathname + target.search);
    var force = _forceNext || !!opts.force; _forceNext = false;

    if (target.origin !== location.origin) { location.assign(target.href); return; }

    var alias = ALIASES[pageKey(target.pathname)];
    if (alias) target.pathname = alias;

    var samePage = pageKey(target.pathname) + target.search === pageKey(location.pathname) + location.search;
    if (!fromPopstate && !force && samePage) {
      if (!_navActive) {
        if (target.hash && target.hash !== location.hash) { location.hash = target.hash; return; }
        // Tapping the page you're on (a nav item, the logo) scrolls back to the top.
        var sc = content();
        if (sc && sc.scrollTop > 0) {
          try { sc.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); } catch (_) { sc.scrollTop = 0; }
        }
        return;
      }
      force = true;
    }

    var path = target.pathname;
    var key = pageKey(path);
    // Standalone pages (auth, status) have no #view, so they always get a real load.
    if (NO_SPA.test(path) || _standalone[key]) { location.assign(target.href); return; }

    // New page generation: in-flight api() calls from the old page are dropped.
    var gen = window._wvNavGen = (window._wvNavGen || 0) + 1;
    _navActive = gen;
    var viaKeyboard = now() - _lastKeyAt < 1000;

    // Remember where the page we're leaving was scrolled to now, before its
    // teardown or the swap can shrink it and clamp scrollTop.
    if (!fromPopstate) rememberScroll();

    emit('wv-navigate-start', { url: target.href, path: path, popstate: fromPopstate });
    closeOverlays();

    // Run teardown registered by the previous page.
    var cleanups = window._pageCleanup || [];
    window._pageCleanup = [];
    cleanups.forEach(function (fn) { try { fn(); } catch (_) {} });

    // Clear any page-specific wash; pages that want one re-apply it.
    if (typeof window.setPageBgImage === 'function') { try { window.setPageBgImage(''); } catch (_) {} }

    // Slow navigations get the bar and a dimmed page after SHOW_DELAY.
    var busyEl = curView();
    var showT = setTimeout(function () {
      if (gen !== window._wvNavGen) return;
      Bar.start();
      if (busyEl && busyEl.isConnected) {
        busyEl.classList.add('wv-nav-dim');
        busyEl.setAttribute('aria-busy', 'true');
      }
      document.documentElement.classList.add('wv-nav-busy');
    }, SHOW_DELAY);
    function clearBusy() {
      clearTimeout(showT);
      document.documentElement.classList.remove('wv-nav-busy');
      if (busyEl && busyEl.isConnected) {
        busyEl.classList.remove('wv-nav-dim');
        busyEl.removeAttribute('aria-busy');
      }
    }

    var page;
    try {
      page = await loadPage(key);
      if (page && page.swOffline) throw new Error('offline');
    } catch (err) {
      if (gen !== window._wvNavGen) return;
      clearBusy();
      _navActive = 0;
      if (navigator.onLine === false || (page && page.swOffline)) {
        Bar.cancel();
        if (fromPopstate) {
          showOfflineView(gen);
          emit('wv-navigate', { url: location.href, path: location.pathname, popstate: true, offline: true });
        } else if (typeof window.wvToast === 'function') {
          // pwa.js already shows an "offline" toast when the connection drops;
          // only add ours when that one isn't on screen.
          var ts = document.getElementById('wv-toasts');
          if (!(ts && /offline/i.test(ts.textContent || ''))) {
            window.wvToast('you\'re offline rn, that page will open once you\'re back online', 'error');
          }
        }
        return;
      }
      location.assign(target.href);
      return;
    }
    if (gen !== window._wvNavGen) return;

    var doc, newView;
    try {
      doc = new DOMParser().parseFromString(page.html, 'text/html');
      newView = doc.getElementById('view');
    } catch (_) { newView = null; }

    // No #view: a standalone page (or an error page without the shell).
    if (!newView) {
      if (page.ok) _standalone[key] = 1;
      location.assign(target.href);
      return;
    }
    // Non-OK responses that still have #view (Vercel's 404.html) render in-app,
    // so whatever is playing keeps playing.
    Bar.bump(0.6);

    var ctx = { committed: false };
    function commit() {
      if (gen !== window._wvNavGen) return;
      var title = doc.title || document.title;
      document.title = title;
      if (typeof window._wvRestoreTabTitle === 'function') { try { window._wvRestoreTabTitle(title); } catch (_) {} }

      syncHeadStyles(doc);

      // History first, so location.search is right when the page script reads it.
      if (!fromPopstate) {
        var k = newEntryKey();
        var nextUrl = target.pathname + target.search + target.hash;
        if (opts.replace && _curKey) _scrollMap.delete(_curKey);
        if (opts.replace) _origReplace.call(history, withKey(history.state, _curKey || k), title, nextUrl);
        else { _origPush.call(history, { wvKey: k }, title, nextUrl); _curKey = k; }
      } else if (!_curKey) {
        _curKey = newEntryKey();
        try { _origReplace.call(history, withKey(history.state, _curKey), document.title); } catch (_) {}
      }
      _lastPS = location.pathname + location.search;
      _lastHash = location.hash;

      var fresh = document.adoptNode(newView);
      var cv = curView();
      if (cv) cv.replaceWith(fresh);
      else { var c0 = content(); if (c0) c0.appendChild(fresh); }
      ctx.view = fresh;

      if (typeof window._updateNavActive === 'function') { try { window._updateNavActive(); } catch (_) {} }

      window.scrollTo(0, 0);
      var c = content();
      if (c) c.scrollTop = 0;
      ctx.committed = true;
      if (_navActive === gen) _navActive = 0;
    }

    try {
      if (canViewTransition()) {
        var token = ++_vtToken;
        var root = document.documentElement;
        root.classList.add('wv-vt');
        var endVT = function () { if (token === _vtToken) root.classList.remove('wv-vt'); };
        var tr;
        try { tr = document.startViewTransition(commit); } catch (_) { tr = null; }
        if (tr) {
          if (tr.ready) tr.ready.catch(function () {});
          if (tr.finished) tr.finished.then(endVT, endVT); else setTimeout(endVT, 400);
          await tr.updateCallbackDone;
        } else {
          endVT();
          commit();
        }
      } else {
        commit();
        if (ctx.view && !reducedMotion()) {
          var ve = ctx.view;
          ve.classList.add('wv-view-enter');
          var rmEnter = function () { ve.classList.remove('wv-view-enter'); };
          ve.addEventListener('animationend', rmEnter, { once: true });
          setTimeout(rmEnter, 450);
        }
      }
    } catch (_) {
      if (gen === window._wvNavGen && !ctx.committed) { location.assign(target.href); return; }
    }
    if (gen !== window._wvNavGen || !ctx.committed) return;
    clearBusy();

    var settle = trackSettle(gen, function () {
      if (gen !== window._wvNavGen) return;
      Bar.done();
      var v = curView();
      if (v) v.removeAttribute('aria-busy');
      announce(pageName(doc.title));
    });

    var waitScripts = loadMissingScripts(doc);
    if (waitScripts) {
      try { await waitScripts; } catch (_) {}
      if (gen !== window._wvNavGen) return;
    }

    // Run every inline <script> the page has, in order.
    runInlineScripts(doc);

    var c2 = content();
    if (fromPopstate && pop && pop.y > 0) {
      restoreScroll(pop.y, gen);
    } else {
      window.scrollTo(0, 0);
      if (c2) c2.scrollTop = 0;
      if (target.hash) scrollToHash(target.hash, gen);
    }

    if (viaKeyboard) focusView();
    settle.check();

    emit('wv-navigate', {
      url: location.href,
      path: location.pathname,
      popstate: fromPopstate,
      cached: !!page.cached,
      status: page.status
    });
  }

  window.navigate = navigate;

  // ── History hooks: every entry gets a key so its scroll can be restored,
  //    including entries pages push themselves (community posts, search, ...).
  try {
    history.pushState = function (state, title, url) {
      try { rememberScroll(); } catch (_) {}
      var k = newEntryKey();
      var args = Array.prototype.slice.call(arguments);
      args[0] = withKey(state, k);
      var r = _origPush.apply(history, args);
      _curKey = k;
      _lastPS = location.pathname + location.search;
      _lastHash = location.hash;
      return r;
    };
    history.replaceState = function (state, title, url) {
      var args = Array.prototype.slice.call(arguments);
      if (_curKey) args[0] = withKey(state, _curKey);
      var r = _origReplace.apply(history, args);
      _lastPS = location.pathname + location.search;
      _lastHash = location.hash;
      return r;
    };
  } catch (_) {}

  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (_) {}

  // ── Link interception ─────────────────────────────────────────────────
  function linkTarget(a) {
    if (!a || a.hasAttribute('download')) return null;
    var t = (a.getAttribute('target') || '').toLowerCase();
    if (t && t !== '_self') return null;
    var rel = (a.getAttribute('rel') || '').toLowerCase();
    if (/\bexternal\b/.test(rel) || a.hasAttribute('data-wv-reload')) return null;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|sms|javascript|blob|data):/i.test(href)) return null;
    var u;
    try { u = new URL(href, location.href); } catch (_) { return null; }
    if (u.origin !== location.origin) return null;
    if (/^\/api\//.test(u.pathname)) return null;
    if (/\.[a-z0-9]{2,5}$/i.test(u.pathname) && !/\.html$/i.test(u.pathname)) return null;
    return u;
  }

  document.addEventListener('click', function (e) {
    // Anything the browser has its own meaning for stays the browser's: a new
    // tab on cmd/ctrl/middle click, a new window on shift, target="_blank".
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var u = linkTarget(a);
    if (!u) return;
    // Same page, only a different #hash: let the browser jump to the anchor.
    if (u.pathname + u.search === location.pathname + location.search && u.hash && u.hash !== location.hash) return;
    e.preventDefault();
    window.navigate(u.pathname + u.search + u.hash);
  });

  // ── Browser back / forward ────────────────────────────────────────────
  window.addEventListener('popstate', function (e) {
    var ps = location.pathname + location.search;
    // Only the #hash changed: the browser already scrolled to the anchor.
    if (ps === _lastPS && location.hash !== _lastHash) { _lastHash = location.hash; return; }
    rememberScroll();
    var st = e.state;
    var key = st && typeof st === 'object' ? st.wvKey : null;
    _curKey = key || null;
    var y = key && _scrollMap.has(key) ? _scrollMap.get(key) : (st && typeof st.wvScroll === 'number' ? st.wvScroll : 0);
    _pop = { ps: ps, y: y };
    window.navigate(ps + location.hash);
  });

  // ── Input modality (keyboard-initiated navigations move focus) ────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'BrowserBack' || e.key === 'BrowserForward') _lastKeyAt = now();
  }, true);
  document.addEventListener('pointerdown', function () { _lastKeyAt = 0; }, true);

  // ── Intent prefetch ───────────────────────────────────────────────────
  var NAV_ATTR_RE = /navigate\(\s*\\?['"]([^'"\\]+)/;
  function intentUrl(node) {
    if (!node || !node.closest) return null;
    var el = node.closest('a[href],[onclick*="navigate("]');
    if (!el) return null;
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      var u = linkTarget(el);
      if (u) return { el: el, url: u.pathname + u.search };
      if (!el.hasAttribute('onclick')) return null;
    }
    var m = NAV_ATTR_RE.exec(el.getAttribute('onclick') || '');
    return m ? { el: el, url: m[1] } : null;
  }
  var _hoverT = null, _hoverEl = null;
  function onIntent(e) {
    var hit = intentUrl(e.target);
    if (!hit) return;
    var immediate = e.type === 'touchstart' || e.type === 'pointerdown' || e.pointerType === 'touch' || e.pointerType === 'pen';
    if (immediate) { prefetch(hit.url, 'high'); return; }
    if (hit.el === _hoverEl) return;
    clearTimeout(_hoverT);
    _hoverEl = hit.el;
    _hoverT = setTimeout(function () { _hoverEl = null; if (!saveData()) prefetch(hit.url, 'high'); }, HOVER_DELAY);
  }
  function onLeave(e) {
    if (!_hoverEl) return;
    var to = e.relatedTarget;
    if (to && _hoverEl.contains(to)) return;
    clearTimeout(_hoverT);
    _hoverEl = null;
  }
  document.addEventListener('pointerover', onIntent, { passive: true, capture: true });
  document.addEventListener('pointerout', onLeave, { passive: true, capture: true });
  document.addEventListener('focusin', onIntent, true);
  document.addEventListener('focusout', onLeave, true);
  document.addEventListener('pointerdown', onIntent, { passive: true, capture: true });
  document.addEventListener('touchstart', onIntent, { passive: true, capture: true });

  // ── Idle warm-up of the most-used pages ───────────────────────────────
  function warmUp() {
    if (saveData() || navigator.onLine === false) return;
    var c = conn();
    var fast = !c || !c.effectiveType || c.effectiveType === '4g';
    var list = [location.pathname].concat(WARM.filter(function (p) { return fast || p !== '/resources'; }));
    var seen = {};
    var i = 0;
    var ric = window.requestIdleCallback
      ? function (fn) { window.requestIdleCallback(fn, { timeout: 2500 }); }
      : function (fn) { setTimeout(fn, 400); };
    function step() {
      if (document.hidden) { document.addEventListener('visibilitychange', function v() { if (!document.hidden) { document.removeEventListener('visibilitychange', v); ric(step); } }); return; }
      while (i < list.length) {
        var key = prefetchable(list[i++]);
        if (!key || seen[key] || freshEntry(key)) continue;
        seen[key] = 1;
        var p = prefetch(key, 'low');
        if (p) { p.then(function () { ric(step); }, function () { ric(step); }); return; }
      }
    }
    ric(step);
  }
  function scheduleWarmUp() { setTimeout(warmUp, 2500); }
  if (document.readyState === 'complete') scheduleWarmUp();
  else window.addEventListener('load', scheduleWarmUp, { once: true });

  // ── Init ──────────────────────────────────────────────────────────────
  injectStyles();
  wrapApi();
  if (typeof window.api !== 'function') document.addEventListener('DOMContentLoaded', wrapApi, { once: true });
  loadPersistedScroll();
  try {
    var st0 = history.state;
    _curKey = st0 && typeof st0 === 'object' && st0.wvKey ? st0.wvKey : null;
    if (!_curKey) {
      _curKey = newEntryKey();
      _origReplace.call(history, withKey(st0, _curKey), document.title);
    }
  } catch (_) {}

  // Reload / returning from another site: put the list back where it was.
  (function () {
    var type = '';
    try { var nav = performance.getEntriesByType('navigation')[0]; type = nav && nav.type; } catch (_) {}
    if (type !== 'reload' && type !== 'back_forward') return;
    var y = _curKey && _scrollMap.has(_curKey) ? _scrollMap.get(_curKey) : 0;
    if (!(y > 0)) return;
    var gen = window._wvNavGen || 0;
    var go = function () { setTimeout(function () { restoreScroll(y, gen); }, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
    else go();
  })();

  function saveOnLeave() { rememberScroll(); persistScroll(); }
  window.addEventListener('pagehide', saveOnLeave);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveOnLeave(); });

  window.wvRouter = {
    prefetch: function (url) { return prefetch(url, 'high'); },
    retry: retry,
    clearCache: function () { _pages.clear(); },
    _debug: function () {
      var out = {};
      _pages.forEach(function (e, k) { out[k] = { age: now() - e.t, cached: !!e.html }; });
      return { pages: out, key: _curKey, scroll: Array.from(_scrollMap.entries()).slice(-10) };
    }
  };
})();

// Initial active state (layout.js will handle this, but set a fallback)
if (typeof window._updateNavActive === 'function') {
  window._updateNavActive();
}
