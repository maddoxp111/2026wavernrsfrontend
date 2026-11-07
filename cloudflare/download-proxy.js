// Download relay for wavernrs, deployed as the Cloudflare Worker "wavernrs-dl".
// Browsers can't fetch archive.org files directly (no CORS headers), and the
// fallback used to stream them through the Railway backend, which bills for
// every byte. Cloudflare doesn't charge for Worker bandwidth, so downloads and
// in-browser zips fetch through here instead. R2 files are read through the
// bucket binding rather than the rate-limited r2.dev host.
const R2_HOST = 'pub-01c00b2a8ed144ecab591c33aa467b1a.r2.dev';
const ORIGINS = /^https:\/\/((www\.)?wavernrs\.com|[a-z0-9-]*wavernrs[a-z0-9-]*\.vercel\.app)$/i;
const IA_HOST = /^([a-z0-9-]+\.)*archive\.org$/i;
const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

function withCors(req, h) {
  const o = req.headers.get('Origin');
  if (o && ORIGINS.test(o)) {
    h.set('Access-Control-Allow-Origin', o);
    h.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');
  }
  h.append('Vary', 'Origin');
  return h;
}

function fail(req, status, msg) {
  return new Response(msg, { status, headers: withCors(req, new Headers({ 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })) });
}

function attachment(name) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  return 'attachment; filename="' + ascii + '"; filename*=UTF-8\'\'' + encodeURIComponent(name);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') {
      const h = withCors(req, new Headers());
      h.set('Access-Control-Allow-Methods', 'GET, HEAD');
      h.set('Access-Control-Allow-Headers', 'Range');
      h.set('Access-Control-Max-Age', '86400');
      return new Response(null, { status: 204, headers: h });
    }
    if (url.pathname !== '/f') return fail(req, 404, 'not found');
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(req, 405, 'method not allowed');

    let target;
    try { target = new URL(url.searchParams.get('u') || ''); } catch (_) { return fail(req, 400, 'bad link'); }
    if (target.protocol !== 'https:') return fail(req, 400, 'bad link');
    const name = String(url.searchParams.get('n') || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').trim().slice(0, 180);

    let status, body;
    const h = new Headers();
    if (target.hostname === R2_HOST && env.AUDIO) {
      let key;
      try { key = decodeURIComponent(target.pathname.slice(1)); } catch (_) { return fail(req, 400, 'bad link'); }
      const obj = req.method === 'HEAD' ? await env.AUDIO.head(key) : await env.AUDIO.get(key);
      if (!obj) return fail(req, 404, 'not found');
      obj.writeHttpMetadata(h);
      h.set('Content-Length', String(obj.size));
      h.set('ETag', obj.httpEtag);
      status = 200;
      body = obj.body || null;
    } else if (IA_HOST.test(target.hostname)) {
      const range = req.headers.get('Range');
      const up = await fetch(target.toString(), {
        method: req.method,
        headers: range ? { Range: range } : {},
        redirect: 'follow',
        cf: { cacheEverything: true, cacheTtl: 86400 },
      });
      if (!up.ok && up.status !== 206) return fail(req, up.status === 404 ? 404 : 502, 'upstream ' + up.status);
      for (const k of PASS) { const v = up.headers.get(k); if (v) h.set(k, v); }
      status = up.status;
      body = up.body;
    } else {
      return fail(req, 400, 'host not allowed');
    }

    if (name) h.set('Content-Disposition', attachment(name));
    h.set('Cache-Control', 'public, max-age=86400');
    withCors(req, h);
    return new Response(req.method === 'HEAD' ? null : body, { status, headers: h });
  },
};
