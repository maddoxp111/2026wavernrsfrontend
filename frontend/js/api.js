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
