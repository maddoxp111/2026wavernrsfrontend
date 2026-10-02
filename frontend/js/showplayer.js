// Live show player: one persistent YouTube iframe or <video> attached to
// document.body, so a show keeps playing while the SPA router swaps pages.
// The play bar (player.js) routes play/pause, seek and prev/next here while a
// show is active. A floating panel shows the picture; the Tours modal can
// "dock" the same element over its own video slot without reloading it.
(function () {
  'use strict';
  if (window.wvShow) return;

  var YT_RE = /^[A-Za-z0-9_-]{6,20}$/;
  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  var S = {
    cfg: null, kind: null, el: null, media: null, frame: null, video: null,
    playing: false, want: false, t: 0, tAt: 0, dur: 0, ready: false, listenTimer: 0, tick: 0,
    collapsed: false, dock: null, dockRaf: 0, songIdx: -2, ended: false, ytId: null, seq: 0
  };
  try { S.collapsed = localStorage.getItem('wv_show_collapsed') === '1'; } catch (_) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toSec(t) {
    if (typeof t === 'number') return t;
    var p = String(t || '').split(':').map(Number);
    if (p.some(isNaN)) return 0;
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : (p[0] || 0);
  }
  function ft(s) {
    s = Math.max(0, Math.floor(+s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }
  function $(id) { return document.getElementById(id); }
  function emit() { try { document.dispatchEvent(new CustomEvent('wv-show-change', { detail: api.state() })); } catch (_) {} }

  var IC = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    live: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg>'
  };

  function injectCss() {
    if ($('wvs-style')) return;
    var st = document.createElement('style');
    st.id = 'wvs-style';
    st.textContent = [
      '#wv-show{position:fixed;right:16px;bottom:96px;z-index:140;width:340px;max-width:calc(100vw - 24px);border-radius:14px;overflow:hidden;background:var(--elevated,var(--surface-2));color:var(--text);border:1px solid var(--border);box-shadow:0 18px 48px rgba(0,0,0,.45);display:flex;flex-direction:column;transition:opacity .18s ease,transform .18s ease}',
      '#wv-show[hidden]{display:none}',
      '#wv-show.wvs-enter{opacity:0;transform:translateY(10px)}',
      '#wv-show .wvs-media{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden}',
      '#wv-show .wvs-media iframe,#wv-show .wvs-media video{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;object-fit:contain}',
      '#wv-show.wvs-collapsed .wvs-media{height:0;aspect-ratio:auto;min-height:0}',
      '#wv-show .wvs-head{display:flex;align-items:center;gap:8px;padding:8px 6px 8px 10px;min-height:56px}',
      '#wv-show .wvs-cov{width:40px;height:40px;border-radius:8px;flex-shrink:0;background:var(--surface-2) center/cover no-repeat;display:none}',
      '#wv-show.wvs-collapsed .wvs-cov{display:block}',
      '#wv-show .wvs-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;cursor:pointer}',
      '#wv-show .wvs-k{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--brand)}',
      '#wv-show .wvs-k svg{width:8px;height:8px}',
      '#wv-show.wvs-on .wvs-k svg{animation:wvs-pulse 1.6s ease-in-out infinite}',
      '@keyframes wvs-pulse{50%{opacity:.25}}',
      '#wv-show .wvs-song{font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#wv-show .wvs-name{font-size:11.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#wv-show .wvs-b{width:40px;height:40px;flex-shrink:0;border:0;border-radius:50%;background:transparent;color:var(--text-2);display:grid;place-items:center;cursor:pointer;padding:0}',
      '#wv-show .wvs-b:hover{background:var(--surface-2);color:var(--text)}',
      '#wv-show .wvs-b:focus-visible{outline:2px solid var(--brand);outline-offset:-2px}',
      '#wv-show .wvs-b svg{width:18px;height:18px}',
      '#wv-show .wvs-pp{color:var(--text)}',
      '#wv-show .wvs-bar{height:3px;background:var(--surface-3,rgba(127,127,127,.2))}',
      '#wv-show .wvs-bar i{display:block;height:100%;width:0;background:var(--brand)}',
      '#wv-show.wvs-docked{border-radius:12px;border:0;box-shadow:none;transition:none;z-index:9600}',
      '#wv-show.wvs-docked .wvs-head,#wv-show.wvs-docked .wvs-bar{display:none}',
      '#wv-show.wvs-docked .wvs-media{height:100%;aspect-ratio:auto}',
      '#wv-show.wvs-docked.wvs-collapsed .wvs-media{height:100%}',
      '.wv-show-on #player-like-btn,.wv-show-on #pfs-like-btn,.wv-show-on #player-shuffle-btn,.wv-show-on #player-repeat-btn{opacity:.35;pointer-events:none}',
      '@media (max-width:768px){#wv-show{width:min(250px,calc(100vw - 24px));right:12px;border-radius:12px}#wv-show .wvs-head{min-height:48px;gap:2px;padding:4px 2px 4px 8px}#wv-show .wvs-pp{display:none}#wv-show .wvs-song{font-size:13px}#wv-show .wvs-cov{width:34px;height:34px;margin-right:6px}}',
      '@media (prefers-reduced-motion:reduce){#wv-show{transition:none}#wv-show.wvs-on .wvs-k svg{animation:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function build() {
    if (S.el && document.body.contains(S.el)) return S.el;
    injectCss();
    var el = document.createElement('div');
    el.id = 'wv-show';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Live show player');
    el.hidden = true;
    el.innerHTML =
      '<div class="wvs-media"></div>' +
      '<div class="wvs-bar" aria-hidden="true"><i></i></div>' +
      '<div class="wvs-head">' +
        '<div class="wvs-cov" aria-hidden="true"></div>' +
        '<div class="wvs-meta" title="Open this show"><span class="wvs-k">' + IC.live + '<span>live</span></span><b class="wvs-song"></b><span class="wvs-name"></span></div>' +
        '<button type="button" class="wvs-b wvs-pp" aria-label="Play">' + IC.play + '</button>' +
        '<button type="button" class="wvs-b wvs-col" aria-label="Hide video">' + IC.down + '</button>' +
        '<button type="button" class="wvs-b wvs-open" aria-label="Open show" title="Open show">' + IC.open + '</button>' +
        '<button type="button" class="wvs-b wvs-x" aria-label="Close show" title="Close">' + IC.x + '</button>' +
      '</div>';
    document.body.appendChild(el);
    S.el = el;
    S.media = el.querySelector('.wvs-media');
    el.querySelector('.wvs-pp').onclick = function () { api.toggle(); };
    el.querySelector('.wvs-col').onclick = function () { setCollapsed(!S.collapsed); };
    el.querySelector('.wvs-open').onclick = function () { api.openShow(); };
    el.querySelector('.wvs-meta').onclick = function () { api.openShow(); };
    el.querySelector('.wvs-x').onclick = function () { api.stop(); };
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !S.dock) { e.stopPropagation(); setCollapsed(true); } });
    return el;
  }

  function setCollapsed(on) {
    S.collapsed = !!on;
    try { localStorage.setItem('wv_show_collapsed', S.collapsed ? '1' : '0'); } catch (_) {}
    if (!S.el) return;
    S.el.classList.toggle('wvs-collapsed', S.collapsed);
    var b = S.el.querySelector('.wvs-col');
    if (b) { b.innerHTML = S.collapsed ? IC.up : IC.down; b.setAttribute('aria-label', S.collapsed ? 'Show video' : 'Hide video'); b.title = S.collapsed ? 'Show video' : 'Hide video (keeps playing)'; }
    place();
  }

  // Sit just above the play bar, whatever height the theme or phone gives it.
  function place() {
    var el = S.el;
    if (!el || S.dock) return;
    var bottom = 16;
    var bar = $('player');
    var slot = $('wv-player-slot');
    var r = null;
    if (bar && !bar.classList.contains('hidden')) r = (slot || bar).getBoundingClientRect();
    if (r && r.height) bottom = Math.max(16, window.innerHeight - r.top + 12);
    else {
      var tabs = document.querySelector('.wv-mobile-tabs');
      var tr = tabs && tabs.getBoundingClientRect();
      if (tr && tr.height && getComputedStyle(tabs).display !== 'none') bottom = window.innerHeight - tr.top + 12;
    }
    el.style.bottom = bottom + 'px';
    el.style.left = ''; el.style.top = ''; el.style.width = ''; el.style.height = ''; el.style.clipPath = ''; el.style.right = '';
  }

  // ── YouTube transport ───────────────────────────────────────────────────
  function ytPost(func, args) {
    var f = S.frame;
    if (!f || !f.contentWindow) return;
    try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args || [], id: 1, channel: 'widget' }), '*'); } catch (_) {}
  }
  function ytListen() {
    clearInterval(S.listenTimer);
    var n = 0;
    var send = function () {
      if (!S.frame || !S.frame.contentWindow) return;
      try { S.frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (_) {}
    };
    send();
    S.listenTimer = setInterval(function () {
      if (S.ready || ++n > 60 || !S.frame) { clearInterval(S.listenTimer); return; }
      send();
    }, 250);
  }
  function onMessage(e) {
    if (!S.frame || e.source !== S.frame.contentWindow) return;
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    var d;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (_) { return; }
    if (!d || !d.event) return;
    if (d.event === 'onReady' || d.event === 'initialDelivery') {
      if (!S.ready) {
        S.ready = true;
        ytPost('addEventListener', ['onStateChange']);
        if (S.pendingSeek != null) { ytPost('seekTo', [S.pendingSeek, true]); S.pendingSeek = null; }
        if (S.want) ytPost('playVideo');
      }
    }
    var info = d.info;
    if (d.event === 'onStateChange' && typeof info === 'number') ytState(info);
    if ((d.event === 'infoDelivery' || d.event === 'initialDelivery') && info && typeof info === 'object') {
      if (typeof info.duration === 'number' && info.duration > 0) S.dur = info.duration;
      if (typeof info.currentTime === 'number') { S.t = info.currentTime; S.tAt = Date.now(); }
      if (typeof info.playerState === 'number') ytState(info.playerState);
      update();
    }
  }
  function ytState(ps) {
    if (ps === 1) setPlaying(true);
    else if (ps === 2 || ps === 0 || ps === 5) setPlaying(false);
    if (ps === 0) finish();
  }

  // ── State ───────────────────────────────────────────────────────────────
  function now() {
    if (S.kind === 'mp4' && S.video) return S.video.currentTime || 0;
    if (S.playing && S.tAt) return S.t + (Date.now() - S.tAt) / 1000;
    return S.t;
  }
  function duration() {
    if (S.kind === 'mp4' && S.video) return isFinite(S.video.duration) ? S.video.duration : 0;
    return S.dur || 0;
  }
  function range() {
    var c = S.cfg || {};
    var d = duration();
    if (c.end != null) { var a = +c.start || 0; return { a: a, b: Math.max(a + 1, +c.end) }; }
    return { a: 0, b: d };
  }
  function songs() {
    var c = S.cfg;
    if (!c || !Array.isArray(c.setlist)) return [];
    if (!c._songs) {
      var off = +c.offset || 0;
      c._songs = c.setlist.filter(function (s) { return s && s.song && s.time; })
        .map(function (s) { return { song: String(s.song), by: s.by || null, at: Math.max(0, toSec(s.time) + off) }; })
        .sort(function (a, b) { return a.at - b.at; });
    }
    return c._songs;
  }
  function songIndexAt(t) {
    var l = songs(), i = -1;
    for (var k = 0; k < l.length; k++) { if (l[k].at <= t + 0.5) i = k; else break; }
    return i;
  }
  function titleNow() {
    var c = S.cfg;
    if (!c) return '';
    if (c.title) return c.title;
    var i = songIndexAt(now());
    return i >= 0 ? songs()[i].song : (c.show && c.show.name) || 'Live show';
  }
  function showName() { var c = S.cfg; return (c && c.show && c.show.name) || 'Live show'; }

  function setPlaying(on) {
    on = !!on;
    if (S.kind !== 'mp4' && on) S.tAt = Date.now();
    if (S.kind !== 'mp4' && !on && S.tAt) { S.t = now(); S.tAt = 0; }
    if (S.playing === on) return;
    S.playing = on;
    if (on) { S.ended = false; if (typeof pausePlayer === 'function') { try { pausePlayer(); } catch (_) {} } }
    paintButtons();
    try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused'; } catch (_) {}
    emit();
  }

  function finish() {
    if (S.ended) return;
    S.ended = true;
    var c = S.cfg;
    if (c && typeof c.onEnd === 'function') {
      var fn = c.onEnd;
      setTimeout(function () { try { fn(); } catch (_) {} }, 0);
    }
    emit();
  }

  function paintButtons() {
    if (S.el) {
      var pp = S.el.querySelector('.wvs-pp');
      if (pp) { pp.innerHTML = S.playing ? IC.pause : IC.play; pp.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); }
      S.el.classList.toggle('wvs-on', S.playing);
    }
    if (typeof window._wvSetPlayBtns === 'function') { try { window._wvSetPlayBtns(S.playing); } catch (_) {} }
  }

  function renderBar(force) {
    if (!S.cfg) return;
    var idx = S.cfg.title ? -1 : songIndexAt(now());
    if (!force && idx === S.songIdx) return;
    S.songIdx = idx;
    var title = titleNow();
    var sub = 'Ye · ' + showName() + ' · live';
    var cover = S.cfg.cover || null;
    var bar = $('player');
    if (bar) { bar.classList.remove('hidden'); bar.classList.add('wv-show-on'); }
    if (typeof window.renderPlayerTrack === 'function') {
      try { window.renderPlayerTrack({ id: null, title: title, artist_name: sub, cover_url: cover, _album_title: showName() }); } catch (_) {}
    }
    var ctx = $('pfs-context'); if (ctx) ctx.textContent = 'Live · ' + showName();
    if (S.el) {
      S.el.querySelector('.wvs-song').textContent = title;
      S.el.querySelector('.wvs-name').textContent = showName() + (S.cfg.show && S.cfg.show.year ? ' · ' + S.cfg.show.year : '');
      S.el.querySelector('.wvs-cov').style.backgroundImage = cover ? 'url("' + String(cover).replace(/["\\]/g, '') + '")' : '';
    }
    mediaMeta(title, sub, cover);
    place();
  }

  function mediaMeta(title, sub, cover) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: sub, album: showName(), artwork: cover ? [{ src: cover, sizes: '512x512' }] : [] });
      var h = function (n, fn) { try { navigator.mediaSession.setActionHandler(n, fn); } catch (_) {} };
      h('play', function () { if (S.cfg) api.resume(); else if (typeof togglePlay === 'function') togglePlay(); });
      h('pause', function () { if (S.cfg) api.pause(); else if (typeof pausePlayer === 'function') pausePlayer(); });
      h('previoustrack', function () { if (typeof skipPrev === 'function') skipPrev(); });
      h('nexttrack', function () { if (typeof skipNext === 'function') skipNext(); });
      h('seekbackward', function (e) { if (S.cfg) api.seekBy(-((e && e.seekOffset) || 10)); else if (typeof audio !== 'undefined' && audio) audio.currentTime -= (e && e.seekOffset) || 10; });
      h('seekforward', function (e) { if (S.cfg) api.seekBy((e && e.seekOffset) || 10); else if (typeof audio !== 'undefined' && audio) audio.currentTime += (e && e.seekOffset) || 10; });
      h('seekto', function (e) { if (!e || e.seekTime == null) return; if (S.cfg) api.seek(e.seekTime); else if (typeof audio !== 'undefined' && audio && audio.duration) audio.currentTime = e.seekTime; });
    } catch (_) {}
  }

  function update() {
    if (!S.cfg) return;
    var t = now();
    var r = range();
    if (S.cfg.end != null && !S.ended && t >= r.b - 0.25 && (S.playing || S.kind === 'mp4')) {
      api.pause();
      finish();
    }
    var span = Math.max(0, r.b - r.a);
    var rel = Math.max(0, Math.min(span || 0, t - r.a));
    var pct = span ? (rel / span * 100) + '%' : '0%';
    ['progress-fill', 'pfs-fill', 'player-mini-fill'].forEach(function (id) { var el = $(id); if (el) el.style.width = pct; });
    ['progress-bar', 'pfs-progress-bar'].forEach(function (id) { var el = $(id); if (el) { el.style.setProperty('--pct', pct); el.setAttribute('aria-valuenow', String(Math.round(span ? rel / span * 100 : 0))); } });
    document.querySelectorAll('.progress-bar .np-buf').forEach(function (b) { b.style.width = '0%'; });
    var e1 = $('time-elapsed'), e2 = $('pfs-elapsed'), t1 = $('time-total'), t2 = $('pfs-total');
    if (e1) e1.textContent = ft(rel); if (e2) e2.textContent = ft(rel);
    if (t1) t1.textContent = span ? ft(span) : '--:--'; if (t2) t2.textContent = span ? ft(span) : '--:--';
    if (S.el) { var i = S.el.querySelector('.wvs-bar i'); if (i) i.style.width = pct; }
    if ('mediaSession' in navigator && span) {
      try { navigator.mediaSession.setPositionState({ duration: span, playbackRate: 1, position: Math.min(span, rel) }); } catch (_) {}
    }
    renderBar(false);
  }

  function startTick() {
    if (S.tick) return;
    S.tick = setInterval(function () { if (!S.cfg) { clearInterval(S.tick); S.tick = 0; return; } update(); }, 500);
  }

  function clearMedia() {
    clearInterval(S.listenTimer);
    if (S.video) { try { S.video.pause(); S.video.removeAttribute('src'); S.video.load(); } catch (_) {} }
    if (S.media) S.media.innerHTML = '';
    S.frame = null; S.video = null; S.ready = false; S.ytId = null; S.kind = null; S.pendingSeek = null;
  }

  function mountYouTube(id, start) {
    clearMedia();
    S.kind = 'yt'; S.ytId = id; S.t = start || 0; S.tAt = 0; S.dur = 0;
    var f = document.createElement('iframe');
    var origin = encodeURIComponent(location.origin);
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?enablejsapi=1&rel=0&playsinline=1&modestbranding=1' + (S.want ? '&autoplay=1' : '') + '&start=' + Math.floor(start || 0) + '&origin=' + origin;
    f.title = showName();
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.addEventListener('load', ytListen);
    S.media.appendChild(f);
    S.frame = f;
    if (start && start % 1) S.pendingSeek = start;
  }

  function mountVideo(src, start) {
    clearMedia();
    S.kind = 'mp4';
    var v = document.createElement('video');
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.controls = !!S.dock;
    if (S.cfg && S.cfg.cover) v.poster = S.cfg.cover;
    v.src = src;
    var seekTo = start || 0;
    var go = function () { if (seekTo) { try { v.currentTime = seekTo; } catch (_) {} } if (S.want) { var p = v.play(); if (p && p.catch) p.catch(function () { setPlaying(false); }); } };
    if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    v.addEventListener('play', function () { setPlaying(true); });
    v.addEventListener('playing', function () { setPlaying(true); });
    v.addEventListener('pause', function () { setPlaying(false); });
    v.addEventListener('ended', function () { setPlaying(false); finish(); });
    v.addEventListener('timeupdate', update);
    v.addEventListener('error', function () { setPlaying(false); if (typeof wvToast === 'function') wvToast('that show wont load right now', 'error'); });
    S.media.appendChild(v);
    S.video = v;
  }

  // ── Docking into a page slot (the Tours modal) ─────────────────────────
  function dockLoop() {
    S.dockRaf = 0;
    var slot = S.dock;
    var el = S.el;
    if (!slot || !el) return;
    if (!document.body.contains(slot)) { api.undock(); return; }
    var r = slot.getBoundingClientRect();
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
    var vt = 0, vb = window.innerHeight;
    var box = slot.closest('.yz-box');
    if (box && getComputedStyle(box).overflowY !== 'visible') { var br = box.getBoundingClientRect(); vt = Math.max(vt, br.top); vb = Math.min(vb, br.bottom); }
    var top = Math.max(0, vt - r.top), bot = Math.max(0, r.bottom - vb);
    var W = r.width, B = r.height - bot;
    var clip = (top || bot) ? 'inset(' + top + 'px 0 ' + bot + 'px 0)' : '';
    // Keep the modal's close button visible: cut a notch around it.
    var modal = slot.closest('.yz-modal');
    var x = modal && modal.querySelector('.yz-x');
    if (x) {
      var xr = x.getBoundingClientRect();
      var nx = xr.left - r.left - 6, ny = xr.bottom - r.top + 6;
      if (xr.width && xr.right > r.left && xr.left < r.right && xr.bottom > r.top + top && xr.top < r.top + B && ny > top) {
        nx = Math.max(0, nx); ny = Math.min(B, ny);
        clip = 'polygon(0 ' + top + 'px,' + nx + 'px ' + top + 'px,' + nx + 'px ' + ny + 'px,' + W + 'px ' + ny + 'px,' + W + 'px ' + B + 'px,0 ' + B + 'px)';
      }
    }
    el.style.clipPath = clip;
    el.style.visibility = (top + bot >= r.height) ? 'hidden' : '';
    S.dockRaf = requestAnimationFrame(dockLoop);
  }

  var api = {
    play: function (o) {
      o = o || {};
      var show = o.show || {};
      var yt = o.youtube && YT_RE.test(String(o.youtube)) ? String(o.youtube) : null;
      var vid = !yt && typeof o.video === 'string' && /^https:\/\//i.test(o.video) ? o.video : null;
      if (!yt && !vid) return false;
      build();
      var start = Math.max(0, +o.start || 0);
      var same = S.cfg && ((yt && S.kind === 'yt' && S.ytId === yt) || (vid && S.kind === 'mp4' && S.video && S.cfg.video === vid));
      S.seq++;
      S.cfg = {
        show: { id: show.id != null ? String(show.id) : '', year: show.year != null ? String(show.year) : '', name: show.name || 'Live show' },
        youtube: yt, video: vid, offset: +o.offset || 0, cover: o.cover || null,
        setlist: Array.isArray(o.setlist) ? o.setlist : [], start: start,
        end: o.end != null && isFinite(+o.end) && +o.end > start ? +o.end : null,
        title: o.title || null, onEnd: typeof o.onEnd === 'function' ? o.onEnd : null, ctx: o.ctx || null
      };
      S.ended = false; S.songIdx = -2; S.want = o.autoplay !== false;
      if (S.want && typeof pausePlayer === 'function') { try { pausePlayer(); } catch (_) {} }
      if (same) {
        api.seek(start);
        if (S.want) api.resume();
      } else if (yt) mountYouTube(yt, start);
      else mountVideo(vid, start);
      var el = S.el;
      var wasHidden = el.hidden;
      el.hidden = false;
      el.classList.toggle('wvs-collapsed', S.collapsed);
      setCollapsed(S.collapsed);
      if (wasHidden && !RM && !S.dock) { el.classList.add('wvs-enter'); requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('wvs-enter'); }); }); }
      renderBar(true);
      paintButtons();
      update();
      startTick();
      emit();
      return true;
    },
    resume: function () {
      if (!S.cfg) return;
      S.want = true;
      if (S.ended && S.cfg.end != null) { api.seek(S.cfg.start); S.ended = false; }
      if (typeof pausePlayer === 'function') { try { pausePlayer(); } catch (_) {} }
      if (S.kind === 'mp4' && S.video) { var p = S.video.play(); if (p && p.catch) p.catch(function () {}); }
      else ytPost('playVideo');
    },
    pause: function () {
      if (!S.cfg) return;
      S.want = false;
      if (S.kind === 'mp4' && S.video) { try { S.video.pause(); } catch (_) {} }
      else { ytPost('pauseVideo'); setPlaying(false); }
    },
    toggle: function () { if (!S.cfg) return; if (S.playing) api.pause(); else api.resume(); },
    seek: function (sec) {
      if (!S.cfg) return;
      sec = Math.max(0, +sec || 0);
      var d = duration();
      if (d) sec = Math.min(sec, Math.max(0, d - 0.5));
      S.ended = false;
      if (S.kind === 'mp4' && S.video) {
        try { if (S.video.readyState >= 1) S.video.currentTime = sec; else S.video.addEventListener('loadedmetadata', function () { S.video.currentTime = sec; }, { once: true }); } catch (_) {}
      } else {
        S.t = sec; S.tAt = S.playing ? Date.now() : 0;
        if (S.ready) ytPost('seekTo', [sec, true]); else S.pendingSeek = sec;
      }
      S.songIdx = -2;
      update();
    },
    seekBy: function (d) { if (S.cfg) api.seek(now() + d); },
    seekRatio: function (r) { if (!S.cfg) return; var g = range(); if (!g.b) return; api.seek(g.a + Math.max(0, Math.min(1, r)) * (g.b - g.a)); },
    playSong: function (sec) { if (!S.cfg) return; api.seek(sec); api.resume(); },
    next: function () {
      if (!S.cfg) return;
      if (S.cfg.end != null || S.cfg.title) { if (S.cfg.onEnd) { S.ended = false; api.pause(); finish(); } return; }
      var l = songs(), t = now();
      for (var i = 0; i < l.length; i++) if (l[i].at > t + 1) { api.seek(l[i].at); api.resume(); return; }
      if (S.cfg.onEnd) { api.pause(); finish(); }
      else if (typeof wvToast === 'function') wvToast('thats the last song in this setlist');
    },
    prev: function () {
      if (!S.cfg) return;
      var t = now();
      if (S.cfg.end != null || S.cfg.title) { api.seek(S.cfg.start || 0); return; }
      var l = songs(), i = songIndexAt(t);
      if (i >= 0 && t - l[i].at > 3) { api.seek(l[i].at); return; }
      if (i > 0) { api.seek(l[i - 1].at); return; }
      api.seek(0);
    },
    stop: function (opts) {
      if (!S.cfg && (!S.el || S.el.hidden)) return;
      S.cfg = null; S.want = false; S.playing = false; S.ended = false;
      api.undock();
      clearMedia();
      clearInterval(S.tick); S.tick = 0;
      if (S.el) S.el.hidden = true;
      var bar = $('player');
      if (bar) bar.classList.remove('wv-show-on');
      if (!(opts && opts.silent) && typeof window._wvPlayerRestore === 'function') { try { window._wvPlayerRestore(); } catch (_) {} }
      emit();
    },
    dock: function (slot) {
      if (!S.cfg || !slot) return;
      build();
      S.dock = slot;
      S.el.classList.add('wvs-docked');
      if (S.video) S.video.controls = true;
      if (!S.dockRaf) S.dockRaf = requestAnimationFrame(dockLoop);
    },
    undock: function () {
      if (!S.dock) return;
      S.dock = null;
      if (S.dockRaf) cancelAnimationFrame(S.dockRaf);
      S.dockRaf = 0;
      if (S.el) { S.el.classList.remove('wvs-docked'); S.el.style.visibility = ''; }
      if (S.video) S.video.controls = false;
      place();
    },
    expand: function () { if (S.cfg) setCollapsed(false); },
    openShow: function () {
      var c = S.cfg;
      if (!c || !c.show || !c.show.id) return;
      var href = '/resources?view=tours' + (c.show.year ? '&year=' + encodeURIComponent(c.show.year) : '') + '&show=' + encodeURIComponent(c.show.id);
      if (typeof closeFullPlayer === 'function') { try { closeFullPlayer(); } catch (_) {} }
      if (typeof window.wvTourOpenShow === 'function' && window.wvTourOpenShow(c.show.id, c.show.year)) return;
      if (typeof navigate === 'function') navigate(href); else location.assign(href);
    },
    // The clip under the playhead: the setlist song now playing, from its
    // start to the next song's start.
    currentClip: function () {
      var c = S.cfg;
      if (!c) return null;
      if (c.title && c.end != null) return { show_id: c.show.id, year: c.show.year, show_name: c.show.name, song: c.title, start: c.start, end: c.end, youtube: c.youtube, video: c.video, cover: c.cover };
      var l = songs(), i = songIndexAt(now());
      if (i < 0) return null;
      return { show_id: c.show.id, year: c.show.year, show_name: c.show.name, song: l[i].song, by: l[i].by, start: l[i].at, end: l[i + 1] ? l[i + 1].at : null, youtube: c.youtube, video: c.video, cover: c.cover };
    },
    addCurrent: function () {
      var clip = api.currentClip();
      if (!clip) { if (typeof wvToast === 'function') wvToast('skip to a song in the setlist to save it'); return; }
      if (typeof window.openAddToPlaylist === 'function') window.openAddToPlaylist({ clip: clip, title: clip.song + ' · live', cover_url: clip.cover });
    },
    active: function () { return !!S.cfg; },
    state: function () {
      var c = S.cfg;
      if (!c) return { active: false, playing: false };
      var g = range();
      return {
        active: true, playing: S.playing, kind: S.kind, time: now(), duration: duration(), start: c.start, end: c.end,
        rangeStart: g.a, rangeEnd: g.b, show: { id: c.show.id, year: c.show.year, name: c.show.name },
        youtube: c.youtube, video: c.video, song: titleNow(), songIndex: songIndexAt(now()), ctx: c.ctx, ended: S.ended,
        collapsed: S.collapsed, docked: !!S.dock
      };
    }
  };

  window.addEventListener('message', onMessage);
  window.addEventListener('resize', function () { if (S.cfg && !S.dock) place(); });
  window.wvShow = api;
})();
