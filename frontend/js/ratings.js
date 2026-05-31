// Star rating widget — shared by track.html and album.html.
// Exposes window.loadRatings(entityType, entityId) which fetches
// the current averages + user's own rating, then renders the widget
// into <div id="rating-widget">.
(function () {
  'use strict';

  var _data = { avg: null, count: 0, user_rating: null };
  var _entityType = null;
  var _entityId = null;
  var _hover = null;

  function _starSvg(filled, size) {
    size = size || 20;
    if (filled) {
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  function _render() {
    var container = document.getElementById('rating-widget');
    if (!container) return;

    var isLoggedIn = !!localStorage.getItem('token');
    var display = _hover !== null ? _hover : (_data.user_rating || 0);

    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
      var filled = i <= display;
      if (isLoggedIn) {
        starsHtml +=
          '<button data-s="' + i + '" ' +
          'style="background:none;border:none;cursor:pointer;padding:2px;line-height:0;transition:transform 0.1s;" ' +
          'onmouseenter="window._rH(' + i + ')" onmouseleave="window._rH(null)" ' +
          'onclick="window._rC(' + i + ')" title="' + i + ' star' + (i > 1 ? 's' : '') + '">' +
          _starSvg(filled) +
          '</button>';
      } else {
        starsHtml += '<span style="line-height:0;display:inline-block;padding:2px;">' + _starSvg(filled) + '</span>';
      }
    }

    var summaryHtml;
    if (_data.count > 0) {
      summaryHtml =
        '<span style="font-size:14px;font-weight:600;color:var(--text);">' + _data.avg + '</span>' +
        '<span style="font-size:13px;color:var(--text-3);margin-left:5px;">' +
          '(' + _data.count + ' rating' + (_data.count !== 1 ? 's' : '') + ')' +
        '</span>';
    } else {
      summaryHtml = '<span style="font-size:13px;color:var(--text-3);">No ratings yet — be the first!</span>';
    }

    container.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;">' +
        '<div style="display:flex;gap:0px;align-items:center;">' + starsHtml + '</div>' +
        '<div>' + summaryHtml + '</div>' +
      '</div>';
  }

  window._rH = function (val) { _hover = val; _render(); };

  window._rC = async function (val) {
    if (!_entityType || !_entityId) return;
    var token = localStorage.getItem('token');
    if (!token) return;

    // Clicking the same star again removes the rating
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

    // Re-fetch fresh averages
    await _load(_entityType, _entityId);
  };

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
    _render();
  }

  window.loadRatings = _load;
})();
