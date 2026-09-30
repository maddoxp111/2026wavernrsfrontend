// ── Search suggestions 2.0 ─────────────────────────────────────────────────
// Replaces the topbar live suggest (layout.js calls window._topbarSuggest by
// name from the input's inline handlers). Renders into the same #wv-suggest
// container so layout's outside-click / Esc / popstate closers keep working.
// Also exposes a small search core (window.wvQuickSearch.fetch / hl / play)
// that the command palette reuses, so both share one cache.
(function () {
  'use strict';
  if (typeof window.wvQuickSearch === 'function' && window.wvQuickSearch._v) return;

  var API = (typeof API_BASE !== 'undefined' && API_BASE) || 'https://2026wavernrs-production.up.railway.app/api';
  var RECENT_KEY = 'wv_recent_q';
  var RECENT_MAX = 8;
  var DEBOUNCE = 150;

  // ── tiny utils ────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }
  function img(url, px) {
    if (!url) return '';
    try { return typeof wvImg === 'function' ? wvImg(url, px) : url; } catch (_) { return url; }
  }
  function grad(seed) {
    try { return typeof coverGradient === 'function' ? coverGradient(seed || '') : 'var(--surface-2)'; } catch (_) { return 'var(--surface-2)'; }
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } }
  function fmtPlays(n) {
    n = +n || 0;
    if (!n) return '';
    var s = n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
    return s + (n === 1 ? ' play' : ' plays');
  }

  // Lowercase + strip accents, keeping a map back to the original indices so
  // highlights land on the right characters after normalisation.
  function normMap(s) {
    s = String(s == null ? '' : s);
    var out = '', map = [];
    for (var i = 0; i < s.length; i++) {
      var n = s[i].toLowerCase();
      try { n = n.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (_) {}
      for (var j = 0; j < n.length; j++) { out += n[j]; map.push(i); }
    }
    return { s: out, map: map };
  }
  function norm(s) { return normMap(s).s; }

  function renderRanges(text, ranges) {
    if (!ranges.length) return esc(text);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([r[0], r[1]]);
    });
    var out = '', pos = 0;
    merged.forEach(function (r) {
      out += esc(text.slice(pos, r[0])) + '<mark>' + esc(text.slice(r[0], r[1])) + '</mark>';
      pos = r[1];
    });
    return out + esc(text.slice(pos));
  }
  // Escapes first, then wraps the matched substring (or each matched word).
  function hl(text, q) {
    text = String(text == null ? '' : text);
    var qq = norm(q).trim();
    if (!qq) return esc(text);
    var m = normMap(text);
    var ranges = [];
    var idx = m.s.indexOf(qq);
    if (idx >= 0) {
      ranges.push([m.map[idx], m.map[idx + qq.length - 1] + 1]);
    } else {
      qq.split(/\s+/).forEach(function (w) {
        if (w.length < 2) return;
        var k = m.s.indexOf(w);
        if (k >= 0) ranges.push([m.map[k], m.map[k + w.length - 1] + 1]);
      });
    }
    return renderRanges(text, ranges);
  }

  // How well a title answers the query: exact > prefix > word start > inside.
  function matchScore(title, q) {
    var t = norm(title).trim(), qq = norm(q).trim();
    if (!t || !qq) return 0;
    if (t === qq) return 100;
    if (t.replace(/[^a-z0-9]+/g, '') === qq.replace(/[^a-z0-9]+/g, '')) return 95;
    if (t.indexOf(qq) === 0) return 80;
    var i = t.indexOf(qq);
    if (i > 0 && /[^a-z0-9]/.test(t[i - 1])) return 65;
    if (i > 0) return 45;
    var words = qq.split(/\s+/).filter(function (w) { return w.length > 1; });
    if (words.length > 1 && words.every(function (w) { return t.indexOf(w) >= 0; })) return 50;
    return 10;
  }

  // ── network ───────────────────────────────────────────────────────────────
  function getJSON(path, ms) {
    var ctrl = null;
    try { ctrl = new AbortController(); } catch (_) {}
    var timer = setTimeout(function () { try { ctrl && ctrl.abort(); } catch (_) {} }, ms || 9000);
    return fetch(API + path, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) { clearTimeout(timer); return d; });
  }

  // In-memory LRU of the last 20 queries, plus in-flight de-duplication.
  var _cache = {}, _order = [], _inflight = {};
  function cacheGet(k) {
    if (!_cache[k]) return null;
    var i = _order.indexOf(k);
    if (i >= 0) _order.splice(i, 1);
    _order.push(k);
    return _cache[k];
  }
  function cachePut(k, v) {
    if (!_cache[k]) _order.push(k);
    _cache[k] = v;
    while (_order.length > 20) delete _cache[_order.shift()];
  }
  function key(q) { return norm(q).trim().replace(/\s+/g, ' '); }

  function artistOf(a) {
    if (!a) return '';
    return (a.is_archive && a.archive_artist_name) || (a.artists && a.artists.display_name) || a.archive_artist_name || '';
  }

  function build(q, d, ye, aa) {
    d = d || {}; ye = ye || {};
    var G = { ye: [], artists: [], comps: [], edits: [], archive: [] };
    (ye.albums || []).slice(0, 2).forEach(function (a) {
      if (!a || !a.slug) return;
      G.ye.push({ kind: 'yealbum', id: 'ya:' + a.slug, title: a.title, type: 'Ye album', sub: 'Ye album' + (a.year ? ' · ' + a.year : ''),
        href: '/resources?view=disco&album=' + enc(a.slug), art: a.cover_sm || a.cover, pop: 1e5 });
    });
    (ye.songs || []).slice(0, 3).forEach(function (t) {
      if (!t || !t.title) return;
      G.ye.push({ kind: 'yesong', id: 'ys:' + t.title + ':' + (t.slug || ''), title: t.title, type: 'Ye song', sub: 'Ye song' + (t.album ? ' · ' + t.album : '') + (t.year ? ' · ' + t.year : ''),
        href: '/resources?view=song&t=' + enc(t.title), art: t.cover, pop: 5e4 });
    });
    (d.artists || []).slice(0, 3).forEach(function (a) {
      if (!a || !a.id) return;
      G.artists.push({ kind: 'artist', id: 'ar:' + a.id, title: a.display_name || 'Editor', type: 'Editor', sub: 'Editor',
        href: '/artist?id=' + enc(a.id), art: a.profile_image_url, round: true, pop: 0 });
    });
    ((aa && aa.artists) || []).slice(0, 3).forEach(function (a) {
      if (!a || !a.slug) return;
      G.artists.push({ kind: 'aartist', id: 'aa:' + a.slug, title: a.name, type: 'Archive artist',
        sub: 'Archive artist' + (a.comp_count ? ' · ' + a.comp_count + (a.comp_count === 1 ? ' comp' : ' comps') : ''),
        href: '/archive-artist?a=' + enc(a.slug), art: a.cover_url, round: true, pop: +a.play_count || 0 });
    });
    (d.albums || []).slice(0, 5).forEach(function (a) {
      if (!a || !a.id) return;
      var who = artistOf(a);
      G.comps.push({ kind: 'comp', id: a.id, title: a.title || 'Untitled', type: 'Comp', sub: 'Comp' + (who ? ' · ' + who : ''),
        href: '/album?id=' + enc(a.id), art: a.cover_url, pop: +a.play_count || 0, play: { comp: a.id, album: a } });
    });
    (d.tracks || []).slice(0, 5).forEach(function (t) {
      if (!t || !t.id) return;
      var who = (t.artists && t.artists.display_name) || '';
      var cover = t.cover_url || (t.albums && t.albums.cover_url) || '';
      G.edits.push({ kind: 'edit', id: t.id, title: t.title || 'Untitled', type: 'Edit', sub: 'Edit' + (who ? ' · ' + who : ''),
        href: '/track?id=' + enc(t.id), art: cover, pop: +t.play_count || 0,
        play: t.ia_url ? { track: { id: t.id, title: t.title, artist_name: who, ia_url: t.ia_url, cover_url: cover, artist_id: t.artist_id || (t.artists && t.artists.id) || null } } : null });
    });
    (d.archived || []).slice(0, 5).forEach(function (a) {
      if (!a || !a.id) return;
      G.archive.push({ kind: 'archive', id: a.id, title: a.title || 'Untitled', type: 'Archive', sub: 'Archive' + (a.archive_artist_name ? ' · ' + a.archive_artist_name : ''),
        href: '/album?id=' + enc(a.id), art: a.cover_url, pop: +a.play_count || 0, play: { comp: a.id, album: a } });
    });

    Object.keys(G).forEach(function (g) {
      var seen = {};
      G[g] = G[g].filter(function (it) {
        var k = norm(it.title) + '|' + norm(it.sub);
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
    });
    var BIAS = { yealbum: 9, aartist: 4, artist: 12, comp: 4, yesong: 6, archive: 3, edit: 2 };
    var top = null, best = 0;
    Object.keys(G).forEach(function (g) {
      G[g].forEach(function (it) {
        var m = matchScore(it.title, q);
        if (m < 45) return;
        var s = m + (BIAS[it.kind] || 0) + Math.min(9, Math.log(1 + (it.pop || 0)) * 1.4);
        if (s > best) { best = s; top = it; }
      });
    });
    var groups = [
      { key: 'ye', label: 'Ye archive', items: G.ye },
      { key: 'artists', label: 'Artists', items: G.artists },
      { key: 'comps', label: 'Comps', items: G.comps.slice(0, 4) },
      { key: 'edits', label: 'Edits', items: G.edits.slice(0, 4) },
      { key: 'archive', label: 'Archive', items: G.archive.slice(0, 4) },
    ].map(function (g) {
      return { key: g.key, label: g.label, items: g.items.filter(function (it) { return it !== top; }) };
    }).filter(function (g) { return g.items.length; });
    var total = groups.reduce(function (n, g) { return n + g.items.length; }, top ? 1 : 0);
    return { q: q, top: top, groups: groups, total: total, ok: !!(d && (d.tracks || d.albums || d.artists || d.archived)) };
  }

  // One search across comps, edits, editors, the archive and the Ye archive.
  function search(q) {
    q = String(q || '').trim();
    var k = key(q);
    if (k.length < 2) return Promise.resolve(null);
    var hit = cacheGet(k);
    if (hit) return Promise.resolve(hit);
    if (_inflight[k]) return _inflight[k];
    var p = Promise.all([
      getJSON('/search?q=' + enc(q), 9000),
      getJSON('/ye/search?q=' + enc(q), 4000),
      getJSON('/archive/artists?q=' + enc(q) + '&limit=3', 4000),
    ]).then(function (r) {
      delete _inflight[k];
      if (!r[0] && !r[1] && !r[2]) return { q: q, top: null, groups: [], total: 0, ok: false, error: true };
      var res = build(q, r[0], r[1], r[2]);
      if (r[0] && r[1] && r[2]) cachePut(k, res);
      return res;
    }, function () {
      delete _inflight[k];
      return { q: q, top: null, groups: [], total: 0, ok: false, error: true };
    });
    _inflight[k] = p;
    return p;
  }

  // Trending edits, cached for the session (10 minutes).
  var _trend = null, _trendP = null;
  function trending() {
    if (_trend) return Promise.resolve(_trend);
    try {
      var c = JSON.parse(sessionStorage.getItem('wv_qs_trending') || 'null');
      if (c && c.t && Date.now() - c.t < 600000 && Array.isArray(c.items)) { _trend = c.items; return Promise.resolve(_trend); }
    } catch (_) {}
    if (_trendP) return _trendP;
    _trendP = getJSON('/discover/trending', 9000).then(function (d) {
      _trendP = null;
      var list = Array.isArray(d) ? d : (d && (d.items || d.trending)) || [];
      var out = list.filter(function (t) { return t && t.id; }).slice(0, 5).map(function (t) {
        var isComp = t._type === 'album' || (!t.ia_url && t.track_count != null);
        var who = artistOf(t) || (t.artists && t.artists.display_name) || '';
        var cover = t.cover_url || (t.albums && t.albums.cover_url) || '';
        return isComp
          ? { kind: 'comp', id: t.id, title: t.title || 'Untitled', sub: 'Comp' + (who ? ' · ' + who : ''), plays: t.play_count,
              href: '/album?id=' + enc(t.id), art: cover, play: { comp: t.id, album: t } }
          : { kind: 'edit', id: t.id, title: t.title || 'Untitled', sub: 'Edit' + (who ? ' · ' + who : ''), plays: t.play_count,
              href: '/track?id=' + enc(t.id), art: cover,
              play: t.ia_url ? { track: { id: t.id, title: t.title, artist_name: who, ia_url: t.ia_url, cover_url: cover, artist_id: t.artist_id || null } } : null };
      });
      if (out.length) {
        _trend = out;
        try { sessionStorage.setItem('wv_qs_trending', JSON.stringify({ t: Date.now(), items: out })); } catch (_) {}
      }
      return out;
    });
    return _trendP;
  }

  // ── recent searches ───────────────────────────────────────────────────────
  // Our own list, merged with the search page's list when it's readable.
  function recent() {
    var out = [], seen = {};
    function add(v) {
      var s = typeof v === 'string' ? v : v && (v.q || v.query || v.term);
      s = String(s || '').trim();
      var k = s.toLowerCase();
      if (!s || s.length > 80 || seen[k]) return;
      seen[k] = 1; out.push(s);
    }
    var mine = lsGet(RECENT_KEY, []);
    if (Array.isArray(mine)) mine.forEach(add);
    var theirs = lsGet('wv_recent_searches', []);
    if (Array.isArray(theirs)) theirs.forEach(add);
    return out.slice(0, RECENT_MAX);
  }
  function remember(q) {
    q = String(q || '').trim();
    if (q.length < 2 || q.length > 80) return;
    var list = lsGet(RECENT_KEY, []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (x) { return typeof x === 'string' && x.toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    lsSet(RECENT_KEY, list.slice(0, 12));
  }
  function forget(q) {
    var lq = String(q || '').toLowerCase();
    var list = lsGet(RECENT_KEY, []);
    if (Array.isArray(list)) lsSet(RECENT_KEY, list.filter(function (x) { return String(x).toLowerCase() !== lq; }));
    var theirs = lsGet('wv_recent_searches', null);
    if (Array.isArray(theirs)) {
      lsSet('wv_recent_searches', theirs.filter(function (v) {
        var s = typeof v === 'string' ? v : v && (v.q || v.query || v.term);
        return String(s || '').toLowerCase() !== lq;
      }));
    }
  }
  function clearRecent() {
    lsSet(RECENT_KEY, []);
    var theirs = lsGet('wv_recent_searches', null);
    if (Array.isArray(theirs)) lsSet('wv_recent_searches', []);
  }

  // ── playback ──────────────────────────────────────────────────────────────
  function cur() { try { return typeof currentTrack !== 'undefined' ? currentTrack : null; } catch (_) { return null; } }
  function aud() { try { return typeof audio !== 'undefined' ? audio : null; } catch (_) { return null; } }
  function isPlaying(it) {
    var t = cur(), a = aud();
    if (!t || !a || a.paused || !it || !it.play) return false;
    return it.play.comp ? t._album_id === it.play.comp : t.id === it.id;
  }
  function isLoaded(it) {
    var t = cur();
    if (!t || !it || !it.play) return false;
    return it.play.comp ? t._album_id === it.play.comp : t.id === it.id;
  }
  function play(it) {
    if (!it || !it.play) return false;
    if (isLoaded(it) && typeof togglePlay === 'function') { togglePlay(); return true; }
    if (it.play.comp && typeof window.playCompById === 'function') { window.playCompById(it.play.comp, { album: it.play.album }); return true; }
    if (it.play.track && typeof playTrack === 'function') { playTrack(it.play.track); return true; }
    return false;
  }

  // ── icons ─────────────────────────────────────────────────────────────────
  var IC = {
    play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z"/></svg>',
    pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.3"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.7 2.7a8.05 8.05 0 1 0 4.9 14.44l3.62 3.62a1.4 1.4 0 0 0 1.98-1.98l-3.62-3.62A8.05 8.05 0 0 0 10.7 2.7Zm0 2.8a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Z"/></svg>',
    fire: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.2 2.3c.3 2.9-1 4.6-2.4 6.2-1.3 1.5-2.6 3-2.4 5.3.1 1.3.8 2.3 1.6 3-.6-2.3.6-3.6 1.9-4.8.3 1.9 1.4 2.8 2.3 3.8.8.9 1.2 1.9.9 3.4 2.6-1 4.4-3.6 4.4-6.6 0-4.6-3.3-8-6.3-10.3Z"/><path d="M8.2 11.3c-1.9 1.4-3 3.4-3 5.6A6.7 6.7 0 0 0 9.4 23c-1.2-.9-2-2.4-2-4 0-1.6.7-2.7 1.4-3.7-.7-1.2-.9-2.6-.6-4Z" opacity=".55"/></svg>',
  };

  // ── CSS (injected once) ───────────────────────────────────────────────────
  function styleOnce() {
    if (document.getElementById('wv-qs-css')) return;
    var st = document.createElement('style');
    st.id = 'wv-qs-css';
    st.textContent = [
      '#wv-suggest.wvqs,#wv-qs-side.wvqs{position:absolute;top:calc(100% + 8px);left:0;right:auto;z-index:400;width:max(100%,min(560px,calc(100vw - 32px)));',
      'background:var(--elevated);border:1px solid var(--hair);border-radius:calc(var(--r-lg) + 4px);padding:6px;max-height:min(72vh,640px);overflow-y:auto;overscroll-behavior:contain;',
      'box-shadow:0 24px 56px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.25);color:var(--text);font-size:14px;scrollbar-width:thin;animation:wvqs-in .14s var(--ease,ease) both;}',
      '.theme-light #wv-suggest.wvqs,.theme-light #wv-qs-side.wvqs{box-shadow:0 24px 56px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.06);}',
      '#wv-qs-side.wvqs{position:fixed;top:0;width:min(520px,calc(100vw - 32px));z-index:4500;}',
      '@keyframes wvqs-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '.wvqs-bar{position:sticky;top:-6px;height:2px;margin:-6px -6px 4px;border-radius:2px;overflow:hidden;z-index:2;opacity:0;transition:opacity .15s;}',
      '.wvqs.is-loading .wvqs-bar{opacity:1;}',
      '.wvqs-bar::after{content:"";position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,var(--brand),transparent);animation:wvqs-bar 1s linear infinite;}',
      '@keyframes wvqs-bar{from{transform:translateX(-100%)}to{transform:translateX(250%)}}',
      '.wvqs-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 10px 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}',
      '.wvqs-h .wvqs-hic{display:inline-flex;align-items:center;gap:6px;}',
      '.wvqs-h button{all:unset;cursor:pointer;font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--text-3);padding:2px 6px;border-radius:var(--r-sm);}',
      '.wvqs-h button:hover{color:var(--text);background:var(--hair);}',
      '.wvqs-h button:focus-visible{outline:2px solid var(--brand);}',
      '.wvqs-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 8px 8px;}',
      '.wvqs-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 6px 0 10px;border-radius:var(--r-pill);background:var(--hair);color:var(--text-2);font-size:13px;font-weight:600;cursor:pointer;max-width:100%;border:1px solid transparent;}',
      '.wvqs-chip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;}',
      '.wvqs-chip svg{flex-shrink:0;opacity:.8;}',
      '.wvqs-chip:hover,.wvqs-chip.is-active{color:var(--text);background:var(--hair-strong);}',
      '.wvqs-chip.is-active{border-color:var(--brand);}',
      '.wvqs-chip .wvqs-x{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;color:var(--text-3);}',
      '.wvqs-chip .wvqs-x:hover{background:var(--hair-strong);color:var(--text);}',
      '.wvqs-row{position:relative;display:flex;align-items:center;gap:12px;padding:7px 8px;border-radius:var(--r-md);color:var(--text);text-decoration:none;cursor:pointer;min-height:52px;}',
      '.wvqs-row:hover,.wvqs-row.is-active{background:var(--hair);}',
      '.wvqs-row.is-active::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--brand);}',
      '.wvqs-rank{width:16px;flex-shrink:0;text-align:center;font-size:13px;font-weight:700;color:var(--text-3);font-variant-numeric:tabular-nums;}',
      '.wvqs-art{position:relative;width:40px;height:40px;flex-shrink:0;border-radius:var(--r-art,6px);overflow:hidden;background:var(--surface-2);}',
      '.wvqs-art.round{border-radius:50%;}',
      '.wvqs-art img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.wvqs-meta{flex:1;min-width:0;}',
      '.wvqs-t{font-size:14px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wvqs-s{font-size:12.5px;line-height:1.35;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
      '.wvqs mark{background:transparent;color:var(--brand-text,var(--brand));font-weight:800;}',
      '.wvqs-go{flex-shrink:0;color:var(--text-3);opacity:0;transform:translateX(-4px);transition:opacity .12s,transform .12s;}',
      '.wvqs-row:hover .wvqs-go,.wvqs-row.is-active .wvqs-go{opacity:1;transform:none;}',
      '.wvqs-play{flex-shrink:0;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--brand);color:var(--on-brand,#fff);',
      'opacity:0;transform:scale(.86);transition:opacity .12s,transform .12s,filter .12s;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25);}',
      '.wvqs-row:hover .wvqs-play,.wvqs-row.is-active .wvqs-play,.wvqs-play.is-on{opacity:1;transform:none;}',
      '.wvqs-play:hover{filter:brightness(1.08);transform:scale(1.06)!important;}',
      '.wvqs-play svg{margin-left:1px;}.wvqs-play.is-on svg{margin-left:0;}',
      '.wvqs-top{position:relative;display:flex;align-items:center;gap:16px;margin:2px 2px 6px;padding:14px;border-radius:var(--r-lg);background:var(--hair);color:var(--text);text-decoration:none;cursor:pointer;overflow:hidden;}',
      '.wvqs-top:hover,.wvqs-top.is-active{background:var(--hair-strong);}',
      '.wvqs-top.is-active{box-shadow:inset 0 0 0 1.5px var(--brand);}',
      '.wvqs-top .wvqs-art{width:76px;height:76px;border-radius:var(--r-art,6px);box-shadow:0 8px 22px rgba(0,0,0,.32);}',
      '.wvqs-top .wvqs-art.round{border-radius:50%;}',
      '.wvqs-top .wvqs-t{font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1.2;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      '.wvqs-top .wvqs-s{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;color:var(--text-2);}',
      '.wvqs-pill{flex-shrink:0;padding:3px 8px;border-radius:var(--r-pill);background:var(--hair-strong);color:var(--text);font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}',
      '.wvqs-top .wvqs-play{width:48px;height:48px;opacity:1;transform:none;}',
      '.wvqs-top .wvqs-play svg{width:20px;height:20px;}',
      '.wvqs-top .wvqs-go{opacity:1;transform:none;width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:var(--hair);}',
      '.wvqs-all{display:flex;align-items:center;gap:10px;margin-top:4px;padding:12px 10px;border-top:1px solid var(--hair);border-radius:0 0 var(--r-md) var(--r-md);font-size:13px;font-weight:700;color:var(--text-2);text-decoration:none;cursor:pointer;}',
      '.wvqs-all span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.wvqs-all kbd,.wvqs-foot kbd{display:inline-grid;place-items:center;min-width:18px;height:18px;box-sizing:border-box;font:600 10.5px/1 var(--font-sans);padding:0 5px;border-radius:5px;background:var(--hair);border:1px solid var(--hair-strong);color:var(--text-3);}',
      '.wvqs-all:hover,.wvqs-all.is-active{color:var(--text);background:var(--hair);}',
      '.wvqs-empty{padding:18px 12px 14px;text-align:center;color:var(--text-3);font-size:13px;line-height:1.5;}',
      '.wvqs-empty b{display:block;color:var(--text);font-size:14px;margin-bottom:2px;}',
      '.wvqs-foot{display:flex;gap:14px;justify-content:flex-end;padding:8px 10px 4px;color:var(--text-3);font-size:11.5px;}',
      '.wvqs-foot span{display:inline-flex;align-items:center;gap:5px;}',
      '.wvqs-sk{display:flex;align-items:center;gap:12px;padding:7px 8px;min-height:52px;}',
      '.wvqs-sk i{display:block;border-radius:6px;background:var(--hair);position:relative;overflow:hidden;}',
      '.wvqs-sk i::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,var(--hair-strong),transparent);animation:wvqs-sh 1.1s ease-in-out infinite;}',
      '@keyframes wvqs-sh{to{transform:translateX(100%)}}',
      '.wvqs-sk.top{padding:14px;min-height:104px;background:var(--hair);border-radius:var(--r-lg);margin:2px 2px 6px;}',
      '@media (prefers-reduced-motion: reduce){#wv-suggest.wvqs,#wv-qs-side.wvqs{animation:none}.wvqs-sk i::after,.wvqs-bar::after{animation:none}.wvqs-play,.wvqs-go{transition:none}}',
    ].join('');
    document.head.appendChild(st);
  }

  // ── state ─────────────────────────────────────────────────────────────────
  var S = { inp: null, opts: [], active: -1, q: '', seq: 0, timer: 0, shown: '', trendFailed: false };

  function isTop(inp) { return inp && inp.id === 'wv-search-inp'; }
  function isSide(inp) { return inp && inp.classList && inp.classList.contains('am-search-inp'); }
  function isQs(inp) { return isTop(inp) || isSide(inp); }

  function boxId(inp) { return isSide(inp) ? 'wv-qs-side' : 'wv-suggest'; }
  function getBox(inp, create) {
    var id = boxId(inp);
    var el = document.getElementById(id);
    if (el && !create) return el;
    if (!el) {
      if (!create) return null;
      el = document.createElement('div');
      el.id = id;
      if (isSide(inp)) document.body.appendChild(el);
      else { var wrap = inp.closest('.wv-topbar-search'); (wrap || inp.parentNode || document.body).appendChild(el); }
      el.addEventListener('mousedown', onBoxMouseDown);
      el.addEventListener('click', onBoxClick);
      el.addEventListener('mousemove', onBoxMove);
    }
    el.className = 'wvqs';
    el.setAttribute('role', 'listbox');
    el.setAttribute('aria-label', 'Search suggestions');
    if (isSide(inp)) placeSide(inp, el);
    return el;
  }
  function placeSide(inp, el) {
    var r = (inp.closest('.am-search') || inp).getBoundingClientRect();
    var w = Math.min(520, window.innerWidth - 32);
    el.style.left = Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) + 'px';
    el.style.top = (r.bottom + 8) + 'px';
    el.style.maxHeight = Math.max(240, window.innerHeight - r.bottom - 32) + 'px';
  }

  function close() {
    ['wv-suggest', 'wv-qs-side'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); });
    if (S.inp) {
      S.inp.setAttribute('aria-expanded', 'false');
      S.inp.removeAttribute('aria-activedescendant');
    }
    clearTimeout(S.timer);
    S.seq++;
    S.opts = []; S.active = -1; S.shown = '';
  }

  function attach(inp) {
    if (!inp || inp._wvqs) return;
    inp._wvqs = true;
    inp.setAttribute('role', 'combobox');
    inp.setAttribute('aria-autocomplete', 'list');
    inp.setAttribute('aria-expanded', 'false');
    inp.setAttribute('aria-controls', boxId(inp));
    if (!inp.getAttribute('aria-label')) inp.setAttribute('aria-label', 'Search wavernrs');
    inp.addEventListener('blur', function () {
      setTimeout(function () {
        var box = document.getElementById(boxId(inp));
        if (document.activeElement === inp) return;
        if (box && box.contains(document.activeElement)) return;
        if (S.inp === inp) close();
      }, 140);
    });
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  function artHTML(it, px) {
    var src = it.art ? img(it.art, px * 2) : '';
    return '<div class="wvqs-art' + (it.round ? ' round' : '') + '"' + (src ? '' : ' style="background:' + esc(grad(it.title)) + '"') + '>' +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') + '</div>';
  }
  function playBtn(it) {
    if (!it.play) return '<span class="wvqs-go" aria-hidden="true">' + IC.arrow + '</span>';
    var on = isPlaying(it);
    return '<span class="wvqs-play' + (on ? ' is-on' : '') + '" role="button" tabindex="-1" data-act="play" aria-label="' + (on ? 'Pause ' : 'Play ') + esc(it.title) + '" title="' + (on ? 'Pause' : 'Play') + '">' + (on ? IC.pause : IC.play) + '</span>';
  }
  function optId(i) { return 'wvqs-o-' + i; }

  function rowHTML(o, i, q, rank) {
    var it = o.item;
    return '<a class="wvqs-row" role="option" aria-selected="false" id="' + optId(i) + '" data-i="' + i + '" href="' + esc(it.href) + '">' +
      (rank ? '<span class="wvqs-rank">' + rank + '</span>' : '') +
      artHTML(it, 40) +
      '<div class="wvqs-meta"><div class="wvqs-t">' + (q ? hl(it.title, q) : esc(it.title)) + '</div>' +
      '<div class="wvqs-s">' + esc(it.sub) + (o.plays ? ' · ' + esc(fmtPlays(o.plays)) : '') + '</div></div>' +
      playBtn(it) + '</a>';
  }
  function topHTML(o, i, q) {
    var it = o.item;
    var sub = String(it.sub || '');
    var dot = sub.indexOf(' · ');
    var rest = dot >= 0 ? sub.slice(dot + 3) : '';
    return '<a class="wvqs-top" role="option" aria-selected="false" id="' + optId(i) + '" data-i="' + i + '" href="' + esc(it.href) + '">' +
      artHTML(it, 76) +
      '<div class="wvqs-meta"><div class="wvqs-t">' + hl(it.title, q) + '</div>' +
      '<div class="wvqs-s"><span class="wvqs-pill">' + esc(it.type || '') + '</span>' + (rest ? '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(rest) + '</span>' : '') + '</div></div>' +
      playBtn(it) + '</a>';
  }
  function allHTML(i, q) {
    return '<a class="wvqs-all" role="option" aria-selected="false" id="' + optId(i) + '" data-i="' + i + '" href="/search?q=' + esc(enc(q)) + '">' +
      IC.search + '<span>See all results for “' + esc(q) + '”</span><kbd>Tab</kbd></a>';
  }
  function skeletonHTML() {
    var row = function (w1, w2) {
      return '<div class="wvqs-sk" aria-hidden="true"><i style="width:40px;height:40px;"></i><div style="flex:1;display:grid;gap:7px;"><i style="height:11px;width:' + w1 + '%;"></i><i style="height:9px;width:' + w2 + '%;"></i></div></div>';
    };
    return '<div class="wvqs-sk top" aria-hidden="true"><i style="width:76px;height:76px;"></i><div style="flex:1;display:grid;gap:10px;"><i style="height:16px;width:58%;"></i><i style="height:11px;width:34%;"></i></div></div>' +
      '<div class="wvqs-h">Searching</div>' + row(62, 38) + row(48, 30) + row(70, 44) + row(54, 26);
  }

  function paint(box, html) {
    box.innerHTML = '<div class="wvqs-bar" aria-hidden="true"></div>' + html;
    setActive(S.active, true);
  }

  function renderEmpty(inp) {
    var box = getBox(inp, true);
    S.inp = inp; S.q = ''; S.shown = 'empty';
    inp.setAttribute('aria-expanded', 'true');
    var rec = recent();
    var opts = [], html = '';
    if (rec.length) {
      html += '<div class="wvqs-h"><span class="wvqs-hic">' + IC.clock + 'Recent searches</span><button type="button" data-act="clear" aria-label="Clear recent searches">Clear</button></div><div class="wvqs-chips">';
      rec.forEach(function (q) {
        var i = opts.length;
        opts.push({ type: 'recent', q: q });
        html += '<span class="wvqs-chip" role="option" aria-selected="false" id="' + optId(i) + '" data-i="' + i + '" title="' + esc(q) + '"><span>' + esc(q) + '</span>' +
          '<i class="wvqs-x" role="button" tabindex="-1" data-act="forget" aria-label="Remove ' + esc(q) + ' from recent searches">' + IC.x + '</i></span>';
      });
      html += '</div>';
    }
    var tr = _trend;
    if (tr && tr.length) {
      html += '<div class="wvqs-h"><span class="wvqs-hic">' + IC.fire + 'Trending now</span></div>';
      tr.forEach(function (it, k) {
        var i = opts.length;
        var o = { type: 'row', item: it, plays: it.plays };
        opts.push(o);
        html += rowHTML(o, i, '', k + 1);
      });
    } else if (!S.trendFailed) {
      html += '<div class="wvqs-h"><span class="wvqs-hic">' + IC.fire + 'Trending now</span></div>' + skeletonRows(3);
    }
    if (!opts.length && S.trendFailed) {
      html += '<div class="wvqs-empty"><b>search wavernrs</b>comps, edits, editors and the whole ye archive</div>';
    }
    html += '<div class="wvqs-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>Shift</kbd><kbd>↵</kbd> play</span></div>';
    S.opts = opts;
    if (S.active >= opts.length) S.active = -1;
    box.classList.remove('is-loading');
    paint(box, html);
    if (!_trend && !S.trendFailed) {
      var seq = S.seq;
      trending().then(function (list) {
        if (!list || !list.length) S.trendFailed = true;
        if (seq !== S.seq || S.shown !== 'empty' || S.inp !== inp) return;
        if (document.getElementById(boxId(inp))) renderEmpty(inp);
      });
    }
  }
  function skeletonRows(n) {
    var out = '';
    for (var k = 0; k < n; k++) {
      out += '<div class="wvqs-sk" aria-hidden="true"><i style="width:16px;height:12px;"></i><i style="width:40px;height:40px;"></i><div style="flex:1;display:grid;gap:7px;"><i style="height:11px;width:' + (60 - k * 9) + '%;"></i><i style="height:9px;width:' + (36 - k * 4) + '%;"></i></div></div>';
    }
    return out;
  }

  function renderLoading(inp, q) {
    var box = getBox(inp, true);
    S.inp = inp; S.q = q;
    inp.setAttribute('aria-expanded', 'true');
    box.classList.add('is-loading');
    if (S.shown === 'results') {
      S.opts.forEach(function (o, i) {
        if (o.type !== 'all') return;
        o.q = q;
        var el = document.getElementById(optId(i));
        if (el) { el.setAttribute('href', '/search?q=' + enc(q)); var sp = el.querySelector('span'); if (sp) sp.textContent = 'See all results for “' + q + '”'; }
      });
      return;
    }
    S.shown = 'loading';
    S.opts = [{ type: 'all', q: q }];
    S.active = -1;
    paint(box, skeletonHTML() + allHTML(0, q));
  }

  function renderResults(inp, q, res) {
    var box = getBox(inp, true);
    S.inp = inp; S.q = q; S.shown = 'results';
    inp.setAttribute('aria-expanded', 'true');
    box.classList.remove('is-loading');
    var opts = [], html = '';
    if (res && res.top) {
      opts.push({ type: 'top', item: res.top });
      html += '<div class="wvqs-h">Top result</div>' + topHTML(opts[0], 0, q);
    }
    (res && res.groups || []).forEach(function (g) {
      html += '<div class="wvqs-h" role="presentation">' + esc(g.label) + '</div><div role="group" aria-label="' + esc(g.label) + '">';
      g.items.forEach(function (it) {
        var i = opts.length;
        var o = { type: 'row', item: it };
        opts.push(o);
        html += rowHTML(o, i, q);
      });
      html += '</div>';
    });
    if (!opts.length) {
      html += res && res.error
        ? '<div class="wvqs-empty"><b>search is having a moment</b>check your connection and try again</div>'
        : '<div class="wvqs-empty"><b>no quick matches for “' + esc(q) + '”</b>try the full search for deeper results</div>';
    }
    var ai = opts.length;
    opts.push({ type: 'all', q: q });
    html += allHTML(ai, q);
    S.opts = opts;
    S.active = -1;
    paint(box, html);
  }

  function setActive(i, silent) {
    var box = S.inp && document.getElementById(boxId(S.inp));
    S.active = i;
    if (!box) return;
    var prev = box.querySelectorAll('.is-active');
    for (var k = 0; k < prev.length; k++) { prev[k].classList.remove('is-active'); prev[k].setAttribute('aria-selected', 'false'); }
    if (i < 0 || i >= S.opts.length) {
      if (S.inp) S.inp.removeAttribute('aria-activedescendant');
      return;
    }
    var el = document.getElementById(optId(i));
    if (!el) return;
    el.classList.add('is-active');
    el.setAttribute('aria-selected', 'true');
    if (S.inp) S.inp.setAttribute('aria-activedescendant', optId(i));
    if (!silent) {
      try { el.scrollIntoView({ block: 'nearest' }); } catch (_) {}
    }
  }
  function move(d) {
    var n = S.opts.length;
    if (!n) return;
    var i = S.active + d;
    if (i >= n) i = 0;
    if (i < -1) i = n - 1;
    if (i === -1) i = d > 0 ? 0 : n - 1;
    setActive(i);
  }

  // ── actions ───────────────────────────────────────────────────────────────
  function go(href) {
    close();
    if (S.inp) { try { S.inp.blur(); } catch (_) {} }
    if (typeof navigate === 'function') navigate(href); else location.href = href;
  }
  function activate(o, e) {
    if (!o) return;
    var inp = S.inp;
    if (o.type === 'recent') {
      if (inp) { inp.value = o.q; inp.focus(); run(inp); }
      return;
    }
    if (o.type === 'all') {
      var q = o.q || (inp && inp.value.trim()) || '';
      remember(q);
      close();
      if (inp) { try { inp.blur(); } catch (_) {} }
      if (typeof navSearch === 'function') navSearch(q); else go('/search?q=' + enc(q));
      return;
    }
    if (S.q) remember(S.q);
    if (e && e.shiftKey && o.item.play) { play(o.item); refreshPlayState(); return; }
    if (e && (e.metaKey || e.ctrlKey)) { window.open(o.item.href, '_blank', 'noopener'); return; }
    go(o.item.href);
  }
  function refreshPlayState() {
    setTimeout(function () {
      var box = S.inp && document.getElementById(boxId(S.inp));
      if (!box) return;
      box.querySelectorAll('[data-i]').forEach(function (el) {
        var o = S.opts[+el.getAttribute('data-i')];
        if (!o || !o.item || !o.item.play) return;
        var btn = el.querySelector('.wvqs-play');
        if (!btn) return;
        var on = isPlaying(o.item);
        btn.classList.toggle('is-on', on);
        btn.innerHTML = on ? IC.pause : IC.play;
        btn.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + (o.item.title || ''));
        btn.title = on ? 'Pause' : 'Play';
      });
    }, 60);
  }
  var _audioHooked = false;
  function hookAudio() {
    if (_audioHooked) return;
    var a = aud();
    if (!a || !a.addEventListener) return;
    _audioHooked = true;
    ['play', 'pause', 'emptied'].forEach(function (ev) { a.addEventListener(ev, refreshPlayState); });
  }

  function onBoxMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
  }
  function onBoxMove(e) {
    var el = e.target.closest && e.target.closest('[data-i]');
    if (!el) return;
    var i = +el.getAttribute('data-i');
    if (i !== S.active) setActive(i, true);
  }
  function onBoxClick(e) {
    var t = e.target;
    var box = e.currentTarget;
    var act = t.closest && t.closest('[data-act]');
    if (act && box.contains(act)) {
      e.preventDefault(); e.stopPropagation();
      var a = act.getAttribute('data-act');
      if (a === 'clear') { clearRecent(); if (S.inp) renderEmpty(S.inp); return; }
      var host = act.closest('[data-i]');
      var o = host ? S.opts[+host.getAttribute('data-i')] : null;
      if (a === 'forget' && o) { forget(o.q); S.active = -1; if (S.inp) renderEmpty(S.inp); return; }
      if (a === 'play' && o && o.item) { if (S.q) remember(S.q); play(o.item); hookAudio(); refreshPlayState(); return; }
      return;
    }
    var row = t.closest && t.closest('[data-i]');
    if (!row) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
      var ob = S.opts[+row.getAttribute('data-i')];
      if (ob && ob.q && ob.type === 'all') remember(ob.q);
      else if (S.q) remember(S.q);
      return;
    }
    e.preventDefault();
    activate(S.opts[+row.getAttribute('data-i')], null);
  }

  // ── input handling ────────────────────────────────────────────────────────
  function run(inp) {
    attach(inp);
    hookAudio();
    styleOnce();
    var q = String(inp.value || '').trim();
    clearTimeout(S.timer);
    if (S.inp && S.inp !== inp) close();
    S.inp = inp;
    if (q.length < 2) {
      if (S.shown === 'empty' && document.getElementById(boxId(inp))) return;
      S.active = -1;
      renderEmpty(inp);
      return;
    }
    var hit = cacheGet(key(q));
    if (hit) { renderResults(inp, q, hit); return; }
    renderLoading(inp, q);
    var seq = ++S.seq;
    S.timer = setTimeout(function () {
      search(q).then(function (res) {
        if (seq !== S.seq || S.inp !== inp) return;
        if (document.activeElement !== inp) return;
        if (String(inp.value || '').trim() !== q) return;
        renderResults(inp, q, res);
      });
    }, DEBOUNCE);
  }

  // Keys are taken in the capture phase so Enter on a highlighted row wins
  // over the input's own inline "Enter searches" handler.
  document.addEventListener('keydown', function (e) {
    var inp = e.target;
    if (!isQs(inp)) return;
    if (e.isComposing) return;
    var box = document.getElementById(boxId(inp));
    var k = e.key;
    if (k === 'Enter') {
      var q = String(inp.value || '').trim();
      if (box && S.inp === inp && S.active >= 0 && S.opts[S.active]) {
        e.preventDefault(); e.stopPropagation();
        activate(S.opts[S.active], e);
        return;
      }
      if (q.length >= 2) { remember(q); close(); }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      if (!box) { run(inp); return; }
      e.preventDefault();
      move(k === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (k === 'Tab' && box && !e.shiftKey) {
      var ai = -1;
      for (var i = 0; i < S.opts.length; i++) if (S.opts[i].type === 'all') ai = i;
      if (ai >= 0 && S.active !== ai) { e.preventDefault(); setActive(ai); }
      return;
    }
    if (k === 'Escape') {
      if (box) { e.preventDefault(); close(); }
      else if (inp.value) { inp.value = ''; }
      else { try { inp.blur(); } catch (_) {} }
    }
  }, true);

  // The Apple Music skin's sidebar search has no suggest hook of its own.
  document.addEventListener('focusin', function (e) { if (isSide(e.target)) run(e.target); });
  document.addEventListener('input', function (e) { if (isSide(e.target)) run(e.target); });
  document.addEventListener('mousedown', function (e) {
    var side = document.getElementById('wv-qs-side');
    if (!side) return;
    if (side.contains(e.target) || (e.target.closest && e.target.closest('.am-search'))) return;
    close();
  }, true);
  window.addEventListener('resize', function () {
    var side = document.getElementById('wv-qs-side');
    if (side && S.inp && isSide(S.inp)) placeSide(S.inp, side);
  });
  window.addEventListener('popstate', close);
  window.addEventListener('wv-navigate', close);
  document.addEventListener('wv-navigate', close);

  // "/" when the topbar search is hidden (Apple skin) focuses the sidebar one.
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    var top = document.getElementById('wv-search-inp');
    if (top && top.offsetParent) return;
    var side = document.querySelector('.am-search-inp');
    if (side && side.offsetParent) {
      e.preventDefault(); e.stopPropagation();
      side.focus();
    }
  }, true);

  // ── public ────────────────────────────────────────────────────────────────
  window._topbarSuggest = function (inp) {
    try { run(inp); } catch (err) { try { console.warn('quicksearch', err); } catch (_) {} }
  };

  var QS = function (inp) { if (inp) window._topbarSuggest(inp); };
  QS._v = 2;
  QS.fetch = search;
  QS.trending = trending;
  QS.hl = hl;
  QS.esc = esc;
  QS.norm = norm;
  QS.matchScore = matchScore;
  QS.play = play;
  QS.isPlaying = isPlaying;
  QS.recent = recent;
  QS.remember = remember;
  QS.forget = forget;
  QS.clearRecent = clearRecent;
  QS.close = close;
  window.wvQuickSearch = QS;

  // If the input already has focus (fast typers), take over right away.
  try {
    var a = document.activeElement;
    if (a && isQs(a)) run(a);
  } catch (_) {}
  // Warm the trending list quietly so the first focus paints instantly.
  setTimeout(function () { trending(); }, 2500);
})();
