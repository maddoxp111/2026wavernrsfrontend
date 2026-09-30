// Accessibility layer: clickable cards behave like real links (keyboard,
// cmd/ctrl/middle-click into a new tab), names for icon buttons and images,
// landmarks, a skip link, aria-current on nav, and focus handling for the
// drawer and the shell's dialogs.
(function () {
  'use strict';
  if (window.wvA11y) return;

  var NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION|DETAILS|VIDEO|AUDIO|IFRAME|BODY|HTML)$/;
  var OVERLAY = /overlay|backdrop|scrim|modal-bg|-ov\b|^ov$/i;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

  function css() {
    if (document.getElementById('wv-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'wv-a11y-css';
    s.textContent = [
      '.wv-skip{position:fixed;left:12px;top:10px;z-index:100000;padding:10px 16px;border-radius:999px;background:var(--text);color:var(--page-bg-base,var(--bg));',
      'font:700 14px/1.2 var(--font-sans,system-ui);text-decoration:none;box-shadow:0 8px 24px -6px rgba(0,0,0,.5);transform:translateY(-160%);opacity:0;transition:transform .16s var(--ease,ease),opacity .16s}',
      '.wv-skip:focus,.wv-skip:focus-visible{transform:none;opacity:1;outline:2px solid var(--brand);outline-offset:3px}',
      '[data-wv-kb]:focus{outline:none}',
      '[data-wv-kb]:focus-visible{outline:2px solid var(--brand);outline-offset:3px}',
      '.wv-comp-card:focus-visible,.wv-era-chip:focus-visible,.wv-quick-item:focus-visible,.wv-trow:focus-visible{outline:2px solid var(--brand);outline-offset:2px}',
      '#view:focus{outline:none}',
      '@media (prefers-reduced-motion:reduce){',
      '.wv-mq:hover .wv-mq-inner,.wv-mq .wv-mq-inner{animation:none!important;transform:none!important}',
      '.wv-mq{text-overflow:ellipsis!important}',
      '.wv-skel::after{animation:none!important;opacity:0!important}',
      '.wv-skip{transition:none}',
      '}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  // ── 1. Cards open in a new tab on cmd/ctrl/shift/middle-click ───────────
  var NAV_RE = /(?:^|[^\w.])(?:window\.)?navigate\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/;
  var LOC_RE = /(?:window\.)?location(?:\.href)?\s*=\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/;
  var ATTR_RE = /navigate\(\s*this\.(?:getAttribute\(\s*['"](href|data-href)['"]\s*\)|dataset\.href)/;

  function hrefOf(el) {
    var code = el.getAttribute('onclick') || '';
    if (code.indexOf('navigate(') === -1 && code.indexOf('location') === -1) return null;
    var m = code.match(NAV_RE) || code.match(LOC_RE), url = null;
    if (m) url = m[2].replace(/\\(['"\\])/g, '$1');
    else if ((m = code.match(ATTR_RE))) url = el.getAttribute(m[1] || 'data-href');
    if (!url) return null;
    url = url.replace(/&amp;/g, '&').trim();
    if (!/^(\/(?!\/)|https?:\/\/)/i.test(url)) return null;
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin && !/wavernrs\.com$/i.test(u.hostname)) return null;
      return u.href;
    } catch (_) { return null; }
  }

  function linkTarget(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    var el = t.closest('[onclick]');
    if (!el || el.closest('a[href]')) return null;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return null;
    var href = hrefOf(el);
    return href ? { el: el, href: href } : null;
  }

  function openNew(href) {
    try { window.open(href, '_blank', 'noopener'); } catch (_) {}
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (!(e.metaKey || e.ctrlKey || e.shiftKey)) return;
    var hit = linkTarget(e);
    if (!hit) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    openNew(hit.href);
  }, true);

  document.addEventListener('auxclick', function (e) {
    if (e.defaultPrevented || e.button !== 1) return;
    var hit = linkTarget(e);
    if (!hit) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    openNew(hit.href);
  }, true);

  // Middle button on a card would otherwise start autoscroll.
  document.addEventListener('mousedown', function (e) {
    if (e.button === 1 && linkTarget(e)) e.preventDefault();
  }, true);

  // ── 2. Keyboard access for clickable divs and spans ─────────────────────
  function skipClickable(el) {
    if (NATIVE.test(el.tagName)) return true;
    if (el.hasAttribute('tabindex') || el.hasAttribute('role') || el.hasAttribute('contenteditable')) return true;
    var idc = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
    if (OVERLAY.test(idc)) return true;
    var code = (el.getAttribute('onclick') || '').replace(/\s+/g, '');
    if (!code || /^(event|e)\.stopPropagation\(\);?$/.test(code) || /^return(false|true);?$/.test(code)) return true;
    if (/(event|e)\.target(===|==)this/.test(code) || /this===(event|e)\.target/.test(code)) return true;
    if (el.closest('a[href], button')) return true;
    if (el.querySelector('input:not([type=hidden]), select, textarea, [contenteditable="true"]')) return true;
    return false;
  }

  function enhanceClickables(root) {
    var list = (root || document).querySelectorAll('[onclick]:not([data-wv-kb]):not([tabindex]):not([role])');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (skipClickable(el)) continue;
      var isLink = !!hrefOf(el);
      el.setAttribute('data-wv-kb', isLink ? 'link' : 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', isLink ? 'link' : 'button');
    }
  }

  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!el || !el.getAttribute || !el.hasAttribute('data-wv-kb')) return;
    var kind = el.getAttribute('data-wv-kb');
    var enter = e.key === 'Enter', space = e.key === ' ' || e.key === 'Spacebar';
    if (!enter && !(space && kind === 'button')) return;
    if (e.altKey || e.repeat) { if (e.repeat) e.preventDefault(); return; }
    e.preventDefault();
    if (enter && kind === 'link' && (e.metaKey || e.ctrlKey)) {
      var h = hrefOf(el);
      if (h) { openNew(h); return; }
    }
    el.click();
  });

  // ── 3. Names ─────────────────────────────────────────────────────────────
  function nameThings(root) {
    var r = root || document, i;
    var btns = r.querySelectorAll('button[title]:not([aria-label]):not([aria-labelledby]), a[title]:not([aria-label]):not([aria-labelledby]), [role="button"][title]:not([aria-label])');
    for (i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (!(b.textContent || '').trim()) b.setAttribute('aria-label', b.getAttribute('title'));
    }
    var imgs = r.querySelectorAll('img:not([alt])');
    for (i = 0; i < imgs.length; i++) imgs[i].setAttribute('alt', '');
    var svgs = r.querySelectorAll('button > svg:not([aria-hidden]), a > svg:not([aria-hidden])');
    for (i = 0; i < svgs.length; i++) {
      var p = svgs[i].parentElement;
      if (p.getAttribute('aria-label') || (p.textContent || '').trim()) svgs[i].setAttribute('aria-hidden', 'true');
    }
    var av = r.querySelectorAll('.wv-avatar:not(button):not([role])');
    for (i = 0; i < av.length; i++) {
      if (!av[i].getAttribute('onclick') && !av[i].closest('a, button')) continue;
      if (av[i].closest('a, button')) continue;
      av[i].setAttribute('role', 'button');
      av[i].setAttribute('tabindex', '0');
      av[i].setAttribute('data-wv-kb', 'button');
      if (!av[i].getAttribute('aria-label')) av[i].setAttribute('aria-label', 'Your profile');
    }
  }

  // ── 4. Landmarks + 5. skip link ─────────────────────────────────────────
  function setIf(el, attr, val) { if (el && !el.hasAttribute(attr)) el.setAttribute(attr, val); }

  function landmarks() {
    var content = document.getElementById('wv-content');
    if (content && !document.querySelector('main, [role="main"]')) content.setAttribute('role', 'main');
    var side = document.getElementById('wv-sidebar');
    if (side) {
      setIf(side, 'aria-label', 'Sidebar');
      var sn = side.querySelector('nav');
      setIf(sn, 'aria-label', 'Main');
    }
    var drawer = document.getElementById('wv-drawer');
    if (drawer) {
      setIf(drawer, 'aria-label', 'Menu');
      setIf(drawer.querySelector('nav'), 'aria-label', 'Menu');
    }
    var tabs = document.getElementById('wv-mobile-tabs');
    setIf(tabs, 'aria-label', 'Primary');
    var np = document.getElementById('wv-np');
    setIf(np, 'aria-label', 'Now playing');
    var slot = document.getElementById('wv-player-slot');
    if (slot && slot.children.length) { setIf(slot, 'role', 'region'); setIf(slot, 'aria-label', 'Player'); }
  }

  function skipLink() {
    var a = document.getElementById('wv-skip');
    if (a && a.parentNode === document.body && document.body.firstElementChild === a) return;
    if (!document.body) return;
    if (!a) {
      a = document.createElement('a');
      a.id = 'wv-skip'; a.className = 'wv-skip'; a.href = '#view';
      a.textContent = 'Skip to content';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var v = document.getElementById('view') || document.getElementById('wv-content');
        if (!v) return;
        var target = v.querySelector('h1') || v;
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', function rm() { target.removeEventListener('blur', rm); target.removeAttribute('tabindex'); });
        }
        try { target.focus({ preventScroll: false }); } catch (_) { target.focus(); }
      });
    }
    document.body.insertBefore(a, document.body.firstChild);
  }

  // ── 6. aria-current on nav ──────────────────────────────────────────────
  var NAV_SEL = '.wv-nav-item[data-page], .wv-tab-btn[data-page], .wv-side-foot a[data-page], .sp-pin[data-page], .sp-home, #wv-drawer a[data-page]';
  function syncCurrent() {
    var list = document.querySelectorAll(NAV_SEL);
    for (var i = 0; i < list.length; i++) {
      var el = list[i], on = el.classList.contains('is-active') || el.classList.contains('active') || el.classList.contains('now');
      if (on) { if (el.getAttribute('aria-current') !== 'page') el.setAttribute('aria-current', 'page'); }
      else if (el.hasAttribute('aria-current')) el.removeAttribute('aria-current');
    }
  }
  function wrapNav() {
    var f = window._updateNavActive;
    if (typeof f !== 'function' || f._wvA11y) return;
    var w = function () { var r = f.apply(this, arguments); try { syncCurrent(); } catch (_) {} return r; };
    w._wvA11y = true;
    window._updateNavActive = w;
  }

  // ── Focus trap helpers ──────────────────────────────────────────────────
  function visible(el) {
    if (!el || el.disabled) return false;
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden';
  }
  function focusables(box) {
    return Array.prototype.filter.call(box.querySelectorAll(FOCUSABLE), visible);
  }
  function focusFirst(box) {
    var list = focusables(box);
    var pick = box.querySelector('[autofocus]') || list.find(function (x) { return x.matches('[aria-checked="true"], [aria-selected="true"], .active, .on'); }) || list[0];
    if (!pick) {
      if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
      pick = box;
    }
    try { pick.focus({ preventScroll: true }); } catch (_) { pick.focus(); }
  }
  function trapTab(e, box) {
    var list = focusables(box);
    if (!list.length) { e.preventDefault(); return; }
    var first = list[0], last = list[list.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
    if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function restore(to) {
    var a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement && a.isConnected) return;
    if (to && to.isConnected && visible(to)) { try { to.focus({ preventScroll: true }); } catch (_) {} }
  }

  // ── 7. Drawer ───────────────────────────────────────────────────────────
  var drawerReturn = null;
  function drawerOpen() {
    var d = document.getElementById('wv-drawer');
    return !!(d && d.classList.contains('open'));
  }
  function wrapDrawer() {
    var o = window.openMobileDrawer, c = window.closeMobileDrawer;
    if (typeof o === 'function' && !o._wvA11y) {
      var wo = function () {
        var a = document.activeElement;
        drawerReturn = (a && a !== document.body) ? a : document.getElementById('wv-menu-btn');
        var r = o.apply(this, arguments);
        var mb = document.getElementById('wv-menu-btn');
        if (mb) mb.setAttribute('aria-expanded', 'true');
        setTimeout(function () {
          var d = document.getElementById('wv-drawer');
          if (d && drawerOpen()) focusFirst(d);
        }, 60);
        return r;
      };
      wo._wvA11y = true;
      window.openMobileDrawer = wo;
    }
    if (typeof c === 'function' && !c._wvA11y) {
      var wc = function () {
        var d = document.getElementById('wv-drawer');
        var had = d && d.contains(document.activeElement);
        var r = c.apply(this, arguments);
        var mb = document.getElementById('wv-menu-btn');
        if (mb) mb.setAttribute('aria-expanded', 'false');
        if (had || document.activeElement === document.body) {
          var back = drawerReturn;
          drawerReturn = null;
          if (had && document.activeElement && d.contains(document.activeElement)) document.activeElement.blur();
          restore(back);
        }
        return r;
      };
      wc._wvA11y = true;
      window.closeMobileDrawer = wc;
    }
  }

  // ── 8. Dialogs appended to <body> ───────────────────────────────────────
  var DIALOG_SEL = '#wv-theme-picker, #wv-keys, .wv-sheet, #wv-more-menu, [role="dialog"], [role="alertdialog"], [aria-modal="true"]';
  var stack = [];

  function dialogBox(node) {
    if (node.matches(DIALOG_SEL)) {
      var inner = node.querySelector('[role="dialog"], [role="alertdialog"]');
      return inner && !node.matches('[role="dialog"], [role="alertdialog"]') ? inner : node;
    }
    return null;
  }

  function manage(node) {
    if (node._wvDlg || node.nodeType !== 1) return;
    var box = dialogBox(node);
    if (!box) return;
    if (node.id === 'wv-drawer' || node.id === 'wv-root' || node.id === 'wv-route-announcer') return;
    node._wvDlg = true;
    var isMenu = node.id === 'wv-more-menu' || box.getAttribute('role') === 'menu';
    if (!box.hasAttribute('role')) box.setAttribute('role', 'dialog');
    var transient = node.id === 'wv-theme-picker' || node.id === 'wv-keys' || node.classList.contains('wv-sheet');
    if (transient && !box.hasAttribute('aria-modal')) box.setAttribute('aria-modal', 'true');
    if (node.classList.contains('wv-sheet') && !box.hasAttribute('aria-label') && !box.hasAttribute('aria-labelledby')) {
      var t = node.querySelector('.wv-sheet-title');
      if (t && (t.textContent || '').trim()) box.setAttribute('aria-label', t.textContent.trim().slice(0, 80));
    }
    var a = document.activeElement;
    var modal = box.getAttribute('aria-modal') === 'true';
    var entry = { node: node, box: box, back: (a && a !== document.body) ? a : null, menu: isMenu || !modal };
    stack.push(entry);
    if (entry.menu) return;
    setTimeout(function () {
      if (!node.isConnected || !visible(box)) return;
      if (box.contains(document.activeElement)) return;
      var ae = document.activeElement;
      if (ae && ae !== document.body && ae.closest && ae.closest('[aria-modal="true"]') && !box.contains(ae)) return;
      focusFirst(box);
    }, 40);
  }

  function prune() {
    for (var i = stack.length - 1; i >= 0; i--) {
      var s = stack[i];
      if (!s.node.isConnected || !visible(s.box)) {
        stack.splice(i, 1);
        if (!s.node.isConnected) s.node._wvDlg = false;
        (function (back) { setTimeout(function () { restore(back); }, 0); })(s.back);
      }
    }
  }

  function topDialog() {
    prune();
    return stack.length ? stack[stack.length - 1] : null;
  }

  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (e.key === 'Tab') {
      var top = topDialog();
      if (top && !top.menu) { trapTab(e, top.box); return; }
      if (drawerOpen()) { trapTab(e, document.getElementById('wv-drawer')); return; }
    } else if (e.key === 'Escape') {
      if (drawerOpen() && typeof window.closeMobileDrawer === 'function') { e.preventDefault(); window.closeMobileDrawer(); return; }
      var t2 = topDialog();
      if (t2 && t2.node.classList.contains('wv-sheet')) {
        var ov = document.querySelector('.wv-sheet-overlay');
        if (ov) ov.click(); else t2.node.remove();
      }
    }
  });

  // ── Scanning ────────────────────────────────────────────────────────────
  function scanBody() {
    var kids = document.body ? document.body.children : [];
    for (var i = 0; i < kids.length; i++) manage(kids[i]);
    prune();
  }

  function scan() {
    css();
    try { skipLink(); } catch (_) {}
    try { landmarks(); } catch (_) {}
    try { wrapNav(); wrapDrawer(); syncCurrent(); } catch (_) {}
    try { enhanceClickables(document); } catch (_) {}
    try { nameThings(document); } catch (_) {}
    try { scanBody(); } catch (_) {}
  }

  var timer = 0;
  function soon(ms) { clearTimeout(timer); timer = setTimeout(scan, ms == null ? 180 : ms); }

  if (typeof MutationObserver === 'function') {
    new MutationObserver(function (muts) {
      var bodyChange = false, any = false;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (!m.addedNodes.length && !m.removedNodes.length) continue;
        any = true;
        if (m.target === document.body) bodyChange = true;
      }
      if (bodyChange) { try { scanBody(); } catch (_) {} }
      if (any) soon();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('wv-navigate', function () { soon(40); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { soon(0); });
  soon(0);

  window.wvA11y = {
    refresh: scan,
    hrefOf: hrefOf,
    focusFirst: focusFirst,
    trap: trapTab
  };
})();
