(function () {
  var PASS = 'waverunnersapp2026';
  var KEY = 'wv_down_bypass';
  var SEEN = 'wv_down_state';
  if (/\/status(\.html)?$/.test(location.pathname)) return;
  try { if (localStorage.getItem(KEY) === PASS) return; } catch (_) {}

  function remember(on) { try { localStorage.setItem(SEEN, on ? '1' : '0'); } catch (_) {} }
  function remembered() { try { return localStorage.getItem(SEEN) === '1'; } catch (_) { return false; } }

  var style = document.createElement('style');
  style.textContent = '#wv-down{position:fixed;inset:0;z-index:2147483647;background:#000;color:#fff;overflow-y:auto;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center;}' +
    '#wv-down .inner{min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;gap:22px;padding:56px 20px 92px;}' +
    '#wv-down .brand{font-size:22px;font-weight:800;letter-spacing:-.02em;}' +
    '#wv-down .card{width:100%;}' +
    '#wv-down .note{font-size:14.5px;line-height:1.7;color:#c9c9d0;max-width:620px;}' +
    '#wv-down .note a{color:#fff;text-decoration:underline;}' +
    '#wv-down .gate{position:fixed;left:0;right:0;bottom:22px;display:flex;flex-direction:column;' +
    'align-items:center;gap:10px;}' +
    '#wv-down .gate button{background:none;border:none;color:#fff;font-size:12px;opacity:.55;cursor:pointer;' +
    'font-family:inherit;padding:6px;}' +
    '#wv-down .gate button:hover{opacity:1;}' +
    '#wv-down .gate input{background:#111;border:1px solid #333;color:#fff;border-radius:7px;padding:8px 12px;' +
    'font-size:14px;font-family:inherit;text-align:center;width:210px;}' +
    'html.wv-down-on,body.wv-down-on{overflow:hidden !important;}';

  var on = false;

  function build() {
    if (!on) return;
    document.documentElement.classList.add('wv-down-on');
    if (document.body) document.body.classList.add('wv-down-on');
    if (!style.parentNode) (document.head || document.documentElement).appendChild(style);
    if (document.getElementById('wv-down')) return;

    var box = document.createElement('div');
    box.id = 'wv-down';
    box.innerHTML = '<div class="inner">' +
      '<div class="brand">wavernrs</div>' +
      '<div class="card" id="wv-down-card"></div>' +
      '<div class="note">Wavernrs is currently down, join the Discord for updates: ' +
        '<a href="https://discord.gg/j2jGmw5CZH" target="_blank" rel="noopener">https://discord.gg/j2jGmw5CZH</a></div>' +
      '</div>' +
      '<div class="gate"><button type="button" id="wv-down-toggle">password</button></div>';
    (document.body || document.documentElement).appendChild(box);
    if (_doc) paint(_doc);

    var gate = box.querySelector('.gate');
    document.getElementById('wv-down-toggle').onclick = function () {
      if (gate.querySelector('input')) return;
      var inp = document.createElement('input');
      inp.type = 'password';
      inp.placeholder = 'password';
      gate.insertBefore(inp, gate.firstChild);
      inp.focus();
      inp.onkeydown = function (e) {
        if (e.key !== 'Enter') return;
        if (inp.value !== PASS) { inp.value = ''; inp.placeholder = 'wrong'; return; }
        try { localStorage.setItem(KEY, PASS); } catch (_) {}
        location.reload();
      };
    };
  }

  function teardown() {
    on = false;
    document.documentElement.classList.remove('wv-down-on');
    if (document.body) document.body.classList.remove('wv-down-on');
    var el = document.getElementById('wv-down');
    if (el) el.remove();
  }

  var _doc = null;
  function paint(d) {
    if (!window.wvStatus) return;
    var card = document.getElementById('wv-down-card');
    if (!card) return;
    wvStatus.styleOnce();
    card.innerHTML = wvStatus.render(d);
  }

  function stopMedia() {
    if (!on) return;
    try {
      var m = document.querySelectorAll('audio,video');
      for (var i = 0; i < m.length; i++) { m[i].pause(); m[i].removeAttribute('src'); }
    } catch (_) {}
  }

  function start() {
    if (remembered()) { on = true; build(); }
    var tries = 0;
    var tick = setInterval(function () {
      if (!window.wvStatus) { if (++tries > 40) clearInterval(tick); return; }
      clearInterval(tick);
      wvStatus.load().then(function (d) {
        _doc = d;
        remember(!!d.locked);
        if (d.locked) { on = true; build(); paint(d); }
        else if (on) teardown();
      }).catch(function () {});
    }, 100);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
  setInterval(function () { build(); stopMedia(); }, 700);
})();
