// Content sitemap, served at /sitemap-content.xml through a vercel.json
// rewrite. The static sitemap.xml lists the fixed pages; this one lists the
// comps, archive artists, featured artists, playlists, trackers and Ye albums
// that the API knows about today. Every source is optional: if one is slow or
// down, the rest still make it into the file.
const API = process.env.WAVERNRS_API || 'https://2026wavernrs-production.up.railway.app/api';
const SITE = 'https://www.wavernrs.com';
const MAX_URLS = 50000;
const ARCHIVE_ARTIST_PAGES = 5;
const ARCHIVE_ARTIST_PAGE = 1000;
const TOP_ARCHIVE_PAGES = 4;
const TOP_ARCHIVE_PAGE = 500;
const MUSIC_ARTIST_PAGES = 3;
const MUSIC_ARTIST_PAGE = 500;

async function getJSON(path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(API + path, { signal: ctl.signal, headers: { accept: 'application/json', 'x-wv-edge': 'og', 'user-agent': 'wavernrs-preview' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function xmlEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function day(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now() + 86400000) return null;
  return d.toISOString().slice(0, 10);
}

function q(path, params) {
  const sp = new URLSearchParams();
  for (const k of Object.keys(params)) sp.set(k, String(params[k]));
  return SITE + path + '?' + sp.toString();
}

async function albums() {
  const d = await getJSON('/discover');
  const out = [];
  if (!d) return out;
  for (const list of [d.trending, d.recent]) {
    for (const a of Array.isArray(list) ? list : []) {
      if (a && a.id) out.push({ loc: q('/album', { id: a.id }), lastmod: day(a.created_at), changefreq: 'weekly', priority: '0.7' });
    }
  }
  return out;
}

async function topArchive() {
  const pages = [];
  for (let i = 0; i < TOP_ARCHIVE_PAGES; i++) pages.push(getJSON('/archive?sort=plays&kind=all&limit=' + TOP_ARCHIVE_PAGE + '&offset=' + (i * TOP_ARCHIVE_PAGE)));
  const top = getJSON('/archive/top');
  const res = await Promise.allSettled([top].concat(pages));
  const out = [];
  const t = res[0].status === 'fulfilled' && res[0].value;
  for (const it of (t && Array.isArray(t.items) ? t.items : [])) {
    if (it && it.album_id) out.push({ loc: q('/album', { id: it.album_id }), lastmod: null, changefreq: 'monthly', priority: '0.6' });
  }
  for (const r of res.slice(1)) {
    const d = r.status === 'fulfilled' && r.value;
    const items = d && (Array.isArray(d.items) ? d.items : Array.isArray(d.albums) ? d.albums : Array.isArray(d) ? d : []);
    for (const a of items || []) {
      if (a && a.id) out.push({ loc: q('/album', { id: a.id }), lastmod: day(a.created_at), changefreq: 'monthly', priority: '0.5' });
    }
  }
  return out;
}

async function archiveArtists() {
  const pages = [];
  for (let i = 0; i < ARCHIVE_ARTIST_PAGES; i++) pages.push(getJSON('/archive/artists?limit=' + ARCHIVE_ARTIST_PAGE + '&offset=' + (i * ARCHIVE_ARTIST_PAGE)));
  const res = await Promise.allSettled(pages);
  const out = [];
  for (const r of res) {
    const d = r.status === 'fulfilled' && r.value;
    for (const a of (d && Array.isArray(d.artists) ? d.artists : [])) {
      if (!a || !a.slug) continue;
      const n = Number(a.comp_count) || 0;
      out.push({ loc: q('/archive-artist', { a: a.slug }), lastmod: day(a.latest), changefreq: 'weekly', priority: n >= 50 ? '0.6' : n >= 5 ? '0.5' : '0.4' });
    }
  }
  return out;
}

async function musicArtists() {
  const pages = [];
  for (let i = 0; i < MUSIC_ARTIST_PAGES; i++) pages.push(getJSON('/music-artists?limit=' + MUSIC_ARTIST_PAGE + '&offset=' + (i * MUSIC_ARTIST_PAGE)));
  const res = await Promise.allSettled(pages);
  const out = [];
  for (const r of res) {
    const d = r.status === 'fulfilled' && r.value;
    for (const a of (d && Array.isArray(d.items) ? d.items : [])) {
      if (a && a.artist_key) out.push({ loc: q('/music', { a: a.artist_key }), lastmod: null, changefreq: 'weekly', priority: a.primary ? '0.7' : '0.4' });
    }
  }
  return out;
}

async function playlists() {
  const d = await getJSON('/playlists/published?sort=popular&limit=200');
  const out = [];
  for (const p of (d && Array.isArray(d.items) ? d.items : [])) {
    const id = p && (p.id || (p.playlist && p.playlist.id));
    if (id) out.push({ loc: q('/playlist', { id }), lastmod: day(p.updated_at || p.published_at || p.created_at), changefreq: 'weekly', priority: '0.5' });
  }
  return out;
}

async function trackers() {
  const d = await getJSON('/trackers');
  const out = [];
  for (const t of (d && Array.isArray(d.trackers) ? d.trackers : [])) {
    if (t && t.slug) out.push({ loc: q('/tracker', { t: t.slug }), lastmod: null, changefreq: 'daily', priority: '0.7' });
  }
  return out;
}

async function yeAlbums() {
  const d = await getJSON('/ye/disco');
  const out = [];
  for (const a of (d && Array.isArray(d.albums) ? d.albums : [])) {
    if (a && a.slug) out.push({ loc: q('/resources', { view: 'disco', album: a.slug }), lastmod: null, changefreq: 'monthly', priority: '0.5' });
  }
  return out;
}

module.exports = async (req, res) => {
  const sources = [trackers, yeAlbums, albums, topArchive, musicArtists, archiveArtists, playlists];
  const settled = await Promise.allSettled(sources.map(fn => fn()));
  const seen = new Set();
  const urls = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const u of r.value) {
      if (urls.length >= MAX_URLS) break;
      if (!u || !u.loc || seen.has(u.loc)) continue;
      seen.add(u.loc);
      urls.push(u);
    }
  }
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => '  <url><loc>' + xmlEsc(u.loc) + '</loc>'
      + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '')
      + (u.changefreq ? '<changefreq>' + u.changefreq + '</changefreq>' : '')
      + (u.priority ? '<priority>' + u.priority + '</priority>' : '')
      + '</url>').join('\n')
    + '\n</urlset>\n';
  const partial = [0, 1, 2, 5].some(i => settled[i].status !== 'fulfilled' || !settled[i].value.length);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', urls.length && !partial
    ? 'public, s-maxage=86400, stale-while-revalidate=604800'
    : 'public, s-maxage=900, stale-while-revalidate=86400');
  res.status(200).send(body);
};
