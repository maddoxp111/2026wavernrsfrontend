window._pageCleanup = [];

var _inPopstate = false;

window.navigate = async function(url) {
  // Normalise: if already here, skip
  const target = new URL(url, location.href);
  var fromPopstate = _inPopstate;
  _inPopstate = false;
  if (!fromPopstate && target.pathname + target.search === location.pathname + location.search) return;

  // Auth pages are standalone (no #view) — always do a full navigation
  const path = target.pathname;
  if (/\/(login|register)(\.html)?$/.test(path)) {
    location.assign(url);
    return;
  }

  // New page generation: in-flight api() calls from the old page are dropped
  window._wvNavGen = (window._wvNavGen || 0) + 1;
  // Run teardown registered by the previous page
  window._pageCleanup.forEach(fn => { try { fn(); } catch (_) {} });
  window._pageCleanup = [];

  // Clear any page-specific blurred background. Pages that want one
  // (album/artist/charts/you/discover/upload/home) re-apply it in their
  // init script right after; everything else falls back to the default.
  if (typeof window.setPageBgImage === 'function') window.setPageBgImage('');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // If the target page has no #view, it's a standalone page — fall back to real navigation
    const newView = doc.getElementById('view');
    if (!newView) {
      location.assign(url);
      return;
    }

    document.title = doc.title;
    if (typeof window._wvRestoreTabTitle === 'function') window._wvRestoreTabTitle(doc.title);

    // Swap only #view — nav and player stay alive
    const curView = document.getElementById('view');
    if (curView) curView.replaceWith(newView.cloneNode(true));

    // Push state FIRST so location.search is correct when page script reads it
    if (!fromPopstate) history.pushState(null, doc.title, url);

    // Update active nav states
    if (typeof window._updateNavActive === 'function') {
      window._updateNavActive();
    }

    // Run every inline <script> the page has, in order. Running only the last
    // one left pages whose helpers live in an earlier block half-defined.
    for (const pageScript of doc.querySelectorAll('script:not([src])')) {
      const s = document.createElement('script');
      s.textContent = pageScript.textContent;
      document.head.appendChild(s);
    }

    window.scrollTo(0, 0);

    // Scroll the content area to top (in new layout #wv-content handles scroll)
    const contentEl = document.getElementById('wv-content');
    if (contentEl) contentEl.scrollTop = 0;

  } catch (_) {
    location.assign(url); // fallback: real navigation
  }
};

// Intercept same-origin <a> clicks
document.addEventListener('click', e => {
  // Anything the browser has its own meaning for stays the browser's: a new
  // tab on cmd/ctrl/middle click, a new window on shift, target="_blank".
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.hasAttribute('download')) return;
  const target = (a.getAttribute('target') || '').toLowerCase();
  if (target && target !== '_self') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  e.preventDefault();
  navigate(href);
});

// Browser back / forward
window.addEventListener('popstate', () => {
  _inPopstate = true;
  navigate(location.pathname + location.search);
});

// Initial active state (layout.js will handle this, but set a fallback)
if (typeof window._updateNavActive === 'function') {
  window._updateNavActive();
}
