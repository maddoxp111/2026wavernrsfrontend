// Link previews for crawlers. Humans never reach this: vercel.json only
// rewrites here when the user agent looks like a link unfurler, so the
// normal single-page app is untouched.
const API = process.env.WAVERNRS_API || 'https://2026wavernrs-production.up.railway.app/api';
const SITE = 'https://www.wavernrs.com';
const FALLBACK_IMAGE = SITE + '/logo@2x.png';

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
      d.track_count ? d.track_count + ' tracks' : null,
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

const LOADERS = { album, track, artist, playlist, lp };

function page(meta, url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="theme-color" content="#0d0d15">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="wavernrs">
<meta property="og:type" content="${esc(meta.type)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
</head>
<body><p><a href="${esc(url)}">${esc(meta.title)}</a></p></body>
</html>`;
}

module.exports = async (req, res) => {
  const url = new URL(req.url, SITE);
  const type = url.searchParams.get('type') || 'album';
  const id = url.searchParams.get('id') || '';
  const canonical = SITE + '/' + type + (id ? '?id=' + encodeURIComponent(id) : '');

  let meta = null;
  let where = canonical;
  try {
    if (type === 'ye') {
      const keep = new URLSearchParams();
      for (const k of ['view', 'album', 'sub', 'year', 'filter', 'q', 'tab', 'era', 'tweet', 'item', 't']) if (url.searchParams.get(k)) keep.set(k, url.searchParams.get(k));
      where = SITE + '/resources' + (keep.toString() ? '?' + keep.toString() : '');
      meta = await ye(url.searchParams);
    } else if (id && LOADERS[type]) meta = await LOADERS[type](id);
  } catch (_) {
    meta = null;
  }
  if (!meta) {
    meta = {
      title: 'wavernrs',
      description: 'Ye comps and edits...listen to them, look through them and keep track of them.',
      image: FALLBACK_IMAGE,
      type: 'website',
    };
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(page(meta, where));
};
