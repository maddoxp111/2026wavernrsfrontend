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
  return {
    title: pl.title + ' — playlist',
    description: pl.description || joinParts([
      'Playlist',
      pl.track_count ? pl.track_count + ' tracks' : null,
      'on wavernrs',
    ]),
    image: pl.cover_url || FALLBACK_IMAGE,
    type: 'music.playlist',
  };
}

const LOADERS = { album, track, artist, playlist };

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
  try {
    if (id && LOADERS[type]) meta = await LOADERS[type](id);
  } catch (_) {
    meta = null;
  }
  if (!meta) {
    meta = {
      title: 'wavernrs',
      description: 'A home for Ye comps and edits — stream, browse and keep track of them.',
      image: FALLBACK_IMAGE,
      type: 'website',
    };
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(page(meta, canonical));
};
