// WAVERNRS — App Shell
// Sidebar (nav + library) | topbar + content, player docked below.
(function () {
  'use strict';

  // ── SVG icon paths (Heroicons outline 24×24) ─────────────────
  var ICONS = {
    headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>',
    // Purpose-drawn on a single 24 grid: solid shapes, matched corner
    // radii, one optical weight. Filled rather than hairline-outlined so
    // they hold up at nav size and read as a set instead of stock clip art.
    home:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.2 2.6a1.25 1.25 0 0 1 1.6 0l8.4 7a1.2 1.2 0 0 1 .43.92v8.9A2.6 2.6 0 0 1 19.03 22H15.4a.85.85 0 0 1-.85-.85V16.4a2.55 2.55 0 0 0-5.1 0v4.75A.85.85 0 0 1 8.6 22H4.97a2.6 2.6 0 0 1-2.6-2.58v-8.9c0-.36.16-.7.43-.92Z"/></svg>',
    discover:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.7a9.3 9.3 0 1 0 0 18.6 9.3 9.3 0 0 0 0-18.6Zm4.05 5.25-2.42 5.68a1.2 1.2 0 0 1-.63.63l-5.68 2.42a.5.5 0 0 1-.66-.66l2.42-5.68c.12-.29.34-.51.63-.63l5.68-2.42a.5.5 0 0 1 .66.66Z"/></svg>',
    chart:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3.1" y="12.3" width="4.7" height="8.6" rx="1.7"/><rect x="9.65" y="7" width="4.7" height="13.9" rx="1.7"/><rect x="16.2" y="3.1" width="4.7" height="17.8" rx="1.7"/></svg>',
    list:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="5.1" width="18" height="2.7" rx="1.35"/><rect x="3" y="10.65" width="18" height="2.7" rx="1.35"/><rect x="3" y="16.2" width="11.5" height="2.7" rx="1.35"/></svg>',
    mic:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a3.8 3.8 0 0 0-3.8 3.8v5.6a3.8 3.8 0 0 0 7.6 0V6A3.8 3.8 0 0 0 12 2.2Z"/><path d="M18.4 10.6a.9.9 0 0 0-.9.9 5.5 5.5 0 0 1-11 0 .9.9 0 1 0-1.8 0 7.3 7.3 0 0 0 6.4 7.25V21H8.6a.9.9 0 1 0 0 1.8h6.8a.9.9 0 1 0 0-1.8h-2.5v-2.25a7.3 7.3 0 0 0 6.4-7.25.9.9 0 0 0-.9-.9Z"/></svg>',
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
      resources: 'archive',
      eras: 'browse',
      history: 'library',
      'archive-artist': 'archive',
      dashboard: 'profile',
      adminpanel: 'admin',
      'playlist-builder': 'playlists',
    };
    var KNOWN = ['browse', 'artists', 'stats', 'charts', 'archive', 'eras', 'library', 'resources',
      'feed', 'playlists', 'playlist', 'upload', 'settings', 'about', 'album', 'track', 'artist',
      'search', 'community', 'radio', 'lp', 'radiopanel', 'modpanel', 'archivepanel', 'archivetrackers', 'profile', 'admin', 'playlists',
      'music', 'tracker', 'notifications', 'wrapped', 'awards', 'whatsnew', 'games', 'status'];
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
    ['artists',   'Editors',   '/artists',   'profile'],
    ['music',     'Artists',   '/music',     'mic'],
    ['archive',   'Archive',   '/archive',   'archive'],
    ['radio',     'Radio',     '/radio',     'radio'],
    ['lp',        'Live LPs',  '/lp',        'headphones'],
    ['community', 'Community', '/community', 'community'],
  ];

  function _skin() {
    var t = _storedTheme();
    return (t === 'spotify' || t === 'apple') ? t : '';
  }
  window.wvIsVerified = function () {
    try { return localStorage.getItem('wv_verified') === '1' && !!localStorage.getItem('token'); } catch (_) { return false; }
  };
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
      '<div class="wv-lib-find"><input id="wv-lib-q" placeholder="search your library" oninput="window._libSearch(this.value)"></div>';
  }

  function _footHTML(isLoggedIn, profileHref) {
    var html = '<div class="wv-side-foot">';
    if (isLoggedIn) {
      html += '<a href="/feed" data-page="feed">Following</a>';
      html += '<a href="' + profileHref + '" data-page="profile">Profile</a>';
      html += '<a href="/notifications" data-page="notifications">Notifications</a>';
      html += '<a href="/settings" data-page="settings">Settings</a>';
      if (sessionStorage.getItem('wv_is_mod') === 'true') html += '<a href="/modpanel" data-page="modpanel">Mod panel</a>';
      if (sessionStorage.getItem('wv_is_archiver') === 'true') html += '<a href="/archivepanel" data-page="archivepanel">Archive panel</a>';
      if (sessionStorage.getItem('wv_can_at') === 'true') html += '<a href="/archivetrackers" data-page="archivetrackers">Archive trackers</a>';
      if (sessionStorage.getItem('wv_is_radio') === 'true') html += '<a href="/radiopanel" data-page="radiopanel">Radio panel</a>';
    } else {
      html += '<a href="/login">Log in</a><a href="/register">Sign up</a>';
    }
    html += '<a href="/wrapped" data-page="wrapped">Recap</a>';
    html += '<a href="/awards" data-page="awards">Hall of Fame</a>';
    html += '<a href="/whatsnew" data-page="whatsnew">What\u2019s new</a>';
    html += '<a href="/stats" data-page="stats">Stats</a>';
    html += '<a href="/about" data-page="about">About</a>';
    html += '<a href="/status" data-page="status">Status</a>';
    html += '<a href="https://discord.gg/j2jGmw5CZH" target="_blank" rel="noopener">Discord</a>';
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
        '<button class="sp-create" onclick="window.wvNewPlaylist()" title="New playlist">' + icon('plus') + '<span>Create</span></button>' +
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
        '<input id="wv-lib-q" placeholder="search your library" oninput="window._libSearch(this.value)">' +
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
      ['lp', 'Live LPs', '/lp', 'headphones'],
      ['charts', 'Charts', '/charts', 'chart'],
      ['community', 'Community', '/community', 'community'],
    ]);
    html += _amSection('Library', [
      ['library', 'Recently Added', '/library', 'list'],
      ['artists', 'Editors', '/artists', 'profile'],
      ['music', 'Artists', '/music', 'mic'],
      ['archive', 'Archive', '/archive', 'archive'],
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
          list.innerHTML = '<div class="wv-lib-empty"><b>Nothing played yet</b><p>play a comp or edit and itll show up here</p>' +
            '<a class="btn btn-secondary btn-sm" href="/browse" onclick="navigate(\'/browse\');return false;">Browse</a></div>';
          return;
        }
      } else {
        if (!loggedIn) {
          list.innerHTML = '<div class="wv-lib-empty"><b>Sign in to see your library</b><p>your liked comps, edits and playlists go here</p>' +
            '<a class="btn btn-primary btn-sm" href="/login">Log in</a></div>';
          return;
        }
        if (!_libData) { list.innerHTML = '<div class="wv-lib-empty" style="background:transparent;color:var(--text-3);font-size:12.5px;">Loading…</div>'; return; }
        if (_libKind === 'comps') items = (_libData.albums || []).map(function(a) { return { _type: 'album', id: a.id, title: a.title, cover_url: a.cover_url, artist_name: a.is_archive ? a.archive_artist_name : (a.artists && a.artists.display_name) }; });
        if (_libKind === 'edits') items = (_libData.tracks || []).map(function(t) { return { _type: 'track', id: t.id, title: t.title, cover_url: t.cover_url, artist_name: t.artists && t.artists.display_name }; });
        if (_libKind === 'playlists') items = (_libData.playlists || []).map(function(p) { return { _type: 'playlist', id: p.id, title: p.title, sub: 'Playlist · ' + (p.track_count || 0) + ' tracks' }; });
        if (!items.length) {
          var what = _libKind === 'playlists' ? 'playlists' : 'liked ' + _libKind;
          list.innerHTML = '<div class="wv-lib-empty"><b>No ' + what + ' yet</b><p>' + (_libKind === 'playlists' ? 'make one from the menu on any edit' : 'tap the heart on anything and itll show up here') + '</p></div>';
          return;
        }
      }
      if (_libQuery) {
        var q = _libQuery.toLowerCase();
        items = items.filter(function(it) { return String(it.title || '').toLowerCase().indexOf(q) !== -1 || String(it.artist_name || '').toLowerCase().indexOf(q) !== -1; });
        if (!items.length) { list.innerHTML = '<div class="wv-lib-empty" style="background:transparent;color:var(--text-3);font-size:12.5px;">no matches</div>'; return; }
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
      var unread = (window.wvNotif && window.wvNotif.state && window.wvNotif.state.unread) || 0;
      html += '<button type="button" class="wv-icon-circle" id="wv-notif-btn" title="Notifications" aria-haspopup="dialog" aria-expanded="false" ' +
              'aria-label="' + (unread ? unread + ' unread notification' + (unread === 1 ? '' : 's') : 'Notifications') + '" onclick="window._toggleNotifPanel(event)" style="position:relative;">' +
              icon('bell') +
              '<span id="wv-notif-dot"' + (unread ? ' class="wv-notif-count">' + (unread > 9 ? '9+' : unread) : ' style="display:none;">') + '</span>' +
              '</button>';
      html += '<button type="button" class="wv-icon-circle" id="wv-more-btn" onclick="window._toggleMoreMenu(event)" title="More" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">' + icon('more') + '</button>';
      html += '<button type="button" class="wv-avatar" id="wv-avatar-btn" onclick="window._wvAvatarTap(event)" title="Account" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">' + _avatarInner(user) + '</button>';
    } else {
      html += '<a href="/register" class="wv-pill wv-signup-pill" style="padding:7px 14px;font-size:12.5px;background:transparent;color:var(--text-2);">Sign up</a>';
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

    var html = '<button type="button" id="wv-menu-btn" class="wv-icon-circle" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu" aria-expanded="false" aria-controls="wv-drawer">' + icon('menu') + '</button>';
    html += '<div class="wv-topbar-nav">' +
      '<button type="button" id="wv-nav-back" onclick="history.back()" aria-label="Back" title="Back">' + NAV_CHEV_L + '</button>' +
      '<button type="button" id="wv-nav-fwd" onclick="history.forward()" aria-label="Forward" title="Forward">' + NAV_CHEV_R + '</button>' +
      '</div>';

    html += '<div class="wv-topbar-mobile-logo">wavernrs</div>';

    html += '<div class="wv-topbar-search">' +
      '<div class="wv-input wv-search-wrap" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
      _searchInputHTML('What do you want to play?') +
      '<button type="button" class="wv-kbd-chip" onmousedown="event.preventDefault()" onclick="event.stopPropagation();window._wvQuickOpen()" title="Quick search" aria-label="Open quick search">' + _kbdLabel() + '</button>' +
      '</div></div>';
    html += '<button id="wv-search-btn-mobile" class="wv-icon-circle" onclick="navigate(\'/search\')" style="display:none;" aria-label="Search">' + icon('search') + '</button>';
    html += _topRightHTML(isLoggedIn, user,
      isLoggedIn && user ? '<a href="/upload" class="wv-pill wv-upload-pill" style="padding:7px 14px;font-size:12.5px;background:rgba(0,0,0,0.55);" onclick="navigate(\'/upload\');return false;">Upload</a>' : '');
    return html;
  }

  // Spotify's phone app opens its side menu from your picture, top left;
  // everywhere else the picture opens the account menu.
  window._wvAvatarTap = function (e) {
    var phone = false;
    try { phone = window.matchMedia('(max-width: 768px)').matches; } catch (_) {}
    if (phone && _skin() === 'spotify' && typeof window.openMobileDrawer === 'function') { window.openMobileDrawer(); return; }
    _toggleAcctMenu(e, document.getElementById('wv-avatar-btn'));
  };

  var NAV_CHEV_L = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.6 5.4 8 12l6.6 6.6"/></svg>';
  var NAV_CHEV_R = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.4 5.4 16 12l-6.6 6.6"/></svg>';

  function _kbdLabel() {
    var mac = false;
    try { mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ''); } catch (_) {}
    return mac ? '<kbd>\u2318</kbd><kbd>K</kbd>' : '<kbd>Ctrl</kbd><kbd>K</kbd>';
  }
  window._wvQuickOpen = function () {
    if (typeof window.wvOpenPalette === 'function') { try { window.wvOpenPalette(); return; } catch (_) {} }
    var box = document.getElementById('wv-search-inp');
    if (box) { box.focus(); if (box.select) box.select(); }
  };

  function _navBtnsState() {
    var nav = window.navigation;
    if (!nav || typeof nav.canGoBack !== 'boolean') return;
    var b = document.getElementById('wv-nav-back'), f = document.getElementById('wv-nav-fwd');
    if (b) b.disabled = !nav.canGoBack;
    if (f) f.disabled = !nav.canGoForward;
  }
  window._wvNavBtnsState = _navBtnsState;
  try {
    if (window.navigation && window.navigation.addEventListener) {
      window.navigation.addEventListener('currententrychange', function () { setTimeout(_navBtnsState, 0); });
    }
  } catch (_) {}
  window.addEventListener('popstate', function () { setTimeout(_navBtnsState, 0); });

  // Your picture comes from the presence beat; the last one is kept so the
  // next load paints it straight away.
  function _myAvatarUrl() {
    try {
      var u = JSON.parse(localStorage.getItem('user') || 'null');
      var c = JSON.parse(localStorage.getItem('wv_me_avatar') || 'null');
      if (u && c && c.id && c.id === u.id && c.url) return String(c.url);
    } catch (_) {}
    return '';
  }
  function _avatarInner(user) {
    var initial = _escL(String((user && (user.username || user.display_name)) || '?').charAt(0).toUpperCase());
    var url = _myAvatarUrl();
    return '<span class="wv-avatar-i" aria-hidden="true">' + initial + '</span>' +
      (url ? '<img src="' + _escL(url) + '" alt="" onerror="this.remove()">' : '');
  }
  window._wvSetMyAvatar = function (id, url) {
    if (!id) return;
    var prev = '';
    try { prev = (JSON.parse(localStorage.getItem('wv_me_avatar') || 'null') || {}).url || ''; } catch (_) {}
    try { localStorage.setItem('wv_me_avatar', JSON.stringify({ id: id, url: url || '' })); } catch (_) {}
    if ((url || '') === prev && document.querySelector('.wv-avatar img, .wv-avatar .wv-avatar-i')) return;
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) {}
    document.querySelectorAll('#wv-avatar-btn, .wva-av').forEach(function (el) { el.innerHTML = _avatarInner(user); });
  };

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
      var base = (typeof API_BASE !== 'undefined' ? API_BASE : '/api');
      var yeP = Promise.race([
        fetch(base + '/ye/search?q=' + encodeURIComponent(q)).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
        new Promise(function(res) { setTimeout(function() { res(null); }, 700); })
      ]);
      fetch(base + '/search?q=' + encodeURIComponent(q))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) { return yeP.then(function(ye) { if (d) d._ye = ye; return d; }); })
        .then(function(d) {
          if (!d || seq !== _sugSeq || document.activeElement !== inp) return;
          var rows = [];
          var ye = d._ye || {}, enc = function (x) { return encodeURIComponent(x).replace(/'/g, '%27'); };
          (ye.albums || []).slice(0, 1).forEach(function(a) { rows.push(_sugRow('/resources?view=disco&album=' + enc(a.slug), a.cover_sm, a.title, 'Ye album · ' + a.year)); });
          (ye.songs || []).slice(0, 2).forEach(function(t) { rows.push(_sugRow('/resources?view=song&t=' + enc(t.title), t.cover, t.title, 'Ye song · ' + t.album)); });
          (d.artists || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/artist?id=' + a.id, a.profile_image_url, a.display_name, 'Artist', true)); });
          (d.albums || []).slice(0, 4).forEach(function(a) { rows.push(_sugRow('/album?id=' + a.id, a.cover_url, a.title, 'Comp · ' + (a.artists ? a.artists.display_name : ''))); });
          (d.tracks || []).slice(0, 4).forEach(function(t) { rows.push(_sugRow('/track?id=' + t.id, t.cover_url || (t.albums && t.albums.cover_url), t.title, 'Edit · ' + (t.artists ? t.artists.display_name : ''))); });
          (d.archived || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/album?id=' + a.id, a.cover_url, a.title, 'Archive · ' + (a.archive_artist_name || ''))); });
          var el = document.getElementById('wv-suggest');
          if (!el) {
            el = document.createElement('div'); el.id = 'wv-suggest';
            var wrap = inp.closest('.wv-topbar-search'); (wrap || document.body).appendChild(el);
          }
          el.innerHTML = (rows.length ? rows.join('') : '<div class="wv-lib-s" style="padding:12px 14px;">no matches</div>') +
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
    document.querySelectorAll('.sp-pin[data-page]').forEach(function(el) {
      el.classList.toggle('now', el.dataset.page === cur);
    });
    document.querySelectorAll('.sp-home').forEach(function(el) {
      el.classList.toggle('is-active', cur === 'home');
    });
    _navBtnsState();
    _closeShellOverlays();
  }
  window._updateNavActive = updateActive;

  // ── Shell styles: account menu, notification centre, top bar ──
  // Injected once so css/style.css keeps a single owner.
  var SHELL_CSS = [
    '.wv-topbar-nav button{display:grid;place-items:center;padding:0;font-size:0;transition:background .12s var(--ease),color .12s var(--ease),opacity .12s var(--ease)}',
    '.wv-topbar-nav button svg{width:18px;height:18px;display:block}',
    '.wv-topbar-nav button:not(:disabled):hover{background:rgba(0,0,0,.78)}',
    '.theme-light .wv-topbar-nav button:not(:disabled):hover{background:#fff}',
    '.wv-topbar-nav button:disabled{opacity:.38;cursor:default}',
    '.wv-kbd-chip{flex-shrink:0;display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 4px;margin-right:-6px;border:0;border-radius:6px;background:transparent;cursor:pointer;color:var(--text-3);font-family:inherit;transition:opacity .12s var(--ease),color .12s var(--ease)}',
    '.wv-kbd-chip kbd{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:5px;background:var(--hair);box-shadow:inset 0 0 0 1px var(--hair);font:600 11px/1 var(--font-sans);color:inherit}',
    '.wv-kbd-chip:hover{color:var(--text)}',
    '.wv-search-wrap:has(input:focus) .wv-kbd-chip,.wv-search-wrap:has(input:not(:placeholder-shown)) .wv-kbd-chip{opacity:0;pointer-events:none}',
    'button.wv-avatar{border:0;padding:0;font-family:inherit;overflow:hidden;position:relative;transition:transform 80ms var(--ease),box-shadow .12s var(--ease)}',
    '.wv-avatar img,.wva-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}',
    '.wv-avatar[aria-expanded="true"]{box-shadow:0 0 0 2px var(--brand)}',
    '#wv-more-btn{display:none}',
    '@media (max-width:768px){.theme-spotify #wv-more-btn{display:flex}}',
    '#wv-notif-dot.wv-notif-count{color:var(--on-brand);background:var(--brand)}',
    '@keyframes wvn-ring{0%{transform:rotate(0)}12%{transform:rotate(16deg)}26%{transform:rotate(-13deg)}40%{transform:rotate(9deg)}54%{transform:rotate(-6deg)}68%{transform:rotate(3deg)}82%,100%{transform:rotate(0)}}',
    '@keyframes wvn-badge{0%{transform:scale(.4)}60%{transform:scale(1.18)}100%{transform:scale(1)}}',
    '#wv-notif-btn.ring svg{animation:wvn-ring 1s var(--ease);transform-origin:50% 8%}',
    '#wv-notif-btn.ring #wv-notif-dot{animation:wvn-badge .45s var(--ease)}',
    '@keyframes wvn-pop{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1;transform:none}}',
    '@keyframes wvn-sheet{from{opacity:.4;transform:translateY(-14px)}to{opacity:1;transform:none}}',
    '@keyframes wvn-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes wvn-pulse{from{opacity:.5}to{opacity:1}}',

    '#wv-notif-panel.wvn-panel{position:fixed;z-index:9999;width:400px;display:flex;flex-direction:column;overflow:hidden;background:var(--elevated);border-radius:14px;padding:0;box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px var(--hair);transform-origin:top right;animation:wvn-pop .16s var(--ease)}',
    '.theme-light #wv-notif-panel.wvn-panel,.theme-apple #wv-notif-panel.wvn-panel{box-shadow:0 22px 56px rgba(20,20,40,.16),0 0 0 1px var(--hair)}',
    '#wv-notif-panel:focus,#wv-acct-menu:focus{outline:none}',
    '#wv-notif-panel.wvn-panel.is-sheet{border-radius:0 0 18px 18px;animation:wvn-sheet .2s var(--ease)}',
    '.wvn-scrim{position:fixed;left:0;right:0;bottom:0;z-index:9998;background:rgba(0,0,0,.5);animation:wvn-fade .2s var(--ease)}',
    '.wvn-head{display:flex;align-items:center;gap:8px;padding:14px 12px 10px 18px}',
    '.wvn-title{flex:1;min-width:0;display:flex;align-items:center;gap:8px;margin:0;font-size:17px;font-weight:800;letter-spacing:-.02em;color:var(--text)}',
    '.wvn-count{font-size:11.5px;font-weight:700;letter-spacing:0;padding:2px 8px;border-radius:999px;background:var(--brand-bg);color:var(--brand)}',
    '.wvn-textbtn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--text-2);font:600 12.5px var(--font-sans);cursor:pointer;white-space:nowrap;text-decoration:none;transition:background .12s var(--ease),color .12s var(--ease)}',
    '.wvn-textbtn svg{width:16px;height:16px}',
    '.wvn-textbtn:hover:not(:disabled){background:var(--hair);color:var(--text)}',
    '.wvn-textbtn:disabled{opacity:.4;cursor:default}',
    '.wvn-tabs{display:flex;gap:6px;padding:0 18px 12px;border-bottom:1px solid var(--hair)}',
    '.wvn-tab{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 13px;border:0;border-radius:999px;background:var(--hair);color:var(--text-2);font:600 12.5px var(--font-sans);cursor:pointer;transition:background .12s var(--ease),color .12s var(--ease)}',
    '.wvn-tab:hover{color:var(--text)}',
    '.wvn-tab.on{background:var(--text);color:var(--elevated)}',
    '.wvn-tab .n{font-size:11px;font-weight:700;opacity:.65}',
    '.wvn-list{flex:1;min-height:140px;overflow-y:auto;overscroll-behavior:contain;padding:0 0 8px;scrollbar-width:thin}',
    '.wvn-day{position:sticky;top:0;z-index:1;background:var(--elevated);padding:12px 18px 6px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-3)}',
    '.wvn-row{--tone:var(--brand);position:relative;display:flex;align-items:flex-start;gap:12px;margin:0 8px 2px;padding:10px;border-radius:10px;color:inherit;text-decoration:none;cursor:pointer;transition:background .12s var(--ease)}',
    '.wvn-row:hover{background:var(--hair)}',
    '.wvn-row.unread{background:color-mix(in srgb,var(--brand) 7%,transparent)}',
    '.wvn-row.unread:hover{background:color-mix(in srgb,var(--brand) 12%,transparent)}',
    '.wvn-row:focus-visible{outline:2px solid var(--brand);outline-offset:-2px}',
    '.wvn-ic{--tone:var(--brand);width:38px;height:38px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--tone) 17%,transparent);color:var(--tone)}',
    '.wvn-ic svg{width:18px;height:18px;display:block}',
    '[data-wvn-tone=pink]{--tone:var(--pink)}[data-wvn-tone=yellow]{--tone:var(--yellow)}[data-wvn-tone=green]{--tone:var(--green)}[data-wvn-tone=blue]{--tone:var(--blue)}',
    '[data-wvn-tone=orange]{--tone:var(--orange)}[data-wvn-tone=teal]{--tone:var(--teal)}[data-wvn-tone=red]{--tone:var(--red)}[data-wvn-tone=brand]{--tone:var(--brand)}[data-wvn-tone=discord]{--tone:#5865f2}',
    '.wvn-main{flex:1;min-width:0;display:block}',
    '.wvn-t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13.5px;line-height:1.35;font-weight:500;color:var(--text-2)}',
    '.wvn-row.unread .wvn-t{color:var(--text);font-weight:650}',
    '.wvn-b{display:block;margin-top:2px;font-size:12.5px;line-height:1.4;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wvn-m{display:flex;align-items:center;gap:5px;margin-top:4px;font-size:11.5px;color:var(--text-3)}',
    '.wvn-k{color:var(--tone);font-weight:600}',
    '.wvn-dot{width:8px;height:8px;margin-top:6px;flex-shrink:0;border-radius:50%;background:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent)}',
    '.wvn-sk{display:flex;align-items:center;gap:12px;padding:12px 18px}',
    '.wvn-sk i{display:block;border-radius:6px;background:var(--hair-strong);animation:wvn-pulse 1.1s ease-in-out infinite alternate}',
    '.wvn-sk .c{width:38px;height:38px;border-radius:50%;flex-shrink:0}',
    '.wvn-sk .l{flex:1;display:grid;gap:7px}',
    '.wvn-empty{padding:34px 28px 38px;text-align:center}',
    '.wvn-empty-art{width:60px;height:60px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:var(--brand-bg);color:var(--brand)}',
    '.wvn-empty-art svg{width:26px;height:26px}',
    '.wvn-empty h4{margin:0 0 5px;font-size:15px;font-weight:750;color:var(--text)}',
    '.wvn-empty p{margin:0 auto;max-width:280px;font-size:13px;line-height:1.5;color:var(--text-3)}',
    '.wvn-empty .wvn-textbtn{margin-top:14px;background:var(--hair);color:var(--text)}',
    '.wvn-foot{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;border-top:1px solid var(--hair);font-size:13px;font-weight:650;color:var(--text);text-decoration:none;transition:background .12s var(--ease)}',
    '.wvn-foot:hover{background:var(--hair)}',
    '.wvn-foot svg{width:15px;height:15px}',

    '#wv-acct-menu{position:fixed;z-index:9999;width:284px;padding:6px;overflow-y:auto;overscroll-behavior:contain;background:var(--elevated);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px var(--hair);transform-origin:top right;animation:wvn-pop .15s var(--ease)}',
    '.theme-light #wv-acct-menu,.theme-apple #wv-acct-menu{box-shadow:0 22px 56px rgba(20,20,40,.16),0 0 0 1px var(--hair)}',
    '.wva-head{display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:4px;border-radius:10px;color:inherit;text-decoration:none;transition:background .12s var(--ease)}',
    '.wva-head:hover,.wva-head:focus-visible{background:var(--hair);outline:none}',
    '.wva-av{position:relative;width:46px;height:46px;flex-shrink:0;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--avatar-bg);font-size:18px;font-weight:800;color:var(--text)}',
    '.wva-who{flex:1;min-width:0}',
    '.wva-name{font-size:15px;font-weight:750;letter-spacing:-.01em;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wva-sub{margin-top:2px;font-size:12.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wva-sub b{font-weight:650;color:var(--brand)}',
    '.wva-sep{height:1px;margin:5px 6px;background:var(--hair)}',
    '.wva-item{display:flex;align-items:center;gap:12px;width:100%;min-height:38px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--text);font:500 13.5px var(--font-sans);text-align:left;text-decoration:none;cursor:pointer;transition:background .1s var(--ease)}',
    '.wva-item>svg{width:18px;height:18px;flex-shrink:0;color:var(--text-2)}',
    '.wva-item:hover,.wva-item:focus-visible{background:var(--hair);outline:none}',
    '.wva-item .r{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-3)}',
    '.wva-item kbd{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:5px;background:var(--hair);font:600 11px/1 var(--font-sans);color:var(--text-2)}',
    '.wva-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--brand);color:var(--on-brand);font:700 11px/20px var(--font-sans);text-align:center}',
    '.wva-danger,.wva-danger>svg{color:var(--red)}',
    '.wva-theme{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 10px}',
    '.wva-theme>.wva-item{flex:1;width:auto;padding:0;background:none;min-height:36px}',
    '.wva-theme>.wva-item:hover,.wva-theme>.wva-item:focus-visible{background:none;text-decoration:underline;text-underline-offset:3px}',
    '.wva-sws{display:flex;gap:4px}',
    '.wva-sw{width:22px;height:22px;padding:0;border:0;border-radius:50%;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(127,127,127,.4);transition:transform .1s var(--ease),box-shadow .12s var(--ease)}',
    '.wva-sw:hover{transform:scale(1.12)}',
    '.wva-sw:focus-visible{outline:2px solid var(--text);outline-offset:2px}',
    '.wva-sw.on{box-shadow:0 0 0 2px var(--elevated),0 0 0 4px var(--brand)}',

    '.wv-toast.wv-toast-action{cursor:pointer}',
    '.wv-toast.wv-toast-rich{display:flex;align-items:center;gap:12px;text-align:left;padding:10px 14px 10px 10px}',
    '.wv-toast.wv-toast-rich::before{display:none}',
    '.wv-toast-rich .wvn-ic{width:34px;height:34px}',
    '.wv-toast-rich .wvt-txt{min-width:0;flex:1;display:grid;gap:1px}',
    '.wv-toast-rich .wvt-txt b{font-size:13.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wv-toast-rich .wvt-txt span{font-size:12.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wv-toast-rich .wvt-go{flex-shrink:0;font-size:12px;font-weight:700;color:var(--brand)}',

    '@media (max-width:768px){',
    '.wvn-tab{height:38px;padding:0 16px;font-size:13px}',
    '.wvn-textbtn{height:40px}',
    '.wvn-row{padding:12px 10px}',
    '.wvn-head{padding:12px 10px 8px 18px}',
    '#wv-acct-menu{width:auto}',
    '.wva-item{min-height:44px;font-size:14.5px}',
    '.wva-theme{min-height:48px}',
    '.wva-sw{width:28px;height:28px}',
    '.wva-sws{gap:7px}',
    '}',
    '@media (prefers-reduced-motion:reduce){#wv-notif-btn.ring svg,#wv-notif-btn.ring #wv-notif-dot,#wv-notif-panel.wvn-panel,#wv-acct-menu,.wvn-scrim,.wvn-sk i{animation:none!important}}',
  ].join('\n');
  (function _shellStyles() {
    if (document.getElementById('wv-shell-css')) return;
    var st = document.createElement('style');
    st.id = 'wv-shell-css';
    st.textContent = SHELL_CSS;
    (document.head || document.documentElement).appendChild(st);
  })();

  function _isPhone() {
    try { return window.matchMedia('(max-width: 768px)').matches; } catch (_) { return false; }
  }
  function _closeShellOverlays() { _closeAcctMenu(false); _closeNotifPanel(false); }
  window._wvCloseShellOverlays = _closeShellOverlays;

  // Pin a popover under its trigger, right edges lined up, never off-screen.
  function _placeUnder(el, anchor, width) {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;
    var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) r = { bottom: 64, right: vw - 16 };
    var w = Math.min(width, vw - 16);
    var right = Math.max(8, vw - r.right - 4);
    if (vw - right - w < 8) right = Math.max(8, vw - w - 8);
    var top = r.bottom + 8;
    el.style.width = w + 'px';
    el.style.top = top + 'px';
    el.style.right = right + 'px';
    el.style.left = 'auto';
    el.style.maxHeight = Math.max(240, vh - top - 16) + 'px';
  }

  // ── Account menu ─────────────────────────────────────────────
  var _acct = null;
  var ACCT_IC = {
    keys: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.6 5h14.8A2.6 2.6 0 0 1 22 7.6v8.8a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 16.4V7.6A2.6 2.6 0 0 1 4.6 5Zm1.9 3.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.7 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.6 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm3.7 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM7.6 13.6a1.1 1.1 0 1 0 0 2.2h8.8a1.1 1.1 0 1 0 0-2.2Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.2 3.3c.3-.9 1.6-.9 1.9 0l1.2 3.7a4.6 4.6 0 0 0 2.9 2.9l3.7 1.2c.9.3.9 1.6 0 1.9l-3.7 1.2a4.6 4.6 0 0 0-2.9 2.9l-1.2 3.7c-.3.9-1.6.9-1.9 0L9 17a4.6 4.6 0 0 0-2.9-2.9l-3.7-1.2c-.9-.3-.9-1.6 0-1.9l3.7-1.2A4.6 4.6 0 0 0 9 7Z"/><path d="M18.6 1.9c.1-.3.6-.3.7 0l.4 1.2c.2.5.5.9 1 1l1.2.4c.3.1.3.6 0 .7l-1.2.4c-.5.2-.9.5-1 1l-.4 1.2c-.1.3-.6.3-.7 0l-.4-1.2c-.2-.5-.5-.9-1-1l-1.2-.4c-.3-.1-.3-.6 0-.7l1.2-.4c.5-.2.9-.5 1-1Z"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 3.2a1.2 1.2 0 0 1 1.9 1v13.6a1.2 1.2 0 0 1-1.9 1L13.6 15H9.2l.9 4.2a1.5 1.5 0 0 1-1.46 1.8H7.5a1.5 1.5 0 0 1-1.46-1.17L5 15.02A4 4 0 0 1 5.4 7H13.6Z"/><path d="M21.6 9.4a.9.9 0 0 1 .9.9v1.4a.9.9 0 1 1-1.8 0v-1.4a.9.9 0 0 1 .9-.9Z"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.6 3.2h6.2a1.2 1.2 0 1 1 0 2.4H5.6v12.8h6.2a1.2 1.2 0 1 1 0 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V5.6a2.4 2.4 0 0 1 2.4-2.4Z"/><path d="M15.55 7.35a1.2 1.2 0 0 1 1.7 0l3.8 3.8a1.2 1.2 0 0 1 0 1.7l-3.8 3.8a1.2 1.2 0 0 1-1.7-1.7l1.76-1.75H9.5a1.2 1.2 0 1 1 0-2.4h7.81l-1.76-1.75a1.2 1.2 0 0 1 0-1.7Z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.4 5.4 16 12l-6.6 6.6"/></svg>',
  };

  function _curUser() {
    try { return JSON.parse(localStorage.getItem('user') || 'null') || {}; } catch (_) { return {}; }
  }

  function _acctItem(kind, target, label, ic, right, extraCls) {
    var cls = 'wva-item' + (extraCls ? ' ' + extraCls : '');
    var inner = ic + '<span>' + label + '</span>' + (right ? '<span class="r">' + right + '</span>' : '');
    if (kind === 'a') return '<a class="' + cls + '" role="menuitem" tabindex="-1" href="' + target + '">' + inner + '</a>';
    return '<button type="button" class="' + cls + '" role="menuitem" tabindex="-1" data-wva="' + target + '">' + inner + '</button>';
  }

  function _acctMenuHTML() {
    var u = _curUser();
    var name = u.display_name || u.username || 'your account';
    var unread = NS.unread || 0;
    var swatches = window.WV_THEME_SWATCH || {};
    var order = (window.WV_THEME_ORDER || ['dark', 'light', 'spotify', 'apple', 'wave', 'system']);
    var pref = typeof window.getThemePref === 'function' ? window.getThemePref() : 'dark';
    var html = '';
    html += '<a class="wva-head" role="menuitem" tabindex="-1" href="' + getProfileHref() + '">' +
      '<span class="wva-av" aria-hidden="true">' + _avatarInner(u) + '</span>' +
      '<span class="wva-who"><span class="wva-name" style="display:block">' + _escL(name) + '</span>' +
      '<span class="wva-sub" style="display:block">' + (u.username ? '@' + _escL(u.username) + ' · ' : '') + '<b>View profile</b></span></span>' +
      '</a>';
    html += _acctItem('a', '/upload', 'Upload', icon('upload'));
    html += _acctItem('btn', 'newpl', 'New playlist', icon('plus'));
    html += _acctItem('a', '/library', 'Your library', icon('list'));
    html += _acctItem('a', '/notifications', 'Notifications', icon('bell'),
      unread ? '<span class="wva-badge" data-wva-badge>' + (unread > 99 ? '99+' : unread) + '</span>' : '');
    html += _acctItem('a', '/wrapped', 'Your recap', ACCT_IC.spark);
    html += '<div class="wva-sep" role="separator"></div>';
    html += '<div class="wva-theme">' +
      '<button type="button" class="wva-item" role="menuitem" tabindex="-1" data-wva="theme">' +
        (typeof _themeIcon === 'function' ? _themeIcon() : icon('sun')) + '<span>Theme</span></button>' +
      '<div class="wva-sws" role="group" aria-label="Themes">' +
      order.map(function (t) {
        var def = (window.WV_THEMES || {})[t];
        if (!def) return '';
        var sw = swatches[t] || ['#121212', '#a78bfa', '#242424'];
        return '<button type="button" class="wva-sw' + (pref === t ? ' on' : '') + '" role="menuitemradio" tabindex="-1" aria-checked="' + (pref === t) + '" ' +
          'data-wva-theme="' + t + '" title="' + _escL(def.label) + '" aria-label="' + _escL(def.label) + ' theme" ' +
          'style="background:linear-gradient(135deg,' + sw[0] + ' 0 50%,' + sw[1] + ' 50% 100%)"></button>';
      }).join('') +
      '</div></div>';
    html += _acctItem('btn', 'keys', 'Keyboard shortcuts', ACCT_IC.keys, '<kbd>?</kbd>');
    html += _acctItem('a', '/whatsnew', 'What’s new', ACCT_IC.news);
    html += _acctItem('a', '/settings', 'Settings', icon('settings'));
    var roles = '';
    try {
      if (sessionStorage.getItem('wv_is_mod') === 'true') roles += _acctItem('a', '/modpanel', 'Mod panel', icon('shield'));
      if (sessionStorage.getItem('wv_is_archiver') === 'true') roles += _acctItem('a', '/archivepanel', 'Archive panel', icon('archive'));
      if (sessionStorage.getItem('wv_can_at') === 'true') roles += _acctItem('a', '/archivetrackers', 'Archive trackers', icon('archive'));
      if (sessionStorage.getItem('wv_is_radio') === 'true') roles += _acctItem('a', '/radiopanel', 'Radio panel', icon('radio'));
    } catch (_) {}
    if (roles) html += '<div class="wva-sep" role="separator"></div>' + roles;
    html += '<div class="wva-sep" role="separator"></div>';
    html += _acctItem('btn', 'signout', 'Sign out', ACCT_IC.out, '', 'wva-danger');
    return html;
  }

  // Arrow keys walk the rows; the theme swatches count as one stop and
  // Left/Right move between them.
  function _acctStops() {
    var out = [];
    if (!_acct) return out;
    _acct.el.querySelectorAll('[role="menuitem"], .wva-sws').forEach(function (n) {
      if (n.classList.contains('wva-sws')) {
        var on = n.querySelector('.wva-sw.on') || n.querySelector('.wva-sw');
        if (on) out.push(on);
      } else out.push(n);
    });
    return out;
  }

  function _pickTheme(name) {
    var def = (window.WV_THEMES || {})[name];
    if (!def) return;
    if (def.members && !window.wvIsVerified()) {
      _closeAcctMenu(false);
      if (typeof wvToast === 'function') wvToast('the Waverunners theme is only for discord verified members');
      navigate('/settings#discord-verify');
      return;
    }
    window.setTheme(name);
    if (_acct) {
      _acct.el.querySelectorAll('.wva-sw').forEach(function (b) {
        var on = b.getAttribute('data-wva-theme') === name;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
  }

  function _openAcctMenu(trigger, viaKeyboard) {
    var el = document.createElement('div');
    el.id = 'wv-acct-menu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Account');
    el.innerHTML = _acctMenuHTML();
    document.body.appendChild(el);
    _placeUnder(el, trigger, _isPhone() ? 320 : 284);
    _acct = { el: el, trigger: trigger };
    document.querySelectorAll('#wv-avatar-btn, #wv-more-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    el.addEventListener('click', function (e) {
      var sw = e.target.closest('[data-wva-theme]');
      if (sw) { e.stopPropagation(); _pickTheme(sw.getAttribute('data-wva-theme')); return; }
      var b = e.target.closest('[data-wva]');
      if (b) {
        var act = b.getAttribute('data-wva');
        _closeAcctMenu(false);
        if (act === 'newpl' && typeof window.wvNewPlaylist === 'function') window.wvNewPlaylist();
        else if (act === 'keys' && typeof window.wvShortcutsHelp === 'function') window.wvShortcutsHelp();
        else if (act === 'theme' && typeof window.wvOpenThemePicker === 'function') window.wvOpenThemePicker();
        else if (act === 'signout' && typeof logout === 'function') logout();
        return;
      }
      if (e.target.closest('a[href]')) setTimeout(function () { _closeAcctMenu(false); }, 0);
    });
    el.addEventListener('keydown', function (e) {
      var stops = _acctStops();
      var cur = document.activeElement;
      var onSw = !!(cur && cur.classList && cur.classList.contains('wva-sw'));
      var i = -1;
      for (var q = 0; q < stops.length; q++) { if (stops[q] === cur || (onSw && stops[q].classList.contains('wva-sw'))) { i = q; break; } }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!stops.length) return;
        var j = e.key === 'ArrowDown' ? (i < 0 ? 0 : (i + 1) % stops.length) : (i < 0 ? stops.length - 1 : (i - 1 + stops.length) % stops.length);
        stops[j].focus();
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && onSw) {
        e.preventDefault();
        var sws = Array.prototype.slice.call(el.querySelectorAll('.wva-sw'));
        var k = sws.indexOf(cur);
        var nx = sws[(k + (e.key === 'ArrowRight' ? 1 : -1) + sws.length) % sws.length];
        if (nx) nx.focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var t = e.key === 'Home' ? stops[0] : stops[stops.length - 1];
        if (t) t.focus();
      } else if (e.key === 'Tab') {
        _closeAcctMenu(false);
      } else if (e.key === ' ' && cur && cur.tagName === 'A') {
        e.preventDefault();
        cur.click();
      }
    });
    if (viaKeyboard) { var first = _acctStops()[0]; if (first) first.focus(); }
    else { el.tabIndex = -1; try { el.focus({ preventScroll: true }); } catch (_) {} }
  }

  function _closeAcctMenu(restoreFocus) {
    if (!_acct) return;
    var t = _acct.trigger;
    if (_acct.el.parentNode) _acct.el.parentNode.removeChild(_acct.el);
    _acct = null;
    document.querySelectorAll('#wv-avatar-btn, #wv-more-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (restoreFocus && t && document.body.contains(t)) { try { t.focus(); } catch (_) {} }
  }

  function _toggleAcctMenu(e, trigger) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (_acct) { var same = _acct.trigger === trigger; _closeAcctMenu(!!(e && e.detail === 0)); if (same) return; }
    _closeNotifPanel(false);
    _openAcctMenu(trigger || document.getElementById('wv-avatar-btn'), !!(e && e.detail === 0));
  }
  window._toggleMoreMenu = function (e) {
    var btn = document.getElementById('wv-more-btn');
    var visible = btn && btn.offsetParent !== null;
    _toggleAcctMenu(e, visible ? btn : (document.getElementById('wv-avatar-btn') || btn));
  };
  window.wvOpenAccountMenu = function () { _toggleAcctMenu(null, document.getElementById('wv-avatar-btn')); };

  // ── Notification centre ──────────────────────────────────────
  // One store shared by the bell, the toast and the /notifications page.
  // Works against the older API too: extra query params are ignored there,
  // so everything is also filtered here, and the manage actions (delete,
  // mark unread, clear) only switch on when /unread-count reports by_type.
  var NIC = {
    heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6c-.25 0-.5-.07-.72-.2C9.6 19.4 2.2 14.72 2.2 9.05A5.35 5.35 0 0 1 7.55 3.7c1.8 0 3.4.88 4.45 2.24A5.6 5.6 0 0 1 16.45 3.7a5.35 5.35 0 0 1 5.35 5.35c0 5.67-7.4 10.35-9.08 11.35-.22.13-.47.2-.72.2Z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.2 2.8h9.6c.66 0 1.2.54 1.2 1.2v.6h2a1.2 1.2 0 0 1 1.2 1.2v1.3a4.9 4.9 0 0 1-4.1 4.83 6 6 0 0 1-3.9 3.5V18h2.4a1.2 1.2 0 0 1 1.2 1.2v.8a1.2 1.2 0 0 1-1.2 1.2H8.4A1.2 1.2 0 0 1 7.2 20v-.8A1.2 1.2 0 0 1 8.4 18h2.4v-2.57a6 6 0 0 1-3.9-3.5A4.9 4.9 0 0 1 2.8 7.1V5.8A1.2 1.2 0 0 1 4 4.6h2V4c0-.66.54-1.2 1.2-1.2ZM18 7v2.3a2.5 2.5 0 0 0 .8-1.84V7ZM5.2 7v.46c0 .72.3 1.37.8 1.84V7Z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.6 4.55A1.4 1.4 0 0 1 9.72 3.4l10.4 7.4a1.47 1.47 0 0 1 0 2.4l-10.4 7.4a1.4 1.4 0 0 1-2.12-1.15Z"/></svg>',
    userplus: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9.6" cy="7.6" r="4.1"/><path d="M9.6 13.3c-4.1 0-7.3 2.4-7.3 5.4 0 .86.7 1.55 1.55 1.55h11.5c.86 0 1.55-.7 1.55-1.55 0-3-3.2-5.4-7.3-5.4Z"/><path d="M18.9 6.6c.6 0 1.1.5 1.1 1.1v1.6h1.6a1.1 1.1 0 1 1 0 2.2H20v1.6a1.1 1.1 0 1 1-2.2 0v-1.6h-1.6a1.1 1.1 0 1 1 0-2.2h1.6V7.7c0-.6.5-1.1 1.1-1.1Z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.1 2.9a1 1 0 0 1 1.8 0l2.36 4.78 5.27.77a1 1 0 0 1 .56 1.7l-3.82 3.72.9 5.25a1 1 0 0 1-1.45 1.05L12 17.7l-4.72 2.48a1 1 0 0 1-1.45-1.05l.9-5.25-3.82-3.72a1 1 0 0 1 .56-1.7l5.27-.77Z"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.8 3.4h8.4a4.9 4.9 0 0 1 4.9 4.9v4.4a4.9 4.9 0 0 1-4.9 4.9h-2.3l-3.75 3.1A1 1 0 0 1 8.5 19.9v-2.3h-.7a4.9 4.9 0 0 1-4.9-4.9V8.3a4.9 4.9 0 0 1 4.9-4.9Z"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.2 2.6h5.6c.77 0 1.4.63 1.4 1.4V4.6h1.4a2.6 2.6 0 0 1 2.6 2.6v11.6a2.6 2.6 0 0 1-2.6 2.6H6.4a2.6 2.6 0 0 1-2.6-2.6V7.2a2.6 2.6 0 0 1 2.6-2.6h1.4V4c0-.77.63-1.4 1.4-1.4Zm.8 2.1v1.6h4V4.7ZM8.3 10.9a1.1 1.1 0 1 0 0 2.2h7.4a1.1 1.1 0 1 0 0-2.2Zm0 4a1.1 1.1 0 1 0 0 2.2h4.6a1.1 1.1 0 1 0 0-2.2Z"/></svg>',
    drop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.4c.36 0 .7.16.93.44 1.9 2.3 6.87 8.55 6.87 12.36a7.8 7.8 0 0 1-15.6 0c0-3.81 4.97-10.06 6.87-12.36.23-.28.57-.44.93-.44Z"/></svg>',
    live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M8.3 15.7a5.2 5.2 0 0 1 0-7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4M5.4 18.6a9.3 9.3 0 0 1 0-13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"/></svg>',
    people: ICONS.feed,
    discord: ICONS.discord,
    bell: ICONS.bell,
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.8 9.5 17.8 19.5 6.6"/></svg>',
    checks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12.6 7 17.1 16.2 7"/><path d="m12.3 16.4.7.7L22 7"/></svg>',
  };
  var NTYPE = {
    like:               { label: 'Like',            group: 'likes',      tone: 'pink',    ic: 'heart' },
    like_milestone:     { label: 'Milestone',       group: 'milestones', tone: 'yellow',  ic: 'trophy' },
    stream_milestone:   { label: 'Milestone',       group: 'milestones', tone: 'green',   ic: 'play' },
    follower:           { label: 'Follower',        group: 'followers',  tone: 'brand',   ic: 'userplus' },
    follower_milestone: { label: 'Milestone',       group: 'milestones', tone: 'orange',  ic: 'star' },
    comment:            { label: 'Comment',         group: 'community',  tone: 'teal',    ic: 'bubble' },
    community_reply:    { label: 'Reply',           group: 'community',  tone: 'teal',    ic: 'bubble' },
    community_comment:  { label: 'Comment',         group: 'community',  tone: 'teal',    ic: 'bubble' },
    community_post:     { label: 'Community',       group: 'community',  tone: 'teal',    ic: 'bubble' },
    community_mention:  { label: 'Mention',         group: 'community',  tone: 'teal',    ic: 'bubble' },
    tracker_add:        { label: 'Tracker',         group: 'leaks',      tone: 'orange',  ic: 'clipboard' },
    song_leak:          { label: 'Leak',            group: 'leaks',      tone: 'blue',    ic: 'drop' },
    lp_live:            { label: 'Listening party', group: 'lp',         tone: 'red',     ic: 'live' },
    discord_import:     { label: 'Discord',         group: 'other',      tone: 'discord', ic: 'discord' },
    collab:             { label: 'Collab',          group: 'other',      tone: 'brand',   ic: 'people' },
  };
  var N_FILTERS = [
    ['all', 'All'], ['unread', 'Unread'], ['likes', 'Likes'], ['followers', 'Followers'],
    ['milestones', 'Milestones'], ['community', 'Community'], ['leaks', 'Leaks & trackers'], ['lp', 'Listening parties'],
  ];
  function _nMeta(type) {
    var t = String(type || '');
    if (NTYPE[t]) return NTYPE[t];
    if (t.indexOf('community') === 0) return NTYPE.community_post;
    return { label: 'Update', group: 'other', tone: 'brand', ic: 'bell' };
  }
  function _nTypesFor(group) {
    return Object.keys(NTYPE).filter(function (k) { return NTYPE[k].group === group; });
  }
  function _nIconHTML(type) {
    var m = _nMeta(type);
    return '<span class="wvn-ic" data-wvn-tone="' + m.tone + '" aria-hidden="true">' + (NIC[m.ic] || NIC.bell) + '</span>';
  }

  function _escN(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _nAgo(iso) {
    var t = new Date(iso).getTime();
    if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 45) return 'now';
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    var d = new Date(t);
    var o = { month: 'short', day: 'numeric' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    try { return d.toLocaleDateString(undefined, o); } catch (_) { return d.toDateString(); }
  }
  function _nAbs(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try { return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return d.toString(); }
  }
  function _nDay(iso) {
    var t = new Date(iso).getTime();
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (!t || t >= start) return 'Today';
    if (t >= start - 86400000) return 'Yesterday';
    if (t >= start - 6 * 86400000) return 'This week';
    return 'Earlier';
  }

  function _notifHref(n) {
    if (!n) return '';
    if (n.type === 'song_leak' && n.title) return '/resources?view=song&t=' + encodeURIComponent(String(n.title).replace(/^new\s+/, '').replace(/\s+leaked$/, '')).replace(/'/g, '%27');
    if (!n.entity_id) return '';
    var id = encodeURIComponent(n.entity_id);
    var et = String(n.entity_type || '');
    if (et === 'community_post' || et === 'community' || (String(n.type || '').indexOf('community') === 0 && !et)) return '/community?post=' + id;
    if (et === 'lp') return '/lp?id=' + id;
    if (et === 'track') return '/track?id=' + id;
    if (et === 'album') return '/album?id=' + id;
    if (et === 'artist') return '/artist?id=' + id;
    if (et === 'playlist') return '/playlist?id=' + id;
    return '';
  }

  var NS = { items: null, unread: 0, byType: null, latestAt: null, manage: false, seen: {}, polledAt: 0, countKnown: false, error: false, loading: null };

  function _nReq(method, path, body) {
    var token = localStorage.getItem('token');
    if (!token) return Promise.reject(new Error('signed out'));
    var h = { Authorization: 'Bearer ' + token };
    if (body) h['Content-Type'] = 'application/json';
    return fetch(API_BASE + path, { method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { var e = new Error((d && d.error) || 'something went wrong'); e.status = r.status; throw e; }
          return d;
        });
      });
  }

  // The newest page of notifications. `before` pages back through history.
  function _nList(o) {
    o = o || {};
    var limit = Math.min(100, o.limit || 30);
    var types = o.types && o.types.length ? o.types : null;
    var qs = ['limit=' + limit];
    if (o.before) qs.push('before=' + encodeURIComponent(o.before));
    if (types) qs.push('type=' + encodeURIComponent(types.join(',')));
    if (o.unread) qs.push('unread=1');
    return _nReq('GET', '/notifications?' + qs.join('&')).then(function (data) {
      if (!Array.isArray(data)) throw new Error('something went wrong');
      var legacy = data.length > limit;
      var cut = o.before ? new Date(o.before).getTime() : 0;
      var items = data.filter(function (n) {
        if (!n || !n.id) return false;
        if (cut && !(new Date(n.created_at).getTime() < cut)) return false;
        if (types && types.indexOf(n.type) < 0) return false;
        if (o.unread && n.read) return false;
        return true;
      });
      return { items: items, legacy: legacy, more: !legacy && data.length === limit };
    });
  }

  function _nEmit(op, extra) {
    _nPaintBadge();
    var detail = { op: op, state: NS };
    if (extra) for (var k in extra) detail[k] = extra[k];
    try { window.dispatchEvent(new CustomEvent('wv-notif', { detail: detail })); } catch (_) {}
  }

  function _nPaintBadge() {
    var unread = NS.unread || 0;
    var dot = document.getElementById('wv-notif-dot');
    if (dot) {
      dot.style.display = unread ? 'block' : 'none';
      dot.textContent = unread > 9 ? '9+' : (unread || '');
      dot.classList.toggle('wv-notif-count', unread > 0);
    }
    var bell = document.getElementById('wv-notif-btn');
    if (bell) bell.setAttribute('aria-label', unread ? unread + ' unread notification' + (unread === 1 ? '' : 's') : 'Notifications');
    var b = document.querySelector('[data-wva-badge]');
    if (b) { if (unread) b.textContent = unread > 99 ? '99+' : unread; else b.remove(); }
    if (_np.el) _nPaintPanelHead();
  }

  function _nRing() {
    var bell = document.getElementById('wv-notif-btn');
    if (!bell) return;
    bell.classList.remove('ring');
    void bell.offsetWidth;
    bell.classList.add('ring');
    setTimeout(function () { bell.classList.remove('ring'); }, 1100);
  }

  function _nOnInbox() { return /\/notifications(\.html)?$/.test(location.pathname); }

  function _nAnnounce(fresh) {
    _nRing();
    _nEmit('new', { items: fresh });
    if (_nOnInbox() || _np.el || typeof window.wvToast !== 'function') return;
    if (fresh.length === 1) {
      var n = fresh[0];
      var m = _nMeta(n.type);
      window.wvToast(n.title || m.label, '', 6500, {
        icon: _nIconHTML(n.type), title: n.title || m.label, body: n.body || '', action: 'View',
        onClick: function () { _nOpenItem(n, _notifHref(n)); },
      });
    } else {
      window.wvToast(fresh.length + ' new notifications', '', 6500, {
        icon: _nIconHTML('bell'), title: fresh.length + ' new notifications', body: fresh[0].title || '', action: 'Open',
        onClick: function () { setTimeout(function () { if (!_np.el) _openNotifPanel(false); }, 0); },
      });
    }
  }

  function _nRefresh(silent) {
    if (NS.loading) return NS.loading;
    var hadBaseline = NS.items !== null;
    NS.loading = _nList({ limit: 30 }).then(function (res) {
      var fresh = [];
      res.items.forEach(function (n) {
        if (!NS.seen[n.id]) { NS.seen[n.id] = 1; if (hadBaseline && !n.read) fresh.push(n); }
      });
      NS.items = res.items;
      NS.error = false;
      NS.loading = null;
      if (!NS.countKnown) NS.unread = res.items.filter(function (n) { return !n.read; }).length;
      _nEmit('list');
      _nRenderPanel();
      if (!silent && fresh.length) _nAnnounce(fresh);
    }).catch(function () {
      NS.loading = null;
      NS.error = true;
      _nRenderPanel();
    });
    return NS.loading;
  }

  var _nPollBusy = false, _nPollTimer = null;
  function _nPoll(force) {
    if (!localStorage.getItem('token')) return;
    if (!force && document.hidden) return;
    if (_nPollBusy) return;
    _nPollBusy = true;
    NS.polledAt = Date.now();
    _nReq('GET', '/notifications/unread-count').then(function (d) {
      _nPollBusy = false;
      var prev = NS.unread, prevLatest = NS.latestAt;
      NS.unread = Math.max(0, parseInt(d.count, 10) || 0);
      NS.countKnown = true;
      NS.byType = d.by_type && typeof d.by_type === 'object' ? d.by_type : null;
      NS.manage = !!NS.byType;
      NS.latestAt = d.latest_at || null;
      _nEmit('count');
      if (NS.items === null) _nRefresh(true);
      else if (NS.unread > prev || (NS.latestAt && NS.latestAt !== prevLatest)) _nRefresh(false);
    }).catch(function (e) {
      _nPollBusy = false;
      if (e && e.status === 401) { if (_nPollTimer) { clearInterval(_nPollTimer); _nPollTimer = null; } return; }
      if (NS.items === null) _nRefresh(true);
    });
  }

  function _nFind(id) {
    if (!NS.items) return null;
    for (var i = 0; i < NS.items.length; i++) if (NS.items[i].id === id) return NS.items[i];
    return null;
  }
  function _nDec(type, by) {
    NS.unread = Math.max(0, NS.unread - by);
    if (NS.byType && type && NS.byType[type]) NS.byType[type] = Math.max(0, NS.byType[type] - by);
  }
  function _nArg(x) { return x && typeof x === 'object' ? x : { id: x }; }

  function _nMarkRead(x) {
    var o = _nArg(x);
    if (!o.id) return Promise.resolve();
    var mine = _nFind(o.id);
    var wasUnread = (mine && !mine.read) || (o !== mine && o.read === false);
    if (mine) mine.read = true;
    if (o !== mine && 'read' in o) o.read = true;
    if (wasUnread) _nDec((mine || o).type, 1);
    _nEmit('read', { ids: [o.id] });
    _nRenderPanel();
    if (!wasUnread) return Promise.resolve();
    return _nReq('PATCH', '/notifications/' + encodeURIComponent(o.id) + '/read').catch(function () {});
  }
  function _nMarkUnread(x) {
    var o = _nArg(x);
    var mine = _nFind(o.id);
    var wasRead = (mine && mine.read) || (o !== mine && o.read === true);
    if (mine) mine.read = false;
    if (o !== mine && 'read' in o) o.read = false;
    if (wasRead) {
      NS.unread++;
      var t = (mine || o).type;
      if (NS.byType && t) NS.byType[t] = (NS.byType[t] || 0) + 1;
    }
    _nEmit('unread', { ids: [o.id] });
    _nRenderPanel();
    return _nReq('PATCH', '/notifications/' + encodeURIComponent(o.id) + '/unread');
  }
  function _nMarkAll(types) {
    var scoped = !!(NS.manage && types && types.length);
    (NS.items || []).forEach(function (n) { if (!scoped || types.indexOf(n.type) >= 0) n.read = true; });
    if (scoped) {
      types.forEach(function (t) { if (NS.byType && NS.byType[t]) _nDec(t, NS.byType[t]); });
    } else {
      NS.unread = 0;
      if (NS.byType) for (var k in NS.byType) NS.byType[k] = 0;
    }
    _nEmit('readall', { types: scoped ? types : null });
    _nRenderPanel();
    return _nReq('POST', '/notifications/read-all', scoped ? { types: types } : null);
  }
  function _nRemove(x) {
    var o = _nArg(x);
    var mine = _nFind(o.id);
    var wasUnread = (mine && !mine.read) || (o !== mine && o.read === false);
    return _nReq('DELETE', '/notifications/' + encodeURIComponent(o.id)).then(function (d) {
      if (NS.items) NS.items = NS.items.filter(function (n) { return n.id !== o.id; });
      if (wasUnread) _nDec((mine || o).type, 1);
      _nEmit('remove', { ids: [o.id] });
      _nRenderPanel();
      return d;
    });
  }
  function _nClearRead() {
    return _nReq('DELETE', '/notifications').then(function (d) {
      if (NS.items) NS.items = NS.items.filter(function (n) { return !n.read; });
      _nEmit('clear');
      _nRenderPanel();
      return d;
    });
  }

  function _nOpenItem(n, href) {
    if (n) _nMarkRead(n);
    _closeNotifPanel(false);
    if (href && typeof navigate === 'function') navigate(href);
  }

  // Older markup and pages call these by name.
  window._openNotif = function (id, el, href) { _nOpenItem(_nFind(id) || { id: id }, href); };
  window._markNotifRead = function (id) { _nMarkRead(_nFind(id) || { id: id }); };
  window._markAllNotifsRead = function () { _nMarkAll().catch(function () { _nPoll(true); }); };

  // ── The bell's panel ─────────────────────────────────────────
  var _np = { el: null, scrim: null, filter: 'all' };

  function _nSkeleton(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="wvn-sk" aria-hidden="true"><i class="c"></i><span class="l">' +
        '<i style="height:12px;width:' + (78 - (i % 3) * 14) + '%"></i><i style="height:10px;width:' + (46 + (i % 2) * 18) + '%"></i></span></div>';
    }
    return h;
  }

  function _nRowHTML(n) {
    var m = _nMeta(n.type);
    var href = _notifHref(n);
    var tag = href ? 'a' : 'div';
    return '<' + tag + ' class="wvn-row' + (n.read ? '' : ' unread') + '" data-wvn-tone="' + m.tone + '" data-id="' + _escN(n.id) + '"' +
      (href ? ' href="' + _escN(href) + '"' : ' role="button" tabindex="0"') + '>' +
      _nIconHTML(n.type) +
      '<span class="wvn-main"><span class="wvn-t">' + _escN(n.title || m.label) + '</span>' +
      (n.body ? '<span class="wvn-b">' + _escN(n.body) + '</span>' : '') +
      '<span class="wvn-m"><span class="wvn-k">' + _escN(m.label) + '</span><span aria-hidden="true">·</span>' +
      '<time datetime="' + _escN(n.created_at) + '" title="' + _escN(_nAbs(n.created_at)) + '">' + _escN(_nAgo(n.created_at)) + '</time></span></span>' +
      (n.read ? '' : '<span class="wvn-dot" role="img" aria-label="unread"></span>') +
      '</' + tag + '>';
  }

  function _nGroupedHTML(items, rowFn) {
    var html = '', last = '';
    items.forEach(function (n) {
      var d = _nDay(n.created_at);
      if (d !== last) { html += '<div class="wvn-day" role="presentation">' + d + '</div>'; last = d; }
      html += rowFn(n);
    });
    return html;
  }

  function _nPaintPanelHead() {
    var el = _np.el;
    if (!el) return;
    var c = el.querySelector('.wvn-count');
    if (c) { c.textContent = NS.unread > 99 ? '99+' : String(NS.unread); c.hidden = !NS.unread; }
    var all = el.querySelector('[data-wvn-act="readall"]');
    if (all) all.disabled = !NS.unread;
    var un = el.querySelector('.wvn-tab[data-f="unread"] .n');
    if (un) un.textContent = NS.unread ? String(NS.unread > 99 ? '99+' : NS.unread) : '';
  }

  function _nRenderPanel() {
    var el = _np.el;
    if (!el) return;
    _nPaintPanelHead();
    el.querySelectorAll('.wvn-tab').forEach(function (t) {
      var on = t.getAttribute('data-f') === _np.filter;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var list = el.querySelector('.wvn-list');
    var keep = list.scrollTop;
    if (NS.items === null) {
      list.innerHTML = NS.error
        ? '<div class="wvn-empty"><div class="wvn-empty-art">' + NIC.bell + '</div><h4>Couldn’t load notifications</h4>' +
          '<p>check your connection and try again</p><button type="button" class="wvn-textbtn" data-wvn-act="retry">Try again</button></div>'
        : _nSkeleton(5);
      return;
    }
    var items = _np.filter === 'unread' ? NS.items.filter(function (n) { return !n.read; }) : NS.items;
    if (!items.length) {
      list.innerHTML = _np.filter === 'unread'
        ? '<div class="wvn-empty"><div class="wvn-empty-art">' + NIC.check + '</div><h4>You’re all caught up</h4><p>nothing new since you last checked</p></div>'
        : '<div class="wvn-empty"><div class="wvn-empty-art">' + NIC.bell + '</div><h4>No notifications yet</h4>' +
          '<p>likes, new followers, milestones and leaks of songs you follow show up here</p></div>';
      return;
    }
    list.innerHTML = _nGroupedHTML(items.slice(0, 30), _nRowHTML);
    list.scrollTop = keep;
  }

  function _nPlacePanel() {
    var el = _np.el;
    if (!el) return;
    var vh = window.innerHeight;
    if (_isPhone()) {
      var bar = document.getElementById('wv-topbar');
      var top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 56;
      el.classList.add('is-sheet');
      el.style.left = '0'; el.style.right = '0'; el.style.width = 'auto';
      el.style.top = top + 'px';
      el.style.maxHeight = Math.max(280, vh - top - 64) + 'px';
      if (_np.scrim) _np.scrim.style.top = top + 'px';
    } else {
      el.classList.remove('is-sheet');
      _placeUnder(el, document.getElementById('wv-notif-btn'), 400);
      el.style.maxHeight = Math.min(620, Math.max(280, vh - parseFloat(el.style.top) - 16)) + 'px';
    }
  }

  function _openNotifPanel(viaKeyboard) {
    if (_np.el) return;
    var el = document.createElement('div');
    el.id = 'wv-notif-panel';
    el.className = 'wvn-panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Notifications');
    el.tabIndex = -1;
    el.innerHTML =
      '<div class="wvn-head"><h2 class="wvn-title">Notifications <span class="wvn-count" hidden></span></h2>' +
        '<button type="button" class="wvn-textbtn" data-wvn-act="readall" disabled>' + NIC.checks + 'Mark all read</button></div>' +
      '<div class="wvn-tabs" role="tablist" aria-label="Show">' +
        '<button type="button" class="wvn-tab on" role="tab" aria-selected="true" data-f="all">All</button>' +
        '<button type="button" class="wvn-tab" role="tab" aria-selected="false" data-f="unread">Unread <span class="n"></span></button>' +
      '</div>' +
      '<div class="wvn-list" role="list"></div>' +
      '<a class="wvn-foot" href="/notifications">See all notifications ' + ACCT_IC.chev + '</a>';
    if (_isPhone()) {
      var scrim = document.createElement('div');
      scrim.className = 'wvn-scrim';
      scrim.addEventListener('click', function () { _closeNotifPanel(false); });
      document.body.appendChild(scrim);
      _np.scrim = scrim;
    }
    document.body.appendChild(el);
    _np.el = el;
    _np.filter = 'all';
    _nPlacePanel();
    var bell = document.getElementById('wv-notif-btn');
    if (bell) bell.setAttribute('aria-expanded', 'true');

    el.addEventListener('click', function (e) {
      var act = e.target.closest('[data-wvn-act]');
      if (act) {
        var a = act.getAttribute('data-wvn-act');
        if (a === 'readall') _nMarkAll().catch(function () { _nPoll(true); });
        if (a === 'retry') { NS.error = false; _nRenderPanel(); _nRefresh(true); }
        return;
      }
      var tab = e.target.closest('.wvn-tab');
      if (tab) { _np.filter = tab.getAttribute('data-f'); _nRenderPanel(); return; }
      if (e.target.closest('.wvn-foot')) { setTimeout(function () { _closeNotifPanel(false); }, 0); return; }
      var row = e.target.closest('.wvn-row');
      if (!row) return;
      var n = _nFind(row.getAttribute('data-id'));
      var href = row.getAttribute('href');
      if (href && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) { if (n) _nMarkRead(n); return; }
      e.preventDefault();
      _nOpenItem(n, href);
    });
    el.addEventListener('keydown', function (e) {
      var row = e.target.closest && e.target.closest('.wvn-row');
      if (row && !row.getAttribute('href') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var rows = Array.prototype.slice.call(el.querySelectorAll('.wvn-row'));
        if (!rows.length) return;
        e.preventDefault();
        var i = rows.indexOf(row);
        var next = e.key === 'ArrowDown' ? rows[Math.min(rows.length - 1, i + 1)] : rows[Math.max(0, i - 1)];
        if (i < 0) next = rows[0];
        next.focus();
      }
    });

    _nRenderPanel();
    _nRefresh(false);
    try { (viaKeyboard ? (el.querySelector('.wvn-tab.on') || el) : el).focus({ preventScroll: true }); } catch (_) {}
  }

  function _closeNotifPanel(restoreFocus) {
    if (!_np.el) return;
    if (_np.el.parentNode) _np.el.parentNode.removeChild(_np.el);
    if (_np.scrim && _np.scrim.parentNode) _np.scrim.parentNode.removeChild(_np.scrim);
    _np.el = null; _np.scrim = null;
    var bell = document.getElementById('wv-notif-btn');
    if (bell) {
      bell.setAttribute('aria-expanded', 'false');
      if (restoreFocus) { try { bell.focus(); } catch (_) {} }
    }
  }

  window._toggleNotifPanel = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (_np.el) { _closeNotifPanel(!!(e && e.detail === 0)); return; }
    _closeAcctMenu(false);
    _openNotifPanel(!!(e && e.detail === 0));
  };

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (_np.el && !_np.el.contains(t) && !(t.closest && t.closest('#wv-notif-btn, .wv-toast'))) _closeNotifPanel(false);
    if (_acct && !_acct.el.contains(t) && !(t.closest && t.closest('#wv-avatar-btn, #wv-more-btn'))) _closeAcctMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (_acct) { _closeAcctMenu(true); return; }
    if (_np.el) { _closeNotifPanel(true); return; }
    var drawer = document.getElementById('wv-drawer');
    if (drawer && drawer.classList.contains('open') && typeof window.closeMobileDrawer === 'function') window.closeMobileDrawer();
  });
  var _shellVW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === _shellVW) { if (_np.el) _nPlacePanel(); return; }
    _shellVW = window.innerWidth;
    _closeShellOverlays();
  });
  window.addEventListener('popstate', function () { _closeShellOverlays(); });

  window.wvNotif = {
    state: NS,
    filters: N_FILTERS,
    typesFor: _nTypesFor,
    meta: _nMeta,
    iconHTML: _nIconHTML,
    icons: NIC,
    href: _notifHref,
    ago: _nAgo,
    abs: _nAbs,
    day: _nDay,
    esc: _escN,
    list: _nList,
    refresh: function () { return _nRefresh(true); },
    poll: function () { _nPoll(true); },
    markRead: _nMarkRead,
    markUnread: _nMarkUnread,
    markAll: _nMarkAll,
    remove: _nRemove,
    clearRead: _nClearRead,
    openPanel: function () { if (!_np.el) _openNotifPanel(false); },
    closePanel: function () { _closeNotifPanel(false); },
  };

  // Poll the cheap unread count once a minute while the tab is visible;
  // the list itself is only fetched when the count moves or the panel opens.
  (function _startNotifPolling() {
    if (!localStorage.getItem('token')) return;
    _nPoll(true);
    _nPollTimer = setInterval(function () { if (localStorage.getItem('token')) _nPoll(false); }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - NS.polledAt > 15000) _nPoll(false);
    });
  })();

  // ── Mobile drawer ─────────────────────────────────────────────
  window.openMobileDrawer = function() {
    var drawer = document.getElementById('wv-drawer');
    var overlay = document.getElementById('wv-drawer-overlay');
    _closeShellOverlays();
    if (drawer) { drawer.classList.add('open'); drawer.style.transform = ''; }
    if (overlay) overlay.classList.add('show');
    var mb = document.getElementById('wv-menu-btn');
    if (mb) mb.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  window.closeMobileDrawer = function() {
    var drawer = document.getElementById('wv-drawer');
    var overlay = document.getElementById('wv-drawer-overlay');
    if (drawer) { drawer.classList.remove('open'); drawer.style.transform = ''; drawer.style.transition = ''; }
    if (overlay) { overlay.classList.remove('show'); overlay.style.opacity = ''; }
    var mb = document.getElementById('wv-menu-btn');
    if (mb) mb.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  // Swipe the drawer back toward the edge to close it, the way native side
  // menus work. Vertical scrolls inside the drawer are left alone.
  function _wireDrawerSwipe(drawer) {
    if (!drawer || drawer._wvSwipe) return;
    drawer._wvSwipe = true;
    var x0 = 0, y0 = 0, dx = 0, mode = '';
    drawer.addEventListener('touchstart', function (e) {
      if (!drawer.classList.contains('open') || e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = 'wait';
    }, { passive: true });
    drawer.addEventListener('touchmove', function (e) {
      if (!mode) return;
      var mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (mode === 'wait') {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        mode = (mx < 0 && Math.abs(mx) > Math.abs(my) * 1.2) ? 'swipe' : '';
        if (mode !== 'swipe') return;
        drawer.style.transition = 'none';
      }
      dx = Math.min(0, mx);
      drawer.style.transform = 'translate3d(' + dx + 'px,0,0)';
      var ov = document.getElementById('wv-drawer-overlay');
      if (ov) ov.style.opacity = String(Math.max(0, 1 + dx / (drawer.offsetWidth || 300)));
    }, { passive: true });
    drawer.addEventListener('touchend', function () {
      if (mode !== 'swipe') { mode = ''; return; }
      mode = '';
      drawer.style.transition = '';
      var ov = document.getElementById('wv-drawer-overlay');
      if (ov) ov.style.opacity = '';
      if (dx < -Math.min(90, (drawer.offsetWidth || 300) * 0.3)) window.closeMobileDrawer();
      else drawer.style.transform = '';
    });
  }

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
    dark:    { label: 'Default',      base: 'dark',  meta: '#121212' },
    light:   { label: 'White',        base: 'light', meta: '#f6f6f6' },
    spotify: { label: 'Spotify',      base: 'dark',  meta: '#121212' },
    apple:   { label: 'Apple Music',  base: 'light', meta: '#ffffff' },
    wave:    { label: 'Waverunners',  base: 'dark',  meta: '#04111f', members: true },
    system:  { label: 'Match device', base: 'dark',  meta: '#121212' },
  };
  var SKINS = ['spotify', 'apple', 'wave'];
  var THEME_ORDER = ['dark', 'light', 'spotify', 'apple', 'wave', 'system'];
  window.WV_THEMES = THEMES;
  window.WV_THEME_ORDER = THEME_ORDER;

  function _systemTheme() {
    try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (_) { return 'dark'; }
  }
  function _storedTheme() {
    var v;
    try { v = localStorage.getItem('wv_theme'); } catch (_) { v = null; }
    if (v && THEMES[v] && THEMES[v].members && !window.wvIsVerified()) return 'dark';
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
      el.classList.remove('theme-light', 'theme-dark', 'theme-spotify', 'theme-apple', 'theme-wave');
      add.forEach(function(c) { el.classList.add(c); });
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', def.meta);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = def.base;
  }
  window.setTheme = function(t) {
    t = THEMES[t] ? t : 'dark';
    if (THEMES[t].members && !window.wvIsVerified()) {
      if (typeof wvToast === 'function') wvToast('the Waverunners theme is only for discord verified members...verify in Settings');
      t = 'dark';
    }
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

  // Apple Music's phone mini player has a skip button beside play.
  // Hidden by CSS everywhere else.
  function _ensureMiniNext(bar) {
    var play = bar.querySelector('#player-mini-play-btn');
    if (!play || document.getElementById('player-mini-next-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'player-mini-next-btn';
    btn.className = 'player-btn player-mini-next';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Next');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.5 6.2v11.6c0 .8.9 1.3 1.6.8L12 13.9v3.9c0 .8.9 1.3 1.6.8l7.9-5.8c.5-.4.5-1.2 0-1.6l-7.9-5.8c-.7-.5-1.6 0-1.6.8v3.9L5.1 5.4c-.7-.5-1.6 0-1.6.8Z"/></svg>';
    btn.onclick = function (e) { e.stopPropagation(); if (typeof skipNext === 'function') skipNext(); };
    play.parentNode.insertBefore(btn, play.nextSibling);
  }

  function _applyPlayerSkin(tries) {
    var bar = document.querySelector('.player-bar');
    if (!bar) { if ((tries || 0) < 25) setTimeout(function () { _applyPlayerSkin((tries || 0) + 1); }, 400); return; }
    _ensureNPButton(bar);
    _ensureMiniNext(bar);
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
    _closeShellOverlays();
    var top = document.getElementById('wv-topbar');
    if (top) { top.innerHTML = buildTopbarHTML(); _navBtnsState(); }
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

    // The mobile browser chrome follows the theme; _paintTheme keeps it in step.
    if (!document.querySelector('meta[name="theme-color"]')) {
      var tc = document.createElement('meta');
      tc.name = 'theme-color';
      document.head.appendChild(tc);
    }
    var tcm = document.querySelector('meta[name="theme-color"]');
    if (tcm) tcm.setAttribute('content', (THEMES[theme] || THEMES.dark).meta);

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
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-spotify', 'theme-apple', 'theme-wave');
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
    _wireDrawerSwipe(document.getElementById('wv-drawer'));
    _navBtnsState();
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
        '<p style="font-size:14px;color:var(--text-2);margin:0 0 22px;line-height:1.5;">put in the password to get in</p>' +
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
          if (alertEl) alertEl.innerHTML = '<div style="color:var(--red);font-size:13px;padding:6px 0;">wrong password...try again</div>';
          if (pw) { pw.value = ''; pw.focus(); }
        }
      })
      .catch(function() {
        if (alertEl) alertEl.innerHTML = '<div style="color:var(--red);font-size:13px;padding:6px 0;">connection problem...try again</div>';
      });
  };

  // ── updateNav — called after auth state changes ───────────────
  window.updateNav = function() {
    var topbar = document.getElementById('wv-topbar');
    _closeShellOverlays();
    if (topbar) { topbar.innerHTML = buildTopbarHTML(); if (window._checkMobileTopbar) window._checkMobileTopbar(); _navBtnsState(); }
    var sidebar = document.getElementById('wv-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebarHTML();
    var drawer = document.getElementById('wv-drawer');
    if (drawer) drawer.innerHTML = buildSidebarHTML(true);
    var tabs = document.getElementById('wv-mobile-tabs');
    if (tabs) tabs.innerHTML = buildMobileTabsHTML();
    _renderLib();
  };

  // ── Site banners ──────────────────────────────────────────────
  // Escaped first, then links are made clickable. Banners can't be closed:
  // they stay up until an admin takes them down.
  try { localStorage.removeItem('wv_banners_dismissed'); } catch (_) {}

  function _bannerBody(message) {
    var esc = String(message || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/https?:\/\/[^\s<]+/g, function (url) {
      var href = url.replace(/[.,;:!?)\]]+$/, '');
      var tail = url.slice(href.length);
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + href + '</a>' + tail;
    });
  }

  window.renderSiteBanners = async function() {
    var container = document.getElementById('wv-banners');
    if (!container) return;
    try {
      var res = await fetch(API_BASE + '/site/banners');
      var banners = await res.json();
      if (!banners || !banners.length) { container.innerHTML = ''; return; }
      container.innerHTML = banners.map(function(b) {
        return '<div class="site-banner ' + (b.type || 'info') + '">' +
          '<span class="site-banner-text">' + _bannerBody(b.message) + '</span>' +
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
  sessionStorage.removeItem('wv_can_at');

  initShell();
  // Load banners after shell exists
  window.renderSiteBanners();

  // Check moderator and archiver status, then inject nav links if applicable.
  // Runs AFTER initShell so the sidebar elements exist.
  (function _checkRoleStatus() {
    var token = localStorage.getItem('token');
    if (!token) { sessionStorage.removeItem('wv_is_mod'); sessionStorage.removeItem('wv_is_archiver'); sessionStorage.removeItem('wv_is_radio'); sessionStorage.removeItem('wv_can_at'); return; }
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
      var canAt = !!(results[1] && results[1].can_archive_trackers) || isArchiver || isMod;
      var wasAt = sessionStorage.getItem('wv_can_at') === 'true';
      var rm = results[2] || {};
      var isRadio = !!(rm.available && (rm.is_mod || rm.is_host || (rm.stations && rm.stations.length)));
      var wasMod = sessionStorage.getItem('wv_is_mod') === 'true';
      var wasArchiver = sessionStorage.getItem('wv_is_archiver') === 'true';
      var wasRadio = sessionStorage.getItem('wv_is_radio') === 'true';
      sessionStorage.setItem('wv_is_mod', isMod ? 'true' : 'false');
      sessionStorage.setItem('wv_is_archiver', isArchiver ? 'true' : 'false');
      sessionStorage.setItem('wv_is_radio', isRadio ? 'true' : 'false');
      sessionStorage.setItem('wv_can_at', canAt ? 'true' : 'false');
      // Pages read these flags at script time, before this answer lands, so
      // tell them once it has.
      window.dispatchEvent(new CustomEvent('wv-roles', { detail: { isMod: isMod, isArchiver: isArchiver, isRadio: isRadio, canArchiveTrackers: canAt } }));
      if (isMod || isArchiver || isRadio || canAt || wasMod !== isMod || wasArchiver !== isArchiver || wasRadio !== isRadio || wasAt !== canAt) {
        var sidebar = document.getElementById('wv-sidebar');
        if (sidebar) sidebar.innerHTML = buildSidebarHTML();
        var drawer = document.getElementById('wv-drawer');
        if (drawer) drawer.innerHTML = buildSidebarHTML(true);
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
  // Hosts the CDN cannot fetch from; these load straight from their origin.
  var NO_CDN = /(^|\.)yetour\.xyz$/i;
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
  // Hosts that already failed through the CDN go straight to their origin.
  var badHosts = {};
  var cdnOk = 0;
  function apply(img) {
    if (img._wvCdn || img._wvFallback) return;
    var src = img.getAttribute('src') || '';
    if (!/^https?:\/\//i.test(src) || /^https?:\/\/wsrv\.nl\//i.test(src)) return;
    var host = '';
    try { var su = new URL(src); if (su.origin === location.origin) return; host = su.hostname; if (NO_CDN.test(host)) return; } catch (_) { return; }
    if (img.hasAttribute('data-nocdn')) return;
    img._wvCdn = true;
    img.dataset.wvOrig = src;
    if (cdnOff || badHosts[host] >= 2) {
      if (!img.getAttribute('loading')) img.loading = 'lazy';
      if (!img.getAttribute('decoding')) img.decoding = 'async';
      return;
    }
    img.src = window.wvImg(src, sizeFor(img));
    if (!img.getAttribute('loading')) img.loading = 'lazy';
    if (!img.getAttribute('decoding')) img.decoding = 'async';
  }
  // A CDN miss falls back to the original once. This runs in the capture
  // phase, ahead of any inline onerror="this.remove()", so a cover the CDN
  // could not fetch still shows instead of disappearing. If the original
  // fails too, the inline handler gets its turn as before.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img._wvFallback) return;
    var orig = img.dataset && img.dataset.wvOrig;
    var cur = img.getAttribute('src') || '';
    if (!orig || cur === orig || !/^https?:\/\/wsrv\.nl\//i.test(cur)) return;
    e.stopImmediatePropagation();
    img._wvFallback = true;
    try { var bh = new URL(orig).hostname; badHosts[bh] = (badHosts[bh] || 0) + 1; } catch (_) {}
    cdnFails++;
    if (cdnFails >= 4 && !cdnOk && !cdnOff) {
      cdnOff = true;
      try { sessionStorage.setItem('wv_cdn_off', '1'); } catch (_) {}
    }
    img.src = orig;
  }, true);
  document.addEventListener('load', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && !cdnOk && /^https?:\/\/wsrv\.nl\//i.test(img.currentSrc || img.src || '')) cdnOk++;
  }, true);
  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('img[src]') : []).forEach(apply); if (root.tagName === 'IMG') apply(root); }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes') {
        if (m.target._wvFallback) {
          if ((m.target.getAttribute('src') || '') === m.target.dataset.wvOrig) return;
          m.target._wvFallback = false;
        }
        m.target._wvCdn = false; apply(m.target); return;
      }
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
  ensure('ui-kit.js', 'wvUI');
  ensure('palette.js', 'wvOpenPalette');
  ensure('quicksearch.js', 'wvQuickSearch');
  ensure('nowplaying.js', 'wvNowPlaying');
  ensure('share.js', 'wvShare');
  ensure('rails.js', 'wvRails');
  ensure('a11y.js', 'wvA11y');
  ensure('showplayer.js', 'wvShow');
  ensure('pwa.js', 'wvPwa');
  ensure('footer.js', 'wvFooter');
  ensure('seo.js', 'wvSeo');
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
              '<input type="password" id="wv-cd-pw" class="wv-input" placeholder="have early access? put the password here…" onkeydown="if(event.key===\'Enter\')window._verifyCountdown()">' +
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
        if (errEl) errEl.textContent = 'wrong password';
      }
    } catch (e) {
      if (errEl) errEl.textContent = 'couldnt check it...check your connection';
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
        'these got added to your profile when you connected an account. tell us which ones you actually made...the rest go back to the archive.' +
      '</div>' +
      '<div style="height:4px;border-radius:99px;background:var(--surface-3);overflow:hidden;margin-bottom:16px;">' +
        '<div style="height:100%;width:' + pct + '%;background:var(--brand);border-radius:99px;transition:width .2s;"></div></div>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px;">' +
        '<div style="width:76px;height:76px;border-radius:10px;overflow:hidden;background:var(--surface-3);flex-shrink:0;">' +
          (it.cover_url ? '<img src="' + esc(it.cover_url) + '" style="width:100%;height:100%;object-fit:cover;">' : '') + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:16px;font-weight:800;line-height:1.25;">' + esc(it.title || 'Untitled') + '</div>' +
          '<div style="font-size:12px;color:var(--text-3);margin-top:3px;">' + (it.track_count || 0) + ' track' + (it.track_count === 1 ? '' : 's') + '</div>' +
          (it.shared_link ? '<div style="font-size:11.5px;color:var(--orange);margin-top:5px;">came from a link someone else posted</div>' : '') +
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
  var msg = busy ? (window.WV_BUSY_MSG || 'wavernrs is having problems rn...give it a minute and try again')
                 : ((err && err.message) || 'something went wrong');
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
    el.textContent = 'cant reach wavernrs rn...some stuff might not load. trying again…';
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
  // opts (optional): { onClick, icon (trusted svg markup), title, body, action }.
  // Title and body are set as text, never as markup.
  window.wvToast = function (message, kind, ms, opts) {
    if (!message) return;
    opts = opts || {};
    var h = ensureHost();
    var t = document.createElement('div');
    t.className = 'wv-toast' + (kind ? ' wv-toast-' + kind : '') + (opts.onClick ? ' wv-toast-action' : '');
    if (opts.icon || opts.title) {
      t.classList.add('wv-toast-rich');
      if (opts.icon) {
        var ic = document.createElement('span');
        ic.innerHTML = opts.icon;
        while (ic.firstChild) t.appendChild(ic.firstChild);
      }
      var tx = document.createElement('span');
      tx.className = 'wvt-txt';
      var b = document.createElement('b');
      b.textContent = String(opts.title || message);
      tx.appendChild(b);
      if (opts.body) { var sb = document.createElement('span'); sb.textContent = String(opts.body); tx.appendChild(sb); }
      t.appendChild(tx);
      if (opts.action) { var go = document.createElement('span'); go.className = 'wvt-go'; go.textContent = String(opts.action); t.appendChild(go); }
    } else {
      t.textContent = String(message);
    }
    if (opts.onClick) { t.setAttribute('role', 'button'); t.tabIndex = 0; }
    h.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    var life = ms || (kind === 'error' ? 5200 : 3200);
    var dead = false;
    var kill = function () {
      if (dead) return;
      dead = true;
      t.classList.remove('in');
      setTimeout(function () { t.remove(); if (host && !host.childElementCount) { host.remove(); host = null; } }, 220);
    };
    t.addEventListener('click', function () { kill(); if (opts.onClick) { try { opts.onClick(); } catch (_) {} } });
    t.addEventListener('keydown', function (e) { if (opts.onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); } });
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
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
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
  wave:    ['#04111f', '#38bdf8', '#0b2a44'],
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
    '<span class="wv-theme-meta"><b>' + def.label + '</b>' + (def.members ? '<small class="wv-theme-lock">' + (window.wvIsVerified && window.wvIsVerified() ? 'Members' : '🔒 Members') + '</small>' : '') + '</span>' +
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
      var tdef = (window.WV_THEMES || {})[name];
      if (tdef && tdef.members && !window.wvIsVerified()) {
        wrap.remove();
        if (typeof wvToast === 'function') wvToast('the Waverunners theme is only for discord verified members');
        if (typeof navigate === 'function') navigate('/settings#discord-verify'); else location.href = '/settings#discord-verify';
        return;
      }
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
      if (d.me && typeof window._wvSetMyAvatar === 'function') {
        var mine = (d.online || []).filter(function (p) { return p && p.id === d.me; })[0];
        if (mine) window._wvSetMyAvatar(d.me, mine.avatar || '');
      }
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
    if (!showing && !cur && typeof wvToast === 'function') wvToast('play something to see it here');
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();

// ── Playlist covers and cards, shared by every page that shows playlists ──
// A custom cover wins; otherwise the first four song covers make a 2x2
// mosaic, one cover fills the square, and an empty playlist gets a gradient.
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var NOTE = '<svg width="34%" height="34%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

  window.wvPlaylistCover = function (pl) {
    pl = pl || {};
    var img = function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">'; };
    if (pl.cover_url) return '<div class="wv-plc">' + img(pl.cover_url) + '</div>';
    var m = Array.isArray(pl.mosaic) ? pl.mosaic.filter(Boolean) : [];
    if (m.length >= 4) return '<div class="wv-plc wv-plc-4">' + m.slice(0, 4).map(img).join('') + '</div>';
    if (m.length) return '<div class="wv-plc">' + img(m[0]) + '</div>';
    var bg = typeof coverGradient === 'function' ? coverGradient(pl.title || 'playlist') : 'var(--surface-2)';
    return '<div class="wv-plc wv-plc-empty" style="background:' + bg + '">' + NOTE + '</div>';
  };

  window.wvPlaylistCardHTML = function (pl) {
    pl = pl || {};
    var href = '/playlist?id=' + encodeURIComponent(pl.id || '');
    var n = pl.track_count || 0;
    var who = pl.owner && pl.owner.username ? '@' + pl.owner.username : 'Playlist';
    return '<a class="wv-comp-card wv-pl-pub" href="' + href + '" onclick="navigate(\'' + href + '\');return false;">' +
      '<div class="wv-comp-card-cover"><div class="wv-comp-card-cover-inner">' + window.wvPlaylistCover(pl) + '</div></div>' +
      '<div class="wv-comp-card-title">' + esc(pl.title || 'Untitled') + '</div>' +
      '<div class="wv-comp-card-artist"><span data-wv-uid="' + esc((pl.owner && pl.owner.id) || '') + '">' + esc(who) + '</span> · ' + n + (n === 1 ? ' song' : ' songs') + '</div>' +
      '</a>';
  };

  // Starts an empty private playlist and opens it in the builder.
  window.wvNewPlaylist = async function (title) {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
      location.href = '/login?next=' + encodeURIComponent('/playlist-builder');
      return;
    }
    if (typeof navigate === 'function') navigate('/playlist-builder' + (title ? '?title=' + encodeURIComponent(title) : ''));
    else location.href = '/playlist-builder';
  };
})();

// ── Discord verification: badges next to names, and the member perks ──────
(function () {
  var BADGE = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5865F2" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z"/><path fill="#fff" d="M8.3 9.2c1-.5 2-.7 3.1-.8l.2.4c-.5 0-1.2.2-1.8.5l.2.3c.6-.2 1.3-.3 2-.3s1.4.1 2 .3l.2-.3c-.6-.3-1.3-.5-1.8-.5l.2-.4c1.1.1 2.1.3 3.1.8.9 1.5 1.3 3 1.2 4.6-.9.7-1.8 1.1-2.7 1.4l-.5-.8c.4-.1.8-.3 1.1-.5l-.3-.2c-1.6.8-3.6.8-5.2 0l-.3.2c.3.2.7.4 1.1.5l-.5.8c-.9-.3-1.8-.7-2.7-1.4-.1-1.6.3-3.1 1.2-4.6zm2.3 2.6c-.4 0-.7.4-.7.8s.3.8.7.8.7-.4.7-.8-.3-.8-.7-.8zm2.8 0c-.4 0-.7.4-.7.8s.3.8.7.8.7-.4.7-.8-.3-.8-.7-.8z"/></svg>';
  var _known = {};
  var _pending = {};
  var _timer = null;

  function apply(el, v) {
    el.setAttribute('data-wv-dec', '1');
    if (!v) return;
    if (v.color && !el.hasAttribute('data-wv-nocolor')) el.style.color = v.color;
    if (el.querySelector('.wv-vbadge')) return;
    var b = document.createElement('span');
    b.className = 'wv-vbadge';
    b.title = 'Discord verified member';
    b.setAttribute('aria-label', 'Discord verified');
    b.innerHTML = BADGE;
    el.appendChild(b);
  }

  function flush() {
    _timer = null;
    var ids = Object.keys(_pending);
    _pending = {};
    if (!ids.length || typeof api !== 'function') return;
    for (var i = 0; i < ids.length; i += 100) {
      (function (chunk) {
        api('/verify/users?ids=' + chunk.join(',')).then(function (d) {
          var users = (d && d.users) || {};
          chunk.forEach(function (id) { _known[id] = users[id] || null; });
          scan(document);
        }).catch(function () { chunk.forEach(function (id) { if (!(id in _known)) _known[id] = null; }); });
      })(ids.slice(i, i + 100));
    }
  }

  function scan(root) {
    var els = (root || document).querySelectorAll('[data-wv-uid]:not([data-wv-dec])');
    for (var i = 0; i < els.length; i++) {
      var id = els[i].getAttribute('data-wv-uid');
      if (!/^[0-9a-f-]{36}$/i.test(id || '')) { els[i].setAttribute('data-wv-dec', '1'); continue; }
      if (id in _known) apply(els[i], _known[id]);
      else _pending[id] = 1;
    }
    if (Object.keys(_pending).length && !_timer) _timer = setTimeout(flush, 120);
  }
  window.wvDecorateUsers = scan;
  window.wvForgetVerified = function (id) { if (id) delete _known[id]; else _known = {}; };

  var _obsTimer = null;
  function watch() {
    try {
      new MutationObserver(function () {
        if (_obsTimer) return;
        _obsTimer = setTimeout(function () { _obsTimer = null; scan(document); }, 150);
      }).observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
    scan(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.wvRefreshVerification = function (force) {
    if (typeof api !== 'function') return Promise.resolve(null);
    var token = null;
    try { token = localStorage.getItem('token'); } catch (_) {}
    if (!token) { try { localStorage.removeItem('wv_verified'); } catch (_) {} return Promise.resolve(null); }
    var last = 0;
    try { last = +(sessionStorage.getItem('wv_verified_at') || 0); } catch (_) {}
    if (!force && Date.now() - last < 10 * 60 * 1000) return Promise.resolve(null);
    return api('/verify/status').then(function (d) {
      try {
        sessionStorage.setItem('wv_verified_at', String(Date.now()));
        if (d && d.verified) localStorage.setItem('wv_verified', '1'); else localStorage.removeItem('wv_verified');
      } catch (_) {}
      var raw = null; try { raw = localStorage.getItem('wv_theme'); } catch (_) {}
      if (raw === 'wave' && typeof setTheme === 'function') setTheme(d && d.verified ? 'wave' : 'dark');
      return d;
    }).catch(function () { return null; });
  };
  setTimeout(function () { window.wvRefreshVerification(false); }, 1500);
})();

// Yedits / Ye switch next to the Archive heading. Yedits is the comps archive, Ye is the tracker side.
window.wvArchiveMode = function (active) {
  return '<div class="wv-seg wv-arc-mode" role="group" aria-label="Which archive">' +
    '<button' + (active === 'yedits' ? ' class="on" aria-pressed="true"' : '') + ' onclick="' + (active === 'yedits' ? '' : 'navigate(\'/archive\')') + '">Yedits</button>' +
    '<button' + (active === 'ye' ? ' class="on" aria-pressed="true"' : '') + ' onclick="' + (active === 'ye' ? '' : 'navigate(\'/resources\')') + '">Ye</button>' +
  '</div>';
};

window.wvVerifyPrompt = function (reason) {
  var old = document.getElementById('wv-verify-prompt');
  if (old) old.remove();
  var esc = typeof escHtml === 'function' ? escHtml : function (x) { return String(x); };
  var wrap = document.createElement('div');
  wrap.id = 'wv-verify-prompt';
  wrap.className = 'wv-vp-wrap';
  wrap.innerHTML = '<div class="wv-vp" role="dialog" aria-label="Discord verification">' +
    '<div class="wv-vp-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M19.6 5.2A17 17 0 0 0 15.4 4l-.5 1a15.7 15.7 0 0 0-5.8 0l-.5-1a17 17 0 0 0-4.2 1.3A17.6 17.6 0 0 0 1.3 17a17.2 17.2 0 0 0 5.2 2.6l1.1-1.8c-.6-.2-1.2-.5-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17.2 17.2 0 0 0 5.2-2.6 17.5 17.5 0 0 0-3.1-11.8zM8.5 14.6c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm7 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></div>' +
    '<div class="wv-vp-title">Get Discord verified</div>' +
    '<div class="wv-vp-body">' + esc(reason || 'this is only for people in the wavernrs discord') + '<br><br>join the server and link your discord in Settings...you also get a verified badge, the Waverunners theme and a name color.</div>' +
    '<div class="wv-vp-actions">' +
      '<a class="wv-pill" href="https://discord.gg/j2jGmw5CZH" target="_blank" rel="noopener" style="text-decoration:none;">Join the Discord</a>' +
      '<button class="wv-pill brand" id="wv-vp-go">Verify in Settings</button>' +
    '</div>' +
    '<button class="wv-vp-x" aria-label="Close">×</button>' +
  '</div>';
  wrap.addEventListener('click', function (e) {
    if (e.target === wrap || (e.target.closest && e.target.closest('.wv-vp-x'))) { wrap.remove(); return; }
    if (e.target.closest && e.target.closest('#wv-vp-go')) {
      wrap.remove();
      if (typeof navigate === 'function') navigate('/settings#discord-verify'); else location.href = '/settings#discord-verify';
    }
  });
  document.body.appendChild(wrap);
};

// Asked once per browser, new or returning: join the Discord, or not now.
(function () {
  var KEY = 'wv_discord_invite_seen_v1';
  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return true; } }
  function mark() { try { localStorage.setItem(KEY, '1'); } catch (_) {} }
  function show() {
    if (seen() || document.getElementById('wv-join-pop')) return;
    if (window.wvIsVerified && window.wvIsVerified()) { mark(); return; }
    if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent || '')) return;
    if (document.getElementById('wv-lockscreen') && getComputedStyle(document.getElementById('wv-lockscreen')).display !== 'none') return;
    if (document.getElementById('wv-verify-prompt')) return;
    mark();
    var wrap = document.createElement('div');
    wrap.id = 'wv-join-pop';
    wrap.className = 'wv-vp-wrap';
    wrap.innerHTML = '<div class="wv-vp" role="dialog" aria-modal="true" aria-label="Join the Discord server">' +
      '<div class="wv-vp-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M19.6 5.2A17 17 0 0 0 15.4 4l-.5 1a15.7 15.7 0 0 0-5.8 0l-.5-1a17 17 0 0 0-4.2 1.3A17.6 17.6 0 0 0 1.3 17a17.2 17.2 0 0 0 5.2 2.6l1.1-1.8c-.6-.2-1.2-.5-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17.2 17.2 0 0 0 5.2-2.6 17.5 17.5 0 0 0-3.1-11.8zM8.5 14.6c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm7 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg></div>' +
      '<div class="wv-vp-title">Join the Discord server</div>' +
      '<div class="wv-vp-body">please just join the discord 🙏 you hear about new comps first and you can get verified for extra stuff on the site</div>' +
      '<a class="wv-join-btn" id="wv-join-go" href="https://discord.gg/j2jGmw5CZH" target="_blank" rel="noopener">Join</a>' +
      '<button class="wv-join-later" id="wv-join-later">Not now</button>' +
    '</div>';
    function close() { wrap.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.id === 'wv-join-later') { close(); return; }
      if (e.target.id === 'wv-join-go') setTimeout(close, 50);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
  }
  function later() { setTimeout(show, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later);
  else later();
})();

// Imported descriptions can carry raw Discord markup: <@123> mentions, <#123>
// channels, <:name:123> emoji. Show them the way Discord would, roughly.
window.wvCleanDiscordText = function (s) {
  return String(s || '')
    .replace(/<a?:([A-Za-z0-9_~]+):\d+>/g, ':$1:')
    .replace(/<@!?\d{15,22}>/g, '@member')
    .replace(/<@&\d{15,22}>/g, '@role')
    .replace(/<#\d{15,22}>/g, '#channel')
    .replace(/<t:(\d{9,11})(?::[a-zA-Z])?>/g, function (_, t) { try { return new Date(+t * 1000).toLocaleDateString(); } catch (e) { return ''; } })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Long descriptions stay at three lines until someone asks for the rest.
window.wvClampDesc = function (el) {
  if (!el || el.getAttribute('data-clamped')) return;
  el.setAttribute('data-clamped', '1');
  requestAnimationFrame(function () {
    if (el.scrollHeight <= el.clientHeight + 2) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wv-desc-more';
    btn.textContent = 'Show more';
    btn.onclick = function () {
      var open = el.classList.toggle('is-open');
      btn.textContent = open ? 'Show less' : 'Show more';
    };
    el.insertAdjacentElement('afterend', btn);
  });
};

// ── Discord thread viewer: renders a thread the way Discord shows it ──────
(function () {
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : '#'; }

  function inline(t) {
    var codes = [], held = [];
    var hold = function (html) { held.push(html); return '\u0001' + (held.length - 1) + '\u0001'; };
    t = t.replace(/`([^`\n]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = esc(t);
    t = t.replace(/&lt;(a?):([A-Za-z0-9_~]+):(\d+)&gt;/g, function (_, an, name, id) { return hold('<img class="dt-emoji" alt=":' + name + ':" title=":' + name + ':" src="https://cdn.discordapp.com/emojis/' + id + '.' + (an ? 'gif' : 'png') + '?size=48">'); });
    t = t.replace(/&lt;t:(\d{9,11})(?::([tTdDfFR]))?&gt;/g, function (_, s, f) { var d = new Date(+s * 1000); return hold('<span class="dt-time-tag">' + esc(f === 'R' ? d.toLocaleDateString() : d.toLocaleString()) + '</span>'); });
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, label, u) { return hold('<a href="' + safeUrl(u) + '" target="_blank" rel="noopener nofollow">') + label + hold('</a>'); });
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, function (_, pre, u) { return pre + hold('<a href="' + u + '" target="_blank" rel="noopener nofollow">' + u + '</a>'); });
    t = t.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, function (_, u) { return hold('<a href="' + u + '" target="_blank" rel="noopener nofollow">' + u + '</a>'); });
    t = t.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<u>$1</u>');
    t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, '$1<i>$2</i>');
    t = t.replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/\|\|([^|]+)\|\|/g, '<span class="dt-spoiler" onclick="this.classList.add(\'shown\')">$1</span>');
    t = t.replace(/\u0001(\d+)\u0001/g, function (_, i) { return held[+i]; });
    t = t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
    return t;
  }

  function markdown(src) {
    var out = [], parts = String(src || '').split(/```/);
    parts.forEach(function (chunk, i) {
      if (i % 2 === 1) { out.push('<pre class="dt-code">' + esc(chunk.replace(/^[a-z0-9+-]*\n/i, '')) + '</pre>'); return; }
      var lines = chunk.split('\n'), buf = [];
      lines.forEach(function (ln) {
        var m;
        if ((m = /^>>> ?(.*)$/.exec(ln))) buf.push('<blockquote>' + inline(m[1]) + '</blockquote>');
        else if ((m = /^> ?(.*)$/.exec(ln))) buf.push('<blockquote>' + inline(m[1]) + '</blockquote>');
        else if ((m = /^-# (.*)$/.exec(ln))) buf.push('<div class="dt-sub">' + inline(m[1]) + '</div>');
        else if ((m = /^(#{1,3}) (.*)$/.exec(ln))) buf.push('<div class="dt-h' + m[1].length + '">' + inline(m[2]) + '</div>');
        else if ((m = /^\s*[-*] (.*)$/.exec(ln))) buf.push('<div class="dt-li">• ' + inline(m[1]) + '</div>');
        else buf.push(inline(ln) + '<br>');
      });
      out.push(buf.join('').replace(/(<br>)+$/, ''));
    });
    return out.join('');
  }

  function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; }

  function attachments(list) {
    return (list || []).map(function (a) {
      var u = esc(safeUrl(a.url));
      if (a.kind === 'image') return '<a class="dt-img" href="' + u + '" target="_blank" rel="noopener"><img src="' + u + '" alt="' + esc(a.name) + '" loading="lazy" onerror="this.closest(\'a\').classList.add(\'gone\')"></a>';
      if (a.kind === 'audio') return '<div class="dt-file dt-audio"><div class="dt-file-name">🎵 ' + esc(a.name) + ' <span>' + fmtSize(a.size) + '</span></div><audio controls preload="none" src="' + u + '"></audio></div>';
      if (a.kind === 'video') return '<video class="dt-video" controls preload="none" src="' + u + '"></video>';
      return '<a class="dt-file" href="' + u + '" target="_blank" rel="noopener"><div class="dt-file-name">📄 ' + esc(a.name) + ' <span>' + fmtSize(a.size) + '</span></div></a>';
    }).join('');
  }

  function embeds(list) {
    return (list || []).map(function (e) {
      return '<div class="dt-embed" style="border-left-color:' + esc(e.color || 'var(--hair-strong)') + ';">' +
        (e.provider ? '<div class="dt-embed-prov">' + esc(e.provider) + '</div>' : '') +
        (e.title ? '<div class="dt-embed-title">' + (e.url ? '<a href="' + esc(safeUrl(e.url)) + '" target="_blank" rel="noopener">' + esc(e.title) + '</a>' : esc(e.title)) + '</div>' : '') +
        (e.description ? '<div class="dt-embed-desc">' + markdown(e.description) + '</div>' : '') +
        (e.image ? '<img class="dt-embed-img" src="' + esc(safeUrl(e.image)) + '" loading="lazy" onerror="this.remove()">' : (e.thumbnail ? '<img class="dt-embed-thumb" src="' + esc(safeUrl(e.thumbnail)) + '" loading="lazy" onerror="this.remove()">' : '')) +
      '</div>';
    }).join('');
  }

  function reactions(list) {
    if (!list || !list.length) return '';
    return '<div class="dt-reacts">' + list.map(function (r) {
      var em = r.id ? '<img class="dt-emoji" src="https://cdn.discordapp.com/emojis/' + esc(r.id) + '.' + (r.animated ? 'gif' : 'png') + '?size=32" alt="' + esc(r.name) + '">' : esc(r.name);
      return '<span class="dt-react">' + em + ' ' + r.count + '</span>';
    }).join('') + '</div>';
  }

  function when(ts) {
    var d = new Date(ts), now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    return sameDay ? 'Today at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  window.wvRenderDiscordThread = function (data, end, start, all) {
    var msgs = data.messages || [], byId = {};
    (all || msgs).forEach(function (m) { byId[m.id] = m; });
    var html = [], prev = start > 0 ? msgs[start - 1] : null;
    msgs.slice(start || 0, end || msgs.length).forEach(function (m) {
      var a = m.author || {};
      var grouped = prev && prev.author && prev.author.id === a.id && !m.reply_to && (m.at - prev.at) < 7 * 60 * 1000;
      var reply = m.reply_to ? byId[m.reply_to] : null;
      var body = (m.content ? '<div class="dt-text">' + markdown(m.content) + (m.edited ? ' <span class="dt-edited">(edited)</span>' : '') + '</div>' : '') +
        (m.forwarded || []).map(function (f) { return '<div class="dt-fwd"><div class="dt-fwd-label">↪ Forwarded</div>' + (f.content ? '<div class="dt-text">' + markdown(f.content) + '</div>' : '') + attachments(f.attachments) + '</div>'; }).join('') +
        attachments(m.attachments) + embeds(m.embeds) +
        (m.stickers || []).map(function (st) { return st.url ? '<img class="dt-sticker" src="' + esc(st.url) + '" alt="' + esc(st.name) + '">' : ''; }).join('') +
        reactions(m.reactions);
      if (m.pinned) body = '<div class="dt-pin-flag">📌 Pinned</div>' + body;
      if (grouped) html.push('<div class="dt-msg dt-cont" id="dt-' + esc(m.id) + '"><div class="dt-gutter"><span class="dt-hover-time">' + esc(new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) + '</span></div><div class="dt-main">' + body + '</div></div>');
      else html.push('<div class="dt-msg" id="dt-' + esc(m.id) + '">' +
        (reply ? '<div class="dt-reply"><span class="dt-reply-name">@' + esc((reply.author || {}).name || '') + '</span> ' + esc(String(reply.content || (reply.attachments && reply.attachments.length ? 'Click to see attachment' : '')).replace(/<a?:([A-Za-z0-9_~]+):\d+>/g, ':$1:').replace(/^#{1,3} |^-# |^> /gm, '').replace(/[*_~`|]{1,3}/g, '').replace(/\s+/g, ' ').slice(0, 110)) + '</div>' : (m.reply_to ? '<div class="dt-reply dt-reply-gone">Original message was deleted</div>' : '')) +
        '<div class="dt-row"><div class="dt-gutter">' + (a.avatar ? '<img class="dt-avatar" src="' + esc(a.avatar) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<div class="dt-avatar dt-avatar-blank">' + esc((a.name || '?').charAt(0).toUpperCase()) + '</div>') + '</div>' +
        '<div class="dt-main"><div class="dt-head"><span class="dt-name"' + (a.color ? ' style="color:' + esc(a.color) + ';"' : '') + '>' + esc(a.name) + '</span>' + (a.bot ? '<span class="dt-bot">APP</span>' : '') + '<span class="dt-time">' + esc(when(m.at)) + '</span></div>' + body + '</div></div></div>');
      prev = m;
    });
    return html.join('');
  };
})();


// ── Discord thread side panel: its own scroll, search and pinned messages ──
(function () {
  var st = null;
  var BATCH = 150;
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function plain(m) { return String(m.content || '') + ' ' + ((m.author || {}).name || '') + ' ' + (m.attachments || []).map(function (a) { return a.name; }).join(' ') + ' ' + (m.forwarded || []).map(function (f) { return f.content || ''; }).join(' '); }

  function close() {
    var el = document.getElementById('wv-dtp');
    if (el) el.remove();
    document.removeEventListener('keydown', onKey);
    st = null;
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function list() { return document.getElementById('wv-dtp-list'); }

  function renderWindow(keepTopId) {
    var box = list(); if (!box || !st) return;
    var msgs = st.data.messages;
    box.innerHTML = (st.start > 0 ? '<button class="wv-dtp-more" onclick="wvDtpEarlier()">Show earlier messages (' + st.start.toLocaleString() + ')</button>' : '') +
      wvRenderDiscordThread(st.data, st.end, st.start) +
      (st.end < msgs.length ? '<div class="wv-dtp-sentinel" style="height:1px;"></div>' : '<div class="wv-dtp-end">end of the thread</div>');
    if (keepTopId) { var el = document.getElementById('dt-' + keepTopId); if (el) box.scrollTop = el.offsetTop - 60; }
  }

  function append() {
    if (!st || st.end >= st.data.messages.length || st.searching) return;
    var box = list(); if (!box) return;
    var from = st.end;
    st.end = Math.min(st.data.messages.length, st.end + BATCH);
    var sent = box.querySelector('.wv-dtp-sentinel'); if (sent) sent.remove();
    box.insertAdjacentHTML('beforeend', wvRenderDiscordThread(st.data, st.end, from) + (st.end < st.data.messages.length ? '<div class="wv-dtp-sentinel" style="height:1px;"></div>' : '<div class="wv-dtp-end">end of the thread</div>'));
  }

  window.wvDtpEarlier = function () {
    if (!st) return;
    var keep = st.data.messages[st.start] && st.data.messages[st.start].id;
    st.start = Math.max(0, st.start - BATCH);
    renderWindow(keep);
  };

  window.wvDtpJump = function (id) {
    if (!st) return;
    var idx = st.data.messages.findIndex(function (m) { return m.id === id; });
    if (idx < 0) return;
    var q = document.getElementById('wv-dtp-q'); if (q) q.value = '';
    st.searching = false;
    document.getElementById('wv-dtp-pins').classList.remove('open');
    st.start = Math.max(0, idx - 40);
    st.end = Math.min(st.data.messages.length, idx + BATCH);
    renderWindow();
    var el = document.getElementById('dt-' + id);
    if (el) { list().scrollTop = el.offsetTop - 80; el.classList.add('dt-flash'); setTimeout(function () { el.classList.remove('dt-flash'); }, 1800); }
  };

  function search(q) {
    var box = list(); if (!box || !st) return;
    q = q.trim().toLowerCase();
    if (!q) { st.searching = false; st.start = 0; st.end = Math.min(BATCH, st.data.messages.length); renderWindow(); box.scrollTop = 0; return; }
    st.searching = true;
    var hits = st.data.messages.filter(function (m) { return plain(m).toLowerCase().indexOf(q) >= 0; });
    var shown = hits.slice(0, 200);
    box.innerHTML = '<div class="wv-dtp-note">' + hits.length.toLocaleString() + ' result' + (hits.length === 1 ? '' : 's') + (hits.length > shown.length ? ', showing the first 200' : '') + '...tap one to jump to it in the thread</div>' +
      shown.map(function (m) {
        var html = wvRenderDiscordThread({ messages: [m] }, 1, 0, st.data.messages);
        return '<div class="wv-dtp-hit" onclick="wvDtpJump(\'' + esc(m.id) + '\')">' + html + '</div>';
      }).join('');
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    box.querySelectorAll('.wv-dtp-hit .dt-text').forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        if (!re.test(n.nodeValue)) return;
        re.lastIndex = 0;
        var span = document.createElement('span');
        span.innerHTML = esc(n.nodeValue).replace(re, '<mark>$1</mark>');
        n.parentNode.replaceChild(span, n);
      });
    });
  }

  window.wvOpenThreadPanel = async function (albumId, discordUrl) {
    close();
    var wrap = document.createElement('div');
    wrap.id = 'wv-dtp';
    wrap.className = 'wv-dtp';
    wrap.innerHTML = '<div class="wv-dtp-head">' +
        '<div class="wv-dtp-title"><div id="wv-dtp-name"># Discord thread</div><div id="wv-dtp-sub" class="wv-dtp-sub">Loading…</div></div>' +
        '<button class="wv-dtp-x" aria-label="Close" onclick="wvCloseThreadPanel()">×</button>' +
      '</div>' +
      '<div class="wv-dtp-tools">' +
        '<input id="wv-dtp-q" class="wv-input" placeholder="Search this thread" autocomplete="off">' +
        '<div class="wv-dtp-pinwrap"><button class="wv-pill" id="wv-dtp-pinbtn" style="display:none;" onclick="document.getElementById(\'wv-dtp-pins\').classList.toggle(\'open\')">📌 Pinned</button><div id="wv-dtp-pins" class="wv-dtp-pins"></div></div>' +
        (discordUrl ? '<a class="wv-pill" href="' + esc(discordUrl) + '" target="_blank" rel="noopener">Open in Discord ↗</a>' : '') +
      '</div>' +
      '<div id="wv-dtp-list" class="wv-dtp-list"><div class="loading"><div class="spinner"></div></div></div>';
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey);
    var t = null;
    document.getElementById('wv-dtp-q').addEventListener('input', function (e) { clearTimeout(t); var v = e.target.value; t = setTimeout(function () { search(v); }, 200); });
    list().addEventListener('scroll', function () { var b = list(); if (b && b.scrollTop + b.clientHeight > b.scrollHeight - 600) append(); }, { passive: true });
    var data;
    try { data = await api('/albums/' + albumId + '/thread'); }
    catch (e) { var l = list(); if (l) l.innerHTML = '<div class="wv-empty" style="margin:20px;">' + esc(e.message || 'couldnt load the thread') + '</div>'; return; }
    if (!document.getElementById('wv-dtp')) return;
    st = { data: data, start: 0, end: Math.min(BATCH, (data.messages || []).length), searching: false };
    var th = data.thread || {};
    document.getElementById('wv-dtp-name').textContent = '# ' + (th.name || 'thread');
    document.getElementById('wv-dtp-sub').textContent = (th.guild ? th.guild + (th.parent ? ' › ' + th.parent : '') + ' · ' : '') + (data.messages || []).length.toLocaleString() + ' messages · ' +
      (data.unreadable_since ? 'saved copy, the thread got deleted from discord' : data.saved ? 'saved ' + new Date(data.saved_at).toLocaleDateString() : 'loaded live, saving the whole thread now');
    var pins = (data.messages || []).filter(function (m) { return m.pinned; });
    if (pins.length) {
      var pb = document.getElementById('wv-dtp-pinbtn'); pb.style.display = ''; pb.textContent = '📌 Pinned (' + pins.length + ')';
      document.getElementById('wv-dtp-pins').innerHTML = pins.map(function (m) {
        return '<button class="wv-dtp-pin" onclick="wvDtpJump(\'' + esc(m.id) + '\')"><b>' + esc((m.author || {}).name || '') + '</b> <span>' + esc(String(m.content || (m.attachments && m.attachments.length ? '[attachment]' : '')).replace(/\s+/g, ' ').slice(0, 140)) + '</span></button>';
      }).join('');
    }
    renderWindow();
  };
  window.wvCloseThreadPanel = close;
})();

// ── Red dot on "Live LPs" while a listening party is live ─────────────────
(function () {
  var _live = 0;
  function paint() {
    document.querySelectorAll('[data-page="lp"]').forEach(function (a) {
      var dot = a.querySelector('.wv-lp-live');
      if (_live > 0) {
        if (!dot) { dot = document.createElement('span'); dot.className = 'wv-lp-live'; a.appendChild(dot); }
        dot.title = _live + ' live now';
      } else if (dot) dot.remove();
    });
  }
  function check() {
    if (typeof API_BASE === 'undefined') return;
    fetch(API_BASE + '/lp/live-count').then(function (r) { return r.json(); }).then(function (d) { _live = (d && d.live) || 0; paint(); }).catch(function () {});
  }
  setTimeout(check, 1500);
  setInterval(check, 60000);
  document.addEventListener('click', function () { setTimeout(paint, 400); }, true);
})();

// Horizontal tab bars hide their overflow; show a fade and an arrow so people
// know there is more to scroll to.
(function () {
  var SEL = '#ye-views, .yt-tabs, .fs-tabs, .tk-tabs, .art-eras, .wv-home-chips';
  function update(el) {
    var max = el.scrollWidth - el.clientWidth;
    var l = el.scrollLeft > 4, r = max > 4 && el.scrollLeft < max - 4;
    el.classList.toggle('sh-l', l); el.classList.toggle('sh-r', r);
    var w = el._shWrap; if (!w) return;
    w.querySelector('.sh-btn.l').hidden = !l;
    w.querySelector('.sh-btn.r').hidden = !r;
  }
  function attach(el) {
    if (el._sh || !el.parentNode) return;
    var cs = getComputedStyle(el);
    if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') return;
    el._sh = true;
    var wrap = document.createElement('div');
    wrap.className = 'sh-wrap';
    wrap.style.display = cs.display === 'inline-flex' || cs.display === 'inline-block' ? 'inline-flex' : 'block';
    wrap.style.maxWidth = '100%';
    if (cs.flexGrow !== '0' || cs.flexShrink !== '1') { wrap.style.flex = cs.flexGrow + ' ' + cs.flexShrink + ' ' + cs.flexBasis; wrap.style.minWidth = '0'; }
    wrap.style.margin = cs.marginTop + ' ' + cs.marginRight + ' ' + cs.marginBottom + ' ' + cs.marginLeft;
    el.style.margin = '0';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    var bg = cs.backgroundColor;
    if (!bg || bg === 'transparent' || /rgba\(.*,\s*0\)$/.test(bg)) bg = getComputedStyle(document.body).getPropertyValue('--page-bg-base').trim() || '#121212';
    ['l', 'r'].forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sh-btn ' + d; b.hidden = true;
      b.style.background = 'linear-gradient(' + (d === 'l' ? '270deg' : '90deg') + ', transparent, ' + bg + ' 55%)';
      b.style.borderRadius = d === 'l' ? cs.borderTopLeftRadius + ' 0 0 ' + cs.borderBottomLeftRadius : '0 ' + cs.borderTopRightRadius + ' ' + cs.borderBottomRightRadius + ' 0';
      b.style.top = cs.borderTopWidth; b.style.bottom = (parseFloat(cs.paddingBottom) > 6 ? cs.paddingBottom : '0');
      b.setAttribute('aria-label', d === 'l' ? 'scroll left' : 'scroll right');
      b.textContent = d === 'l' ? '‹' : '›';
      b.onclick = function (e) { e.stopPropagation(); el.scrollBy({ left: (d === 'l' ? -1 : 1) * Math.max(120, el.clientWidth * 0.7), behavior: 'smooth' }); };
      wrap.appendChild(b);
    });
    el._shWrap = wrap;
    el.addEventListener('scroll', function () { update(el); }, { passive: true });
    update(el);
    setTimeout(function () { update(el); }, 400);
  }
  function scan() { document.querySelectorAll(SEL).forEach(function (el) { if (el._sh) update(el); else attach(el); }); }
  var t = null;
  function soon() { clearTimeout(t); t = setTimeout(scan, 120); }
  if (typeof MutationObserver === 'function') new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', soon);
  document.addEventListener('DOMContentLoaded', soon);
  soon();
})();
