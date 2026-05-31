// Vercel Edge Middleware — routes known crawler/bot User-Agents to the backend
// OG-meta endpoints so social previews (Discord, Twitter, iMessage, Slack, etc.)
// show rich cards instead of blank pages.
//
// Real browsers pass through unchanged; only the bot regex hits this code path.

export const config = {
  matcher: ['/track.html', '/album.html', '/artist.html'],
};

const BOT_RE = /bot|crawl|spider|facebook|twitterbot|discordbot|slack|linkedin|whatsapp|telegram|pinterest|imessage|preview|unfurl/i;

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_RE.test(ua)) return; // real browser — let Vercel serve the static file

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return;

  const backendBase = process.env.BACKEND_URL;
  if (!backendBase) return;

  let ogPath;
  if (url.pathname.endsWith('/track.html')) ogPath = `/api/og/track/${id}`;
  else if (url.pathname.endsWith('/album.html')) ogPath = `/api/og/album/${id}`;
  else if (url.pathname.endsWith('/artist.html')) ogPath = `/api/og/artist/${id}`;
  else return;

  try {
    const resp = await fetch(backendBase + ogPath, { headers: { 'User-Agent': ua } });
    const html = await resp.text();
    return new Response(html, {
      status: resp.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return; // fall back to static file on any error
  }
}
