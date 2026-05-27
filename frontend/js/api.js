// Change this to your Railway backend URL when deployed
const API_BASE = 'https://2026wavernrs-production.up.railway.app/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}
function isLoggedIn() { return !!getToken(); }

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function apiUpload(path, formData, method = 'POST') {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

// Smart nav search: search in-place if already on search page, else navigate
function navSearch(q) {
  if (!q || q.length < 2) return;
  // Check both that doSearch exists AND that we're actually on the search page
  // (doSearch stays defined globally after SPA navigation away from search.html)
  if (typeof doSearch === 'function' && location.pathname.endsWith('/search.html')) {
    // Already on the search page — update URL and run search in-place
    const u = new URL(location.href);
    u.searchParams.set('q', q);
    history.pushState(null, '', u);
    const el = document.getElementById('search-q');
    if (el) el.value = q;
    doSearch(q);
  } else {
    navigate('/search.html?q=' + encodeURIComponent(q));
  }
}

// Update nav based on auth state
function updateNav() {
  const user = getUser();
  const navRight = document.getElementById('nav-right');
  if (!navRight) return;

  if (user) {
    navRight.innerHTML = `
      <a href="/dashboard.html" class="btn btn-ghost btn-sm">Dashboard</a>
      <button onclick="logout()" class="btn btn-secondary btn-sm">Log out</button>
    `;
  } else {
    navRight.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Log in</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Sign up</a>
    `;
  }
}

// ── Cover image auto-retry for IA CDN propagation delay ──────────────────────
// Internet Archive's CDN takes 1-3 min to make newly uploaded images available.
// Cover <img> tags should use onerror="this.style.opacity=0" so they stay in
// the DOM for this retry logic to work.
// Call wireIACoverRetry(imgEl) after injecting covers to wire up auto-reload.
function wireIACoverRetry(imgEl) {
  if (!imgEl || imgEl.dataset.iaRetry) return;
  imgEl.dataset.iaRetry = '0';

  function _showProcessing() {
    var parent = imgEl.parentElement;
    if (!parent || parent.querySelector('.ia-processing-label')) return;
    var lbl = document.createElement('div');
    lbl.className = 'ia-processing-label';
    lbl.style.cssText = [
      'position:absolute', 'inset:0', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'gap:6px',
      'background:rgba(0,0,0,0.38)', 'backdrop-filter:blur(2px)',
      '-webkit-backdrop-filter:blur(2px)', 'z-index:3', 'pointer-events:none',
      'border-radius:inherit',
    ].join(';');
    lbl.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="1.8" style="animation:ia-spin 1.4s linear infinite">' +
        '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>' +
      '</svg>' +
      '<span style="font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.82);text-align:center;line-height:1.2;padding:0 6px;">Image<br>Processing</span>';
    parent.appendChild(lbl);
    // Inject the spin keyframes once
    if (!document.getElementById('ia-spin-style')) {
      var s = document.createElement('style');
      s.id = 'ia-spin-style';
      s.textContent = '@keyframes ia-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
  }

  function _hideProcessing() {
    var parent = imgEl.parentElement;
    if (!parent) return;
    var lbl = parent.querySelector('.ia-processing-label');
    if (lbl) lbl.remove();
  }

  imgEl.addEventListener('error', function() {
    var attempts = +(imgEl.dataset.iaRetry || 0);
    if (attempts >= 10) return; // give up after 5 min
    imgEl.dataset.iaRetry = String(attempts + 1);
    _showProcessing();
    setTimeout(function() {
      if (!document.contains(imgEl)) return;
      imgEl.onload = function() {
        imgEl.style.opacity = '1';
        _hideProcessing();
      };
      imgEl.src = imgEl.src.split('?')[0] + '?r=' + (attempts + 1);
    }, 30000); // retry every 30 s
  });

  // If the image is already broken on wire-up (e.g. loaded before script ran)
  if (imgEl.complete && imgEl.naturalWidth === 0 && imgEl.src) {
    imgEl.dispatchEvent(new Event('error'));
  }
}

// ── Cover gradient art (seeded by title string) ──────────────────────
function coverHues(seed) {
  let h = 0;
  const s = seed || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 40 + (Math.abs(h >> 4) % 80)) % 360;
  return {
    h1: hue1, s1: 55 + (Math.abs(h >> 7) % 25), l1: 38 + (Math.abs(h >> 13) % 12),
    h2: hue2, s2: 50 + (Math.abs(h >> 11) % 30), l2: 22 + (Math.abs(h >> 17) % 14),
  };
}
function coverGradient(seed) {
  const c = coverHues(seed || '');
  return `linear-gradient(135deg, hsl(${c.h1},${c.s1}%,${c.l1}%) 0%, hsl(${c.h2},${c.s2}%,${c.l2}%) 100%)`;
}

// ── Extract dominant hues from an actual cover image via canvas ────────────
// Falls back to coverHues(seed) on CORS failure or missing URL.
// callback({ h1, s1, l1, h2, s2, l2 })
function extractCoverHues(coverUrl, seed, callback) {
  if (!coverUrl) { callback(coverHues(seed)); return; }

  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    try {
      var SIZE = 48;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      var data = ctx.getImageData(0, 0, SIZE, SIZE).data;

      var colorful = [];
      for (var i = 0; i < data.length; i += 4) {
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var lum = (max + min) / 2;
        if (lum < 20 || lum > 235) continue; // skip very dark / very light
        var chroma = max - min;
        if (chroma < 28) continue; // skip greys
        var h;
        if (max === r)      h = 60 * (((g - b) / chroma + 6) % 6);
        else if (max === g) h = 60 * ((b - r) / chroma + 2);
        else                h = 60 * ((r - g) / chroma + 4);
        colorful.push({ h: Math.round(h), sat: chroma / max });
      }

      if (colorful.length < 5) { callback(coverHues(seed)); return; }

      colorful.sort(function(a, b) { return b.sat - a.sat; });
      var top = colorful.slice(0, Math.max(6, Math.floor(colorful.length * 0.3)));

      var h1 = _circularMeanHue(top.slice(0, Math.ceil(top.length / 2)).map(function(c) { return c.h; }));

      // h2: look for a meaningfully different hue; otherwise offset h1 by 80
      var distant = top.filter(function(c) {
        var d = Math.abs(c.h - h1);
        return Math.min(d, 360 - d) > 40;
      });
      var h2 = distant.length >= 3
        ? _circularMeanHue(distant.slice(0, Math.ceil(distant.length / 2)).map(function(c) { return c.h; }))
        : (h1 + 80) % 360;

      callback({ h1: h1, s1: 80, l1: 52, h2: h2, s2: 75, l2: 46 });
    } catch (e) {
      // SecurityError from CORS-blocked canvas or other error — fall back
      callback(coverHues(seed));
    }
  };
  img.onerror = function() { callback(coverHues(seed)); };
  // Append cache-bust only if same origin to avoid CORS issues; for external URLs use as-is
  img.src = coverUrl;
}

function _circularMeanHue(hues) {
  if (!hues.length) return 0;
  var sinSum = 0, cosSum = 0;
  for (var i = 0; i < hues.length; i++) {
    var rad = hues[i] * Math.PI / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  return Math.round(((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360);
}

// Render a cover art div — seed = title string, size = px number, opts = { label, badge, radius, pct }
// pct=true makes it 100% × 100% (for use inside a padding-top:100% wrapper)
function coverHTML(seed, size, opts) {
  opts = opts || {};
  const bg = opts.coverUrl
    ? `url('${opts.coverUrl}') center/cover no-repeat, ${coverGradient(seed)}`
    : coverGradient(seed);
  const isPct = opts.pct;
  const r = opts.radius != null ? opts.radius : (size >= 180 ? 18 : size >= 80 ? 12 : 8);
  const fontSize = isPct ? 18 : Math.max(11, size * 0.14);
  const pad = isPct ? 12 : Math.max(8, size * 0.06);
  const sizeCSS = isPct
    ? 'position:absolute;inset:0;width:100%;height:100%;'
    : `width:${size}px;height:${size}px;flex-shrink:0;`;

  const gloss = `<div aria-hidden style="position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 20%,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 45%),radial-gradient(80% 80% at 80% 90%,rgba(0,0,0,0.28) 0%,rgba(0,0,0,0) 60%);pointer-events:none;"></div>`;
  const badgeEl = opts.badge
    ? `<div style="position:absolute;top:8px;left:8px;padding:2px 8px;background:rgba(255,255,255,0.2);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:rgba(255,255,255,0.96);font-size:9px;font-weight:700;letter-spacing:0.06em;border-radius:4px;text-transform:uppercase;">${escHtml(opts.badge)}</div>`
    : '';
  const labelEl = opts.label
    ? `<div style="position:absolute;inset:0;display:flex;align-items:flex-end;padding:${pad}px;color:rgba(255,255,255,0.96);font-size:${fontSize}px;font-weight:800;line-height:1.05;letter-spacing:-0.02em;text-shadow:0 2px 6px rgba(0,0,0,0.5);background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.45) 100%);text-transform:uppercase;pointer-events:none;"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(opts.label)}</span></div>`
    : '';

  return `<div style="${sizeCSS}border-radius:${r}px;background:${bg};position:relative;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.18),inset 0 0 0 0.5px rgba(255,255,255,0.15);">${gloss}${badgeEl}${labelEl}</div>`;
}

// Escape HTML helper (shared across pages)
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Format numbers nicely
function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n?.toString() || '0';
}

// Format seconds to m:ss
function fmtTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Time ago
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

// Load active site banners (public endpoint)
async function loadActiveBanners() {
  try {
    const res = await fetch(`${API_BASE}/site/banners`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

// Render banners above nav
async function renderSiteBanners() {
  if (document.getElementById('site-banners')) return;
  const banners = await loadActiveBanners();
  if (!banners.length) return;
  const container = document.createElement('div');
  container.id = 'site-banners';
  banners.forEach(b => {
    const el = document.createElement('div');
    el.className = `site-banner ${b.type || 'info'}`;
    el.textContent = b.message;
    container.appendChild(el);
  });
  document.body.insertBefore(container, document.body.firstChild);
}

// Shared nav HTML
function renderNav(activePage = '') {
  return `
  <nav>
    <a href="/index.html" class="nav-logo">wavernrs stream</a>
    <div class="nav-links">
      <a href="/index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
      <a href="/discover.html" class="${activePage === 'discover' ? 'active' : ''}">Discover</a>
    </div>
    <div style="flex:1;max-width:260px;" class="nav-search-wrap">
      <input type="text" id="nav-search" placeholder="Search edits, artists…"
        onkeydown="if(event.key==='Enter'){const q=this.value.trim();if(q.length>=2)location.href='/search.html?q='+encodeURIComponent(q);}">
    </div>
    <div class="nav-right" id="nav-right"></div>
  </nav>`;
}
