// Star rating widget — shared by track.html and album.html.
// Exposes window.loadRatings(entityType, entityId).
// Renders into #rating-widget: five rate-able stars (a radiogroup), the
// community average as fractional stars, and a popover with the 1–5 breakdown
// when the API sends one (dist). Works without dist on older API builds.
(function () {
  'use strict';

  var EMPTY = { avg: null, count: 0, user_rating: null, dist: null };
  var _data = Object.assign({}, EMPTY);
  var _entityType = null;
  var _entityId = null;
  var _saving = false;
  var _seq = 0;
  var _preview = 0;
  var _hoverT = null;
  var _popUntil = 0;
  var STAR = 'M12 2.6l2.93 5.94 6.56.95-4.75 4.63 1.12 6.53L12 17.57l-5.86 3.08 1.12-6.53L2.51 9.49l6.56-.95L12 2.6z';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  }
  function token() { try { return localStorage.getItem('token'); } catch (_) { return null; } }
  function toast(msg, kind, ms, opts) { if (typeof window.wvToast === 'function') window.wvToast(msg, kind || '', ms, opts); }
  function noun() { return _entityType === 'track' ? 'track' : 'comp'; }

  function injectCss() {
    if (document.getElementById('wvr-style')) return;
    var st = document.createElement('style');
    st.id = 'wvr-style';
    st.textContent = [
      '.wvr{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;--wvr-on:#f5a524;--wvr-off:color-mix(in srgb,var(--text-3) 70%,transparent)}',
      '.wvr-stars{display:inline-flex;align-items:center;border-radius:10px;outline:none}',
      '.wvr-star{position:relative;display:inline-grid;place-items:center;width:28px;height:32px;padding:0;margin:0;border:0;background:none;cursor:pointer;line-height:0;border-radius:8px;-webkit-tap-highlight-color:transparent;color:inherit}',
      '.wvr-star:focus-visible{outline:2px solid var(--brand);outline-offset:1px}',
      '.wvr-s{position:relative;display:block;width:21px;height:21px}',
      '.wvr-s svg{position:absolute;inset:0;width:21px;height:21px;display:block}',
      '.wvr-s .o path{fill:none;stroke:var(--wvr-off);stroke-width:1.6;stroke-linejoin:round}',
      '.wvr-f{position:absolute;inset:0;overflow:hidden;width:0}',
      '.wvr-f svg path{fill:var(--wvr-on)}',
      '.wvr.is-avg .wvr-f svg path{fill:color-mix(in srgb,var(--wvr-on) 55%,var(--text-3))}',
      '.wvr.is-avg .wvr-s .o path{stroke:color-mix(in srgb,var(--wvr-on) 30%,var(--wvr-off))}',
      '.wvr.is-preview .wvr-f svg path{fill:var(--wvr-on)}',
      '.wvr.is-saving .wvr-stars{opacity:.6;pointer-events:none}',
      '@media (hover:hover){.wvr-star:hover .wvr-s{transform:scale(1.14)}}',
      '.wvr-s{transition:transform .16s cubic-bezier(.3,1.4,.5,1)}',
      '.wvr-star.pop .wvr-s{animation:wvrPop .46s cubic-bezier(.3,1.5,.5,1) both}',
      '@keyframes wvrPop{0%{transform:scale(1)}35%{transform:scale(1.42) rotate(-8deg)}65%{transform:scale(.92)}100%{transform:scale(1)}}',
      '.wvr-sum{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 10px 0 8px;margin:0;border:1px solid transparent;border-radius:999px;background:none;font:inherit;font-size:13px;color:var(--text-3);cursor:default;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.wvr-sum b{color:var(--text);font-weight:750;font-size:14px}',
      '.wvr-sum.has-pop{cursor:pointer}',
      '.wvr-sum.has-pop:hover,.wvr-sum[aria-expanded="true"]{background:var(--surface-2);border-color:var(--hair)}',
      '.wvr-sum:focus-visible{outline:2px solid var(--brand);outline-offset:2px}',
      '.wvr-sum .chev{width:12px;height:12px;opacity:.7;transition:transform .18s}',
      '.wvr-sum[aria-expanded="true"] .chev{transform:rotate(180deg)}',
      '.wvr-msg{font-size:12.5px;color:var(--text-3);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.wvr-msg.err{color:var(--red,#ef4444)}',
      '@media (pointer:coarse){.wvr-star{width:32px;height:40px}.wvr-sum{min-height:40px}}',
      '.wvr-pop{position:fixed;z-index:9000;width:280px;max-width:calc(100vw - 24px);padding:16px 16px 14px;border-radius:16px;background:var(--elevated,var(--surface));color:var(--text);border:1px solid var(--hair-strong,var(--border));box-shadow:0 18px 50px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.18);opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top left;transition:opacity .16s ease,transform .18s cubic-bezier(.2,.9,.3,1.2)}',
      '.wvr-pop.in{opacity:1;transform:none}',
      '.wvr-pop-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}',
      '.wvr-pop-avg{font-size:34px;font-weight:850;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}',
      '.wvr-pop-top .wvr{pointer-events:none}',
      '.wvr-pop-top .wvr-star{width:18px;height:18px}.wvr-pop-top .wvr-s,.wvr-pop-top .wvr-s svg{width:16px;height:16px}',
      '.wvr-pop-n{font-size:12.5px;color:var(--text-3);margin-top:3px}',
      '.wvr-rows{display:grid;gap:7px;margin:0;padding:0;list-style:none}',
      '.wvr-row{display:grid;grid-template-columns:28px 1fr 40px;align-items:center;gap:10px;font-size:12.5px;color:var(--text-2);font-variant-numeric:tabular-nums}',
      '.wvr-row .k{display:inline-flex;align-items:center;gap:3px;font-weight:700}',
      '.wvr-row .k svg{width:11px;height:11px}.wvr-row .k svg path{fill:var(--text-3)}',
      '.wvr-row.mine .k{color:var(--brand)}.wvr-row.mine .k svg path{fill:var(--brand)}',
      '.wvr-bar{height:8px;border-radius:99px;background:var(--surface-3,var(--surface-2));overflow:hidden}',
      '.wvr-bar i{display:block;height:100%;width:0;border-radius:inherit;background:var(--brand);transition:width .55s cubic-bezier(.2,.8,.2,1)}',
      '.wvr-row.mine .wvr-bar i{background:linear-gradient(90deg,var(--brand),color-mix(in srgb,var(--brand) 60%,#fff))}',
      '.wvr-row .p{text-align:right;color:var(--text-3)}',
      '.wvr-pop-foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--hair);font-size:12.5px;color:var(--text-3)}',
      '.wvr-pop-foot b{color:var(--text);font-weight:700}',
      '@media (prefers-reduced-motion:reduce){.wvr-s,.wvr-sum .chev,.wvr-pop,.wvr-bar i{transition:none!important}.wvr-star.pop .wvr-s{animation:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function starSvg(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + STAR + '"/></svg>';
  }

  // One star with a clipped fill layer so any fraction (0–1) can show.
  function starInner(frac) {
    var pct = Math.max(0, Math.min(1, frac)) * 100;
    return '<span class="wvr-s">' + starSvg('o') + '<span class="wvr-f" style="width:' + pct.toFixed(1) + '%">' + starSvg('f') + '</span></span>';
  }

  // Read-only fractional star row used inside the popover.
  function staticStars(value) {
    var h = '<span class="wvr is-avg" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) h += '<span class="wvr-star">' + starInner((value || 0) - (i - 1)) + '</span>';
    return h + '</span>';
  }

  function hasDist() {
    return Array.isArray(_data.dist) && _data.dist.length === 5 && _data.count > 0;
  }

  function fmtAvg(a) {
    var n = Number(a);
    return isFinite(n) ? n.toFixed(1) : '';
  }

  function shownValue() {
    if (_preview) return _preview;
    if (_data.user_rating) return _data.user_rating;
    return _data.count > 0 ? Number(_data.avg) || 0 : 0;
  }

  function paint() {
    var root = document.querySelector('#rating-widget .wvr');
    if (!root) return;
    var v = shownValue();
    var isAvg = !_preview && !_data.user_rating && _data.count > 0;
    root.classList.toggle('is-avg', isAvg);
    root.classList.toggle('is-preview', !!_preview);
    var btns = root.querySelectorAll('.wvr-star');
    for (var i = 0; i < btns.length; i++) {
      var f = btns[i].querySelector('.wvr-f');
      if (f) f.style.width = (Math.max(0, Math.min(1, v - i)) * 100).toFixed(1) + '%';
    }
  }

  function summaryHtml(msg, isErr) {
    if (msg) return '<span class="wvr-msg' + (isErr ? ' err' : '') + '" role="status">' + esc(msg) + '</span>';
    if (!(_data.count > 0)) return '<span class="wvr-sum" id="wvr-sum">no ratings yet</span>';
    var pop = hasDist();
    var label = fmtAvg(_data.avg) + ' average from ' + _data.count + ' rating' + (_data.count !== 1 ? 's' : '');
    var inner = '<b>' + esc(fmtAvg(_data.avg)) + '</b><span>· ' + esc(_data.count) + ' rating' + (_data.count !== 1 ? 's' : '') + '</span>';
    if (!pop) return '<span class="wvr-sum" id="wvr-sum" aria-label="' + esc(label) + '">' + inner + '</span>';
    return '<button type="button" class="wvr-sum has-pop" id="wvr-sum" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(label + ', show breakdown') + '">' + inner +
      '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>';
  }

  function _buildWidget(statusMsg, isErr) {
    var container = document.getElementById('rating-widget');
    if (!container) return;
    injectCss();
    closePop();
    var loggedIn = !!token();
    var current = _data.user_rating || 0;
    var focusIdx = current || 1;
    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
      var lbl = i + ' star' + (i > 1 ? 's' : '') + (loggedIn ? '' : ' (log in to rate)');
      starsHtml += '<button type="button" class="wvr-star" role="radio" data-s="' + i + '" aria-checked="' + (current === i ? 'true' : 'false') + '" aria-label="' + esc(lbl) + '" tabindex="' + (i === focusIdx ? '0' : '-1') + '">' + starInner(0) + '</button>';
    }
    var groupLbl = current ? 'your rating: ' + current + ' of 5' : 'rate this ' + noun();
    container.innerHTML =
      '<div class="wvr' + (_saving ? ' is-saving' : '') + '">' +
        '<div class="wvr-stars" role="radiogroup" aria-label="' + esc(groupLbl) + '"' + (loggedIn ? '' : ' title="log in to rate"') + '>' + starsHtml + '</div>' +
        summaryHtml(statusMsg, isErr) +
      '</div>';
    paint();
    wire(container, loggedIn);
  }

  function wire(container, loggedIn) {
    var starsEl = container.querySelector('.wvr-stars');
    if (!starsEl) return;
    var fine = false; try { fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (_) {}
    if (fine) {
      starsEl.addEventListener('mousemove', function (e) {
        var btn = e.target.closest('.wvr-star');
        if (!btn) return;
        var n = parseInt(btn.getAttribute('data-s'), 10);
        if (n !== _preview) { _preview = n; paint(); }
      });
      starsEl.addEventListener('mouseleave', function () { _preview = 0; paint(); });
    }
    starsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.wvr-star');
      if (!btn) return;
      commit(parseInt(btn.getAttribute('data-s'), 10));
    });
    starsEl.addEventListener('keydown', function (e) {
      var btn = e.target.closest('.wvr-star');
      if (!btn) return;
      var n = parseInt(btn.getAttribute('data-s'), 10);
      var to = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = Math.min(5, n + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = Math.max(1, n - 1);
      else if (e.key === 'Home') to = 1;
      else if (e.key === 'End') to = 5;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(n); return; }
      if (to == null) return;
      e.preventDefault();
      moveFocus(to);
    });
    starsEl.addEventListener('focusout', function (e) {
      if (!starsEl.contains(e.relatedTarget)) { _preview = 0; paint(); }
    });

    var sum = container.querySelector('button.wvr-sum');
    if (sum) {
      sum.addEventListener('click', function (e) { e.stopPropagation(); if (document.getElementById('wvr-pop')) closePop(); else openPop(sum); });
      if (fine) {
        sum.addEventListener('mouseenter', function () { clearTimeout(_hoverT); _hoverT = setTimeout(function () { if (!document.getElementById('wvr-pop')) openPop(sum, true); }, 260); });
        sum.addEventListener('mouseleave', function () { clearTimeout(_hoverT); _hoverT = setTimeout(function () { var p = document.getElementById('wvr-pop'); if (p && p._hover && !p.matches(':hover')) closePop(); }, 220); });
      }
    }
  }

  function moveFocus(n) {
    var btns = document.querySelectorAll('#rating-widget .wvr-star');
    for (var i = 0; i < btns.length; i++) btns[i].tabIndex = (i + 1 === n) ? 0 : -1;
    if (btns[n - 1]) btns[n - 1].focus();
    _preview = n; paint();
  }

  function popStars(val) {
    if (reduced() || !val) return;
    _popUntil = Date.now() + 480 + val * 45;
    var btns = document.querySelectorAll('#rating-widget .wvr-star');
    for (var i = 0; i < val && i < btns.length; i++) {
      (function (b, d) {
        b.classList.remove('pop');
        b.style.animationDelay = '';
        var s = b.querySelector('.wvr-s'); if (s) s.style.animationDelay = (d * 45) + 'ms';
        void b.offsetWidth;
        b.classList.add('pop');
      })(btns[i], i);
    }
  }

  function commit(val) {
    if (!token()) {
      var next = location.pathname + location.search;
      toast('log in to rate this ' + noun());
      if (typeof navigate === 'function') navigate('/login?next=' + encodeURIComponent(next));
      else location.href = '/login?next=' + encodeURIComponent(next);
      return;
    }
    var prev = _data.user_rating || null;
    var newVal = prev === val ? null : val;
    save(newVal, prev, true);
  }

  async function save(newVal, prev, withToast) {
    if (_saving || !_entityType || !_entityId) return;
    var t = token();
    if (!t) return;
    var type = _entityType, id = _entityId;
    _saving = true;
    _preview = 0;
    _data.user_rating = newVal;
    _buildWidget();
    var root = document.querySelector('#rating-widget .wvr'); if (root) root.classList.add('is-saving');
    popStars(newVal);
    try {
      var resp;
      if (newVal === null) {
        resp = await fetch(API_BASE + '/ratings/' + encodeURIComponent(type) + '/' + encodeURIComponent(id), {
          method: 'DELETE', headers: { Authorization: 'Bearer ' + t },
        });
      } else {
        resp = await fetch(API_BASE + '/ratings', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: id, entity_type: type, rating: newVal }),
        });
      }
      if (!resp.ok) {
        var errJson = {};
        try { errJson = await resp.json(); } catch (_) {}
        if (resp.status === 401) throw new Error('log in again to rate');
        throw new Error(errJson.error || ('HTTP ' + resp.status));
      }
    } catch (err) {
      _saving = false;
      if (type !== _entityType || id !== _entityId) return;
      _data.user_rating = prev;
      _buildWidget('didnt save: ' + ((err && err.message) || 'try again'), true);
      setTimeout(function () { if (type === _entityType && id === _entityId && !_saving) _buildWidget(); }, 3200);
      return;
    }
    _saving = false;
    if (type !== _entityType || id !== _entityId) return;
    if (withToast) {
      var starIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '" fill="#f5a524"/></svg>';
      var msg = newVal ? 'you rated it ' + newVal + '★' : 'rating removed';
      toast(msg, '', 5200, {
        icon: starIcon, title: msg, action: 'undo',
        onClick: function () { if (type === _entityType && id === _entityId) save(prev, newVal, false); }
      });
    }
    await _load(type, id);
  }

  // ── Histogram popover ────────────────────────────────────────────────────
  function closePop() {
    var p = document.getElementById('wvr-pop');
    if (!p) return;
    var sum = document.getElementById('wvr-sum');
    if (sum) sum.setAttribute('aria-expanded', 'false');
    if (p._off) p._off();
    p.remove();
  }

  function openPop(anchor, viaHover) {
    closePop();
    if (!hasDist()) return;
    var d = _data.dist.map(function (n) { return Math.max(0, Number(n) || 0); });
    var total = d.reduce(function (a, b) { return a + b; }, 0) || _data.count || 1;
    var max = Math.max.apply(null, d) || 1;
    var mine = _data.user_rating || 0;
    var rows = '';
    for (var s = 5; s >= 1; s--) {
      var n = d[s - 1];
      var pct = Math.round(n / total * 100);
      rows += '<li class="wvr-row' + (mine === s ? ' mine' : '') + '" aria-label="' + s + ' stars: ' + n + ' (' + pct + '%)">' +
        '<span class="k">' + s + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR + '"/></svg></span>' +
        '<span class="wvr-bar"><i data-w="' + (n / max * 100).toFixed(1) + '"></i></span>' +
        '<span class="p">' + pct + '%</span></li>';
    }
    var p = document.createElement('div');
    p.id = 'wvr-pop';
    p.className = 'wvr-pop';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'rating breakdown');
    p.innerHTML =
      '<div class="wvr-pop-top"><div class="wvr-pop-avg">' + esc(fmtAvg(_data.avg)) + '</div>' +
        '<div>' + staticStars(Number(_data.avg) || 0) + '<div class="wvr-pop-n">' + esc(_data.count) + ' rating' + (_data.count !== 1 ? 's' : '') + '</div></div></div>' +
      '<ul class="wvr-rows">' + rows + '</ul>' +
      '<div class="wvr-pop-foot">' + (mine ? 'you gave it <b>' + mine + '★</b>' : (token() ? 'tap a star to add yours' : 'log in to add yours')) + '</div>';
    document.body.appendChild(p);
    p._hover = !!viaHover;
    var r = anchor.getBoundingClientRect();
    var w = p.offsetWidth, h = p.offsetHeight;
    var left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 12 && r.top - h - 8 > 12) { top = r.top - h - 8; p.style.transformOrigin = 'bottom left'; }
    p.style.left = left + 'px';
    p.style.top = top + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () {
      p.classList.add('in');
      var bars = p.querySelectorAll('.wvr-bar i');
      for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-w') + '%';
    });
    var onDoc = function (e) { if (!p.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closePop(); };
    var onKey = function (e) { if (e.key === 'Escape') { closePop(); try { anchor.focus(); } catch (_) {} } };
    var onScroll = function () { closePop(); };
    var onLeave = function () { if (!p._hover) return; clearTimeout(_hoverT); _hoverT = setTimeout(function () { if (!anchor.matches(':hover')) closePop(); }, 220); };
    var onEnter = function () { clearTimeout(_hoverT); };
    setTimeout(function () { document.addEventListener('pointerdown', onDoc, true); }, 0);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    p.addEventListener('mouseleave', onLeave);
    p.addEventListener('mouseenter', onEnter);
    p._off = function () {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    if (!window._pageCleanup) window._pageCleanup = [];
    window._pageCleanup.push(closePop);
  }

  async function _load(entityType, entityId) {
    var my = ++_seq;
    if (entityType !== _entityType || entityId !== _entityId) { _data = Object.assign({}, EMPTY); _saving = false; _preview = 0; }
    _entityType = entityType;
    _entityId = entityId;
    var next = Object.assign({}, EMPTY);
    try {
      var t = token();
      var headers = t ? { Authorization: 'Bearer ' + t } : {};
      var resp = await fetch(API_BASE + '/ratings/' + encodeURIComponent(entityType) + '/' + encodeURIComponent(entityId), { headers: headers });
      if (resp.ok) {
        var j = await resp.json();
        if (j && typeof j === 'object') {
          next.avg = j.avg == null ? null : Number(j.avg);
          next.count = Math.max(0, parseInt(j.count, 10) || 0);
          next.user_rating = j.user_rating ? Number(j.user_rating) : null;
          next.dist = Array.isArray(j.dist) && j.dist.length === 5 ? j.dist : null;
        }
      }
    } catch (e) { next = Object.assign({}, EMPTY); }
    if (my !== _seq) return;
    var wait = _popUntil - Date.now();
    if (wait > 0) { await new Promise(function (r) { setTimeout(r, wait); }); if (my !== _seq) return; }
    _data = next;
    if (!_saving) _buildWidget();
  }

  window.loadRatings = function (type, id) { return _load(type, id); };
  window._rH = function () {};
  window._rC = commit;
})();
