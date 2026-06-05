// Star rating widget — shared by track.html and album.html.
// Exposes window.loadRatings(entityType, entityId).
(function () {
  'use strict';

  var _data = { avg: null, count: 0, user_rating: null };
  var _entityType = null;
  var _entityId = null;
  var _saving = false;

  function _starSvg(filled) {
    if (filled) {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  function _buildWidget(statusMsg) {
    var container = document.getElementById('rating-widget');
    if (!container) return;

    var loggedIn = !!localStorage.getItem('token');
    var current = _data.user_rating || 0;

    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
      if (loggedIn) {
        starsHtml +=
          '<button type="button" data-s="' + i + '"' +
          ' style="background:none;border:none;cursor:pointer;padding:4px;line-height:0;-webkit-tap-highlight-color:transparent;">' +
          _starSvg(i <= current) +
          '</button>';
      } else {
        starsHtml +=
          '<button type="button" data-s="' + i + '"' +
          ' style="background:none;border:none;cursor:pointer;padding:4px;line-height:0;-webkit-tap-highlight-color:transparent;" title="Log in to rate">' +
          _starSvg(i <= current) +
          '</button>';
      }
    }

    var summaryHtml = statusMsg
      ? '<span style="font-size:13px;color:var(--text-3);margin-left:4px;">' + statusMsg + '</span>'
      : _data.count > 0
        ? '<span style="font-size:14px;font-weight:600;color:var(--text);">' + _data.avg + '</span>' +
          '<span style="font-size:13px;color:var(--text-3);margin-left:5px;">(' + _data.count + ' rating' + (_data.count !== 1 ? 's' : '') + ')</span>'
        : '<span style="font-size:13px;color:var(--text-3);">No ratings yet</span>';

    container.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<div id="wv-stars" style="display:flex;align-items:center;">' + starsHtml + '</div>' +
        '<div id="wv-rating-summary">' + summaryHtml + '</div>' +
      '</div>';

    var starsEl = document.getElementById('wv-stars');
    if (!starsEl) return;

    // Hover preview (desktop only — ignored on touch)
    starsEl.addEventListener('mousemove', function (e) {
      var btn = e.target.closest('button[data-s]');
      if (!btn) return;
      _fillUpTo(parseInt(btn.getAttribute('data-s'), 10));
    });
    starsEl.addEventListener('mouseleave', function () {
      _fillUpTo(_data.user_rating || 0);
    });

    // Click — works on both desktop and mobile
    starsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-s]');
      if (!btn) return;
      var val = parseInt(btn.getAttribute('data-s'), 10);
      if (!loggedIn) {
        if (typeof navigate === 'function') navigate('/login.html');
        return;
      }
      _rC(val);
    });
  }

  function _fillUpTo(n) {
    var btns = document.querySelectorAll('#wv-stars button[data-s]');
    btns.forEach(function (btn) {
      btn.innerHTML = _starSvg(parseInt(btn.getAttribute('data-s'), 10) <= n);
    });
  }

  async function _rC(val) {
    if (_saving) return;
    if (!_entityType || !_entityId) return;
    var token = localStorage.getItem('token');
    if (!token) {
      if (typeof navigate === 'function') navigate('/login.html');
      return;
    }

    var newVal = _data.user_rating === val ? null : val;
    _saving = true;

    // Optimistic update
    var prev = _data.user_rating;
    _data.user_rating = newVal;
    _buildWidget('Saving…');

    try {
      var resp;
      if (newVal === null) {
        resp = await fetch(API_BASE + '/ratings/' + _entityType + '/' + _entityId, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } else {
        resp = await fetch(API_BASE + '/ratings', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: _entityId, entity_type: _entityType, rating: newVal }),
        });
      }
      if (!resp.ok) {
        var errJson = {};
        try { errJson = await resp.json(); } catch (_) {}
        throw new Error(errJson.error || ('HTTP ' + resp.status));
      }
    } catch (err) {
      // Revert optimistic update and show error
      _data.user_rating = prev;
      _saving = false;
      _buildWidget('Failed: ' + err.message);
      setTimeout(function () { _buildWidget(); }, 3000);
      return;
    }

    _saving = false;
    await _load(_entityType, _entityId);
  }

  async function _load(entityType, entityId) {
    _entityType = entityType;
    _entityId = entityId;
    try {
      var token = localStorage.getItem('token');
      var headers = token ? { Authorization: 'Bearer ' + token } : {};
      var resp = await fetch(API_BASE + '/ratings/' + entityType + '/' + entityId, { headers: headers });
      if (resp.ok) {
        _data = await resp.json();
      }
    } catch (e) {
      _data = { avg: null, count: 0, user_rating: null };
    }
    _buildWidget();
  }

  window.loadRatings = _load;
  window._rH = function () {};
  window._rC = _rC;
})();
