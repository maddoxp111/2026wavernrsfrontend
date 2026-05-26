(function () {
  'use strict';

  var _cache = null;
  var _cacheTs = 0;
  var _pending = null; // track object to add
  var CACHE_TTL = 60000; // 60 seconds

  // ── Inject modal once ──────────────────────────────────────────────────────
  function _inject() {
    if (document.getElementById('atp-modal')) return;
    var el = document.createElement('div');
    el.innerHTML = '<div class="modal-overlay" id="atp-modal">' +
      '<div class="modal playlist-modal" style="max-width:420px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<div class="modal-title" style="margin:0;">Save to Playlist</div>' +
          '<button onclick="document.getElementById(\'atp-modal\').classList.remove(\'open\')" ' +
            'style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-secondary);line-height:1;">&times;</button>' +
        '</div>' +
        '<div id="atp-track-name" style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>' +
        '<div id="atp-status" style="font-size:13px;margin-bottom:8px;min-height:18px;"></div>' +
        '<div id="atp-list" style="display:flex;flex-direction:column;gap:8px;max-height:40vh;overflow-y:auto;"></div>' +
        '<div id="atp-new-wrap" style="margin-top:14px;">' +
          '<button id="atp-new-toggle" onclick="_atpToggleNew()" ' +
            'style="background:none;border:1px dashed var(--border);border-radius:8px;cursor:pointer;' +
            'width:100%;padding:10px 14px;font-size:13px;color:var(--text-secondary);text-align:left;">' +
            '＋ New Playlist' +
          '</button>' +
          '<div id="atp-new-form" style="display:none;margin-top:8px;">' +
            '<input type="text" id="atp-new-title" placeholder="Playlist name…" ' +
              'style="width:100%;margin-bottom:8px;" onkeydown="if(event.key===\'Enter\')_atpCreate()">' +
            '<div style="display:flex;gap:8px;align-items:center;">' +
              '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">' +
                '<input type="checkbox" id="atp-new-public" checked> Public' +
              '</label>' +
              '<button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="_atpCreate()">Create &amp; Add</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(el.firstChild);

    // Close on overlay click
    document.getElementById('atp-modal').addEventListener('click', function (e) {
      if (e.target === document.getElementById('atp-modal')) {
        document.getElementById('atp-modal').classList.remove('open');
      }
    });
  }

  // ── Open modal ─────────────────────────────────────────────────────────────
  function _open(track) {
    _pending = track;
    _inject();
    var modal = document.getElementById('atp-modal');
    if (!modal) return;

    // Reset state
    document.getElementById('atp-status').textContent = '';
    document.getElementById('atp-status').className = '';
    document.getElementById('atp-new-form').style.display = 'none';
    document.getElementById('atp-new-title').value = '';
    document.getElementById('atp-track-name').textContent = track.title || 'Track';
    modal.classList.add('open');
    _loadList();
  }

  // ── Load playlist list ─────────────────────────────────────────────────────
  function _loadList() {
    var now = Date.now();
    if (_cache && (now - _cacheTs) < CACHE_TTL) {
      _renderList(_cache);
      return;
    }
    document.getElementById('atp-list').innerHTML =
      '<div style="text-align:center;padding:16px;"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div>';

    // Check login
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
      document.getElementById('atp-list').innerHTML =
        '<p style="font-size:13px;color:var(--text-secondary);text-align:center;">' +
        '<a href="/login.html" style="color:var(--purple-light);">Log in</a> to save to a playlist.</p>';
      return;
    }

    if (typeof api !== 'function') return;
    api('/playlists/mine').then(function (data) {
      _cache = data || [];
      _cacheTs = Date.now();
      _renderList(_cache);
    }).catch(function () {
      document.getElementById('atp-list').innerHTML =
        '<p style="font-size:13px;color:var(--text-secondary);">Could not load playlists.</p>';
    });
  }

  function _renderList(playlists) {
    var el = document.getElementById('atp-list');
    if (!el) return;
    if (!playlists.length) {
      el.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);text-align:center;">No playlists yet — create one below.</p>';
      return;
    }
    el.innerHTML = playlists.map(function (p) {
      return '<button class="playlist-modal-item" onclick="_atpAddTo(\'' + p.id + '\')">' +
        '<span style="font-weight:600;font-size:14px;">' + _esc(p.title) + '</span>' +
        '<span style="font-size:12px;color:var(--text-secondary);">' +
          (p.track_count || 0) + ' track' + (p.track_count !== 1 ? 's' : '') +
          (p.is_public ? '' : ' · 🔒') +
        '</span>' +
      '</button>';
    }).join('');
  }

  // ── Add to playlist ────────────────────────────────────────────────────────
  window._atpAddTo = function (playlistId) {
    if (!_pending) return;
    var statusEl = document.getElementById('atp-status');
    statusEl.textContent = 'Adding…';
    statusEl.className = '';

    api('/playlists/' + playlistId + '/tracks', {
      method: 'POST',
      body: JSON.stringify({ track_id: _pending.id }),
    }).then(function () {
      statusEl.textContent = '✓ Added!';
      statusEl.className = 'playlist-modal-status success';
      // Update cache count
      if (_cache) {
        for (var i = 0; i < _cache.length; i++) {
          if (_cache[i].id === playlistId) {
            _cache[i] = { track_count: (_cache[i].track_count || 0) + 1 };
            break;
          }
        }
      }
      setTimeout(function () {
        var modal = document.getElementById('atp-modal');
        if (modal) modal.classList.remove('open');
        statusEl.textContent = '';
      }, 900);
    }).catch(function (err) {
      if (err && err.message && err.message.includes('409')) {
        statusEl.textContent = 'Already in this playlist';
      } else {
        statusEl.textContent = 'Failed to add track';
      }
      statusEl.className = 'playlist-modal-status error';
    });
  };

  // ── Toggle new-playlist form ───────────────────────────────────────────────
  window._atpToggleNew = function () {
    var form = document.getElementById('atp-new-form');
    if (!form) return;
    var visible = form.style.display !== 'none';
    form.style.display = visible ? 'none' : '';
    if (!visible) {
      var inp = document.getElementById('atp-new-title');
      if (inp) setTimeout(function () { inp.focus(); }, 50);
    }
  };

  // ── Create playlist and immediately add ───────────────────────────────────
  window._atpCreate = function () {
    var titleEl = document.getElementById('atp-new-title');
    var title = titleEl ? titleEl.value.trim() : '';
    if (!title) { if (titleEl) titleEl.focus(); return; }
    var isPublic = document.getElementById('atp-new-public') ?
      document.getElementById('atp-new-public').checked : true;

    var statusEl = document.getElementById('atp-status');
    statusEl.textContent = 'Creating…';
    statusEl.className = '';

    api('/playlists', {
      method: 'POST',
      body: JSON.stringify({ title: title, is_public: isPublic }),
    }).then(function (newPl) {
      // Invalidate cache and add new playlist
      if (_cache) _cache.unshift({ id: newPl.id, title: newPl.title, is_public: newPl.is_public, track_count: 0 });
      _cacheTs = Date.now();
      window._atpAddTo(newPl.id);
    }).catch(function (err) {
      statusEl.textContent = (err && err.message) ? err.message : 'Failed to create playlist';
      statusEl.className = 'playlist-modal-status error';
    });
  };

  // ── Public API ─────────────────────────────────────────────────────────────
  window.openAddToPlaylist = _open;
  window.invalidatePlaylistCache = function () { _cache = null; _cacheTs = 0; };

  // Helper
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Inject immediately on load so modal is always in DOM
  _inject();
})();
