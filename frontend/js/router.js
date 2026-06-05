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
  if (path.endsWith('/login.html') || path.endsWith('/register.html')) {
    location.assign(url);
    return;
  }

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

    // Swap only #view — nav and player stay alive
    const curView = document.getElementById('view');
    if (curView) curView.replaceWith(newView.cloneNode(true));

    // Push state FIRST so location.search is correct when page script reads it
    if (!fromPopstate) history.pushState(null, doc.title, url);

    // Update active nav states
    if (typeof window._updateNavActive === 'function') {
      window._updateNavActive();
    }

    // Extract and run the last inline <script> (the page init block)
    const inlineScripts = [...doc.querySelectorAll('script:not([src])')];
    const pageScript = inlineScripts[inlineScripts.length - 1];
    if (pageScript) {
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
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:')) return;
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
