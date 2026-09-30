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
      html += '<div class="none">nothing wrong rn</div>';
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

  var API = 'https://2026wavernrs-production.up.railway.app/api';

  function _get(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    });
  }

  function load() {
    return _get(API + '/site/status?t=' + Date.now())
      .catch(function () { return _get('/status.json?t=' + Date.now()); });
  }

  function _timed(path, ms) {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 12000) : null;
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        var ms2 = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
        if (!r.ok) return { ok: false, ms: ms2, code: r.status, data: null };
        return r.json().then(function (j) { return { ok: true, ms: ms2, code: r.status, data: j }; });
      })
      .catch(function (e) {
        var ms2 = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
        return { ok: false, ms: ms2, code: 0, data: null, error: (e && e.name === 'AbortError') ? 'timed out' : 'unreachable' };
      })
      .then(function (x) { if (timer) clearTimeout(timer); return x; });
  }

  function _pings(n) {
    var out = [];
    var i = 0;
    function next() {
      if (i++ >= n) return Promise.resolve(out);
      return _timed('/site/lock-status', 8000).then(function (r) { out.push(r); return next(); });
    }
    return next();
  }

  function probe() {
    var paths = {
      health: '/health', discord: '/verify/server', ye: '/ye/status', trackers: '/trackers/auto-refresh',
      music: '/music-artists/status', pillows: '/resources/pillows-status', lp: '/lp/live-count', site: '/site/status'
    };
    var keys = Object.keys(paths);
    return Promise.all([_pings(3)].concat(keys.map(function (k) { return _timed(paths[k]); }))).then(function (res) {
      var out = { at: Date.now(), pings: res[0] };
      keys.forEach(function (k, i) { out[k] = res[i + 1]; });
      var good = res[0].filter(function (p) { return p.ok; }).map(function (p) { return p.ms; }).sort(function (a, b) { return a - b; });
      out.latency = good.length ? Math.round(good[Math.floor(good.length / 2)]) : null;
      out.pingFails = res[0].length - good.length;
      if (!out.site.ok) {
        return _get('/status.json?t=' + Date.now()).then(function (j) { out.site = { ok: true, ms: 0, data: j, fallback: true }; return out; }, function () { return out; });
      }
      return out;
    });
  }

  function ago(iso, now) {
    var t = typeof iso === 'number' ? iso : Date.parse(iso);
    if (!isFinite(t)) return '';
    var s = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    var d = Math.round(s / 86400);
    return d < 45 ? d + 'd ago' : Math.round(d / 30) + 'mo ago';
  }

  function _age(iso, now) {
    var t = Date.parse(iso);
    return isFinite(t) ? ((now || Date.now()) - t) / 3600000 : null;
  }

  function _n(x) { return Number(x || 0).toLocaleString('en-US'); }

  function components(p) {
    var now = p.at || Date.now();
    var h = p.health.ok ? (p.health.data || {}) : null;
    var apiDown = !p.health.ok && p.pingFails >= 3;
    var list = [];
    function add(key, name, state, detail, ms) { list.push({ key: key, name: name, state: state, detail: detail, ms: ms == null || state === 'down' || state === 'unknown' ? null : Math.round(ms) }); }
    function missing(r) { return apiDown ? 'down' : 'unknown'; }

    if (p.latency == null) add('api', 'API', 'down', 'not answering', null);
    else add('api', 'API', p.pingFails ? 'warn' : p.latency > 2500 ? 'warn' : 'ok',
      (p.latency > 2500 ? 'slow · ' : '') + p.latency + ' ms median of ' + (3 - p.pingFails) + ' pings', p.latency);

    if (!h) add('db', 'Database', missing(), 'health check ' + (p.health.error || 'failed'), p.health.ms);
    else {
      var pg = h.postgrest || {};
      var st = h.database === 'down' ? 'down' : (h.database_busy || pg.live === false || (pg.restarts_last_10m || 0) > 1) ? 'warn' : 'ok';
      var det = h.database === 'down' ? 'not answering' : h.database_busy ? 'busy, queries are queued' :
        pg.live === false ? 'reconnecting' : (pg.restarts_last_10m ? pg.restarts_last_10m + ' reconnect' + (pg.restarts_last_10m > 1 ? 's' : '') + ' in 10m' : 'connected');
      if (st === 'ok' && pg.since && _age(pg.since, now) < 1) det = 'connected · recovered ' + ago(pg.since, now);
      add('db', 'Database', st, det, p.health.ms);
    }

    if (!h) add('archive', 'Archive index', missing(), 'unavailable', null);
    else if (!h.archive_index) add('archive', 'Archive index', 'unknown', 'not reported', null);
    else add('archive', 'Archive index', h.archive_index.ready ? 'ok' : 'warn',
      h.archive_index.ready ? _n(h.archive_index.albums) + ' comps indexed' : 'warming up', null);

    if (!h || !h.backup) add('backup', 'Backups', missing(), 'unavailable', null);
    else {
      var b = h.backup;
      var bs = !b.ready ? 'unknown' : b.fresh === false ? 'warn' : 'ok';
      add('backup', 'Backups', bs, b.newest_age_h != null ? 'newest is ' + (b.newest_age_h < 1 ? 'under an hour' : b.newest_age_h + 'h') + ' old' + (b.fresh === false ? ', overdue' : '') : 'not ready yet', null);
    }

    if (!p.discord.ok) add('discord', 'Discord bot', missing(), 'unavailable', p.discord.ms);
    else {
      var dd = p.discord.data || {};
      add('discord', 'Discord bot', dd.bot_ready ? 'ok' : 'warn', dd.bot_ready ? 'online · ' + _n(dd.members) + ' members' : 'offline, verification is paused', p.discord.ms);
    }

    if (!p.pillows.ok) add('leaks', 'Leak audio host', missing(), 'unavailable', p.pillows.ms);
    else add('leaks', 'Leak audio host', p.pillows.data && p.pillows.data.up ? 'ok' : 'warn',
      p.pillows.data && p.pillows.data.up ? 'reachable' : 'unreachable, some leaks will not play', p.pillows.ms);

    if (!p.ye.ok) add('ye', 'Ye data', missing(), 'unavailable', p.ye.ms);
    else {
      var y = p.ye.data || {};
      var errs = ['tweets', 'yeezy', 'tour', 'disco'].filter(function (k) { return y[k + '_error']; });
      var tAge = _age(y.tweets_at, now);
      var ys = errs.length ? 'warn' : (tAge != null && tAge > 24) ? 'warn' : 'ok';
      var yd = y.running ? 'syncing now' : errs.length ? errs.join(', ') + ' sync failed' : (tAge != null ? 'tweets synced ' + ago(y.tweets_at, now) : 'idle');
      add('ye', 'Ye data', ys, yd, p.ye.ms);
    }

    if (!p.trackers.ok) add('trackers', 'Trackers', missing(), 'unavailable', p.trackers.ms);
    else {
      var tr = p.trackers.data || {};
      var parts = [];
      var worst = 'ok';
      ['uyt', 'green'].forEach(function (k) {
        var x = tr[k];
        if (!x || !x.at) return;
        parts.push((k === 'uyt' ? 'UYT' : 'green') + ' ' + ago(x.at, now));
        if (k === 'uyt' && _age(x.at, now) > 24) worst = 'warn';
      });
      add('trackers', 'Trackers', parts.length ? worst : 'unknown', parts.length ? 'synced ' + parts.join(' · ') : 'no sync yet', p.trackers.ms);
    }
    return list;
  }

  function incident(p) {
    var d = p.site && p.site.ok ? (p.site.data || {}) : null;
    if (!d) return null;
    var ups = Array.isArray(d.updates) ? d.updates.slice() : [];
    ups.sort(function (a, b) { return (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
    var newest = ups.length ? Date.parse(ups[0].at) : NaN;
    var open = !!d.locked || (d.state && d.state !== 'operational' && isFinite(newest) && (p.at || Date.now()) - newest < 72 * 3600000);
    if (!ups.length && !d.locked && (!d.state || d.state === 'operational')) return null;
    return { doc: d, updates: ups, active: open, newest: isFinite(newest) ? newest : null };
  }

  function overall(list, inc) {
    var core = list.filter(function (c) { return c.key === 'api' || c.key === 'db'; });
    var lvl = 0;
    if (core.some(function (c) { return c.state === 'down'; })) lvl = 2;
    else if (list.some(function (c) { return c.state === 'warn' || c.state === 'down'; })) lvl = 1;
    var maint = false;
    if (inc && inc.active) {
      var s = inc.doc.state;
      if (inc.doc.locked || s === 'disruption') lvl = 2;
      else if (s === 'degraded') lvl = Math.max(lvl, 1);
      else if (s === 'maintenance') maint = true;
    }
    if (lvl === 2) return { level: 'outage', label: 'Service outage' };
    if (maint) return { level: 'maintenance', label: 'Scheduled maintenance' };
    if (lvl === 1) return { level: 'degraded', label: 'Some systems degraded' };
    return { level: 'operational', label: 'All systems operational' };
  }

  window.wvStatus = {
    render: render, styleOnce: styleOnce, load: load, states: STATES,
    probe: probe, components: components, incident: incident, overall: overall, ago: ago, esc: esc
  };
})();
