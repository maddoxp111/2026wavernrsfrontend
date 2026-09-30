// Share 2.0: one share sheet for edits, comps and anything else with a link.
// window.wvShare({kind, id, title, artist, cover, time, url, line})
// window.wvShareLyric({line, track:{id, title, artist|artist_name, cover|cover_url}})
// Story (1080x1920) and square (1080x1080) cards are drawn on a canvas. Covers
// go through wvImg (wsrv.nl sends CORS headers); raw R2 / archive.org covers
// would taint the canvas and make it impossible to export.
(function () {
  'use strict';
  if (window.wvShare && window.wvShare._v === 2) return;

  var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable", "Segoe UI", Inter, Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
  var KIND_LABEL = { track: 'edit', album: 'comp', playlist: 'playlist', artist: 'artist' };
  var KIND_PATH = { track: '/track?id=', album: '/album?id=', playlist: '/playlist?id=', artist: '/artist?id=' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtT(s) {
    s = Math.max(0, Math.floor(Number(s) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }
  // Accepts 83, "83", "1:23", "1:02:03", "1m23s", "90s".
  function parseTime(v) {
    if (v == null || v === '') return null;
    var s = String(v).trim().toLowerCase();
    var n;
    if (/^\d+(\.\d+)?$/.test(s)) n = parseFloat(s);
    else if (/^\d+(:\d{1,2}){1,2}$/.test(s)) n = s.split(':').reduce(function (a, p) { return a * 60 + parseInt(p, 10); }, 0);
    else {
      var m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
      if (!m || (!m[1] && !m[2] && !m[3])) return null;
      n = (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
    }
    return isFinite(n) && n >= 0 && n < 36000 ? n : null;
  }
  function siteOrigin() {
    return /^https?:$/.test(location.protocol) ? location.origin : 'https://www.wavernrs.com';
  }
  function linkFor(o, withTime) {
    var u;
    if (o.url) {
      try { u = new URL(o.url, siteOrigin()).href; } catch (_) { u = String(o.url); }
    } else {
      u = siteOrigin() + (KIND_PATH[o.kind] || KIND_PATH.track) + encodeURIComponent(o.id || '');
    }
    if (withTime && o.kind === 'track' && o.time > 0) {
      try { var x = new URL(u); x.searchParams.set('t', String(Math.floor(o.time))); u = x.href; } catch (_) {}
    }
    return u;
  }
  function prettyUrl(u) { return String(u).replace(/^https?:\/\/(www\.)?/, ''); }
  function toast(msg, kind) { if (typeof window.wvToast === 'function') window.wvToast(msg, kind); }
  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || 'copied'); return true; };
    var legacy = function () {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); ta.remove();
        if (ok) return done();
      } catch (_) {}
      toast('couldnt copy that', 'error');
      return false;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(done, legacy);
    }
    return Promise.resolve(legacy());
  }
  function isTouch() {
    try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (_) { return false; }
  }
  function normalize(o) {
    o = o || {};
    var kind = KIND_PATH[o.kind] ? o.kind : (o.url ? 'link' : 'track');
    return {
      kind: kind,
      id: o.id || '',
      title: String(o.title || 'wavernrs').trim(),
      artist: String(o.artist || o.artist_name || '').trim(),
      cover: o.cover || o.cover_url || '',
      time: Number(o.time) > 0 ? Number(o.time) : 0,
      atTime: !!o.atTime,
      url: o.url || '',
      line: String(o.line || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    };
  }

  // ── Card rendering ───────────────────────────────────────────────────────
  var _imgCache = {};
  function loadImage(src, cors) {
    if (!src) return Promise.resolve(null);
    var key = (cors ? 'c:' : 'p:') + src;
    if (_imgCache[key]) return _imgCache[key];
    _imgCache[key] = new Promise(function (resolve) {
      var img = new Image();
      var t = setTimeout(function () { resolve(null); }, 12000);
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = function () { clearTimeout(t); resolve(img); };
      img.onerror = function () { clearTimeout(t); delete _imgCache[key]; resolve(null); };
      img.src = src;
    });
    return _imgCache[key];
  }
  function coverSrc(url, px) {
    if (!url) return '';
    return typeof window.wvImg === 'function' ? window.wvImg(url, px) : url;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawCoverFit(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function supportsFilter(ctx) {
    try { ctx.filter = 'blur(2px)'; var ok = ctx.filter === 'blur(2px)'; ctx.filter = 'none'; return ok; } catch (_) { return false; }
  }
  function blurredBackground(ctx, img, W, H) {
    if (supportsFilter(ctx)) {
      ctx.save();
      ctx.filter = 'blur(' + Math.round(W / 14) + 'px) saturate(1.25)';
      drawCoverFit(ctx, img, -W * 0.15, -H * 0.15, W * 1.3, H * 1.3);
      ctx.restore();
      return;
    }
    var a = document.createElement('canvas'); a.width = 24; a.height = Math.max(8, Math.round(24 * H / W));
    drawCoverFit(a.getContext('2d'), img, 0, 0, a.width, a.height);
    var b = document.createElement('canvas'); b.width = 120; b.height = Math.round(120 * H / W);
    var bc = b.getContext('2d'); bc.imageSmoothingEnabled = true; bc.imageSmoothingQuality = 'high';
    bc.drawImage(a, 0, 0, b.width, b.height);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(b, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
    ctx.restore();
  }
  function hueOf(img, seed) {
    var fallback = function () {
      if (typeof window.coverHues === 'function') { var c = window.coverHues(seed || ''); return { h: c.h1, s: 55 }; }
      return { h: 262, s: 55 };
    };
    if (!img) return fallback();
    try {
      var c = document.createElement('canvas'); c.width = c.height = 24;
      var x = c.getContext('2d'); drawCoverFit(x, img, 0, 0, 24, 24);
      var d = x.getImageData(0, 0, 24, 24).data;
      var best = null, sx = 0, sy = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
        if (ch < 0.12 || mx < 0.12) continue;
        var h = mx === r ? 60 * (((g - b) / ch + 6) % 6) : mx === g ? 60 * ((b - r) / ch + 2) : 60 * ((r - g) / ch + 4);
        var w = ch * ch;
        sx += Math.cos(h * Math.PI / 180) * w; sy += Math.sin(h * Math.PI / 180) * w; n += w;
        if (!best || ch > best.ch) best = { h: h, ch: ch };
      }
      if (n < 0.5) return { h: best ? best.h : fallback().h, s: best ? 30 : 12 };
      return { h: Math.round((Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360), s: 52 };
    } catch (_) { return fallback(); }
  }
  function fitLines(ctx, text, maxW, weight, maxSize, minSize, maxLines) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    for (var size = maxSize; size >= minSize; size -= 2) {
      ctx.font = weight + ' ' + size + 'px ' + FONT;
      var lines = wrap(ctx, words, maxW);
      if (lines.length <= maxLines && lines.every(function (l) { return ctx.measureText(l).width <= maxW; })) return { size: size, lines: lines };
    }
    ctx.font = weight + ' ' + minSize + 'px ' + FONT;
    var out = wrap(ctx, words, maxW);
    if (out.length > maxLines) {
      out = out.slice(0, maxLines);
      var last = out[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      out[maxLines - 1] = last.replace(/\s+$/, '') + '…';
    }
    out = out.map(function (l) {
      if (ctx.measureText(l).width <= maxW) return l;
      while (l.length > 1 && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1);
      return l + '…';
    });
    return { size: minSize, lines: out };
  }
  function wrap(ctx, words, maxW) {
    var lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function drawWordmark(ctx, logo, cx, y, size, align) {
    ctx.font = '800 ' + Math.round(size * 0.72) + 'px ' + FONT;
    var tw = ctx.measureText('wavernrs').width;
    var gap = Math.round(size * 0.28);
    var total = (logo ? size + gap : 0) + tw;
    var x = align === 'left' ? cx : cx - total / 2;
    if (logo) {
      ctx.save(); rr(ctx, x, y, size, size, size * 0.26); ctx.clip();
      ctx.drawImage(logo, x, y, size, size); ctx.restore();
      x += size + gap;
    }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('wavernrs', x, y + size / 2 + 1);
  }
  function drawPill(ctx, cx, y, text, h) {
    ctx.font = '700 ' + Math.round(h * 0.4) + 'px ' + FONT;
    var tri = h * 0.32, gap = h * 0.22, pad = h * 0.52;
    var tw = ctx.measureText(text).width;
    var w = pad * 2 + tri + gap + tw;
    var x = cx - w / 2;
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.stroke();
    var tx = x + pad, ty = y + h / 2;
    ctx.beginPath(); ctx.moveTo(tx, ty - tri / 2); ctx.lineTo(tx + tri * 0.9, ty); ctx.lineTo(tx, ty + tri / 2); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + tri + gap, ty + 1);
  }
  function drawCoverBox(ctx, img, x, y, s, r, seed, shadow) {
    ctx.save();
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.05; }
    rr(ctx, x, y, s, s, r); ctx.fillStyle = '#1c1c22'; ctx.fill();
    ctx.restore();
    ctx.save(); rr(ctx, x, y, s, s, r); ctx.clip();
    if (img) drawCoverFit(ctx, img, x, y, s, s);
    else {
      var hs = typeof window.coverHues === 'function' ? window.coverHues(seed || '') : { h1: 262, s1: 60, l1: 45, h2: 300, s2: 55, l2: 28 };
      var g = ctx.createLinearGradient(x, y, x + s, y + s);
      g.addColorStop(0, 'hsl(' + hs.h1 + ',' + hs.s1 + '%,' + hs.l1 + '%)');
      g.addColorStop(1, 'hsl(' + hs.h2 + ',' + hs.s2 + '%,' + hs.l2 + '%)');
      ctx.fillStyle = g; ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
    ctx.save(); rr(ctx, x + 1, y + 1, s - 2, s - 2, r); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.stroke(); ctx.restore();
  }
  function paintBackdrop(ctx, img, W, H, seed, hue, lyric) {
    if (img) blurredBackground(ctx, img, W, H);
    else {
      var hs = typeof window.coverHues === 'function' ? window.coverHues(seed || '') : { h1: 262, s1: 60, l1: 40, h2: 300, s2: 55, l2: 22 };
      var g0 = ctx.createLinearGradient(0, 0, W, H);
      g0.addColorStop(0, 'hsl(' + hs.h1 + ',' + hs.s1 + '%,' + hs.l1 + '%)');
      g0.addColorStop(1, 'hsl(' + hs.h2 + ',' + hs.s2 + '%,' + Math.max(12, hs.l2 - 6) + '%)');
      ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    }
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,' + (lyric ? 0.45 : 0.18) + ')');
    g.addColorStop(0.55, 'rgba(0,0,0,' + (lyric ? 0.5 : 0.34) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var v = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.2, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'hsla(' + hue.h + ',' + hue.s + '%,50%,0.10)');
    v.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function renderCard(o, fmt) {
    var W = 1080, H = fmt === 'square' ? 1080 : 1920;
    return Promise.all([
      loadImage(coverSrc(o.cover, 960), true),
      loadImage('/logo@2x.png', false),
    ]).then(function (res) {
      var img = res[0], logo = res[1];
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');
      var hue = hueOf(img, o.title);
      var lyric = !!o.line;
      paintBackdrop(ctx, img, W, H, o.title, hue, lyric);
      var kindLabel = (KIND_LABEL[o.kind] || 'link').toUpperCase();
      if (!lyric) {
        var story = fmt !== 'square';
        var cs = story ? 800 : 540, cy = story ? 330 : 118;
        if (!story && fitLines(ctx, o.title, W - 140, '800', 64, 40, 2).lines.length > 1) { cs = 480; cy = 104; }
        if (story) drawWordmark(ctx, logo, W / 2, 150, 76);
        drawCoverBox(ctx, img, (W - cs) / 2, cy, cs, story ? 36 : 28, o.title, true);
        var ks = story ? 30 : 24;
        var kb = cy + cs + (story ? 96 : 56) + ks;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + ks + 'px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
        ctx.fillText(kindLabel, W / 2 + 3, kb);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        var t = fitLines(ctx, o.title, W - (story ? 160 : 140), '800', story ? 92 : 64, story ? 56 : 40, 2);
        var ty = kb + (story ? 26 : 20) + Math.round(t.size * 0.8);
        ctx.font = '800 ' + t.size + 'px ' + FONT; ctx.fillStyle = '#ffffff';
        t.lines.forEach(function (l, i) { ctx.fillText(l, W / 2, ty + i * t.size * 1.1); });
        var ay = ty + (t.lines.length - 1) * t.size * 1.1 + (story ? 72 : 52);
        if (o.artist) {
          var a = fitLines(ctx, o.artist, W - 200, '500', story ? 46 : 34, 28, 1);
          ctx.font = '500 ' + a.size + 'px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.78)';
          ctx.fillText(a.lines[0], W / 2, ay);
        }
        if (story) drawPill(ctx, W / 2, H - 250, 'listen on wavernrs.com', 104);
        else {
          drawWordmark(ctx, logo, 64, H - 108, 52, 'left');
          ctx.font = '600 28px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText('wavernrs.com', W - 64, H - 82);
        }
      } else {
        var sq = fmt === 'square';
        var pad = sq ? 0 : 72;
        var cardX = pad, cardW = W - pad * 2;
        var inner = sq ? 88 : 72;
        var head = sq ? 120 : 132;
        ctx.font = '800 10px ' + FONT;
        var lyr = fitLines(ctx, o.line, cardW - inner * 2, '800', sq ? 76 : 84, sq ? 40 : 46, sq ? 6 : 9);
        var lh = lyr.size * 1.2;
        var lyrH = lyr.lines.length * lh;
        var cardH = sq ? H : Math.min(H - 360, inner + head + 64 + lyrH + 72 + 64 + inner);
        var cardY = sq ? 0 : Math.round((H - cardH) / 2);
        ctx.save();
        if (!sq) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30; }
        rr(ctx, cardX, cardY, cardW, cardH, sq ? 0 : 48);
        var cg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        cg.addColorStop(0, 'hsl(' + hue.h + ',' + Math.min(62, hue.s + 8) + '%,34%)');
        cg.addColorStop(1, 'hsl(' + ((hue.h + 24) % 360) + ',' + hue.s + '%,20%)');
        ctx.fillStyle = cg; ctx.fill();
        ctx.restore();
        var hx = cardX + inner, hy = cardY + inner;
        drawCoverBox(ctx, img, hx, hy, head, 18, o.title, false);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        var tt = fitLines(ctx, o.title, cardW - inner * 2 - head - 32, '800', 42, 30, 1);
        ctx.font = '800 ' + tt.size + 'px ' + FONT; ctx.fillStyle = '#ffffff';
        ctx.fillText(tt.lines[0], hx + head + 32, hy + head / 2 - 6);
        if (o.artist) {
          var at = fitLines(ctx, o.artist, cardW - inner * 2 - head - 32, '500', 34, 24, 1);
          ctx.font = '500 ' + at.size + 'px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.fillText(at.lines[0], hx + head + 32, hy + head / 2 + at.size + 4);
        }
        var ly = hy + head + (sq ? 0 : 64);
        if (sq) ly = Math.round(hy + head + (H - inner - 60 - (hy + head) - lyrH) / 2);
        ctx.font = '800 ' + lyr.size + 'px ' + FONT; ctx.fillStyle = '#ffffff';
        lyr.lines.forEach(function (l, i) { ctx.fillText(l, hx, ly + lyr.size + i * lh); });
        drawWordmark(ctx, logo, hx, cardY + cardH - inner - 56, 56, 'left');
        if (!sq) {
          ctx.font = '600 34px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('wavernrs.com', W / 2, H - 120);
        } else {
          ctx.font = '600 26px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText('wavernrs.com', cardX + cardW - inner, cardY + cardH - inner - 28);
        }
      }
      return canvas;
    });
  }
  function canvasBlob(canvas) {
    return new Promise(function (resolve) {
      try { canvas.toBlob(function (b) { resolve(b); }, 'image/png'); } catch (_) { resolve(null); }
    });
  }
  function fileName(o, fmt) {
    var base = String(o.title || 'wavernrs').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'wavernrs';
    return base + (o.line ? '-lyric' : '') + '-' + (fmt === 'square' ? 'square' : 'story') + '.png';
  }

  // ── Sheet ────────────────────────────────────────────────────────────────
  var CSS = [
    '.wvs-ov{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s ease;}',
    '.wvs-ov.in{opacity:1;}',
    '.wvs{position:fixed;z-index:9501;left:50%;top:50%;width:min(720px,calc(100vw - 32px));max-height:min(640px,calc(100dvh - 48px));display:flex;flex-direction:column;',
    'background:var(--elevated,var(--surface-2));color:var(--text);border:1px solid var(--hair-strong);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.2);',
    'transform:translate(-50%,-48%) scale(.98);opacity:0;transition:transform .26s cubic-bezier(.16,1,.3,1),opacity .2s ease;overflow:hidden;font-family:inherit;}',
    '.wvs.in{transform:translate(-50%,-50%) scale(1);opacity:1;}',
    '.wvs-grab{display:none;}',
    '.wvs-head{display:flex;align-items:center;gap:14px;padding:18px 18px 14px 20px;border-bottom:1px solid var(--hair);}',
    '.wvs-hcover{width:48px;height:48px;border-radius:8px;flex-shrink:0;object-fit:cover;background:var(--surface-3);}',
    '.wvs-htext{flex:1;min-width:0;}',
    '.wvs-kicker{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}',
    '.wvs-title{font-size:17px;font-weight:800;letter-spacing:-.01em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
    '.wvs-sub{font-size:13px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.wvs-x{width:40px;height:40px;border-radius:50%;border:0;background:var(--glass-pill-bg,var(--surface-3));color:var(--text);display:grid;place-items:center;cursor:pointer;flex-shrink:0;}',
    '.wvs-x:hover{background:var(--glass-pill-bg-hover,var(--surface-hover));}',
    '.wvs-body{display:grid;grid-template-columns:232px 1fr;gap:22px;padding:20px;overflow:auto;overscroll-behavior:contain;}',
    '.wvs-pcol{display:flex;flex-direction:column;gap:10px;align-items:center;}',
    '.wvs-prev{position:relative;width:216px;aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:var(--surface-3);box-shadow:0 12px 32px rgba(0,0,0,.35);transition:aspect-ratio .2s ease;}',
    '.wvs-prev[data-fmt="square"]{aspect-ratio:1/1;}',
    '.wvs-prev canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.wvs-prev .wvs-shim{position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,var(--hair) 50%,transparent 70%) var(--surface-3);background-size:250% 100%;animation:wvs-shim 1.2s linear infinite;}',
    '@keyframes wvs-shim{from{background-position:120% 0}to{background-position:-120% 0}}',
    '.wvs-seg{display:inline-flex;padding:3px;border-radius:999px;background:var(--glass-pill-bg,var(--surface-3));gap:2px;}',
    '.wvs-seg button{border:0;background:transparent;color:var(--text-2);font:inherit;font-size:12.5px;font-weight:700;padding:7px 14px;border-radius:999px;cursor:pointer;min-height:32px;}',
    '.wvs-seg button[aria-pressed="true"]{background:var(--surface,var(--page-bg));color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.18);}',
    '.wvs-save{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:216px;min-height:42px;border-radius:999px;border:0;background:var(--brand);color:var(--on-brand,#fff);font:inherit;font-size:14px;font-weight:800;cursor:pointer;}',
    '.wvs-save:disabled{opacity:.55;cursor:default;}',
    '.wvs-save:not(:disabled):hover{filter:brightness(1.06);}',
    '.wvs-main{display:flex;flex-direction:column;gap:16px;min-width:0;}',
    '.wvs-lbl{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;}',
    '.wvs-link{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:12px;background:var(--surface,var(--page-bg));border:1px solid var(--hair-strong);}',
    '.wvs-url{flex:1;min-width:0;font-size:13.5px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}',
    '.wvs-copy{border:0;border-radius:9px;background:var(--brand);color:var(--on-brand,#fff);font:inherit;font-size:13px;font-weight:800;padding:0 16px;min-height:36px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;}',
    '.wvs-copy.ok{background:var(--green,#4ade80);color:#06210f;}',
    '.wvs-ts{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--text-2);cursor:pointer;user-select:none;min-height:32px;margin-top:8px;}',
    '.wvs-ts input{appearance:none;-webkit-appearance:none;width:36px;height:22px;border-radius:999px;background:var(--surface-3);border:1px solid var(--hair-strong);position:relative;cursor:pointer;margin:0;transition:background .15s ease;flex-shrink:0;}',
    '.wvs-ts input::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--text-2);transition:transform .18s cubic-bezier(.16,1,.3,1),background .15s ease;}',
    '.wvs-ts input:checked{background:var(--brand);border-color:transparent;}',
    '.wvs-ts input:checked::after{transform:translateX(14px);background:var(--on-brand,#fff);}',
    '.wvs-ts b{color:var(--text);font-variant-numeric:tabular-nums;}',
    '.wvs-tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;}',
    '.wvs-t{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px 10px;border-radius:14px;border:1px solid transparent;background:transparent;color:var(--text);font:inherit;font-size:12px;font-weight:600;cursor:pointer;text-align:center;line-height:1.2;min-height:40px;}',
    '.wvs-t:hover{background:var(--surface-hover,var(--hair));}',
    '.wvs-ic{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--glass-pill-bg,var(--surface-3));color:var(--text);transition:transform .15s ease;}',
    '.wvs-t:active .wvs-ic{transform:scale(.94);}',
    '.wvs-ic svg{width:22px;height:22px;}',
    '.wvs-ic.x{background:#000;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);}',
    '.wvs-ic.rd{background:#ff4500;color:#fff;}',
    '.wvs-ic.dc{background:#5865f2;color:#fff;}',
    '.wvs-lyric{position:relative;padding:12px 44px 12px 14px;border-radius:12px;background:var(--brand-bg);color:var(--text);font-size:14px;font-weight:700;line-height:1.4;border-left:3px solid var(--brand);}',
    '.wvs-lyric button{position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:50%;border:0;background:transparent;color:var(--text-2);cursor:pointer;display:grid;place-items:center;}',
    '.wvs-lyric button:hover{background:var(--hair);color:var(--text);}',
    '.wvs-hint{font-size:12px;color:var(--text-3);text-align:center;max-width:216px;line-height:1.4;}',
    '.wvs :focus-visible{outline:2px solid var(--brand);outline-offset:2px;}',
    '@media (max-width:640px){',
    '.wvs{left:0;right:0;top:auto;bottom:0;width:100%;max-height:calc(100dvh - 40px);border-radius:22px 22px 0 0;border-bottom:0;transform:translateY(100%);padding-bottom:env(safe-area-inset-bottom);}',
    '.wvs.in{transform:translateY(0);}',
    '.wvs-grab{display:block;width:38px;height:5px;border-radius:3px;background:var(--hair-strong);margin:8px auto 0;flex-shrink:0;}',
    '.wvs-head{padding:10px 14px 12px 16px;}',
    '.wvs-body{grid-template-columns:1fr;gap:18px;padding:16px;}',
    '.wvs-pcol{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto 1fr;column-gap:16px;row-gap:10px;align-items:start;justify-items:start;}',
    '.wvs-prev{width:132px;grid-row:1 / span 3;}',
    '.wvs-save{width:100%;}',
    '.wvs-hint{text-align:left;max-width:none;}',
    '.wvs-tg{display:flex;overflow-x:auto;gap:4px;margin:0 -16px;padding:0 12px;scrollbar-width:none;}',
    '.wvs-tg::-webkit-scrollbar{display:none;}',
    '.wvs-t{flex:0 0 76px;padding:8px 2px;}',
    '.wvs-send{order:-1;}',
    '}',
    '@media (prefers-reduced-motion:reduce){.wvs,.wvs-ov,.wvs-ts input::after,.wvs-prev{transition:none!important;}.wvs-prev .wvs-shim{animation:none;}}',
  ].join('\n');
  function injectCss() {
    if (document.getElementById('wv-share-css')) return;
    var st = document.createElement('style');
    st.id = 'wv-share-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var ICON = {
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
    native: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="14.2" rx="7.6" ry="5.4"/><circle cx="18.6" cy="10.4" r="1.9"/><circle cx="5.4" cy="10.4" r="1.9"/><circle cx="17.4" cy="4.6" r="1.6"/><path d="M12.4 8.8l1.3-5.2 3.8.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.2" cy="13.4" r="1.25" fill="#ff4500"/><circle cx="14.8" cy="13.4" r="1.25" fill="#ff4500"/><path d="M9.3 16.4c1.6 1.1 3.8 1.1 5.4 0" fill="none" stroke="#ff4500" stroke-width="1.1" stroke-linecap="round"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>',
    image: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M5 20h14"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  var _open = null;

  function close() {
    var s = _open; if (!s) return;
    _open = null;
    document.removeEventListener('keydown', s.onKey, true);
    s.sheet.classList.remove('in'); s.ov.classList.remove('in');
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    setTimeout(function () { s.sheet.remove(); s.ov.remove(); }, reduce ? 0 : 240);
    if (s.opener && s.opener.focus && document.body.contains(s.opener)) { try { s.opener.focus({ preventScroll: true }); } catch (_) {} }
  }

  function open(raw) {
    var o = normalize(raw);
    if (_open) close();
    injectCss();
    var st = { o: o, fmt: 'story', withTime: o.atTime && o.time > 0, canvas: null, blob: null, gen: 0, opener: document.activeElement };
    var link = function () { return linkFor(o, st.withTime); };
    var shareText = function () { return o.title + (o.artist ? ' by ' + o.artist : ''); };
    var canNative = typeof navigator.share === 'function';
    var canFiles = false;
    try { canFiles = !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] })); } catch (_) {}
    var shareFiles = canFiles && isTouch();
    var kindLabel = KIND_LABEL[o.kind] || 'link';
    var hasCard = o.kind !== 'link' || !!o.title;

    var ov = document.createElement('div');
    ov.className = 'wvs-ov';
    var sheet = document.createElement('div');
    sheet.className = 'wvs';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'wvs-title');
    var coverThumb = o.cover ? coverSrc(o.cover, 96) : '';
    var tiles = [
      { k: 'copy', ic: ICON.link, cls: '', l: 'Copy link' },
      canNative ? { k: 'native', ic: ICON.native, cls: '', l: 'Share…' } : null,
      { k: 'x', ic: ICON.x, cls: 'x', l: 'Post to X' },
      { k: 'reddit', ic: ICON.reddit, cls: 'rd', l: 'Reddit' },
      { k: 'discord', ic: ICON.discord, cls: 'dc', l: 'Copy for Discord' },
    ].filter(Boolean);
    sheet.innerHTML =
      '<div class="wvs-grab" aria-hidden="true"></div>' +
      '<div class="wvs-head">' +
        (coverThumb ? '<img class="wvs-hcover" src="' + esc(coverThumb) + '" alt="" onerror="this.style.visibility=\'hidden\'">' : '<div class="wvs-hcover" style="background:' + esc(typeof window.coverGradient === 'function' ? window.coverGradient(o.title) : 'var(--surface-3)') + '"></div>') +
        '<div class="wvs-htext"><div class="wvs-kicker">' + esc(o.line ? 'share a lyric' : 'share ' + kindLabel) + '</div>' +
        '<div class="wvs-title" id="wvs-title">' + esc(o.title) + '</div>' +
        (o.artist ? '<div class="wvs-sub">' + esc(o.artist) + '</div>' : '') + '</div>' +
        '<button type="button" class="wvs-x" data-a="close" aria-label="Close">' + ICON.close + '</button>' +
      '</div>' +
      '<div class="wvs-body">' +
        (hasCard ?
        '<div class="wvs-pcol">' +
          '<div class="wvs-prev" data-fmt="story" aria-label="card preview" role="img"><div class="wvs-shim"></div></div>' +
          '<div class="wvs-seg" role="group" aria-label="card size">' +
            '<button type="button" data-fmt="story" aria-pressed="true">Story</button>' +
            '<button type="button" data-fmt="square" aria-pressed="false">Square</button>' +
          '</div>' +
          '<button type="button" class="wvs-save" data-a="card" disabled>' + ICON.image + '<span>' + (shareFiles ? 'Share image' : 'Save image') + '</span></button>' +
          '<div class="wvs-hint">' + (o.line ? 'a lyric card, sized for stories' : 'made for instagram stories and your camera roll') + '</div>' +
        '</div>' : '') +
        '<div class="wvs-main">' +
          (o.line ? '<div><div class="wvs-lbl">Lyric</div><div class="wvs-lyric"><span data-lyric>' + esc('“' + o.line + '”') + '</span><button type="button" data-a="nolyric" aria-label="Take the lyric off the card">' + ICON.close + '</button></div></div>' : '') +
          '<div><div class="wvs-lbl">Link</div>' +
            '<div class="wvs-link"><span class="wvs-url" data-url></span><button type="button" class="wvs-copy" data-a="copy">Copy</button></div>' +
            (o.kind === 'track' && o.time > 0 ? '<label class="wvs-ts"><input type="checkbox" data-a="ts"' + (st.withTime ? ' checked' : '') + '><span>start at <b>' + esc(fmtT(o.time)) + '</b></span></label>' : '') +
          '</div>' +
          '<div class="wvs-send"><div class="wvs-lbl">Send to</div><div class="wvs-tg">' +
            tiles.map(function (t) { return '<button type="button" class="wvs-t" data-a="' + t.k + '"><span class="wvs-ic ' + t.cls + '" aria-hidden="true">' + t.ic + '</span><span>' + esc(t.l) + '</span></button>'; }).join('') +
          '</div></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.appendChild(sheet);
    st.sheet = sheet; st.ov = ov;

    var urlEl = sheet.querySelector('[data-url]');
    var paintUrl = function () { urlEl.textContent = prettyUrl(link()); urlEl.title = link(); };
    paintUrl();

    var prev = sheet.querySelector('.wvs-prev');
    var saveBtn = sheet.querySelector('.wvs-save');
    var paint = function () {
      if (!prev) return;
      var gen = ++st.gen;
      st.canvas = null; st.blob = null;
      if (saveBtn) saveBtn.disabled = true;
      prev.setAttribute('data-fmt', st.fmt);
      if (!prev.querySelector('.wvs-shim')) prev.insertAdjacentHTML('afterbegin', '<div class="wvs-shim"></div>');
      renderCard(o, st.fmt).then(function (canvas) {
        if (gen !== st.gen || _open !== st) return;
        st.canvas = canvas;
        var old = prev.querySelector('canvas'); if (old) old.remove();
        var shim = prev.querySelector('.wvs-shim'); if (shim) shim.remove();
        prev.appendChild(canvas);
        if (saveBtn) saveBtn.disabled = false;
        canvasBlob(canvas).then(function (b) { if (gen === st.gen) st.blob = b; });
      }).catch(function () {
        if (gen !== st.gen) return;
        var shim = prev.querySelector('.wvs-shim'); if (shim) shim.remove();
        if (saveBtn) { saveBtn.disabled = true; saveBtn.querySelector('span').textContent = 'cant make a card'; }
      });
    };

    var flash = function (btn) {
      if (!btn || !btn.classList.contains('wvs-copy')) return;
      btn.classList.add('ok'); btn.innerHTML = ICON.check + 'Copied';
      setTimeout(function () { if (document.body.contains(btn)) { btn.classList.remove('ok'); btn.textContent = 'Copy'; } }, 1600);
    };
    var popup = function (u) {
      var w = window.open(u, '_blank', 'noopener,noreferrer,width=620,height=640');
      if (!w) location.assign(u);
    };
    var saveCard = function () {
      if (!st.canvas) return;
      var name = fileName(o, st.fmt);
      var finish = function (blob) {
        if (!blob) { toast('couldnt make the image', 'error'); return; }
        if (shareFiles) {
          var file = new File([blob], name, { type: 'image/png' });
          navigator.share({ files: [file], title: o.title }).catch(function (e) {
            if (e && e.name === 'AbortError') return;
            download(blob, name);
          });
          return;
        }
        download(blob, name);
      };
      if (st.blob) finish(st.blob); else canvasBlob(st.canvas).then(finish);
    };

    sheet.addEventListener('click', function (e) {
      var fb = e.target.closest('[data-fmt]');
      if (fb && fb.tagName === 'BUTTON') {
        if (st.fmt === fb.getAttribute('data-fmt')) return;
        st.fmt = fb.getAttribute('data-fmt');
        sheet.querySelectorAll('.wvs-seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === fb)); });
        paint();
        return;
      }
      var a = e.target.closest('[data-a]');
      if (!a) return;
      var act = a.getAttribute('data-a');
      if (act === 'close') return close();
      if (act === 'ts') { st.withTime = a.checked; paintUrl(); return; }
      if (act === 'copy') {
        var cb = a.classList.contains('wvs-copy') ? a : sheet.querySelector('.wvs-copy');
        copyText(link(), st.withTime ? 'link copied · starts at ' + fmtT(o.time) : 'link copied');
        flash(cb);
        return;
      }
      if (act === 'native') {
        navigator.share({ title: o.title, text: shareText(), url: link() }).catch(function () {});
        return;
      }
      if (act === 'x') return popup('https://x.com/intent/tweet?text=' + encodeURIComponent(shareText()) + '&url=' + encodeURIComponent(link()));
      if (act === 'reddit') return popup('https://www.reddit.com/submit?url=' + encodeURIComponent(link()) + '&title=' + encodeURIComponent(shareText()));
      if (act === 'discord') {
        var mdEsc = function (s) { return String(s).replace(/([*_~`|\\<>\[\]])/g, '\\$1').replace(/^([#>-])/, '\\$1'); };
        var md = '**' + mdEsc(o.title) + '**' + (o.artist ? ' by ' + mdEsc(o.artist) : '') +
          (o.line ? '\n> ' + mdEsc(o.line) : '') + '\n' + link();
        copyText(md, 'copied...paste it in discord');
        return;
      }
      if (act === 'nolyric') {
        o.line = '';
        var wrapEl = a.closest('.wvs-lyric'); if (wrapEl && wrapEl.parentNode) wrapEl.parentNode.remove();
        var k = sheet.querySelector('.wvs-kicker'); if (k) k.textContent = 'share ' + kindLabel;
        paint();
        return;
      }
      if (act === 'card') return saveCard();
    });
    ov.addEventListener('click', close);

    var grab = sheet.querySelector('.wvs-grab');
    var head = sheet.querySelector('.wvs-head');
    var y0 = null, dy = 0;
    var tStart = function (e) { if (window.innerWidth > 640) return; y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; };
    var tMove = function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = 'translateY(' + dy + 'px)'; };
    var tEnd = function () { if (y0 == null) return; y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; if (dy > 90) close(); };
    [grab, head].forEach(function (el) {
      if (!el) return;
      el.addEventListener('touchstart', tStart, { passive: true });
      el.addEventListener('touchmove', tMove, { passive: true });
      el.addEventListener('touchend', tEnd);
    });

    st.onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(sheet.querySelectorAll('button:not([disabled]),input,a[href]'), function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', st.onKey, true);
    _open = st;
    if (!Array.isArray(window._pageCleanup)) window._pageCleanup = [];
    window._pageCleanup.push(function () { if (_open === st) close(); });

    requestAnimationFrame(function () {
      ov.classList.add('in'); sheet.classList.add('in');
      var first = sheet.querySelector('.wvs-copy');
      if (first && !isTouch()) { try { first.focus({ preventScroll: true }); } catch (_) {} }
    });
    if (hasCard) setTimeout(paint, 30);
    return st;
  }

  function download(blob, name) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    toast('image saved');
  }

  window.wvShare = function (opts) { try { open(opts); } catch (e) { console.error('share sheet', e); copyText(linkFor(normalize(opts), false), 'link copied'); } };
  window.wvShareLyric = function (opts) {
    opts = opts || {};
    var t = opts.track || {};
    window.wvShare({
      kind: 'track',
      id: t.id,
      title: t.title,
      artist: t.artist || t.artist_name || '',
      cover: t.cover || t.cover_url || '',
      time: opts.time || 0,
      line: opts.line,
    });
  };
  window.wvShare._v = 2;
  window.wvShare.close = close;
  window.wvShare.link = function (opts, withTime) { return linkFor(normalize(opts), withTime); };
  window.wvShare.copy = copyText;
  window.wvShare.parseTime = parseTime;
  window.wvShare.fmtTime = fmtT;
  window.wvShare.card = function (opts, fmt) { return renderCard(normalize(opts), fmt === 'square' ? 'square' : 'story').then(canvasBlob); };
})();
