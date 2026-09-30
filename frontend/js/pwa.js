// wavernrs as an installable app.
//
// Loaded on every page by layout.js ensure('pwa.js', 'wvPwa'). It:
//   - registers /sw.js with the same ?v stamp as layout.js (one worker per deploy)
//   - adds the home-screen metas the shell doesn't (apple-touch-icon, iOS
//     standalone/status bar, viewport-fit=cover for the safe-area padding)
//   - offers an install card after real engagement (2+ visits or a minute
//     on the site), with Share → Add to Home Screen steps on iOS Safari
//   - tells people when a new version is ready without ever cutting off
//     what they're listening to
//   - toasts when the connection drops and comes back
// window.wvPwa() returns the current state; wvPwa.install() opens the
// install flow from anywhere (the About page uses it).
(function () {
  'use strict';
  if (window._wvPwaInit) return;
  window._wvPwaInit = true;

  var SNOOZE_KEY = 'wv_pwa_snooze';
  var VISITS_KEY = 'wv_pwa_visits';
  var SNOOZE_MS = 30 * 24 * 3600 * 1000;
  var ENGAGED_MS = 60 * 1000;

  var deferred = null;          // stashed beforeinstallprompt event
  var card = null;              // current bottom card element
  var cardKind = '';
  var updateReady = false;
  var installed = false;

  function ls(k, v) {
    try {
      if (arguments.length > 1) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); return v; }
      return localStorage.getItem(k);
    } catch (_) { return null; }
  }
  function mq(q) { try { return window.matchMedia(q).matches; } catch (_) { return false; } }
  function isStandalone() {
    return mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || mq('(display-mode: minimal-ui)') || window.navigator.standalone === true;
  }
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|Instagram|FBAN|FBAV|Line\//.test(ua);
  function toast(msg, kind, ms, opts) { if (typeof window.wvToast === 'function') window.wvToast(msg, kind || '', ms, opts); }
  function audioPlaying() {
    var list = document.querySelectorAll('audio,video');
    for (var i = 0; i < list.length; i++) { if (!list[i].paused && !list[i].ended) return true; }
    return false;
  }

  // ── Head tags ──────────────────────────────────────────────────────────
  function addHead(tag, attrs, selector) {
    if (selector && document.head.querySelector(selector)) return;
    var el = document.createElement(tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    document.head.appendChild(el);
  }
  function headTags() {
    addHead('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }, 'link[rel="apple-touch-icon"]');
    addHead('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' }, 'link[rel="icon"][sizes="32x32"]');
    addHead('link', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' }, 'link[rel="icon"][sizes="192x192"]');
    addHead('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }, 'meta[name="apple-mobile-web-app-capable"]');
    addHead('meta', { name: 'mobile-web-app-capable', content: 'yes' }, 'meta[name="mobile-web-app-capable"]');
    addHead('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, 'meta[name="apple-mobile-web-app-status-bar-style"]');
    addHead('meta', { name: 'apple-mobile-web-app-title', content: 'wavernrs' }, 'meta[name="apple-mobile-web-app-title"]');
    addHead('meta', { name: 'application-name', content: 'wavernrs' }, 'meta[name="application-name"]');
    var vp = document.head.querySelector('meta[name="viewport"]');
    if (vp) {
      var c = vp.getAttribute('content') || '';
      if (c.indexOf('viewport-fit') < 0) vp.setAttribute('content', c.replace(/\s*,?\s*$/, '') + ', viewport-fit=cover');
    }
    if (!document.head.querySelector('link[rel="manifest"]')) addHead('link', { rel: 'manifest', href: '/manifest.json' });
  }

  // ── Styles (once) ──────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('wv-pwa-style')) return;
    var st = document.createElement('style');
    st.id = 'wv-pwa-style';
    st.textContent =
      '#wv-pwa-card{position:fixed;right:20px;bottom:108px;z-index:9990;width:min(380px,calc(100vw - 24px));box-sizing:border-box;' +
        'background:var(--elevated,var(--surface-2));color:var(--text);border:1px solid var(--hair-strong,var(--border));border-radius:16px;' +
        'box-shadow:0 18px 50px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.2);padding:16px;display:flex;flex-direction:column;gap:12px;' +
        'opacity:0;transform:translateY(14px) scale(.98);transition:opacity .22s var(--ease,ease),transform .26s var(--ease,ease);font-family:var(--font-sans)}' +
      '#wv-pwa-card.in{opacity:1;transform:none}' +
      '.theme-light #wv-pwa-card{box-shadow:0 18px 50px rgba(20,20,40,.16),0 2px 8px rgba(20,20,40,.08)}' +
      '.wvp-top{display:flex;gap:13px;align-items:flex-start}' +
      '.wvp-icon{width:52px;height:52px;border-radius:12px;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.3);object-fit:cover;background:var(--surface-3)}' +
      '.wvp-ic2{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--brand-bg);color:var(--brand)}' +
      '.wvp-txt{min-width:0;flex:1;padding-top:1px}' +
      '.wvp-t{font-size:15px;font-weight:800;letter-spacing:-.01em;line-height:1.25;white-space:normal}' +
      '.wvp-s{font-size:13px;color:var(--text-2);line-height:1.45;margin-top:3px;white-space:normal;overflow:visible;text-overflow:clip}' +
      '.wvp-x{width:32px;height:32px;margin:-6px -6px 0 0;border-radius:50%;border:0;background:transparent;color:var(--text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.wvp-x:hover{background:var(--surface-hover);color:var(--text)}' +
      '.wvp-feats{display:flex;gap:6px;flex-wrap:wrap;margin:0;padding:0;list-style:none}' +
      '.wvp-feats li{font-size:11.5px;font-weight:600;color:var(--text-2);background:var(--surface-3,var(--surface-2));border-radius:999px;padding:4px 9px;display:flex;align-items:center;gap:5px}' +
      '.wvp-feats svg{color:var(--brand)}' +
      '.wvp-row{display:flex;gap:8px;justify-content:flex-end}' +
      '.wvp-btn{min-height:40px;padding:0 18px;border-radius:999px;font-size:13.5px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text);font-family:inherit}' +
      '.wvp-btn:hover{background:var(--surface-hover)}' +
      '.wvp-btn.primary{background:var(--brand);border-color:var(--brand);color:var(--on-brand,#120b26)}' +
      '.wvp-btn.primary:hover{filter:brightness(1.08)}' +
      '#wv-pwa-card button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}' +
      '.wvp-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:s}' +
      '.wvp-steps li{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-2);line-height:1.35}' +
      '.wvp-steps li::before{counter-increment:s;content:counter(s);width:22px;height:22px;border-radius:50%;background:var(--surface-3,var(--surface-2));color:var(--text);font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.wvp-steps b{color:var(--text);font-weight:700}' +
      '.wvp-share{display:inline-flex;vertical-align:-3px;color:var(--blue,#60a5fa)}' +
      '@media (max-width:900px){#wv-pwa-card{left:12px;right:12px;width:auto;bottom:calc(72px + env(safe-area-inset-bottom))}' +
        'body:has(.player-bar:not(.hidden)) #wv-pwa-card{bottom:calc(132px + env(safe-area-inset-bottom))}}' +
      '@media (prefers-reduced-motion:reduce){#wv-pwa-card{transition:opacity .15s linear;transform:none}}';
    document.head.appendChild(st);
  }

  var I = {
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    refresh: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>'
  };

  function closeCard(snooze) {
    if (!card) return;
    var el = card;
    card = null; cardKind = '';
    if (snooze) ls(SNOOZE_KEY, Date.now() + SNOOZE_MS);
    el.classList.remove('in');
    setTimeout(function () { el.remove(); }, 260);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape' && card) { closeCard(cardKind === 'install' || cardKind === 'ios'); }
  }
  function showCard(kind, html, focus) {
    if (card) { if (cardKind === 'update') return null; card.remove(); card = null; }
    injectStyles();
    var el = document.createElement('div');
    el.id = 'wv-pwa-card';
    el.setAttribute('role', kind === 'update' ? 'status' : 'dialog');
    el.setAttribute('aria-label', kind === 'update' ? 'new version of wavernrs' : 'install wavernrs');
    el.innerHTML = html;
    document.body.appendChild(el);
    card = el; cardKind = kind;
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); }); });
    if (focus) { var b = el.querySelector('.wvp-btn.primary'); if (b) setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (_) {} }, 60); }
    return el;
  }

  var FEATS = '<ul class="wvp-feats"><li>' + I.check + 'full-screen player</li><li>' + I.check + 'lock-screen controls</li><li>' + I.check + 'opens instantly</li></ul>';
  function head(title, sub) {
    return '<div class="wvp-top"><img class="wvp-icon" src="/icons/icon-192.png" alt="" width="52" height="52">' +
      '<div class="wvp-txt"><div class="wvp-t">' + title + '</div><div class="wvp-s">' + sub + '</div></div>' +
      '<button class="wvp-x" type="button" data-x aria-label="Close">' + I.x + '</button></div>';
  }

  function showInstallCard(fromUser) {
    if (isStandalone() || installed) {
      if (fromUser) toast('wavernrs is already installed on this device');
      return false;
    }
    if (deferred) {
      var el = showCard('install', head('get the wavernrs app', 'your comps and edits a tap away, right on your home screen.') + FEATS +
        '<div class="wvp-row"><button class="wvp-btn" type="button" data-later>Not now</button><button class="wvp-btn primary" type="button" data-go>Install</button></div>', fromUser);
      if (!el) return false;
      el.querySelector('[data-x]').onclick = function () { closeCard(!fromUser); };
      el.querySelector('[data-later]').onclick = function () { closeCard(true); };
      el.querySelector('[data-go]').onclick = function () { closeCard(false); prompt(); };
      return true;
    }
    if (isIOS) {
      var el2 = showCard('ios', head('add wavernrs to your home screen', isIOSSafari ? 'full-screen player, lock-screen controls, opens instantly.' : 'open this page in Safari first, then:') +
        '<ol class="wvp-steps"><li><span>tap <b>Share</b> <span class="wvp-share">' + I.share + '</span> in Safari’s toolbar</span></li>' +
        '<li><span>scroll down and tap <b>Add to Home Screen</b></span></li><li><span>tap <b>Add</b>, then open wavernrs from your home screen</span></li></ol>' +
        '<div class="wvp-row"><button class="wvp-btn primary" type="button" data-later>Got it</button></div>', fromUser);
      if (!el2) return false;
      el2.querySelector('[data-x]').onclick = function () { closeCard(!fromUser); };
      el2.querySelector('[data-later]').onclick = function () { closeCard(true); };
      return true;
    }
    if (fromUser) {
      toast('use your browser menu', '', 5200, { title: 'install from your browser menu', body: 'look for “Install app” or “Add to Home screen”.' });
    }
    return false;
  }

  function prompt() {
    if (!deferred) return Promise.resolve('unavailable');
    var ev = deferred;
    deferred = null;
    try {
      ev.prompt();
      return ev.userChoice.then(function (c) {
        if (c && c.outcome === 'dismissed') ls(SNOOZE_KEY, Date.now() + SNOOZE_MS);
        return c && c.outcome;
      }, function () { return 'error'; });
    } catch (_) { return Promise.resolve('error'); }
  }

  // ── When to offer install ──────────────────────────────────────────────
  var eligibleAt = 0;
  function snoozed() { var s = +ls(SNOOZE_KEY) || 0; return s > Date.now(); }
  function onAppPage() { return !/^\/(login|register|auth-callback|status|offline)(\.html)?$/.test(location.pathname); }
  function maybeOffer() {
    if (card || installed || isStandalone() || snoozed() || !onAppPage()) return;
    if (!eligibleAt || Date.now() < eligibleAt) return;
    if (!deferred && !isIOSSafari) return;
    if (document.querySelector('.wv-sheet.open, .wv-sheet.show, [aria-modal="true"]')) return;
    showInstallCard(false);
  }
  function countVisit() {
    var n = +ls(VISITS_KEY) || 0;
    var fresh = false;
    try { fresh = !sessionStorage.getItem('wv_pwa_seen'); sessionStorage.setItem('wv_pwa_seen', '1'); } catch (_) {}
    if (fresh) { n += 1; ls(VISITS_KEY, n); }
    return n;
  }
  function scheduleOffer() {
    if (isStandalone()) return;
    var visits = countVisit();
    var wait = visits >= 2 ? 8000 : ENGAGED_MS;
    setTimeout(function () { eligibleAt = Date.now(); maybeOffer(); }, wait);
    window.addEventListener('wv-navigate', function () { setTimeout(maybeOffer, 1200); });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    setTimeout(maybeOffer, 400);
  });
  window.addEventListener('appinstalled', function () {
    installed = true;
    deferred = null;
    if (cardKind === 'install' || cardKind === 'ios') closeCard(false);
    toast('wavernrs is on your home screen now', 'success');
  });

  // ── Service worker + updates ───────────────────────────────────────────
  function layoutVer() {
    var s = document.querySelector('script[src*="/js/layout.js"]');
    var m = s && s.src.match(/[?&]v=([^&#]+)/);
    return m ? m[1] : '';
  }
  var pendingReload = false;
  function showUpdateCard() {
    if (updateReady) return;
    updateReady = true;
    pendingReload = true;
    var el = showCard('update', '<div class="wvp-top"><span class="wvp-ic2">' + I.refresh + '</span><div class="wvp-txt"><div class="wvp-t">new version ready</div>' +
      '<div class="wvp-s">refresh to get the latest wavernrs. ' + (audioPlaying() ? 'we’ll wait till you’re not listening.' : '') + '</div></div>' +
      '<button class="wvp-x" type="button" data-x aria-label="Later">' + I.x + '</button></div>' +
      '<div class="wvp-row"><button class="wvp-btn" type="button" data-later>Later</button><button class="wvp-btn primary" type="button" data-go>Refresh</button></div>', false);
    if (!el) return;
    el.querySelector('[data-x]').onclick = function () { closeCard(false); };
    el.querySelector('[data-later]').onclick = function () { closeCard(false); };
    el.querySelector('[data-go]').onclick = function () { pendingReload = false; location.reload(); };
  }
  // A deferred refresh happens on the next in-app navigation, but never
  // while something is playing (a reload would cut the song off).
  function onNavigateForUpdate() {
    if (!pendingReload || audioPlaying()) return;
    pendingReload = false;
    location.reload();
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;
    if (ls('wv_no_sw') === '1') {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      return;
    }
    var hadController = !!navigator.serviceWorker.controller;
    var v = layoutVer();
    navigator.serviceWorker.register('/sw.js' + (v ? '?v=' + encodeURIComponent(v) : ''), { scope: '/' }).then(function (reg) {
      window.wvPwa.registration = reg;
      if (reg.waiting && hadController) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) nw.postMessage({ type: 'SKIP_WAITING' });
        });
      });
      // Long sessions: look for a new deploy every half hour while visible.
      var iv = setInterval(function () { if (document.visibilityState === 'visible' && navigator.onLine !== false) reg.update().catch(function () {}); }, 30 * 60 * 1000);
      window.wvPwa._iv = iv;
    }).catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // First install claims the page too; only a swap between versions is an update.
      if (!hadController) { hadController = true; return; }
      showUpdateCard();
    });
    window.addEventListener('wv-navigate', onNavigateForUpdate);
  }

  // ── Connection toasts ──────────────────────────────────────────────────
  var wentOffline = false;
  window.addEventListener('offline', function () {
    wentOffline = true;
    toast('you’re offline', 'error', 5200, { title: 'you’re offline', body: 'what’s already playing keeps going. we’ll reconnect on our own.' });
  });
  window.addEventListener('online', function () {
    if (!wentOffline) return;
    wentOffline = false;
    toast('back online', 'success', 2600);
  });

  // ── Public API ─────────────────────────────────────────────────────────
  var wvPwa = function () {
    return {
      standalone: isStandalone(),
      canInstall: !isStandalone() && !installed && (!!deferred || isIOS),
      promptReady: !!deferred,
      ios: isIOS,
      updateReady: updateReady,
      controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
    };
  };
  wvPwa.install = function () {
    if (deferred) return prompt();
    showInstallCard(true);
    return Promise.resolve(isStandalone() ? 'installed' : (isIOS ? 'instructions' : 'unavailable'));
  };
  wvPwa.showInstallCard = function () { return showInstallCard(true); };
  wvPwa.isStandalone = isStandalone;
  window.wvPwa = wvPwa;

  function boot() {
    headTags();
    if (isStandalone()) document.documentElement.classList.add('wv-standalone');
    scheduleOffer();
    if (document.readyState === 'complete') setTimeout(registerSW, 1500);
    else window.addEventListener('load', function () { setTimeout(registerSW, 1500); });
    try { window.dispatchEvent(new CustomEvent('wv-pwa-ready')); } catch (_) {}
  }
  if (document.head) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
