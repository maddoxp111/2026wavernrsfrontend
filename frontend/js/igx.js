(function () {
  'use strict';

  var CREDIT_URL = 'https://insta.yetour.xyz';
  var OWN = { ye: 1, kanyewest: 1 };
  var K_THEME = 'wv_igx_theme', K_LIKES = 'wv_igx_likes', K_SAVES = 'wv_igx_saves';
  var MOBILE_Q = '(max-width: 700px)';
  var OUT_W = 425, OUT_H = 884;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsList(k) { try { var a = JSON.parse(lsGet(k) || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } }

  function S_(body, o) {
    o = o || {};
    return '<g fill="' + (o.fill || 'none') + '" stroke="currentColor" stroke-width="' + (o.w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</g>';
  }
  function F_(body) { return '<g fill="currentColor">' + body + '</g>'; }
  var HEART = '<path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"/>';
  var REELS = '<line x1="2.049" x2="21.95" y1="7.002" y2="7.002"/><line x1="13.504" x2="16.362" y1="2.001" y2="7.002"/><line x1="7.207" x2="10.002" y1="2.11" y2="7.002"/><path d="M2 12.001v3.449c0 2.849.698 4.006 1.606 4.945.94.908 2.098 1.607 4.946 1.607h6.896c2.848 0 4.006-.699 4.946-1.607.908-.939 1.606-2.096 1.606-4.945V8.552c0-2.848-.698-4.006-1.606-4.945C19.454 2.699 18.296 2 15.448 2H8.552c-2.848 0-4.006.699-4.946 1.607C2.698 4.546 2 5.704 2 8.552Z"/><path fill="currentColor" d="M9.763 17.664a.908.908 0 0 1-.454-.787V11.63a.909.909 0 0 1 1.364-.788l4.545 2.624a.909.909 0 0 1 0 1.575l-4.545 2.624a.91.91 0 0 1-.91 0Z"/>';
  var SHARE = '<line x1="22" x2="9.218" y1="3" y2="10.083"/><polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"/>';
  var ICONS = {
    heart: [24, F_(HEART)],
    heartOn: [24, F_('<path d="M12 21.35c-.45 0-.9-.15-1.25-.46C6.05 16.85 2 13.4 2 9.12 2 5.83 4.55 3.3 7.7 3.3c1.78 0 3.45.83 4.3 2.15C12.85 4.13 14.52 3.3 16.3 3.3c3.15 0 5.7 2.53 5.7 5.82 0 4.28-4.05 7.73-8.75 11.77-.35.31-.8.46-1.25.46z"/>')],
    comment: [24, S_('<path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z"/>')],
    share: [24, S_(SHARE)],
    save: [24, S_('<polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21"/>')],
    saveOn: [24, S_('<polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21"/>', { fill: 'currentColor' })],
    home: [24, S_('<path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z"/>')],
    homeOn: [24, F_('<path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z"/>')],
    search: [24, S_('<path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z"/><line x1="16.511" x2="22" y1="16.511" y2="22"/>')],
    searchOn: [24, S_('<path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z"/><line x1="16.511" x2="22" y1="16.511" y2="22"/>', { w: 3 })],
    reels: [24, S_(REELS)],
    reelsOn: [24, S_(REELS, { w: 2.8 })],
    dm: [24, S_(SHARE)],
    dmOn: [24, S_(SHARE, { w: 2.8 })],
    grid: [24, S_('<rect x="3" y="3" width="18" height="18"/><line x1="9.015" x2="9.015" y1="3" y2="21"/><line x1="14.985" x2="14.985" y1="3" y2="21"/><line x1="21" x2="3" y1="9.015" y2="9.015"/><line x1="21" x2="3" y1="14.985" y2="14.985"/>')],
    tagged: [24, S_('<path d="M10.201 3.797 12 1.997l1.799 1.8a1.59 1.59 0 0 0 1.124.465h5.259A1.818 1.818 0 0 1 22 6.08v14.104a1.818 1.818 0 0 1-1.818 1.818H3.818A1.818 1.818 0 0 1 2 20.184V6.08a1.818 1.818 0 0 1 1.818-1.818h5.26a1.59 1.59 0 0 0 1.123-.465Z"/><path d="M18.598 22.002V21.4a3.949 3.949 0 0 0-3.948-3.949H9.495A3.949 3.949 0 0 0 5.546 21.4v.603"/><circle cx="12.072" cy="11.075" r="3.556"/>')],
    carousel: [48, F_('<path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2-.1-1.2.6z"/>')],
    more: [24, F_('<circle cx="12" cy="12" r="1.6"/><circle cx="5.5" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>')],
    back: [24, S_('<path d="m15 3-9 9 9 9"/>', { w: 2.4 })],
    chev: [24, S_('<path d="m6 9 6 6 6-6"/>', { w: 2.4 })],
    bell: [24, S_('<path d="M5.1 9a6.9 6.9 0 0 1 13.8 0c0 4.4 1.1 5.8 2.2 7.2H2.9C4 14.8 5.1 13.4 5.1 9Z"/><path d="M9.6 19.4a2.6 2.6 0 0 0 4.8 0"/>')],
    close: [24, S_('<path d="m6 6 12 12M18 6 6 18"/>', { w: 2.2 })],
    camera: [24, S_('<path d="M7 7l1.2-2h7.6L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7z"/><circle cx="12" cy="13" r="3.5"/>')],
    volOn: [24, F_('<path d="M3 9.5v5A1.5 1.5 0 0 0 4.5 16H8l5 4.2V3.8L8 8H4.5A1.5 1.5 0 0 0 3 9.5Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.4 8.4a5 5 0 0 1 0 7.2M18.9 5.9a8.5 8.5 0 0 1 0 12.2"/>')],
    volOff: [24, F_('<path d="M3 9.5v5A1.5 1.5 0 0 0 4.5 16H8l5 4.2V3.8L8 8H4.5A1.5 1.5 0 0 0 3 9.5Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m16.5 9.5 5 5m0-5-5 5"/>')],
    play: [24, F_('<path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z"/>')],
    link: [24, S_('<path d="m9.726 5.123 1.228-1.228a6.47 6.47 0 0 1 9.15 9.152l-1.227 1.227m-4.603 4.603-1.228 1.228a6.47 6.47 0 0 1-9.15-9.152l1.227-1.227"/><line x1="8.471" x2="15.529" y1="15.529" y2="8.471"/>')],
    personAdd: [24, S_('<circle cx="10" cy="7.5" r="4"/><path d="M2.5 21v-.8a6.2 6.2 0 0 1 6.2-6.2h2.8"/><path d="M18 14.5v6M15 17.5h6"/>')],
    copy: [24, S_('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>')],
    external: [24, S_('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>')],
    download: [24, S_('<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M4 19.5h16"/>')],
    sun: [24, S_('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>')],
    moon: [24, S_('<path d="M20.5 14.8A8.8 8.8 0 0 1 9.2 3.5 8.8 8.8 0 1 0 20.5 14.8Z"/>')],
    info: [24, S_('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/>')],
    music: [24, S_('<path d="M9 17.5V5.8l11-2.3v11.7"/><circle cx="6.5" cy="17.8" r="2.7"/><circle cx="17.5" cy="15.4" r="2.7"/>')],
    threads: [24, '<g transform="translate(2 1.4) scale(.0198)" fill="currentColor"><path d="M770.347,500.347c-1.355-156.85-86.386-251.367-230.025-251.367-95.872,0-176.499,43.362-218.846,112.472l92.823,64.705c24.053-37.942,57.252-69.448,118.231-69.448,68.77,0,104.341,38.281,114.504,109.423-33.2-5.081-66.399-7.791-100.615-7.791-185.646,0-273.049,84.015-273.049,195.131,0,113.149,87.403,179.548,216.136,179.548,141.267,0,225.621-95.194,260.176-213.086,35.91,16.261,60.64,54.203,60.64,111.116,0,152.447-175.822,235.446-324.881,235.446-219.862,0-363.501-144.316-363.501-379.084,0-287.616,190.05-471.907,445.483-471.907,171.418,0,256.11,75.207,313.701,176.16l94.856-66.399C913.308,94.501,773.396,1,563.358,1,228.653,1,.999,238.478.999,583.008c0,315.057,222.911,497.992,488.507,497.992,219.523,0,441.418-128.055,441.418-347.24,0-114.504-65.721-190.389-160.577-233.413ZM485.441,718.854c-48.444,0-91.129-23.036-91.129-65.383,0-66.738,81.983-87.064,162.271-87.064,30.489,0,60.301,2.032,86.725,7.792-18.971,86.725-75.207,144.655-157.867,144.655Z"/></g>'],
  };
  function icon(name, size, cls) {
    var d = ICONS[name]; if (!d) return '';
    var vb = d[0] === 48 ? '0 0 48 48' : '0 0 24 24';
    var px = size || 24;
    return '<svg class="igx-svg' + (cls ? ' ' + cls : '') + '" width="' + px + '" height="' + px + '" viewBox="' + vb + '" aria-hidden="true" focusable="false">' + d[1] + '</svg>';
  }
  function badge(px) {
    return '<svg class="igx-vf" width="' + px + '" height="' + px + '" viewBox="0 0 40 40" role="img" aria-label="Verified"><path fill="#0095f6" fill-rule="evenodd" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"/></svg>';
  }

  function dateText(d) {
    if (!d) return '';
    var y = +d.slice(0, 4), m = +d.slice(5, 7) - 1, day = +d.slice(8, 10);
    if (!MONTHS[m]) return '';
    return MONTHS[m] + ' ' + day + (y === new Date().getFullYear() ? '' : ', ' + y);
  }
  function shorten(u) { var s = u.replace(/^https?:\/\/(www\.)?/, ''); return s.length > 30 ? s.slice(0, 29) + '…' : s; }
  function captionHTML(t) {
    var re = /(https?:\/\/[^\s<]+)|(^|[\s(])@([A-Za-z0-9._]{1,30})|(^|[\s(])#([\p{L}\p{N}_]{1,60})/gu;
    var out = '', last = 0, m;
    while ((m = re.exec(t))) {
      out += esc(t.slice(last, m.index));
      if (m[1]) {
        var raw = m[1], clean = raw.replace(/[.,!?)\]]+$/, '');
        out += '<a class="igx-lnk" href="' + esc(clean) + '" target="_blank" rel="noopener nofollow">' + esc(shorten(clean)) + '</a>' + esc(raw.slice(clean.length));
      } else if (m[3]) {
        var h = m[3].replace(/\.+$/, '');
        out += esc(m[2]) + '<a class="igx-lnk" href="https://www.instagram.com/' + esc(h) + '/" target="_blank" rel="noopener nofollow">@' + esc(h) + '</a>' + esc(m[3].slice(h.length));
      } else {
        out += esc(m[4]) + '<a class="igx-lnk" href="https://www.instagram.com/explore/tags/' + encodeURIComponent(m[5]) + '/" target="_blank" rel="noopener nofollow">#' + esc(m[5]) + '</a>';
      }
      last = re.lastIndex;
    }
    return out + esc(t.slice(last));
  }

  var mounted = null;

  function mount(root, opts) {
    opts = opts || {};
    if (mounted) { try { mounted.destroy(); } catch (_) {} }

    var S = {
      data: null, posts: [], reels: [], tagged: [], explore: [], results: [], query: '', byCode: {},
      tab: 'profile', ptab: 'grid', theme: lsGet(K_THEME) === 'light' ? 'light' : 'dark',
      likes: new Set(lsList(K_LIKES)), saves: new Set(lsList(K_SAVES)),
      muted: true, full: false, open: false, over: null, destroyed: false, scale: 1, built: {}, loading: false, failed: null,
    };
    var mq = window.matchMedia ? window.matchMedia(MOBILE_Q) : { matches: false };
    var stage = document.createElement('div');
    stage.className = 'igx-stage';
    stage.style.display = 'none';
    stage.innerHTML =
      '<div class="igx-scale"><div class="igx-device">' +
        '<i class="igx-sb igx-sb-a"></i><i class="igx-sb igx-sb-u"></i><i class="igx-sb igx-sb-d"></i><i class="igx-sb igx-sb-p"></i>' +
        '<div class="igx-bezel"><div class="igx-app" data-theme="' + S.theme + '" data-tab="profile">' +
          '<div class="igx-fake"><span class="igx-clock"></span><span class="igx-fake-r">' +
            '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
            '<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M1.2 4.4a10.4 10.4 0 0 1 14.6 0"/><path d="M3.8 7.2a6.6 6.6 0 0 1 9.4 0"/><circle cx="8.5" cy="10.3" r="1.2" fill="currentColor" stroke="none"/></svg>' +
            '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.8" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="19" height="9" rx="2.6" fill="currentColor"/><path d="M24.2 4.4v4.2c.9-.3 1.6-1.1 1.6-2.1s-.7-1.8-1.6-2.1Z" fill="currentColor" opacity=".5"/></svg>' +
          '</span></div>' +
          '<div class="igx-island"><i></i></div>' +
          '<div class="igx-views"></div>' +
          '<nav class="igx-tabbar" aria-label="Instagram"></nav>' +
          '<div class="igx-home"></div>' +
          '<div class="igx-layer"></div>' +
        '</div></div>' +
      '</div></div>' +
      '<div class="igx-credit"></div>';
    root.appendChild(stage);

    var app = stage.querySelector('.igx-app');
    var viewsEl = stage.querySelector('.igx-views');
    var tabbar = stage.querySelector('.igx-tabbar');
    var layer = stage.querySelector('.igx-layer');
    var clock = stage.querySelector('.igx-clock');
    var creditEl = stage.querySelector('.igx-credit');
    var vio = null, tickTimer = null, stateTimer = null;

    function persist() {
      lsSet(K_LIKES, JSON.stringify(Array.from(S.likes).slice(-800)));
      lsSet(K_SAVES, JSON.stringify(Array.from(S.saves).slice(-800)));
    }
    function toast(msg) {
      var t = document.createElement('div');
      t.className = 'igx-toast';
      t.textContent = msg;
      layer.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('in'); });
      setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 250); }, 2200);
    }
    function copy(text, msg) {
      try { navigator.clipboard.writeText(text).then(function () { toast(msg || 'Link copied'); }, function () { prompt('copy this link', text); }); }
      catch (_) { prompt('copy this link', text); }
    }
    function postLink(code) { return location.origin + '/resources?view=insta&post=' + encodeURIComponent(code); }

    function mediaUrl(path) {
      var r = String((S.data && S.data.media_root) || 'https://media.yetour.xyz/yzyinsta').replace(/\/$/, '');
      return r + '/' + String(path).split('/').map(encodeURIComponent).join('/');
    }
    function sized(url, w) {
      var m = /^https:\/\/([^/]+)(\/.*)$/.exec(url);
      if (!m || !/\.yetour\.xyz$/i.test(m[1])) return url;
      return 'https://i0.wp.com/' + m[1] + m[2] + '?w=' + w + '&quality=80&strip=all';
    }
    function ratio(p) {
      var m = p.media[0], r = m && m.w && m.h ? m.w / m.h : 0.8;
      return Math.min(Math.max(r, 0.8), 1.91);
    }
    function pfp() { return (S.data && S.data.profile && S.data.profile.pfp) || ''; }
    function avatarHTML(a, cls) {
      var h = String(a.handle || '').toLowerCase();
      var src = OWN[h] ? pfp() : a.avatar ? mediaUrl(a.avatar) : '';
      if (src) return '<span class="' + cls + '"><img src="' + esc(src) + '" alt="" loading="lazy" decoding="async"></span>';
      return '<span class="' + cls + ' igx-ph0">' + esc(h.slice(0, 1).toUpperCase()) + '</span>';
    }

    function applyScale() {
      if (S.full) { stage.style.removeProperty('--igx-s'); return; }
      var avail = Math.max(420, (window.innerHeight || OUT_H) - 136);
      S.scale = Math.max(0.5, Math.min(1, avail / OUT_H));
      stage.style.setProperty('--igx-s', S.scale.toFixed(4));
    }
    function setFull(on) {
      if (S.full === on && stage.dataset.m) return;
      S.full = on;
      stage.dataset.m = on ? 'full' : 'phone';
      if (on && stage.parentNode !== document.body) document.body.appendChild(stage);
      else if (!on && stage.parentNode !== root) root.appendChild(stage);
      document.documentElement.classList.toggle('igx-lock', on && S.open);
      applyScale();
    }
    function onMq() { setFull(!!mq.matches); }
    function onResize() { applyScale(); }
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    window.addEventListener('resize', onResize);

    function tickClock() {
      var d = new Date(), h = d.getHours() % 12 || 12;
      clock.textContent = h + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function videoObserver() {
      if (vio || !('IntersectionObserver' in window)) return;
      vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.55 && S.open && !document.hidden) {
            v.muted = S.muted;
            var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
          } else { try { v.pause(); } catch (_) {} }
        });
      }, { threshold: [0, 0.55, 1] });
    }
    function watchVideos(scope) {
      videoObserver();
      if (!vio) return;
      scope.querySelectorAll('video:not([data-w])').forEach(function (v) { v.dataset.w = '1'; vio.observe(v); });
    }
    function pauseAll() { app.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (_) {} }); }
    function setMuted(m) {
      S.muted = m;
      app.querySelectorAll('video').forEach(function (v) { v.muted = m; });
      app.querySelectorAll('.igx-vol').forEach(function (b) { b.innerHTML = icon(m ? 'volOff' : 'volOn', 14); });
      app.querySelectorAll('[data-a="mute"]').forEach(function (b) { b.innerHTML = icon(m ? 'volOff' : 'volOn', 22); });
    }

    function prep(d) {
      S.data = d;
      S.posts = d.posts || [];
      S.byCode = {};
      S.posts.forEach(function (p, i) { S.byCode[p.code] = i; });
      S.reels = S.posts.filter(function (p) { return p.type === 'video'; });
      S.tagged = S.posts.filter(function (p) { return p.tagged; });
      var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
      S.explore = S.posts.slice().sort(function (a, b) { return hash(a.code) - hash(b.code); });
    }

    function load() {
      if (S.data) return Promise.resolve();
      if (window._igxData) { prep(window._igxData); return Promise.resolve(); }
      if (S.loading) return S.loading;
      S.failed = null;
      S.loading = (typeof api === 'function' ? api('/ye/instagram') : fetch('/api/ye/instagram').then(function (r) { return r.json(); })).then(function (d) {
        if (!d || !Array.isArray(d.posts)) throw new Error('the instagram archive isnt ready yet');
        window._igxData = d;
        prep(d);
      }).catch(function (e) { S.failed = (e && e.message) || 'the instagram archive isnt ready yet...try again in a bit'; })
        .then(function () { S.loading = null; });
      return S.loading;
    }

    function listOf(key) {
      return key === 'reels' ? S.reels : key === 'tagged' ? S.tagged : key === 'search' ? S.results : key === 'explore' ? S.explore : S.posts;
    }

    function tileHTML(p, i, key, cls) {
      var m0 = p.media[0];
      var src = p.thumb ? mediaUrl(p.thumb) : m0.poster ? mediaUrl(m0.poster) : m0.video ? '' : mediaUrl(m0.src);
      var b = p.type === 'carousel' ? '<span class="igx-tb">' + icon('carousel', 22) + '</span>' : p.type === 'video' ? '<span class="igx-tb">' + icon('reels', 22) + '</span>' : '';
      return '<button type="button" class="igx-tile' + (cls || '') + '" data-a="open" data-l="' + key + '" data-i="' + i + '" aria-label="Open post">' +
        (src ? '<img loading="lazy" decoding="async" alt="' + esc(p.alt || '') + '" src="' + esc(sized(src, 400)) + '" data-o="' + esc(src) + '">' : '') + b + '</button>';
    }
    function fillGrid(el, key, cls) {
      var list = listOf(key), shown = 0, step = 60;
      el.innerHTML = '';
      var sentinel = document.createElement('div');
      sentinel.className = 'igx-sent';
      function more() {
        if (shown >= list.length) { sentinel.remove(); return; }
        var html = '';
        for (var i = shown; i < Math.min(list.length, shown + step); i++) html += tileHTML(list[i], i, key, cls ? cls(i) : '');
        sentinel.insertAdjacentHTML('beforebegin', html);
        shown = Math.min(list.length, shown + step);
        if (shown >= list.length) sentinel.remove();
      }
      el.appendChild(sentinel);
      more();
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) more(); }, { root: el.closest('.igx-scroll'), rootMargin: '900px 0px' });
        io.observe(sentinel);
        el._io = io;
      } else { while (shown < list.length) more(); }
    }

    function barHTML(left, mid, right, cls) {
      return '<div class="igx-bar ' + (cls || '') + '"><div class="igx-bar-l">' + left + '</div><div class="igx-mid">' + mid + '</div><div class="igx-bar-r">' + right + '</div></div>';
    }
    function ib(a, name, label, size) { return '<button type="button" class="igx-ib" data-a="' + a + '" aria-label="' + label + '">' + icon(name, size || 24) + '</button>'; }

    function profileSkeleton() {
      var h = '';
      for (var i = 0; i < 12; i++) h += '<div class="igx-tile igx-sk"></div>';
      return '<div class="igx-ph-h"><div class="igx-ph-av igx-skb"></div><div class="igx-ph-stats"><i class="igx-skb"></i><i class="igx-skb"></i><i class="igx-skb"></i></div></div>' +
        '<div class="igx-grid">' + h + '</div>';
    }
    function emptyState(kind) {
      if (kind === 'tagged') return '<div class="igx-empty"><div class="igx-empty-i">' + icon('tagged', 38) + '</div><b>Photos and videos of ye</b><span>When people tag ye in photos and videos, they’ll appear here.</span></div>';
      return '<div class="igx-empty"><div class="igx-empty-i">' + icon('grid', 38) + '</div><b>No posts yet</b></div>';
    }

    function profileBody() {
      var P = S.data.profile, n = S.posts.length;
      var fb = P.followed_by || {};
      var av = (fb.avatars || []).slice(0, 3).map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join('');
      var names = (fb.names || []).map(function (x) { return '<b>' + esc(x) + '</b>'; }).join(', ');
      return '<div class="igx-ph-h">' +
          '<div class="igx-ph-av"><img src="' + esc(P.pfp || '') + '" alt="' + esc(P.username) + '"></div>' +
          '<div class="igx-ph-stats">' +
            '<div><b>' + n + '</b><span>posts</span></div>' +
            '<div><b>' + esc(P.followers) + '</b><span>followers</span></div>' +
            '<div><b>' + esc(P.following) + '</b><span>following</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="igx-bio">' +
          '<div class="igx-bio-n">' + esc(P.name) + '</div>' +
          (P.bio ? '<div class="igx-bio-t">' + esc(P.bio) + '</div>' : '') +
          (P.link ? '<a class="igx-bio-l" href="' + esc(P.link.url) + '" target="_blank" rel="noopener nofollow">' + icon('link', 16) + '<b>' + esc(P.link.label) + '</b></a>' : '') +
          (P.threads ? '<a class="igx-thr" href="https://www.threads.com/@' + esc(P.threads) + '" target="_blank" rel="noopener nofollow">' + icon('threads', 16) + '<span>' + esc(P.threads) + '</span></a>' : '') +
          (names ? '<div class="igx-fby"><span class="igx-fby-a">' + av + '</span><span>Followed by ' + names + ' and others</span></div>' : '') +
        '</div>' +
        '<div class="igx-btns">' +
          '<button type="button" class="igx-btn" data-a="follow"><span>Following</span>' + icon('chev', 16) + '</button>' +
          '<button type="button" class="igx-btn" data-a="dm">Message</button>' +
          '<button type="button" class="igx-btn igx-btn-s" data-a="more-p" aria-label="Suggested accounts">' + icon('personAdd', 18) + '</button>' +
        '</div>' +
        '<div class="igx-ptabs" role="tablist">' +
          '<button type="button" role="tab" data-a="ptab" data-k="grid" class="on" aria-label="Posts">' + icon('grid', 24) + '</button>' +
          '<button type="button" role="tab" data-a="ptab" data-k="reels" aria-label="Reels">' + icon('reels', 24) + '</button>' +
          '<button type="button" role="tab" data-a="ptab" data-k="tagged" aria-label="Tagged">' + icon('tagged', 24) + '</button>' +
        '</div>' +
        '<div class="igx-grid" data-g="profile"></div>' +
        '<div class="igx-foot">posts from the <a href="' + CREDIT_URL + '" target="_blank" rel="noopener">YE INSTAGRAM ARCHIVE</a> ❤️</div>';
    }

    function renderProfile() {
      var v = viewsEl.querySelector('[data-v="profile"]');
      if (!v) {
        v = document.createElement('section');
        v.className = 'igx-view';
        v.dataset.v = 'profile';
        v.hidden = S.tab !== 'profile';
        viewsEl.appendChild(v);
      }
      var P = S.data && S.data.profile;
      v.innerHTML =
        barHTML(
          S.full ? ib('exit', 'back', 'Back', 26) : '<span class="igx-bar-sp"></span>',
          '<b class="igx-uname">' + esc(P ? P.username : 'ye') + '</b>' + (P ? badge(14) : ''),
          ib('bell', 'bell', 'Notifications') + ib('more-p', 'more', 'Options'),
          'igx-bar-p'
        ) +
        '<div class="igx-scroll">' + (S.data ? profileBody() : S.failed ? failHTML() : profileSkeleton()) + '</div>';
      if (S.data) { S.ptab = 'grid'; paintProfileGrid(); }
    }
    function failHTML() {
      return '<div class="igx-empty"><div class="igx-empty-i">' + icon('info', 38) + '</div><b>Couldn’t load posts</b><span>' + esc(S.failed) + '</span><button type="button" class="igx-btn igx-retry" data-a="retry">Try again</button></div>';
    }
    function paintProfileGrid() {
      var v = viewsEl.querySelector('[data-v="profile"]'); if (!v) return;
      var g = v.querySelector('[data-g="profile"]'); if (!g) return;
      if (g._io) { g._io.disconnect(); g._io = null; }
      v.querySelectorAll('.igx-ptabs [data-k]').forEach(function (b) { var on = b.dataset.k === S.ptab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var list = listOf(S.ptab);
      if (!list.length) { g.className = 'igx-grid igx-grid-e'; g.innerHTML = emptyState(S.ptab); return; }
      g.className = 'igx-grid';
      fillGrid(g, S.ptab);
    }

    function renderHome() {
      var v = ensureView('home');
      if (S.built.home) return;
      S.built.home = 1;
      v.innerHTML =
        barHTML('<span class="igx-word">Instagram</span>' + icon('chev', 14, 'igx-word-c'), '', ib('bell', 'heart', 'Notifications') + ib('dm', 'dm', 'Messages'), 'igx-bar-h') +
        '<div class="igx-scroll"><div class="igx-feed" data-f="home"></div></div>';
      startFeed(v.querySelector('.igx-feed'), v.querySelector('.igx-scroll'), 'grid', 0, false);
    }
    function renderSearch() {
      var v = ensureView('search');
      if (S.built.search) return;
      S.built.search = 1;
      v.innerHTML =
        '<div class="igx-bar igx-bar-s"><label class="igx-search">' + icon('search', 16) + '<input type="search" placeholder="Search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search posts"></label></div>' +
        '<div class="igx-scroll"><div class="igx-grid igx-explore" data-g="explore"></div><div class="igx-sres" data-g="res" hidden></div></div>';
      var ex = v.querySelector('[data-g="explore"]');
      fillGrid(ex, 'explore', function (i) { return i % 12 === 0 ? ' igx-big' : i % 12 === 6 ? ' igx-big igx-bigr' : ''; });
      var input = v.querySelector('input'), timer = null;
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { runSearch(input.value); }, 160); });
    }
    function runSearch(q) {
      var v = viewsEl.querySelector('[data-v="search"]'); if (!v) return;
      S.query = q.trim().toLowerCase();
      var ex = v.querySelector('[data-g="explore"]'), res = v.querySelector('[data-g="res"]');
      if (!S.query) { res.hidden = true; ex.hidden = false; return; }
      var words = S.query.split(/\s+/);
      S.results = S.posts.filter(function (p) {
        var hay = (p.caption + ' ' + dateText(p.date) + ' ' + (p.date || '') + ' ' + (p.type === 'video' ? 'reel video' : p.type === 'carousel' ? 'carousel photos' : 'photo') + ' ' + (p.authors || []).map(function (a) { return a.handle; }).join(' ')).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      ex.hidden = true; res.hidden = false;
      res.innerHTML = '<div class="igx-sn">' + S.results.length + ' result' + (S.results.length === 1 ? '' : 's') + '</div><div class="igx-grid" data-g="resgrid"></div>';
      var g = res.querySelector('[data-g="resgrid"]');
      if (!S.results.length) g.innerHTML = '<div class="igx-empty igx-empty-s"><b>No results</b><span>Try a year, a word from a caption, or “reel”.</span></div>';
      else fillGrid(g, 'search');
    }

    function renderReels() {
      var v = ensureView('reels');
      if (S.built.reels) return;
      S.built.reels = 1;
      var html = S.reels.map(function (p, i) { return reelHTML(p, i); }).join('');
      v.innerHTML =
        '<div class="igx-reels" data-f="reels">' + html + '</div>' +
        '<div class="igx-rtop"><b>Reels</b><span>' + ib('mute', 'volOff', 'Sound', 22) + ib('cam', 'camera', 'Camera', 24) + '</span></div>';
      watchVideos(v);
      v.querySelectorAll('.igx-reel').forEach(function (r) { r.dataset.n = '1'; });
    }
    function reelHTML(p, i) {
      var m = p.media[0], liked = S.likes.has(p.code);
      var fit = m.w && m.h && m.w / m.h < 0.75 ? 'cover' : 'contain';
      return '<article class="igx-reel" data-code="' + esc(p.code) + '" data-i="' + i + '">' +
        '<video class="igx-rv ' + fit + '" muted loop playsinline preload="none" ' + (m.poster ? 'poster="' + esc(sized(mediaUrl(m.poster), 640)) + '" ' : '') + 'src="' + esc(mediaUrl(m.src)) + '"></video>' +
        '<div class="igx-rshade"></div>' +
        '<span class="igx-burst">' + icon('heartOn', 96) + '</span>' +
        '<span class="igx-rplay">' + icon('play', 54) + '</span>' +
        '<div class="igx-rside">' +
          '<button type="button" class="igx-ia" data-a="like" aria-label="Like">' + icon(liked ? 'heartOn' : 'heart', 28, liked ? 'on' : '') + '</button>' +
          '<button type="button" class="igx-ia" data-a="comment" aria-label="Comment">' + icon('comment', 28) + '</button>' +
          '<button type="button" class="igx-ia" data-a="share" aria-label="Share">' + icon('share', 28) + '</button>' +
          '<button type="button" class="igx-ia" data-a="more" aria-label="More">' + icon('more', 28) + '</button>' +
        '</div>' +
        '<div class="igx-rbot">' +
          '<div class="igx-ru"><span class="igx-av">' + (pfp() ? '<img src="' + esc(pfp()) + '" alt="">' : '') + '</span><b>ye</b>' + badge(12) + '<span class="igx-fl">Follow</span></div>' +
          (p.caption ? '<div class="igx-rc">' + captionHTML(p.caption) + '</div>' : '') +
          '<div class="igx-ra">' + icon('music', 13) + '<span>Original audio</span></div>' +
        '</div>' +
      '</article>';
    }

    function renderDm() {
      var v = ensureView('dm');
      if (S.built.dm) return;
      S.built.dm = 1;
      v.innerHTML = barHTML('<span class="igx-bar-sp"></span>', '<b class="igx-uname">ye</b>' + badge(14), ib('dm', 'camera', 'New message'), 'igx-bar-p') +
        '<div class="igx-scroll"><div class="igx-empty"><div class="igx-empty-i">' + icon('dm', 38) + '</div><b>Your messages</b><span>direct messages arent part of the archive.</span></div></div>';
    }

    function ensureView(name) {
      var v = viewsEl.querySelector('[data-v="' + name + '"]');
      if (!v) {
        v = document.createElement('section');
        v.className = 'igx-view';
        v.dataset.v = name;
        v.hidden = true;
        viewsEl.appendChild(v);
      }
      return v;
    }

    function renderTabbar() {
      var items = [['home', 'Home'], ['reels', 'Reels'], ['dm', 'Messages'], ['search', 'Search'], ['profile', 'Profile']];
      tabbar.innerHTML = items.map(function (it) {
        var on = S.tab === it[0];
        var inner = it[0] === 'profile'
          ? '<span class="igx-tav' + (on ? ' on' : '') + '">' + (pfp() ? '<img src="' + esc(pfp()) + '" alt="">' : '') + '</span>'
          : icon(on ? it[0] + 'On' : it[0], 26);
        return '<button type="button" class="igx-tb-i' + (on ? ' on' : '') + '" data-a="tab" data-t="' + it[0] + '" aria-label="' + it[1] + '"' + (on ? ' aria-current="page"' : '') + '>' + inner + '</button>';
      }).join('');
    }

    function showTab(t) {
      closeOver(true);
      var same = S.tab === t;
      S.tab = t;
      app.dataset.tab = t;
      if (t === 'home') renderHome();
      else if (t === 'search') renderSearch();
      else if (t === 'reels') renderReels();
      else if (t === 'dm') renderDm();
      else if (t === 'profile' && !viewsEl.querySelector('[data-v="profile"]')) renderProfile();
      viewsEl.querySelectorAll(':scope > .igx-view').forEach(function (v) { v.hidden = v.dataset.v !== t; });
      renderTabbar();
      if (same) {
        var sc = viewsEl.querySelector('[data-v="' + t + '"] .igx-scroll, [data-v="' + t + '"] .igx-reels');
        if (sc) sc.scrollTo ? sc.scrollTo({ top: 0, behavior: 'smooth' }) : (sc.scrollTop = 0);
      }
      var cv = viewsEl.querySelector('[data-v="' + t + '"]');
      if (cv) { measureCaps(cv); watchVideos(cv); }
      if (t !== 'reels') app.querySelectorAll('.igx-reels video').forEach(function (v) { try { v.pause(); } catch (_) {} });
      try { history.replaceState(history.state, '', location.pathname + '?view=insta' + (t !== 'profile' ? '&tab=' + t : '')); } catch (_) {}
    }

    function postHTML(p) {
      var multi = p.media.length > 1, liked = S.likes.has(p.code), saved = S.saves.has(p.code);
      var slides = p.media.map(function (m, i) { return slideHTML(p, m, i); }).join('');
      var media = multi
        ? '<div class="igx-car">' + slides + '</div><span class="igx-count">1/' + p.media.length + '</span>'
        : slides + (p.media[0].video ? '<span class="igx-reelb">' + icon('reels', 22) + '</span>' : '');
      return '<article class="igx-post" data-code="' + esc(p.code) + '">' +
        headHTML(p) +
        '<div class="igx-media" style="aspect-ratio:' + ratio(p).toFixed(4) + '">' + media + '<span class="igx-burst">' + icon('heartOn', 96) + '</span></div>' +
        '<div class="igx-acts">' +
          '<button type="button" class="igx-ia" data-a="like" aria-label="Like">' + icon(liked ? 'heartOn' : 'heart', 24, liked ? 'on' : '') + '</button>' +
          '<button type="button" class="igx-ia" data-a="comment" aria-label="Comment">' + icon('comment', 24) + '</button>' +
          '<button type="button" class="igx-ia" data-a="share" aria-label="Share">' + icon('share', 24) + '</button>' +
          (multi && p.media.length <= 10 ? '<span class="igx-dots">' + p.media.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</span>' : '') +
          '<button type="button" class="igx-ia igx-sv" data-a="save" aria-label="Save">' + icon(saved ? 'saveOn' : 'save', 24) + '</button>' +
        '</div>' +
        capHTML(p) +
        '<div class="igx-date">' + esc(dateText(p.date)) + '</div>' +
      '</article>';
    }
    function slideHTML(p, m, i) {
      if (m.video) {
        return '<div class="igx-slide"><video muted loop playsinline preload="none"' + (m.poster ? ' poster="' + esc(sized(mediaUrl(m.poster), 1080)) + '"' : '') + ' src="' + esc(mediaUrl(m.src)) + '"></video><button type="button" class="igx-vol" data-a="vol" aria-label="Sound">' + icon('volOff', 14) + '</button></div>';
      }
      var full = mediaUrl(m.src);
      return '<div class="igx-slide"><img ' + (i < 2 ? '' : 'loading="lazy" ') + 'decoding="async" alt="' + esc(p.alt || 'Archived photo') + '" src="' + esc(sized(full, 1080)) + '" data-o="' + esc(full) + '"></div>';
    }
    function headHTML(p) {
      var au = p.authors && p.authors.length ? p.authors.slice(0, 2) : [{ handle: 'ye', verified: true }];
      var av = au.map(function (a, i) { return avatarHTML(a, 'igx-av' + (i ? ' igx-av2' : '')); }).join('');
      var nm = au.map(function (a) { return '<b>' + esc(a.handle) + '</b>' + (a.verified ? badge(13) : ''); }).join('<span class="igx-and">and</span>');
      return '<header class="igx-ph"><div class="igx-avs' + (au.length > 1 ? ' two' : '') + '">' + av + '</div><div class="igx-who">' + nm + '</div>' +
        '<button type="button" class="igx-ia" data-a="more" aria-label="More">' + icon('more', 24) + '</button></header>';
    }
    function capHTML(p) {
      if (!p.caption) return '';
      var who = p.authors && p.authors[0] ? p.authors[0].handle : 'ye';
      return '<div class="igx-cap"><div class="igx-capt"><b>' + esc(who) + '</b> ' + captionHTML(p.caption) + '</div></div>';
    }
    function measureCaps(scope) {
      scope.querySelectorAll('.igx-capt:not([data-m])').forEach(function (c) {
        if (!c.offsetParent) return;
        c.dataset.m = '1';
        if (c.scrollHeight > c.clientHeight + 2) { c.classList.add('clip'); c.insertAdjacentHTML('beforeend', '<button type="button" class="igx-more" data-a="more-c">… more</button>'); }
      });
    }

    function startFeed(container, scroller, key, index, withStart) {
      var list = listOf(key), n = list.length;
      var s = Math.max(0, index - (withStart ? 4 : 0)), e = Math.min(n, index + 6);
      var top = document.createElement('div'), bot = document.createElement('div');
      top.className = bot.className = 'igx-fs';
      container.innerHTML = '';
      container.appendChild(top);
      var wrap = document.createElement('div'); wrap.className = 'igx-posts'; container.appendChild(wrap);
      container.appendChild(bot);
      function html(a, b) { var h = ''; for (var i = a; i < b; i++) h += postHTML(list[i]); return h; }
      wrap.innerHTML = html(s, e);
      measureCaps(wrap); watchVideos(wrap);
      var ioT = null;
      function appendMore() {
        if (e >= n) return;
        var to = Math.min(n, e + 6);
        wrap.insertAdjacentHTML('beforeend', html(e, to));
        e = to;
        measureCaps(wrap); watchVideos(wrap);
      }
      function prependMore() {
        if (s <= 0) return;
        var from = Math.max(0, s - 6);
        var before = scroller.scrollHeight, bt = scroller.scrollTop;
        wrap.insertAdjacentHTML('afterbegin', html(from, s));
        s = from;
        measureCaps(wrap); watchVideos(wrap);
        scroller.scrollTop = bt + (scroller.scrollHeight - before);
      }
      if ('IntersectionObserver' in window) {
        ioT = new IntersectionObserver(function (es) {
          es.forEach(function (x) { if (!x.isIntersecting) return; if (x.target === bot) appendMore(); else if (x.target === top) prependMore(); });
        }, { root: scroller, rootMargin: '1200px 0px' });
        ioT.observe(bot);
        if (withStart && s > 0) setTimeout(function () { if (!S.destroyed) ioT.observe(top); }, 400);
      }
      container._feed = { io: ioT };
      if (withStart) {
        var card = wrap.querySelector('.igx-post[data-code="' + (list[index] ? list[index].code : '') + '"]');
        if (card) scroller.scrollTop = card.offsetTop;
      }
    }

    function openPost(key, index) {
      var list = listOf(key), p = list[index];
      if (!p) return;
      closeOver(true);
      var o = document.createElement('section');
      o.className = 'igx-view igx-over';
      o.innerHTML =
        barHTML(ib('over-back', 'back', 'Back', 26), '<div class="igx-ttl"><small>YE</small><b>Posts</b></div>', '<span class="igx-bar-sp"></span>', 'igx-bar-o') +
        '<div class="igx-scroll"><div class="igx-feed"></div></div>';
      viewsEl.appendChild(o);
      S.over = { el: o, key: key };
      var sc = o.querySelector('.igx-scroll');
      startFeed(o.querySelector('.igx-feed'), sc, key, index, true);
      requestAnimationFrame(function () { requestAnimationFrame(function () { o.classList.add('on'); }); });
      try { history.replaceState(history.state, '', location.pathname + '?view=insta&post=' + encodeURIComponent(p.code)); } catch (_) {}
    }
    function closeOver(instant) {
      var ov = S.over;
      if (!ov) return;
      S.over = null;
      ov.el.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (_) {} });
      var done = function () { if (ov.el.parentNode) ov.el.remove(); };
      if (instant) done(); else { ov.el.classList.remove('on'); setTimeout(done, 300); }
      try { history.replaceState(history.state, '', location.pathname + '?view=insta' + (S.tab !== 'profile' ? '&tab=' + S.tab : '')); } catch (_) {}
    }

    function sheet(title, items) {
      closeSheet();
      var bg = document.createElement('div');
      bg.className = 'igx-sbg';
      var sh = document.createElement('div');
      sh.className = 'igx-sheet';
      sh.setAttribute('role', 'dialog');
      sh.setAttribute('aria-label', title || 'Options');
      sh.innerHTML = '<i class="igx-grab"></i>' + (title ? '<div class="igx-sht">' + esc(title) + '</div>' : '') +
        items.map(function (it, i) {
          if (it.text) return '<div class="igx-shtx">' + esc(it.text) + '</div>';
          var tag = it.href ? 'a' : 'button';
          return '<' + tag + ' class="igx-shi' + (it.alt ? ' alt' : '') + '" data-s="' + i + '"' + (it.href ? ' href="' + esc(it.href) + '" target="_blank" rel="noopener nofollow"' : ' type="button"') + '>' + icon(it.icon, 22) + '<span>' + esc(it.label) + '</span></' + tag + '>';
        }).join('');
      layer.appendChild(bg); layer.appendChild(sh);
      requestAnimationFrame(function () { bg.classList.add('in'); sh.classList.add('in'); });
      bg.addEventListener('click', closeSheet);
      sh.addEventListener('click', function (e) {
        var b = e.target.closest('[data-s]'); if (!b) return;
        var it = items[+b.dataset.s];
        if (it && it.fn) it.fn();
        if (!it || !it.keep) closeSheet();
      });
    }
    function closeSheet() {
      layer.querySelectorAll('.igx-sbg, .igx-sheet').forEach(function (n) {
        n.classList.remove('in');
        setTimeout(function () { n.remove(); }, 240);
      });
    }

    function toggleTheme() {
      S.theme = S.theme === 'dark' ? 'light' : 'dark';
      app.dataset.theme = S.theme;
      lsSet(K_THEME, S.theme);
      paintCredit();
    }
    function sharePost(p) {
      var link = postLink(p.code);
      sheet('Share', [
        { icon: 'copy', label: 'Copy link', fn: function () { copy(link); } },
        { icon: 'share', label: 'Share to…', fn: function () { if (navigator.share) navigator.share({ title: 'ye on Instagram', url: link }).catch(function () {}); else copy(link); } },
      ].concat(p.link && /^https:\/\/www\.instagram\.com\/p\//.test(p.link) ? [{ icon: 'external', label: 'View on Instagram', href: p.link }] : []));
    }
    function postMenu(p) {
      var saved = S.saves.has(p.code);
      var items = [
        { icon: saved ? 'saveOn' : 'save', label: saved ? 'Unsave' : 'Save', fn: function () { toggleSave(p.code); } },
        { icon: 'copy', label: 'Copy link', fn: function () { copy(postLink(p.code)); } },
      ];
      if (p.link && /^https:\/\/www\.instagram\.com\/p\//.test(p.link)) items.push({ icon: 'external', label: 'View on Instagram', href: p.link });
      var m0 = p.media[0];
      items.push({ icon: 'download', label: 'Open original file', href: mediaUrl(m0.src) });
      items.push({ icon: 'info', label: 'About this archive', href: CREDIT_URL });
      sheet('', items);
    }
    function profileMenu() {
      sheet('', [
        { icon: 'copy', label: 'Share profile', fn: function () { copy(location.origin + '/resources?view=insta', 'Link copied'); } },
        { icon: S.theme === 'dark' ? 'sun' : 'moon', label: S.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', fn: toggleTheme },
        { icon: 'external', label: 'Open ye on Instagram', href: 'https://www.instagram.com/ye/' },
        { icon: 'info', label: 'Posts from the YE INSTAGRAM ARCHIVE', href: CREDIT_URL },
      ]);
    }

    function toggleLike(code, force) {
      var on = force === true ? true : !S.likes.has(code);
      if (on) S.likes.add(code); else S.likes.delete(code);
      persist();
      app.querySelectorAll('[data-code="' + code + '"] [data-a="like"]').forEach(function (b) {
        var big = b.closest('.igx-reel');
        b.innerHTML = icon(on ? 'heartOn' : 'heart', big ? 28 : 24, on ? 'on' : '');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function toggleSave(code) {
      var on = !S.saves.has(code);
      if (on) S.saves.add(code); else S.saves.delete(code);
      persist();
      app.querySelectorAll('.igx-post[data-code="' + code + '"] [data-a="save"]').forEach(function (b) { b.innerHTML = icon(on ? 'saveOn' : 'save', 24); });
      toast(on ? 'Saved' : 'Removed from saved');
    }
    function burst(host) {
      var b = host.querySelector('.igx-burst'); if (!b) return;
      b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    }
    function codeOf(el) { var c = el.closest('[data-code]'); return c ? c.dataset.code : null; }
    function postOf(el) { var c = codeOf(el); return c != null && S.byCode[c] != null ? S.posts[S.byCode[c]] : null; }

    var tapState = new WeakMap();
    function mediaTap(host, e) {
      var kind = host.classList.contains('igx-reel') ? 'reel' : 'feed';
      var st = tapState.get(host) || {};
      var now = e.timeStamp;
      if (st.t && now - st.t < 300) {
        clearTimeout(st.timer); st.t = 0; tapState.set(host, st);
        var code = codeOf(host);
        if (code) { toggleLike(code, true); burst(host); }
        return;
      }
      st.t = now;
      st.timer = setTimeout(function () {
        st.t = 0;
        var v = host.querySelector('video');
        if (!v) return;
        if (kind === 'reel') {
          if (v.paused) { v.play().catch(function () {}); host.classList.remove('paused'); } else { v.pause(); host.classList.add('paused'); }
        } else setMuted(!S.muted);
      }, 290);
      tapState.set(host, st);
    }

    function onClick(e) {
      var a = e.target.closest('[data-a]');
      if (!a) {
        if (e.target.closest('a')) return;
        var host = e.target.closest('.igx-media, .igx-reel');
        if (host && !e.target.closest('button')) mediaTap(host, e);
        return;
      }
      var act = a.dataset.a;
      if (act === 'tab') { showTab(a.dataset.t); return; }
      if (act === 'open') { openPost(a.dataset.l, +a.dataset.i); return; }
      if (act === 'over-back') { closeOver(false); return; }
      if (act === 'exit') { if (opts.onExit) opts.onExit(); return; }
      if (act === 'ptab') { S.ptab = a.dataset.k; paintProfileGrid(); return; }
      if (act === 'like') { var c = codeOf(a); if (c) { var on = !S.likes.has(c); toggleLike(c); if (on) { var h = a.closest('.igx-post, .igx-reel'); if (h) burst(h); } } return; }
      if (act === 'save') { var c2 = codeOf(a); if (c2) toggleSave(c2); return; }
      if (act === 'comment') {
        var p = postOf(a);
        sheet('Comments', [{ text: 'comments arent part of the archive.' }].concat(p && p.link && /^https:\/\/www\.instagram\.com\/p\//.test(p.link) ? [{ icon: 'external', label: 'Read them on Instagram', href: p.link }] : []));
        return;
      }
      if (act === 'share') { var p2 = postOf(a); if (p2) sharePost(p2); return; }
      if (act === 'more') { var p3 = postOf(a); if (p3) postMenu(p3); return; }
      if (act === 'more-p') { profileMenu(); return; }
      if (act === 'more-c') { var capt = a.closest('.igx-capt'); if (capt) { capt.classList.add('open'); a.remove(); } return; }
      if (act === 'vol') { e.stopPropagation(); setMuted(!S.muted); return; }
      if (act === 'mute') { setMuted(!S.muted); return; }
      if (act === 'follow') { a.classList.toggle('on'); a.firstChild.textContent = a.classList.contains('on') ? 'Follow' : 'Following'; return; }
      if (act === 'dm') { showTab('dm'); return; }
      if (act === 'bell') { toast('notifications are on for ye'); return; }
      if (act === 'cam') { toast('camera isnt part of the archive'); return; }
      if (act === 'retry') { S.failed = null; var v = viewsEl.querySelector('[data-v="profile"]'); if (v) renderProfile(); load().then(function () { renderProfile(); renderTabbar(); }); return; }
    }
    function onScroll(e) {
      var car = e.target;
      if (!car || !car.classList || !car.classList.contains('igx-car')) return;
      var w = car.clientWidth || 1, i = Math.round(car.scrollLeft / w);
      var post = car.closest('.igx-post'); if (!post) return;
      var cnt = post.querySelector('.igx-count'); if (cnt) cnt.textContent = (i + 1) + '/' + car.children.length;
      post.querySelectorAll('.igx-dots i').forEach(function (d, k) { d.classList.toggle('on', k === i); });
    }
    function onError(e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && t.dataset.o && t.src !== t.dataset.o) { t.src = t.dataset.o; t.dataset.o = ''; }
    }
    function onKey(e) {
      if (!S.open) return;
      if (e.key === 'Escape') { if (layer.querySelector('.igx-sheet')) closeSheet(); else if (S.over) closeOver(false); return; }
      if (S.tab === 'reels' && !S.over && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !/input|textarea/i.test((e.target && e.target.tagName) || '')) {
        var r = viewsEl.querySelector('.igx-reels');
        if (r) { e.preventDefault(); r.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * r.clientHeight, behavior: 'smooth' }); }
      }
    }
    function onVis() { if (document.hidden) pauseAll(); }

    app.addEventListener('click', onClick);
    app.addEventListener('scroll', onScroll, true);
    app.addEventListener('error', onError, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);

    function paintCredit() {
      creditEl.innerHTML = '<span>posts from the <a href="' + CREDIT_URL + '" target="_blank" rel="noopener">YE INSTAGRAM ARCHIVE</a> ❤️</span>' +
        '<button type="button" class="igx-themeb" aria-label="Switch appearance">' + icon(S.theme === 'dark' ? 'sun' : 'moon', 15) + '<span>' + (S.theme === 'dark' ? 'light mode' : 'dark mode') + '</span></button>';
      var b = creditEl.querySelector('.igx-themeb');
      if (b) b.onclick = toggleTheme;
    }

    function openApp() {
      S.open = true;
      stage.style.display = '';
      setFull(!!mq.matches);
      document.documentElement.classList.toggle('igx-lock', S.full);
      tickClock();
      if (!tickTimer) tickTimer = setInterval(tickClock, 30000);
      paintCredit();
      renderTabbar();
      if (!viewsEl.querySelector('[data-v="profile"]')) renderProfile();
      else viewsEl.querySelectorAll(':scope > .igx-view:not(.igx-over)').forEach(function (v) { v.hidden = v.dataset.v !== S.tab; });
      if (!S.data) {
        load().then(function () {
          if (S.destroyed) return;
          renderProfile(); renderTabbar();
          deepLink();
        });
      } else if (!S.deep) deepLink();
      if (!S.full) {
        var stageTop = stage.getBoundingClientRect().top;
        if (stageTop > 140) { try { stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
      }
    }
    function deepLink() {
      S.deep = true;
      var q = new URLSearchParams(location.search);
      var tab = q.get('tab'), code = q.get('post');
      if (tab && /^(home|reels|search|dm)$/.test(tab) && !code) showTab(tab);
      if (code && S.byCode[code] != null) openPost('grid', S.byCode[code]);
    }
    function closeApp() {
      S.open = false;
      pauseAll();
      closeSheet();
      document.documentElement.classList.remove('igx-lock');
      stage.style.display = 'none';
      if (stage.parentNode !== root) root.appendChild(stage);
      S.full = false; delete stage.dataset.m;
    }
    function destroy() {
      S.destroyed = true;
      closeApp();
      if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      if (vio) vio.disconnect();
      clearInterval(tickTimer); clearTimeout(stateTimer);
      stage.remove();
      if (mounted === ctl) mounted = null;
    }

    var ctl = { open: openApp, close: closeApp, destroy: destroy };
    mounted = ctl;
    return ctl;
  }

  window.igx = { mount: mount };
})();
