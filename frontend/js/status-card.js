(function () {
  var STATES = {
    operational: { label: 'All systems operational', bar: '#1f7a46', dot: '#2fbf71' },
    degraded:    { label: 'Degraded performance',    bar: '#8a6116', dot: '#e0a33b' },
    maintenance: { label: 'Maintenance',             bar: '#1d4f7a', dot: '#4a9fe0' },
    disruption:  { label: 'Service Disruption',      bar: '#9b3a2c', dot: '#d9553f' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    var date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    var time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return date + ' ' + time;
  }

  function css() {
    return '.wv-st{max-width:860px;margin:0 auto;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;' +
      'background:#0f0f11;color:#f2f2f4;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'text-align:left;box-shadow:0 10px 40px rgba(0,0,0,.45);}' +
      '.wv-st .bar{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;' +
      'padding:16px 22px;color:#fff;font-weight:700;font-size:17px;}' +
      '.wv-st .bar .right{font-weight:700;font-size:15px;opacity:.95;}' +
      '.wv-st .meta{padding:20px 22px 4px;}' +
      '.wv-st .row{display:flex;gap:18px;padding:0 0 16px;font-size:14.5px;line-height:1.5;}' +
      '.wv-st .row .k{width:140px;flex-shrink:0;font-weight:700;}' +
      '.wv-st .row .v{color:#b9b9c0;}' +
      '.wv-st .rule{height:1px;background:#242428;margin:4px 22px 0;}' +
      '.wv-st .log{padding:22px;display:flex;flex-direction:column;gap:26px;}' +
      '.wv-st .ev{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;}' +
      '.wv-st .ev .at{width:190px;flex-shrink:0;color:#8b8b93;font-size:13.5px;padding-top:1px;}' +
      '.wv-st .ev .body{flex:1;min-width:220px;}' +
      '.wv-st .ev .tag{display:flex;align-items:center;gap:9px;font-weight:800;font-size:13.5px;letter-spacing:.04em;margin-bottom:7px;}' +
      '.wv-st .ev .tag i{width:9px;height:9px;border-radius:50%;display:inline-block;}' +
      '.wv-st .ev p{margin:0;font-size:14.5px;line-height:1.6;color:#d6d6dc;}' +
      '.wv-st .none{padding:28px 22px;color:#b9b9c0;font-size:14.5px;}' +
      '@media(max-width:620px){.wv-st .row{flex-direction:column;gap:4px;}.wv-st .row .k{width:auto;}' +
      '.wv-st .ev .at{width:auto;}}';
  }

  function dotFor(kind) {
    return kind === 'good' ? STATES.operational.dot : kind === 'warn' ? STATES.degraded.dot : STATES.disruption.dot;
  }

  function render(d) {
    d = d || {};
    var st = STATES[d.state] || STATES.operational;
    var ups = Array.isArray(d.updates) ? d.updates : [];
    var headline = d.headline || st.label;

    var html = '<div class="wv-st">' +
      '<div class="bar" style="background:' + st.bar + ';">' +
        '<span>' + esc(headline) + '</span>' +
        '<span class="right">' + esc(st.label) + '</span>' +
      '</div>' +
      '<div class="meta">' +
        '<div class="row"><div class="k">Incident Status</div><div class="v">' + esc(st.label) + '</div></div>' +
        '<div class="row"><div class="k">Components</div><div class="v">' +
          esc((d.components || []).join(', ') || 'None') + '</div></div>' +
        '<div class="row"><div class="k">Locations</div><div class="v">' +
          esc((d.locations || []).join(', ') || 'None') + '</div></div>' +
      '</div>' +
      '<div class="rule"></div>';

    if (!ups.length) {
      html += '<div class="none">No incidents reported.</div>';
    } else {
      html += '<div class="log">' + ups.map(function (u) {
        return '<div class="ev">' +
          '<div class="at">' + when(u.at) + '</div>' +
          '<div class="body">' +
            '<div class="tag"><i style="background:' + dotFor(u.kind) + ';"></i>' + esc(u.status || '') + '</div>' +
            '<p>' + esc(u.body || '') + '</p>' +
          '</div></div>';
      }).join('') + '</div>';
    }

    return html + '</div>';
  }

  function styleOnce(doc) {
    doc = doc || document;
    if (doc.getElementById('wv-st-css')) return;
    var el = doc.createElement('style');
    el.id = 'wv-st-css';
    el.textContent = css();
    (doc.head || doc.documentElement).appendChild(el);
  }

  function load() {
    return fetch('/status.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    });
  }

  window.wvStatus = { render: render, styleOnce: styleOnce, load: load, states: STATES };
})();
