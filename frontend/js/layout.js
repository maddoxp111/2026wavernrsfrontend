// WAVERNRS — App Shell
// Sidebar (nav + library) | topbar + content, player docked below.
(function () {
  'use strict';

  // ── SVG icon paths (Heroicons outline 24×24) ─────────────────
  var ICONS = {
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

  // ── Which page are we on? ─────────────────────────────────────
  function pageId() {
    var p = location.pathname;
    if (p === '/' || p.endsWith('/index.html')) return 'home';
    if (p.endsWith('/discover.html')) return 'browse';
    if (p.endsWith('/browse.html')) return 'browse';
    if (p.endsWith('/artists.html')) return 'artists';
    if (p.endsWith('/stats.html')) return 'stats';
    if (p.endsWith('/history.html')) return 'library';
    if (p.endsWith('/charts.html')) return 'charts';
    if (p.endsWith('/archive.html')) return 'archive';
    if (p.endsWith('/archive-artist.html')) return 'archive';
    if (p.endsWith('/library.html')) return 'library';
    if (p.endsWith('/resources.html')) return 'resources';
    if (p.endsWith('/feed.html')) return 'feed';
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
    if (p.endsWith('/community.html')) return 'community';
    if (p.endsWith('/adminpanel.html')) return 'admin';
    if (p.endsWith('/modpanel.html')) return 'modpanel';
    if (p.endsWith('/archivepanel.html')) return 'archivepanel';
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
  // Two panels on a black gutter: navigation on top, the library below.
  // Account links live in a compact footer so the library gets the height.
  function buildSidebarHTML() {
    var isLoggedIn = !!localStorage.getItem('token');
    var profileHref = getProfileHref();
    var html = '';

    html += '<div class="wv-panel wv-panel-nav">';
    html += '<a href="/index.html" class="wv-sidebar-logo"><span class="mark">w</span>wavernrs</a>';
    html += '<nav class="wv-sidebar-nav">';
    html += navItem('home', 'Home', '/index.html', 'home');
    html += navItem('browse', 'Browse', '/browse.html', 'discover');
    html += navItem('charts', 'Charts', '/charts.html', 'chart');
    html += navItem('artists', 'Artists', '/artists.html', 'profile');
    html += navItem('archive', 'Archive', '/archive.html', 'archive');
    html += navItem('community', 'Community', '/community.html', 'community');
    html += navItem('resources', 'Tracker', '/resources.html', 'resources');
    html += '</nav>';
    html += '</div>';

    html += '<div class="wv-panel wv-lib">';
    html += '<div class="wv-lib-head">' +
      '<a href="/library.html" onclick="navigate(\'/library.html\');return false;">' + icon('list') + '<span>Your Library</span></a>' +
      '<div class="wv-lib-tools">' +
        '<button class="wv-lib-add" title="History" onclick="navigate(\'/history.html\')">' + icon('history') + '</button>' +
        (isLoggedIn ? '<button class="wv-lib-add" title="Upload" onclick="navigate(\'/upload.html\')">' + icon('plus') + '</button>' : '') +
      '</div></div>';
    html += '<div class="wv-lib-chips" id="wv-lib-chips">' +
      '<span class="wv-chip acc" data-k="recent" onclick="window._libFilter(\'recent\')">Recent</span>' +
      '<span class="wv-chip" data-k="comps" onclick="window._libFilter(\'comps\')">Comps</span>' +
      '<span class="wv-chip" data-k="edits" onclick="window._libFilter(\'edits\')">Edits</span>' +
      '<span class="wv-chip" data-k="playlists" onclick="window._libFilter(\'playlists\')">Playlists</span>' +
      '</div>';
    html += '<div class="wv-lib-find"><input id="wv-lib-q" placeholder="Search in your library" oninput="window._libSearch(this.value)"></div>';
    html += '<div class="wv-lib-list" id="wv-lib-list"></div>';
    html += '</div>';

    html += '<div class="wv-side-foot">';
    if (isLoggedIn) {
      html += '<a href="/feed.html" data-page="feed">Following</a>';
      html += '<a href="' + profileHref + '" data-page="profile">Profile</a>';
      html += '<a href="/settings.html" data-page="settings">Settings</a>';
      if (sessionStorage.getItem('wv_is_mod') === 'true') html += '<a href="/modpanel.html" data-page="modpanel">Mod panel</a>';
      if (sessionStorage.getItem('wv_is_archiver') === 'true') html += '<a href="/archivepanel.html" data-page="archivepanel">Archive panel</a>';
    } else {
      html += '<a href="/login.html">Log in</a><a href="/register.html">Sign up</a>';
    }
    html += '<a href="/stats.html" data-page="stats">Stats</a>';
    html += '<a href="/about.html" data-page="about">About</a>';
    html += '<a href="https://discord.gg/E99x3jhtr8" target="_blank" rel="noopener">Discord</a>';
    html += '</div>';
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
    var href = it.href || (isAlbum ? '/album.html?id=' + it.id : it._type === 'playlist' ? '/playlist.html?id=' + it.id : '/track.html?id=' + it.id);
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
            '<a class="btn btn-secondary btn-sm" href="/browse.html" onclick="navigate(\'/browse.html\');return false;">Browse</a></div>';
          return;
        }
      } else {
        if (!loggedIn) {
          list.innerHTML = '<div class="wv-lib-empty"><b>Sign in to see your library</b><p>Liked comps, edits and playlists live here.</p>' +
            '<a class="btn btn-primary btn-sm" href="/login.html">Log in</a></div>';
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
  window._sidebarLibRender = _renderLib;

  // ── Topbar HTML ───────────────────────────────────────────────
  function buildTopbarHTML() {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
    var isLoggedIn = !!localStorage.getItem('token');

    var html = '<button id="wv-menu-btn" class="wv-icon-circle" onclick="window.openMobileDrawer()" style="display:none;" aria-label="Menu">' + icon('menu') + '</button>';
    html += '<div class="wv-topbar-nav">' +
      '<button onclick="history.back()" aria-label="Back" title="Back">‹</button>' +
      '<button onclick="history.forward()" aria-label="Forward" title="Forward">›</button>' +
      '</div>';

    html += '<div class="wv-topbar-mobile-logo">wavernrs</div>';

    html += '<div class="wv-topbar-search">' +
      '<div class="wv-input wv-search-wrap" onclick="document.getElementById(\'wv-search-inp\').focus()">' +
      icon('search') +
      '<input id="wv-search-inp" placeholder="What do you want to play?" autocomplete="off" style="flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text);font-family:inherit;padding:0;" ' +
      'oninput="window._topbarSuggest(this)" onfocus="window._topbarSuggest(this)" ' +
      'onkeydown="if(event.key===\'Enter\'){var q=this.value.trim();if(q){document.getElementById(\'wv-suggest\')&&document.getElementById(\'wv-suggest\').remove();navSearch(q);}}">' +
      '</div></div>';
    html += '<button id="wv-search-btn-mobile" class="wv-icon-circle" onclick="navigate(\'/search.html\')" style="display:none;" aria-label="Search">' + icon('search') + '</button>';

    html += '<div class="wv-topbar-right">';
    if (isLoggedIn && user) {
      html += '<a href="/upload.html" class="wv-pill" style="padding:7px 14px;font-size:12.5px;background:rgba(0,0,0,0.55);" onclick="navigate(\'/upload.html\');return false;">Upload</a>';
      html += '<button class="wv-icon-circle" id="wv-notif-btn" title="Notifications" onclick="window._toggleNotifPanel(event)" style="position:relative;">' +
              icon('bell') +
              '<span id="wv-notif-dot" style="position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--brand);display:none;"></span>' +
              '</button>';
      html += '<button class="wv-icon-circle" id="wv-more-btn" onclick="window._toggleMoreMenu(event)" title="More">' + icon('more') + '</button>';
      var initials = (user.username || user.display_name || '?').charAt(0).toUpperCase();
      html += '<div class="wv-avatar" onclick="navigate(getProfileHref())" title="My profile">' + initials + '</div>';
    } else {
      html += '<a href="/register.html" class="wv-pill" style="padding:7px 14px;font-size:12.5px;background:transparent;color:var(--text-2);">Sign up</a>';
      html += '<a href="/login.html" class="wv-pill is-active" style="padding:8px 22px;font-size:13px;">Log in</a>';
    }
    html += '</div>';
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
          (d.artists || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/artist.html?id=' + a.id, a.profile_image_url, a.display_name, 'Artist', true)); });
          (d.albums || []).slice(0, 4).forEach(function(a) { rows.push(_sugRow('/album.html?id=' + a.id, a.cover_url, a.title, 'Comp · ' + (a.artists ? a.artists.display_name : ''))); });
          (d.tracks || []).slice(0, 4).forEach(function(t) { rows.push(_sugRow('/track.html?id=' + t.id, t.cover_url || (t.albums && t.albums.cover_url), t.title, 'Edit · ' + (t.artists ? t.artists.display_name : ''))); });
          (d.archived || []).slice(0, 3).forEach(function(a) { rows.push(_sugRow('/album.html?id=' + a.id, a.cover_url, a.title, 'Archive · ' + (a.archive_artist_name || ''))); });
          var el = document.getElementById('wv-suggest');
          if (!el) {
            el = document.createElement('div'); el.id = 'wv-suggest';
            var wrap = inp.closest('.wv-topbar-search'); (wrap || document.body).appendChild(el);
          }
          el.innerHTML = (rows.length ? rows.join('') : '<div class="wv-lib-s" style="padding:12px 14px;">No matches</div>') +
            '<a class="wv-sug-all" href="/search.html?q=' + encodeURIComponent(q) + '" onclick="navSearch(' + JSON.stringify(q).replace(/"/g, '&quot;') + ');return false;">See all results for “' + _escL(q) + '”</a>';
        }).catch(function() {});
    }, 180);
  };
  document.addEventListener('click', function(e) { if (!e.target.closest('#wv-suggest') && !e.target.closest('.wv-topbar-search')) _closeSuggest(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') _closeSuggest(); });
  window.addEventListener('popstate', _closeSuggest);

  // ── Shared helper: resolve the current user's public profile URL ──
  function getProfileHref() {
    return '/dashboard.html';
  }
  window.getProfileHref = getProfileHref;

  // ── Mobile tabs ───────────────────────────────────────────────
  function buildMobileTabsHTML() {
    var cur = pageId();
    var tabs = [
      { id: 'home', label: 'Home', href: '/index.html', ic: 'home' },
      { id: 'browse', label: 'Browse', href: '/browse.html', ic: 'discover' },
      { id: 'search', label: 'Search', href: '/search.html', ic: 'search' },
      { id: 'library', label: 'Library', href: '/library.html', ic: 'list' },
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
      ['Profile', function() { navigate('/dashboard.html'); }],
      ['Settings', function() { navigate('/settings.html'); }],
      [isLight ? 'Dark mode' : 'Light mode', function() { window.setTheme(isLight ? 'dark' : 'light'); }],
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

  function _renderNotifPanel(notifs) {
    var panel = document.getElementById('wv-notif-panel');
    if (!panel) return;
    if (!notifs || !notifs.length) {
      panel.querySelector('.wv-notif-list').innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--text-3);font-size:13px;">No notifications yet</div>';
      return;
    }
    panel.querySelector('.wv-notif-list').innerHTML = notifs.map(function(n) {
      return '<div class="wv-notif-item' + (n.read ? '' : ' unread') + '" onclick="window._markNotifRead(\'' + n.id + '\',this)">' +
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
    var hasUnread = _notifCache && _notifCache.some(function(n) { return !n.read; });
    dot.style.display = hasUnread ? 'block' : 'none';
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
    }, 60000);
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
      extractCoverHues(url, seed || url, function(colors) { if (gen === _washGen) _applyWash(colors); });
    } else {
      _applyWash(typeof coverHues === 'function' ? coverHues(seed || url) : null);
    }
  };
  // Theme: persisted, applied to body + app root without a reload.
  window.setTheme = function(t) {
    t = t === 'light' ? 'light' : 'dark';
    localStorage.setItem('wv_theme', t);
    [document.body, document.getElementById('wv-root'), document.getElementById('wv-lockscreen')].forEach(function(el) {
      if (!el) return;
      el.classList.remove('theme-light', 'theme-dark');
      el.classList.add('theme-' + t);
    });
    document.querySelectorAll('input[name="wv-theme"]').forEach(function(r) { r.checked = r.value === t; });
  };
  window.getTheme = function() { return localStorage.getItem('wv_theme') === 'light' ? 'light' : 'dark'; };
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

    var theme = localStorage.getItem('wv_theme') === 'light' ? 'light' : 'dark';

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
      '<div id="wv-content"><div id="wv-banners"></div><div id="view">' + viewContent + '</div></div>' +
      // Player slot
      '<div id="wv-player-slot"></div>' +
      // Mobile-only elements (hidden on desktop via CSS)
      '<nav id="wv-mobile-tabs" class="wv-mobile-tabs">' + buildMobileTabsHTML() + '</nav>' +
      '<div id="wv-drawer-overlay" class="wv-drawer-overlay" onclick="window.closeMobileDrawer()"></div>' +
      '<aside id="wv-drawer" class="wv-drawer">' +
        buildSidebarHTML() +
      '</aside>';

    // Also apply theme class to body so anything appended outside #wv-root
    // (modals, dropdown menus) also inherits the CSS custom properties
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.insertBefore(root, document.body.firstChild);

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
    _renderLib();
    if (localStorage.getItem('token')) _loadLibData();

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
  window.renderSiteBanners = async function() {
    var container = document.getElementById('wv-banners');
    if (!container) return;
    try {
      var res = await fetch(API_BASE + '/site/banners');
      var banners = await res.json();
      if (!banners || !banners.length) { container.innerHTML = ''; return; }
      container.innerHTML = banners.map(function(b) {
        return '<div class="site-banner ' + (b.type || 'info') + '">' +
          (b.message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
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
    if (!token) { sessionStorage.removeItem('wv_is_mod'); sessionStorage.removeItem('wv_is_archiver'); return; }
    var base = typeof API_BASE !== 'undefined' ? API_BASE : '';
    var headers = { 'Authorization': 'Bearer ' + token };
    Promise.all([
      fetch(base + '/mod/check', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
      fetch(base + '/archive/check', { headers: headers }).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
    ]).then(function(results) {
      var isMod = !!(results[0] && results[0].is_mod);
      var isArchiver = !!(results[1] && results[1].is_archiver);
      var wasMod = sessionStorage.getItem('wv_is_mod') === 'true';
      var wasArchiver = sessionStorage.getItem('wv_is_archiver') === 'true';
      sessionStorage.setItem('wv_is_mod', isMod ? 'true' : 'false');
      sessionStorage.setItem('wv_is_archiver', isArchiver ? 'true' : 'false');
      if (isMod || isArchiver || wasMod !== isMod || wasArchiver !== isArchiver) {
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
    img.src = window.wvImg(src, sizeFor(img));
    if (!img.getAttribute('loading')) img.loading = 'lazy';
    if (!img.getAttribute('decoding')) img.decoding = 'async';
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      if (img.dataset.wvOrig && img.src !== img.dataset.wvOrig) img.src = img.dataset.wvOrig;
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

// ── Ensure playlists.js is available on all pages (SPA doesn't reload src scripts) ──
(function () {
  if (document.querySelector('script[src*="playlists.js"]') || typeof window.openAddToPlaylist === 'function') return;
  var s = document.createElement('script');
  s.src = '/js/playlists.js';
  document.head.appendChild(s);
})();

// ── Ensure ratings.js is available on all pages (SPA doesn't reload src scripts) ──
(function () {
  if (document.querySelector('script[src*="ratings.js"]') || typeof window.loadRatings === 'function') return;
  var s = document.createElement('script');
  s.src = '/js/ratings.js';
  document.head.appendChild(s);
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
          '<button onclick="location.assign(\'/community.html\')" class="wv-pill brand">Community</button>' +
          '<button onclick="location.assign(\'/login.html\')" class="wv-pill">Log in</button>' +
          '<button onclick="location.assign(\'/register.html\')" class="wv-pill">Sign up</button>' +
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

