/* =========================================================
   wavernrs UI kit — on-brand dialogs, empty states, skeletons

   Loaded on every page by layout.js (ensure('ui-kit.js', 'wvUI')).
   It loads async, so always feature-detect before using it:

     if (typeof wvUI === 'function') { ... }

   Dialogs (all return a Promise, never block the page):

     wvUI.confirm({ title, body, confirmLabel, cancelLabel, danger })
       -> Promise<boolean>          Esc / backdrop = false, Enter = true
       wvUI.confirm('delete this playlist?') also works.

     wvUI.prompt({ title, body, label, placeholder, value, confirmLabel,
                   cancelLabel, multiline, required, maxLength, validate })
       -> Promise<string|null>      null when cancelled. validate(value)
                                     may return an error string to keep
                                     the dialog open.

     wvUI.alert(message | { title, body, okLabel, kind: 'error'|'success' })
       -> Promise<void>

   Aliases: wvConfirm, wvPromptDialog, wvAlert. Native alert/confirm are
   left alone on purpose: confirm() has to stay synchronous for the pages
   that still use it. Migrate with:

     if (!(await wvConfirm({ title: 'remove this?', danger: true }))) return;

   Markup helpers (return HTML strings, every value is escaped):

     wvUI.empty({ icon, title, desc, action, actions, compact, error })
       icon: 'music' | 'search' | 'playlist' | 'heart' | 'user' | 'lock'
             | 'inbox' | 'radio' | 'alert' | 'offline' | 'sparkle'
       action: { label, href } or { label, onclick: "jsString()", ghost }
     wvUI.error(err, "retryFn()")   the error version, with Try again
     wvUI.skeleton('grid' | 'rail' | 'circles' | 'rows' | 'hero' | 'hero-round' | 'page', n)

   Aliases: wvEmptyHTML, wvSkeletonHTML.
   ========================================================= */
(function () {
  if (typeof window.wvUI === 'function') return;

  var CSS = [
    '.wv-dlg-scrim{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;',
    'background:var(--scrim,rgba(0,0,0,.6));animation:wv-dlg-fade var(--dur-2,200ms) var(--ease-out,ease-out) both;}',
    '.wv-dlg{position:relative;width:min(420px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;overscroll-behavior:contain;',
    'background:var(--elevated,#282828);color:var(--text,#fff);border:1px solid var(--hair,rgba(255,255,255,.08));border-radius:16px;',
    'padding:22px 22px 18px;box-shadow:var(--shadow-4,0 24px 64px rgba(0,0,0,.55));outline:none;font-family:var(--font-sans);',
    'animation:wv-dlg-in 420ms var(--ease-spring,cubic-bezier(.34,1.56,.64,1)) both;text-align:left;}',
    '.wv-dlg-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;margin:0 0 14px;',
    'background:var(--brand-bg);color:var(--brand);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--brand) 22%,transparent);}',
    '.wv-dlg-icon svg{width:22px;height:22px;}',
    '.wv-dlg-icon.is-danger,.wv-dlg-icon.is-error{background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red);',
    'box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--red) 26%,transparent);}',
    '.wv-dlg-icon.is-success{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green);',
    'box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--green) 26%,transparent);}',
    '.wv-dlg-title{font-size:18px;font-weight:800;letter-spacing:-.02em;line-height:1.3;margin:0 0 6px;color:var(--text);',
    'text-wrap:balance;overflow-wrap:anywhere;}',
    '.wv-dlg-body{font-size:14px;line-height:1.55;color:var(--text-2);margin:0;white-space:pre-wrap;overflow-wrap:anywhere;}',
    '.wv-dlg-body.is-solo{font-size:15px;font-weight:500;color:var(--text);}',
    '.wv-dlg-field{margin-top:16px;}',
    '.wv-dlg-label{display:block;font-size:12.5px;font-weight:700;color:var(--text-2);margin:0 0 7px;}',
    '.wv-dlg-input{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:15px;line-height:1.4;padding:11px 14px;',
    'border-radius:10px;background:var(--surface-2);border:1px solid var(--hair-strong);color:var(--text);outline:none;margin:0;',
    'transition:border-color var(--dur-1,120ms) ease,box-shadow var(--dur-1,120ms) ease;}',
    '.wv-dlg-input:focus,.wv-dlg-input:focus-visible{border-color:var(--brand);background:var(--surface-2);outline:none;',
    'box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 28%,transparent);}',
    '.wv-dlg-input[aria-invalid="true"]{border-color:var(--red);box-shadow:0 0 0 3px color-mix(in srgb,var(--red) 22%,transparent);}',
    'textarea.wv-dlg-input{min-height:104px;resize:vertical;}',
    '.wv-dlg-meta{display:flex;justify-content:space-between;gap:12px;min-height:18px;margin-top:6px;font-size:12px;color:var(--text-3);}',
    '.wv-dlg-err{color:var(--red);font-weight:600;}',
    '.wv-dlg-count{margin-left:auto;font-variant-numeric:tabular-nums;}',
    '.wv-dlg-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;}',
    '.wv-dlg-btn{font:inherit;font-size:14px;font-weight:700;min-height:40px;padding:9px 18px;border-radius:999px;cursor:pointer;',
    'border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;',
    'transition:transform var(--dur-3,320ms) var(--ease-spring,ease),filter var(--dur-1,120ms) ease,border-color var(--dur-1,120ms) ease,background var(--dur-1,120ms) ease;}',
    '.wv-dlg-btn:active{transform:scale(.96);transition-duration:90ms;}',
    '.wv-dlg-btn:focus-visible{outline:2px solid var(--focus-color,var(--brand));outline-offset:2px;}',
    '.wv-dlg-btn.is-ghost{background:transparent;border-color:var(--hair-strong);color:var(--text);}',
    '.wv-dlg-btn.is-ghost:hover{border-color:var(--text);}',
    '.wv-dlg-btn.is-primary{background:var(--brand);color:var(--on-brand);}',
    '.wv-dlg-btn.is-danger{background:#dc2626;color:#fff;}',
    '.wv-dlg-btn.is-primary:hover,.wv-dlg-btn.is-danger:hover{filter:brightness(1.08);}',
    '.wv-dlg-btn:disabled{opacity:.45;cursor:default;filter:none;transform:none;}',
    '.wv-dlg-scrim.is-closing{animation:wv-dlg-fade-out 170ms var(--ease-out,ease-out) both;}',
    '.wv-dlg-scrim.is-closing .wv-dlg{animation:wv-dlg-out 170ms var(--ease-out,ease-out) both;}',
    '.wv-dlg.is-shake{animation:wv-dlg-shake 320ms var(--ease-out,ease-out);}',
    '@keyframes wv-dlg-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes wv-dlg-fade-out{from{opacity:1}to{opacity:0}}',
    '@keyframes wv-dlg-in{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}',
    '@keyframes wv-dlg-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(6px) scale(.98)}}',
    '@keyframes wv-dlg-up{from{transform:translateY(100%)}to{transform:none}}',
    '@keyframes wv-dlg-down{from{transform:none}to{transform:translateY(100%)}}',
    '@keyframes wv-dlg-shake{0%,100%{transform:none}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}',
    '@media (max-width:560px){',
    '.wv-dlg-scrim{align-items:flex-end;padding:0;}',
    '.wv-dlg{width:100%;max-height:calc(100dvh - 24px);border-radius:20px 20px 0 0;border-width:1px 0 0;',
    'padding:28px 20px calc(18px + env(safe-area-inset-bottom));animation:wv-dlg-up 380ms var(--ease-out,ease-out) both;}',
    '.wv-dlg::before{content:"";position:absolute;top:8px;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:var(--hair-strong);}',
    '.wv-dlg-scrim.is-closing .wv-dlg{animation:wv-dlg-down 200ms var(--ease-out,ease-out) both;}',
    '.wv-dlg-actions{margin-top:24px;}',
    '.wv-dlg-actions .wv-dlg-btn{flex:1;min-height:46px;font-size:15px;}',
    '}',
    '@media (prefers-reduced-motion:reduce){.wv-dlg-scrim,.wv-dlg,.wv-dlg-scrim.is-closing,.wv-dlg-scrim.is-closing .wv-dlg,.wv-dlg.is-shake{animation:none !important;}}'
  ].join('');

  function styleOnce() {
    if (document.getElementById('wv-ui-kit-css')) return;
    var s = document.createElement('style');
    s.id = 'wv-ui-kit-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = {
    music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    playlist: svg('<path d="M3 6h13M3 12h13M3 18h8"/><path d="M17 18V9l4-1"/><circle cx="15" cy="18" r="2"/>'),
    heart: svg('<path d="M19.5 12.6 12 20l-7.5-7.4A4.9 4.9 0 0 1 12 6.1a4.9 4.9 0 0 1 7.5 6.5Z"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>'),
    radio: svg('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>'),
    alert: svg('<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>'),
    offline: svg('<path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 5.2-2.7M16.8 11a10 10 0 0 1 2.2 1.9M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>'),
    sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>')
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  // ── Dialog engine ─────────────────────────────────────────
  var stack = [];
  var uid = 0;
  var listening = false;

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.getClientRects().length > 0; }
    );
  }
  // Runs in the capture phase on window, so while a dialog is up the
  // page's own shortcuts (space, /, T, arrows) never see the keys.
  function onKey(e) {
    var top = stack[stack.length - 1];
    if (!top) return;
    var t = e.target;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      top.cancel();
      return;
    }
    if (e.key === 'Tab') {
      e.stopPropagation();
      var f = focusables(top.card);
      if (!f.length) { e.preventDefault(); top.card.focus(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      var inside = top.card.contains(a);
      if (e.shiftKey && (a === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !inside)) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key === 'Enter' && !e.isComposing) {
      e.stopPropagation();
      if (t && t.tagName === 'TEXTAREA' && !(e.metaKey || e.ctrlKey)) return;
      if (t && t.tagName === 'BUTTON' && top.card.contains(t)) return;
      e.preventDefault();
      top.accept();
      return;
    }
    e.stopPropagation();
  }
  function onFocusIn(e) {
    var top = stack[stack.length - 1];
    if (!top || top.scrim.contains(e.target)) return;
    try { (top.first || top.card).focus({ preventScroll: true }); } catch (_) {}
  }
  function listen(on) {
    if (on === listening) return;
    listening = on;
    var m = on ? 'addEventListener' : 'removeEventListener';
    window[m]('keydown', onKey, true);
    document[m]('focusin', onFocusIn, true);
  }

  function openDialog(o) {
    styleOnce();
    return new Promise(function (resolve) {
      var id = 'wv-dlg-' + (++uid);
      var prev = document.activeElement;
      var scrim = el('div', 'wv-dlg-scrim');
      scrim.style.zIndex = String(10050 + stack.length * 2);
      var card = el('div', 'wv-dlg');
      card.setAttribute('role', o.kind === 'prompt' ? 'dialog' : 'alertdialog');
      card.setAttribute('aria-modal', 'true');
      card.tabIndex = -1;

      var iconName = o.icon || (o.danger ? 'alert' : o.tone === 'error' ? 'alert' : o.tone === 'success' ? 'check' : '');
      if (iconName && ICONS[iconName]) {
        var ic = el('div', 'wv-dlg-icon' + (o.danger ? ' is-danger' : o.tone ? ' is-' + o.tone : ''));
        ic.innerHTML = ICONS[iconName];
        card.appendChild(ic);
      }
      if (o.title) {
        var h = el('h2', 'wv-dlg-title', o.title);
        h.id = id + '-t';
        card.appendChild(h);
        card.setAttribute('aria-labelledby', h.id);
      }
      if (o.body) {
        var p = el('p', 'wv-dlg-body' + (o.title ? '' : ' is-solo'), o.body);
        p.id = id + '-b';
        card.appendChild(p);
        card.setAttribute(o.title ? 'aria-describedby' : 'aria-labelledby', p.id);
      }

      var input = null, errEl = null, countEl = null;
      if (o.kind === 'prompt') {
        var field = el('div', 'wv-dlg-field');
        if (o.label) {
          var lab = el('label', 'wv-dlg-label', o.label);
          lab.htmlFor = id + '-i';
          field.appendChild(lab);
        }
        input = document.createElement(o.multiline ? 'textarea' : 'input');
        input.className = 'wv-dlg-input';
        input.id = id + '-i';
        if (!o.multiline) input.type = o.inputType || 'text';
        if (o.placeholder) input.placeholder = String(o.placeholder);
        if (o.maxLength) input.maxLength = +o.maxLength;
        input.value = o.value != null ? String(o.value) : '';
        input.setAttribute('autocomplete', 'off');
        if (!o.label) input.setAttribute('aria-label', o.title || 'value');
        field.appendChild(input);
        var meta = el('div', 'wv-dlg-meta');
        errEl = el('span', 'wv-dlg-err');
        errEl.id = id + '-e';
        errEl.setAttribute('aria-live', 'polite');
        meta.appendChild(errEl);
        if (o.maxLength) { countEl = el('span', 'wv-dlg-count'); meta.appendChild(countEl); }
        field.appendChild(meta);
        input.setAttribute('aria-describedby', errEl.id);
        card.appendChild(field);
      }

      var actions = el('div', 'wv-dlg-actions');
      var cancelBtn = null;
      if (o.kind !== 'alert') {
        cancelBtn = el('button', 'wv-dlg-btn is-ghost', o.cancelLabel || 'Cancel');
        cancelBtn.type = 'button';
        actions.appendChild(cancelBtn);
      }
      var okBtn = el('button', 'wv-dlg-btn ' + (o.danger ? 'is-danger' : 'is-primary'),
        o.confirmLabel || o.okLabel || (o.kind === 'alert' ? 'OK' : o.kind === 'prompt' ? 'Save' : 'Confirm'));
      okBtn.type = 'button';
      actions.appendChild(okBtn);
      card.appendChild(actions);
      scrim.appendChild(card);

      var done = false;
      var entry = { scrim: scrim, card: card, first: null };

      function close(value) {
        if (done) return;
        done = true;
        var i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
        if (!stack.length) listen(false);
        scrim.classList.add('is-closing');
        scrim.style.pointerEvents = 'none';
        setTimeout(function () { if (scrim.parentNode) scrim.parentNode.removeChild(scrim); }, 220);
        var back = stack.length ? (stack[stack.length - 1].first || stack[stack.length - 1].card) : prev;
        if (back && typeof back.focus === 'function' && document.contains(back)) {
          try { back.focus({ preventScroll: true }); } catch (_) {}
        }
        resolve(value);
      }
      function showError(msg) {
        if (!errEl) return;
        errEl.textContent = msg;
        input.setAttribute('aria-invalid', 'true');
        card.classList.remove('is-shake');
        void card.offsetWidth;
        card.classList.add('is-shake');
        input.focus();
      }
      function syncPrompt() {
        if (!input) return;
        if (countEl) countEl.textContent = input.value.length + ' / ' + o.maxLength;
        if (o.required) okBtn.disabled = !input.value.trim();
        if (errEl.textContent) { errEl.textContent = ''; input.removeAttribute('aria-invalid'); }
      }

      entry.cancel = function () {
        close(o.kind === 'prompt' ? null : o.kind === 'alert' ? undefined : false);
      };
      entry.accept = function () {
        if (o.kind !== 'prompt') { close(o.kind === 'alert' ? undefined : true); return; }
        var v = input.value;
        if (o.trim !== false) v = v.trim();
        if (o.required && !v) { showError('this can’t be empty'); return; }
        if (typeof o.validate === 'function') {
          var msg = null;
          try { msg = o.validate(v); } catch (err) { msg = (err && err.message) || 'that doesn’t look right'; }
          if (msg) { showError(String(msg)); return; }
        }
        close(v);
      };

      okBtn.addEventListener('click', function () { entry.accept(); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { entry.cancel(); });
      scrim.addEventListener('mousedown', function (e) {
        if (e.target === scrim) scrim._downOnScrim = true;
      });
      scrim.addEventListener('click', function (e) {
        if (e.target === scrim && scrim._downOnScrim) entry.cancel();
        scrim._downOnScrim = false;
      });
      if (input) input.addEventListener('input', syncPrompt);

      // A navigation away counts as a cancel, so nothing waits forever
      // and no dialog floats over the next page.
      window._pageCleanup = window._pageCleanup || [];
      window._pageCleanup.push(function () { entry.cancel(); });

      stack.push(entry);
      listen(true);
      document.body.appendChild(scrim);
      if (input) syncPrompt();

      entry.first = input || (o.danger && cancelBtn ? cancelBtn : okBtn);
      try { entry.first.focus({ preventScroll: true }); } catch (_) {}
      if (input && input.select && o.value) input.select();
    });
  }

  function norm(o, key) {
    if (o == null) return {};
    if (typeof o === 'string' || typeof o === 'number') { var x = {}; x[key] = String(o); return x; }
    return o;
  }
  function copy(o, extra) {
    var out = {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    for (k in extra) out[k] = extra[k];
    return out;
  }

  function confirmDialog(o) {
    o = norm(o, 'title');
    return openDialog(copy(o, { kind: 'confirm' }));
  }
  function promptDialog(o) {
    o = norm(o, 'title');
    return openDialog(copy(o, { kind: 'prompt' }));
  }
  function alertDialog(o) {
    o = norm(o, 'body');
    var extra = { kind: 'alert' };
    if (o.kind === 'error' || o.kind === 'success') extra.tone = o.kind;
    return openDialog(copy(o, extra));
  }

  // ── Markup helpers ────────────────────────────────────────
  function actionHTML(a, i) {
    if (!a || !a.label) return '';
    var cls = a.ghost || i > 0 ? 'wv-btn-ghost' : 'wv-btn-play';
    if (a.href) return '<a class="' + cls + '" href="' + esc(a.href) + '">' + esc(a.label) + '</a>';
    return '<button type="button" class="' + cls + '"' + (a.onclick ? ' onclick="' + esc(a.onclick) + '"' : '') + '>' + esc(a.label) + '</button>';
  }
  function emptyHTML(o) {
    o = o || {};
    var list = o.actions || (o.action ? [o.action] : []);
    var icon = ICONS[o.icon] || (o.error ? ICONS.alert : ICONS.music);
    return '<div class="empty-state wv-es' + (o.error ? ' is-error' : '') + (o.compact ? ' is-compact' : '') + '"' +
      (o.error ? ' role="alert"' : ' role="status"') + (o.span !== false ? ' style="grid-column:1/-1;"' : '') + '>' +
      '<div class="wv-es-icon" aria-hidden="true">' + icon + '</div>' +
      (o.title ? '<div class="empty-title">' + esc(o.title) + '</div>' : '') +
      (o.desc ? '<div class="empty-desc">' + esc(o.desc) + '</div>' : '') +
      (list.length ? '<div class="wv-es-actions">' + list.map(actionHTML).join('') + '</div>' : '') +
      '</div>';
  }
  function errorHTML(err, retryAttr, opts) {
    if (err && err.navAborted) return '';
    opts = opts || {};
    var busy = typeof window.wvIsBusyError === 'function' && window.wvIsBusyError(err);
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    var msg = offline ? 'you look offline rn...check your connection and try again'
      : busy ? (window.WV_BUSY_MSG || 'wavernrs is having problems rn...give it a minute and try again')
      : ((err && err.message) || (typeof err === 'string' ? err : 'something went wrong'));
    return emptyHTML({
      error: true,
      compact: opts.compact,
      icon: offline || busy ? 'offline' : 'alert',
      title: opts.title || (offline ? 'You’re offline' : busy ? 'Can’t reach wavernrs' : 'Couldn’t load this'),
      desc: msg,
      action: retryAttr ? { label: 'Try again', onclick: retryAttr } : null
    });
  }

  function skelCard(round) {
    return '<div class="wv-skel-card"><div class="wv-skel art' + (round ? ' wv-skel-circle' : '') + '"></div>' +
      '<div class="wv-skel l1"></div><div class="wv-skel l2"></div></div>';
  }
  function skelRow() {
    return '<div class="wv-skel-row"><div class="wv-skel a"></div>' +
      '<div class="t"><div class="wv-skel l1"></div><div class="wv-skel l2"></div></div>' +
      '<div class="wv-skel r"></div></div>';
  }
  function skelHero(round) {
    return '<div class="wv-skel-hero"><div class="wv-skel art' + (round ? ' round' : '') + '"></div>' +
      '<div class="body"><div class="wv-skel k"></div><div class="wv-skel h"></div><div class="wv-skel s"></div>' +
      '<div class="btns"><div class="wv-skel b"></div><div class="wv-skel b"></div></div></div></div>';
  }
  function repeat(fn, n, arg) { var s = ''; for (var i = 0; i < n; i++) s += fn(arg); return s; }
  var SR = '<span class="wv-sr-only">loading</span>';
  function skeletonHTML(kind, n) {
    kind = kind || 'grid';
    var open = '<div class="wv-skel-wrap ';
    var attrs = '" aria-busy="true" role="status" style="grid-column:1/-1;">' + SR;
    switch (kind) {
      case 'rows':
      case 'list':
        return open + 'wv-skel-rows' + attrs + repeat(skelRow, n || 6) + '</div>';
      case 'rail':
        return open + 'wv-skel-grid is-rail' + attrs + repeat(skelCard, n || 6, false) + '</div>';
      case 'circles':
        return open + 'wv-skel-grid' + attrs + repeat(skelCard, n || 6, true) + '</div>';
      case 'hero':
      case 'hero-round':
        return open + 'wv-skel-hero-wrap' + attrs + skelHero(kind === 'hero-round') + '</div>';
      case 'page':
        return open + 'wv-skel-page' + attrs + skelHero(false) + '<div class="wv-skel-rows">' + repeat(skelRow, n || 6) + '</div></div>';
      default:
        return open + 'wv-skel-grid' + attrs + repeat(skelCard, n || 8, false) + '</div>';
    }
  }

  function toast(msg, kind, ms) {
    if (typeof window.wvToast === 'function') window.wvToast(msg, kind, ms);
  }

  var wvUI = function () { return wvUI; };
  wvUI.version = 1;
  wvUI.confirm = confirmDialog;
  wvUI.prompt = promptDialog;
  wvUI.alert = alertDialog;
  wvUI.empty = emptyHTML;
  wvUI.error = errorHTML;
  wvUI.skeleton = skeletonHTML;
  wvUI.toast = toast;
  wvUI.icons = ICONS;
  wvUI.escape = esc;
  wvUI.isOpen = function () { return stack.length > 0; };

  window.wvUI = wvUI;
  if (typeof window.wvConfirm !== 'function') window.wvConfirm = confirmDialog;
  if (typeof window.wvPromptDialog !== 'function') window.wvPromptDialog = promptDialog;
  if (typeof window.wvAlert !== 'function') window.wvAlert = alertDialog;
  if (typeof window.wvEmptyHTML !== 'function') window.wvEmptyHTML = emptyHTML;
  if (typeof window.wvSkeletonHTML !== 'function') window.wvSkeletonHTML = skeletonHTML;
  try { document.dispatchEvent(new CustomEvent('wv-ui-ready')); } catch (_) {}
})();
