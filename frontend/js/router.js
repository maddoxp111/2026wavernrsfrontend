window._pageCleanup = [];

window.navigate = async function(url) {
  // Normalise: if already here, skip
  const target = new URL(url, location.href);
  if (target.pathname + target.search === location.pathname + location.search) return;

  // Run teardown registered by the previous page
  window._pageCleanup.forEach(fn => { try { fn(); } catch (_) {} });
  window._pageCleanup = [];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    document.title = doc.title;

    // Swap only #view — nav and player stay alive
    const newView = doc.getElementById('view');
    const curView = document.getElementById('view');
    if (newView && curView) curView.replaceWith(newView.cloneNode(true));

    // Extract and run the last inline <script> (the page init block)
    const inlineScripts = [...doc.querySelectorAll('script:not([src])')];
    const pageScript = inlineScripts[inlineScripts.length - 1];
    if (pageScript) {
      const s = document.createElement('script');
      s.textContent = pageScript.textContent;
      document.head.appendChild(s);
    }

    history.pushState(null, doc.title, url);
    _updateNavActive();
    window.scrollTo(0, 0);
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
  navigate(location.pathname + location.search);
});

function _updateNavActive() {
  const path = location.pathname;
  document.querySelectorAll('nav .nav-links a[href]').forEach(a => {
    a.classList.toggle('active', path.endsWith(a.getAttribute('href')));
  });
  document.querySelectorAll('.mobile-nav-item[href]').forEach(item => {
    item.classList.toggle('active', path.endsWith(item.getAttribute('href')));
  });
}

// Set correct active state on initial page load
_updateNavActive();
