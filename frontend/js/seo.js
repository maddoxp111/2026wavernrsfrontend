// wvSeo: keeps the <head> honest as the single-page app moves around.
// - meta description, canonical (tracking params stripped, /index -> /),
//   og:* / twitter:* tags and robots noindex for private pages
// - one <script type="application/ld+json" id="wv-ld"> with schema.org data
//   for the entity on screen (comp, edit, artist, playlist, archive artist,
//   featured artist) plus a BreadcrumbList, and WebSite + Organization on home
// Entity data comes from the page's own api() calls (window.api is wrapped),
// with one cached re-read as a fallback when the page fetched it before this
// file loaded. document.title is never touched: the player owns it.
(function () {
  'use strict';
  if (window.wvSeo) return;

  var SITE = 'https://www.wavernrs.com';
  var LOGO = SITE + '/icons/icon-512.png';
  var OG_DEFAULT = SITE + '/og-image.jpg';
  var DISCORD = 'https://discord.gg/j2jGmw5CZH';
  var HOME_DESC = 'wavernrs is where yeditors post their Ye comps and edits. Stream new drops, dig through a 90k+ comp archive and keep up with every leak on the tracker.';

  var ROUTES = {
    home: ['wavernrs: Ye comps, edits and the archive', HOME_DESC],
    browse: ['Browse new and trending comps on wavernrs', 'Fresh uploads, trending comps and every era of Ye comps and edits, all in one place.'],
    charts: ['Charts: the most played comps and edits right now', 'What the wavernrs community is playing today, this week and all time.'],
    archive: ['The archive: every Ye comp ever made', 'Dig through tens of thousands of archived Ye comps and edits by era, yeditor and date.'],
    'archive-artist': ['Archive yeditors on wavernrs', 'Every yeditor in the wavernrs archive and the comps they made.'],
    artists: ['Artists: the yeditors behind the comps', 'The yeditors and comp makers posting on wavernrs.'],
    music: ['Featured artists on wavernrs', 'Every artist featured on Ye comps and edits, and where they show up.'],
    eras: ['Eras: every Ye era on wavernrs', 'Comps and edits sorted era by era, from The College Dropout to Bully.'],
    tracker: ['Trackers: every comp and edit, era by era', 'The community trackers, matched to what you can play on wavernrs.'],
    resources: ['The Ye archive on wavernrs', 'Every Ye song, leak, tweet, tour and Yeezy piece, with credits and samples.'],
    community: ['Community on wavernrs', 'Posts, requests and finds from the wavernrs community.'],
    radio: ['Radio: listen together on wavernrs', 'Live community stations playing Ye comps and edits around the clock.'],
    lp: ['Listening parties on wavernrs', 'Press play together: live listening parties for new comps and edits.'],
    playlists: ['Playlists on wavernrs', 'Community playlists of Ye comps and edits.'],
    stats: ['wavernrs by the numbers', 'Plays, uploads and eras across the whole site.'],
    search: ['Search wavernrs', 'Search comps, edits, yeditors, playlists and the Ye archive.'],
    about: ['About wavernrs', 'What wavernrs is, who runs it and how it works.'],
    awards: ['Hall of Fame on wavernrs', 'Every Edit of the Week winner and honored yedit on wavernrs, in one place.'],
    wrapped: ['Recap: your year on wavernrs', 'Your most played comps, edits and eras on wavernrs.'],
    whatsnew: ["What's new on wavernrs", 'Every new feature and fix on wavernrs, as it ships.'],
    notifications: ['Notifications on wavernrs', 'Likes, new followers, milestones, replies, leaks of songs you follow and listening parties, all in one place.'],
    feed: ['Your feed on wavernrs', 'New comps and edits from the yeditors you follow.'],
    games: ['Games on wavernrs', 'Ye guessing games and quizzes.'],
    status: ['wavernrs status', 'Live status of the wavernrs site and API.'],
    album: ['A comp on wavernrs', 'Listen to this comp on wavernrs.'],
    track: ['An edit on wavernrs', 'Listen to this edit on wavernrs.'],
    artist: ['A yeditor on wavernrs', 'Comps and edits by this yeditor on wavernrs.'],
    playlist: ['A playlist on wavernrs', 'A playlist of Ye comps and edits on wavernrs.']
  };

  // Query params that change what the page is about. Everything else
  // (utm_*, ref, t=seconds on album pages, sort, ...) is dropped from canonical.
  var PARAMS = {
    album: ['id'], track: ['id'], artist: ['id'], playlist: ['id'], lp: ['id'],
    'archive-artist': ['a'], tracker: ['t'], music: ['a'], community: ['post'],
    radio: ['s'], search: ['q'],
    resources: ['view', 'album', 'tweet', 'item', 't', 'year', 'era', 'sub', 'filter', 'tab']
  };

  var NOINDEX = {
    settings: 1, dashboard: 1, adminpanel: 1, modpanel: 1, archivepanel: 1, archivetrackers: 1, radiopanel: 1,
    claim: 1, 'auth-callback': 1, 'playlist-builder': 1, upload: 1, library: 1, history: 1,
    login: 1, register: 1, search: 1, '404': 1
  };

  var state = { key: '', entityKey: '', entity: null, fallbackTimer: 0 };
  var cache = {};
  var cacheOrder = [];

  function remember(k, v) {
    if (!cache[k]) cacheOrder.push(k);
    cache[k] = v;
    while (cacheOrder.length > 30) delete cache[cacheOrder.shift()];
  }

  function pageKey() {
    var p = (location.pathname || '/').replace(/\.html$/, '').replace(/\/+$/, '');
    if (!p || p === '/index') return 'home';
    return p.slice(1);
  }

  function pagePath(key) {
    return key === 'home' ? '/' : '/' + key;
  }

  function canonicalUrl(key) {
    var keep = PARAMS[key] || [];
    var sp = new URLSearchParams(location.search);
    var out = [];
    for (var i = 0; i < keep.length; i++) {
      var v = sp.get(keep[i]);
      if (v) out.push(encodeURIComponent(keep[i]) + '=' + encodeURIComponent(v.slice(0, 200)));
    }
    return SITE + pagePath(key) + (out.length ? '?' + out.join('&') : '');
  }

  function entityParam(key) {
    var sp = new URLSearchParams(location.search);
    if (key === 'album' || key === 'track' || key === 'artist' || key === 'playlist') return sp.get('id') || '';
    if (key === 'archive-artist' || key === 'music') return sp.get('a') || '';
    return '';
  }

  function clip(s, n) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  }

  function num(n) {
    var v = Number(n);
    return isFinite(v) && v > 0 ? v.toLocaleString('en-US') : '';
  }

  function joinParts(a) {
    return a.filter(Boolean).join(' · ');
  }

  function day(v) {
    if (!v) return undefined;
    var d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }

  function isoDuration(sec) {
    var s = Math.round(Number(sec));
    if (!isFinite(s) || s <= 0) return undefined;
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return 'PT' + (h ? h + 'H' : '') + (m ? m + 'M' : '') + (r || (!h && !m) ? r + 'S' : '');
  }

  function httpUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : undefined;
  }

  function slugFor(name) {
    if (typeof window.archiveArtistSlug === 'function') {
      try { return window.archiveArtistSlug(name); } catch (_) {}
    }
    return String(name || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function clean(o) {
    if (Array.isArray(o)) return o.map(clean).filter(function (x) { return x !== undefined; });
    if (o && typeof o === 'object') {
      var out = {};
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        var v = clean(o[k]);
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
        out[k] = v;
      }
      return out;
    }
    return o;
  }

  function listens(n) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return undefined;
    return { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ListenAction', userInteractionCount: v };
  }

  // ── <head> helpers ────────────────────────────────────────────────────────
  function metaTag(attr, name, content) {
    var el = document.head.querySelector('meta[' + attr + '="' + name + '"]');
    if (content == null || content === '') {
      if (el && el.hasAttribute('data-wv-seo')) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      el.setAttribute('data-wv-seo', '');
      document.head.appendChild(el);
    }
    if (el.getAttribute('content') !== content) el.setAttribute('content', content);
  }

  function linkTag(rel, href) {
    var el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      el.setAttribute('data-wv-seo', '');
      document.head.appendChild(el);
    }
    if (el.getAttribute('href') !== href) el.setAttribute('href', href);
  }

  function setLd(graph) {
    var el = document.getElementById('wv-ld');
    if (!graph || !graph.length) {
      if (el) el.remove();
      return;
    }
    var json = JSON.stringify({ '@context': 'https://schema.org', '@graph': clean(graph) }).replace(/</g, '\\u003c');
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'wv-ld';
      document.head.appendChild(el);
    }
    if (el.textContent !== json) el.textContent = json;
  }

  function applyHead(m) {
    metaTag('name', 'description', m.description);
    linkTag('canonical', m.url);
    metaTag('name', 'robots', m.noindex ? 'noindex, follow' : '');
    metaTag('property', 'og:site_name', 'wavernrs');
    metaTag('property', 'og:type', m.ogType || 'website');
    metaTag('property', 'og:title', m.title);
    metaTag('property', 'og:description', m.description);
    metaTag('property', 'og:url', m.url);
    metaTag('property', 'og:image', m.image || OG_DEFAULT);
    metaTag('property', 'og:image:alt', m.imageAlt || 'wavernrs');
    metaTag('name', 'twitter:card', 'summary_large_image');
    metaTag('name', 'twitter:title', m.title);
    metaTag('name', 'twitter:description', m.description);
    metaTag('name', 'twitter:image', m.image || OG_DEFAULT);
  }

  // ── schema.org builders ───────────────────────────────────────────────────
  function crumbs(items) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: items.map(function (it, i) {
        return { '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] };
      })
    };
  }

  function creatorOf(d) {
    if (d.is_archive && d.archive_artist_name) {
      return { '@type': 'Person', name: d.archive_artist_name, url: SITE + '/archive-artist?a=' + encodeURIComponent(slugFor(d.archive_artist_name)) };
    }
    var a = d.artists;
    if (a && a.display_name) return { '@type': 'Person', name: a.display_name, url: a.id ? SITE + '/artist?id=' + encodeURIComponent(a.id) : undefined };
    if (d.archive_artist_name) return { '@type': 'Person', name: d.archive_artist_name };
    return undefined;
  }

  function albumTracks(d) {
    var rows = Array.isArray(d.album_tracks) ? d.album_tracks : Array.isArray(d.tracks) ? d.tracks : [];
    return rows.map(function (r) { return (r && r.tracks) || r; })
      .filter(function (t) { return t && t.title; })
      .sort(function (a, b) { return (a.track_position || 0) - (b.track_position || 0); });
  }

  function buildAlbum(d, url) {
    var who = creatorOf(d);
    var tracks = albumTracks(d);
    var n = Number(d.track_count) || tracks.length || 0;
    var era = d.era_tag && d.era_tag.name;
    var desc = clip(d.description, 300) || joinParts([
      d.is_archive ? 'Archived comp' : 'Comp',
      who ? 'by ' + who.name : '',
      n ? n + (n === 1 ? ' track' : ' tracks') : '',
      era && !/^other$/i.test(era) ? era + ' era' : '',
      num(d.play_count) ? num(d.play_count) + ' plays' : '',
      'on wavernrs'
    ]);
    var cover = httpUrl(d.cover_url);
    var node = {
      '@type': 'MusicAlbum',
      '@id': url + '#album',
      name: d.title,
      url: url,
      image: cover,
      description: desc,
      byArtist: who,
      numTracks: n || undefined,
      datePublished: day(d.original_date) || day(d.created_at),
      albumProductionType: 'https://schema.org/CompilationAlbum',
      interactionStatistic: listens(d.play_count),
      track: tracks.length ? {
        '@type': 'ItemList',
        numberOfItems: tracks.length,
        itemListElement: tracks.slice(0, 100).map(function (t, i) {
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'MusicRecording',
              name: t.title,
              url: t.id ? SITE + '/track?id=' + encodeURIComponent(t.id) : undefined,
              duration: isoDuration(t.duration || t.duration_sec || t.length_sec)
            }
          };
        })
      } : undefined
    };
    var section = d.is_archive ? ['Archive', SITE + '/archive'] : ['Browse', SITE + '/browse'];
    return {
      title: d.title + (who ? ' by ' + who.name : '') + ' on wavernrs',
      description: desc,
      image: cover,
      imageAlt: cover ? 'Cover of ' + d.title : '',
      ogType: 'music.album',
      graph: [node, crumbs([['wavernrs', SITE + '/'], section, [d.title, url]])]
    };
  }

  function buildTrack(d, url) {
    var who = creatorOf(d);
    var alb = d.albums && d.albums.title ? d.albums : null;
    var albumUrl = (alb && alb.id) || d.album_id ? SITE + '/album?id=' + encodeURIComponent((alb && alb.id) || d.album_id) : undefined;
    var cover = httpUrl(d.cover_url) || httpUrl(alb && alb.cover_url);
    var desc = clip(d.description, 300) || joinParts([
      'Edit',
      who ? 'by ' + who.name : '',
      alb ? 'from ' + alb.title : '',
      num(d.play_count) ? num(d.play_count) + ' plays' : '',
      'on wavernrs'
    ]);
    var node = {
      '@type': 'MusicRecording',
      '@id': url + '#recording',
      name: d.title,
      url: url,
      image: cover,
      description: desc,
      byArtist: who,
      duration: isoDuration(d.duration || d.duration_sec || d.length_sec),
      datePublished: day(d.created_at),
      inAlbum: alb || albumUrl ? { '@type': 'MusicAlbum', name: alb ? alb.title : undefined, url: albumUrl } : undefined,
      interactionStatistic: listens(d.play_count)
    };
    var trail = [['wavernrs', SITE + '/']];
    if (alb && albumUrl) trail.push([alb.title, albumUrl]);
    trail.push([d.title, url]);
    return {
      title: d.title + (who ? ' by ' + who.name : '') + ' on wavernrs',
      description: desc,
      image: cover,
      imageAlt: cover ? 'Cover of ' + d.title : '',
      ogType: 'music.song',
      graph: [node, crumbs(trail)]
    };
  }

  function buildArtist(d, url) {
    var a = (d && d.artist) || d;
    var img = httpUrl(a.profile_image_url);
    var desc = clip(a.bio, 300) || joinParts([
      a.users && a.users.username ? '@' + a.users.username : 'Yeditor',
      num(a.track_count) ? num(a.track_count) + ' edits' : '',
      num(a.follower_count) ? num(a.follower_count) + ' followers' : '',
      'on wavernrs'
    ]);
    var node = {
      '@type': 'Person',
      '@id': url + '#person',
      name: a.display_name,
      alternateName: a.users && a.users.username ? '@' + a.users.username : undefined,
      url: url,
      image: img,
      description: desc,
      sameAs: httpUrl(a.website) ? [a.website] : undefined
    };
    return {
      title: a.display_name + ' on wavernrs',
      description: desc,
      image: img,
      imageAlt: img ? a.display_name : '',
      ogType: 'profile',
      graph: [node, crumbs([['wavernrs', SITE + '/'], ['Artists', SITE + '/artists'], [a.display_name, url]])]
    };
  }

  function buildPlaylist(d, url) {
    var pl = (d && d.playlist) || d;
    var tracks = Array.isArray(pl.tracks) ? pl.tracks : (Array.isArray(d.tracks) ? d.tracks : []);
    var n = Number(pl.track_count) || tracks.length || 0;
    var owner = (pl.owner && (pl.owner.username || pl.owner.display_name)) || '';
    var mosaic = Array.isArray(pl.mosaic) ? pl.mosaic.filter(Boolean) : [];
    var img = httpUrl(pl.cover_url) || httpUrl(mosaic[0]);
    var desc = clip(pl.description, 300) || joinParts([
      owner ? 'Playlist by @' + owner : 'Playlist',
      n ? n + (n === 1 ? ' song' : ' songs') : '',
      'on wavernrs'
    ]);
    var node = {
      '@type': 'MusicPlaylist',
      '@id': url + '#playlist',
      name: pl.title,
      url: url,
      image: img,
      description: desc,
      numTracks: n || undefined,
      author: owner ? { '@type': 'Person', name: owner } : undefined,
      track: tracks.length ? tracks.slice(0, 100).map(function (r) {
        var t = (r && (r.tracks || r.track)) || r;
        return t && t.title ? { '@type': 'MusicRecording', name: t.title, url: t.id ? SITE + '/track?id=' + encodeURIComponent(t.id) : undefined } : undefined;
      }).filter(Boolean) : undefined
    };
    return {
      title: pl.title + (owner ? ' by @' + owner : '') + ' on wavernrs',
      description: desc,
      image: img,
      imageAlt: img ? pl.title : '',
      ogType: 'music.playlist',
      graph: [node, crumbs([['wavernrs', SITE + '/'], ['Playlists', SITE + '/playlists'], [pl.title, url]])]
    };
  }

  function buildArchiveArtist(d, url) {
    var n = Number(d.comp_count) || 0;
    var eras = (d.top_eras || []).map(function (e) { return e && e.name; })
      .filter(function (x) { return x && !/^other$/i.test(x); }).slice(0, 3);
    var cover = (d.comps || []).map(function (c) { return c && httpUrl(c.cover_url); }).filter(Boolean)[0];
    var desc = joinParts([
      n ? num(n) + (n === 1 ? ' comp' : ' comps') + ' in the wavernrs archive' : 'Comps in the wavernrs archive',
      eras.length ? 'mostly ' + eras.join(', ') : '',
      num(d.edit_count) ? num(d.edit_count) + (Number(d.edit_count) === 1 ? ' edit' : ' edits') : ''
    ]);
    var node = {
      '@type': 'Person',
      '@id': url + '#person',
      name: d.name,
      alternateName: Array.isArray(d.aliases) && d.aliases.length ? d.aliases.slice(0, 10).map(function (x) { return typeof x === 'string' ? x : x && x.name; }).filter(Boolean) : undefined,
      url: url,
      image: cover,
      description: desc
    };
    return {
      title: d.name + ': ' + (n ? num(n) + (n === 1 ? ' comp' : ' comps') : 'comps') + ' on wavernrs',
      description: desc,
      image: cover,
      imageAlt: cover ? 'Cover art from ' + d.name : '',
      ogType: 'profile',
      graph: [node, crumbs([['wavernrs', SITE + '/'], ['Archive', SITE + '/archive'], [d.name, url]])]
    };
  }

  function buildMusicArtist(d, url) {
    var a = d.artist || d;
    var img = httpUrl(a.photo);
    var edits = Number(a.tracks) || 0, comps = Number(a.comps) || 0;
    var desc = edits
      ? a.name + ' is featured on ' + num(edits) + (edits === 1 ? ' edit' : ' edits') + (comps ? ' across ' + num(comps) + (comps === 1 ? ' comp' : ' comps') : '') + ' on wavernrs.'
      : 'Every comp and edit featuring ' + a.name + ' on wavernrs.';
    var node = { '@type': 'MusicGroup', '@id': url + '#artist', name: a.name, url: url, image: img, description: desc };
    return {
      title: a.name + ' on wavernrs',
      description: desc,
      image: img,
      imageAlt: img ? a.name : '',
      ogType: 'profile',
      graph: [node, crumbs([['wavernrs', SITE + '/'], ['Featured artists', SITE + '/music'], [a.name, url]])]
    };
  }

  // api path -> which page/param it describes, and how to read it
  var MATCHERS = [
    { re: /^\/albums\/([^/?#]+)\/?(?:\?|$)/, page: 'album', build: buildAlbum, ok: function (d) { return d && d.title; } },
    { re: /^\/tracks\/([^/?#]+)\/?(?:\?|$)/, page: 'track', build: buildTrack, ok: function (d) { return d && d.title; } },
    { re: /^\/artists\/([^/?#]+)\/?(?:\?|$)/, page: 'artist', build: buildArtist, ok: function (d) { var a = (d && d.artist) || d; return a && a.display_name; } },
    { re: /^\/playlists\/([^/?#]+)\/?(?:\?|$)/, page: 'playlist', build: buildPlaylist, ok: function (d) { var p = (d && d.playlist) || d; return p && p.title; } },
    { re: /^\/archive\/artists\/([^/?#]+)\/?(?:\?|$)/, page: 'archive-artist', build: buildArchiveArtist, ok: function (d) { return d && d.name; } },
    { re: /^\/music-artists\/([^/?#]+)\/?(?:\?|$)/, page: 'music', build: buildMusicArtist, ok: function (d) { var a = d && (d.artist || d); return a && a.name; } }
  ];

  var FETCH_PATH = {
    album: function (id) { return '/albums/' + encodeURIComponent(id); },
    track: function (id) { return '/tracks/' + encodeURIComponent(id); },
    artist: function (id) { return '/artists/' + encodeURIComponent(id); },
    playlist: function (id) { return '/playlists/' + encodeURIComponent(id); },
    'archive-artist': function (id) { return '/archive/artists/' + encodeURIComponent(id) + '?limit=1'; },
    music: function (id) { return '/music-artists/' + encodeURIComponent(id); }
  };

  function capture(path, data) {
    if (typeof path !== 'string' || !data) return;
    for (var i = 0; i < MATCHERS.length; i++) {
      var m = MATCHERS[i];
      var hit = m.re.exec(path);
      if (!hit || !m.ok(data)) continue;
      var id;
      try { id = decodeURIComponent(hit[1]); } catch (_) { id = hit[1]; }
      remember(m.page + ':' + id, { m: m, data: data });
      if (state.key === m.page && entityParam(state.key) === id) {
        state.entityKey = m.page + ':' + id;
        render();
      }
      return;
    }
  }

  function homeGraph() {
    return [
      {
        '@type': 'WebSite',
        '@id': SITE + '/#website',
        url: SITE + '/',
        name: 'wavernrs',
        description: HOME_DESC,
        inLanguage: 'en',
        publisher: { '@id': SITE + '/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: SITE + '/search?q={search_term_string}' },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'wavernrs',
        url: SITE + '/',
        logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
        image: OG_DEFAULT,
        sameAs: [DISCORD]
      }
    ];
  }

  function sectionGraph(key, url, name) {
    if (key === 'home' || !ROUTES[key] || NOINDEX[key]) return [];
    return [crumbs([['wavernrs', SITE + '/'], [name, url]])];
  }

  var SECTION_NAMES = {
    browse: 'Browse', charts: 'Charts', archive: 'Archive', artists: 'Artists', music: 'Featured artists',
    eras: 'Eras', tracker: 'Trackers', resources: 'Ye archive', community: 'Community', radio: 'Radio',
    lp: 'Listening parties', playlists: 'Playlists', stats: 'Stats', about: 'About', awards: 'Hall of Fame',
    wrapped: 'Recap', whatsnew: "What's new", 'archive-artist': 'Archive'
  };

  function render() {
    var key = state.key;
    var url = canonicalUrl(key);
    var route = ROUTES[key] || [null, null];
    var head = {
      url: url,
      title: route[0] || 'wavernrs',
      description: route[1] || HOME_DESC,
      noindex: !!NOINDEX[key],
      ogType: 'website'
    };
    var graph = [];
    var ent = state.entityKey && cache[state.entityKey];
    if (ent) {
      var built = null;
      try { built = ent.m.build(ent.data, url); } catch (_) { built = null; }
      if (built) {
        head.title = built.title;
        head.description = built.description;
        head.image = built.image;
        head.imageAlt = built.imageAlt;
        head.ogType = built.ogType;
        graph = built.graph;
      }
    } else if (key === 'home') {
      graph = homeGraph();
    } else if (!entityParam(key) && SECTION_NAMES[key]) {
      graph = sectionGraph(key, url, SECTION_NAMES[key]);
    }
    if (key === 'search') {
      var q = clip(new URLSearchParams(location.search).get('q'), 80);
      if (q) head.description = 'Comps, edits, yeditors and Ye archive results for “' + q + '” on wavernrs.';
    }
    applyHead(head);
    setLd(graph);
  }

  function scheduleFallback() {
    clearTimeout(state.fallbackTimer);
    var key = state.key;
    var id = entityParam(key);
    if (!id || !FETCH_PATH[key] || state.entityKey) return;
    var want = key + ':' + id;
    state.fallbackTimer = setTimeout(function () {
      if (state.key !== key || entityParam(key) !== id || state.entityKey === want) return;
      if (typeof window.api !== 'function') return;
      var run = function () {
        try {
          Promise.resolve(window.api(FETCH_PATH[key](id), { cache: 'force-cache' })).catch(function () {});
        } catch (_) {}
      };
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
      else run();
    }, 2500);
  }

  function refresh() {
    state.key = pageKey();
    var id = entityParam(state.key);
    var ek = id ? state.key + ':' + id : '';
    state.entityKey = ek && cache[ek] ? ek : '';
    render();
    scheduleFallback();
  }

  var queued = false;
  var lastHref = '';
  function onUrlChange() {
    if (queued) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      var href = location.pathname + location.search;
      if (href === lastHref) return;
      lastHref = href;
      refresh();
    }, 0);
  }

  // ── hooks ─────────────────────────────────────────────────────────────────
  function wrapApi() {
    var orig = window.api;
    if (typeof orig !== 'function' || orig._wvSeo) return;
    var wrapped = function (path, opts) {
      var p = orig.apply(this, arguments);
      var isGet = !opts || !opts.method || String(opts.method).toUpperCase() === 'GET';
      if (isGet && p && typeof p.then === 'function') {
        p.then(function (data) { try { capture(path, data); } catch (_) {} }, function () {});
      }
      return p;
    };
    for (var k in orig) { if (Object.prototype.hasOwnProperty.call(orig, k)) wrapped[k] = orig[k]; }
    wrapped._wvSeo = true;
    wrapped._wvSeoOrig = orig;
    window.api = wrapped;
  }

  function wrapHistory(name) {
    var orig = history[name];
    if (typeof orig !== 'function' || orig._wvSeo) return;
    var w = function () {
      var r = orig.apply(this, arguments);
      onUrlChange();
      return r;
    };
    w._wvSeo = true;
    history[name] = w;
  }

  wrapApi();
  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('wv-navigate', function () { lastHref = ''; onUrlChange(); });

  window.wvSeo = {
    refresh: function () { lastHref = ''; onUrlChange(); },
    // Pages can hand over an entity they loaded some other way.
    capture: function (path, data) { try { capture(path, data); } catch (_) {} },
    // Pages can override the description/image for the current URL.
    set: function (o) {
      if (!o || typeof o !== 'object') return;
      var url = canonicalUrl(state.key);
      applyHead({
        url: url,
        title: o.title || (ROUTES[state.key] || [])[0] || 'wavernrs',
        description: o.description || (ROUTES[state.key] || [])[1] || HOME_DESC,
        image: httpUrl(o.image),
        imageAlt: o.imageAlt,
        noindex: !!NOINDEX[state.key],
        ogType: o.type || 'website'
      });
    }
  };

  lastHref = location.pathname + location.search;
  refresh();
})();
