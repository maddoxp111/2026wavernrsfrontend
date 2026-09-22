// WAVERNRS — App Shell
// Sidebar (nav + library) | topbar + content, player docked below.
(function () {
  'use strict';

  // ── SVG icon paths (Heroicons outline 24×24) ─────────────────
  var ICONS = {
    radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>',
    // Purpose-drawn on a single 24 grid: solid shapes, matched corner
    // radii, one optical weight. Filled rather than hairline-outlined so
    // they hold up at nav size and read as a set instead of stock clip art.
    home:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.2 2.6a1.25 1.25 0 0 1 1.6 0l8.4 7a1.2 1.2 0 0 1 .43.92v8.9A2.6 2.6 0 0 1 19.03 22H15.4a.85.85 0 0 1-.85-.85V16.4a2.55 2.55 0 0 0-5.1 0v4.75A.85.85 0 0 1 8.6 22H4.97a2.6 2.6 0 0 1-2.6-2.58v-8.9c0-.36.16-.7.43-.92Z"/></svg>',
    discover:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm4.05 5.25-2.42 5.68a1.2 1.2 0 0 1-.63.63l-5.68 2.42a.5.5 0 0 1-.66-.66l2.42-5.68c.12-.29.34-.51.63-.63l5.68-2.42a.5.5 0 0 1 .66.66Z"/></svg>',
    chart:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3.1" y="12.3" width="4.7" height="8.6" rx="1.7"/><rect x="9.65" y="7" width="4.7" height="13.9" rx="1.7"/><rect x="16.2" y="3.1" width="4.7" height="17.8" rx="1.7"/></svg>',
    list:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="5.1" width="18" height="2.7" rx="1.35"/><rect x="3" y="10.65" width="18" height="2.7" rx="1.35"/><rect x="3" y="16.2" width="11.5" height="2.7" rx="1.35"/></svg>',
    profile:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.7" r="4.4"/><path d="M12 13.8c-4.35 0-7.9 2.63-7.9 5.87 0 .9.73 1.63 1.63 1.63h12.54c.9 0 1.63-.73 1.63-1.63 0-3.24-3.54-5.87-7.9-5.87Z"/></svg>',
    feed:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8.9" cy="8" r="3.7"/><path d="M8.9 13.5c-3.65 0-6.65 2.2-6.65 4.95 0 .8.65 1.45 1.45 1.45h10.4c.8 0 1.45-.65 1.45-1.45 0-2.75-3-4.95-6.65-4.95Z"/><circle cx="17.5" cy="9.5" r="2.85"/><path d="M17.5 13.9c-.72 0-1.4.09-2.02.26a6.6 6.6 0 0 1 2.12 4.29c0 .3-.03.6-.1.89h3.26c.8 0 1.45-.65 1.45-1.45 0-2.2-2.11-3.99-4.71-3.99Z"/></svg>',
    community: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 3.3h9A4.7 4.7 0 0 1 22.2 8v4.3a4.7 4.7 0 0 1-4.7 4.7h-.6l-3.16 2.96a1 1 0 0 1-1.69-.73V17H8.5a4.7 4.7 0 0 1-4.7-4.7V8a4.7 4.7 0 0 1 4.7-4.7Z"/></svg>',
    eras:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="7" r="3.1"/><circle cx="17" cy="7" r="3.1"/><circle cx="7" cy="17" r="3.1"/><circle cx="17" cy="17" r="3.1"/></svg>',
    archive:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="2.7" y="3.5" width="18.6" height="4.7" rx="1.7"/><path fill-rule="evenodd" d="M4.35 9.9h15.3v8.2a2.7 2.7 0 0 1-2.7 2.7H7.05a2.7 2.7 0 0 1-2.7-2.7Zm4.9 2.95a1.25 1.25 0 1 0 0 2.5h5.5a1.25 1.25 0 0 0 0-2.5Z"/></svg>',
    resources: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.1 6.35A2.65 2.65 0 0 1 5.75 3.7h3.3c.7 0 1.38.28 1.87.78l1.1 1.1h6.23a2.65 2.65 0 0 1 2.65 2.65v9.42a2.65 2.65 0 0 1-2.65 2.65H5.75A2.65 2.65 0 0 1 3.1 17.65Z"/></svg>',
    upload:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.7c.35 0 .68.14.92.39l4.2 4.2a1.3 1.3 0 0 1-1.84 1.84l-1.98-1.98V15a1.3 1.3 0 0 1-2.6 0V7.15L8.72 9.13A1.3 1.3 0 1 1 6.88 7.29l4.2-4.2c.24-.25.57-.39.92-.39Z"/><path d="M4.4 14.4a1.3 1.3 0 0 1 1.3 1.3v2.45c0 .28.22.5.5.5h11.6c.28 0 .5-.22.5-.5V15.7a1.3 1.3 0 1 1 2.6 0v2.45a3.1 3.1 0 0 1-3.1 3.1H6.2a3.1 3.1 0 0 1-3.1-3.1V15.7a1.3 1.3 0 0 1 1.3-1.3Z"/></svg>',
    settings:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 3.4a1.5 1.5 0 0 1 1.5 1.5v.98c.54.14 1.05.35 1.52.62l.7-.7a1.5 1.5 0 1 1 2.12 2.13l-.7.69c.27.47.48.98.62 1.52h.98a1.5 1.5 0 0 1 0 3h-.98c-.14.54-.35 1.05-.62 1.52l.7.7a1.5 1.5 0 0 1-2.13 2.12l-.69-.7c-.47.27-.98.48-1.52.62v.98a1.5 1.5 0 0 1-3 0v-.98a6.5 6.5 0 0 1-1.52-.62l-.7.7a1.5 1.5 0 1 1-2.12-2.13l.7-.69a6.5 6.5 0 0 1-.62-1.52H4.9a1.5 1.5 0 0 1 0-3h.98c.14-.54.35-1.05.62-1.52l-.7-.7A1.5 1.5 0 0 1 7.93 6.8l.69.7c.47-.27.98-.48 1.52-.62V4.9a1.5 1.5 0 0 1 1.5-1.5Zm0 5.15a3.45 3.45 0 1 0 0 6.9 3.45 3.45 0 0 0 0-6.9Z"/></svg>',
    shield:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.6 2.35a1.1 1.1 0 0 1 .8 0l6.9 2.7c.42.17.7.57.7 1.02v5.24c0 4.65-3.15 8.97-7.72 10.44a.9.9 0 0 1-.56 0C7.15 20.28 4 15.96 4 11.31V6.07c0-.45.28-.85.7-1.02Z"/></svg>',
    info:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm0 3.5a1.55 1.55 0 1 1 0 3.1 1.55 1.55 0 0 1 0-3.1Zm1.4 11.6h-2.8v-6.7h2.8Z"/></svg>',
    search:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.7 2.7a8.05 8.05 0 1 0 4.9 14.44l3.62 3.62a1.4 1.4 0 0 0 1.98-1.98l-3.62-3.62A8.05 8.05 0 0 0 10.7 2.7Zm0 2.8a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Z"/></svg>',
    menu:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="5.4" width="18" height="2.6" rx="1.3"/><rect x="3" y="10.7" width="18" height="2.6" rx="1.3"/><rect x="3" y="16" width="18" height="2.6" rx="1.3"/></svg>',
    x:         '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.32 4.86 4.86 6.32 10.54 12l-5.68 5.68 1.46 1.46L12 13.46l5.68 5.68 1.46-1.46L13.46 12l5.68-5.68-1.46-1.46L12 10.54Z"/></svg>',
    bell:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5A6.5 6.5 0 0 0 5.5 9c0 3.1-.7 5.02-1.53 6.25A1.2 1.2 0 0 0 4.97 17.1h14.06a1.2 1.2 0 0 0 1-1.85C19.2 14.02 18.5 12.1 18.5 9A6.5 6.5 0 0 0 12 2.5Z"/><path d="M9.35 18.55a2.75 2.75 0 0 0 5.3 0Z"/></svg>',
    more:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.6" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.4" cy="12" r="1.9"/></svg>',
    sun:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.7a1.2 1.2 0 0 1 1.2 1.2v1.5a1.2 1.2 0 0 1-2.4 0V2.9A1.2 1.2 0 0 1 12 1.7Zm0 16.4a1.2 1.2 0 0 1 1.2 1.2v1.5a1.2 1.2 0 0 1-2.4 0v-1.5a1.2 1.2 0 0 1 1.2-1.2ZM1.7 12a1.2 1.2 0 0 1 1.2-1.2h1.5a1.2 1.2 0 0 1 0 2.4H2.9A1.2 1.2 0 0 1 1.7 12Zm16.4 0a1.2 1.2 0 0 1 1.2-1.2h1.5a1.2 1.2 0 0 1 0 2.4h-1.5a1.2 1.2 0 0 1-1.2-1.2ZM4.76 4.76a1.2 1.2 0 0 1 1.7 0l1.06 1.06a1.2 1.2 0 0 1-1.7 1.7L4.76 6.46a1.2 1.2 0 0 1 0-1.7Zm11.72 11.72a1.2 1.2 0 0 1 1.7 0l1.06 1.06a1.2 1.2 0 0 1-1.7 1.7l-1.06-1.06a1.2 1.2 0 0 1 0-1.7Zm2.76-11.72a1.2 1.2 0 0 1 0 1.7l-1.06 1.06a1.2 1.2 0 0 1-1.7-1.7l1.06-1.06a1.2 1.2 0 0 1 1.7 0ZM7.52 16.48a1.2 1.2 0 0 1 0 1.7l-1.06 1.06a1.2 1.2 0 1 1-1.7-1.7l1.06-1.06a1.2 1.2 0 0 1 1.7 0Z"/></svg>',
    moon:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 14.15A8.65 8.65 0 0 1 9.85 3.6a8.95 8.95 0 1 0 10.55 10.55Z"/></svg>',
    plus:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z"/></svg>',
    history:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 3a9 9 0 1 1-8.66 11.3l1.94-.5A7 7 0 1 0 8.5 6.5L11 9H4V2l2.6 2.6A9 9 0 0 1 13 3Zm-1 4h2v5.2l3.6 2.1-1 1.7L12 13.4Z"/></svg>',
    discord:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>',
  };

  function icon(name) { return ICONS[name] || ''; }

  function _currentThemeIcon() {
    return typeof window._themeIcon === 'function' ? window._themeIcon() : ICONS.sun;
  }

  // ── Which page are we on? ─────────────────────────────────────
  function pageId() {
    var p = location.pathname.replace(/\/+$/, '');
    p = p.replace(/\.html$/, '');
    var name = p.slice(p.lastIndexOf('/') + 1);
    if (!name || name === 'index') return 'home';
    var ALIAS = {
      discover: 'browse',
      history: 'library',
      'archive-artist': 'archive',
      dashboard: 'profile',
      adminpanel: 'admin',
    };
    var KNOWN = ['browse', 'artists', 'stats', 'charts', 'archive', 'eras', 'library', 'resources',
      'feed', 'playlists', 'playlist', 'upload', 'settings', 'about', 'album', 'track', 'artist',
      'search', 'community', 'radio', 'radiopanel', 'modpanel', 'archivepanel', 'profile', 'admin'];
    if (ALIAS[name]) return ALIAS[name];
    return KNOWN.indexOf(name) >= 0 ? name : '';
  }

  // ── Nav item — pill-style button rendered as <a> ─────────────
  function navItem(id, label, href, iconName) {
    var cur = pageId();
    var active = (cur === id || (id === 'profile' && cur === 'profile')) ? ' is-active' : '';
    return '<a href="' + href + '" class="wv-nav-item' + active + '" data-page="' + id + '">' +
           icon(iconName || id) + '<span>' + label + '</span></a>';
  }

  // ── Sidebar HTML ─────────────────────────────────────────────
  // Three shapes, chosen by theme. The default is two panels on a black
  // gutter. Spotify keeps only Home and Search up top and pins everything
  // else into the library. Apple Music uses a search field over labelled
  // sections.
  var NAV_MAIN = [
    ['home',      'Home',      '/index',     'home'],
    ['browse',    'Browse',    '/browse',    'discover'],
    ['charts',    'Charts',    '/charts',    'chart'],
    ['artists',   'Artists',   '/artists',   'profile'],
    ['archive',   'Archive',   '/archive',   'archive'],
    ['eras',      'Eras',      '/eras',      'eras'],
    ['radio',     'Radio',     '/radio',     'radio'],
    ['community', 'Community', '/community', 'community'],
    ['resources', 'Tracker',   '/resources', 'resources'],
  ];

  function _skin() {
    var t = _storedTheme();
    return (t === 'spotify' || t === 'apple') ? t : '';
  }
  window._wvSkin = _skin;

  function _logoHTML() {
    return '<a href="/index" class="wv-sidebar-logo"><img class="mark" src="/logo.png" ' +
      'srcset="/logo.png 1x, /logo@2x.png 2x" alt="" width="26" height="26">wavernrs</a>';
  }

  function _libBlockHTML(isLoggedIn) {
    return '<div class="wv-lib-head">' +
      '<a href="/library" onclick="navigate(\'/library\');return false;">' + icon('list') + '<span>Your Library</span></a>' +
      '<div class="wv-lib-tools">' +
        '<button class="wv-lib-add" title="History" onclick="navigate(\'/history\')">' + icon('history') + '</button>' +
        (isLoggedIn ? '<button class="wv-lib-add" title="Upload" onclick="navigate(\'/upload\')">' + icon('plus') + '</button>' : '') +
      '</div></div>' +
      '<div class="wv-lib-chips" id="wv-lib-chips">' +
        '<span class="wv-chip acc" data-k="recent" onclick="window._libFilter(\'recent\')">Recent</span>' +
        '<span class="wv-chip" data-k="comps" onclick="window._libFilter(\'comps\')">Comps</span>' +
        '<span class="wv-chip" data-k="edits" onclick="window._libFilter(\'edits\')">Edits</span>' +
        '<span class="wv-chip" data-k="playlists" onclick="window._libFilter(\'playlists\')">Playlists</span>' +
      '</div>' +
      '<div class="wv-lib-find"><input id="wv-lib-q" placeholder="Search in your library" oninput="window._libSearch(this.value)"></div>';
  }

  function _footHTML(isLoggedIn, profileHref) {
    var html = '<div class="wv-side-foot">';
    if (isLoggedIn) {
      html += '<a href="/feed" data-page="feed">Following</a>';
      html += '<a href="' + profileHref + '" data-page="profile">Profile</a>';
      html += '<a href="/settings" data-page="settings">Settings</a>';
      if (sessionStorage.getItem('wv_is_mod') === 'true') html += '<a href="/modpanel" data-page="modpanel">Mod panel</a>';
      if (sessionStorage.getItem('wv_is_archiver') === 'true') html += '<a href="/archivepanel" data-page="archivepanel">Archive panel</a>';
      if (sessionStorage.getItem('wv_is_radio') === 'true') html += '<a href="/radiopanel" data-page="radiopanel">Radio panel</a>';
    } else {
      html += '<a href="/login">Log in</a><a href="/register">Sign up</a>';
    }
    html += '<a href="/stats" data-page="stats">Stats</a>';
    html += '<a href="/about" data-page="about">About</a>';
    html += '<a href="/status" data-page="status">Status</a>';
    html += '<a href="https://discord.gg/E99x3jhtr8" target="_blank" rel="noopener">Discord</a>';
    html += '</div>';
    return html;
  }

  // Spotify pins sections into the library list as rows with square art.
  function _spPinRow(id, label, href, iconName) {
    var cur = pageId();
    return '<a href="' + href + '" class="wv-lib-row sp-pin' + (cur === id ? ' now' : '') + '" data-page="' + id + '" ' +
      'onclick="navigate(\'' + href + '\');return false;">' +
      '<div class="wv-lib-art sp-pin-art">' + icon(iconName) + '</div>' +
      '<div class="wv-lib-meta"><div class="wv-lib-t">' + label + '</div>' +
      '<div class="wv-lib-s">Section · wavernrs</div></div></a>';
  }

  function _sidebarSpotify(isLoggedIn, profileHref) {
    var html = '';
    html += '<div class="wv-panel wv-lib sp-lib">';

    html += '<div class="sp-lib-head">' +
      '<a class="sp-lib-title" href="/library" onclick="navigate(\'/library\');return false;">' +
        icon('list') + '<span>Your Library</span></a>' +
      '<div class="sp-lib-head-tools">' +
        (isLoggedIn
          ? '<button class="sp-create" onclick="navigate(\'/upload\')">' + icon('plus') + '<span>Create</span></button>'
          : '<button class="sp-create" onclick="navigate(\'/register\')">' + icon('plus') + '<span>Create</span></button>') +
        '<button class="sp-lib-icon" title="History" onclick="navigate(\'/history\')">' + icon('history') + '</button>' +
      '</div></div>';

    html += '<div class="sp-lib-chips" id="wv-lib-chips">' +
      '<span class="wv-chip acc" data-k="recent" onclick="window._libFilter(\'recent\')">Recents</span>' +
      '<span class="wv-chip" data-k="comps" onclick="window._libFilter(\'comps\')">Comps</span>' +
      '<span class="wv-chip" data-k="edits" onclick="window._libFilter(\'edits\')">Edits</span>' +
      '<span class="wv-chip" data-k="playlists" onclick="window._libFilter(\'playlists\')">Playlists</span>' +
      '</div>';

    html += '<div class="sp-lib-bar">' +
      '<div class="sp-lib-find">' + icon('search') +
        '<input id="wv-lib-q" placeholder="Search in Your Library" oninput="window._libSearch(this.value)">' +
      '</div>' +
      '<span class="sp-lib-sort">Recents ' + icon('list') + '</span>' +
      '</div>';

    html += '<div class="sp-lib-scroll">';
    html += '<div class="sp-pinned">';
    NAV_MAIN.forEach(function (n) {
      if (n[0] === 'home') return;
      html += _spPinRow(n[0], n[1], n[2], n[3]);
    });
    html += '</div>';
    html += '<div class="wv-lib-list" id="wv-lib-list"></div>';
    html += _footHTML(isLoggedIn, profileHref);
    html += '</div>';

    html += '</div>';
    return html;
  }

  function _amSection(label, items) {
    var html = '<div class="am-sec"><div class="am-sec-label">' + label + '</div><nav class="wv-sidebar-nav">';
    items.forEach(function (n) { html += navItem(n[0], n[1], n[2], n[3]); });
    return html + '</nav></div>';
  }

  function _sidebarApple(isLoggedIn, profileHref) {
    var html = '';
    html += _logoHTML();
    html += '<div class="am-search">' + icon('search') +
      '<input class="am-search-inp" placeholder="Search" autocomplete="off" ' +
      'onkeydown="if(event.key===\'Enter\'){var q=this.value.trim();if(q)navSearch(q);}">' +
      '</div>';

    html += _amSection('Apple Music', [
      ['home', 'Home', '/index', 'home'],
      ['browse', 'Browse', '/browse', 'discover'],
      ['radio', 'Radio', '/radio', 'radio'],
      ['charts', 'Charts', '/charts', 'chart'],
      ['community', 'Community', '/community', 'community'],
    ]);
    html += _amSection('Library', [
      ['library', 'Recently Added', '/library', 'list'],
      ['artists', 'Artists', '/artists', 'profile'],
      ['archive', 'Archive', '/archive', 'archive'],
      ['eras', 'Eras', '/eras', 'eras'],
      ['resources', 'Tracker', '/resources', 'resources'],
    ]);

    html += '<div class="am-sec am-sec-grow"><div class="am-sec-label">Playlists</div>';
    html += _libBlockHTML(isLoggedIn);
    html += '<div class="wv-lib-list" id="wv-lib-list"></div>';
    html += '</div>';

    html += _footHTML(isLoggedIn, profileHref);
    return html;
  }

  // The mobile drawer always uses the default shape: the skins reshape the
  // desktop shell only, and the drawer is the one way to reach everything
  // on a phone.
  function buildSidebarHTML(forDrawer) {
    var isLoggedIn = !!localStorage.getItem('token');
    var profileHref = getProfileHref();
    var skin = forDrawer ? '' : _skin();
    if (skin === 'spotify') return _sidebarSpotify(isLoggedIn, profileHref);
    if (skin === 'apple') return _sidebarApple(isLoggedIn, profileHref);

    var html = '';
    html += '<div class="wv-panel wv-panel-nav">';
    html += _logoHTML();
    html += '<nav class="wv-sidebar-nav">';
    NAV_MAIN.forEach(function (n) { html += navItem(n[0], n[1], n[2], n[3]); });
    html += '</nav>';
    html += '</div>';

    html += '<div class="wv-panel wv-lib">';
    html += _libBlockHTML(isLoggedIn);
    html += '<div class="wv-lib-list" id="wv-lib-list"></div>';
    html += '</div>';

    html += _footHTML(isLoggedIn, profileHref);
    return html;
  }

  // ── Sidebar library ──────────────────────────────────────────
  // Recent comes from the player's localStorage log so it works logged
  // out; comps/edits/playlists come from /api/library when signed in.
  var _libData = null;
  var _libKind = 'recent';
  var _libQuery = '';
  function _escL(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _libRecent() {
    try { return JSON.parse(localStorage.getItem('recently_played') || '[]'); } catch (e) { return []; }
  }
  function _libRow(it) {
    var isAlbum = it._type === 'album';
    var href = it.href || (isAlbum ? '/album?id=' + it.id : it._type === 'playlist' ? '/playlist?id=' + it.id : '/track?id=' + it.id);
    var sub = it.sub || (isAlbum ? 'Comp' : it._type === 'playlist' ? 'Playlist' : 'Edit') + (it.artist_name ? ' · ' + it.artist_name : '');
    var art = it.cover_url
      ? '<img src="' + _escL(it.cover_url) + '" loading="lazy" onerror="this.remove()">'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13M9 9l12-2"/></svg>';
    return '<div class="wv-lib-row" onclick="navigate(\'' + _escL(href) + '\')">' +
      '<div class="wv-lib-art' + (it._type === 'playlist' ? '' : '') + '" style="' + (it.cover_url ? '' : 'background:' + (typeof coverGradient === 'function' ? coverGradient(it.title || '') : 'var(--surface-2)')) + '">' + art + '</div>' +
      '<div class="wv-lib-meta"><div class="wv-lib-t">' + _escL(it.title || 'Untitled') + '</div><div class="wv-lib-s">' + _escL(sub) + '</div></div>' +
      '</div>';
  }
  function _renderLib() {
    document.querySelectorAll('#wv-lib-list').forEach(function(list) {
      var items = [];
      var loggedIn = !!localStorage.getItem('token');
      if (_libKind === 'recent') {
        items = _libRecent().filter(function(t) { return t.id; }).slice(0, 30);
        if (!items.length) {
          list.innerHTML = '<div class="wv-lib-empty"><b>Nothing played yet</b><p>Play a comp or edit and it shows up here.</p>' +
            '<a class="btn btn-secondary btn-sm" href="/browse" onclick="navigate(\'/browse\');return false;">Browse</a></div>';
          return;
        }
      } else {
        if (!loggedIn) {
          list.innerHTML = '<div class="wv-lib-empty"><b>Sign in to see your library</b><p>Liked comps, edits and playlists live here.</p>' +
            '<a class="btn btn-primary btn-sm" href="/login">Log in</a></div>';
          return;
        }
        if (!_libData) { list.innerHTML = '<div class="wv-lib-empty" style="background:transparent;color:var(--text-3);font-size:12.5px;">Loading…</div>'; return; }
        if (_libKind === 'comps') items = (_libData.albums || []).map(function(a) { return { _type: 'album', id: a.id, title: a.title, cover_url: a.cover_url, artist_name: a.is_archive ? a.archive_artist_name : (a.artists && a.artists.display_name) }; });
        if (_libKind === 'edits') items = (_libData.tracks || []).map(function(t) { return { _type: 'track', id: t.id, title: t.title, cover_url: t.cover_url, artist_name: t.artists && t.artists.display_name }; });
        if (_libKind === 'playlists') items = (_libData.playlists || []).map(function(p) { return { _type: 'playlist', id: p.id, title: p.title, sub: 'Playlist · ' + (p.track_count || 0) + ' tracks' }; });
        if (!items.length) {
          var what = _libKind === 'playlists' ? 'playlists' : 'liked ' + _libKind;
          list.innerHTML = '<div class="wv-lib-empty"><b>No ' + what + ' yet</b><p>' + (_libKind === 'playlists' ? 'Create one from any edit\'s menu.' : 'Tap the heart on anything and it lands here.') + '</p></div>';
          return;
        }
      }
      if (_libQuery) {
        var q = _libQuery.toLowerCase();
        items = items.filter(function(it) { return String(it.title || '').toLowerCase().indexOf(q) !== -1 || String(it.artist_name || '').toLowerCase().indexOf(q) !== -1; });
        if (!items.length) { list.innerHTML = '<div class="wv-lib-empty" style="background:transparent;color:var(--text-3);font-size:12.5px;">No matches</div>'; return; }
      }
      list.innerHTML = items.slice(0, 60).map(_libRow).join('');
    });
    document.querySelectorAll('#wv-lib-chips .wv-chip').forEach(function(c) { c.classList.toggle('acc', c.dataset.k === _libKind); });
  }
  window._libSearch = function(q) { _libQuery = q || ''; _renderLib(); };
  window._libFilter = function(kind) {
    _libKind = kind;
    _renderLib();
    if (kind !== 'recent' && !_libData && localStorage.getItem('token')) _loadLibData();
  };
  function _loadLibData() {
    var token = localStorage.getItem('token');
    if (!token) return;
    fetch((typeof API_BASE !== 'undefined' ? API_BASE : '/api') + '/library', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d) { _libData = d; _renderLib(); } })
      .catch(function() {});
  }
  window.refreshSidebarLibrary = function() { _libData = null; _renderLib(); if (_libKind !== 'recent') _loadLibData(); };
  // The player appends to recently_played; re-render when it does.
  window.addEventListener('storage', function(e) { if (e.key === 'recently_played') _renderLib(); });
  // Staff can fix a missing cover on any comp, not just their own.
  try {
    window._wvIsStaff = sessionStorage.getItem('wv_is_mod') === 'true' || sessionStorage.getItem('wv_is_archiver') === 'true';
  } catch (_) { window._wvIsStaff = false; }
  window._sidebarLibRender = _renderLib;

  // ── Topbar HTML ───────────────────────────────────────────────
  // The account cluster on the right of the top bar, shared by all shapes.
  function _topRightHTML(isLoggedIn, user, extra) {
    var html = '<div class="wv-topbar-right">';
    html += '<div id="wv-presence" class="wv-presence" style="display:none;"></div>';
    html += extra || '';
    html += '<button class="wv-icon-circle" id="wv-theme-btn" onclick="window.wvOpenThemePicker()" title="Theme" aria-label="Choose a theme">' + _currentThemeIcon() + '</button>';
    if (isLoggedIn && user) {
      html += '<button class="wv-icon-circle" id="wv-notif-btn" title="Notifications" onclick="window._toggleNotifPanel(event)" style="position:relative;">' +
              icon('bell') +
              '<span id="wv-notif-dot" style="position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--brand);display:none;"></span>' +
              '</button>';
      html += '<button class="wv-icon-circle" id="wv-more-btn" onclick="window._toggleMoreMenu(event)" title="More">' + icon('more') + '</button>';
      var initials = (user.username || user.display_name || '?').charAt(0).toUpperCase();
      html += '<div class="wv-avatar" onclick="navigate(getProfileHref())" title="My profile">' + initials + '</div>';
    } else {
      html += '<a href="/register" class="wv-pill" style="padding:7px 14px;font-size:12.5px;background:transparent;color:var(--text-2);">Sign up</a>';
      html += '<a href="/login" class="wv-pill is-active" style="padding:8px 22px;font-size:13px;">Log in</a>';
    }
    html += '</div>';
    return html;
  }

  function _searchInputHTML(placeholder) {
    return icon('search') +
      '<input id="wv-search-inp" placeholder="' + placeholder + '" autocomplete="off" ' +
      'oninput="window._topbarSuggest(this)" onfocus="window._topbarSuggest(this)" ' +
      'onkeydown="if(event.key===\'Enter\'){var q=this.value.trim();if(q){document.getElementById(\'wv-suggest\')&&document.getElementById(\'wv-suggest\').remove();navSearch(q);}}">';
  }

  // Spotify: one bar across the whole window. Mark on the left, Home and the
  // search pill dead centre, account cluster on the right.
  function _topbarSpotify(isLoggedIn, user) {
    var cur = pageId();
    var html = '<button id="wv-menu-btn" class="wv-icon-circle" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu">' + icon('menu') + '</button>';
    html += '<div class="sp-top-l">' +
      '<a href="/index" class="sp-mark" onclick="navigate(\'/index\');return false;" aria-label="wavernrs">' +
      '<img src="/logo.png" srcset="/logo.png 1x, /logo@2x.png 2x" alt="" width="32" height="32"></a>' +
      '</div>';
    html += '<div class="wv-topbar-mobile-logo">wavernrs</div>';
    html += '<div class="sp-top-c">' +
      '<a href="/index" class="sp-home' + (cur === 'home' ? ' is-active' : '') + '" title="Home" ' +
        'onclick="navigate(\'/index\');return false;">' + icon('home') + '</a>' +
      '<div class="wv-topbar-search sp-search-wrap">' +
        '<div class="wv-input wv-search-wrap sp-search" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
        _searchInputHTML('What do you want to play?') +
        '<span class="sp-search-div"></span>' +
        '<a href="/browse" class="sp-search-browse" title="Browse" onclick="navigate(\'/browse\');return false;">' + icon('archive') + '</a>' +
        '</div></div>' +
      '</div>';
    html += '<button id="wv-search-btn-mobile" class="wv-icon-circle" onclick="navigate(\'/search\')" style="display:none;" aria-label="Search">' + icon('search') + '</button>';
    html += _topRightHTML(isLoggedIn, user, '');
    return html;
  }

  function buildTopbarHTML() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
    var isLoggedIn = !!localStorage.getItem('token');
    if (_skin() === 'spotify') return _topbarSpotify(isLoggedIn, user);

    var html = '<button id="wv-menu-btn" class="wv-icon-circle" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu">' + icon('menu') + '</button>';
    html += '<div class="wv-topbar-nav">' +
      '<button onclick="history.back()" aria-label="Back" title="Back">‹</button>' +
      '<button onclick="history.forward()" aria-label="Forward" title="Forward">›</button>' +
      '</div>';

    html += '<div class="wv-topbar-mobile-logo">wavernrs</div>';

    html += '<div class="wv-topbar-search">' +
      '<div class="wv-input wv-search-wrap" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
      _searchInputHTML('What do you want to play?') +
      '</div></div>';
    html += '<button id="wv-search-btn-mobile" class="wv-icon-circle" onclick="navigate(\'/search\')" style="display:none;" aria-label="Search">' + icon('search') + '</button>';
    html += _topRightHTML(isLoggedIn, user,
      isLoggedIn && user ? '<a href="/upload" class="wv-pill" style="padding:7px 14px;font-size:12.5px;background:rgba(0,0,0,0.55);" onclick="navigate(\'/upload\');return false;">Upload</a>' : '');
    return html;
  }

  // ── Topbar live search ───────────────────────────────────────
  // Debounced /api/search as you type; Enter still goes to the full page.
  var _sugTimer = null, _sugSeq = 0;
  function _closeSuggest() { var el = document.getElementById('wv-suggest'); if (el) el.remove(); }
  function _sugRow(href, art, title, sub, round) {
    return '<a class="wv-sug-row" href="' + href + '" onclick="navigate(\'' + href + '\');return false;">' +
      '<div class="wv-lib-art' + (round ? ' round' : '') + '" style="width:36px;height:36px;' + (art ? '' : 'background:' + coverGradient(title)) + '">' + (art ? '<img src="' + _escL(art) + '" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
      '<div class="wv-lib-meta"><div class="wv-lib-t">' + _escL(title) + '</div><div class="wv-lib-s">' + _escL(sub) + '</div></div></a>';
  }
  window._topbarSuggest = function(inp) {
    var q = (inp.value || '').trim();
    clearTimeout(_sugTimer);
    if (q.length < 2) { _closeSuggest(); return; }
    _sugTimer = setTimeout(function() {
      var seq = ++_sugSeq;
      fetch((typeof API_BASE !== 'undefined' ? API_BASE : '/api') + '/search?q=' + encodeURIComponent(q))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
          if (!d || seq !== _sugSeq || document.activeElement !== inp) return;
          var rows = [];
          (d.artists || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/artist?id=' + a.id, a.profile_image_url, a.display_name, 'Artist', true)); });
          (d.albums || []).slice(0, 4).forEach(function(a) { rows.push(_sugRow('/album?id=' + a.id, a.cover_url, a.title, 'Comp · ' + (a.artists ? a.artists.display_name : ''))); });
          (d.tracks || []).slice(0, 4).forEach(function(t) { rows.push(_sugRow('/track?id=' + t.id, t.cover_url || (t.albums && t.albums.cover_url), t.title, 'Edit · ' + (t.artists ? t.artists.display_name : ''))); });
          (d.archived || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/album?id=' + a.id, a.cover_url, a.title, 'Archive · ' + (a.archive_artist_name || ''))); });
          var el = document.getElementById('wv-suggest');
          if (!el) {
            el = document.createElement('div'); el.id = 'wv-suggest';
            var wrap = inp.closest('.wv-topbar-search'); (wrap || document.body).appendChild(el);
          }
          el.innerHTML = (rows.length ? rows.join('') : '<div class="wv-lib-s" style="padding:12px 14px;">No matches</div>') +
            '<a class="wv-sug-all" href="/search?q=' + encodeURIComponent(q) + '" onclick="navSearch(' + JSON.stringify(q).replace(/"/g, '&quot;') + ');return false;">See all results for “' + _escL(q) + '”</a>';
        }).catch(function() {});
    }, 180);
  };
  document.addEventListener('click', function(e) { if (!e.target.closest('#wv-suggest') && !e.target.closest('.wv-topbar-search')) _closeSuggest(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') _closeSuggest(); });
  window.addEventListener('popstate', _closeSuggest);

  // ── Shared helper: resolve the current user's public profile URL ──
  function getProfileHref() {
    return '/dashboard';
  }
  window.getProfileHref = getProfileHref;

  // ── Mobile tabs ───────────────────────────────────────────────
  function buildMobileTabsHTML() {
    var cur = pageId();
    var tabs = [
      { id: 'home', label: 'Home', href: '/index', ic: 'home' },
      { id: 'browse', label: 'Browse', href: '/browse', ic: 'discover' },
      { id: 'search', label: 'Search', href: '/search', ic: 'search' },
      { id: 'library', label: 'Library', href: '/library', ic: 'list' },
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
    document.querySelectorAll('.wv-side-foot a[data-page]').forEach(function(el) {
      el.classList.toggle('is-active', el.dataset.page === cur);
    });
  }
  window._updateNavActive = updateActive;

  // ── More menu (profile dropdown) ─────────────────────────────
  window._toggleMoreMenu = function(e) {
    e.stopPropagation();
    var existing = document.getElementById('wv-more-menu');
    if (existing) { existing.remove(); return; }

    var btn = document.getElementById('wv-more-btn');
    var r = btn ? btn.getBoundingClientRect() : { bottom: 60, right: 200 };

    var menu = document.createElement('div');
    menu.id = 'wv-more-menu';
    menu.className = '';
    menu.style.cssText = 'position:fixed;top:' + (r.bottom + 6) + 'px;right:' + (window.innerWidth - r.right) + 'px;border-radius:14px;padding:6px 0;min-width:170px;z-index:9999;font-size:13px;';

    var isLight = document.body.classList.contains('theme-light');
    var items = [
      ['Profile', function() { navigate('/dashboard'); }],
      ['Settings', function() { navigate('/settings'); }],
      [isLight ? 'Dark mode' : 'Light mode', function() { window.setTheme(isLight ? 'dark' : 'light'); }],
      ['Match my device', function() { window.setTheme('system'); if (typeof wvToast === 'function') wvToast('Theme follows your device'); }],
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

  // ── Notification panel ────────────────────────────────────────
  var _notifCache = null;

  function _escN(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _notifIcon(type) {
    var icons = {
      like:              '❤️',
      like_milestone:    '🏆',
      stream_milestone:  '🎵',
      follower:          '👤',
      follower_milestone:'🌟',
      comment:           '💬',
    };
    return icons[type] || '🔔';
  }

  function _notifTimeAgo(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }

  function _notifHref(n) {
    if (!n || !n.entity_id) return '';
    if (n.entity_type === 'track') return '/track?id=' + n.entity_id;
    if (n.entity_type === 'album') return '/album?id=' + n.entity_id;
    if (n.entity_type === 'artist') return '/artist?id=' + n.entity_id;
    return '';
  }

  window._openNotif = function (id, el, href) {
    window._markNotifRead(id, el);
    var panel = document.getElementById('wv-notif-panel');
    if (panel) panel.classList.remove('open');
    if (href && typeof navigate === 'function') navigate(href);
  };

  function _renderNotifPanel(notifs) {
    var panel = document.getElementById('wv-notif-panel');
    if (!panel) return;
    if (!notifs || !notifs.length) {
      panel.querySelector('.wv-notif-list').innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--text-3);font-size:13px;">No notifications yet</div>';
      return;
    }
    panel.querySelector('.wv-notif-list').innerHTML = notifs.map(function(n) {
      var href = _notifHref(n);
      return '<div class="wv-notif-item' + (n.read ? '' : ' unread') + (href ? ' wv-notif-link' : '') + '" onclick="window._openNotif(\'' + n.id + '\',this,\'' + href + '\')">' +
        '<div class="wv-notif-icon">' + _notifIcon(n.type) + '</div>' +
        '<div class="wv-notif-body">' +
          '<div class="wv-notif-title">' + _escN(n.title || '') + '</div>' +
          (n.body ? '<div class="wv-notif-desc">' + _escN(n.body) + '</div>' : '') +
          '<div class="wv-notif-time">' + _notifTimeAgo(n.created_at) + '</div>' +
        '</div>' +
        (!n.read ? '<div class="wv-notif-unread-dot"></div>' : '') +
      '</div>';
    }).join('');
  }

  window._markNotifRead = function(id, el) {
    var token = localStorage.getItem('token');
    if (!token) return;
    if (el) el.classList.remove('unread');
    var dot = el ? el.querySelector('.wv-notif-unread-dot') : null;
    if (dot) dot.remove();
    fetch(API_BASE + '/notifications/' + id + '/read', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token },
    }).catch(function(){});
    // Update cache
    if (_notifCache) {
      _notifCache.forEach(function(n) { if (n.id === id) n.read = true; });
    }
    _updateNotifDot();
  };

  window._markAllNotifsRead = function() {
    var token = localStorage.getItem('token');
    if (!token) return;
    fetch(API_BASE + '/notifications/read-all', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
    }).catch(function(){});
    if (_notifCache) _notifCache.forEach(function(n) { n.read = true; });
    _updateNotifDot();
    var panel = document.getElementById('wv-notif-panel');
    if (panel) {
      panel.querySelectorAll('.wv-notif-item').forEach(function(el) {
        el.classList.remove('unread');
        var d = el.querySelector('.wv-notif-unread-dot');
        if (d) d.remove();
      });
    }
  };

  function _updateNotifDot() {
    var dot = document.getElementById('wv-notif-dot');
    if (!dot) return;
    var unread = _notifCache ? _notifCache.filter(function(n) { return !n.read; }).length : 0;
    dot.style.display = unread ? 'block' : 'none';
    dot.textContent = unread > 9 ? '9+' : (unread || '');
    dot.classList.toggle('wv-notif-count', unread > 0);
    var bell = document.getElementById('wv-notif-btn');
    if (bell) bell.setAttribute('aria-label', unread ? unread + ' unread notification' + (unread === 1 ? '' : 's') : 'Notifications');
  }

  function _loadNotifications() {
    var token = localStorage.getItem('token');
    if (!token) return;
    fetch(API_BASE + '/notifications', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) {
          _notifCache = data;
          _updateNotifDot();
          var panel = document.getElementById('wv-notif-panel');
          if (panel) _renderNotifPanel(data);
        }
      })
      .catch(function(){});
  }

  window._toggleNotifPanel = function(e) {
    e.stopPropagation();
    var existing = document.getElementById('wv-notif-panel');
    if (existing) { existing.remove(); return; }

    var btn = document.getElementById('wv-notif-btn');
    var r = btn ? btn.getBoundingClientRect() : { bottom: 60, right: 260 };

    var panel = document.createElement('div');
    panel.id = 'wv-notif-panel';
    panel.className = '';
    panel.style.cssText = 'position:fixed;top:' + (r.bottom + 6) + 'px;right:' + (window.innerWidth - r.right) + 'px;border-radius:16px;width:340px;max-height:480px;z-index:9999;display:flex;flex-direction:column;overflow:hidden;';

    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--hair);">' +
        '<div style="font-size:14px;font-weight:700;letter-spacing:-0.01em;">Notifications</div>' +
        '<button onclick="window._markAllNotifsRead()" style="font-size:11.5px;color:var(--text-3);background:none;border:none;cursor:pointer;padding:2px 0;">Mark all read</button>' +
      '</div>' +
      '<div class="wv-notif-list" style="overflow-y:auto;flex:1;padding:6px 0;">' +
        '<div style="text-align:center;padding:32px 16px;color:var(--text-3);font-size:13px);">Loading…</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Load / show cached
    if (_notifCache) {
      _renderNotifPanel(_notifCache);
    }
    _loadNotifications();

    setTimeout(function() {
      document.addEventListener('click', function handler(ev) {
        if (!panel.contains(ev.target)) {
          panel.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  };

  // Poll for new notifications every 60s while logged in
  (function _startNotifPolling() {
    if (!localStorage.getItem('token')) return;
    _loadNotifications();
    setInterval(function() {
      if (localStorage.getItem('token')) _loadNotifications();
    }, 180000);
  })();

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

  // Set the fixed page background to an image, blurred + darkened — the same
  // Spotify/Apple-Music look the home hero uses. Pass a falsy url to clear it
  // back to the default gradient. Used by artist/album/charts/you/discover/
  // upload pages so each page's background reflects its content.
  // The page wash: sample the artwork's dominant hue and paint the top of
  // the content column with it. No image is ever drawn as a background.
  var _washGen = 0;
  function _applyWash(c) {
    var root = document.getElementById('wv-root');
    if (!root) return;
    var light = document.body.classList.contains('theme-light');
    var val = c
      ? (light ? 'hsl(' + c.h1 + ', ' + Math.min(60, c.s1) + '%, 84%)'
               : 'hsl(' + c.h1 + ', ' + Math.min(55, c.s1) + '%, 24%)')
      : '';
    if (val) root.style.setProperty('--wv-wash', val); else root.style.removeProperty('--wv-wash');
  }
  window.setPageBgImage = function(url, seed) {
    var gen = ++_washGen;
    if (!url) { _applyWash(seed ? coverHues(seed) : null); return; }
    if (typeof extractCoverHues === 'function') {
      extractCoverHues(url, seed || url, function(colors, fromImage) { if (gen === _washGen) _applyWash(fromImage === false ? null : colors); });
    } else {
      _applyWash(typeof coverHues === 'function' ? coverHues(seed || url) : null);
    }
  };
  // Theme: dark unless someone has picked otherwise. 'system' follows the device.
  // Two of them are full skins that restyle the shell, not just recolour it.
  // Applied to body + app root without a reload, and available logged out.
  var THEMES = {
    dark:    { label: 'Default',      base: 'dark',  meta: '#0d0d15' },
    light:   { label: 'White',        base: 'light', meta: '#f7f7fb' },
    spotify: { label: 'Spotify',      base: 'dark',  meta: '#000000' },
    apple:   { label: 'Apple Music',  base: 'light', meta: '#fafafa' },
    system:  { label: 'Match device', base: 'dark',  meta: '#0d0d15' },
  };
  var SKINS = ['spotify', 'apple'];
  var THEME_ORDER = ['dark', 'light', 'spotify', 'apple', 'system'];
  window.WV_THEMES = THEMES;
  window.WV_THEME_ORDER = THEME_ORDER;

  function _systemTheme() {
    try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (_) { return 'dark'; }
  }
  function _storedTheme() {
    var v;
    try { v = localStorage.getItem('wv_theme'); } catch (_) { v = null; }
    return THEMES[v] ? v : 'dark';
  }
  // Every theme carries a light/dark base so the older .theme-light rules
  // keep working underneath a skin.
  function _themeClasses(t) {
    var def = THEMES[t] || THEMES.dark;
    var out = ['theme-' + def.base];
    if (SKINS.indexOf(t) >= 0) out.push('theme-' + t);
    return out;
  }
  window._themeClasses = function (t) { return _themeClasses(t).join(' '); };

  // One-off move to dark for anyone still on light or following their device.
  // Runs once per browser; after that whatever they pick is respected.
  (function _migrateToDark() {
    try {
      if (localStorage.getItem('wv_theme_dark_default') === '1') return;
      localStorage.setItem('wv_theme_dark_default', '1');
      var cur = localStorage.getItem('wv_theme');
      if (cur !== 'dark') localStorage.setItem('wv_theme', 'dark');
    } catch (_) {}
  })();

  function _paintTheme(t) {
    var def = THEMES[t] || THEMES.dark;
    var add = _themeClasses(t);
    [document.body, document.getElementById('wv-root'), document.getElementById('wv-lockscreen')].forEach(function(el) {
      if (!el) return;
      el.classList.remove('theme-light', 'theme-dark', 'theme-spotify', 'theme-apple');
      add.forEach(function(c) { el.classList.add(c); });
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', def.meta);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = def.base;
  }
  window.setTheme = function(t) {
    t = THEMES[t] ? t : 'dark';
    try { localStorage.setItem('wv_theme', t); } catch (_) {}
    _paintTheme(t === 'system' ? _systemTheme() : t);
    document.querySelectorAll('input[name="wv-theme"]').forEach(function(r) { r.checked = r.value === t; });
    document.querySelectorAll('.wv-theme-card').forEach(function(c) {
      c.classList.toggle('is-active', c.getAttribute('data-theme') === t);
    });
    _reskin();
    try { document.dispatchEvent(new CustomEvent('wv-theme-change', { detail: { theme: t } })); } catch (_) {}
  };
  // Spotify and Apple Music change the shell, not just the palette, so a
  // switch between skins rebuilds the top bar, sidebar and drawer in place.
  var _lastSkin = null;
  // Spotify's "now playing view" button, at the head of the right-hand
  // group of the player. Hidden by CSS under the other themes.
  var NP_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M11.196 8 6 5v6l5.196-3z"/>' +
    '<path d="M15.002 1.75A1.75 1.75 0 0 0 13.252 0h-10.5a1.75 1.75 0 0 0-1.75 1.75v12.5c0 .966.783 1.75 1.75 1.75h10.5a1.75 1.75 0 0 0 1.75-1.75V1.75zm-1.75-.25a.25.25 0 0 1 .25.25v12.5a.25.25 0 0 1-.25.25h-10.5a.25.25 0 0 1-.25-.25V1.75a.25.25 0 0 1 .25-.25h10.5z"/></svg>';

  function _ensureNPButton(bar) {
    var vol = bar.querySelector('.player-volume');
    if (!vol || document.getElementById('sp-np-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'sp-np-btn';
    btn.className = 'player-btn player-icon-btn sp-np-btn';
    btn.type = 'button';
    btn.title = 'Now playing view';
    btn.setAttribute('aria-label', 'Now playing view');
    btn.innerHTML = NP_ICON;
    btn.onclick = function () { if (typeof window._wvToggleNP === 'function') window._wvToggleNP(); };
    vol.insertBefore(btn, vol.firstChild);
    if (typeof window._wvRenderNP === 'function') window._wvRenderNP();
  }

  function _applyPlayerSkin(tries) {
    var bar = document.querySelector('.player-bar');
    if (!bar) { if ((tries || 0) < 25) setTimeout(function () { _applyPlayerSkin((tries || 0) + 1); }, 400); return; }
    _ensureNPButton(bar);
    var controls = bar.querySelector('.player-controls');
    var vol = bar.querySelector('.player-volume');
    var mute = document.getElementById('player-mute-btn');
    var slider = document.getElementById('volume-slider');
    if (!controls || !vol || !mute || !slider) return;
    if (_skin() === 'apple') {
      if (mute.parentNode !== controls) { controls.appendChild(mute); controls.appendChild(slider); }
    } else if (mute.parentNode !== vol) {
      vol.insertBefore(slider, vol.firstChild);
      vol.insertBefore(mute, vol.firstChild);
    }
  }
  window._applyPlayerSkin = _applyPlayerSkin;

  function _reskin() {
    var now = _skin();
    _applyPlayerSkin();
    if (now === _lastSkin) return;
    _lastSkin = now;
    var top = document.getElementById('wv-topbar');
    if (top) top.innerHTML = buildTopbarHTML();
    var side = document.getElementById('wv-sidebar');
    if (side) side.innerHTML = buildSidebarHTML();
    var drawer = document.getElementById('wv-drawer');
    if (drawer) drawer.innerHTML = buildSidebarHTML(true);
    if (typeof window._checkMobileTopbar === 'function') window._checkMobileTopbar();
    try { _renderLib(); } catch (_) {}
    if (typeof window._presenceRefresh === 'function') window._presenceRefresh();
    if (typeof window._wvRenderNP === 'function') window._wvRenderNP();
  }
  window._reskin = _reskin;

  window.getTheme = function() {
    var t = _storedTheme();
    if (t === 'system') t = _systemTheme();
    return (THEMES[t] || THEMES.dark).base;
  };
  window.getThemeName = function() { var t = _storedTheme(); return t === 'system' ? _systemTheme() : t; };
  window.getThemePref = function() { return _storedTheme(); };
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
      if (_storedTheme() === 'system') _paintTheme(_systemTheme());
    });
  } catch (_) {}
  window.setPageWash = function(seed) { _washGen++; _applyWash(seed ? coverHues(seed) : null); };

  function initShell() {
    // Inject favicon once
    if (!document.querySelector('link[rel="icon"]')) {
      var fav = document.createElement('link');
      fav.rel = 'icon'; fav.type = 'image/x-icon'; fav.href = '/icon.ico';
      document.head.appendChild(fav);
    }

    // Inject PWA manifest once
    if (!document.querySelector('link[rel="manifest"]')) {
      var man = document.createElement('link');
      man.rel = 'manifest'; man.href = '/manifest.json';
      document.head.appendChild(man);
    }

    var themePref = _storedTheme();
    var theme = themePref === 'system' ? _systemTheme() : themePref;

    var isAuthPage = location.pathname.endsWith('/login') || location.pathname.endsWith('/register');

    var viewEl = document.getElementById('view');
    var viewContent = viewEl ? viewEl.innerHTML : '';

    // Remove old nav / mobile-bottom-nav if present
    var oldNav = document.querySelector('nav:not(#wv-sidebar nav):not(#wv-drawer nav):not(#wv-mobile-tabs)');
    if (oldNav && !oldNav.closest('#wv-root')) oldNav.remove();
    var oldMobile = document.querySelector('.mobile-bottom-nav');
    if (oldMobile) oldMobile.remove();

    if (isAuthPage) {
      document.body.classList.add('wv-auth-body');
      _themeClasses(theme).forEach(function (c) { document.body.classList.add(c); });
      return;
    }

    var root = document.createElement('div');
    root.id = 'wv-root';
    root.className = 'wv-app ' + _themeClasses(theme).join(' ');

    root.innerHTML =
      // Animated page background
      '<div id="wv-page-bg" aria-hidden></div>' +
      // Topbar
      '<header id="wv-topbar" class="wv-topbar lg-large lg-highlight">' + buildTopbarHTML() + '</header>' +
      // Sidebar
      '<aside id="wv-sidebar" class="wv-sidebar lg-large">' + buildSidebarHTML() + '</aside>' +
      // Main content
      '<div id="wv-content"><div id="wv-banners"></div><div id="view">' + viewContent + '</div></div>' +
      // Now-playing column, used by the Spotify shell
      '<aside id="wv-np" class="sp-np" hidden></aside>' +
      // Player slot
      '<div id="wv-player-slot"></div>' +
      // Mobile-only elements (hidden on desktop via CSS)
      '<nav id="wv-mobile-tabs" class="wv-mobile-tabs">' + buildMobileTabsHTML() + '</nav>' +
      '<div id="wv-drawer-overlay" class="wv-drawer-overlay" onclick="window.closeMobileDrawer()"></div>' +
      '<aside id="wv-drawer" class="wv-drawer">' +
        buildSidebarHTML(true) +
      '</aside>';

    // Also apply theme class to body so anything appended outside #wv-root
    // (modals, dropdown menus) also inherits the CSS custom properties
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-spotify', 'theme-apple');
    _themeClasses(theme).forEach(function (c) { document.body.classList.add(c); });
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.insertBefore(root, document.body.firstChild);

    // The page's original #view was copied into the shell above. Drop the
    // stale one: it stays in the body off-screen otherwise, holding a second
    // copy of every id on the page.
    if (viewEl && viewEl.parentNode && !viewEl.closest('#wv-root')) viewEl.parentNode.removeChild(viewEl);

    // Mobile: show hamburger + search buttons in topbar
    var mq = window.matchMedia('(max-width: 768px)');
    function checkMobile() {
      var menuBtn = root.querySelector('#wv-menu-btn');
      var searchBtn = root.querySelector('#wv-search-btn-mobile');
      if (menuBtn) menuBtn.style.display = mq.matches ? 'flex' : 'none';
      if (searchBtn) searchBtn.style.display = mq.matches ? 'flex' : 'none';
    }
    window._checkMobileTopbar = function() {
      var menuBtn = document.getElementById('wv-menu-btn');
      var searchBtn = document.getElementById('wv-search-btn-mobile');
      var isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (menuBtn) menuBtn.style.display = isMobile ? 'flex' : 'none';
      if (searchBtn) searchBtn.style.display = isMobile ? 'flex' : 'none';
    };
    checkMobile();
    mq.addListener(checkMobile);
    _lastSkin = _skin();
    _applyPlayerSkin();
    _renderLib();
    if (localStorage.getItem('token')) _loadLibData();

    // Close the drawer when a link inside it is tapped. Delegated at the
    // drawer level: its contents are rebuilt on login/logout and after
    // library loads, which used to drop per-link handlers and leave the
    // drawer sitting open over the new page.
    ['wv-drawer', 'wv-mobile-tabs'].forEach(function(id) {
      var host = document.getElementById(id);
      if (!host) return;
      host.addEventListener('click', function(e) {
        var link = e.target.closest('a[href], .wv-tab-btn');
        if (!link) return;
        window.closeMobileDrawer();
      });
    });

    // ── Site lockdown check ───────────────────────────────────────
    // Admin panel is always accessible regardless of lockdown
    var isAdminPage = location.pathname.endsWith('/adminpanel');
    if (!isAdminPage) {
      _checkSiteLock(theme);
    }
  }

  function _checkSiteLock(theme) {
    // Already verified this session?
    if (sessionStorage.getItem('site_lock_verified')) return;

    // Only pre-render the lockscreen if the site was locked on the last check.
    // This avoids a flash-of-lockscreen on every page load when the site is open.
    // If it wasn't locked last time (or we've never checked), skip the immediate
    // render and wait for the API — the server blocks all content anyway.
    var wasLocked = localStorage.getItem('wv_site_was_locked') === '1';
    if (wasLocked) {
      _showLockCard(theme);
    }

    // Fetch lock status
    fetch(typeof API_BASE !== 'undefined' ? API_BASE + '/site/lock-status' : '/api/site/lock-status')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        localStorage.setItem('wv_site_was_locked', d.locked ? '1' : '0');
        if (!d.locked) {
          var el = document.getElementById('wv-lockscreen');
          if (el) el.remove();
        } else {
          // Locked — make sure the card is visible even if we skipped pre-render
          if (!document.getElementById('wv-lockscreen')) _showLockCard(theme);
        }
      })
      .catch(function() {
        // API error — don't block the user
        var el = document.getElementById('wv-lockscreen');
        if (el) el.remove();
      });
  }

  function _showLockCard(theme) {
    if (document.getElementById('wv-lockscreen')) return;
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
          if (d.access_token) localStorage.setItem('wv_site_access', d.access_token);
          // Reload so content refetches with the access token now that the
          // server-side gate will recognise this visitor.
          location.reload();
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
    if (topbar) { topbar.innerHTML = buildTopbarHTML(); if (window._checkMobileTopbar) window._checkMobileTopbar(); }
    var sidebar = document.getElementById('wv-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebarHTML();
    var drawer = document.getElementById('wv-drawer');
    if (drawer) drawer.innerHTML = buildSidebarHTML();
    var tabs = document.getElementById('wv-mobile-tabs');
    if (tabs) tabs.innerHTML = buildMobileTabsHTML();
    _renderLib();
  };

  // ── Site banners ──────────────────────────────────────────────
  // Escaped first, then links are made clickable, then a close button that
  // remembers the banner id so it stays gone for that browser.
  var BANNER_SEEN = 'wv_banners_dismissed';

  function _bannersDismissed() {
    try {
      var v = JSON.parse(localStorage.getItem(BANNER_SEEN) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
  }

  function _bannerBody(message) {
    var esc = String(message || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/https?:\/\/[^\s<]+/g, function (url) {
      var href = url.replace(/[.,;:!?)\]]+$/, '');
      var tail = url.slice(href.length);
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + href + '</a>' + tail;
    });
  }

  window._dismissBanner = function (id) {
    var seen = _bannersDismissed();
    if (seen.indexOf(id) < 0) seen.push(id);
    try { localStorage.setItem(BANNER_SEEN, JSON.stringify(seen.slice(-60))); } catch (_) {}
    var el = document.querySelector('.site-banner[data-id="' + id + '"]');
    if (el) el.remove();
  };

  window.renderSiteBanners = async function() {
    var container = document.getElementById('wv-banners');
    if (!container) return;
    try {
      var res = await fetch(API_BASE + '/site/banners');
      var banners = await res.json();
      if (!banners || !banners.length) { container.innerHTML = ''; return; }
      var seen = _bannersDismissed();
      var show = banners.filter(function (b) { return seen.indexOf(b.id) < 0; });
      container.innerHTML = show.map(function(b) {
        return '<div class="site-banner ' + (b.type || 'info') + '" data-id="' + String(b.id || '') + '">' +
          '<span class="site-banner-text">' + _bannerBody(b.message) + '</span>' +
          (b.id ? '<button class="site-banner-x" aria-label="Dismiss" title="Dismiss" ' +
            'onclick="window._dismissBanner(\'' + String(b.id).replace(/'/g, '') + '\')">&times;</button>' : '') +
          '</div>';
      }).join('');
    } catch (e) {
      container.innerHTML = '';
    }
  };

  // The Mod Panel / Archive Panel links must be re-earned from the server on every
  // full load — never trust persisted flags for the first paint.
  sessionStorage.removeItem('wv_is_mod');
  sessionStorage.removeItem('wv_is_archiver');

  initShell();
  // Load banners after shell exists
  window.renderSiteBanners();

  // Check moderator and archiver status, then inject nav links if applicable.
  // Runs AFTER initShell so the sidebar elements exist.
  (function _checkRoleStatus() {
    var token = localStorage.getItem('token');
    if (!token) { sessionStorage.removeItem('wv_is_mod'); sessionStorage.removeItem('wv_is_archiver'); sessionStorage.removeItem('wv_is_radio'); return; }
    sessionStorage.setItem('wv_roles_at', String(Date.now()));
    var base = typeof API_BASE !== 'undefined' ? API_BASE : '';
    var headers = { 'Authorization': 'Bearer ' + token };
    Promise.all([
      fetch(base + '/mod/check', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch(base + '/archive/check', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch(base + '/radio/mine', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
    ]).then(function(results) {
      var isMod = !!(results[0] && results[0].is_mod);
      var isArchiver = !!(results[1] && results[1].is_archiver);
      var rm = results[2] || {};
      var isRadio = !!(rm.available && (rm.is_mod || rm.is_host || (rm.stations && rm.stations.length)));
      var wasMod = sessionStorage.getItem('wv_is_mod') === 'true';
      var wasArchiver = sessionStorage.getItem('wv_is_archiver') === 'true';
      var wasRadio = sessionStorage.getItem('wv_is_radio') === 'true';
      sessionStorage.setItem('wv_is_mod', isMod ? 'true' : 'false');
      sessionStorage.setItem('wv_is_archiver', isArchiver ? 'true' : 'false');
      sessionStorage.setItem('wv_is_radio', isRadio ? 'true' : 'false');
      // Pages read these flags at script time, before this answer lands, so
      // tell them once it has.
      window.dispatchEvent(new CustomEvent('wv-roles', { detail: { isMod: isMod, isArchiver: isArchiver, isRadio: isRadio } }));
      if (isMod || isArchiver || isRadio || wasMod !== isMod || wasArchiver !== isArchiver || wasRadio !== isRadio) {
        var sidebar = document.getElementById('wv-sidebar');
        if (sidebar) sidebar.innerHTML = buildSidebarHTML();
        var drawer = document.getElementById('wv-drawer');
        if (drawer) drawer.innerHTML = buildSidebarHTML();
        _renderLib();
      }
    });
  })();
})();

// ── Marquee: scroll overflowing titles on hover ──────────────────────────────
// ── Image CDN: every remote <img> on the site is served resized as webp ──
// Templates keep writing the original URL; this rewrites the src to a
// wsrv.nl URL sized to the box the image is rendered in (times device pixel
// ratio). If the CDN fails for an image it falls back to the original once.
(function () {
  if (typeof window.wvImg !== 'function') return;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  // If the CDN itself is down, stop sending every image through it after a few
  // failures — covers then load straight from their origin.
  var cdnFails = 0, cdnOff = false;
  try { cdnOff = sessionStorage.getItem('wv_cdn_off') === '1'; } catch (_) {}
  function sizeFor(img) {
    var w = img.getAttribute('width') || img.dataset.size;
    if (w && !isNaN(+w)) return +w * DPR;
    var r = img.getBoundingClientRect();
    var px = Math.max(r.width, r.height);
    if (!px) {
      var p = img.parentElement; var pr = p ? p.getBoundingClientRect() : null;
      px = pr ? Math.max(pr.width, pr.height) : 0;
    }
    return (px || 320) * DPR;
  }
  function apply(img) {
    if (img._wvCdn) return;
    var src = img.getAttribute('src') || '';
    if (!/^https?:\/\//i.test(src) || /^https?:\/\/wsrv\.nl\//i.test(src)) return;
    try { if (new URL(src).origin === location.origin) return; } catch (_) { return; }
    img._wvCdn = true;
    img.dataset.wvOrig = src;
    if (cdnOff) {
      if (!img.getAttribute('loading')) img.loading = 'lazy';
      if (!img.getAttribute('decoding')) img.decoding = 'async';
      return;
    }
    img.src = window.wvImg(src, sizeFor(img));
    if (!img.getAttribute('loading')) img.loading = 'lazy';
    if (!img.getAttribute('decoding')) img.decoding = 'async';
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      if (img.dataset.wvOrig && img.src !== img.dataset.wvOrig) {
        cdnFails++;
        if (cdnFails >= 4 && !cdnOff) {
          cdnOff = true;
          try { sessionStorage.setItem('wv_cdn_off', '1'); } catch (_) {}
        }
        img.src = img.dataset.wvOrig;
      }
    });
  }
  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('img[src]') : []).forEach(apply); if (root.tagName === 'IMG') apply(root); }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes') { m.target._wvCdn = false; apply(m.target); return; }
      m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  scan(document);
})();

(function () {
  var SEL = '.wv-track-title,.track-row-title,.wv-comp-card-title,.scroll-card-title,.wv-card-title';
  function apply(el) {
    if (el._mq) return; el._mq = true;
    requestAnimationFrame(function () {
      var ov = el.scrollWidth - el.clientWidth;
      if (ov > 2) {
        // Wrap children in an inner span so the animation moves the text,
        // not the element itself (which would shift sibling flex items).
        if (!el.querySelector('.wv-mq-inner')) {
          var inner = document.createElement('span');
          inner.className = 'wv-mq-inner';
          while (el.firstChild) inner.appendChild(el.firstChild);
          el.appendChild(inner);
        }
        el.style.setProperty('--mq-dist', -(ov + 16) + 'px');
        el.style.setProperty('--mq-dur', Math.max(3, ov / 40) + 's');
        el.classList.add('wv-mq');
      }
    });
  }
  window.initMarquees = function (root) { (root || document).querySelectorAll(SEL).forEach(apply); };
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches(SEL)) apply(n);
        if (n.querySelectorAll) n.querySelectorAll(SEL).forEach(apply);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();

// ── Badge data: fetched once, cached for the session ────────────────────────
(function () {
  var _cache = null;
  window.getBadgeData = async function () {
    if (_cache) return _cache;
    try {
      var base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      _cache = await (await fetch(base + '/badges')).json();
    } catch { _cache = { verified_artists: [], highlighted_albums: [], exclusive_albums: [] }; }
    return _cache;
  };
  window.invalidateBadgeCache = function () { _cache = null; };
  // Pre-warm the cache as soon as the script loads so badges are ready by render time
  window.getBadgeData();
})();

// ── Ensure playlists.js and ratings.js exist on every page ──────────────────
// The router does not re-run <script src> tags, so pages that arrive through
// it need these pulled in. Take the cache-busting version from this file's own
// URL: hardcoding one meant a stale copy was fetched alongside the current one.
(function () {
  var self = document.querySelector('script[src*="layout.js"]');
  var ver = (self && self.src.indexOf('?') >= 0) ? self.src.slice(self.src.indexOf('?')) : '';
  function ensure(file, ready) {
    if (typeof window[ready] === 'function') return;
    if (document.querySelector('script[src*="' + file + '"]')) return;
    var s = document.createElement('script');
    s.src = '/js/' + file + ver;
    document.head.appendChild(s);
  }
  ensure('playlists.js', 'openAddToPlaylist');
  ensure('ratings.js', 'loadRatings');
})();

// ── Countdown / pre-launch lockdown ─────────────────────────────────────────
(function () {
  var BYPASS_KEY = 'wv_cd_bypass_2';
  var _cdTimer = null;
  var _cdAllowed = ['adminpanel', 'community', 'login', 'register'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tickCountdown(launchAt) {
    var diff = new Date(launchAt).getTime() - Date.now();
    if (diff <= 0) {
      localStorage.removeItem(BYPASS_KEY);
      var ov = document.getElementById('wv-cd-overlay');
      if (ov) ov.remove();
      if (_cdTimer) { clearInterval(_cdTimer); _cdTimer = null; }
      // Unwrap navigate if it was wrapped
      if (typeof window._cdOrigNavigate === 'function') {
        window.navigate = window._cdOrigNavigate;
        window._cdOrigNavigate = null;
      }
      return;
    }
    var days  = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins  = Math.floor((diff % 3600000) / 60000);
    var secs  = Math.floor((diff % 60000) / 1000);
    var d = document.getElementById('wv-cd-days');
    var h = document.getElementById('wv-cd-hours');
    var m = document.getElementById('wv-cd-mins');
    var s = document.getElementById('wv-cd-secs');
    if (d) d.textContent = pad(days);
    if (h) h.textContent = pad(hours);
    if (m) m.textContent = pad(mins);
    if (s) s.textContent = pad(secs);
  }

  function showCountdownOverlay(launchAt, hasPassword) {
    if (document.getElementById('wv-cd-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'wv-cd-overlay';
    ov.innerHTML =
      '<div class="wv-cd-inner">' +
        '<div class="wv-cd-logo">wavernrs</div>' +
        '<div class="wv-cd-sub">“welcome back” -mp</div>' +
        '<div class="wv-cd-timer">' +
          '<div class="wv-cd-unit"><span id="wv-cd-days">00</span><label>days</label></div>' +
          '<div class="wv-cd-unit"><span id="wv-cd-hours">00</span><label>hours</label></div>' +
          '<div class="wv-cd-unit"><span id="wv-cd-mins">00</span><label>minutes</label></div>' +
          '<div class="wv-cd-unit"><span id="wv-cd-secs">00</span><label>seconds</label></div>' +
        '</div>' +
        '<div class="wv-cd-links">' +
          '<button onclick="location.assign(\'/community\')" class="wv-pill brand">Community</button>' +
          '<button onclick="location.assign(\'/login\')" class="wv-pill">Log in</button>' +
          '<button onclick="location.assign(\'/register\')" class="wv-pill">Sign up</button>' +
        '</div>' +
        (hasPassword
          ? '<div class="wv-cd-pw-wrap">' +
              '<input type="password" id="wv-cd-pw" class="wv-input" placeholder="Have early access? Enter password…" onkeydown="if(event.key===\'Enter\')window._verifyCountdown()">' +
              '<button class="wv-pill" style="margin-top:10px;width:100%;" onclick="window._verifyCountdown()">Enter</button>' +
              '<div id="wv-cd-err" style="color:#f87171;font-size:13px;margin-top:8px;min-height:18px;"></div>' +
            '</div>'
          : '') +
      '</div>';
    document.body.appendChild(ov);
    tickCountdown(launchAt);
    _cdTimer = setInterval(function () { tickCountdown(launchAt); }, 1000);
  }

  function wrapNavigate(launchAt, hasPassword) {
    if (window._cdOrigNavigate) return; // already wrapped
    var orig = window.navigate;
    if (typeof orig !== 'function') return;
    window._cdOrigNavigate = orig;
    window.navigate = function(url) {
      var target;
      try { target = new URL(url, location.href); } catch(e) { return orig.apply(this, arguments); }
      var path = target.pathname;
      // Always allow community / auth pages — dismiss overlay and SPA-navigate
      // (login/register fall back to full reload inside the router since they have no #view)
      if (_cdAllowed.some(function(p) { return path.includes(p); })) {
        var ov = document.getElementById('wv-countdown-overlay');
        if (ov) ov.remove();
        return orig.apply(this, arguments);
      }
      // If bypass is active, pass through normally
      if (localStorage.getItem(BYPASS_KEY) === '1') {
        return orig.apply(this, arguments);
      }
      // Blocked — ensure overlay is shown
      showCountdownOverlay(launchAt, hasPassword);
    };
  }

  window._verifyCountdown = async function () {
    var pw = (document.getElementById('wv-cd-pw') || {}).value || '';
    var errEl = document.getElementById('wv-cd-err');
    try {
      var base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      var r = await fetch(base + '/site/countdown/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      var d = await r.json();
      if (d.ok) {
        localStorage.setItem(BYPASS_KEY, '1');
        if (d.access_token) localStorage.setItem('wv_site_access', d.access_token);
        // Reload so page content refetches with the early-access token (any
        // content requests that fired before unlock would have been 403'd).
        location.reload();
      } else {
        if (errEl) errEl.textContent = 'Wrong password.';
      }
    } catch (e) {
      if (errEl) errEl.textContent = 'Could not verify — check your connection.';
    }
  };

  // Run the check once on every page load
  (async function () {
    try {
      var base = typeof API_BASE !== 'undefined' ? API_BASE : '';
      var r = await fetch(base + '/site/countdown');
      var d = await r.json();

      if (!d.active || d.elapsed) {
        localStorage.removeItem(BYPASS_KEY);
        return;
      }

      // Countdown is active — wrap navigate to enforce access restrictions
      wrapNavigate(d.launch_at, d.has_password);

      // If already bypassed via password, allow free navigation
      if (localStorage.getItem(BYPASS_KEY) === '1') return;

      // Show overlay on restricted pages
      var isAllowedPage = _cdAllowed.some(function(p) { return location.pathname.includes(p); });
      if (!isAllowedPage) showCountdownOverlay(d.launch_at, d.has_password);
    } catch (_) {}
  })();
})();


// ── Star field: faint drifting points in page space; lines reach from the pointer to nearby ones ──
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var mobile = window.matchMedia('(max-width: 700px)').matches;
  function light() { return document.body.classList.contains('theme-light'); }
  function makeField(opts) {
    var c = opts.canvas || document.createElement('canvas');
    if (!opts.canvas) { c.id = opts.id; c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:-1;mix-blend-mode:screen;opacity:.9;'; }
    var host = null, OX = 0, OY = 0, W = 0, H = 0, DH = 0, dpr = 1;
    var ctx = c.getContext('2d'), stars = [], mx = -9999, my = -9999, mouseAt = 0, raf = null, running = false, n = 0;
    function mount() {
      host = opts.getHost();
      if (!host) { setTimeout(mount, 300); return; }
      if (!opts.canvas) { host.style.isolation = 'isolate'; host.insertBefore(c, host.firstChild); }
      resize(); start();
    }
    function visible() { return host && host.offsetWidth > 0 && host.offsetHeight > 0; }
    function resize() {
      if (!visible()) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = host.getBoundingClientRect();
      OX = r.left; OY = r.top; W = Math.round(r.width); H = Math.round(r.height);
      if (!opts.canvas) { c.style.left = OX + 'px'; c.style.top = OY + 'px'; }
      c.style.width = W + 'px'; c.style.height = H + 'px';
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      populate();
    }
    function populate() {
      DH = opts.scrolls ? Math.max(H, host.scrollHeight || H) : H;
      var want = Math.round((W * DH) / ((mobile ? 22000 : 13000) / (opts.density || 1)));
      while (stars.length < want) stars.push(mk());
      if (stars.length > want) stars.length = want;
    }
    function mk() {
      var sz = opts.size || 1;
      return { x: Math.random() * W, y: Math.random() * DH, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, r: (0.6 + Math.random() * 1.1) * sz, a: 0.25 + Math.random() * 0.5, tw: Math.random() * Math.PI * 2, ts: 0.004 + Math.random() * 0.012 };
    }
    function frame() {
      raf = null;
      if (!running) return;
      if (!visible()) { raf = requestAnimationFrame(frame); return; }
      if ((++n % 30) === 0) { var r = host.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== H || r.left !== OX || r.top !== OY) resize(); else if (opts.scrolls && (host.scrollHeight || 0) !== DH) populate(); }
      ctx.clearRect(0, 0, W, H);
      var isLight = light();
      c.style.mixBlendMode = opts.blend || (isLight ? 'multiply' : 'screen');
      var col = isLight ? '20,20,40' : '255,255,255';
      var near = mobile ? 90 : 130, near2 = near * near;
      var recent = Date.now() - mouseAt < 4000;
      var sy = opts.scrolls ? (host.scrollTop || 0) : 0;
      var pmy = my + sy;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.vx; s.y += s.vy; s.tw += s.ts;
        if (s.x < -6) s.x = W + 6; else if (s.x > W + 6) s.x = -6;
        if (s.y < -6) s.y = DH + 6; else if (s.y > DH + 6) s.y = -6;
        var vy = s.y - sy;
        if (vy < -8 || vy > H + 8) continue;
        var al = s.a * (0.65 + 0.35 * Math.sin(s.tw));
        ctx.beginPath(); ctx.arc(s.x, vy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')'; ctx.fill();
        if (recent) {
          var dx = s.x - mx, dy = s.y - pmy, d2 = dx * dx + dy * dy;
          if (d2 < near2) {
            var k = 1 - Math.sqrt(d2) / near;
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(s.x, vy);
            ctx.strokeStyle = 'rgba(' + col + ',' + (0.55 * k).toFixed(3) + ')'; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { running = false; }
    function point(x, y) { mx = x - OX; my = y - OY; mouseAt = Date.now(); }
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) { point(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    if (!opts.canvas) new MutationObserver(function () { if (host && !document.body.contains(c)) { host = null; mount(); } }).observe(document.body, { childList: true, subtree: false });
    mount();
  }
  makeField({ id: 'wv-stars', scrolls: true, getHost: function () { return document.getElementById('wv-content'); } });
  (function fs() {
    var cv = document.getElementById('wv-stars-fs');
    if (!cv) { setTimeout(fs, 500); return; }
    makeField({ canvas: cv, scrolls: false, density: 2.6, size: 0.6, blend: 'normal', getHost: function () { return document.getElementById('player-fullscreen'); } });
  })();
})();

/* ── Ownership review ──────────────────────────────────────────────────────
   Comps that landed on a profile automatically get shown to their supposed
   owner once. Nothing else happens on the page until every one is answered. */
(function () {
  if (!localStorage.getItem('token')) return;
  var API = (typeof API_BASE !== 'undefined' ? API_BASE : '/api');
  var esc = window.escHtml || function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); };
  var items = [], at = 0, decisions = [];

  function card() {
    var it = items[at];
    var pct = Math.round((at / items.length) * 100);
    return '<div style="max-width:440px;width:100%;background:var(--surface);border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.6);">' +
      '<div style="font-size:11.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);">Is this yours?</div>' +
      '<div style="font-size:13px;color:var(--text-2);line-height:1.55;margin:6px 0 16px;">' +
        'These were added to your profile automatically when you connected an account. Tell us which ones you actually made — the rest go back to the archive.' +
      '</div>' +
      '<div style="height:4px;border-radius:99px;background:var(--surface-3);overflow:hidden;margin-bottom:16px;">' +
        '<div style="height:100%;width:' + pct + '%;background:var(--brand);border-radius:99px;transition:width .2s;"></div></div>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px;">' +
        '<div style="width:76px;height:76px;border-radius:10px;overflow:hidden;background:var(--surface-3);flex-shrink:0;">' +
          (it.cover_url ? '<img src="' + esc(it.cover_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '') + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:16px;font-weight:800;line-height:1.25;">' + esc(it.title || 'Untitled') + '</div>' +
          '<div style="font-size:12px;color:var(--text-3);margin-top:3px;">' + (it.track_count || 0) + ' track' + (it.track_count === 1 ? '' : 's') + '</div>' +
          (it.shared_link ? '<div style="font-size:11.5px;color:var(--orange);margin-top:5px;">Came from a link someone posted</div>' : '') +
        '</div></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="wv-pill brand" style="flex:1;padding:11px;font-weight:700;" onclick="wvReview(true)">I made this</button>' +
        '<button class="wv-pill" style="flex:1;padding:11px;font-weight:700;" onclick="wvReview(false)">Not mine</button>' +
      '</div>' +
      '<div style="font-size:11.5px;color:var(--text-3);text-align:center;margin-top:12px;">' + (at + 1) + ' of ' + items.length +
        ' · <a href="/album?id=' + esc(it.id) + '" target="_blank" style="color:var(--brand);">open it</a></div>' +
      '</div>';
  }

  function paint() {
    var el = document.getElementById('wv-review-overlay');
    if (!el) return;
    if (at >= items.length) return submit(el);
    el.innerHTML = card();
  }

  async function submit(el) {
    el.innerHTML = '<div style="color:var(--text-2);font-size:14px;">Saving…</div>';
    try {
      await fetch(API + '/oauth/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ decisions: decisions }),
      });
    } catch (_) {}
    el.remove();
    document.body.style.overflow = '';
    if (decisions.some(function (d) { return !d.mine; })) location.reload();
  }

  window.wvReview = function (mine) {
    decisions.push({ album_id: items[at].id, mine: !!mine });
    at++;
    paint();
  };

  (async function () {
    var d;
    try {
      var r = await fetch(API + '/oauth/review', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      if (!r.ok) return;
      d = await r.json();
    } catch (_) { return; }
    items = (d && d.items) || [];
    if (!items.length) return;
    var el = document.createElement('div');
    el.id = 'wv-review-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    paint();
  })();
})();

// One shared "couldn't load this" block, so every page fails the same way
// instead of spinning forever or printing a database error at the reader.
window.wvErrorHTML = function (err, retryAttr) {
  var busy = typeof wvIsBusyError === 'function' && wvIsBusyError(err);
  var msg = busy ? (window.WV_BUSY_MSG || 'wavernrs is having trouble right now. Give it a minute and try again.')
                 : ((err && err.message) || 'Something went wrong.');
  var esc = typeof escHtml === 'function' ? escHtml : function (x) { return String(x); };
  return '<div class="wv-empty" style="grid-column:1/-1;padding:28px 16px;text-align:center;">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:6px;">' + (busy ? 'Can\u2019t reach wavernrs' : 'Couldn\u2019t load this') + '</div>' +
    '<div style="font-size:13px;color:var(--text-3);max-width:380px;margin:0 auto 14px;line-height:1.6;">' + esc(msg) + '</div>' +
    (retryAttr ? '<button class="wv-pill brand" onclick="' + retryAttr + '">Try again</button>' : '') +
    '</div>';
};
window.wvShowError = function (el, err, retryAttr) {
  var node = typeof el === 'string' ? document.getElementById(el) : el;
  if (!node) return;
  if (err && err.navAborted) return;
  node.innerHTML = window.wvErrorHTML(err, retryAttr);
};

// ── "can't reach wavernrs" banner ───────────────────────────────────────────
(function () {
  var el = null;
  function show() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'wv-offline-bar';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#5b4a2a;color:#ffe9b8;' +
      'font-size:12.5px;font-weight:600;text-align:center;padding:7px 12px;padding-top:calc(7px + env(safe-area-inset-top));' +
      'box-shadow:0 1px 0 rgba(0,0,0,.35);';
    el.textContent = 'Having trouble reaching wavernrs — some things may not load. Retrying…';
    document.body.appendChild(el);
  }
  function hide() { if (el) { el.remove(); el = null; } }
  window.addEventListener('wv-api-down', show);
  window.addEventListener('wv-api-ok', hide);
})();

// ── Toasts ──────────────────────────────────────────────────────────────────
// One place for short, non-blocking feedback. Pages used to invent their own
// alert box each time, or say nothing at all when an action succeeded.
(function () {
  var host = null;
  function ensureHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div');
    host.id = 'wv-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
    return host;
  }
  window.wvToast = function (message, kind, ms) {
    if (!message) return;
    var h = ensureHost();
    var t = document.createElement('div');
    t.className = 'wv-toast' + (kind ? ' wv-toast-' + kind : '');
    t.textContent = String(message);
    h.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    var life = ms || (kind === 'error' ? 5200 : 3200);
    var kill = function () {
      t.classList.remove('in');
      setTimeout(function () { t.remove(); if (host && !host.childElementCount) { host.remove(); host = null; } }, 220);
    };
    t.addEventListener('click', kill);
    setTimeout(kill, life);
    while (h.childElementCount > 4) h.firstElementChild.remove();
  };
})();

// ── Keyboard shortcuts ──────────────────────────────────────────────────────
window.wvShortcutsHelp = function () {
  var existing = document.getElementById('wv-keys');
  if (existing) { existing.remove(); return; }
  var rows = [
    ['Space', 'Play or pause'],
    ['← / →', 'Back or forward 10 seconds'],
    ['Shift + ← / →', 'Previous or next track'],
    ['Shift + ↑ / ↓', 'Volume'],
    ['S', 'Shuffle'],
    ['R', 'Repeat (queue → track → off)'],
    ['M', 'Mute'],
    ['/', 'Search'],
    ['T', 'Theme picker'],
    ['?', 'This list'],
    ['Esc', 'Close what is open'],
  ];
  var wrap = document.createElement('div');
  wrap.id = 'wv-keys';
  wrap.className = 'wv-keys-overlay';
  wrap.innerHTML = '<div class="wv-keys-card" role="dialog" aria-label="Keyboard shortcuts">' +
    '<div class="wv-keys-head">Keyboard shortcuts</div>' +
    '<dl class="wv-keys-list">' +
    rows.map(function (r) { return '<div><dt><kbd>' + r[0] + '</kbd></dt><dd>' + r[1] + '</dd></div>'; }).join('') +
    '</dl><button class="wv-keys-close" type="button">Close</button></div>';
  wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.classList.contains('wv-keys-close')) wrap.remove(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { wrap.remove(); document.removeEventListener('keydown', esc); } });
  document.body.appendChild(wrap);
};

// "T" opens the theme picker, alongside the other single-key shortcuts.
document.addEventListener('keydown', function (e) {
  if (e.key !== 't' && e.key !== 'T') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (typeof window.wvOpenThemePicker !== 'function') return;
  e.preventDefault();
  window.wvOpenThemePicker();
});

// "/" focuses search the way it does on GitHub and Reddit.
document.addEventListener('keydown', function (e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  var box = document.getElementById('wv-search-inp');
  if (!box && typeof navigate === 'function' && !/\/search\.html$/.test(location.pathname)) { e.preventDefault(); navigate('/search'); return; }
  if (!box) return;
  e.preventDefault();
  box.focus();
  box.select && box.select();
});

// Anyone can switch themes, signed in or not. The palette button in the top
// bar opens a picker; Spotify and Apple Music are full skins, not recolours.
var WV_THEME_SWATCH = {
  dark:    ['#121212', '#a78bfa', '#242424'],
  light:   ['#f6f6f6', '#6d4ee0', '#c9c9cf'],
  spotify: ['#000000', '#1db954', '#181818'],
  apple:   ['#fafafa', '#fa233b', '#d8d8dc'],
  system:  ['#121212', '#f6f6f6', '#a78bfa'],
};

function _themeIcon() {
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 2.9a9.1 9.1 0 0 0 0 18.2c1.3 0 2.1-.85 2.1-1.95 0-.52-.2-.98-.5-1.32-.3-.35-.48-.77-.48-1.26 0-1.1.88-1.97 1.97-1.97h1.68A4.36 4.36 0 0 0 21.1 12c0-5.03-4.08-9.1-9.1-9.1Z"/>' +
    '<circle cx="7.6" cy="12" r="1.05" fill="currentColor" stroke="none"/>' +
    '<circle cx="9.9" cy="8.1" r="1.05" fill="currentColor" stroke="none"/>' +
    '<circle cx="14.3" cy="7.7" r="1.05" fill="currentColor" stroke="none"/>' +
    '<circle cx="17.3" cy="10.8" r="1.05" fill="currentColor" stroke="none"/>' +
    '</svg>';
}
window._themeIcon = _themeIcon;

function _themeCardHTML(name) {
  var def = (window.WV_THEMES || {})[name];
  if (!def) return '';
  var sw = WV_THEME_SWATCH[name] || ['#121212', '#a78bfa', '#242424'];
  var cur = typeof window.getThemePref === 'function' ? window.getThemePref() : 'dark';
  return '<button type="button" class="wv-theme-card' + (cur === name ? ' is-active' : '') + '" data-theme="' + name + '">' +
    '<span class="wv-theme-swatch" style="background:' + sw[0] + ';">' +
      '<i style="background:' + sw[1] + ';"></i><i style="background:' + sw[2] + ';"></i>' +
    '</span>' +
    '<span class="wv-theme-meta"><b>' + def.label + '</b></span>' +
    '<span class="wv-theme-tick" aria-hidden="true">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.8 9.5 17.8 19.5 6.6"/></svg>' +
    '</span></button>';
}

window.wvOpenThemePicker = function () {
  var existing = document.getElementById('wv-theme-picker');
  if (existing) { existing.remove(); return; }
  var order = window.WV_THEME_ORDER || ['dark', 'light', 'spotify', 'apple', 'system'];
  var wrap = document.createElement('div');
  wrap.id = 'wv-theme-picker';
  wrap.className = 'wv-theme-picker';
  wrap.innerHTML = '<div class="wv-theme-panel" role="dialog" aria-label="Choose a theme">' +
    '<div class="wv-theme-head">Theme</div>' +
    '<div class="wv-theme-grid">' + order.map(_themeCardHTML).join('') + '</div>' +
    '</div>';
  wrap.addEventListener('click', function (e) {
    var card = e.target.closest ? e.target.closest('.wv-theme-card') : null;
    if (card) {
      var name = card.getAttribute('data-theme');
      window.setTheme(name);
      var def = (window.WV_THEMES || {})[name];
      if (typeof wvToast === 'function' && def) wvToast(def.label + ' theme');
      return;
    }
    if (e.target === wrap) wrap.remove();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { wrap.remove(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(wrap);
};

// Kept so older markup and shortcuts still land somewhere sensible.
window.wvCycleTheme = function () { window.wvOpenThemePicker(); };

document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('wv-theme-btn');
  if (btn) btn.innerHTML = _themeIcon();
});

// ── Who else is on the site right now ───────────────────────────────────────
(function () {
  var FACES = 4;
  var _people = [];
  var _timer = null;

  function initials(name) {
    var n = String(name || '?').trim();
    return (n[0] || '?').toUpperCase();
  }

  // plain skips the link, for use inside the dropdown rows, which are
  // themselves links — an anchor inside an anchor tears the row apart.
  function face(p, size, plain) {
    var s = size || 26;
    var title = p.username ? '@' + p.username : 'Someone';
    var inner = p.avatar
      ? '<img src="' + escHtml(p.avatar) + '" alt="" onerror="this.remove()">'
      : '<span>' + escHtml(initials(p.username)) + '</span>';
    var href = !plain && p.artist_id ? '/artist?id=' + encodeURIComponent(p.artist_id) : null;
    var open = href ? '<a href="' + href + '" onclick="event.preventDefault();navigate(\'' + href + '\')"' : '<span';
    return open + ' class="wv-face" style="width:' + s + 'px;height:' + s + 'px;" data-tip="' + escHtml(title) + '">' +
      inner + (href ? '</a>' : '</span>');
  }

  function render() {
    var box = document.getElementById('wv-presence');
    if (!box) return;
    if (!_people.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    var shown = _people.slice(0, FACES);
    var rest = _people.slice(FACES);
    box.innerHTML =
      '<div class="wv-faces">' + shown.map(function (p) { return face(p); }).join('') +
        (rest.length ? '<button class="wv-face wv-face-more" onclick="window._togglePresence(event)">+' + rest.length + '</button>' : '') +
      '</div>' +
      (rest.length ? '<div class="wv-presence-menu" id="wv-presence-menu" hidden>' +
        '<div class="wv-presence-head">' + _people.length + ' online now</div>' +
        _people.map(function (p) {
          var href = p.artist_id ? '/artist?id=' + encodeURIComponent(p.artist_id) : null;
          return '<' + (href ? 'a href="' + href + '" onclick="event.preventDefault();navigate(\'' + href + '\')"' : 'div') + ' class="wv-presence-row">' +
            face(p, 22, true) + '<span>' + escHtml(p.username ? '@' + p.username : 'Someone') + '</span>' +
            '</' + (href ? 'a' : 'div') + '>';
        }).join('') + '</div>' : '');
  }

  window._togglePresence = function (e) {
    if (e) e.stopPropagation();
    var m = document.getElementById('wv-presence-menu');
    if (m) m.hidden = !m.hidden;
  };
  document.addEventListener('click', function (e) {
    var m = document.getElementById('wv-presence-menu');
    if (m && !m.hidden && !e.target.closest('.wv-presence')) m.hidden = true;
  });

  async function beat() {
    try {
      var token = localStorage.getItem('token');
      var r = await fetch(API_BASE + '/site/presence', {
        method: token ? 'POST' : 'GET',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      if (!r.ok) return;
      var d = await r.json();
      // Everyone signed in and active in the last minute or so, you excluded.
      _people = (d.online || []).filter(function (p) {
        return p && p.username && p.id !== d.me;
      });
      render();
    } catch (_) {}
  }

  window._presenceRefresh = beat;
  function start() {
    if (_timer) return;
    beat();
    _timer = setInterval(beat, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();


// ── Now playing, the third column of the Spotify shell ──────────────────────
(function () {
  var cur = null;

  function open() {
    try { return localStorage.getItem('wv_np_open') !== '0'; } catch (_) { return true; }
  }

  function render() {
    var el = document.getElementById('wv-np');
    var root = document.getElementById('wv-root');
    if (!el || !root) return;
    var on = (typeof window._wvSkin === 'function' ? window._wvSkin() : '') === 'spotify' && !!cur && open();
    el.hidden = !on;
    root.classList.toggle('np-open', on);
    var btn = document.getElementById('sp-np-btn');
    if (btn) {
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (!on) { el.innerHTML = ''; return; }

    var art = cur.cover
      ? '<img src="' + escHtml(cur.cover) + '" alt="" onerror="this.remove()">'
      : '';
    el.innerHTML =
      '<div class="sp-np-head">' +
        '<b>' + escHtml(cur.title) + '</b>' +
        '<button class="sp-np-x" onclick="window._wvToggleNP()" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="sp-np-art" style="background:' + (cur.bg || 'var(--surface-2)') + '">' + art + '</div>' +
      '<div class="sp-np-meta">' +
        '<div class="sp-np-t" onclick="goToCurrentTrack&&goToCurrentTrack()">' + escHtml(cur.title) + '</div>' +
        '<div class="sp-np-a">' + escHtml(cur.artist) + '</div>' +
      '</div>' +
      '<div class="sp-np-card">' +
        '<div class="sp-np-card-h">Next in queue</div>' +
        '<div class="sp-np-card-b">' + escHtml(_nextUp()) + '</div>' +
      '</div>';
  }

  function _nextUp() {
    try {
      var q = window.playerQueue || window._queue;
      if (q && q.length) {
        var i = (window.queueIndex != null ? window.queueIndex : 0) + 1;
        if (q[i] && q[i].title) return q[i].title;
      }
    } catch (_) {}
    return 'Nothing queued';
  }

  window._wvNowPlaying = function (d) {
    cur = d && d.title && d.title !== '—' ? d : null;
    render();
  };
  window._wvRenderNP = render;
  window._wvToggleNP = function () {
    var showing = !!cur && open();
    try { localStorage.setItem('wv_np_open', showing ? '0' : '1'); } catch (_) {}
    if (!showing && !cur && typeof wvToast === 'function') wvToast('Play something to see it here');
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
