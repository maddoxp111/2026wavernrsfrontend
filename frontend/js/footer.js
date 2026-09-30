(function () {
  if (typeof window.wvFooter === 'function') return;

  var DISCORD = 'https://discord.gg/j2jGmw5CZH';
  var STATS_KEY = 'wv_footer_stats_v1';
  var STATS_TTL = 10 * 60 * 1000;
  var SEEN_KEY = 'wv_whatsnew_seen';
  var HIDE_PATHS = /^\/(games|playlist-builder|upload|login|register|offline|auth-callback|adminpanel|modpanel|archivepanel|radiopanel|claim)(\.html)?\/?$/;

  var COLS = [
    ['Listen', [
      ['Home', '/'], ['Browse', '/browse'], ['Charts', '/charts'], ['Radio', '/radio'], ['Listening parties', '/lp'], ['Playlists', '/playlists']
    ]],
    ['Explore', [
      ['Archive', '/archive'], ['Ye archive', '/resources'], ['Trackers', '/tracker'], ['Discography', '/resources?view=disco'], ['On this day', '/resources?view=today'], ['Eras', '/eras']
    ]],
    ['Community', [
      ['Community', '/community'], ['Editors', '/artists'], ['Hall of Fame', '/awards'], ['Your recap', '/wrapped'], ['Games', '/games'], ['Discord', DISCORD, 'ext']
    ]],
    ['wavernrs', [
      ['What\u2019s new', '/whatsnew', 'new'], ['Notifications', '/notifications'], ['Status', '/status'], ['About', '/about'], ['Settings', '/settings']
    ]]
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) {
    n = +n || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'K';
    try { return n.toLocaleString('en-US'); } catch (_) { return String(n); }
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} }
  function apiBase() {
    try { if (typeof API_BASE === 'string' && API_BASE) return API_BASE; } catch (_) {}
    return 'https://2026wavernrs-production.up.railway.app/api';
  }
  function isMac() {
    try { return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || ''); } catch (_) { return false; }
  }

  var ICON = {
    discord: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.3A17.6 17.6 0 0 0 15.2 4l-.6 1.1a16.3 16.3 0 0 0-5 0L9 4a17.5 17.5 0 0 0-4.4 1.3C1.8 9.4 1.1 13.4 1.4 17.3a17.8 17.8 0 0 0 5.4 2.7l1.2-1.8c-.7-.2-1.3-.5-1.9-.9l.5-.3a12.6 12.6 0 0 0 10.8 0l.5.3c-.6.4-1.2.7-1.9.9l1.2 1.8a17.7 17.7 0 0 0 5.4-2.7c.4-4.5-.7-8.5-3-12Zm-11 9.6c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1c1 0 1.9 1 1.9 2.1s-.8 2.1-1.9 2.1Zm6.8 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1c1 0 1.9 1 1.9 2.1s-.8 2.1-1.9 2.1Z"/></svg>',
    ext: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    theme: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    up: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    spark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c.4 3.9 1.4 6.4 3 8 1.6 1.6 4.1 2.6 8 3-3.9.4-6.4 1.4-8 3-1.6 1.6-2.6 4.1-3 8-.4-3.9-1.4-6.4-3-8-1.6-1.6-4.1-2.6-8-3 3.9-.4 6.4-1.4 8-3 1.6-1.6 2.6-4.1 3-8Z" transform="translate(0 -1.5) scale(1 .96)"/></svg>',
    arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  var CSS = '' +
    '#wv-footer{position:relative;isolation:isolate;overflow:hidden;margin:56px 0 0;padding:52px 28px 28px;border-top:1px solid var(--hair);color:var(--text-2);font-size:14px;line-height:1.5;' +
      'background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 55%,transparent) 0%,color-mix(in srgb,var(--surface) 92%,transparent) 100%);}' +
    '#wv-footer[hidden]{display:none!important}' +
    '#wv-footer::before{content:"";position:absolute;left:50%;top:-1px;width:min(720px,80%);height:1px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--brand) 70%,transparent),transparent);pointer-events:none}' +
    '#wv-footer::after{content:"";position:absolute;left:50%;top:-180px;width:min(900px,120%);height:260px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--brand) 14%,transparent),transparent);z-index:-1;pointer-events:none}' +
    '.wvf-in{max-width:1180px;margin:0 auto}' +
    '#wv-footer a{color:inherit;text-decoration:none}' +
    '.wvf-top{display:grid;grid-template-columns:minmax(260px,1.15fr) 2.6fr;gap:48px;align-items:start}' +
    '.wvf-brand{display:flex;flex-direction:column;gap:16px;min-width:0}' +
    '.wvf-logo{display:inline-flex;align-items:center;gap:12px;color:var(--text)!important;width:max-content;border-radius:12px}' +
    '.wvf-logo img{width:40px;height:40px;border-radius:11px;object-fit:cover;box-shadow:0 6px 22px color-mix(in srgb,var(--brand) 28%,transparent),0 0 0 1px var(--hair-strong)}' +
    '.wvf-logo b{font-size:22px;font-weight:900;letter-spacing:-.04em}' +
    '.wvf-mission{margin:0;font-size:14.5px;color:var(--text-2);max-width:320px;line-height:1.6}' +
    '.wvf-ctas{display:flex;flex-wrap:wrap;gap:8px}' +
    '.wvf-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;font:inherit;font-size:13.5px;font-weight:700;border:1px solid var(--border);background:var(--surface-2);color:var(--text)!important;cursor:pointer;transition:background .15s,transform .15s var(--ease),border-color .15s,filter .15s}' +
    '.wvf-btn:hover{background:var(--surface-hover);border-color:var(--hair-strong);transform:translateY(-1px)}' +
    '.wvf-btn.dc{background:#5865f2;border-color:#5865f2;color:#fff!important}' +
    '.wvf-btn.dc:hover{background:#4f5ae0;filter:none}' +
    '.wvf-news{display:flex;align-items:center;gap:10px;max-width:340px;padding:10px 12px 10px 10px;border-radius:14px;border:1px solid var(--hair);background:color-mix(in srgb,var(--surface-2) 70%,transparent);transition:border-color .15s,background .15s,transform .15s var(--ease)}' +
    '.wvf-news:hover{border-color:var(--hair-strong);background:var(--surface-2);transform:translateY(-1px)}' +
    '.wvf-news .ic{flex-shrink:0;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--brand-bg);color:var(--brand)}' +
    '.wvf-news .tx{min-width:0;flex:1}' +
    '.wvf-news small{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand)}' +
    '.wvf-news span{display:block;font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.wvf-news .go{color:var(--text-3);flex-shrink:0}' +
    '.wvf-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}' +
    '.wvf-col h2{margin:4px 0 14px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)}' +
    '.wvf-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}' +
    '.wvf-col a{display:inline-flex;align-items:center;gap:6px;min-height:32px;font-size:14px;font-weight:500;color:var(--text-2);transition:color .12s;border-radius:6px}' +
    '.wvf-col a:hover{color:var(--text)}' +
    '.wvf-col a .x{opacity:.55}' +
    '.wvf-dot{width:7px;height:7px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 22%,transparent)}' +
    '.wvf-bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:44px;padding-top:20px;border-top:1px solid var(--hair)}' +
    '.wvf-meta{display:flex;align-items:center;gap:10px 18px;flex-wrap:wrap;min-width:0}' +
    '.wvf-copy{font-size:13px;color:var(--text-3)}' +
    '.wvf-copy b{color:var(--text-2);font-weight:700}' +
    '.wvf-stats{display:flex;gap:8px;flex-wrap:wrap}' +
    '.wvf-pill{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--hair);background:color-mix(in srgb,var(--surface-2) 60%,transparent);font-size:12.5px;font-weight:600;color:var(--text-2);white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.wvf-pill b{color:var(--text);font-weight:800}' +
    'a.wvf-pill:hover{border-color:var(--hair-strong);color:var(--text)}' +
    '.wvf-pill .d{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 22%,transparent)}' +
    '.wvf-tools{display:flex;gap:6px;align-items:center}' +
    '.wvf-tool{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:40px;height:40px;padding:0 12px;border-radius:999px;border:1px solid var(--hair);background:transparent;color:var(--text-2);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .15s,color .15s,border-color .15s}' +
    '.wvf-tool:hover{background:var(--surface-2);color:var(--text);border-color:var(--hair-strong)}' +
    '.wvf-kbd{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:5px;border:1px solid var(--hair-strong);background:var(--surface-2);font-size:11px;font-weight:700;color:var(--text-2);font-family:inherit}' +
    '.wvf-mark{margin:34px 0 -0.2em;font-size:clamp(64px,15.5vw,210px);font-weight:900;letter-spacing:-.065em;line-height:.8;text-align:center;user-select:none;pointer-events:none;white-space:nowrap;' +
      'background:linear-gradient(180deg,color-mix(in srgb,var(--text) 10%,transparent) 0%,color-mix(in srgb,var(--text) 3%,transparent) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '#wv-footer a:focus-visible,#wv-footer button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}' +
    '@media (max-width:1100px){.wvf-top{grid-template-columns:1fr;gap:36px}.wvf-mission{max-width:520px}.wvf-news{max-width:420px}}' +
    '@media (max-width:768px){' +
      '#wv-footer{margin-top:40px;padding:36px 16px 20px}' +
      '.wvf-cols{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 16px}' +
      '.wvf-col a{min-height:40px;font-size:15px}' +
      '.wvf-bottom{flex-direction:column;align-items:flex-start;gap:14px;margin-top:32px}' +
      '.wvf-tools{width:100%}' +
      '.wvf-kbd,.wvf-hide-sm{display:none}' +
      '.wvf-news{max-width:none}' +
      '.wvf-mark{margin-top:26px}' +
    '}' +
    '@media (hover:none){.wvf-kbd{display:none}}' +
    '@media (prefers-reduced-motion:reduce){#wv-footer *{transition:none!important}}';

  function styleOnce() {
    if (document.getElementById('wv-footer-css')) return;
    var s = document.createElement('style');
    s.id = 'wv-footer-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function colHTML(c) {
    return '<nav class="wvf-col" aria-label="' + esc(c[0]) + '"><h2>' + esc(c[0]) + '</h2><ul>' + c[1].map(function (l) {
      var ext = l[2] === 'ext';
      return '<li><a href="' + esc(l[1]) + '"' + (ext ? ' target="_blank" rel="noopener external"' : '') + (l[2] === 'new' ? ' data-wvf-new' : '') + '>' +
        esc(l[0]) + (ext ? '<span class="x">' + ICON.ext + '</span>' : '') + (l[2] === 'new' ? '<span class="wvf-dot" hidden aria-label="new updates"></span>' : '') + '</a></li>';
    }).join('') + '</ul></nav>';
  }

  function html() {
    var mac = isMac();
    return '<div class="wvf-in">' +
      '<div class="wvf-top">' +
        '<div class="wvf-brand">' +
          '<a class="wvf-logo" href="/" aria-label="wavernrs home"><img src="/logo.png" alt="" width="40" height="40" loading="lazy" decoding="async"><b>wavernrs</b></a>' +
          '<p class="wvf-mission">the home of Ye comps and edits. upload yours, dig through the archive, and listen together with everyone else.</p>' +
          '<div class="wvf-ctas">' +
            '<a class="wvf-btn dc" href="' + DISCORD + '" target="_blank" rel="noopener external">' + ICON.discord + 'Join the discord</a>' +
            '<a class="wvf-btn" href="/upload">Upload</a>' +
          '</div>' +
          '<a class="wvf-news" id="wvf-news" href="/whatsnew" hidden><span class="ic">' + ICON.spark + '</span><span class="tx"><small>What\u2019s new</small><span id="wvf-news-t"></span></span><span class="go">' + ICON.arrow + '</span></a>' +
        '</div>' +
        '<div class="wvf-cols">' + COLS.map(colHTML).join('') + '</div>' +
      '</div>' +
      '<div class="wvf-bottom">' +
        '<div class="wvf-meta"><div class="wvf-copy">\u00a9 ' + new Date().getFullYear() + ' <b>wavernrs</b> \u00b7 made by yeditors for yeditors</div>' +
        '<div class="wvf-stats" id="wvf-stats" aria-live="polite"></div></div>' +
        '<div class="wvf-tools">' +
          '<button type="button" class="wvf-tool" data-wvf="search" aria-label="Search everything">' + ICON.search + '<span class="wvf-hide-sm">Search</span><kbd class="wvf-kbd">' + (mac ? '\u2318' : 'Ctrl ') + 'K</kbd></button>' +
          '<button type="button" class="wvf-tool" data-wvf="theme" aria-label="Choose a theme">' + ICON.theme + '<span>Theme</span></button>' +
          '<button type="button" class="wvf-tool" data-wvf="top" aria-label="Back to top">' + ICON.up + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="wvf-mark" aria-hidden="true">wavernrs</div>' +
    '</div>';
  }

  var el = null, statsLoaded = false, newsLoaded = false, io = null;

  function hiddenFor(loc) {
    var p = (loc.pathname || '/').replace(/\/+$/, '') || '/';
    if (HIDE_PATHS.test(p)) return true;
    if (/^\/lp(\.html)?$/.test(p) && /[?&](id|room)=/.test(loc.search || '')) return true;
    return false;
  }

  function place() {
    var content = document.getElementById('wv-content');
    var view = document.getElementById('view');
    if (!content || !view) return false;
    if (!el) {
      el = document.createElement('footer');
      el.id = 'wv-footer';
      el.setAttribute('role', 'contentinfo');
      el.innerHTML = html();
      el.addEventListener('click', onClick);
    }
    if (view.parentNode !== content) {
      if (el.parentNode !== content || content.lastElementChild !== el) content.appendChild(el);
    } else if (view.nextElementSibling !== el) {
      view.parentNode.insertBefore(el, view.nextSibling);
    }
    return true;
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-wvf]') : null;
    if (!b) return;
    var act = b.getAttribute('data-wvf');
    if (act === 'theme') {
      if (typeof window.wvOpenThemePicker === 'function') window.wvOpenThemePicker();
      else if (typeof navigate === 'function') navigate('/settings');
    } else if (act === 'search') {
      if (typeof window.wvOpenPalette === 'function') window.wvOpenPalette();
      else if (typeof navigate === 'function') navigate('/search'); else location.href = '/search';
    } else if (act === 'top') {
      var c = document.getElementById('wv-content');
      var rm = false;
      try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
      if (c) { try { c.scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' }); } catch (_) { c.scrollTop = 0; } }
      try { window.scrollTo(0, 0); } catch (_) {}
      var skip = document.querySelector('#view h1, #view [tabindex="-1"]');
      if (skip && skip.focus) { try { skip.focus({ preventScroll: true }); } catch (_) {} }
    }
  }

  function renderStats(t) {
    var box = el && el.querySelector('#wvf-stats');
    if (!box || !t) return;
    var pills = [];
    if (+t.archive_comps) pills.push('<a class="wvf-pill" href="/archive"><span class="d" aria-hidden="true"></span><b>' + esc(fmt(t.archive_comps)) + '</b> archived comps</a>');
    if (+t.plays) pills.push('<a class="wvf-pill" href="/charts"><b>' + esc(fmt(t.plays)) + '</b> plays</a>');
    if (+t.comps || +t.edits) pills.push('<a class="wvf-pill" href="/browse"><b>' + esc(fmt((+t.comps || 0) + (+t.edits || 0))) + '</b> uploads</a>');
    box.innerHTML = pills.join('');
  }

  function loadStats() {
    if (statsLoaded) return;
    statsLoaded = true;
    var cached = null;
    try { cached = JSON.parse(ssGet(STATS_KEY) || 'null'); } catch (_) {}
    if (cached && cached.t && Date.now() - cached.at < STATS_TTL) { renderStats(cached.t); return; }
    if (cached && cached.t) renderStats(cached.t);
    if (typeof fetch !== 'function') return;
    fetch(apiBase() + '/stats', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.totals) return;
      ssSet(STATS_KEY, JSON.stringify({ at: Date.now(), t: d.totals }));
      renderStats(d.totals);
    }).catch(function () {});
  }

  function paintNews(entries) {
    if (!el || !entries || !entries.length) return;
    var latest = entries[0];
    var seen = lsGet(SEEN_KEY) || '';
    var unseen = !!(latest.date && latest.date > seen);
    var box = el.querySelector('#wvf-news');
    var t = el.querySelector('#wvf-news-t');
    if (box && t && latest.title) { t.textContent = latest.title; box.hidden = false; }
    var dot = el.querySelector('[data-wvf-new] .wvf-dot');
    if (dot) dot.hidden = !unseen;
  }

  function loadNews() {
    if (newsLoaded) return;
    newsLoaded = true;
    window.wvFooter.news().then(paintNews).catch(function () {});
  }

  var newsPromise = null;
  function news() {
    if (!newsPromise) {
      newsPromise = fetch('/whatsnew.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var list = (d && Array.isArray(d.entries)) ? d.entries.filter(function (e) { return e && e.title && e.date; }) : [];
        list.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
        return list;
      }).catch(function () { newsPromise = null; return []; });
    }
    return newsPromise;
  }

  function lazyLoad() {
    if (statsLoaded && newsLoaded) return;
    if (!('IntersectionObserver' in window)) { loadStats(); loadNews(); return; }
    if (io) return;
    io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) {
        loadStats(); loadNews();
        io.disconnect(); io = null;
      }
    }, { root: document.getElementById('wv-content') || null, rootMargin: '0px 0px 400px 0px' });
    io.observe(el);
  }

  function update() {
    if (!place()) return;
    var hide = hiddenFor(location);
    if (el.hidden !== hide) el.hidden = hide;
    if (!hide) lazyLoad();
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; try { update(); } catch (_) {} }, 0);
  }

  function markSeen(date) {
    if (date) {
      var cur = lsGet(SEEN_KEY) || '';
      if (date > cur) lsSet(SEEN_KEY, date);
    }
    var dot = el && el.querySelector('[data-wvf-new] .wvf-dot');
    if (dot) dot.hidden = true;
  }

  function init() {
    styleOnce();
    update();
    window.addEventListener('popstate', schedule);
    window.addEventListener('wv-navigate', schedule);
    try {
      var push = history.pushState;
      history.pushState = function () {
        var r = push.apply(history, arguments);
        schedule();
        return r;
      };
      var rep = history.replaceState;
      history.replaceState = function () {
        var r = rep.apply(history, arguments);
        schedule();
        return r;
      };
    } catch (_) {}
    if (!el) {
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (place() || tries > 40) { clearInterval(iv); update(); }
      }, 250);
    }
  }

  window.wvFooter = function () { schedule(); return el; };
  window.wvFooter.refresh = schedule;
  window.wvFooter.news = news;
  window.wvFooter.markSeen = markSeen;
  window.wvFooter.SEEN_KEY = SEEN_KEY;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
