(function () {
  var PASS = 'waverunnersapp2026';
  var KEY = 'wv_down_bypass';
  try { if (localStorage.getItem(KEY) === PASS) return; } catch (_) {}

  var style = document.createElement('style');
  style.textContent = '#wv-down{position:fixed;inset:0;z-index:2147483647;background:#000;color:#fff;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:24px;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center;}' +
    '#wv-down p{margin:0;font-size:19px;line-height:1.55;max-width:640px;}' +
    '#wv-down a{color:#fff;text-decoration:underline;}' +
    '#wv-down .gate{position:absolute;bottom:26px;display:flex;flex-direction:column;align-items:center;gap:10px;}' +
    '#wv-down .gate button{background:none;border:none;color:#fff;font-size:12px;opacity:.55;cursor:pointer;' +
    'font-family:inherit;padding:6px;}' +
    '#wv-down .gate button:hover{opacity:1;}' +
    '#wv-down .gate input{background:#111;border:1px solid #333;color:#fff;border-radius:7px;padding:8px 12px;' +
    'font-size:14px;font-family:inherit;text-align:center;width:210px;}' +
    'html.wv-down-on,body.wv-down-on{overflow:hidden !important;}';

  function build() {
    document.documentElement.classList.add('wv-down-on');
    if (document.body) document.body.classList.add('wv-down-on');
    if (!style.parentNode) (document.head || document.documentElement).appendChild(style);
    if (document.getElementById('wv-down')) return;

    var box = document.createElement('div');
    box.id = 'wv-down';
    box.innerHTML = '<p>Wavernrs is currently down, join the Discord for updates: ' +
      '<a href="https://discord.gg/j2jGmw5CZH" target="_blank" rel="noopener">https://discord.gg/j2jGmw5CZH</a></p>' +
      '<div class="gate"><button type="button" id="wv-down-toggle">password</button></div>';
    (document.body || document.documentElement).appendChild(box);

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

  function stopMedia() {
    try {
      var m = document.querySelectorAll('audio,video');
      for (var i = 0; i < m.length; i++) { m[i].pause(); m[i].removeAttribute('src'); }
    } catch (_) {}
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
  setInterval(function () { build(); stopMedia(); }, 700);
})();
