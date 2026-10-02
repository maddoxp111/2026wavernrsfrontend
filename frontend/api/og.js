// Link previews for crawlers. Humans never reach this: vercel.json only
// rewrites here when the user agent looks like a link unfurler, so the
// normal single-page app is untouched.
const API = process.env.WAVERNRS_API || 'https://2026wavernrs-production.up.railway.app/api';
const SITE = 'https://www.wavernrs.com';
const FALLBACK_IMAGE = SITE + '/og-image.jpg';
const TAGLINE = 'Where yeditors post their Ye comps and edits. Stream new drops, dig through a 90k+ comp archive and catch every leak as it lands.';

function bigImage(url) {
  if (!url || url === FALLBACK_IMAGE) return FALLBACK_IMAGE;
  const u = String(url);
  if (!/^https?:\/\//i.test(u)) return FALLBACK_IMAGE;
  if (/^https?:\/\/wsrv\.nl\//i.test(u)) return u;
  return 'https://wsrv.nl/?url=' + encodeURIComponent(u) + '&w=1200&h=630&fit=contain&cbg=121212&output=jpg&q=85';
}

function clip(s, n) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function num(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('en-US') : null;
}

async function getJSON(path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(API + path, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function joinParts(parts) {
  return parts.filter(Boolean).join(' · ');
}

async function album(id) {
  const d = await getJSON('/albums/' + encodeURIComponent(id));
  if (!d || !d.title) return null;
  const who = d.is_archive
    ? (d.archive_artist_name || 'Archive')
    : ((d.artists && d.artists.display_name) || 'Unknown');
  const kind = d.is_archive ? 'Archive upload' : 'Comp';
  return {
    title: d.title + ' — ' + who,
    description: d.description || joinParts([
      kind,
      d.track_count ? d.track_count + (d.track_count === 1 ? ' track' : ' tracks') : null,
      num(d.play_count) ? num(d.play_count) + ' plays' : null,
      'on wavernrs',
    ]),
    image: d.cover_url || FALLBACK_IMAGE,
    type: 'music.album',
  };
}

async function track(id) {
  const d = await getJSON('/tracks/' + encodeURIComponent(id));
  if (!d || !d.title) return null;
  const who = (d.artists && d.artists.display_name) || d.archive_artist_name || 'Unknown';
  return {
    title: d.title + ' — ' + who,
    description: joinParts([
      'Edit',
      d.albums && d.albums.title ? 'from ' + d.albums.title : null,
      num(d.play_count) ? num(d.play_count) + ' plays' : null,
      'on wavernrs',
    ]),
    image: d.cover_url || (d.albums && d.albums.cover_url) || FALLBACK_IMAGE,
    type: 'music.song',
  };
}

async function artist(id) {
  const d = await getJSON('/artists/' + encodeURIComponent(id));
  const a = (d && d.artist) || d;
  if (!a || !a.display_name) return null;
  return {
    title: a.display_name + ' on wavernrs',
    description: a.bio || joinParts([
      a.users && a.users.username ? '@' + a.users.username : 'Artist',
      num(a.track_count) ? num(a.track_count) + ' edits' : null,
      num(a.follower_count) ? num(a.follower_count) + ' followers' : null,
      'on wavernrs',
    ]),
    image: a.profile_image_url || FALLBACK_IMAGE,
    type: 'profile',
  };
}

async function playlist(id) {
  const d = await getJSON('/playlists/' + encodeURIComponent(id));
  const pl = (d && d.playlist) || d;
  if (!pl || !pl.title) return null;
  const n = pl.track_count || (Array.isArray(pl.tracks) ? pl.tracks.length : 0);
  const mosaic = Array.isArray(pl.mosaic) ? pl.mosaic.filter(Boolean) : [];
  return {
    title: pl.title + ' — playlist',
    description: pl.description || joinParts([
      pl.owner && pl.owner.username ? 'Playlist by @' + pl.owner.username : 'Playlist',
      n ? n + (n === 1 ? ' song' : ' songs') : null,
      'on wavernrs',
    ]),
    image: pl.cover_url || mosaic[0] || FALLBACK_IMAGE,
    type: 'music.playlist',
  };
}

async function lp(id) {
  const d = await getJSON('/lp/' + encodeURIComponent(id));
  if (!d || !d.lp) return null;
  const l = d.lp;
  const host = (l.host && l.host.name) || 'someone';
  const state = l.status === 'live' ? '🔴 Live now' : l.status === 'ended' ? 'Ended' : (l.starts_at ? 'Starts ' + new Date(l.starts_at).toUTCString().replace(/:\d\d GMT$/, ' UTC') : 'Starting soon');
  const cover = (d.now && d.now.track && d.now.track.cover_url) || ((d.items || [])[0] && d.items[0].track && d.items[0].track.cover_url);
  return {
    title: l.title + ' — listening party',
    description: joinParts([state, 'Hosted by ' + host, (d.items || []).length ? (d.items.length + ' songs') : null, l.description || 'come listen together on wavernrs']),
    image: cover || FALLBACK_IMAGE,
    type: 'website',
  };
}

const YE_VIEWS = {
  tracker: ['The Ye tracker', 'every Ye song, leak and snippet, era by era'],
  tweets: ['Every Ye tweet', 'search thousands of Ye tweets by year, with photos, videos and polls'],
  yeezy: ['The Yeezy archive', 'every Yeezy piece, season by season'],
  tours: ['Ye tours', 'shows, setlists, merch and fan footage from every tour'],
  disco: ['Ye discography', 'every album with producers, samples and the songs he made for other artists'],
  timeline: ['Ye, month by month', 'albums, tweets, leaks, tours, Yeezy and collaborations on one timeline'],
  today: ['On this day in Ye history', 'what ye tweeted, released and leaked on this date, every year'],
};
async function ye(params) {
  const view = YE_VIEWS[params.get('view')] ? params.get('view') : 'tracker';
  if (params.get('view') === 'song' && !params.get('t')) return { title: 'Ye songs — wavernrs', description: 'every version of every Ye song', image: FALLBACK_IMAGE, type: 'website' };
  if (view === 'disco' && params.get('album')) {
    const d = await getJSON('/ye/disco/' + encodeURIComponent(params.get('album')));
    const a = d && d.album;
    if (a) {
      const tracks = a.discs.reduce((n, x) => n + x.tracks.length, 0);
      const prod = {};
      a.discs.forEach(x => x.tracks.forEach(t => t.producers.forEach(p => { if (!/^(ye|kanye west)$/i.test(p)) prod[p] = (prod[p] || 0) + 1; })));
      const top = Object.keys(prod).sort((x, y) => prod[y] - prod[x]).slice(0, 3);
      return { title: a.title + ' — ' + a.artist + ' (' + a.year + ')', description: joinParts([tracks + ' songs', top.length ? 'with ' + top.join(', ') : null, 'credits and samples on wavernrs']), image: a.cover || FALLBACK_IMAGE, type: 'music.album' };
    }
  }
  if (view === 'tweets' && params.get('tweet')) {
    const d = await getJSON('/ye/tweets/' + encodeURIComponent(params.get('tweet')));
    const t = d && d.tweet;
    if (t) {
      const when = new Date(t.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const img = (t.media || []).map(m => m.image_url).find(Boolean) || (d.profile && d.profile.pfp) || FALLBACK_IMAGE;
      const text = String(t.text || '').replace(/\s*https?:\/\/\S+/g, '').trim();
      return { title: 'ye on ' + when, description: (text.length > 280 ? text.slice(0, 277) + '…' : text) || 'a ye tweet', image: img, type: 'article' };
    }
  }
  if (params.get('view') === 'song' && params.get('t')) {
    const d = await getJSON('/ye/song?t=' + encodeURIComponent(params.get('t')));
    if (d && d.title) {
      const rel = d.released && d.released[0];
      const leaked = (d.tracker || []).filter(x => x.tab !== 'Released' && x.leak).length;
      return { title: d.title + ' — every version', description: joinParts([rel ? 'from ' + rel.album + ' (' + rel.year + ')' : 'unreleased', (d.tracker || []).length ? d.tracker.length + ' on the Ye tracker' : null, leaked ? leaked + ' leaked' : null, rel && rel.producers.length ? 'prod. ' + rel.producers.slice(0, 3).join(', ') : null]), image: (rel && rel.cover ? rel.cover.replace('front-250', 'front-500') : null) || ((d.tracker || []).find(x => x.art) || {}).art || FALLBACK_IMAGE, type: 'music.song' };
    }
  }
  if (view === 'yeezy' && params.get('item')) {
    const d = await getJSON('/ye/yeezy/item/' + encodeURIComponent(params.get('item')));
    const x = d && d.item;
    if (x) return { title: x.title + (x.year ? ' (' + x.year + ')' : ''), description: joinParts([x.sub, x.price ? '$' + x.price : null, 'from the Yeezy archive on wavernrs']), image: (x.images || [])[0] || FALLBACK_IMAGE, type: 'product' };
  }
  if (view === 'tweets' && params.get('filter') === 'today') return { title: 'On this day in Ye history', description: 'what ye tweeted on this date, every year', image: FALLBACK_IMAGE, type: 'website' };
  return { title: YE_VIEWS[view][0] + ' — wavernrs', description: YE_VIEWS[view][1], image: FALLBACK_IMAGE, type: 'website' };
}

async function archiveArtist(slug) {
  const d = await getJSON('/archive/artists/' + encodeURIComponent(slug) + '?limit=8');
  if (!d || !d.name) return null;
  const n = Number(d.comp_count) || 0;
  const eras = (d.top_eras || []).map(e => e && e.name).filter(n2 => n2 && !/^other$/i.test(n2)).slice(0, 3);
  const cover = (d.comps || []).map(c => c && c.cover_url).find(Boolean);
  return {
    title: d.name + ': ' + (n ? num(n) + (n === 1 ? ' comp' : ' comps') : 'comps') + ' on wavernrs',
    description: joinParts([
      eras.length ? 'mostly ' + eras.join(', ') : null,
      Number(d.edit_count) > 0 ? num(d.edit_count) + (Number(d.edit_count) === 1 ? ' edit' : ' edits') : null,
      Number(d.play_count) > 0 ? num(d.play_count) + (Number(d.play_count) === 1 ? ' play' : ' plays') : null,
      'in the wavernrs archive',
    ]),
    image: cover || FALLBACK_IMAGE,
    alt: cover ? 'Cover art from ' + d.name : null,
    type: 'profile',
  };
}

async function trackerMeta(slug) {
  if (!slug) return null;
  if (slug === 'all') return { title: STATIC.tracker[0], description: STATIC.tracker[1], image: FALLBACK_IMAGE, type: 'website' };
  const d = await getJSON('/trackers');
  const list = (d && d.trackers) || [];
  const t = list.find(x => x && x.slug === slug);
  if (!t) return null;
  const counts = joinParts([
    num(t.comps) && t.comps > 0 ? num(t.comps) + ' comps' : null,
    num(t.edits) && t.edits > 0 ? num(t.edits) + ' edits' : null,
    t.entries && t.have ? num(t.have) + ' of ' + num(t.entries) + ' playable here' : null,
  ]);
  return {
    title: t.name + ' — tracker',
    description: clip([t.blurb, counts].filter(Boolean).join(' '), 300),
    image: t.cover || FALLBACK_IMAGE,
    alt: t.cover ? t.name + ' cover' : null,
    type: 'website',
  };
}

async function musicArtist(key) {
  const d = await getJSON('/music-artists/' + encodeURIComponent(key));
  const a = d && d.artist;
  if (!a || !a.name) return null;
  const edits = Number(a.tracks) || 0;
  const comps = Number(a.comps) || 0;
  return {
    title: a.name + ' on wavernrs',
    description: edits
      ? 'featured on ' + num(edits) + (edits === 1 ? ' edit' : ' edits') + (comps ? ' across ' + num(comps) + (comps === 1 ? ' comp' : ' comps') : '') + ' on wavernrs'
      : 'every comp and edit featuring ' + a.name + ' on wavernrs',
    image: a.photo || FALLBACK_IMAGE,
    alt: a.photo ? a.name : null,
    type: 'profile',
  };
}

async function communityPost(id) {
  const d = await getJSON('/community/posts/' + encodeURIComponent(id));
  const p = d && (d.post || d);
  if (!p || !p.title) return null;
  const body = clip(p.body, 220);
  return {
    title: p.title,
    description: joinParts([p.username ? 'posted by @' + p.username : null, body || 'on the wavernrs community board']),
    image: p.profile_image_url || FALLBACK_IMAGE,
    alt: p.username ? '@' + p.username : null,
    type: 'article',
  };
}

async function radioStation(slug) {
  const d = await getJSON('/radio/stations/' + encodeURIComponent(slug) + '?peek=1');
  const s = d && d.station;
  if (!s || !s.name) return null;
  const nowSrc = s.now || d.now;
  const now = nowSrc && nowSrc.track;
  const cover = s.cover_url || (now && now.cover_url);
  return {
    title: s.name + ' — wavernrs radio',
    description: joinParts([
      s.is_live && now ? 'on air: ' + clip(now.title, 90) + (now.artist ? ' by ' + clip(now.artist, 40) : '') : (s.is_live ? 'live now' : null),
      s.owner && s.owner.name ? 'hosted by ' + s.owner.name : null,
      clip(s.description, 160) || 'tune in and listen together',
    ]),
    image: cover || FALLBACK_IMAGE,
    alt: cover ? s.name : null,
    type: 'website',
    ttl: 120,
  };
}

const STATIC = {
  home: ['wavernrs — Ye comps, edits & the Ye archive', TAGLINE],
  charts: ['Charts — the most played comps and edits right now', 'what the wavernrs community is playing today, this week and all time'],
  browse: ['Browse — new and trending comps', 'fresh uploads, trending comps and every era, all in one place'],
  archive: ['The archive — every Ye comp ever made', 'dig through tens of thousands of archived Ye comps and edits by era, artist and date'],
  'archive-artist': ['Archive yeditors — wavernrs', 'every yeditor in the wavernrs archive and the comps they made'],
  radio: ['Radio — listen together on wavernrs', 'live community stations playing Ye comps and edits around the clock'],
  community: ['Community — wavernrs', 'posts, requests and finds from the wavernrs community'],
  tracker: ['Trackers — every comp and edit, era by era', 'the community trackers, matched to what you can play on wavernrs'],
  eras: ['Eras — every Ye era on wavernrs', 'comps and edits sorted era by era, from The College Dropout to Bully'],
  music: ['Featured artists — wavernrs', 'every artist featured on Ye comps and edits, and where they show up'],
  artists: ['Artists — the editors behind the comps', 'the yeditors and comp makers on wavernrs'],
  stats: ['Stats — wavernrs by the numbers', 'plays, uploads and eras across the whole site'],
  search: ['Search wavernrs', 'search comps, edits, artists, playlists and the Ye archive'],
  playlists: ['Playlists — wavernrs', 'community playlists of Ye comps and edits'],
  about: ['About wavernrs', 'what wavernrs is, who runs it and how it works'],
  awards: ['Hall of Fame — wavernrs', 'every Edit of the Week winner and honored yedit on wavernrs, in one place'],
  wrapped: ['Recap — your year on wavernrs', 'your most played comps, edits and eras on wavernrs'],
  whatsnew: ["What's new on wavernrs", 'every new feature and fix, as it ships'],
  lp: ['Listening parties — wavernrs', 'press play together: live listening parties for new comps and edits'],
};
const PATHS = { home: '/', index: '/' };
const PARAMS = {
  album: ['id'], track: ['id'], artist: ['id'], playlist: ['id'], lp: ['id'],
  'archive-artist': ['a'], tracker: ['t'], music: ['a'], community: ['post'], radio: ['s'], search: ['q'],
};

const LOADERS = {
  album: p => p.get('id') && album(p.get('id')),
  track: p => p.get('id') && track(p.get('id')),
  artist: p => p.get('id') && artist(p.get('id')),
  playlist: p => p.get('id') && playlist(p.get('id')),
  lp: p => p.get('id') && lp(p.get('id')),
  'archive-artist': p => p.get('a') && archiveArtist(p.get('a')),
  tracker: p => p.get('t') && trackerMeta(p.get('t')),
  music: p => p.get('a') && musicArtist(p.get('a')),
  community: p => p.get('post') && communityPost(p.get('post')),
  radio: p => p.get('s') && radioStation(p.get('s')),
  search: p => {
    const q = clip(p.get('q'), 80);
    return q ? { title: 'results for “' + q + '” — wavernrs', description: 'comps, edits, artists and Ye archive results for “' + q + '” on wavernrs', image: FALLBACK_IMAGE, type: 'website' } : null;
  },
};

function page(meta, url) {
  const image = bigImage(meta.image);
  const alt = meta.alt || (image === FALLBACK_IMAGE ? 'wavernrs: Ye comps, edits & the Ye archive' : meta.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="theme-color" content="#a78bfa">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="${SITE}/icons/favicon-32.png">
<meta property="og:site_name" content="wavernrs">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="${esc(meta.type)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(alt)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(alt)}">
</head>
<body><h1><a href="${esc(url)}">${esc(meta.title)}</a></h1><p>${esc(meta.description)}</p></body>
</html>`;
}

function canonicalFor(type, params) {
  const path = PATHS[type] || ('/' + type);
  const keep = new URLSearchParams();
  for (const k of PARAMS[type] || []) {
    const v = params.get(k);
    if (v) keep.set(k, v.slice(0, 200));
  }
  const qs = keep.toString();
  return SITE + path + (qs ? '?' + qs : '');
}

module.exports = async (req, res) => {
  const url = new URL(req.url, SITE);
  const params = url.searchParams;
  let type = String(params.get('type') || 'album').toLowerCase();
  if (type === 'index') type = 'home';
  if (!/^[a-z-]{1,24}$/.test(type)) type = 'home';

  let meta = null;
  let where;
  let attempted = false;
  try {
    if (type === 'ye') {
      const keep = new URLSearchParams();
      for (const k of ['view', 'album', 'sub', 'year', 'filter', 'q', 'tab', 'era', 'tweet', 'item', 't']) if (params.get(k)) keep.set(k, params.get(k));
      where = SITE + '/resources' + (keep.toString() ? '?' + keep.toString() : '');
      meta = await ye(params);
    } else {
      where = canonicalFor(type, params);
      attempted = !!(PARAMS[type] || []).find(k => params.get(k));
      if (LOADERS[type]) meta = (await LOADERS[type](params)) || null;
    }
  } catch (_) {
    meta = null;
  }
  if (!meta && type === 'ye') {
    const v = YE_VIEWS[params.get('view')] ? params.get('view') : 'tracker';
    meta = { title: YE_VIEWS[v][0] + ' — wavernrs', description: YE_VIEWS[v][1], image: FALLBACK_IMAGE, type: 'website' };
    attempted = true;
  }
  if (!where) where = SITE + '/';
  let fresh = !!meta && !(type === 'ye' && attempted);
  if (!meta && STATIC[type]) {
    meta = { title: STATIC[type][0], description: STATIC[type][1], image: FALLBACK_IMAGE, type: 'website' };
    fresh = !attempted;
  }
  if (!meta) {
    meta = { title: STATIC.home[0], description: TAGLINE, image: FALLBACK_IMAGE, type: 'website' };
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', fresh
    ? 'public, s-maxage=' + (meta.ttl || 600) + ', stale-while-revalidate=86400'
    : 'public, s-maxage=60, stale-while-revalidate=600');
  res.status(200).send(page(meta, where));
};
