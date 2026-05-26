// WAVERNRS — App Shell (Liquid Glass layout)
(function () {
  'use strict';

  // SVG icons used in navigation
  var ICONS = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    discover: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>',
    charts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>',
    playlists: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z"/></svg>',
    profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08 0-.4-.03-.74-.07-1.08l2.3-1.8c.21-.16.27-.47.12-.7l-2.18-3.78c-.15-.23-.45-.3-.68-.22l-2.7 1.08c-.57-.43-1.18-.8-1.87-1.07l-.41-2.88A.544.544 0 0 0 14 2h-4c-.27 0-.5.19-.54.44L9.05 5.32C8.36 5.59 7.75 5.96 7.18 6.39L4.48 5.31a.5.5 0 0 0-.68.22L1.62 9.31c-.15.23-.09.54.12.7l2.3 1.8c-.04.34-.07.68-.07 1.08 0 .4.03.74.07 1.08l-2.3 1.8c-.21.16-.27.47-.12.7l2.18 3.78c.15.23.45.3.68.22l2.7-1.08c.57.43 1.18.8 1.87 1.07l.41 2.88c.04.25.27.44.54.44h4c.27 0 .5-.19.54-.44l.41-2.88c.69-.27 1.3-.64 1.87-1.07l2.7 1.08c.24.09.53 0 .68-.22l2.18-3.78c.15-.23.09-.54-.12-.7l-2.3-1.8z"/></svg>',
    about: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
    discord: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0z"/></svg>',
    moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>',
    music: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
    chart2: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zM16.2 13h2.8v6h-2.8v-6z"/></svg>',
    list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
  };

  function icon(name) { return ICONS[name] || ''; }

  // Detect current page from path
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

  function buildNavItem(id, label, href) {
    var cur = pageId();
    var active = (cur === id) ? ' active' : '';
    return '<a href="' + href + '" class="wv-nav-item' + active + '" data-page="' + id + '">' +
           icon(id === 'profile' ? 'profile' : id === 'upload' ? 'upload' : id === 'settings' ? 'settings' : id === 'about' ? 'about' : id === 'discord' ? 'discord' : id === 'playlists' ? 'playlists' : id === 'discover' ? 'discover' : id === 'charts' ? 'charts' : 'home') +
           '<span>' + label + '</span>' +
           '</a>';
  }

  function buildSidebarHTML() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
    var isLoggedIn = !!localStorage.getItem('token');

    var html = '<div class="wv-sidebar-logo">wavernrs</div>';

    // Main section
    html += '<div class="wv-sidebar-section">';
    html += '<div class="wv-sidebar-label">Main</div>';
    html += '<nav class="wv-sidebar-nav">';
    html += buildNavItem('home', 'Home', '/index.html');
    html += buildNavItem('discover', 'Discover', '/discover.html');
    html += buildNavItem('charts', 'Charts', '/charts.html');
    html += '</nav></div>';

    // Personal section
    html += '<div class="wv-sidebar-section">';
    html += '<div class="wv-sidebar-label">Personal</div>';
    html += '<nav class="wv-sidebar-nav">';
    html += buildNavItem('playlists', 'Playlists', '/playlists.html');
    html += buildNavItem('profile', 'Profile', '/dashboard.html');
    html += '</nav></div>';

    // Manage section (only show if logged in)
    if (isLoggedIn) {
      html += '<div class="wv-sidebar-section">';
      html += '<div class="wv-sidebar-label">Manage</div>';
      html += '<nav class="wv-sidebar-nav">';
      html += buildNavItem('upload', 'Upload', '/upload.html');
      html += buildNavItem('settings', 'Settings', '/settings.html');
      html += '</nav></div>';
    }

    // Footer
    html += '<div class="wv-sidebar-footer">';
    html += buildNavItem('about', 'About', '/about.html');
    html += '<a href="https://discord.gg/wavernrs" target="_blank" class="wv-nav-item">' + icon('discord') + '<span>Discord</span></a>';
    html += '</div>';

    return html;
  }

  function buildTopbarHTML() {
    var theme = localStorage.getItem('wv-theme') || 'light';
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
    var isLoggedIn = !!localStorage.getItem('token');

    var html = '';

    // Mobile: hamburger button
    html += '<button class="wv-icon-btn" id="wv-menu-btn" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu">' + icon('menu') + '</button>';

    // Logo
    html += '<a href="/index.html" class="wv-logo">wavernrs</a>';

    // Centered search
    html += '<div class="wv-topbar-search">' +
            '<div class="wv-input" style="display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:text;" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
            icon('search') +
            '<input id="wv-search-inp" placeholder="Search edits, artists…" style="flex:1;background:transparent;border:none;outline:none;font-size:13.5px;color:inherit;font-family:inherit;" onkeydown="if(event.key===\'Enter\'){var q=this.value.trim();if(q)navSearch(q);}">' +
            '</div></div>';

    // Right side
    html += '<div class="wv-topbar-right">';

    // Theme toggle
    html += '<button class="wv-icon-btn" id="wv-theme-btn" onclick="window.toggleTheme()" aria-label="Toggle theme">' +
            (theme === 'light' ? icon('sun') : icon('moon')) + '</button>';

    // Auth area
    if (isLoggedIn && user) {
      var initials = (user.username || user.display_name || '?').charAt(0).toUpperCase();
      html += '<div class="wv-avatar" onclick="navigate(\'/dashboard.html\')" title="' + (user.display_name || user.username || '') + '">' + initials + '</div>';
      html += '<button class="wv-pill" onclick="logout()" style="padding:6px 14px;font-size:12px;">Log out</button>';
    } else {
      html += '<a href="/login.html" class="wv-pill" style="padding:6px 14px;font-size:12px;">Log in</a>';
      html += '<a href="/register.html" class="wv-pill brand" style="padding:6px 14px;font-size:12px;">Sign up</a>';
    }

    html += '</div>'; // topbar-right
    return html;
  }

  function buildMobileTabsHTML() {
    var cur = pageId();
    var tabs = [
      { id: 'home', label: 'Home', href: '/index.html', iconSvg: ICONS.home },
      { id: 'discover', label: 'Discover', href: '/discover.html', iconSvg: ICONS.discover },
      { id: 'charts', label: 'Charts', href: '/charts.html', iconSvg: ICONS.charts },
      { id: 'playlists', label: 'Playlists', href: '/playlists.html', iconSvg: ICONS.playlists },
      { id: 'profile', label: 'You', href: '/dashboard.html', iconSvg: ICONS.profile },
    ];
    return tabs.map(function(t) {
      var active = (cur === t.id) ? ' active' : '';
      return '<a href="' + t.href + '" class="wv-tab-btn' + active + '" data-page="' + t.id + '">' +
             t.iconSvg + '<span>' + t.label + '</span></a>';
    }).join('');
  }

  // Update active states after SPA navigation
  function updateActive() {
    var cur = pageId();
    // Sidebar links
    document.querySelectorAll('.wv-nav-item[data-page]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === cur);
    });
    // Mobile tabs
    document.querySelectorAll('.wv-tab-btn[data-page]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === cur);
    });
  }

  // Expose for router.js to call
  window._updateNavActive = updateActive;

  // Theme toggle
  window.toggleTheme = function() {
    var root = document.getElementById('wv-root');
    if (!root) return;
    var isDark = root.classList.contains('theme-dark');
    var next = isDark ? 'light' : 'dark';
    root.classList.toggle('theme-dark', !isDark);
    root.classList.toggle('theme-light', isDark);
    localStorage.setItem('wv-theme', next);
    // Update theme button icon
    var btn = document.getElementById('wv-theme-btn');
    if (btn) btn.innerHTML = next === 'dark' ? ICONS.moon : ICONS.sun;
  };

  // Mobile drawer
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

  // Build and inject the shell
  function initShell() {
    var theme = localStorage.getItem('wv-theme') || 'light';

    // Get existing view content
    var viewEl = document.getElementById('view');
    var viewContent = viewEl ? viewEl.innerHTML : '';

    // Remove old nav and mobile bottom nav
    var oldNav = document.querySelector('nav');
    if (oldNav) oldNav.remove();
    var oldMobileNav = document.querySelector('.mobile-bottom-nav');
    if (oldMobileNav) oldMobileNav.remove();

    // Detect if this is an auth page (login/register) — no shell needed
    var isAuthPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('/register.html');
    if (isAuthPage) {
      document.body.classList.add('wv-app', 'theme-' + theme);
      return;
    }

    // Create the root shell element
    var root = document.createElement('div');
    root.id = 'wv-root';
    root.className = 'wv-app theme-' + theme;

    root.innerHTML =
      // Background layer
      '<div id="wv-page-bg" aria-hidden></div>' +
      // Top bar
      '<header id="wv-topbar" class="wv-topbar lg-large lg-highlight">' + buildTopbarHTML() + '</header>' +
      // Sidebar (desktop)
      '<aside id="wv-sidebar" class="wv-sidebar lg-large">' + buildSidebarHTML() + '</aside>' +
      // Content area
      '<div id="wv-content"><div id="view">' + viewContent + '</div></div>' +
      // Player slot
      '<div id="wv-player-slot"></div>' +
      // Mobile tab bar (hidden on desktop via CSS)
      '<nav id="wv-mobile-tabs" class="wv-mobile-tabs">' + buildMobileTabsHTML() + '</nav>' +
      // Drawer overlay (hidden on desktop via CSS)
      '<div id="wv-drawer-overlay" class="wv-drawer-overlay" onclick="window.closeMobileDrawer()"></div>' +
      // Mobile drawer (hidden on desktop via CSS)
      '<aside id="wv-drawer" class="wv-drawer lg-large">' +
        buildSidebarHTML() +
        '<button onclick="window.closeMobileDrawer()" style="position:absolute;top:14px;right:-14px;width:30px;height:30px;border-radius:50%;background:var(--glass-pill-bg);border:1px solid var(--glass-small-border);color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;">×</button>' +
      '</aside>';

    // Show mobile menu button on mobile
    var mediaQ = window.matchMedia('(max-width: 768px)');
    function checkMobile() {
      var menuBtn = root.querySelector('#wv-menu-btn');
      if (menuBtn) menuBtn.style.display = mediaQ.matches ? 'flex' : 'none';
    }

    // Clear body and append shell
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.insertBefore(root, document.body.firstChild);

    checkMobile();
    mediaQ.addListener(checkMobile);

    // Close drawer when clicking nav links inside it
    root.querySelectorAll('#wv-drawer .wv-nav-item, #wv-mobile-tabs .wv-tab-btn').forEach(function(el) {
      el.addEventListener('click', function() {
        window.closeMobileDrawer();
      });
    });
  }

  // Re-expose updateNav as a no-op (layout.js handles nav state)
  window.updateNav = function() {
    // Update sidebar and topbar auth state when auth changes
    var topbar = document.getElementById('wv-topbar');
    if (topbar) {
      topbar.innerHTML = buildTopbarHTML();
      // Re-check mobile button visibility
      var btn = document.getElementById('wv-menu-btn');
      if (btn && window.matchMedia('(max-width:768px)').matches) btn.style.display = 'flex';
    }
    var sidebar = document.getElementById('wv-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebarHTML();
    var drawer = document.getElementById('wv-drawer');
    if (drawer) drawer.innerHTML = buildSidebarHTML();
  };

  // Also expose renderSiteBanners as a no-op (banners are shown inside #view now)
  if (!window.renderSiteBanners) {
    window.renderSiteBanners = function() {};
  }

  // Run shell init immediately (scripts are at end of body, DOM is ready)
  initShell();

})();
