// Star rating widget — shared by track.html and album.html.
// Exposes window.loadRatings(entityType, entityId).
(function () {
  'use strict';

  var _data = { avg: null, count: 0, user_rating: null };
  var _entityType = null;
  var _entityId = null;

  function _starSvg(filled) {
    if (filled) {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  function _buildWidget() {
    var container = document.getElementById('rating-widget');
    if (!container) return;

    var loggedIn = !!localStorage.getItem('token');
    var current = _data.user_rating || 0;

    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
      if (loggedIn) {
        starsHtml +=
          '<button type="button" data-s="' + i + '"' +
          ' style="background:none;border:none;cursor:pointer;padding:2px;line-height:0;">' +
          _starSvg(i <= current) +
          '</button>';
      } else {
        starsHtml +=
          '<span style="line-height:0;display:inline-block;padding:2px;">' +
          _starSvg(i <= current) +
          '</span>';
      }
    }

    var summaryHtml = _data.count > 0
      ? '<span style="font-size:14px;font-weight:600;color:var(--text);">' + _data.avg + '</span>' +
        '<span style="font-size:13px;color:var(--text-3);margin-left:5px;">(' + _data.count + ' rating' + (_data.count !== 1 ? 's' : '') + ')</span>'
      : '<span style="font-size:13px;color:var(--text-3);">No ratings yet</span>';

    container.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<div id="wv-stars" style="display:flex;align-items:center;">' + starsHtml + '</div>' +
        '<div id="wv-rating-summary">' + summaryHtml + '</div>' +
      '</div>';

    if (!loggedIn) return;

    // Event delegation on the container — avoids stale handlers when stars
    // are re-rendered and prevents hover getting stuck on individual elements.
    var starsEl = document.getElementById('wv-stars');
    if (!starsEl) return;

    starsEl.addEventListener('mousemove', function (e) {
      var btn = e.target.closest('button[data-s]');
      if (!btn) return;
      _fillUpTo(parseInt(btn.getAttribute('data-s'), 10));
    });

    // mouseleave on the container (not individual stars) — never gets stuck.
    starsEl.addEventListener('mouseleave', function () {
      _fillUpTo(_data.user_rating || 0);
    });

    starsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-s]');
      if (!btn) return;
      _rC(parseInt(btn.getAttribute('data-s'), 10));
    });
  }

  function _fillUpTo(n) {
    var btns = document.querySelectorAll('#wv-stars button[data-s]');
    btns.forEach(function (btn) {
      btn.innerHTML = _starSvg(parseInt(btn.getAttribute('data-s'), 10) <= n);
    });
  }

  async function _rC(val) {
    if (!_entityType || !_entityId) return;
    var token = localStorage.getItem('token');
    if (!token) return;

    var newVal = _data.user_rating === val ? null : val;

    if (newVal === null) {
      await fetch(API_BASE + '/ratings/' + _entityType + '/' + _entityId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      }).catch(function () {});
    } else {
      await fetch(API_BASE + '/ratings', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: _entityId, entity_type: _entityType, rating: newVal }),
      }).catch(function () {});
    }

    await _load(_entityType, _entityId);
  }

  async function _load(entityType, entityId) {
    _entityType = entityType;
    _entityId = entityId;
    try {
      var token = localStorage.getItem('token');
      var headers = token ? { Authorization: 'Bearer ' + token } : {};
      var resp = await fetch(API_BASE + '/ratings/' + entityType + '/' + entityId, { headers: headers });
      _data = await resp.json();
    } catch (e) {
      _data = { avg: null, count: 0, user_rating: null };
    }
    _buildWidget();
  }

  window.loadRatings = _load;
  // Stubs so any lingering inline handlers in old DOM snapshots don't throw.
  window._rH = function () {};
  window._rC = _rC;
})();
