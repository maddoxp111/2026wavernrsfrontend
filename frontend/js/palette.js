// ── Command palette (Cmd/Ctrl+K) ────────────────────────────────────────────
// One keystroke to reach any page, run any action or find any piece of music.
// Self-contained: injects its own CSS, reuses the quick-search core from
// quicksearch.js for live results when it is loaded, and degrades to local
// commands plus a full-search row when it isn't. Also owns the G-then-key
// go-to shortcuts and a grouped keyboard shortcuts sheet.
(function () {
  'use strict';
  if (typeof window.wvOpenPalette === 'function') return;

  var API = (typeof API_BASE !== 'undefined' && API_BASE) || 'https://2026wavernrs-production.up.railway.app/api';
  var IS_MAC = /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '');
  var MOD = IS_MAC ? '⌘' : 'Ctrl';
  var RECENT_KEY = 'wv_palette_recent';
  var BLOCKERS = ['wv-lockscreen', 'wv-cd-overlay', 'wv-review-overlay', 'wv-down'];

  // ── utils ─────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } }
  function phone() { try { return window.matchMedia('(max-width: 640px)').matches; } catch (_) { return false; } }
  function img(url, px) { if (!url) return ''; try { return typeof wvImg === 'function' ? wvImg(url, px) : url; } catch (_) { return url; } }
  function grad(seed) { try { return typeof coverGradient === 'function' ? coverGradient(seed || '') : 'var(--surface-2)'; } catch (_) { return 'var(--surface-2)'; } }
  function toast(m, k) { if (typeof wvToast === 'function') wvToast(m, k); }
  function loggedIn() { try { return !!localStorage.getItem('token'); } catch (_) { return false; } }
  function sess(k) { try { return sessionStorage.getItem(k) === 'true'; } catch (_) { return false; } }
  function QS() { return typeof window.wvQuickSearch === 'function' ? window.wvQuickSearch : null; }
  function cur() { try { return typeof currentTrack !== 'undefined' ? currentTrack : null; } catch (_) { return null; } }
  function aud() { try { return typeof audio !== 'undefined' ? audio : null; } catch (_) { return null; } }
  function go(href) { if (typeof navigate === 'function') navigate(href); else location.href = href; }
  function isTyping(t) { return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)); }

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
  function isWordStart(t, i) { return i === 0 || /[^a-z0-9]/.test(t[i - 1]); }

  // Fuzzy: a contiguous hit scores highest (more at the start or a word
  // start), then an in-order subsequence with bonuses for word starts and
  // runs. Returns original-string positions for highlighting.
  function fuzzy(q, text) {
    var m = normMap(text), t = m.s;
    var qq = norm(q).trim();
    if (!qq || !t) return null;
    var idx = t.indexOf(qq);
    if (idx >= 0) {
      var sc = 1000 - idx * 3 - (t.length - qq.length) * 0.6;
      if (idx === 0) sc += 400; else if (isWordStart(t, idx)) sc += 220;
      var pos = [];
      for (var k = 0; k < qq.length; k++) pos.push(m.map[idx + k]);
      return { score: sc, pos: pos };
    }
    var qs = qq.replace(/\s+/g, '');
    if (qs.length < 2) return null;
    var ti = 0, score = 400, run = 0, starts = 0, first = -1, last = -1, positions = [];
    for (var qi = 0; qi < qs.length; qi++) {
      var c = qs[qi], found = -1;
      // Prefer the next word start that holds this char, if it is close.
      for (var j = ti; j < t.length; j++) {
        if (t[j] === c) {
          if (found < 0) found = j;
          if (isWordStart(t, j)) { if (j - found < 12) found = j; break; }
          if (run > 0) break;
        }
      }
      if (found < 0) return null;
      if (first < 0) first = found;
      if (last >= 0 && found === last + 1) { run++; score += 18 * run; } else { run = 0; score -= Math.min(20, found - ti); }
      if (isWordStart(t, found)) { score += 30; starts++; }
      positions.push(m.map[found]);
      last = found; ti = found + 1;
    }
    var span = last - first + 1;
    if (span > qs.length * 4 && starts < Math.ceil(qs.length / 3)) return null;
    score -= first * 2;
    return { score: score, pos: positions };
  }
  function hlPos(text, pos) {
    text = String(text == null ? '' : text);
    if (!pos || !pos.length) return esc(text);
    var set = {};
    pos.forEach(function (p) { set[p] = 1; });
    var out = '', open = false;
    for (var i = 0; i < text.length; i++) {
      var on = !!set[i];
      if (on && !open) { out += '<mark>'; open = true; }
      if (!on && open) { out += '</mark>'; open = false; }
      out += esc(text[i]);
    }
    if (open) out += '</mark>';
    return out;
  }

  // ── icons (24 grid, filled, same weight as the shell's) ───────────────────
  function svg(inner, w) { return '<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + inner + '</svg>'; }
  function stroke(inner, w) { return '<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>'; }
  var I = {
    home: svg('<path d="M11.2 2.6a1.25 1.25 0 0 1 1.6 0l8.4 7a1.2 1.2 0 0 1 .43.92v8.9A2.6 2.6 0 0 1 19.03 22H15.4a.85.85 0 0 1-.85-.85V16.4a2.55 2.55 0 0 0-5.1 0v4.75A.85.85 0 0 1 8.6 22H4.97a2.6 2.6 0 0 1-2.6-2.58v-8.9c0-.36.16-.7.43-.92Z"/>'),
    browse: svg('<path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm4.05 5.25-2.42 5.68a1.2 1.2 0 0 1-.63.63l-5.68 2.42a.5.5 0 0 1-.66-.66l2.42-5.68c.12-.29.34-.51.63-.63l5.68-2.42a.5.5 0 0 1 .66.66Z"/>'),
    chart: svg('<rect x="3.1" y="12.3" width="4.7" height="8.6" rx="1.7"/><rect x="9.65" y="7" width="4.7" height="13.9" rx="1.7"/><rect x="16.2" y="3.1" width="4.7" height="17.8" rx="1.7"/>'),
    list: svg('<rect x="3" y="5.1" width="18" height="2.7" rx="1.35"/><rect x="3" y="10.65" width="18" height="2.7" rx="1.35"/><rect x="3" y="16.2" width="11.5" height="2.7" rx="1.35"/>'),
    mic: svg('<path d="M12 2.2a3.8 3.8 0 0 0-3.8 3.8v5.6a3.8 3.8 0 0 0 7.6 0V6A3.8 3.8 0 0 0 12 2.2Z"/><path d="M18.4 10.6a.9.9 0 0 0-.9.9 5.5 5.5 0 0 1-11 0 .9.9 0 1 0-1.8 0 7.3 7.3 0 0 0 6.4 7.25V21H8.6a.9.9 0 1 0 0 1.8h6.8a.9.9 0 1 0 0-1.8h-2.5v-2.25a7.3 7.3 0 0 0 6.4-7.25.9.9 0 0 0-.9-.9Z"/>'),
    profile: svg('<circle cx="12" cy="7.7" r="4.4"/><path d="M12 13.8c-4.35 0-7.9 2.63-7.9 5.87 0 .9.73 1.63 1.63 1.63h12.54c.9 0 1.63-.73 1.63-1.63 0-3.24-3.54-5.87-7.9-5.87Z"/>'),
    feed: svg('<circle cx="8.9" cy="8" r="3.7"/><path d="M8.9 13.5c-3.65 0-6.65 2.2-6.65 4.95 0 .8.65 1.45 1.45 1.45h10.4c.8 0 1.45-.65 1.45-1.45 0-2.75-3-4.95-6.65-4.95Z"/><circle cx="17.5" cy="9.5" r="2.85"/><path d="M17.5 13.9c-.72 0-1.4.09-2.02.26a6.6 6.6 0 0 1 2.12 4.29c0 .3-.03.6-.1.89h3.26c.8 0 1.45-.65 1.45-1.45 0-2.2-2.11-3.99-4.71-3.99Z"/>'),
    community: svg('<path d="M8.5 3.3h9A4.7 4.7 0 0 1 22.2 8v4.3a4.7 4.7 0 0 1-4.7 4.7h-.6l-3.16 2.96a1 1 0 0 1-1.69-.73V17H8.5a4.7 4.7 0 0 1-4.7-4.7V8a4.7 4.7 0 0 1 4.7-4.7Z"/>'),
    grid: svg('<circle cx="7" cy="7" r="3.1"/><circle cx="17" cy="7" r="3.1"/><circle cx="7" cy="17" r="3.1"/><circle cx="17" cy="17" r="3.1"/>'),
    archive: svg('<rect x="2.7" y="3.5" width="18.6" height="4.7" rx="1.7"/><path fill-rule="evenodd" d="M4.35 9.9h15.3v8.2a2.7 2.7 0 0 1-2.7 2.7H7.05a2.7 2.7 0 0 1-2.7-2.7Zm4.9 2.95a1.25 1.25 0 1 0 0 2.5h5.5a1.25 1.25 0 0 0 0-2.5Z"/>'),
    folder: svg('<path d="M3.1 6.35A2.65 2.65 0 0 1 5.75 3.7h3.3c.7 0 1.38.28 1.87.78l1.1 1.1h6.23a2.65 2.65 0 0 1 2.65 2.65v9.42a2.65 2.65 0 0 1-2.65 2.65H5.75A2.65 2.65 0 0 1 3.1 17.65Z"/>'),
    upload: svg('<path d="M12 2.7c.35 0 .68.14.92.39l4.2 4.2a1.3 1.3 0 0 1-1.84 1.84l-1.98-1.98V15a1.3 1.3 0 0 1-2.6 0V7.15L8.72 9.13A1.3 1.3 0 1 1 6.88 7.29l4.2-4.2c.24-.25.57-.39.92-.39Z"/><path d="M4.4 14.4a1.3 1.3 0 0 1 1.3 1.3v2.45c0 .28.22.5.5.5h11.6c.28 0 .5-.22.5-.5V15.7a1.3 1.3 0 1 1 2.6 0v2.45a3.1 3.1 0 0 1-3.1 3.1H6.2a3.1 3.1 0 0 1-3.1-3.1V15.7a1.3 1.3 0 0 1 1.3-1.3Z"/>'),
    settings: svg('<path fill-rule="evenodd" d="M12 3.4a1.5 1.5 0 0 1 1.5 1.5v.98c.54.14 1.05.35 1.52.62l.7-.7a1.5 1.5 0 1 1 2.12 2.13l-.7.69c.27.47.48.98.62 1.52h.98a1.5 1.5 0 0 1 0 3h-.98c-.14.54-.35 1.05-.62 1.52l.7.7a1.5 1.5 0 0 1-2.13 2.12l-.69-.7c-.47.27-.98.48-1.52.62v.98a1.5 1.5 0 0 1-3 0v-.98a6.5 6.5 0 0 1-1.52-.62l-.7.7a1.5 1.5 0 1 1-2.12-2.13l.7-.69a6.5 6.5 0 0 1-.62-1.52H4.9a1.5 1.5 0 0 1 0-3h.98c.14-.54.35-1.05.62-1.52l-.7-.7A1.5 1.5 0 0 1 7.93 6.8l.69.7c.47-.27.98-.48 1.52-.62V4.9a1.5 1.5 0 0 1 1.5-1.5Zm0 5.15a3.45 3.45 0 1 0 0 6.9 3.45 3.45 0 0 0 0-6.9Z"/>'),
    shield: svg('<path d="M11.6 2.35a1.1 1.1 0 0 1 .8 0l6.9 2.7c.42.17.7.57.7 1.02v5.24c0 4.65-3.15 8.97-7.72 10.44a.9.9 0 0 1-.56 0C7.15 20.28 4 15.96 4 11.31V6.07c0-.45.28-.85.7-1.02Z"/>'),
    info: svg('<path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm0 3.5a1.55 1.55 0 1 1 0 3.1 1.55 1.55 0 0 1 0-3.1Zm1.4 11.6h-2.8v-6.7h2.8Z"/>'),
    search: svg('<path fill-rule="evenodd" d="M10.7 2.7a8.05 8.05 0 1 0 4.9 14.44l3.62 3.62a1.4 1.4 0 0 0 1.98-1.98l-3.62-3.62A8.05 8.05 0 0 0 10.7 2.7Zm0 2.8a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Z"/>'),
    radio: stroke('<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>'),
    headphones: stroke('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>'),
    history: svg('<path d="M13 3a9 9 0 1 1-8.66 11.3l1.94-.5A7 7 0 1 0 8.5 6.5L11 9H4V2l2.6 2.6A9 9 0 0 1 13 3Zm-1 4h2v5.2l3.6 2.1-1 1.7L12 13.4Z"/>'),
    playlist: svg('<rect x="3" y="4.6" width="13" height="2.6" rx="1.3"/><rect x="3" y="9.7" width="13" height="2.6" rx="1.3"/><rect x="3" y="14.8" width="8" height="2.6" rx="1.3"/><path d="M17.2 9.2c0-.6.64-.97 1.16-.67l3.2 1.85a.77.77 0 0 1 0 1.34l-3.2 1.85a.77.77 0 0 1-1.16-.67Z" transform="translate(-1 5)"/>'),
    tracker: svg('<path d="M5.2 3.3h13.6a2 2 0 0 1 2 2v13.4a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2V5.3a2 2 0 0 1 2-2Zm2.3 4.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.3.25a.85.85 0 1 0 0 1.7h5.9a.85.85 0 1 0 0-1.7Zm-3.3 3.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.3.25a.85.85 0 1 0 0 1.7h5.9a.85.85 0 1 0 0-1.7Zm-3.3 3.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.3.25a.85.85 0 1 0 0 1.7h3.9a.85.85 0 1 0 0-1.7Z"/>'),
    games: svg('<path d="M7.3 6.5h9.4a5 5 0 0 1 4.93 4.17l.9 5.3a2.75 2.75 0 0 1-4.72 2.35l-2.05-2.22H8.24l-2.05 2.22a2.75 2.75 0 0 1-4.72-2.35l.9-5.3A5 5 0 0 1 7.3 6.5Zm.45 3.1a.9.9 0 0 0-.9.9v.9h-.9a.9.9 0 1 0 0 1.8h.9v.9a.9.9 0 1 0 1.8 0v-.9h.9a.9.9 0 1 0 0-1.8h-.9v-.9a.9.9 0 0 0-.9-.9Zm8.35.4a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm-1.9 2.4a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z"/>'),
    stats: svg('<path d="M4.3 3.2a1.1 1.1 0 0 1 1.1 1.1v14.1c0 .17.13.3.3.3h14a1.1 1.1 0 0 1 0 2.2h-14a2.5 2.5 0 0 1-2.5-2.5V4.3a1.1 1.1 0 0 1 1.1-1.1Z"/><path d="M19.9 7.1a1.1 1.1 0 0 1 .05 1.55l-4.2 4.5a1.1 1.1 0 0 1-1.52.08l-2.35-2-3.1 3.3a1.1 1.1 0 0 1-1.6-1.5l3.8-4.05a1.1 1.1 0 0 1 1.52-.08l2.34 2 3.5-3.75a1.1 1.1 0 0 1 1.56-.05Z"/>'),
    pulse: stroke('<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>'),
    sparkle: svg('<path d="M12 2.5c.4 0 .74.28.82.67l.72 3.49a5.3 5.3 0 0 0 4.14 4.14l3.49.72a.84.84 0 0 1 0 1.64l-3.49.72a5.3 5.3 0 0 0-4.14 4.14l-.72 3.49a.84.84 0 0 1-1.64 0l-.72-3.49a5.3 5.3 0 0 0-4.14-4.14l-3.49-.72a.84.84 0 0 1 0-1.64l3.49-.72a5.3 5.3 0 0 0 4.14-4.14l.72-3.49A.84.84 0 0 1 12 2.5Z"/>'),
    bell: svg('<path d="M12 2.5A6.5 6.5 0 0 0 5.5 9c0 3.1-.7 5.02-1.53 6.25A1.2 1.2 0 0 0 4.97 17.1h14.06a1.2 1.2 0 0 0 1-1.85C19.2 14.02 18.5 12.1 18.5 9A6.5 6.5 0 0 0 12 2.5Z"/><path d="M9.35 18.55a2.75 2.75 0 0 0 5.3 0Z"/>'),
    trophy: svg('<path d="M7 3h10a1 1 0 0 1 1 1v1h2.1a1 1 0 0 1 1 1.05c-.2 3.2-2.02 5.33-4.63 5.9A6.02 6.02 0 0 1 13 15.9V18h2.6a1.3 1.3 0 0 1 1.3 1.3v.9a.8.8 0 0 1-.8.8H7.9a.8.8 0 0 1-.8-.8v-.9A1.3 1.3 0 0 1 8.4 18H11v-2.1a6.02 6.02 0 0 1-3.47-3.95C4.92 11.38 3.1 9.25 2.9 6.05A1 1 0 0 1 3.9 5H6V4a1 1 0 0 1 1-1Zm11 4v2.3c0 .3-.02.6-.05.88 1.1-.52 1.8-1.54 2.02-3.18Zm-12 0H4.03c.22 1.64.92 2.66 2.02 3.18A6.6 6.6 0 0 1 6 9.3Z"/>'),
    megaphone: svg('<path d="M18.6 3.4a1.2 1.2 0 0 1 1.9.97v13.26a1.2 1.2 0 0 1-1.9.97L14 15.3H9.9l.9 4.1a1.3 1.3 0 0 1-1.27 1.6h-1.1a1.3 1.3 0 0 1-1.25-.95L6 15.2A4.6 4.6 0 0 1 6.9 6.1H14Z"/>'),
    disc: svg('<path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm0 6.3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>'),
    calendar: svg('<path d="M7.5 2.5a1 1 0 0 1 1 1v1h7v-1a1 1 0 1 1 2 0v1h.7A2.8 2.8 0 0 1 21 7.3v11.4a2.8 2.8 0 0 1-2.8 2.8H5.8A2.8 2.8 0 0 1 3 18.7V7.3a2.8 2.8 0 0 1 2.8-2.8h.7v-1a1 1 0 0 1 1-1ZM5 10v8.7c0 .44.36.8.8.8h12.4a.8.8 0 0 0 .8-.8V10Zm3 2.2h2.6v2.6H8Z"/>'),
    timeline: svg('<circle cx="5.5" cy="6" r="2.5"/><circle cx="5.5" cy="18" r="2.5"/><rect x="4.6" y="8" width="1.8" height="8" rx=".9"/><rect x="10" y="4.7" width="11" height="2.6" rx="1.3"/><rect x="10" y="16.7" width="8" height="2.6" rx="1.3"/><rect x="10" y="10.7" width="6" height="2.6" rx="1.3"/>'),
    chat: svg('<path d="M12 3c5.1 0 9.2 3.58 9.2 8s-4.1 8-9.2 8c-1.1 0-2.15-.17-3.12-.47l-3.66 1.55a.9.9 0 0 1-1.22-1.02l.63-2.95C3.53 14.7 2.8 12.93 2.8 11c0-4.42 4.1-8 9.2-8Z"/>'),
    quiz: svg('<path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm-.05 4.2c-1.95 0-3.2 1.1-3.35 2.7a1.05 1.05 0 0 0 2.09.2c.06-.6.5-.92 1.24-.92.8 0 1.27.42 1.27 1.02 0 .52-.26.84-1 1.3-.97.6-1.47 1.25-1.4 2.37v.33a1.05 1.05 0 0 0 2.1 0v-.24c0-.47.2-.72.93-1.17.98-.61 1.52-1.37 1.52-2.5 0-1.8-1.47-3.09-3.4-3.09Zm.05 9a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"/>'),
    shirt: svg('<path d="M8.6 3.2a1 1 0 0 1 .97.76 2.5 2.5 0 0 0 4.86 0 1 1 0 0 1 .97-.76c.2 0 .4.06.56.17l5.1 3.4a1 1 0 0 1 .33 1.3l-1.6 3a1 1 0 0 1-1.3.43l-1.19-.55V19a1.8 1.8 0 0 1-1.8 1.8H8.5A1.8 1.8 0 0 1 6.7 19v-8.05l-1.19.55a1 1 0 0 1-1.3-.43l-1.6-3a1 1 0 0 1 .33-1.3l5.1-3.4c.17-.11.36-.17.56-.17Z"/>'),
    pin: svg('<path d="M12 2.4a7.6 7.6 0 0 1 7.6 7.6c0 5.12-5.52 10.3-6.88 11.5a1.1 1.1 0 0 1-1.44 0C9.92 20.3 4.4 15.12 4.4 10A7.6 7.6 0 0 1 12 2.4Zm0 4.6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>'),
    play: svg('<path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z"/>'),
    pause: svg('<rect x="6" y="4.5" width="4.2" height="15" rx="1.3"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3"/>'),
    next: svg('<path d="M4.5 6.3v11.4c0 .83.93 1.32 1.62.85L14 13.1v4.6a1.1 1.1 0 0 0 2.2 0V6.3a1.1 1.1 0 0 0-2.2 0v4.6L6.12 5.45c-.7-.47-1.62.02-1.62.85Z" transform="translate(2.2 0)"/>'),
    prev: svg('<path d="M19.5 6.3v11.4c0 .83-.93 1.32-1.62.85L10 13.1v4.6a1.1 1.1 0 0 1-2.2 0V6.3a1.1 1.1 0 0 1 2.2 0v4.6l7.88-5.45c.7-.47 1.62.02 1.62.85Z" transform="translate(-2.2 0)"/>'),
    shuffle: stroke('<path d="M16 3.5h4.5V8M4 19.5 20.5 3.5M20.5 16v4.5H16M14.5 14.5l6 6M4 4.5l5 5"/>'),
    repeat: stroke('<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
    volume: svg('<path d="M11.1 4.2a1 1 0 0 1 1.65.77v14.06a1 1 0 0 1-1.65.77L6.8 16.2H4.4a1.9 1.9 0 0 1-1.9-1.9V9.7a1.9 1.9 0 0 1 1.9-1.9h2.4Z"/><path d="M16.2 8.1a1 1 0 0 1 1.4.1 5.9 5.9 0 0 1 0 7.6 1 1 0 1 1-1.5-1.3 3.9 3.9 0 0 0 0-5 1 1 0 0 1 .1-1.4Z"/>'),
    mute: svg('<path d="M11.1 4.2a1 1 0 0 1 1.65.77v14.06a1 1 0 0 1-1.65.77L6.8 16.2H4.4a1.9 1.9 0 0 1-1.9-1.9V9.7a1.9 1.9 0 0 1 1.9-1.9h2.4Z"/><path d="M15.5 9.3a1 1 0 0 1 1.4 0l1.35 1.35 1.35-1.35a1 1 0 1 1 1.4 1.4L19.65 12.05l1.35 1.35a1 1 0 0 1-1.4 1.4l-1.35-1.35-1.35 1.35a1 1 0 0 1-1.4-1.4l1.35-1.35-1.35-1.35a1 1 0 0 1 0-1.4Z"/>'),
    expand: stroke('<path d="M14.5 3.5h6v6M9.5 20.5h-6v-6M20.5 3.5 14 10M3.5 20.5 10 14"/>'),
    queue: svg('<rect x="3" y="4.5" width="13" height="2.6" rx="1.3"/><rect x="3" y="10.7" width="13" height="2.6" rx="1.3"/><rect x="3" y="16.9" width="9" height="2.6" rx="1.3"/><circle cx="18.6" cy="18.2" r="2.6"/><rect x="20" y="8" width="1.9" height="10" rx=".95"/>'),
    heart: svg('<path d="M12 20.6a1 1 0 0 1-.55-.17C8.2 18.3 2.6 14.2 2.6 8.9A5.2 5.2 0 0 1 12 5.84 5.2 5.2 0 0 1 21.4 8.9c0 5.3-5.6 9.4-8.85 11.53a1 1 0 0 1-.55.17Z"/>'),
    link: stroke('<path d="M10 14a4.5 4.5 0 0 0 6.36 0l3.18-3.18a4.5 4.5 0 0 0-6.36-6.36L11.6 6.04"/><path d="M14 10a4.5 4.5 0 0 0-6.36 0l-3.18 3.18a4.5 4.5 0 0 0 6.36 6.36l1.58-1.58"/>'),
    keyboard: svg('<path fill-rule="evenodd" d="M4.6 5.5h14.8a2.6 2.6 0 0 1 2.6 2.6v7.8a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 15.9V8.1a2.6 2.6 0 0 1 2.6-2.6Zm1.6 3.3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3.3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm2.3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM7.6 13.4a.9.9 0 1 0 0 1.8h8.8a.9.9 0 1 0 0-1.8Z"/>'),
    login: stroke('<path d="M14 3.5h4a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-4M9.5 16.5 14 12 9.5 7.5M14 12H3.5"/>'),
    logout: stroke('<path d="M10 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h4M15.5 16.5 20 12l-4.5-4.5M20 12H9.5"/>'),
    dice: svg('<path fill-rule="evenodd" d="M6.4 3h11.2A3.4 3.4 0 0 1 21 6.4v11.2a3.4 3.4 0 0 1-3.4 3.4H6.4A3.4 3.4 0 0 1 3 17.6V6.4A3.4 3.4 0 0 1 6.4 3Zm1.8 3.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm7.6 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM12 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM8.2 14a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm7.6 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z"/>'),
    plus: svg('<path d="M12 3.5a1.3 1.3 0 0 1 1.3 1.3v5.9h5.9a1.3 1.3 0 0 1 0 2.6h-5.9v5.9a1.3 1.3 0 0 1-2.6 0v-5.9H4.8a1.3 1.3 0 0 1 0-2.6h5.9V4.8A1.3 1.3 0 0 1 12 3.5Z"/>'),
    palette: stroke('<path d="M12 2.9a9.1 9.1 0 0 0 0 18.2c1.3 0 2.1-.85 2.1-1.95 0-.52-.2-.98-.5-1.32-.3-.35-.48-.77-.48-1.26 0-1.1.88-1.97 1.97-1.97h1.68A4.36 4.36 0 0 0 21.1 12c0-5.03-4.08-9.1-9.1-9.1Z"/><circle cx="7.6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9.9" cy="8.1" r="1" fill="currentColor" stroke="none"/><circle cx="14.3" cy="7.7" r="1" fill="currentColor" stroke="none"/><circle cx="17.3" cy="10.8" r="1" fill="currentColor" stroke="none"/>'),
    discord: svg('<path d="M19.3 5.4A16.6 16.6 0 0 0 15.2 4.1l-.52 1.05a15.3 15.3 0 0 0-5.36 0L8.8 4.1a16.5 16.5 0 0 0-4.1 1.3C2.1 9.3 1.4 13.1 1.75 16.85a16.7 16.7 0 0 0 5.05 2.55l1.08-1.7a10.8 10.8 0 0 1-1.7-.82l.42-.33c3.28 1.5 6.84 1.5 10.08 0l.42.33c-.54.32-1.1.6-1.7.82l1.08 1.7a16.6 16.6 0 0 0 5.05-2.55c.42-4.33-.72-8.1-3.23-11.45ZM8.7 14.55c-.98 0-1.8-.9-1.8-2.02s.8-2.02 1.8-2.02 1.81.91 1.8 2.02c0 1.12-.8 2.02-1.8 2.02Zm6.6 0c-.98 0-1.8-.9-1.8-2.02s.8-2.02 1.8-2.02 1.81.91 1.8 2.02c0 1.12-.8 2.02-1.8 2.02Z"/>'),
    clock: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    arrow: stroke('<path d="M5 12h14M13 6l6 6-6 6"/>', 16),
    enter: stroke('<path d="M20 5v6a3 3 0 0 1-3 3H5M9 10l-4 4 4 4"/>', 14),
    music: svg('<path d="M19.2 3.1a1 1 0 0 1 .8.98v11.2a3.3 3.3 0 1 1-2-3.04V7.5l-8 1.6v8.2a3.3 3.3 0 1 1-2-3.04V5.9a1 1 0 0 1 .8-.98l9.6-1.92a1 1 0 0 1 .8.1Z"/>'),
  };

  // ── destinations ──────────────────────────────────────────────────────────
  // [id, title, href, icon, keywords, go-key]
  var PAGES = [
    ['home', 'Home', '/index', 'home', 'start main feed index', 'h'],
    ['browse', 'Browse', '/browse', 'browse', 'discover explore new genres', 'b'],
    ['charts', 'Charts', '/charts', 'chart', 'top popular trending ranking most played', 'c'],
    ['artists', 'Editors', '/artists', 'profile', 'artists creators uploaders people users', 'e'],
    ['music', 'Artists', '/music', 'mic', 'featured artists kanye rappers', 'm'],
    ['archive', 'Archive', '/archive', 'archive', 'comps archive index database', 'a'],
    ['resources', 'Ye archive', '/resources', 'folder', 'kanye ye resources tracker leaks discography', 'y'],
    ['radio', 'Radio', '/radio', 'radio', 'stations live stream', 'r'],
    ['lp', 'Live LPs', '/lp', 'headphones', 'listening parties live listen together'],
    ['community', 'Community', '/community', 'community', 'posts forum discuss threads'],
    ['library', 'Your library', '/library', 'list', 'liked saved comps edits collection', 'l'],
    ['history', 'History', '/history', 'history', 'recently played listening history', 'i'],
    ['playlists', 'Playlists', '/playlists', 'playlist', 'mixes lists', 'p'],
    ['feed', 'Following', '/feed', 'feed', 'feed follows friends activity', 'f'],
    ['tracker', 'Tracker', '/tracker', 'tracker', 'leaks unreleased eras songs'],
    ['eras', 'Eras', '/eras', 'grid', 'era albums periods'],
    ['games', 'Games', '/games', 'games', 'play guess heardle'],
    ['stats', 'Stats', '/stats', 'stats', 'numbers totals analytics'],
    ['wrapped', 'Recap', '/wrapped', 'sparkle', 'wrapped year in review your year'],
    ['notifications', 'Notification center', '/notifications', 'bell', 'alerts inbox activity', 'n'],
    ['awards', 'Hall of Fame', '/awards', 'trophy', 'awards winners best of'],
    ['whatsnew', "What's new", '/whatsnew', 'megaphone', 'changelog updates release notes news'],
    ['upload', 'Upload', '/upload', 'upload', 'add post new comp edit publish', 'u'],
    ['settings', 'Settings', '/settings', 'settings', 'preferences account options', 's'],
    ['profile', 'Your profile', '/dashboard', 'profile', 'dashboard me account my page'],
    ['search', 'Search', '/search', 'search', 'find lookup'],
    ['about', 'About', '/about', 'info', 'credits team'],
    ['status', 'Status', '/status', 'pulse', 'uptime incidents down outage'],
  ];
  var YE = [
    ['ye-tracker', 'Ye tracker', '/resources?view=tracker', 'tracker', 'leaks unreleased songs eras'],
    ['ye-disco', 'Ye discography', '/resources?view=disco', 'disc', 'albums discography samples credits'],
    ['ye-timeline', 'Ye timeline', '/resources?view=timeline', 'timeline', 'history events career'],
    ['ye-today', 'On this day in Ye history', '/resources?view=today', 'calendar', 'today anniversary otd'],
    ['ye-tweets', 'Ye tweets', '/resources?view=tweets', 'chat', 'twitter x posts'],
    ['ye-quiz', 'Daily Ye quiz', '/resources?view=quiz', 'quiz', 'quiz trivia game daily'],
    ['ye-yeezy', 'Yeezy archive', '/resources?view=yeezy', 'shirt', 'yeezy clothing merch fashion gap'],
    ['ye-tours', 'Ye tours', '/resources?view=tours', 'pin', 'tours concerts shows setlists performances'],
  ];
  var GO = {};
  PAGES.forEach(function (p) { if (p[5]) GO[p[5]] = p; });

  // ── recent ────────────────────────────────────────────────────────────────
  function recentList() {
    var l = lsGet(RECENT_KEY, []);
    return Array.isArray(l) ? l.filter(function (r) { return r && r.id; }) : [];
  }
  function pushRecent(entry) {
    if (!entry || !entry.id) return;
    var l = recentList().filter(function (r) { return r.id !== entry.id; });
    entry.t = Date.now();
    l.unshift(entry);
    lsSet(RECENT_KEY, l.slice(0, 12));
  }
  function recordItem(it) {
    if (!it || it.noRecent) return;
    if (it.kind === 'music' || it.kind === 'played') {
      pushRecent({ id: it.id, kind: 'music', title: it.title, sub: it.sub, href: it.href, art: it.art || '', round: !!it.round, play: slimPlay(it.play) });
    } else {
      pushRecent({ id: it.id, kind: 'cmd' });
    }
  }
  function slimPlay(p) {
    if (!p) return null;
    if (p.comp) return { comp: p.comp };
    if (p.track) return { track: { id: p.track.id, title: p.track.title, artist_name: p.track.artist_name || '', ia_url: p.track.ia_url, cover_url: p.track.cover_url || '', artist_id: p.track.artist_id || null } };
    return null;
  }
  function rememberQuery(q) {
    q = String(q || '').trim();
    if (q.length < 2 || q.charAt(0) === '>') return;
    pushRecent({ id: 'q:' + q.toLowerCase(), kind: 'query', q: q });
    var qs = QS();
    if (qs && qs.remember) qs.remember(q);
  }

  // ── playback helpers ──────────────────────────────────────────────────────
  function playItem(p) {
    if (!p) return false;
    var t = cur();
    if (p.comp) {
      if (t && t._album_id === p.comp && typeof togglePlay === 'function') { togglePlay(); return true; }
      if (typeof window.playCompById === 'function') { window.playCompById(p.comp, p.album ? { album: p.album } : undefined); return true; }
    }
    if (p.track && p.track.ia_url) {
      if (t && t.id === p.track.id && typeof togglePlay === 'function') { togglePlay(); return true; }
      if (typeof playTrack === 'function') { playTrack(p.track); return true; }
    }
    return false;
  }
  function surprise() {
    toast('finding something good…');
    fetch(API + '/archive/random?n=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var it = d && d.items && d.items[0];
      if (!it || !it.id) throw new Error('none');
      if (typeof window.playCompById === 'function') window.playCompById(it.id, { album: it, quiet: true }).then(function (ok) {
        if (ok) toast('now playing ' + (it.title || 'a random comp') + (it.archive_artist_name ? ' by ' + it.archive_artist_name : ''));
      });
      else go('/album?id=' + enc(it.id));
    }).catch(function () { toast('couldnt find a comp rn...try again', 'error'); });
  }
  function copy(text, done) {
    function fallback() { try { window.prompt('copy this link', text); } catch (_) {} }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(done || 'link copied', 'success'); }, fallback);
      else fallback();
    } catch (_) { fallback(); }
  }
  function openShortcuts() { setTimeout(function () { if (typeof window.wvShortcutsHelp === 'function') window.wvShortcutsHelp(); }, 30); }

  // ── the command list (rebuilt on every open so state is current) ──────────
  function here(href) {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/index';
    if (p === '/') p = '/index';
    var u = href.split('?');
    if (u[0] !== p) return false;
    if (!u[1]) return !location.search || u[0] !== '/resources';
    return location.search.replace(/^\?/, '') === u[1];
  }
  function buildCommands() {
    var L = loggedIn();
    var out = [];
    PAGES.forEach(function (p) {
      if (p[0] === 'profile' && !L) return;
      out.push({ id: 'page:' + p[0], group: 'Go to', kind: 'page', title: p[1], keys: p[4], icon: p[3], href: p[2], go: p[5] || '', here: here(p[2]) });
    });
    if (sess('wv_is_mod')) out.push({ id: 'page:modpanel', group: 'Go to', kind: 'page', title: 'Mod panel', keys: 'moderation admin reports', icon: 'shield', href: '/modpanel' });
    if (sess('wv_is_archiver')) out.push({ id: 'page:archivepanel', group: 'Go to', kind: 'page', title: 'Archive panel', keys: 'archiver import', icon: 'shield', href: '/archivepanel' });
    if (sess('wv_is_radio')) out.push({ id: 'page:radiopanel', group: 'Go to', kind: 'page', title: 'Radio panel', keys: 'station dj', icon: 'shield', href: '/radiopanel' });
    YE.forEach(function (p) {
      out.push({ id: 'page:' + p[0], group: 'Ye archive', kind: 'page', title: p[1], keys: 'ye kanye ' + p[4], icon: p[3], href: p[2], here: here(p[2]) });
    });

    // Playback
    var a = aud(), t = cur();
    var hasPlayer = !!(a && document.getElementById('player'));
    if (hasPlayer && t) {
      var paused = a.paused;
      var who = t.artist_name || (t.artists && t.artists.display_name) || '';
      out.push({ id: 'act:playpause', group: 'Playback', kind: 'action', title: paused ? 'Resume' : 'Pause', sub: (t.title || '') + (who ? ' — ' + who : ''),
        keys: 'play pause stop resume toggle', icon: paused ? 'play' : 'pause', art: t.cover_url || t._album_cover || '', hint: ['Space'], run: function () { if (typeof togglePlay === 'function') togglePlay(); } });
      out.push({ id: 'act:next', group: 'Playback', kind: 'action', title: 'Next track', keys: 'skip forward', icon: 'next', hint: ['Shift', '→'], run: function () { if (typeof skipNext === 'function') skipNext(); } });
      out.push({ id: 'act:prev', group: 'Playback', kind: 'action', title: 'Previous track', keys: 'back rewind', icon: 'prev', hint: ['Shift', '←'], run: function () { if (typeof skipPrev === 'function') skipPrev(); } });
    }
    if (hasPlayer) {
      var sh = (function () { try { return localStorage.getItem('wv_shuffle') === '1'; } catch (_) { return false; } })();
      var rp = (function () { try { return localStorage.getItem('wv_repeat') || 'off'; } catch (_) { return 'off'; } })();
      out.push({ id: 'act:shuffle', group: 'Playback', kind: 'action', title: sh ? 'Turn shuffle off' : 'Turn shuffle on', keys: 'shuffle random order', icon: 'shuffle', badge: sh ? 'on' : '', hint: ['S'], run: function () { if (typeof toggleShuffle === 'function') toggleShuffle(); } });
      out.push({ id: 'act:repeat', group: 'Playback', kind: 'action', title: 'Repeat: ' + (rp === 'all' ? 'queue → this track' : rp === 'one' ? 'this track → off' : 'off → queue'), keys: 'repeat loop', icon: 'repeat', badge: rp === 'all' ? 'queue' : rp === 'one' ? 'track' : '', hint: ['R'], run: function () { if (typeof toggleRepeat === 'function') toggleRepeat(); } });
      out.push({ id: 'act:mute', group: 'Playback', kind: 'action', title: a.muted ? 'Unmute' : 'Mute', keys: 'sound volume silence', icon: a.muted ? 'volume' : 'mute', hint: ['M'], run: function () { if (typeof toggleMute === 'function') toggleMute(); } });
      if (t) {
        out.push({ id: 'act:fullplayer', group: 'Playback', kind: 'action', title: 'Open now playing', keys: 'full screen player lyrics now playing', icon: 'expand', run: function () { if (typeof openFullPlayer === 'function') openFullPlayer(); } });
        out.push({ id: 'act:lyrics', group: 'Playback', kind: 'action', title: 'Show lyrics', keys: 'lyrics words sing', icon: 'chat', run: function () { if (typeof openFullPlayer === 'function') openFullPlayer(true); } });
      }
      if (document.getElementById('wv-queue-panel')) out.push({ id: 'act:queue', group: 'Playback', kind: 'action', title: 'Show queue', keys: 'queue up next list', icon: 'queue', run: function () { if (typeof toggleQueuePanel === 'function') toggleQueuePanel(); } });
      if (t && t.id && !t._radio) {
        out.push({ id: 'act:like', group: 'Playback', kind: 'action', title: 'Like what’s playing', keys: 'heart favorite save love like', icon: 'heart', run: function () { if (typeof toggleCurrentLike === 'function') toggleCurrentLike(); } });
        out.push({ id: 'act:addpl', group: 'Playback', kind: 'action', title: 'Add what’s playing to a playlist', keys: 'playlist add save', icon: 'playlist', run: function () { if (typeof addCurrentToPlaylist === 'function') addCurrentToPlaylist(); } });
        out.push({ id: 'act:gotrack', nav: true, group: 'Playback', kind: 'action', title: 'Go to what’s playing', keys: 'open current track comp album', icon: 'music', run: function () { if (typeof goToCurrentTrack === 'function') goToCurrentTrack(); } });
        out.push({ id: 'act:copynp', group: 'Playback', kind: 'action', title: 'Copy link to what’s playing', keys: 'share link url copy', icon: 'link', run: function () {
          var c = cur(); if (!c) return;
          copy(location.origin + (c._album_id ? '/album?id=' + enc(c._album_id) : '/track?id=' + enc(c.id)));
        } });
      }
    }

    // Library + utilities
    out.push({ id: 'act:surprise', group: 'Actions', kind: 'action', title: 'Surprise me', sub: 'play a random comp from the archive', keys: 'random shuffle roulette lucky discover', icon: 'dice', run: surprise });
    out.push({ id: 'act:newpl', nav: true, group: 'Actions', kind: 'action', title: 'New playlist', keys: 'create playlist make', icon: 'plus', run: function () { if (typeof window.wvNewPlaylist === 'function') window.wvNewPlaylist(); else go('/playlist-builder'); } });
    out.push({ id: 'act:keys', group: 'Actions', kind: 'action', title: 'Keyboard shortcuts', keys: 'hotkeys help keys', icon: 'keyboard', hint: ['?'], run: openShortcuts, noRecent: false });
    out.push({ id: 'act:copy', group: 'Actions', kind: 'action', title: 'Copy link to this page', keys: 'share url copy link', icon: 'link', run: function () { copy(location.href); } });
    out.push({ id: 'act:themepicker', group: 'Actions', kind: 'action', title: 'Choose a theme…', keys: 'appearance theme picker colors', icon: 'palette', hint: ['T'], run: function () { setTimeout(function () { if (typeof window.wvOpenThemePicker === 'function') window.wvOpenThemePicker(); }, 30); } });
    out.push({ id: 'act:discord', group: 'Actions', kind: 'action', title: 'Join the Discord', keys: 'discord chat server community', icon: 'discord', run: function () { window.open('https://discord.gg/j2jGmw5CZH', '_blank', 'noopener'); } });
    if (L) {
      out.push({ id: 'act:logout', nav: true, group: 'Actions', kind: 'action', title: 'Log out', keys: 'sign out signout logout leave', icon: 'logout', run: function () { if (typeof logout === 'function') logout(); } });
    } else {
      out.push({ id: 'act:login', nav: true, group: 'Actions', kind: 'action', title: 'Log in', keys: 'sign in signin account', icon: 'login', run: function () { location.href = '/login?next=' + enc(location.pathname + location.search); } });
      out.push({ id: 'act:register', nav: true, group: 'Actions', kind: 'action', title: 'Create an account', keys: 'sign up register join', icon: 'profile', run: function () { location.href = '/register'; } });
    }

    // Themes
    var TH = window.WV_THEMES || {};
    var order = window.WV_THEME_ORDER || Object.keys(TH);
    var pref = typeof window.getThemePref === 'function' ? window.getThemePref() : '';
    var SW = typeof WV_THEME_SWATCH !== 'undefined' ? WV_THEME_SWATCH : {};
    order.forEach(function (name) {
      var def = TH[name];
      if (!def) return;
      var locked = def.members && !(window.wvIsVerified && window.wvIsVerified());
      out.push({ id: 'theme:' + name, group: 'Themes', kind: 'theme', title: 'Theme: ' + def.label, keys: 'theme appearance colors ' + name + (def.base === 'light' ? ' light white bright' : ' dark night'),
        swatch: SW[name] || null, icon: 'palette', badge: pref === name ? 'current' : locked ? 'members' : '', badgeOn: pref === name,
        run: function () {
          if (locked) { toast('the Waverunners theme is only for discord verified members'); go('/settings#discord-verify'); return; }
          if (typeof window.setTheme === 'function') { window.setTheme(name); toast(def.label + ' theme'); }
        } });
    });
    return out;
  }

  // Recently played, straight from the player's log.
  function playedItems() {
    var l = lsGet('recently_played', []);
    if (!Array.isArray(l)) return [];
    return l.filter(function (h) { return h && h.id; }).slice(0, 6).map(function (h) {
      var comp = h._type === 'album';
      return { id: 'm:' + h.id, kind: 'played', group: 'Jump back in', title: h.title || 'Untitled', sub: (comp ? 'Comp' : 'Edit') + (h.artist_name ? ' · ' + h.artist_name : ''),
        href: comp ? '/album?id=' + enc(h.id) : '/track?id=' + enc(h.id), art: h.cover_url || '',
        play: comp ? { comp: h.id } : (h.ia_url ? { track: { id: h.id, title: h.title, artist_name: h.artist_name || '', ia_url: h.ia_url, cover_url: h.cover_url || '' } } : null) };
    });
  }

  // ── state ─────────────────────────────────────────────────────────────────
  var P = null; // { root, input, list, foot, items, active, q, seq, live, liveQ, loading, moved, prevFocus, cmds }

  function isOpen() { return !!(P && P.root && P.root.isConnected); }
  function blocked() {
    for (var i = 0; i < BLOCKERS.length; i++) {
      var el = document.getElementById(BLOCKERS[i]);
      if (!el || !el.isConnected) continue;
      try {
        var cs = getComputedStyle(el);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05) return true;
      } catch (_) { return true; }
    }
    return false;
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  function styleOnce() {
    if (document.getElementById('wv-palette-css')) return;
    var st = document.createElement('style');
    st.id = 'wv-palette-css';
    st.textContent = [
      '#wv-palette{position:fixed;inset:0;z-index:5000;display:flex;justify-content:center;align-items:flex-start;padding:12vh 16px 16px;font-family:var(--font-sans);}',
      '.wvp-scrim{position:absolute;inset:0;background:rgba(0,0,0,.58);animation:wvp-fade .16s ease both;}',
      '.theme-light .wvp-scrim{background:rgba(18,18,24,.34);}',
      '.wvp-panel{position:relative;display:flex;flex-direction:column;width:min(640px,100%);max-height:min(74vh,660px);background:var(--surface);color:var(--text);',
      'border:1px solid var(--hair-strong);border-radius:calc(var(--r-lg) + 6px);overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.6),0 12px 30px rgba(0,0,0,.35);animation:wvp-pop .18s var(--ease,ease) both;}',
      '.theme-light .wvp-panel{box-shadow:0 40px 100px rgba(20,20,40,.22),0 10px 24px rgba(20,20,40,.1);}',
      '#wv-palette.is-closing .wvp-scrim{animation:wvp-fade .12s ease reverse both;}',
      '#wv-palette.is-closing .wvp-panel{animation:wvp-pop .12s ease reverse both;}',
      '@keyframes wvp-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes wvp-pop{from{opacity:0;transform:translateY(-8px) scale(.985)}to{opacity:1;transform:none}}',
      '.wvp-head{display:flex;align-items:center;gap:12px;height:62px;padding:0 14px 0 18px;border-bottom:1px solid var(--hair);flex-shrink:0;}',
      '.wvp-head>.wvp-lens{color:var(--text-3);flex-shrink:0;display:grid;place-items:center;}',
      '.wvp-mode{flex-shrink:0;height:24px;padding:0 9px;border-radius:var(--r-pill);background:var(--brand-bg);color:var(--brand-text,var(--brand));font-size:12px;font-weight:700;display:none;align-items:center;}',
      '#wv-palette.is-cmd .wvp-mode{display:inline-flex;}',
      '#wv-palette .wvp-input,#wv-palette .wvp-input:focus{flex:1;min-width:0;width:auto;height:100%;background:transparent;border:0;border-radius:0;outline:0;box-shadow:none;color:var(--text);font:500 17.5px/1.2 var(--font-sans);letter-spacing:-.012em;padding:0;margin:0;-webkit-appearance:none;appearance:none;}',
      '.wvp-input::placeholder{color:var(--text-3);opacity:1;}',
      '.wvp-input::-webkit-search-cancel-button{display:none;}',
      '.wvp-spin{width:16px;height:16px;border-radius:50%;border:2px solid var(--hair-strong);border-top-color:var(--brand);flex-shrink:0;opacity:0;transition:opacity .15s;animation:wvp-spin .7s linear infinite;}',
      '#wv-palette.is-loading .wvp-spin{opacity:1;}',
      '@keyframes wvp-spin{to{transform:rotate(360deg)}}',
      '.wvp-clear{all:unset;flex-shrink:0;display:none;place-items:center;width:28px;height:28px;border-radius:50%;color:var(--text-3);cursor:pointer;}',
      '.wvp-clear:hover{background:var(--hair);color:var(--text);}',
      '.wvp-clear:focus-visible,.wvp-cancel:focus-visible{outline:2px solid var(--brand);outline-offset:1px;}',
      '#wv-palette.has-q .wvp-clear{display:grid;}',
      '.wvp-esc{all:unset;flex-shrink:0;cursor:pointer;font:600 11px/1 var(--font-sans);color:var(--text-3);padding:5px 7px;border-radius:6px;border:1px solid var(--hair-strong);background:var(--hair);}',
      '.wvp-esc:hover{color:var(--text);}',
      '.wvp-cancel{all:unset;display:none;flex-shrink:0;cursor:pointer;font-size:15px;font-weight:600;color:var(--brand-text,var(--brand));padding:10px 4px 10px 8px;}',
      '.wvp-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 8px 10px;scroll-padding:40px 0 10px;scrollbar-width:thin;}',
      '.wvp-gh{display:flex;align-items:center;justify-content:space-between;padding:14px 10px 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}',
      '.wvp-gh small{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--text-4,var(--text-3));}',
      '.wvp-row{position:relative;display:flex;align-items:center;gap:12px;min-height:46px;padding:6px 10px;border-radius:var(--r-md);cursor:pointer;color:var(--text-2);user-select:none;-webkit-user-select:none;}',
      '.wvp-row.is-active{background:var(--hair);color:var(--text);}',
      '.wvp-row.is-active::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--brand);}',
      '.wvp-ic{position:relative;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;background:var(--hair);color:var(--text-2);transition:background .12s,color .12s;}',
      '.wvp-row.is-active .wvp-ic{background:var(--brand-bg);color:var(--brand-text,var(--brand));}',
      '.wvp-sw{width:32px;height:32px;border-radius:8px;flex-shrink:0;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px var(--hair-strong);}',
      '.wvp-sw i{position:absolute;border-radius:50%;}',
      '.wvp-sw i:nth-child(1){width:14px;height:14px;right:4px;bottom:4px;}',
      '.wvp-sw i:nth-child(2){width:9px;height:9px;left:5px;top:5px;}',
      '.wvp-art{position:relative;width:36px;height:36px;flex-shrink:0;border-radius:var(--r-art,6px);overflow:hidden;background:var(--surface-2);}',
      '.wvp-art.round{border-radius:50%;}',
      '.wvp-art img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.wvp-art .wvp-np{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#fff;}',
      '.wvp-txt{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;}',
      '.wvp-txt.inline{flex-direction:row;align-items:baseline;justify-content:flex-start;gap:10px;}',
      '.wvp-t{font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.005em;}',
      '.wvp-s{font-size:12.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.35;}',
      '.wvp-txt.inline .wvp-s{flex:1;min-width:0;}',
      '.wvp-row mark{background:transparent;color:var(--brand-text,var(--brand));font-weight:800;}',
      '.wvp-meta{display:flex;align-items:center;gap:6px;flex-shrink:0;color:var(--text-3);}',
      '.wvp-k{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-3);}',
      '.wvp-k kbd,.wvp-foot kbd,.wvp-hint kbd{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:1px solid var(--hair-strong);background:var(--hair);color:var(--text-2);font:600 11px/1 var(--font-sans);box-shadow:0 1px 0 var(--hair-strong);}',
      '.wvp-k em{font-style:normal;font-size:10.5px;color:var(--text-3);padding:0 1px;}',
      '.wvp-badge{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:var(--r-pill);background:var(--hair);color:var(--text-3);}',
      '.wvp-badge.on{background:var(--brand-bg);color:var(--brand-text,var(--brand));}',
      '.wvp-play{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--brand);color:var(--on-brand,#fff);opacity:0;transform:scale(.85);transition:opacity .12s,transform .12s;cursor:pointer;}',
      '.wvp-row:hover .wvp-play,.wvp-row.is-active .wvp-play{opacity:1;transform:none;}',
      '.wvp-play:hover{transform:scale(1.07)!important;}',
      '.wvp-play svg{width:14px;height:14px;margin-left:1px;}',
      '.wvp-ret{display:none;color:var(--text-3);}',
      '.wvp-row.is-active .wvp-ret{display:grid;place-items:center;}',
      '.wvp-sk{display:flex;align-items:center;gap:12px;min-height:46px;padding:6px 10px;}',
      '.wvp-sk i{display:block;border-radius:6px;background:var(--hair);position:relative;overflow:hidden;}',
      '.wvp-sk i::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,var(--hair-strong),transparent);animation:wvp-sh 1.1s ease-in-out infinite;}',
      '@keyframes wvp-sh{to{transform:translateX(100%)}}',
      '.wvp-empty{padding:34px 20px 30px;text-align:center;color:var(--text-3);font-size:13.5px;line-height:1.5;}',
      '.wvp-empty b{display:block;font-size:15px;color:var(--text);margin-bottom:4px;}',
      '.wvp-foot{display:flex;align-items:center;gap:16px;height:42px;padding:0 16px;border-top:1px solid var(--hair);font-size:12px;color:var(--text-3);flex-shrink:0;}',
      '.wvp-foot span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}',
      '.wvp-foot .wvp-grow{flex:1;}',
      '.wvp-foot .wvp-brand{font-weight:700;letter-spacing:-.01em;color:var(--text-3);}',
      '.wvp-foot kbd{min-width:18px;height:18px;font-size:10.5px;}',
      '@media (max-width:640px){',
      '#wv-palette{padding:0;align-items:stretch;}',
      '.wvp-panel{width:100%;height:100%;height:100dvh;max-height:none;border:0;border-radius:0;padding-top:env(safe-area-inset-top);animation-name:wvp-sheet;}',
      '@keyframes wvp-sheet{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
      '.wvp-head{height:60px;padding:0 8px 0 16px;}',
      '.wvp-input{font-size:17px;}',
      '.wvp-esc{display:none;}.wvp-cancel{display:inline-flex;}',
      '.wvp-list{padding:2px 8px calc(16px + env(safe-area-inset-bottom));}',
      '.wvp-row{min-height:54px;}',
      '.wvp-k,.wvp-ret{display:none!important;}',
      '.wvp-play{opacity:1;transform:none;width:36px;height:36px;background:var(--hair);color:var(--text);}',
      '.wvp-row.is-active .wvp-play{background:var(--brand);color:var(--on-brand,#fff);}',
      '.wvp-foot{display:none;}',
      '}',
      // topbar hint
      '.wvp-hint{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:3px;flex-shrink:0;cursor:pointer;padding:4px;margin-right:-6px;border-radius:7px;opacity:.9;transition:opacity .12s;}',
      '.wvp-hint:hover{opacity:1;}.wvp-hint:hover kbd{color:var(--text);}',
      '.wvp-hint:focus-visible{outline:2px solid var(--brand);}',
      '.wvp-hint kbd{min-width:19px;height:19px;font-size:10.5px;color:var(--text-3);box-shadow:none;}',
      '.wv-search-wrap:focus-within .wvp-hint{display:none;}',
      '.am-search .wvp-hint{margin-right:-4px;padding:2px;}',
      '.am-search .wvp-hint kbd{min-width:16px;height:16px;font-size:9.5px;padding:0 3px;}',
      '.am-search:focus-within .wvp-hint{display:none;}',
      '.am-search:has(input:not(:placeholder-shown)) .wvp-hint{display:none;}',
      '.wv-search-wrap:has(input:not(:placeholder-shown)) .wvp-hint{display:none;}',
      // go-to chip
      '#wvp-gochip{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:4900;display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:var(--r-pill);',
      'background:var(--elevated);color:var(--text-2);border:1px solid var(--hair-strong);box-shadow:0 14px 40px rgba(0,0,0,.4);font-size:12.5px;white-space:nowrap;animation:wvp-fade .12s ease both;max-width:calc(100vw - 32px);overflow:hidden;}',
      '#wvp-gochip b{color:var(--text);font-weight:700;}',
      '#wvp-gochip span{display:inline-flex;align-items:center;gap:5px;}',
      '#wvp-gochip kbd{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:4px;border:1px solid var(--hair-strong);background:var(--hair);font:700 10.5px/1 var(--font-sans);color:var(--text);}',
      // shortcuts sheet
      '#wv-keys.wvk{position:fixed;inset:0;z-index:5001;display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font-sans);}',
      '.wvk-scrim{position:absolute;inset:0;background:rgba(0,0,0,.6);animation:wvp-fade .16s ease both;}',
      '.theme-light .wvk-scrim{background:rgba(18,18,24,.34);}',
      '.wvk-card:focus{outline:none;}',
      '.wvk-card{position:relative;width:min(780px,100%);max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow-y:auto;background:var(--surface);color:var(--text);border:1px solid var(--hair-strong);',
      'border-radius:calc(var(--r-lg) + 6px);box-shadow:0 40px 100px rgba(0,0,0,.55);padding:22px 24px 24px;animation:wvp-pop .18s var(--ease,ease) both;}',
      '.theme-light .wvk-card{box-shadow:0 40px 100px rgba(20,20,40,.22);}',
      '.wvk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.wvk-head h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--text);}',
      '.wvk-head p{margin:4px 0 0;font-size:13px;color:var(--text-3);}',
      '.wvk-x{all:unset;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:var(--text-2);cursor:pointer;flex-shrink:0;margin:-4px -6px 0 0;}',
      '.wvk-x:hover{background:var(--hair);color:var(--text);}',
      '.wvk-x:focus-visible,.wvk-cta:focus-visible{outline:2px solid var(--brand);outline-offset:2px;}',
      '.wvk-cta{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:14px;width:100%;margin:18px 0 6px;padding:14px 16px;border-radius:var(--r-lg);cursor:pointer;',
      'background:var(--brand-bg);color:var(--text);border:1px solid transparent;transition:border-color .12s;}',
      '.wvk-cta:hover{border-color:var(--brand);}',
      '.wvk-cta .wvk-cta-ic{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--brand);color:var(--on-brand,#fff);flex-shrink:0;}',
      '.wvk-cta b{display:block;font-size:14.5px;font-weight:700;}',
      '.wvk-cta small{display:block;font-size:12.5px;color:var(--text-2);margin-top:2px;}',
      '.wvk-cta .wvk-cta-t{flex:1;min-width:0;}',
      '.wvk-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 26px;margin-top:10px;}',
      '.wvk-sec h3{margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}',
      '.wvk-sec dl{margin:0;}',
      '.wvk-sec dl>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--hair);}',
      '.wvk-sec dl>div:last-child{border-bottom:0;}',
      '.wvk-sec dt{margin:0;font-size:13.5px;color:var(--text-2);order:1;min-width:0;}',
      '.wvk-sec dd{margin:0;order:2;display:inline-flex;align-items:center;gap:3px;flex-shrink:0;}',
      '.wvk-sec kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:5px;border:1px solid var(--hair-strong);background:var(--hair);color:var(--text);font:600 11.5px/1 var(--font-sans);box-shadow:0 1px 0 var(--hair-strong);}',
      '.wvk-sec dd em{font-style:normal;font-size:11px;color:var(--text-3);padding:0 2px;}',
      '@media (max-width:760px){.wvk-grid{grid-template-columns:1fr 1fr;}}',
      '@media (max-width:540px){#wv-keys.wvk{padding:0;align-items:flex-end;}.wvk-card{border-radius:calc(var(--r-lg) + 6px) calc(var(--r-lg) + 6px) 0 0;max-height:88vh;max-height:88dvh;padding:20px 18px calc(22px + env(safe-area-inset-bottom));}.wvk-grid{grid-template-columns:1fr;}}',
      '@media (prefers-reduced-motion: reduce){.wvp-scrim,.wvp-panel,.wvk-scrim,.wvk-card,#wvp-gochip{animation:none!important}.wvp-sk i::after{animation:none}.wvp-spin{animation-duration:2s}.wvp-play,.wvp-ic{transition:none}}',
    ].join('');
    document.head.appendChild(st);
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  function iconHTML(it) {
    if (it.swatch) {
      return '<span class="wvp-sw" aria-hidden="true" style="background:' + esc(it.swatch[0]) + '"><i style="background:' + esc(it.swatch[1]) + '"></i><i style="background:' + esc(it.swatch[2]) + '"></i></span>';
    }
    if (it.kind === 'music' || it.kind === 'played' || (it.id === 'act:playpause' && it.art)) {
      var src = it.art ? img(it.art, 80) : '';
      var np = it.id === 'act:playpause' ? '<span class="wvp-np">' + (I[it.icon] || '') + '</span>' : '';
      return '<span class="wvp-art' + (it.round ? ' round' : '') + '"' + (src ? '' : ' style="background:' + esc(grad(it.title)) + '"') + '>' +
        (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') + np + '</span>';
    }
    return '<span class="wvp-ic" aria-hidden="true">' + (I[it.icon] || I.arrow) + '</span>';
  }
  function hintHTML(it) {
    var h = '';
    if (it.go) h += '<span class="wvp-k" aria-hidden="true"><kbd>G</kbd><em>then</em><kbd>' + esc(it.go.toUpperCase()) + '</kbd></span>';
    else if (it.hint) h += '<span class="wvp-k" aria-hidden="true">' + it.hint.map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join('') + '</span>';
    return h;
  }
  function rowHTML(it, i) {
    var title = it._pos ? hlPos(it.title, it._pos) : (it._hl && QS() ? QS().hl(it.title, it._hl) : esc(it.title));
    var two = it.kind === 'music' || it.kind === 'played' || it.id === 'act:playpause';
    var sub = it.sub ? '<span class="wvp-s">' + esc(it.sub) + '</span>' : '';
    var meta = '';
    if (it.here) meta += '<span class="wvp-badge">you’re here</span>';
    if (it.badge) meta += '<span class="wvp-badge' + (it.badgeOn || it.badge === 'on' ? ' on' : '') + '">' + esc(it.badge) + '</span>';
    meta += hintHTML(it);
    if (it.play && (it.kind === 'music' || it.kind === 'played')) meta += '<span class="wvp-play" role="button" tabindex="-1" data-act="play" aria-label="Play ' + esc(it.title) + '" title="Play (Shift+Enter)">' + I.play + '</span>';
    meta += '<span class="wvp-ret" aria-hidden="true">' + I.enter + '</span>';
    return '<div class="wvp-row" role="option" aria-selected="false" id="wvp-o-' + i + '" data-i="' + i + '">' +
      iconHTML(it) +
      '<span class="wvp-txt' + (two ? '' : ' inline') + '"><span class="wvp-t">' + title + '</span>' + sub + '</span>' +
      '<span class="wvp-meta">' + meta + '</span></div>';
  }
  function skeleton(n) {
    var h = '';
    for (var k = 0; k < n; k++) {
      h += '<div class="wvp-sk" aria-hidden="true"><i style="width:36px;height:36px;"></i><div style="flex:1;display:grid;gap:7px;"><i style="height:11px;width:' + (56 - k * 11) + '%;"></i><i style="height:9px;width:' + (32 - k * 5) + '%;"></i></div></div>';
    }
    return h;
  }

  // Groups -> flat option list + HTML.
  function render() {
    if (!isOpen()) return;
    var groups = P.groups;
    var html = '', items = [], gi = 0;
    P.groupStarts = [];
    groups.forEach(function (g) {
      if (!g.items.length && !g.loading) return;
      var gid = 'wvp-g-' + (gi++);
      html += '<div role="group" aria-labelledby="' + gid + '"><div class="wvp-gh" id="' + gid + '">' + esc(g.label) + (g.note ? '<small>' + esc(g.note) + '</small>' : '') + '</div>';
      if (g.items.length) P.groupStarts.push(items.length);
      g.items.forEach(function (it) {
        html += rowHTML(it, items.length);
        items.push(it);
      });
      if (g.loading) html += skeleton(3);
      html += '</div>';
    });
    if (!items.length && !P.loading) {
      html = '<div class="wvp-empty"><b>nothing matches “' + esc(P.q) + '”</b>try a comp, an editor, a page or an action like “shuffle”</div>';
    }
    P.items = items;
    P.list.innerHTML = html;
    var keep = -1;
    if (P.moved && P.activeId) {
      for (var i = 0; i < items.length; i++) if (items[i].id === P.activeId) { keep = i; break; }
    }
    setActive(keep >= 0 ? keep : (items.length ? 0 : -1), true);
    if (!P.moved) P.list.scrollTop = 0;
  }

  function setActive(i, silent) {
    if (!isOpen()) return;
    var prev = P.list.querySelector('.wvp-row.is-active');
    if (prev) { prev.classList.remove('is-active'); prev.setAttribute('aria-selected', 'false'); }
    P.active = i;
    var it = P.items[i];
    P.activeId = it ? it.id : null;
    if (!it) { P.input.removeAttribute('aria-activedescendant'); footer(); return; }
    var el = document.getElementById('wvp-o-' + i);
    if (el) {
      el.classList.add('is-active');
      el.setAttribute('aria-selected', 'true');
      P.input.setAttribute('aria-activedescendant', el.id);
      if (!silent) {
        try {
          if (i === 0) P.list.scrollTop = 0;
          else {
            var gh = el.previousElementSibling;
            if (gh && gh.classList.contains('wvp-gh')) gh.scrollIntoView({ block: 'nearest' });
            el.scrollIntoView({ block: 'nearest' });
          }
        } catch (_) {}
      }
    }
    footer();
  }
  function footer() {
    if (!P || !P.foot) return;
    var it = P.items[P.active];
    var act = !it ? 'open' : it.run ? 'run' : 'open';
    var h = '<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> ' + act + '</span>';
    if (it && it.play) h += '<span><kbd>Shift</kbd><kbd>↵</kbd> play</span>';
    if (it && it.href && !it.run) h += '<span><kbd>' + (IS_MAC ? '⌘' : 'Ctrl') + '</kbd><kbd>↵</kbd> new tab</span>';
    else h += '<span><kbd>Tab</kbd> next group</span>';
    h += '<span class="wvp-grow"></span><span class="wvp-brand">type <kbd>&gt;</kbd> for commands</span>';
    P.foot.innerHTML = h;
  }

  // ── building the result groups ────────────────────────────────────────────
  function emptyGroups() {
    var cmds = P.cmds;
    var byId = {};
    cmds.forEach(function (c) { byId[c.id] = c; });
    var groups = [];
    var rec = [];
    recentList().slice(0, 8).forEach(function (r) {
      if (rec.length >= 5) return;
      if (r.kind === 'cmd' && byId[r.id]) rec.push(byId[r.id]);
      else if (r.kind === 'music') rec.push({ id: r.id, kind: 'music', title: r.title, sub: r.sub, href: r.href, art: r.art || '', round: r.round, play: r.play });
      else if (r.kind === 'query' && r.q) rec.push({ id: r.id, kind: 'query', title: r.q, sub: 'recent search', icon: 'clock', fill: r.q, noRecent: true });
    });
    if (rec.length) groups.push({ label: 'Recent', items: rec });
    var np = cmds.filter(function (c) { return c.group === 'Playback'; });
    var FRONT = ['act:playpause', 'act:next', 'act:prev', 'act:fullplayer'];
    var front = np.filter(function (c) { return FRONT.indexOf(c.id) >= 0; });
    var back = np.filter(function (c) { return FRONT.indexOf(c.id) < 0; });
    if (front.length) groups.push({ label: 'Now playing', items: front });
    var played = playedItems().filter(function (p) { return !rec.some(function (r) { return r.id === p.id; }); }).slice(0, 4);
    if (played.length) groups.push({ label: 'Jump back in', items: played });
    groups.push({ label: 'Go to', items: cmds.filter(function (c) { return c.group === 'Go to'; }) });
    groups.push({ label: 'Ye archive', items: cmds.filter(function (c) { return c.group === 'Ye archive'; }) });
    groups.push({ label: 'Actions', items: cmds.filter(function (c) { return c.group === 'Actions'; }) });
    if (back.length) groups.push({ label: front.length ? 'More playback' : 'Playback', items: back });
    groups.push({ label: 'Themes', items: cmds.filter(function (c) { return c.group === 'Themes'; }) });
    return groups;
  }

  function localMatches(q, cmdOnly) {
    var res = [];
    var pool = P.cmds.concat(cmdOnly ? [] : playedItems());
    var recentIds = {};
    recentList().forEach(function (r, i) { recentIds[r.id] = 8 - Math.min(8, i); });
    pool.forEach(function (it) {
      if (cmdOnly && it.kind === 'page') return;
      var m = fuzzy(q, it.title);
      var best = m ? m.score : -1, pos = m ? m.pos : null;
      if (it.keys) {
        var km = fuzzy(q, it.keys);
        if (km && km.score * 0.72 > best) { best = km.score * 0.72; pos = null; }
      }
      if (it.sub && it.kind !== 'action') {
        var sm = fuzzy(q, it.sub);
        if (sm && sm.score * 0.6 > best) { best = sm.score * 0.6; pos = null; }
      }
      if (best < 0) return;
      best += (recentIds[it.id] || 0) * 12;
      if (it.kind === 'page' && it.group === 'Go to') best += 25;
      if (it.here) best -= 40;
      var copy = {};
      for (var k in it) copy[k] = it[k];
      copy._pos = pos;
      copy._score = best;
      res.push(copy);
    });
    res.sort(function (a, b) { return b._score - a._score; });
    return res;
  }

  function typedGroups() {
    var raw = P.q;
    var cmdOnly = raw.charAt(0) === '>';
    var q = cmdOnly ? raw.slice(1).trim() : raw.trim();
    var groups = [];
    if (cmdOnly && !q) {
      var cm = P.cmds.filter(function (c) { return c.kind !== 'page'; });
      ['Playback', 'Actions', 'Themes'].forEach(function (g) {
        var it = cm.filter(function (c) { return c.group === g; });
        if (it.length) groups.push({ label: g, items: it });
      });
      return groups;
    }
    var local = localMatches(q, cmdOnly);
    var strong = local.filter(function (x) { return x._score >= 700; });
    var weak = local.filter(function (x) { return x._score < 700; });
    var bestLocal = local.length ? local[0]._score : 0;
    var liveGroups = [];
    if (!cmdOnly && q.length >= 2) {
      var live = P.liveQ === q ? P.live : null;
      if (!live && P.loading && P.live && !P.live.error && P.liveQ && norm(q).indexOf(norm(P.liveQ)) === 0) live = P.live;
      if (live && live.top) liveGroups.push({ label: 'Top result', items: [musicItem(live.top, q)] });
      if (live) (live.groups || []).forEach(function (g) {
        liveGroups.push({ label: g.label, items: g.items.slice(0, g.key === 'artists' ? 4 : 3).map(function (x) { return musicItem(x, q); }) });
      });
      if (!live && P.loading) liveGroups.push({ label: 'Searching wavernrs', items: [], loading: true });
    }
    // Strong local hits (a page or action name) lead; music follows; then
    // looser local matches so typos still land somewhere.
    var top = strong.slice(0, 6);
    var rest = strong.slice(6).concat(weak).slice(0, top.length ? 4 : 8);
    var shown = {};
    top.concat(rest).forEach(function (x) { shown[x.id] = 1; });
    liveGroups = liveGroups.map(function (g) {
      return { label: g.label, loading: g.loading, items: g.items.filter(function (x) { return !shown[x.id]; }) };
    }).filter(function (g) { return g.items.length || g.loading; });
    if (top.length) groups.push({ label: cmdOnly ? 'Commands' : bestLocal >= 1300 ? 'Best match' : 'Pages & actions', items: top });
    groups = groups.concat(liveGroups);
    if (rest.length) groups.push({ label: top.length ? 'More' : cmdOnly ? 'Commands' : 'Pages & actions', items: rest });
    if (!cmdOnly && q.length >= 2) {
      groups.push({ label: 'Search', note: P.live && P.live.error && P.liveQ === q ? 'live results are unavailable rn' : '', items: [{ id: 'act:fullsearch', nav: true, kind: 'action', title: 'Search everything for “' + q + '”', sub: 'comps, edits, editors and the ye archive', icon: 'search', noRecent: true,
        run: function () { rememberQuery(q); if (typeof navSearch === 'function') navSearch(q); else go('/search?q=' + enc(q)); } }] });
    }
    return groups;
  }
  function musicItem(x, q) {
    return { id: 'm:' + x.id, kind: 'music', title: x.title, sub: x.sub, href: x.href, art: x.art || '', round: !!x.round, play: x.play || null, _hl: q };
  }

  function refresh() {
    if (!isOpen()) return;
    P.root.classList.toggle('has-q', !!P.q);
    P.root.classList.toggle('is-cmd', P.q.charAt(0) === '>');
    P.groups = P.q.trim() ? typedGroups() : emptyGroups();
    render();
  }

  function onInput() {
    var raw = P.input.value;
    if (raw.charAt(0) === '>') { P.input.value = raw.slice(1).replace(/^\s+/, ''); P.forceCmd = true; }
    P.q = (P.forceCmd ? '>' : '') + P.input.value;
    P.moved = false;
    var q = P.forceCmd ? '' : P.input.value.trim();
    clearTimeout(P.timer);
    var qs = QS();
    if (q.length >= 2 && qs && qs.fetch) {
      var seq = ++P.seq;
      P.loading = true;
      P.root.classList.add('is-loading');
      P.timer = setTimeout(function () {
        qs.fetch(q).then(function (res) {
          if (!isOpen() || seq !== P.seq) return;
          P.loading = false;
          P.root.classList.remove('is-loading');
          P.live = res; P.liveQ = q;
          refresh();
        });
      }, 150);
    } else {
      P.seq++;
      P.loading = false;
      P.root.classList.remove('is-loading');
    }
    refresh();
  }

  // ── running things ────────────────────────────────────────────────────────
  function execute(it, e) {
    if (!it) return;
    var q = P.forceCmd ? '' : P.input.value.trim();
    if (it.kind === 'query') {
      P.input.value = it.fill || it.title;
      P.forceCmd = false;
      onInput();
      P.input.focus();
      return;
    }
    if (e && e.shiftKey && it.play) {
      recordItem(it);
      if (q) rememberQuery(q);
      close();
      playItem(it.play);
      return;
    }
    if (it.href && e && (e.metaKey || e.ctrlKey)) {
      recordItem(it);
      window.open(it.href, '_blank', 'noopener');
      return;
    }
    recordItem(it);
    if (q && (it.kind === 'music' || it.kind === 'played')) rememberQuery(q);
    if (it.run) {
      close(!!it.nav);
      try { it.run(); } catch (err) { toast('that didnt work...try again', 'error'); }
      return;
    }
    close(true);
    if (it.href) go(it.href);
  }

  function jumpGroup(dir) {
    var starts = P.groupStarts || [];
    if (!starts.length) return;
    var at = -1;
    for (var i = 0; i < starts.length; i++) if (starts[i] <= P.active) at = i;
    var next = at + dir;
    if (next >= starts.length) next = 0;
    if (next < 0) next = starts.length - 1;
    P.moved = true;
    setActive(starts[next]);
  }
  function move(d) {
    var n = P.items.length;
    if (!n) return;
    var i = P.active + d;
    if (i >= n) i = d > 1 ? n - 1 : 0;
    else if (i < 0) i = d < -1 ? 0 : n - 1;
    P.moved = true;
    setActive(i);
  }

  function onKey(e) {
    if (!isOpen()) return;
    var k = e.key;
    if (e.isComposing) return;
    if (k === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (P.input.value && !phone()) { P.input.value = ''; P.forceCmd = false; onInput(); return; }
      close();
      return;
    }
    if (k === 'ArrowDown' || (e.ctrlKey && (k === 'n' || k === 'j'))) { e.preventDefault(); move(1); return; }
    if (k === 'ArrowUp' || (e.ctrlKey && (k === 'p' || k === 'k'))) { e.preventDefault(); move(-1); return; }
    if (k === 'PageDown') { e.preventDefault(); move(6); return; }
    if (k === 'PageUp') { e.preventDefault(); move(-6); return; }
    if (k === 'Home' && e.ctrlKey) { e.preventDefault(); P.moved = true; setActive(0); return; }
    if (k === 'End' && e.ctrlKey) { e.preventDefault(); P.moved = true; setActive(P.items.length - 1); return; }
    if (k === 'Tab') { e.preventDefault(); jumpGroup(e.shiftKey ? -1 : 1); return; }
    if (k === 'Enter') {
      e.preventDefault();
      var it = P.items[P.active];
      if (it) execute(it, e);
      else if (P.input.value.trim().length >= 2 && !P.forceCmd) { var q = P.input.value.trim(); rememberQuery(q); close(true); if (typeof navSearch === 'function') navSearch(q); }
      return;
    }
    if (k === 'Backspace' && P.forceCmd && !P.input.value) { e.preventDefault(); P.forceCmd = false; onInput(); return; }
  }

  // ── open / close ──────────────────────────────────────────────────────────
  function open(initial) {
    if (isOpen()) { P.input.focus(); P.input.select(); return; }
    if (blocked()) return;
    styleOnce();
    var keys = document.getElementById('wv-keys');
    if (keys) keys.remove();
    var picker = document.getElementById('wv-theme-picker');
    if (picker) picker.remove();
    var qsx = QS();
    if (qsx && qsx.close) { try { qsx.close(); } catch (_) {} }
    var sug = document.getElementById('wv-suggest');
    if (sug) sug.remove();

    var root = document.createElement('div');
    root.id = 'wv-palette';
    root.innerHTML =
      '<div class="wvp-scrim" data-close="1"></div>' +
      '<div class="wvp-panel" role="dialog" aria-modal="true" aria-label="Command palette">' +
        '<div class="wvp-head">' +
          '<span class="wvp-lens">' + I.search + '</span>' +
          '<span class="wvp-mode">commands</span>' +
          '<input class="wvp-input" type="text" role="combobox" aria-expanded="true" aria-controls="wvp-list" aria-autocomplete="list" aria-label="Search music, pages and actions" ' +
            'placeholder="Search music, pages and actions…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">' +
          '<span class="wvp-spin" aria-hidden="true"></span>' +
          '<button type="button" class="wvp-clear" aria-label="Clear">' + stroke('<path d="M6 6l12 12M18 6 6 18"/>', 14) + '</button>' +
          '<button type="button" class="wvp-esc" aria-label="Close" title="Close (Esc)">esc</button>' +
          '<button type="button" class="wvp-cancel">Cancel</button>' +
        '</div>' +
        '<div class="wvp-list" id="wvp-list" role="listbox" aria-label="Results"></div>' +
        '<div class="wvp-foot" aria-hidden="true"></div>' +
      '</div>';
    document.body.appendChild(root);

    P = {
      root: root, input: root.querySelector('.wvp-input'), list: root.querySelector('.wvp-list'), foot: root.querySelector('.wvp-foot'),
      items: [], groups: [], active: -1, q: '', seq: 0, live: null, liveQ: '', loading: false, moved: false, forceCmd: false,
      prevFocus: document.activeElement, cmds: buildCommands(), groupStarts: [], timer: 0,
    };
    P.input.addEventListener('input', onInput);
    P.input.addEventListener('keydown', onKey);
    root.addEventListener('mousedown', function (e) {
      if (e.target.closest('.wvp-row, .wvp-scrim')) e.preventDefault();
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-close], .wvp-esc, .wvp-cancel')) { close(); return; }
      if (e.target.closest('.wvp-clear')) { P.input.value = ''; P.forceCmd = false; onInput(); P.input.focus(); return; }
      var row = e.target.closest('.wvp-row');
      if (!row) return;
      var it = P.items[+row.getAttribute('data-i')];
      if (!it) return;
      if (e.target.closest('[data-act="play"]')) { execute(it, { shiftKey: true }); return; }
      execute(it, e);
    });
    root.addEventListener('auxclick', function (e) {
      if (e.button !== 1) return;
      var row = e.target.closest('.wvp-row');
      var it = row && P.items[+row.getAttribute('data-i')];
      if (it && it.href) { e.preventDefault(); recordItem(it); window.open(it.href, '_blank', 'noopener'); }
    });
    P.list.addEventListener('mousemove', function (e) {
      var row = e.target.closest('.wvp-row');
      if (!row) return;
      var i = +row.getAttribute('data-i');
      if (i !== P.active) { P.moved = true; setActive(i, true); }
    });
    root.querySelector('.wvp-scrim').addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });

    if (initial) {
      if (initial.charAt(0) === '>') { P.forceCmd = true; P.input.value = initial.slice(1).trim(); }
      else P.input.value = initial;
      onInput();
    } else refresh();
    P.input.focus();
    try { P.input.select(); } catch (_) {}
    if (reduced()) root.querySelectorAll('.wvp-scrim,.wvp-panel').forEach(function (el) { el.style.animation = 'none'; });
  }

  function close(navigating) {
    if (!isOpen()) { P = null; return; }
    var root = P.root, prev = P.prevFocus;
    clearTimeout(P.timer);
    P.seq++;
    P = null;
    var done = function () { if (root.parentNode) root.remove(); };
    if (reduced() || navigating) done();
    else { root.classList.add('is-closing'); setTimeout(done, 110); }
    var searchBox = prev && (prev.id === 'wv-search-inp' || (prev.classList && prev.classList.contains('am-search-inp')));
    if (!navigating && !searchBox && prev && prev.isConnected && typeof prev.focus === 'function') {
      try { prev.focus({ preventScroll: true }); } catch (_) {}
    }
  }

  function toggle() { if (isOpen()) close(); else open(); }

  // ── global keys ───────────────────────────────────────────────────────────
  // A page can own Cmd+K for a scoped search of its own (the Ye archive
  // does); there the palette steps aside and stays one click away in the
  // top bar.
  function pageOwnsCmdK() {
    return !!(document.getElementById('ys-trig') && typeof window.yeSearch === 'function' && /\/resources(\.html)?$/.test(location.pathname));
  }
  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (k === 'k' || k === 'K' || e.code === 'KeyK')) {
      if (isOpen()) { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
      if (pageOwnsCmdK() || blocked()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    }
  }, true);

  // G then a letter jumps to a page, GitHub style.
  var gAt = 0, gTimer = 0;
  function goChip(show) {
    var el = document.getElementById('wvp-gochip');
    if (!show) { if (el) el.remove(); return; }
    if (el) return;
    try { if (window.matchMedia('(max-width: 768px)').matches) return; } catch (_) {}
    styleOnce();
    el = document.createElement('div');
    el.id = 'wvp-gochip';
    el.setAttribute('role', 'status');
    var keys = ['h', 'b', 'c', 'a', 'y', 'r', 'l', 'p'];
    el.innerHTML = '<b>go to</b>' + keys.map(function (k) { return '<span><kbd>' + k.toUpperCase() + '</kbd>' + esc(GO[k][1].toLowerCase()) + '</span>'; }).join('');
    document.body.appendChild(el);
  }
  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || isOpen()) { if (gAt) { gAt = 0; goChip(false); } return; }
    var k = String(e.key || '').toLowerCase();
    if (gAt && Date.now() - gAt < 1500) {
      gAt = 0; clearTimeout(gTimer); goChip(false);
      if (k === 'shift') return;
      var dest = GO[k];
      if (dest && !blocked()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pushRecent({ id: 'page:' + dest[0], kind: 'cmd' });
        go(dest[2]);
      }
      return;
    }
    if (k === 'g' && !e.shiftKey && !e.repeat && !blocked()) {
      if (document.querySelector('.wv-sheet, #wv-theme-picker, #wv-keys, #player-fullscreen.open')) return;
      gAt = Date.now();
      clearTimeout(gTimer);
      gTimer = setTimeout(function () { gAt = 0; goChip(false); }, 1500);
      setTimeout(function () { if (gAt) goChip(true); }, 350);
    }
  }, true);

  // While open the palette is modal: keep focus inside it, and let Esc and
  // the list keys work even if a page script moved focus elsewhere.
  function inOtherDialog(t) {
    return !!(t && t.closest && t.closest('#wv-toasts, [role="dialog"], [aria-modal="true"], .ys-ov, .wv-sheet, #wv-keys'));
  }
  document.addEventListener('focusin', function (e) {
    if (!isOpen() || P.root.contains(e.target) || inOtherDialog(e.target)) return;
    try { P.input.focus({ preventScroll: true }); } catch (_) {}
  }, true);
  window.addEventListener('keydown', function (e) {
    if (!isOpen() || P.root.contains(e.target) || inOtherDialog(e.target)) return;
    if (['Escape', 'ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'PageDown', 'PageUp'].indexOf(e.key) < 0) return;
    e.stopPropagation();
    onKey(e);
    try { P && P.input.focus({ preventScroll: true }); } catch (_) {}
  }, true);

  // Close on navigation.
  window.addEventListener('popstate', function () { if (isOpen()) close(true); });
  window.addEventListener('wv-navigate', function () { if (isOpen()) close(true); });

  // ── keyboard shortcuts sheet ──────────────────────────────────────────────
  var _origHelp = window.wvShortcutsHelp;
  function isStockHelp(f) {
    if (typeof f !== 'function') return true;
    try { var src = String(f); return src.indexOf("'This list'") >= 0 || src.indexOf('wv-keys-overlay') >= 0; } catch (_) { return false; }
  }
  window.wvShortcutsExtra = window.wvShortcutsExtra || [];
  function kbds(keys) {
    return keys.map(function (k) { return k === 'then' ? '<em>then</em>' : '<kbd>' + esc(k) + '</kbd>'; }).join('');
  }
  function shortcutsHelp() {
    var existing = document.getElementById('wv-keys');
    if (existing) { existing.remove(); return; }
    if (isOpen()) close(true);
    styleOnce();
    var SECTIONS = [
      { t: 'Playback', rows: [
        [['Space'], 'Play or pause'],
        [['←', '→'], 'Back or forward 10s'],
        [['Shift', '←'], 'Previous track'],
        [['Shift', '→'], 'Next track'],
        [['Shift', '↑', '↓'], 'Volume'],
        [['S'], 'Shuffle'],
        [['R'], 'Repeat'],
        [['M'], 'Mute'],
      ] },
      { t: 'Navigation', rows: [
        [[MOD, 'K'], 'Command palette'],
        [['/'], 'Search'],
        [['G', 'then', 'H'], 'Home'],
        [['G', 'then', 'B'], 'Browse'],
        [['G', 'then', 'C'], 'Charts'],
        [['G', 'then', 'A'], 'Archive'],
        [['G', 'then', 'Y'], 'Ye archive'],
        [['G', 'then', 'L'], 'Your library'],
        [['G', 'then', 'R'], 'Radio'],
        [['G', 'then', 'P'], 'Playlists'],
      ] },
      { t: 'General', rows: [
        [['T'], 'Theme picker'],
        [['?'], 'This sheet'],
        [['Esc'], 'Close what’s open'],
        [['G', 'then', 'S'], 'Settings'],
        [['G', 'then', 'E'], 'Editors'],
        [['G', 'then', 'U'], 'Upload'],
        [['G', 'then', 'N'], 'Notifications'],
        [['G', 'then', 'I'], 'History'],
      ] },
    ];
    (window.wvShortcutsExtra || []).forEach(function (x) {
      if (!x || !x.keys || !x.label) return;
      var sec = SECTIONS.filter(function (s) { return s.t.toLowerCase() === String(x.group || 'General').toLowerCase(); })[0] || SECTIONS[2];
      sec.rows.push([[].concat(x.keys), String(x.label)]);
    });
    var prev = document.activeElement;
    var wrap = document.createElement('div');
    wrap.id = 'wv-keys';
    wrap.className = 'wvk';
    wrap.innerHTML = '<div class="wvk-scrim"></div>' +
      '<div class="wvk-card" role="dialog" aria-modal="true" aria-labelledby="wvk-title" tabindex="-1">' +
        '<div class="wvk-head"><div><h2 id="wvk-title">Keyboard shortcuts</h2><p>get around wavernrs without touching the mouse</p></div>' +
        '<button type="button" class="wvk-x" aria-label="Close">' + stroke('<path d="M6 6l12 12M18 6 6 18"/>', 18) + '</button></div>' +
        '<button type="button" class="wvk-cta"><span class="wvk-cta-ic">' + I.search + '</span><span class="wvk-cta-t"><b>Command palette</b><small>jump anywhere, search everything, control playback</small></span>' +
        '<span class="wvp-k"><kbd>' + esc(MOD) + '</kbd><kbd>K</kbd></span></button>' +
        '<div class="wvk-grid">' + SECTIONS.map(function (s) {
          return '<section class="wvk-sec"><h3>' + esc(s.t) + '</h3><dl>' + s.rows.map(function (r) {
            return '<div><dt>' + esc(r[1]) + '</dt><dd>' + kbds(r[0]) + '</dd></div>';
          }).join('') + '</dl></section>';
        }).join('') + '</div>' +
      '</div>';
    function shut() {
      wrap.remove();
      document.removeEventListener('keydown', onEsc, true);
      if (prev && prev.isConnected && typeof prev.focus === 'function') { try { prev.focus({ preventScroll: true }); } catch (_) {} }
    }
    function onEsc(e) {
      if (!wrap.isConnected) { document.removeEventListener('keydown', onEsc, true); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); return; }
      if (e.key === 'Tab') {
        var f = wrap.querySelectorAll('button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !wrap.contains(document.activeElement) || document.activeElement.classList.contains('wvk-card'))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.wvk-cta')) { shut(); open(); return; }
      if (e.target.closest('.wvk-x') || e.target.classList.contains('wvk-scrim')) shut();
    });
    document.addEventListener('keydown', onEsc, true);
    document.body.appendChild(wrap);
    try { wrap.querySelector('.wvk-card').focus({ preventScroll: true }); } catch (_) {}
  }
  if (isStockHelp(_origHelp)) window.wvShortcutsHelp = shortcutsHelp;

  // ── ⌘K hint in the search field ───────────────────────────────────────────
  function injectHints() {
    var wraps = document.querySelectorAll('#wv-topbar .wv-search-wrap, #wv-sidebar .am-search');
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var mine = wrap.querySelector('.wvp-hint');
      var foreign = false;
      wrap.querySelectorAll('kbd, [onclick*="wvOpenPalette"], [data-palette], .wv-cmdk, .wv-kbd-hint, .wv-search-kbd').forEach(function (el) {
        if (!(mine && (el === mine || mine.contains(el)))) foreign = true;
      });
      if (foreign) { if (mine) mine.remove(); continue; }
      if (mine) continue;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wvp-hint';
      b.setAttribute('aria-label', 'Open command palette');
      b.title = 'Command palette (' + (IS_MAC ? '⌘K' : 'Ctrl+K') + ')';
      b.innerHTML = '<kbd>' + (IS_MAC ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd>';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
      var inp = wrap.querySelector('input');
      var div = wrap.querySelector('.sp-search-div');
      if (div) wrap.insertBefore(b, div);
      else if (inp && inp.nextSibling) wrap.insertBefore(b, inp.nextSibling);
      else wrap.appendChild(b);
    }
  }
  var _hintQueued = false;
  function queueHints() {
    if (_hintQueued) return;
    _hintQueued = true;
    (window.requestAnimationFrame || setTimeout)(function () { _hintQueued = false; injectHints(); });
  }
  function watchShell(tries) {
    var top = document.getElementById('wv-topbar');
    if (!top) { if ((tries || 0) < 40) setTimeout(function () { watchShell((tries || 0) + 1); }, 250); return; }
    styleOnce();
    injectHints();
    try {
      var mo = new MutationObserver(queueHints);
      mo.observe(top, { childList: true });
      var side = document.getElementById('wv-sidebar');
      if (side) mo.observe(side, { childList: true });
      var sw = top.querySelector('.wv-search-wrap');
      if (sw) mo.observe(sw, { childList: true });
      document.addEventListener('wv-theme-change', function () { setTimeout(function () { injectHints(); var s2 = document.querySelector('#wv-topbar .wv-search-wrap'); if (s2) mo.observe(s2, { childList: true }); }, 0); });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { watchShell(0); });
  else watchShell(0);

  // ── public ────────────────────────────────────────────────────────────────
  window.wvOpenPalette = function (q) { open(typeof q === 'string' ? q : ''); };
  window.wvClosePalette = function () { close(); };
  window.wvTogglePalette = toggle;
  window.wvPalette = { open: window.wvOpenPalette, close: window.wvClosePalette, toggle: toggle, isOpen: isOpen, shortcuts: shortcutsHelp };
})();
