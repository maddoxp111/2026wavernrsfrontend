// Horizontal rails: paddles, edge fades, drag-to-scroll and keyboard paging
// for every sideways shelf on the site (.wv-rail, .scroll-row, .wv-era-strip).
// Rails hide their scrollbars, so without this a mouse user can't reach
// anything past the first few cards.
(function () {
  'use strict';
  if (window.wvRails) return;

  var SEL = '.wv-rail, .scroll-row, .wv-scroll-row, .wv-era-strip';
  var FADE = 56;
  var tracked = [];
  var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function css() {
    if (document.getElementById('wv-rails-css')) return;
    var s = document.createElement('style');
    s.id = 'wv-rails-css';
    s.textContent = [
      '.rl-wrap{position:relative;min-width:0;max-width:100%}',
      '.rl-on{--rl-fade:' + FADE + 'px;outline:none}',
      '.rl-on.rl-r{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - var(--rl-fade)),transparent);mask-image:linear-gradient(to right,#000 calc(100% - var(--rl-fade)),transparent)}',
      '.rl-on.rl-l{-webkit-mask-image:linear-gradient(to right,transparent,#000 var(--rl-fade));mask-image:linear-gradient(to right,transparent,#000 var(--rl-fade))}',
      '.rl-on.rl-l.rl-r{-webkit-mask-image:linear-gradient(to right,transparent,#000 var(--rl-fade),#000 calc(100% - var(--rl-fade)),transparent);mask-image:linear-gradient(to right,transparent,#000 var(--rl-fade),#000 calc(100% - var(--rl-fade)),transparent)}',
      '@media (max-width:640px){.rl-on{--rl-fade:28px}}',
      '.rl-wrap:has(> .wv-era-strip) + .wv-quick-grid{margin-top:26px;padding-top:26px;border-top:1px solid var(--border)}',
      '.rl-wrap:has(> .rl-on:focus-visible)::after{content:"";position:absolute;inset:-4px -2px;border-radius:14px;box-shadow:0 0 0 2px var(--brand);pointer-events:none;z-index:4}',
      '.rl-on > *:focus-visible,.rl-on a:focus-visible{outline:2px solid var(--brand);outline-offset:-2px}',
      '.rl-btn{display:none}',
      '@media (hover:hover) and (pointer:fine){',
      '.rl-btn{display:flex;position:absolute;z-index:5;top:var(--rl-mid,45%);width:40px;height:40px;margin-top:-20px;border-radius:50%;align-items:center;justify-content:center;',
      'border:1px solid var(--border);background:var(--elevated,var(--surface-2));color:var(--text);cursor:pointer;padding:0;',
      'box-shadow:0 6px 18px -4px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.18);opacity:0;pointer-events:none;transform:scale(.86);',
      'transition:opacity .18s var(--ease,ease),transform .18s var(--ease,ease),background .12s}',
      '.rl-btn svg{width:18px;height:18px;display:block}',
      '.rl-btn.p{left:-6px}.rl-btn.n{right:-6px}',
      '.rl-wrap:hover > .rl-btn.on,.rl-wrap:focus-within > .rl-btn.on{opacity:1;pointer-events:auto;transform:none}',
      '.rl-btn:hover{background:var(--surface-3);transform:scale(1.06)!important}',
      '.rl-btn:active{transform:scale(.94)!important}',
      '.rl-btn:focus-visible{outline:2px solid var(--brand);outline-offset:2px}',
      '.rl-on.rl-grab{cursor:grab}',
      '.rl-on.rl-drag{cursor:grabbing;scroll-snap-type:none!important;scroll-behavior:auto!important;user-select:none;-webkit-user-select:none}',
      '.rl-on.rl-drag *{pointer-events:none}',
      '}',
      '@media (prefers-reduced-motion:reduce){.rl-btn{transition:none}}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  var ICON = {
    p: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    n: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  function maxScroll(el) { return Math.max(0, el.scrollWidth - el.clientWidth); }

  // Left edge of every card, in the rail's scroll coordinates.
  function stops(el) {
    var r = el.getBoundingClientRect(), pl = parseFloat(getComputedStyle(el).paddingLeft) || 0, out = [];
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (!c.offsetWidth) continue;
      out.push(c.getBoundingClientRect().left - r.left + el.scrollLeft - pl);
    }
    return out;
  }

  function go(el, left) {
    left = Math.max(0, Math.min(maxScroll(el), Math.round(left)));
    el.scrollTo({ left: left, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function page(el, dir) {
    var cur = el.scrollLeft, w = el.clientWidth * 0.85, st = stops(el), t, i;
    if (dir > 0) {
      var want = cur + w;
      t = cur;
      for (i = 0; i < st.length; i++) if (st[i] <= want + 1 && st[i] > cur + 1) t = st[i];
      if (t <= cur + 1) t = want;
    } else {
      var want2 = cur - w;
      t = null;
      for (i = 0; i < st.length; i++) if (st[i] >= want2 - 1 && st[i] < cur - 1) { t = st[i]; break; }
      if (t === null) t = want2;
    }
    go(el, t);
  }

  function step(el, dir) {
    var cur = el.scrollLeft, st = stops(el), t = dir > 0 ? cur + 160 : cur - 160, i;
    if (dir > 0) { for (i = 0; i < st.length; i++) if (st[i] > cur + 2) { t = st[i]; break; } }
    else { for (i = st.length - 1; i >= 0; i--) if (st[i] < cur - 2) { t = st[i]; break; } }
    go(el, t);
  }

  function update(el) {
    var st = el._rl; if (!st) return;
    var max = maxScroll(el), x = el.scrollLeft;
    var l = x > 2, r = max > 2 && x < max - 2;
    if (l !== st.l) { el.classList.toggle('rl-l', l); st.l = l; st.p.classList.toggle('on', l); }
    if (r !== st.r) { el.classList.toggle('rl-r', r); st.r = r; st.n.classList.toggle('on', r); }
    el.classList.toggle('rl-grab', max > 2);
  }

  // Centre the paddles on the artwork, not on artwork + titles.
  function place(el) {
    var st = el._rl; if (!st) return;
    var first = el.firstElementChild, art = first && first.querySelector('img, [class*="cover"], [class*="art"]');
    var wr = st.wrap.getBoundingClientRect();
    var box = (art && art.offsetHeight > 24 ? art : el).getBoundingClientRect();
    if (!wr.height || !box.height) return;
    var mid = box.top - wr.top + box.height / 2;
    mid = Math.max(20, Math.min(wr.height - 20, mid));
    st.wrap.style.setProperty('--rl-mid', Math.round(mid) + 'px');
  }

  function labelFor(el, wrap) {
    var n = wrap, hops = 0;
    while (n && hops < 4) {
      var p = n.previousElementSibling;
      while (p) {
        var h = p.matches && p.matches('.wv-sec-title, h2, h3') ? p : p.querySelector && p.querySelector('.wv-sec-title, h2, h3, [class*="-h"] b, [class*="title"], [class$="-t"]');
        var t = '';
        if (h) {
          for (var c = h.firstChild; c; c = c.nextSibling) if (c.nodeType === 3) t += c.nodeValue;
          t = t.replace(/\s+/g, ' ').trim() || (h.textContent || '').replace(/\s+/g, ' ').trim();
        }
        if (t) return t.slice(0, 80);
        p = p.previousElementSibling;
      }
      n = n.parentElement; hops++;
      if (!n || n.id === 'view') break;
    }
    return '';
  }

  function attach(el) {
    if (el._rl || el._sh || !el.parentNode || (el.closest && el.closest('.sh-wrap'))) return;
    var cs = getComputedStyle(el);
    if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') return;
    if (cs.display === 'none') return;

    var wrap = document.createElement('div');
    wrap.className = 'rl-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    var p = document.createElement('button'), n = document.createElement('button');
    [[p, 'p', 'Scroll left'], [n, 'n', 'Scroll right']].forEach(function (a) {
      var b = a[0];
      b.type = 'button'; b.className = 'rl-btn ' + a[1]; b.tabIndex = -1;
      b.setAttribute('aria-label', a[2]); b.setAttribute('aria-hidden', 'true');
      b.innerHTML = ICON[a[1]];
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); page(el, a[1] === 'n' ? 1 : -1); });
      wrap.appendChild(b);
    });

    el._rl = { wrap: wrap, p: p, n: n, l: null, r: null };
    el.classList.add('rl-on');

    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.hasAttribute('role')) el.setAttribute('role', 'region');
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
      var lbl = labelFor(el, wrap);
      el.setAttribute('aria-label', lbl ? lbl + ', scrollable' : 'Scrollable list');
    }

    var raf = 0;
    el.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; update(el); });
    }, { passive: true });
    el.addEventListener('keydown', onKey);
    wireDrag(el);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { update(el); place(el); });
      ro.observe(el);
      el._rl.ro = ro;
    }
    el.addEventListener('load', function () { place(el); }, true);
    tracked.push(el);
    update(el); place(el);
  }

  function onKey(e) {
    var el = e.currentTarget;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    var k = e.key;
    if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'Home' && k !== 'End') return;
    var dir = (k === 'ArrowRight' || k === 'End') ? 1 : -1;

    if (t === el) {
      e.preventDefault(); e.stopPropagation();
      if (k === 'Home') go(el, 0);
      else if (k === 'End') go(el, maxScroll(el));
      else if (e.shiftKey) page(el, dir);
      else step(el, dir);
      return;
    }
    // Focus is on a card: move to the neighbouring card.
    var item = t;
    while (item && item.parentElement !== el) item = item.parentElement;
    if (!item) return;
    var next;
    if (k === 'Home') next = el.firstElementChild;
    else if (k === 'End') next = el.lastElementChild;
    else next = dir > 0 ? item.nextElementSibling : item.previousElementSibling;
    var fwd = k === 'Home' ? true : k === 'End' ? false : dir > 0;
    while (next && !focusable(next)) next = fwd ? next.nextElementSibling : next.previousElementSibling;
    if (!next) return;
    e.preventDefault(); e.stopPropagation();
    var f = focusable(next);
    try { f.focus({ preventScroll: true }); } catch (_) { f.focus(); }
    var r = el.getBoundingClientRect(), c = next.getBoundingClientRect();
    if (c.left < r.left + 4 || c.right > r.right - 4) {
      go(el, c.left < r.left + 4 ? el.scrollLeft + (c.left - r.left) - FADE : el.scrollLeft + (c.right - r.right) + FADE);
    }
  }

  function focusable(node) {
    if (!node || !node.offsetWidth) return null;
    if (node.matches('a[href], button, [tabindex]:not([tabindex="-1"])')) return node;
    return node.querySelector('a[href], [tabindex]:not([tabindex="-1"]), button');
  }

  // Mouse drag with a little momentum. Touch keeps native scrolling.
  function wireDrag(el) {
    var down = false, dragging = false, x0 = 0, s0 = 0, lastX = 0, lastT = 0, v = 0, anim = 0, pid = null, snap = '';
    function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = 0; } }
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !fine.matches) return;
      if (maxScroll(el) < 3) return;
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], .rl-nodrag')) return;
      stopAnim();
      down = true; dragging = false; x0 = lastX = e.clientX; s0 = el.scrollLeft; lastT = e.timeStamp; v = 0; pid = e.pointerId;
    });
    el.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      var dx = e.clientX - x0;
      if (!dragging) {
        if (Math.abs(dx) < 6) return;
        dragging = true;
        snap = el.style.scrollSnapType;
        el.classList.add('rl-drag');
        try { el.setPointerCapture(pid); } catch (_) {}
      }
      el.scrollLeft = s0 - dx;
      var dt = e.timeStamp - lastT;
      if (dt > 0) v = 0.8 * ((lastX - e.clientX) / dt) + 0.2 * v;
      lastX = e.clientX; lastT = e.timeStamp;
    });
    function end(e) {
      if (!down || (e && e.pointerId !== pid)) return;
      down = false;
      if (!dragging) return;
      el._rlDragged = Date.now();
      try { el.releasePointerCapture(pid); } catch (_) {}
      var vel = (e && e.timeStamp - lastT > 80) ? 0 : v * 16;
      function finish() {
        el.classList.remove('rl-drag');
        el.style.scrollSnapType = snap;
        dragging = false;
        update(el);
      }
      if (reduce.matches || Math.abs(vel) < 1.5) { finish(); return; }
      (function tick() {
        vel *= 0.93;
        var before = el.scrollLeft;
        el.scrollLeft += vel;
        if (Math.abs(vel) < 0.6 || el.scrollLeft === before) { anim = 0; finish(); return; }
        anim = requestAnimationFrame(tick);
      })();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', function (e) { if (down) end(e); });
    el.addEventListener('click', function (e) {
      if (el._rlDragged && Date.now() - el._rlDragged < 400) {
        el._rlDragged = 0;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }
    }, true);
    el.addEventListener('dragstart', function (e) { if (fine.matches) e.preventDefault(); });
    el.addEventListener('wheel', stopAnim, { passive: true });
  }

  function scan() {
    css();
    for (var i = tracked.length - 1; i >= 0; i--) {
      var el = tracked[i];
      if (!el.isConnected) {
        if (el._rl && el._rl.ro) el._rl.ro.disconnect();
        tracked.splice(i, 1);
      } else { update(el); }
    }
    var list = document.querySelectorAll(SEL);
    for (var j = 0; j < list.length; j++) { try { attach(list[j]); } catch (_) {} }
  }

  var timer = 0;
  function soon(ms) {
    if (timer && ms == null) return;
    clearTimeout(timer);
    timer = setTimeout(function () { timer = 0; scan(); }, ms == null ? 150 : ms);
  }

  function relevant(muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.target && m.target.closest && m.target.closest('.rl-wrap') && !m.addedNodes.length) continue;
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType === 1 && !(n.classList && n.classList.contains('rl-btn'))) return true;
      }
    }
    return false;
  }

  if (typeof MutationObserver === 'function') {
    new MutationObserver(function (muts) { if (relevant(muts)) soon(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('wv-navigate', function () { soon(60); });
  window.addEventListener('resize', function () {
    clearTimeout(window._rlRz);
    window._rlRz = setTimeout(function () { tracked.forEach(function (el) { update(el); place(el); }); }, 120);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { soon(0); });
  soon(0);

  window.wvRails = {
    refresh: scan,
    scrollBy: function (el, dir) { if (el) page(el, dir < 0 ? -1 : 1); },
    attach: function (el) { try { attach(el); } catch (_) {} }
  };
})();
