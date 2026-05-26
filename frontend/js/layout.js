// WAVERNRS — App Shell (Liquid Glass layout)
// Translates the claude.ai/design prototype exactly into vanilla HTML/CSS/JS
(function () {
  'use strict';

  // ── SVG icon paths (Heroicons outline 24×24) ─────────────────
  var ICONS = {
    home:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>',
    discover: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"/></svg>',
    chart:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/></svg>',
    list:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 17.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>',
    profile:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>',
    upload:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12m4.5-4.5v12"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>',
    info:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>',
    discord:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
    sun:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/></svg>',
    moon:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/></svg>',
    bell:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>',
    more:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"/></svg>',
    search:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>',
    menu:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>',
    x:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6l12 12"/></svg>',
  };

  function icon(name) { return ICONS[name] || ''; }

  // ── Which page are we on? ─────────────────────────────────────
  function pageId() {
    var p = location.pathname;
    if (p === '/' || p.endsWith('/index.html')) return 'home';
    if (p.endsWith('/discover.html')) return 'discover';
    if (p.endsWith('/charts.html')) return 'charts';
    if (p.endsWith('/playlists.html')) return 'playlists';
    if (p.endsWith('/playlist.html')) return 'playlist';
    if (p.endsWith('/dashboard.html')) return 'profile';
    if (p.endsWith('/upload.html')) return 'upload';
    if (p.endsWith('/settings.html')) return 'settings';
    if (p.endsWith('/about.html')) return 'about';
    if (p.endsWith('/album.html')) return 'album';
    if (p.endsWith('/track.html')) return 'track';
    if (p.endsWith('/artist.html')) return 'artist';
    if (p.endsWith('/search.html')) return 'search';
    if (p.endsWith('/adminpanel.html')) return 'admin';
    return '';
  }

  // ── Nav item — pill-style button rendered as <a> ─────────────
  function navItem(id, label, href, iconName) {
    var cur = pageId();
    var active = (cur === id || (id === 'profile' && cur === 'profile')) ? ' is-active' : '';
    return '<a href="' + href + '" class="wv-nav-item' + active + '" data-page="' + id + '">' +
           icon(iconName || id) + '<span>' + label + '</span></a>';
  }

  // ── Sidebar HTML ─────────────────────────────────────────────
  function buildSidebarHTML() {
    var isLoggedIn = !!localStorage.getItem('token');
    var html = '';

    // Logo
    html += '<div class="wv-sidebar-logo">wavernrs</div>';

    // Main section
    html += '<div class="wv-sidebar-label">Main</div>';
    html += '<nav class="wv-sidebar-nav">';
    html += navItem('home', 'Home', '/index.html', 'home');
    html += navItem('discover', 'Discover', '/discover.html', 'discover');
    html += navItem('charts', 'Charts', '/charts.html', 'chart');
    html += '</nav>';

    // Personal section
    html += '<div class="wv-sidebar-label" style="margin-top:12px;">Personal</div>';
    html += '<nav class="wv-sidebar-nav">';
    html += navItem('playlists', 'Playlists', '/playlists.html', 'list');
    html += navItem('profile', 'Profile', '/dashboard.html', 'profile');
    html += '</nav>';

    // Manage section (logged in only)
    if (isLoggedIn) {
      html += '<div class="wv-sidebar-label" style="margin-top:12px;">Manage</div>';
      html += '<nav class="wv-sidebar-nav">';
      html += navItem('upload', 'Upload', '/upload.html', 'upload');
      html += navItem('settings', 'Settings', '/settings.html', 'settings');
      html += '</nav>';
    }

    // Footer spacer + About + Discord
    html += '<div style="flex:1;min-height:16px;"></div>';
    html += '<nav class="wv-sidebar-nav">';
    html += navItem('about', 'About', '/about.html', 'info');
    html += '<a href="https://discord.gg/E99x3jhtr8" target="_blank" class="wv-nav-item">' + icon('discord') + '<span>Discord</span></a>';
    html += '</nav>';

    return html;
  }

  // ── Topbar HTML ───────────────────────────────────────────────
  function buildTopbarHTML() {
    var theme = localStorage.getItem('wv-theme') || 'light';
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
    var isLoggedIn = !!localStorage.getItem('token');

    // Mobile hamburger (hidden on desktop via CSS, shown on mobile)
    var html = '<button id="wv-menu-btn" class="wv-icon-circle" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu">' + icon('menu') + '</button>';

    // Left: logo (hidden on mobile, shown by mobile CSS with flex-1 center)
    html += '<a href="/index.html" class="wv-topbar-logo">wavernrs</a>';

    // Mobile center logo (shown only on mobile)
    html += '<div class="wv-topbar-mobile-logo">wavernrs</div>';

    // Center: search
    html += '<div class="wv-topbar-search">' +
      '<div class="wv-input wv-search-wrap" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
      icon('search') +
      '<input id="wv-search-inp" placeholder="Search" style="flex:1;background:transparent;border:none;outline:none;font-size:13.5px;color:inherit;font-family:inherit;" ' +
      'onkeydown="if(event.key===\'Enter\'){var q=this.value.trim();if(q)navSearch(q);}">' +
      '</div></div>';

    // Right
    html += '<div class="wv-topbar-right">';

    // Theme toggle (circle)
    html += '<button class="wv-icon-circle" id="wv-theme-btn" onclick="window.toggleTheme()" title="Toggle theme">' +
            (theme === 'dark' ? icon('moon') : icon('sun')) + '</button>';

    if (isLoggedIn && user) {
      // Bell
      html += '<button class="wv-icon-circle" title="Notifications" style="position:relative;">' +
              icon('bell') +
              '<span style="position:absolute;top:8px;right:8px;width:6px;height:6px;border-radius:50%;background:var(--pink);"></span>' +
              '</button>';
      // More (opens dropdown)
      html += '<button class="wv-icon-circle" id="wv-more-btn" onclick="window._toggleMoreMenu(event)" title="More">' + icon('more') + '</button>';
      // Avatar
      var initials = (user.username || user.display_name || '?').charAt(0).toUpperCase();
      html += '<div class="wv-avatar" onclick="navigate(\'/dashboard.html\')" title="Profile">' + initials + '</div>';
    } else {
      html += '<a href="/login.html" class="wv-pill" style="padding:6px 14px;font-size:12.5px;">Log in</a>';
      html += '<a href="/register.html" class="wv-pill" style="padding:6px 14px;font-size:12.5px;background:var(--avatar-bg);color:var(--page-bg-base);border-color:var(--avatar-bg);">Sign up</a>';
    }

    html += '</div>'; // topbar-right
    return html;
  }

  // ── Mobile tabs ───────────────────────────────────────────────
  function buildMobileTabsHTML() {
    var cur = pageId();
    var tabs = [
      { id: 'home', label: 'Home', href: '/index.html', ic: 'home' },
      { id: 'discover', label: 'Discover', href: '/discover.html', ic: 'discover' },
      { id: 'charts', label: 'Charts', href: '/charts.html', ic: 'chart' },
      { id: 'playlists', label: 'Playlists', href: '/playlists.html', ic: 'list' },
      { id: 'profile', label: 'You', href: '/dashboard.html', ic: 'profile' },
    ];
    return tabs.map(function(t) {
      var active = cur === t.id ? ' active' : '';
      return '<a href="' + t.href + '" class="wv-tab-btn' + active + '" data-page="' + t.id + '">' +
             icon(t.ic) + '<span>' + t.label + '</span></a>';
    }).join('');
  }

  // ── Update active nav after SPA navigation ────────────────────
  function updateActive() {
    var cur = pageId();
    document.querySelectorAll('.wv-nav-item[data-page]').forEach(function(el) {
      el.classList.toggle('is-active', el.dataset.page === cur);
    });
    document.querySelectorAll('.wv-tab-btn[data-page]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === cur);
    });
  }
  window._updateNavActive = updateActive;

  // ── Theme toggle ──────────────────────────────────────────────
  window.toggleTheme = function() {
    var root = document.getElementById('wv-root');
    if (!root) return;
    var isDark = root.classList.contains('theme-dark');
    var next = isDark ? 'light' : 'dark';
    root.classList.toggle('theme-dark', !isDark);
    root.classList.toggle('theme-light', isDark);
    // Sync theme on body so modals/dropdowns outside #wv-root also update
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + next);
    localStorage.setItem('wv-theme', next);
    var btn = document.getElementById('wv-theme-btn');
    if (btn) btn.innerHTML = next === 'dark' ? icon('moon') : icon('sun');
  };

  // ── More menu (profile dropdown) ─────────────────────────────
  window._toggleMoreMenu = function(e) {
    e.stopPropagation();
    var existing = document.getElementById('wv-more-menu');
    if (existing) { existing.remove(); return; }

    var btn = document.getElementById('wv-more-btn');
    var r = btn ? btn.getBoundingClientRect() : { bottom: 60, right: 200 };

    var menu = document.createElement('div');
    menu.id = 'wv-more-menu';
    menu.className = 'lg-medium';
    menu.style.cssText = 'position:fixed;top:' + (r.bottom + 6) + 'px;right:' + (window.innerWidth - r.right) + 'px;border-radius:14px;padding:6px 0;min-width:170px;z-index:9999;font-size:13px;';

    var items = [
      ['Profile', function() { navigate('/dashboard.html'); }],
      ['Settings', function() { navigate('/settings.html'); }],
      ['Sign out', function() { logout(); }],
    ];
    items.forEach(function(item) {
      var el = document.createElement('button');
      el.textContent = item[0];
      el.style.cssText = 'display:block;width:100%;text-align:left;padding:9px 18px;background:transparent;border:none;cursor:pointer;color:var(--text);font-size:13px;font-family:inherit;';
      el.onmouseenter = function() { el.style.background = 'var(--hair)'; };
      el.onmouseleave = function() { el.style.background = 'transparent'; };
      el.onclick = function() { menu.remove(); item[1](); };
      menu.appendChild(el);
    });

    document.body.appendChild(menu);
    setTimeout(function() {
      document.addEventListener('click', function handler() {
        menu.remove();
        document.removeEventListener('click', handler);
      });
    }, 0);
  };

  // ── Mobile drawer ─────────────────────────────────────────────
  window.openMobileDrawer = function() {
    var drawer = document.getElementById('wv-drawer');
    var overlay = document.getElementById('wv-drawer-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeMobileDrawer = function() {
    var drawer = document.getElementById('wv-drawer');
    var overlay = document.getElementById('wv-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  // ── Build and inject the shell ────────────────────────────────
  function initShell() {
    var theme = localStorage.getItem('wv-theme') || 'dark';

    var isAuthPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('/register.html');

    var viewEl = document.getElementById('view');
    var viewContent = viewEl ? viewEl.innerHTML : '';

    // Remove old nav / mobile-bottom-nav if present
    var oldNav = document.querySelector('nav:not(#wv-sidebar nav):not(#wv-drawer nav):not(#wv-mobile-tabs)');
    if (oldNav && !oldNav.closest('#wv-root')) oldNav.remove();
    var oldMobile = document.querySelector('.mobile-bottom-nav');
    if (oldMobile) oldMobile.remove();

    if (isAuthPage) {
      document.body.classList.add('wv-auth-body', 'theme-' + theme);
      return;
    }

    var root = document.createElement('div');
    root.id = 'wv-root';
    root.className = 'wv-app theme-' + theme;

    root.innerHTML =
      // Animated page background
      '<div id="wv-page-bg" aria-hidden></div>' +
      // Topbar
      '<header id="wv-topbar" class="wv-topbar lg-large lg-highlight">' + buildTopbarHTML() + '</header>' +
      // Sidebar
      '<aside id="wv-sidebar" class="wv-sidebar lg-large">' + buildSidebarHTML() + '</aside>' +
      // Main content
      '<div id="wv-content"><div id="view">' + viewContent + '</div></div>' +
      // Player slot
      '<div id="wv-player-slot"></div>' +
      // Mobile-only elements (hidden on desktop via CSS)
      '<nav id="wv-mobile-tabs" class="wv-mobile-tabs">' + buildMobileTabsHTML() + '</nav>' +
      '<div id="wv-drawer-overlay" class="wv-drawer-overlay" onclick="window.closeMobileDrawer()"></div>' +
      '<aside id="wv-drawer" class="wv-drawer lg-large">' +
        buildSidebarHTML() +
        '<button onclick="window.closeMobileDrawer()" class="wv-icon-circle" style="position:absolute;top:14px;right:-18px;">×</button>' +
      '</aside>';

    // Also apply theme class to body so anything appended outside #wv-root
    // (modals, dropdown menus) also inherits the CSS custom properties
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.insertBefore(root, document.body.firstChild);

    // Mobile: show hamburger button in topbar
    var mq = window.matchMedia('(max-width: 768px)');
    function checkMobile() {
      var menuBtn = root.querySelector('#wv-menu-btn');
      if (menuBtn) menuBtn.style.display = mq.matches ? 'flex' : 'none';
    }
    checkMobile();
    mq.addListener(checkMobile);

    // Close drawer when clicking links inside it
    root.querySelectorAll('#wv-drawer .wv-nav-item, #wv-mobile-tabs .wv-tab-btn').forEach(function(el) {
      el.addEventListener('click', function() { window.closeMobileDrawer(); });
    });

    // ── Site lockdown check ───────────────────────────────────────
    // Admin panel is always accessible regardless of lockdown
    var isAdminPage = location.pathname.endsWith('/adminpanel.html');
    if (!isAdminPage) {
      _checkSiteLock(theme);
    }
  }

  function _checkSiteLock(theme) {
    // Already verified this session?
    if (sessionStorage.getItem('site_lock_verified')) return;

    // Show a minimal lockscreen immediately to avoid flash of content
    var ls = document.createElement('div');
    ls.id = 'wv-lockscreen';
    ls.className = 'theme-' + (theme || 'dark');
    ls.innerHTML =
      '<div class="wv-lock-card">' +
        '<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px;">wavernrs</div>' +
        '<div id="wv-lock-icon" style="font-size:32px;margin-bottom:12px;">🔒</div>' +
        '<h2 style="font-size:22px;font-weight:800;margin:0 0 6px;">Site is locked</h2>' +
        '<p style="font-size:14px;color:var(--text-2);margin:0 0 22px;line-height:1.5;">Enter the access password to continue.</p>' +
        '<div id="wv-lock-alert" style="margin-bottom:10px;"></div>' +
        '<div style="display:flex;gap:8px;">' +
          '<input type="password" id="wv-lock-pw" class="wv-input" placeholder="Password..." style="flex:1;padding:10px 14px;" ' +
            'onkeydown="if(event.key===\'Enter\') window._submitSiteLock()">' +
          '<button class="btn btn-primary" onclick="window._submitSiteLock()">Enter</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ls);

    // Fetch lock status
    fetch(typeof API_BASE !== 'undefined' ? API_BASE + '/site/lock-status' : '/api/site/lock-status')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d.locked) {
          // Not locked — remove screen immediately
          var el = document.getElementById('wv-lockscreen');
          if (el) el.remove();
        }
        // else: keep lockscreen visible, user must enter password
      })
      .catch(function() {
        // API error — don't block the user
        var el = document.getElementById('wv-lockscreen');
        if (el) el.remove();
      });
  }

  window._submitSiteLock = function() {
    var pw = document.getElementById('wv-lock-pw');
    var alertEl = document.getElementById('wv-lock-alert');
    if (!pw || !pw.value) return;

    fetch(typeof API_BASE !== 'undefined' ? API_BASE + '/site/lock-verify' : '/api/site/lock-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw.value }),
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok) {
          sessionStorage.setItem('site_lock_verified', '1');
          var ls = document.getElementById('wv-lockscreen');
          if (ls) ls.remove();
        } else {
          if (alertEl) alertEl.innerHTML = '<div style="color:var(--red);font-size:13px;padding:6px 0;">Incorrect password. Try again.</div>';
          if (pw) { pw.value = ''; pw.focus(); }
        }
      })
      .catch(function() {
        if (alertEl) alertEl.innerHTML = '<div style="color:var(--red);font-size:13px;padding:6px 0;">Connection error. Try again.</div>';
      });
  };

  // ── updateNav — called after auth state changes ───────────────
  window.updateNav = function() {
    var topbar = document.getElementById('wv-topbar');
    if (topbar) topbar.innerHTML = buildTopbarHTML();
    var sidebar = document.getElementById('wv-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebarHTML();
    var drawer = document.getElementById('wv-drawer');
    if (drawer) drawer.innerHTML = buildSidebarHTML();
    var tabs = document.getElementById('wv-mobile-tabs');
    if (tabs) tabs.innerHTML = buildMobileTabsHTML();
  };

  window.renderSiteBanners = function() {};

  initShell();
})();
