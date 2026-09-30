// Now Playing extras for the full-screen player: volume, an "up next" card,
// cover motion, a richer progress bar, touch gestures and more keyboard
// control. It only adds to the DOM player.js builds and calls its globals, so
// the player keeps working on its own if this file never loads.
(function () {
  if (window.wvNowPlaying) return;

  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  function A() { try { return typeof audio !== 'undefined' ? audio : null; } catch (_) { return null; } }
  function isLive() { try { return typeof _radio !== 'undefined' && !!_radio; } catch (_) { return false; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ft(s) {
    if (typeof fmtTime === 'function') return fmtTime(s);
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function img(url, px) { try { return typeof wvImg === 'function' ? wvImg(url, px) : url; } catch (_) { return url; } }
  function fsOpen() { var f = document.getElementById('player-fullscreen'); return !!(f && f.classList.contains('open')); }
  function $(id) { return document.getElementById(id); }

  var CSS = [
    // Volume on the desktop full player, and a filled track on both sliders.
    '#player-fullscreen .pfs-volume{align-items:center;gap:10px;color:var(--text-2)}',
    '#player-fullscreen .np-vol-btn{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:var(--text-2);display:grid;place-items:center;cursor:pointer;flex-shrink:0}',
    '#player-fullscreen .np-vol-btn:hover{color:var(--text);background:rgba(127,127,127,.14)}',
    '#player-fullscreen .np-vol-btn svg{width:20px;height:20px}',
    '.np-range{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:4px!important;padding:0!important;margin:0;border:0!important;border-radius:2px;cursor:pointer;outline:none;background:linear-gradient(to right,var(--np-vol-fill,var(--text)) 0,var(--np-vol-fill,var(--text)) var(--vol,100%),var(--hair-strong) var(--vol,100%),var(--hair-strong) 100%)!important;box-shadow:none!important}',
    '.np-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:13px;height:13px;border-radius:50%;background:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.35);opacity:0;transition:opacity .15s}',
    '.np-range::-moz-range-thumb{width:13px;height:13px;border:0;border-radius:50%;background:var(--text);opacity:0}',
    '.np-range:hover::-webkit-slider-thumb,.np-range:focus-visible::-webkit-slider-thumb{opacity:1}',
    '.np-range:hover::-moz-range-thumb,.np-range:focus-visible::-moz-range-thumb{opacity:1}',
    '.np-range:focus-visible{outline:2px solid var(--brand)!important;outline-offset:6px}',
    '#player-fullscreen .np-range{--np-vol-fill:var(--fs-accent,var(--text))}',
    '.player-bar .np-range:hover{--np-vol-fill:var(--brand)}',
    // Up next card.
    '.np-next{display:flex;align-items:center;gap:12px;width:100%;margin-top:18px;padding:8px 12px 8px 8px;border:1px solid rgba(127,127,127,.18);border-radius:12px;background:rgba(127,127,127,.08);color:var(--text);font:inherit;text-align:left;cursor:pointer;transition:background .15s,transform .12s,opacity .25s}',
    '.np-next:hover{background:rgba(127,127,127,.14)}',
    '.np-next:active{transform:scale(.985)}',
    '.np-next:focus-visible{outline:2px solid var(--fs-accent,var(--brand));outline-offset:2px}',
    '.np-next[hidden]{display:none}',
    '.np-next-cov{position:relative;width:44px;height:44px;border-radius:7px;overflow:hidden;flex-shrink:0;background:var(--surface-2);box-shadow:0 4px 12px rgba(0,0,0,.25)}',
    '.np-next-cov img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.np-next-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}',
    '.np-next-k{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--fs-accent,var(--text-3))}',
    '.np-next-t{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.np-next-a{font-size:12.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.np-next-go{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:var(--text-2);flex-shrink:0}',
    '.np-next-go svg{width:18px;height:18px}',
    '@media (min-width:769px){.np-next{max-width:420px}}',
    '@media (max-width:768px){.np-next{margin:0 0 12px;padding:6px 10px 6px 6px;flex-shrink:0}.np-next-cov{width:38px;height:38px}.np-next-t{font-size:13.5px}#player-fullscreen.np-has-next .pfs-cover{width:min(100%,78vw,40vh,420px)}}',
    '@media (max-width:768px) and (max-height:740px){.np-next{display:none!important}#player-fullscreen.np-has-next .pfs-cover{width:min(100%,78vw,46vh,420px)}}',
    // Cover motion: full size while playing, eased back when paused, a
    // crossfade on track change and a soft glow in the cover's own colour.
    '#player-fullscreen .pfs-cover-wrap{position:relative}',
    '#player-fullscreen .pfs-cover-wrap::before{content:"";position:absolute;left:50%;top:50%;width:min(92%,480px);aspect-ratio:1;transform:translate(-50%,-46%);border-radius:50%;background:radial-gradient(closest-side,var(--fs-accent,transparent),transparent);opacity:.42;filter:blur(38px);pointer-events:none;transition:opacity .6s ease}',
    '#player-fullscreen.np-paused .pfs-cover-wrap::before{opacity:.18}',
    '#player-fullscreen .pfs-cover{position:relative;transform:scale(1);transition:transform .7s cubic-bezier(.34,1.45,.5,1),box-shadow .7s ease;will-change:transform}',
    '#player-fullscreen.np-paused .pfs-cover{transform:scale(.9);box-shadow:0 14px 34px rgba(0,0,0,.35)}',
    '#player-fullscreen .pfs-cover.np-swap .pfs-cover-art{animation:np-in .45s cubic-bezier(.2,.7,.2,1)}',
    '@keyframes np-in{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}',
    '#player-fullscreen .pfs-cover.np-drag{transition:none}',
    // Progress: a buffered layer, a larger touch target and a hover time.
    '.progress-bar .np-buf{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:currentColor;opacity:.16;pointer-events:none;transition:width .3s linear}',
    '.progress-bar .progress-fill{position:relative;z-index:1}',
    '.progress-bar.np-hit::before{content:"";position:absolute;left:0;right:0;top:-10px;bottom:-10px}',
    '#player-fullscreen .pfs-bar{transition:height .15s ease;color:var(--text)}',
    '#player-fullscreen .pfs-bar:hover,#player-fullscreen .pfs-bar.np-active{height:6px}',
    '.np-tip{position:fixed;z-index:420;transform:translate(-50%,-100%);margin-top:-10px;padding:4px 8px;border-radius:6px;background:var(--text);color:var(--page-bg-base);font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none;opacity:0;transition:opacity .12s;white-space:nowrap}',
    '.np-tip.show{opacity:1}',
    // Vibe indicator on the speed tools.
    '#player-fullscreen .pfs-tool.wv-vibe-on{color:var(--fs-accent,var(--brand))}',
    '.player-bar #player-speed-btn.wv-vibe-on{color:var(--brand)}',
    // Sheet rows for the vibe choices.
    '.wv-sheet-sub{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);margin:14px 0 8px}',
    '.wv-sheet-sub:first-of-type{margin-top:6px}',
    '.wv-sheet-vibes{display:grid!important;grid-template-columns:repeat(3,1fr)}',
    '.wv-sheet-vibes button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border-radius:12px!important;padding:10px 12px!important;text-align:left}',
    '.wv-sheet-vibes button small{font-size:11px;font-weight:600;opacity:.7}',
    '.wv-sheet-opts button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}',
    // Light theme: the blurred cover backdrop was dimmed for dark text-on-light
    // themes too, leaving dark text on a dark wash. Brighten it instead.
    "#player-fullscreen.theme-light .pfs-bg{filter:blur(56px) brightness(1.15) saturate(1.25)}",
    "#player-fullscreen.theme-light .pfs-bg::after{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.78) 55%,rgba(255,255,255,.88))}",
    "#player-fullscreen.theme-light #wv-stars-fs{opacity:.25}",
    "#player-fullscreen.theme-light .pfs-tool:hover,#player-fullscreen.theme-light .pfs-close:hover,#player-fullscreen.theme-light .pfs-more:hover{background:rgba(0,0,0,.06)}",
    "@media (min-width:769px){#player-fullscreen.theme-light .pfs-tool{background:rgba(0,0,0,.05)}}",
    "#player-fullscreen.theme-light .pfs-cover{box-shadow:0 26px 60px rgba(0,0,0,.28)}",
    "#player-fullscreen.theme-light .np-next{background:rgba(255,255,255,.55);border-color:rgba(0,0,0,.08)}",
    "#player-fullscreen.theme-light .np-next:hover{background:rgba(255,255,255,.8)}",
    // Swipe-down dismiss.
    '#player-fullscreen.np-pull{transition:none}',
    '#player-fullscreen.np-release{transition:transform .28s cubic-bezier(.2,.7,.2,1)}',
    '@media (prefers-reduced-motion:reduce){#player-fullscreen .pfs-cover,#player-fullscreen .pfs-cover-wrap::before,.np-next,.progress-bar .np-buf{transition:none}#player-fullscreen.np-paused .pfs-cover{transform:none}#player-fullscreen .pfs-cover.np-swap .pfs-cover-art{animation:none}}'
  ].join('\n');

  function injectCss() {
    if ($('wv-np-css')) return;
    var st = document.createElement('style');
    st.id = 'wv-np-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var ICON_VOL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  var ICON_MUTE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.6-2.6-1.4-1.4-2.6 2.6L12.6 8l-1.4 1.4 2.6 2.6-2.6 2.6 1.4 1.4 2.6-2.6 2.6 2.6 1.4-1.4z"/></svg>';

  // ── Volume ────────────────────────────────────────────────────────────
  function buildVolume() {
    var right = document.querySelector('#player-fullscreen .pfs-right');
    if (!right || $('pfs-volume')) return;
    var row = document.createElement('div');
    row.className = 'pfs-volume';
    row.innerHTML = '<button type="button" class="np-vol-btn" id="np-vol-btn" aria-label="Mute" title="Mute (m)">' + ICON_VOL + '</button>' +
      '<input type="range" class="np-range" id="pfs-volume" min="0" max="1" step="0.01" aria-label="Volume">';
    var tb = right.querySelector('.pfs-toolbar');
    if (tb && tb.nextSibling) right.insertBefore(row, tb.nextSibling); else right.appendChild(row);
    var r = $('pfs-volume');
    r.addEventListener('input', function () { if (typeof setVolume === 'function') setVolume(r.value); syncVolume(); });
    $('np-vol-btn').addEventListener('click', function () { if (typeof toggleMute === 'function') toggleMute(); syncVolume(); });
    var bar = $('volume-slider');
    if (bar) { bar.classList.add('np-range'); bar.addEventListener('input', syncVolume); }
    syncVolume();
  }
  function syncVolume() {
    var a = A(); if (!a) return;
    var v = a.muted ? 0 : a.volume;
    ['pfs-volume', 'volume-slider'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.style.setProperty('--vol', Math.round(v * 100) + '%');
      if (id === 'pfs-volume' && document.activeElement !== el) el.value = String(a.volume);
      el.setAttribute('aria-valuetext', Math.round(v * 100) + '%');
    });
    var b = $('np-vol-btn');
    if (b) { b.innerHTML = v === 0 ? ICON_MUTE : ICON_VOL; b.setAttribute('aria-label', a.muted ? 'Unmute' : 'Mute'); }
  }

  // ── Up next card ──────────────────────────────────────────────────────
  function peekNext() {
    if (isLive()) return null;
    if (typeof window.wvPeekNext === 'function') { try { var n = window.wvPeekNext(); if (n) return n; } catch (_) {} }
    if (typeof window.getPlayerQueue !== 'function') return null;
    var q = window.getPlayerQueue();
    try { if (localStorage.getItem('wv_shuffle') === '1') return null; } catch (_) {}
    return q && q.idx >= 0 && q.list[q.idx + 1] ? q.list[q.idx + 1] : null;
  }
  function buildNext() {
    var fs = $('player-fullscreen'); if (!fs || $('np-next')) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'np-next'; btn.id = 'np-next'; btn.hidden = true;
    btn.addEventListener('click', function () { if (typeof skipNext === 'function') skipNext(); });
    var right = fs.querySelector('.pfs-right');
    var mobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    placeNext(btn, mobile);
    if (!right) return;
    renderNext();
  }
  function placeNext(btn, mobile) {
    var fs = $('player-fullscreen'); if (!fs) return;
    btn = btn || $('np-next'); if (!btn) return;
    var right = fs.querySelector('.pfs-right');
    var tb = fs.querySelector('.pfs-toolbar');
    // On a phone it sits just above the tool row; on desktop at the end of
    // the right-hand column, under the volume.
    if (mobile && tb) tb.parentNode.insertBefore(btn, tb);
    else if (right) right.appendChild(btn);
  }
  var _lastNextKey = '';
  function renderNext() {
    var el = $('np-next'); var fs = $('player-fullscreen');
    if (!el || !fs) return;
    var n = peekNext();
    fs.classList.toggle('np-has-next', !!n);
    if (!n) { el.hidden = true; _lastNextKey = ''; return; }
    var key = (n.id || '') + '|' + (n.title || '') + '|' + (n.cover_url || '');
    el.hidden = false;
    if (key === _lastNextKey) return;
    _lastNextKey = key;
    var artist = n.artist_name || n._archive_artist || (n.artists && n.artists.display_name) || '';
    var bg = typeof coverGradient === 'function' ? coverGradient(n.title || '') : 'var(--surface-2)';
    var c = n.cover_url || n._album_cover;
    el.setAttribute('aria-label', 'Skip to next: ' + (n.title || 'next track') + (artist ? ' by ' + artist : ''));
    el.innerHTML = '<span class="np-next-cov" style="background:' + esc(bg) + '">' + (c ? '<img src="' + esc(img(c, 112)) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>' +
      '<span class="np-next-meta"><span class="np-next-k">Up next' + (n._autoplay ? ' · autoplay' : '') + '</span><span class="np-next-t">' + esc(n.title || 'Untitled') + '</span>' +
      (artist ? '<span class="np-next-a">' + esc(artist) + '</span>' : '') + '</span>' +
      '<span class="np-next-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></span>';
  }

  // ── Cover motion ──────────────────────────────────────────────────────
  function syncPaused() {
    var fs = $('player-fullscreen'); var a = A();
    if (fs) fs.classList.toggle('np-paused', !a || a.paused);
  }
  function watchCover() {
    var cov = $('pfs-cover'); if (!cov || cov._npWatch) return;
    cov._npWatch = true;
    var last = '';
    new MutationObserver(function () {
      var im = cov.querySelector('img');
      var src = im ? im.getAttribute('src') : cov.innerHTML.length + '';
      if (src === last) return;
      last = src;
      if (RM || !fsOpen()) return;
      cov.classList.remove('np-swap'); void cov.offsetWidth; cov.classList.add('np-swap');
    }).observe(cov, { childList: true });
  }

  // ── Progress bar ──────────────────────────────────────────────────────
  var tip = null;
  function enhanceBar(id) {
    var bar = $(id); if (!bar || bar._np) return;
    bar._np = true;
    bar.classList.add('np-hit');
    var buf = document.createElement('div'); buf.className = 'np-buf';
    bar.insertBefore(buf, bar.firstChild);
    if (!tip) { tip = document.createElement('div'); tip.className = 'np-tip'; tip.setAttribute('aria-hidden', 'true'); document.body.appendChild(tip); }
    var show = function (e) {
      var a = A();
      if (!a || !a.duration || !isFinite(a.duration) || isLive() || e.pointerType === 'touch') { tip.classList.remove('show'); return; }
      var r = bar.getBoundingClientRect(); if (!r.width) return;
      var x = Math.max(r.left, Math.min(r.right, e.clientX));
      tip.textContent = ft((x - r.left) / r.width * a.duration);
      tip.style.left = x + 'px'; tip.style.top = r.top + 'px';
      tip.classList.add('show');
    };
    bar.addEventListener('pointermove', show);
    bar.addEventListener('pointerenter', show);
    bar.addEventListener('pointerleave', function () { tip.classList.remove('show'); bar.classList.remove('np-active'); });
    bar.addEventListener('pointerdown', function () { bar.classList.add('np-active'); });
    bar.addEventListener('pointerup', function () { bar.classList.remove('np-active'); });
  }
  var _bufAt = 0;
  function syncBuffered(force) {
    var now = Date.now();
    if (!force && now - _bufAt < 900) return;
    _bufAt = now;
    var a = A(); if (!a) return;
    var pct = 0;
    try {
      if (a.duration && isFinite(a.duration) && a.buffered && a.buffered.length) {
        var t = a.currentTime, end = 0;
        for (var i = 0; i < a.buffered.length; i++) {
          if (a.buffered.start(i) <= t + 0.5 && a.buffered.end(i) >= t) { end = a.buffered.end(i); break; }
          end = Math.max(end, a.buffered.start(i) <= t ? a.buffered.end(i) : 0);
        }
        pct = Math.min(100, end / a.duration * 100);
      }
    } catch (_) {}
    document.querySelectorAll('.progress-bar .np-buf').forEach(function (b) { b.style.width = pct + '%'; });
  }

  // ── Gestures ──────────────────────────────────────────────────────────
  // One touch handler for the whole full player: pull down to close, or
  // swipe the cover sideways to skip. The axis is decided after 10px.
  function wireGestures() {
    var fs = $('player-fullscreen'); if (!fs || fs._npGest) return;
    fs._npGest = true;
    var g = null;
    fs.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || !fsOpen()) { g = null; return; }
      var t = e.target;
      if (t.closest && t.closest('.pfs-lyrics, .progress-bar, input, textarea, .wv-sheet, #wv-queue-panel')) { g = null; return; }
      g = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, t0: Date.now(), axis: null, onCover: !!(t.closest && t.closest('.pfs-cover-wrap')), dx: 0, dy: 0 };
    }, { passive: true });
    fs.addEventListener('touchmove', function (e) {
      if (!g || e.touches.length !== 1) return;
      g.dx = e.touches[0].clientX - g.x0; g.dy = e.touches[0].clientY - g.y0;
      if (!g.axis) {
        if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) return;
        if (Math.abs(g.dy) > Math.abs(g.dx) && g.dy > 0) g.axis = 'y';
        else if (Math.abs(g.dx) > Math.abs(g.dy) && g.onCover && !isLive()) g.axis = 'x';
        else { g = null; return; }
      }
      if (g.axis === 'y') {
        fs.classList.add('np-pull');
        var d = Math.max(0, g.dy);
        fs.style.transform = 'translateY(' + (d < 200 ? d : 200 + (d - 200) * 0.5) + 'px)';
        if (e.cancelable) e.preventDefault();
      } else {
        var cov = $('pfs-cover');
        if (cov) { cov.classList.add('np-drag'); cov.style.transform = 'translateX(' + (g.dx * 0.6) + 'px) rotate(' + (g.dx * 0.02) + 'deg)'; cov.style.opacity = String(1 - Math.min(0.5, Math.abs(g.dx) / 500)); }
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });
    var end = function () {
      if (!g || !g.axis) { g = null; return; }
      var s = g; g = null;
      var v = (s.axis === 'y' ? s.dy : Math.abs(s.dx)) / Math.max(1, Date.now() - s.t0);
      if (s.axis === 'y') {
        fs.classList.remove('np-pull');
        var close = s.dy > 130 || (s.dy > 50 && v > 0.55);
        if (RM) { fs.style.transform = ''; if (close && typeof closeFullPlayer === 'function') closeFullPlayer(); return; }
        fs.classList.add('np-release');
        fs.style.transform = close ? 'translateY(100%)' : '';
        setTimeout(function () {
          fs.classList.remove('np-release');
          if (close) { if (typeof closeFullPlayer === 'function') closeFullPlayer(); fs.style.transform = ''; }
        }, 280);
      } else {
        var cov = $('pfs-cover'); if (!cov) return;
        var skip = Math.abs(s.dx) > 70 || (Math.abs(s.dx) > 30 && v > 0.5);
        cov.classList.remove('np-drag');
        cov.style.transform = ''; cov.style.opacity = '';
        if (skip) {
          if (s.dx < 0 && typeof skipNext === 'function') skipNext();
          else if (s.dx > 0 && typeof skipPrev === 'function') { var a = A(); if (a && a.currentTime > 3) a.currentTime = 0; skipPrev(); }
        }
      }
    };
    fs.addEventListener('touchend', end, { passive: true });
    fs.addEventListener('touchcancel', function () {
      g = null; fs.classList.remove('np-pull'); fs.style.transform = '';
      var cov = $('pfs-cover'); if (cov) { cov.classList.remove('np-drag'); cov.style.transform = ''; cov.style.opacity = ''; }
    }, { passive: true });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────
  function typing(t) {
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable));
  }
  function onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat && !/^[,.]$/.test(e.key)) return;
    if (typing(e.target)) return;
    if (document.querySelector('#wv-keys, #wv-palette, #wv-theme-picker, [aria-modal="true"]')) return;
    var a = A(); if (!a) return;
    var k = e.key;
    var hasTrack = !!(typeof currentTrack !== 'undefined' && currentTrack);
    if ((k === 'f' || k === 'F') && !e.shiftKey) {
      if (!hasTrack) return;
      e.preventDefault();
      if (fsOpen()) closeFullPlayer(); else openFullPlayer();
    } else if (k === 'L' && e.shiftKey) {
      if (!hasTrack) return;
      e.preventDefault();
      if (!fsOpen()) openFullPlayer(true);
      else if (typeof toggleLyricsView === 'function') toggleLyricsView();
    } else if ((k === 'q' || k === 'Q') && !e.shiftKey) {
      e.preventDefault();
      if (typeof toggleQueuePanel === 'function') toggleQueuePanel();
    } else if ((k === 'k' || k === 'K') && !e.shiftKey) {
      if (!hasTrack) return;
      e.preventDefault();
      if (typeof togglePlay === 'function') togglePlay();
    } else if ((k === 'n' || k === 'N') && !e.shiftKey) {
      if (!hasTrack) return;
      e.preventDefault();
      if (typeof skipNext === 'function') skipNext();
    } else if ((k === 'p' || k === 'P') && !e.shiftKey) {
      if (!hasTrack) return;
      e.preventDefault();
      if (typeof skipPrev === 'function') skipPrev();
    } else if (/^[0-9]$/.test(k) && !e.shiftKey) {
      if (!hasTrack || isLive() || !a.duration || !isFinite(a.duration)) return;
      var on = e.target && e.target.closest && e.target.closest('[role="slider"], [role="tab"], [role="listbox"]');
      if (on) return;
      e.preventDefault();
      a.currentTime = a.duration * (parseInt(k, 10) / 10);
    } else if ((k === ',' || k === '.' || k === '<' || k === '>')) {
      if (!hasTrack || isLive() || typeof window.stepPlaybackSpeed !== 'function') return;
      e.preventDefault();
      window.stepPlaybackSpeed(k === ',' || k === '<' ? -1 : 1);
    }
  }
  function registerShortcuts() {
    window.wvShortcutsExtra = window.wvShortcutsExtra || [];
    if (window.wvShortcutsExtra.some(function (x) { return x && x._np; })) return;
    [
      { keys: ['1', '9'], label: 'Jump to 10–90%' },
      { keys: [',', '.'], label: 'Slower or faster' },
      { keys: ['F'], label: 'Full-screen player' },
      { keys: ['Shift', 'L'], label: 'Lyrics' },
      { keys: ['Q'], label: 'Queue' },
    ].forEach(function (r) { r.group = 'Playback'; r._np = true; window.wvShortcutsExtra.push(r); });
  }

  // ── Wiring ────────────────────────────────────────────────────────────
  var wired = false;
  function wire() {
    if (wired) return true;
    var fs = $('player-fullscreen'); var a = A();
    if (!fs || !a || !fs.querySelector('.pfs-right')) return false;
    wired = true;
    injectCss();
    buildVolume();
    buildNext();
    watchCover();
    enhanceBar('pfs-progress-bar');
    enhanceBar('progress-bar');
    wireGestures();
    syncPaused();
    syncBuffered(true);
    a.addEventListener('volumechange', syncVolume);
    a.addEventListener('play', function () { syncPaused(); renderNext(); });
    a.addEventListener('pause', syncPaused);
    a.addEventListener('loadstart', function () { renderNext(); syncBuffered(true); });
    a.addEventListener('progress', function () { syncBuffered(false); });
    a.addEventListener('timeupdate', function () { syncBuffered(false); });
    document.addEventListener('wv-queue-change', renderNext);
    document.addEventListener('wv-fullplayer', function (e) { if (e.detail && e.detail.open) { syncPaused(); renderNext(); syncVolume(); } });
    var mq = window.matchMedia && window.matchMedia('(max-width: 768px)');
    if (mq) { var re = function () { placeNext(null, mq.matches); }; if (mq.addEventListener) mq.addEventListener('change', re); else if (mq.addListener) mq.addListener(re); }
    return true;
  }

  document.addEventListener('keydown', onKey);
  registerShortcuts();
  if (!wire()) {
    // player.js builds the player during page start-up; wait for it.
    var tries = 0;
    var iv = setInterval(function () { if (wire() || ++tries > 80) clearInterval(iv); }, 250);
  }

  window.wvNowPlaying = function () { var n = peekNext(); return { wired: wired, next: n ? { id: n.id, title: n.title } : null }; };
})();
