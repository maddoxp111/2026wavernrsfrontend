const PLAYER_KEY = 'player_current';
let audio = null;
let currentTrack = null;
let _restoreCanplayFn = null; // tracked so playTrack() can cancel it

// Escape a value for safe insertion into an HTML attribute / text node.
// cover_url is user-controlled free text, so it must never hit innerHTML raw.
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Global play queue ───────────────────────────────────────────────────────
// Lives in the player (not the page) so skip/prev keep working from the OS media
// UI (Control Center / lock screen) even after navigating away from the source
// page. Pages that have an ordered list (album, playlist) populate this via
// setPlayerQueue(); everyone else uses plain playTrack(), which resets it.
let _pq = [];          // array of playTrack-ready track objects
let _pqIdx = -1;       // current index within _pq
let _pqOnChange = null; // optional callback(idx) for row highlighting
let _pqOnChangeGen = null; // page generation the callback belongs to
let _fromQueue = false; // guard so queue-driven plays don't reset the queue

const QUEUE_KEY = 'wv_queue';

// The row-highlight callback belongs to the page that set it. After an SPA
// navigation it would light up rows on a different page, so it only runs
// while the page generation it was registered on is still current.
function _setOnChange(fn) {
  _pqOnChange = (typeof fn === 'function') ? fn : null;
  _pqOnChangeGen = _pqOnChange ? (window._wvNavGen || 0) : null;
}
function _fireOnChange(idx) {
  if (!_pqOnChange) return;
  if (_pqOnChangeGen !== (window._wvNavGen || 0)) { _pqOnChange = null; return; }
  try { _pqOnChange(idx); } catch (_) {}
}
window.setQueueOnChange = function (fn) { _setOnChange(fn); if (_pqOnChange && _pqIdx >= 0) _fireOnChange(_pqIdx); };

function _saveQueue() {
  try {
    if (!_pq.length) { localStorage.removeItem(QUEUE_KEY); return; }
    localStorage.setItem(QUEUE_KEY, JSON.stringify({ list: _pq.slice(0, 200), idx: _pqIdx, at: Date.now() }));
  } catch (_) {}
}

window.setPlayerQueue = function (list, idx, onChange) {
  _pq = Array.isArray(list) ? list : [];
  _pqIdx = (typeof idx === 'number') ? idx : -1;
  _setOnChange(onChange);
  _shuffleBag = [];
  _shuffleStarted = false;
  _renderQueuePanel();
  _saveQueue();
};

function _queueable(t) {
  if (!t || !t.ia_url) return null;
  return {
    id: t.id, title: t.title, ia_url: t.ia_url,
    cover_url: t.cover_url || t.cover || null,
    artist_name: t.artist_name || t._archive_artist || (t.artists && t.artists.display_name) || '',
    album_id: t.album_id || null, artist_id: t.artist_id || null,
    _archive_artist: t._archive_artist || null,
  };
}

// Drop a track in right after the one playing.
window.playNextInQueue = function (track) {
  const t = _queueable(track);
  if (!t) { if (typeof wvToast === 'function') wvToast('that track doesnt have audio yet'); return false; }
  if (!_pq.length && currentTrack) { _pq = [_queueable(currentTrack) || currentTrack]; _pqIdx = 0; }
  _pq.splice(_pqIdx + 1, 0, t);
  _shuffleBag = _shuffleBag.map(i => (i > _pqIdx ? i + 1 : i));
  _renderQueuePanel();
  _saveQueue();
  if (typeof wvToast === 'function') wvToast('playing next: ' + (t.title || 'track'));
  return true;
};

window.addToQueue = function (track) {
  const t = _queueable(track);
  if (!t) { if (typeof wvToast === 'function') wvToast('that track doesnt have audio yet'); return false; }
  if (!_pq.length && currentTrack) { _pq = [_queueable(currentTrack) || currentTrack]; _pqIdx = 0; }
  // Your picks go ahead of anything autoplay lined up.
  const at = _firstAutoplayAfterNow();
  _pq.splice(at, 0, t);
  _shuffleBag = _shuffleBag.map(i => (i >= at ? i + 1 : i));
  _renderQueuePanel();
  _saveQueue();
  if (typeof wvToast === 'function') wvToast('added to queue: ' + (t.title || 'track'));
  return true;
};

// Queue a whole comp without interrupting what is playing.
window.addAlbumToQueue = async function (albumId) {
  try {
    const rows = await api('/albums/' + albumId + '/tracks');
    const tracks = (rows || []).map(r => r.tracks || r).filter(t => t && t.ia_url);
    if (!tracks.length) { if (typeof wvToast === 'function') wvToast('nothing on that comp can play'); return false; }
    if (!_pq.length && currentTrack) { _pq = [_queueable(currentTrack) || currentTrack]; _pqIdx = 0; }
    const add = tracks.map(_queueable).filter(Boolean);
    const at = _firstAutoplayAfterNow();
    _pq.splice.apply(_pq, [at, 0].concat(add));
    _shuffleBag = _shuffleBag.map(i => (i >= at ? i + add.length : i));
    _renderQueuePanel();
    _saveQueue();
    if (typeof wvToast === 'function') wvToast('queued ' + tracks.length + ' track' + (tracks.length === 1 ? '' : 's'));
    return true;
  } catch (e) {
    if (typeof wvToast === 'function') wvToast('couldnt load that comp');
    return false;
  }
};

function _firstAutoplayAfterNow() {
  for (let i = Math.max(0, _pqIdx + 1); i < _pq.length; i++) if (_pq[i] && _pq[i]._autoplay) return i;
  return _pq.length;
}
window.getPlayerQueue = function () { return { list: _pq.slice(), idx: _pqIdx }; };
// Read-only views for skins (the Spotify sidebar reads these).
try {
  Object.defineProperty(window, 'playerQueue', { configurable: true, get: function () { return _pq.slice(); } });
  Object.defineProperty(window, 'queueIndex', { configurable: true, get: function () { return _pqIdx; } });
} catch (_) {}

// Play a whole comp from anywhere on the site — a grid card, a chart row, a
// related rail — without first opening its page.
window.playCompById = async function (albumId, opts) {
  const o = opts || {};
  try {
    if (typeof wvToast === 'function' && !o.quiet) wvToast('Loading…');
    const rows = await api('/albums/' + albumId + '/tracks');
    let tracks = (rows || []).map(r => r.tracks || r).filter(t => t && t.ia_url);
    if (!tracks.length) { if (typeof wvToast === 'function') wvToast('nothing on that comp can play', 'error'); return false; }
    let meta = o.album || null;
    if (!meta) { try { meta = await api('/albums/' + albumId); } catch (_) { meta = null; } }
    const who = meta ? ((meta.is_archive && meta.archive_artist_name) || (meta.artists && meta.artists.display_name) || '') : '';
    const cover = meta ? meta.cover_url : null;
    const credits = (typeof wvEditCredits === 'function' && wvEditCredits(tracks.map(t => t.title), who)) || [];
    const queue = tracks.map((t, i) => ({
      id: t.id, title: credits[i] ? credits[i].title : t.title, ia_url: t.ia_url,
      cover_url: t.cover_url || cover || null,
      artist_name: credits[i] ? credits[i].credit : (who || (t.artists && t.artists.display_name) || ''),
      album_id: albumId, artist_id: t.artist_id || null,
      _album_id: albumId,
      _album_title: meta ? meta.title : null,
      _album_cover: cover || null,
      _archive_artist: meta && meta.is_archive ? (meta.archive_artist_name || null) : null,
    }));
    if (o.shuffle) {
      for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    }
    window.setPlayerQueue(queue, 0);
    window.playQueueIndex(0);
    return true;
  } catch (e) {
    if (typeof wvToast === 'function') wvToast('couldnt play that comp', 'error');
    return false;
  }
};

window.moveQueueItem = function (from, to) {
  if (from < 0 || from >= _pq.length || to < 0 || to >= _pq.length || from === to) return;
  const [item] = _pq.splice(from, 1);
  _pq.splice(to, 0, item);
  if (_pqIdx === from) _pqIdx = to;
  else if (from < _pqIdx && to >= _pqIdx) _pqIdx--;
  else if (from > _pqIdx && to <= _pqIdx) _pqIdx++;
  _shuffleBag = [];
  _shuffleStarted = false;
  _renderQueuePanel();
  _saveQueue();
};

window.playQueueIndex = function (idx) {
  if (idx < 0 || idx >= _pq.length) return false;
  _pqIdx = idx;
  _fromQueue = true;
  playTrack(_pq[idx]);
  _fromQueue = false;
  _fireOnChange(idx);
  _renderQueuePanel();
  _saveQueue();
  return true;
};

let _iosUnlocked = false;
let _iosUnlockPending = false;
function _unlockIOS() {
  if (_iosUnlocked || !audio) return;
  _iosUnlocked = true;
  _iosUnlockPending = true;
  const s = audio.src, t = audio.currentTime, p = audio.paused;
  const _dummy = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZFRlYW0gQ3JlYXRpdmUgQ29tbW9ucyBBdHRyaWJ1dGlvbgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//MUxAAKAdABQAAAAP//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  audio.src = _dummy;
  audio.volume = 0;
  audio.play().then(() => {
    audio.pause();
    if (_iosUnlockPending) {
      _iosUnlockPending = false;
      audio.src = s; audio.currentTime = t; audio.volume = 1;
      if (!p && s) audio.play().catch(() => {});
    }
  }).catch(() => {
    if (_iosUnlockPending) {
      _iosUnlockPending = false;
      audio.src = s; audio.currentTime = t; audio.volume = 1;
    }
  });
  document.removeEventListener('touchstart', _unlockIOS);
}

function _heartIcon(on) {
  return on
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.1 3.9 13a5.2 5.2 0 0 1 7.35-7.35l.75.75.75-.75A5.2 5.2 0 0 1 20.1 13Z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.3 4.6 12.9a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z"/></svg>';
}

// ── Like / add / speed / sleep timer ─────────────────────────────────────
var _liked = false;
function _setLikeUI(on) {
  _liked = !!on;
  ['player-like-btn', 'pfs-like-btn'].forEach(id => {
    const b = document.getElementById(id); if (!b) return;
    b.innerHTML = _heartIcon(_liked); b.classList.toggle('player-liked', _liked);
  });
}
function _refreshLike() {
  _setLikeUI(false);
  if (!currentTrack || !currentTrack.id || !localStorage.getItem('token') || typeof api !== 'function') return;
  const id = currentTrack.id;
  api('/tracks/' + id).then(t => { if (currentTrack && currentTrack.id === id) _setLikeUI(t && t.user_liked); }).catch(() => {});
}
function toggleCurrentLike() {
  if (!currentTrack || !currentTrack.id) return;
  if (!localStorage.getItem('token')) { location.assign('/login?next=' + encodeURIComponent(location.pathname + location.search)); return; }
  _setLikeUI(!_liked);
  api('/tracks/' + currentTrack.id + '/like', { method: 'POST' }).then(r => { _setLikeUI(r && r.liked); if (typeof window.refreshSidebarLibrary === 'function') window.refreshSidebarLibrary(); }).catch(() => _setLikeUI(!_liked));
}
function addCurrentToPlaylist() {
  if (!currentTrack || !currentTrack.id) return;
  if (typeof openAddToPlaylist === 'function') openAddToPlaylist(currentTrack);
}
function goToCurrentTrack() {
  if (!currentTrack || !currentTrack.id) return;
  closeFullPlayer();
  navigate(currentTrack._album_id ? '/album?id=' + currentTrack._album_id : '/track?id=' + currentTrack.id);
}
function goToCurrentArtist() {
  if (!currentTrack) return;
  if (currentTrack._archive_artist && typeof archiveArtistSlug === 'function') { closeFullPlayer(); return navigate('/archive-artist?a=' + encodeURIComponent(archiveArtistSlug(currentTrack._archive_artist))); }
  const aid = currentTrack.artist_id || (currentTrack.artists && currentTrack.artists.id);
  if (!aid) return goToCurrentTrack();
  closeFullPlayer(); navigate('/artist?id=' + aid);
}
function shareCurrent() {
  if (!currentTrack || !currentTrack.id) return;
  const url = location.origin + (currentTrack._album_id ? '/album?id=' + currentTrack._album_id : '/track?id=' + currentTrack.id);
  if (navigator.share) navigator.share({ title: currentTrack.title, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { if (typeof wvToast === 'function') wvToast('link copied'); }).catch(() => { if (typeof wvToast === 'function') wvToast('couldnt copy the link', 'error'); });
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
function _closeSheet() { document.querySelectorAll('.wv-sheet, .wv-sheet-overlay').forEach(el => el.remove()); }
var _lastKeyAt = 0;
document.addEventListener('keydown', () => { _lastKeyAt = Date.now(); }, true);
function _sheet(title, opts, current, onPick) {
  _sheetSections(title, [{ opts: opts, current: current, onPick: onPick }]);
}
// A bottom sheet with one or more labelled rows of choices.
function _sheetSections(title, sections) {
  _closeSheet();
  const prev = document.activeElement;
  const ov = document.createElement('div'); ov.className = 'wv-sheet-overlay'; ov.onclick = _closeSheet;
  const sh = document.createElement('div'); sh.className = 'wv-sheet';
  sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', String(title).replace(/<[^>]*>/g, ''));
  sh.innerHTML = '<div class="wv-sheet-title">' + title + '</div>' + sections.map((sec, si) =>
    (sec.label ? '<div class="wv-sheet-sub">' + sec.label + '</div>' : '') +
    '<div class="wv-sheet-opts' + (sec.cls ? ' ' + sec.cls : '') + '">' +
    sec.opts.map(o => '<button type="button" class="' + (String(o.v) === String(sec.current) ? 'on' : '') + '" data-s="' + si + '" data-v="' + _esc(o.v) + '"' + (String(o.v) === String(sec.current) ? ' aria-pressed="true"' : '') + '>' + o.l + (o.d ? '<small>' + o.d + '</small>' : '') + '</button>').join('') + '</div>').join('');
  sh.querySelectorAll('button[data-v]').forEach(b => b.onclick = () => { sections[+b.dataset.s].onPick(b.dataset.v); _closeSheet(); try { prev && prev.focus && prev.focus({ preventScroll: true }); } catch (_) {} });
  document.body.appendChild(ov); document.body.appendChild(sh);
  // Opened from the keyboard: put focus on the current choice.
  if (Date.now() - _lastKeyAt < 800) { const on = sh.querySelector('button.on') || sh.querySelector('button'); try { on && on.focus({ preventScroll: true }); } catch (_) {} }
}

// Vibe: slowed or sped-up playback with the pitch following the speed, the
// way the edits community makes them. It is the element's own rate change,
// so it works on any file with no audio processing.
const VIBES = { normal: null, slowed: 0.85, spedup: 1.2 };
function _vibe() { try { const v = localStorage.getItem('wv_vibe'); return VIBES[v] ? v : 'normal'; } catch (_) { return 'normal'; } }
function _applyRate() {
  if (!audio) return;
  const vibe = _vibe();
  let rate = parseFloat(localStorage.getItem('wv_speed')) || 1;
  if (VIBES[vibe]) rate = VIBES[vibe];
  const keepPitch = !VIBES[vibe];
  try { audio.preservesPitch = keepPitch; audio.mozPreservesPitch = keepPitch; audio.webkitPreservesPitch = keepPitch; } catch (_) {}
  audio.defaultPlaybackRate = rate;
  if (audio.playbackRate !== rate) audio.playbackRate = rate;
  const lbl = vibe === 'slowed' ? 'Slowed' : vibe === 'spedup' ? 'Sped up' : rate + '×';
  const pfs = document.getElementById('pfs-speed-lbl'); if (pfs) pfs.textContent = lbl;
  const bar = document.getElementById('player-speed-btn');
  if (bar) { bar.textContent = rate + '×'; bar.title = VIBES[vibe] ? 'Vibe: ' + lbl.toLowerCase() : 'Playback speed'; }
  document.querySelectorAll('#player-speed-btn, #pfs-speed-btn').forEach(el => { el.classList.toggle('on', rate !== 1); el.classList.toggle('wv-vibe-on', !!VIBES[vibe]); });
}
function setPlaybackSpeed(v) {
  v = parseFloat(v) || 1;
  try { localStorage.setItem('wv_speed', String(v)); localStorage.removeItem('wv_vibe'); } catch (_) {}
  _applyRate();
}
function setVibe(v) {
  if (!Object.prototype.hasOwnProperty.call(VIBES, v)) v = 'normal';
  try { if (v === 'normal') localStorage.removeItem('wv_vibe'); else localStorage.setItem('wv_vibe', v); } catch (_) {}
  _applyRate();
  if (typeof wvToast === 'function') wvToast(v === 'slowed' ? 'slowed down...' : v === 'spedup' ? 'sped up' : 'back to normal');
}
window.setVibe = setVibe;
// Step through the speeds (keyboard , and .); a vibe steps back to plain speed.
window.stepPlaybackSpeed = function (dir) {
  const cur = audio ? audio.playbackRate : 1;
  let i = SPEEDS.indexOf(cur);
  if (i < 0) { i = 0; while (i < SPEEDS.length - 1 && SPEEDS[i] < cur) i++; if (dir < 0 && SPEEDS[i] >= cur && i > 0) i--; else if (dir > 0 && SPEEDS[i] <= cur && i < SPEEDS.length - 1) i++; }
  else i = Math.max(0, Math.min(SPEEDS.length - 1, i + dir));
  setPlaybackSpeed(SPEEDS[i]);
};
function openSpeedSheet() {
  const vibe = _vibe();
  const cur = VIBES[vibe] ? null : (parseFloat(localStorage.getItem('wv_speed')) || 1);
  _sheetSections('Playback', [
    { label: 'Vibe', cls: 'wv-sheet-vibes', current: vibe, onPick: setVibe, opts: [
      { v: 'normal', l: 'Normal', d: 'as uploaded' },
      { v: 'slowed', l: 'Slowed', d: '0.85× · deeper' },
      { v: 'spedup', l: 'Sped up', d: '1.2× · higher' },
    ] },
    { label: 'Speed', current: cur, onPick: setPlaybackSpeed, opts: SPEEDS.map(v => ({ v, l: v + '×' })) },
  ]);
}
var _sleepAt = 0, _sleepTimer = null, _sleepEndOfTrack = false;
function _tickSleep() {
  const left = _sleepAt - Date.now();
  const badge = id => document.getElementById(id);
  if (left <= 0) {
    clearInterval(_sleepTimer); _sleepTimer = null; _sleepAt = 0;
    pausePlayer();
    document.querySelectorAll('#player-timer-btn, #pfs-timer-btn').forEach(el => el.classList.remove('on'));
    ['player-timer-badge', 'pfs-timer-lbl'].forEach(id => { const el = badge(id); if (el) el.textContent = id === 'pfs-timer-lbl' ? 'Timer' : ''; });
    return;
  }
  const m = Math.ceil(left / 60000);
  const b = badge('player-timer-badge'); if (b) { b.textContent = m + 'm'; b.style.display = ''; }
  const l = badge('pfs-timer-lbl'); if (l) l.textContent = m + 'm';
}
function setSleepTimer(min) {
  const eot = min === 'eot' || min === -1 || min === '-1';
  min = eot ? 0 : (parseInt(min, 10) || 0);
  clearInterval(_sleepTimer); _sleepTimer = null;
  _sleepEndOfTrack = eot;
  document.querySelectorAll('#player-timer-btn, #pfs-timer-btn').forEach(el => el.classList.toggle('on', min > 0 || eot));
  if (eot) {
    _sleepAt = 0;
    const b = document.getElementById('player-timer-badge'); if (b) { b.textContent = 'end'; b.style.display = ''; }
    const l = document.getElementById('pfs-timer-lbl'); if (l) l.textContent = 'End of track';
    if (typeof wvToast === 'function') wvToast('stopping at the end of this track');
    return;
  }
  if (!min) { _sleepAt = 0; const b = document.getElementById('player-timer-badge'); if (b) { b.textContent = ''; b.style.display = 'none'; } const l = document.getElementById('pfs-timer-lbl'); if (l) l.textContent = 'Timer'; return; }
  _sleepAt = Date.now() + min * 60000;
  _sleepTimer = setInterval(_tickSleep, 5000); _tickSleep();
}
function openTimerSheet() {
  const left = _sleepAt ? Math.ceil((_sleepAt - Date.now()) / 60000) : 0;
  _sheet('Sleep timer' + (left ? ' · ' + left + ' min left' : (_sleepEndOfTrack ? ' · end of this track' : '')),
    [{ v: 0, l: 'Off' }, { v: 'eot', l: 'End of track' }, { v: 15, l: '15 min' }, { v: 30, l: '30 min' }, { v: 45, l: '45 min' }, { v: 60, l: '1 hour' }, { v: 90, l: '1.5 hours' }],
    left ? null : (_sleepEndOfTrack ? 'eot' : 0), setSleepTimer);
}

function injectPlayer() {
  document.getElementById('bottom-shell')?.remove();
  document.getElementById('player-fullscreen')?.remove();

  // ── PLAYER BAR ──
  const bar = document.createElement('div');
  bar.id = 'player';
  bar.className = 'player-bar hidden';
  bar.innerHTML = `
    <!-- Desktop left -->
    <div class="player-track" id="player-track-info">
      <div class="player-cover" id="player-cover" onclick="openFullPlayer()" title="Now playing">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="player-track-text">
        <div class="player-title" id="player-title" onclick="goToCurrentTrack()">—</div>
        <div class="player-artist" id="player-artist">—</div>
      </div>
      <div class="player-track-actions">
        <button class="player-btn player-icon-btn" id="player-like-btn" onclick="toggleCurrentLike()" title="Like">${_heartIcon(false)}</button>
        <button class="player-btn player-icon-btn" onclick="addCurrentToPlaylist()" title="Add to playlist">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z"/></svg>
        </button>
      </div>
    </div>
    <!-- Desktop center: controls + progress -->
    <div class="player-center">
      <div class="player-controls">
        <span id="player-timer-badge" class="player-timer-badge" style="display:none"></span>
        <button class="player-btn player-icon-btn" id="player-shuffle-btn" onclick="toggleShuffle()" title="Shuffle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
        </button>
        <button class="player-btn player-icon-btn" onclick="skipPrev()" title="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="player-btn player-btn-play" onclick="togglePlay()" id="player-play-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="player-btn player-icon-btn" onclick="skipNext()" title="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button class="player-btn player-icon-btn" id="player-repeat-btn" onclick="toggleRepeat()" title="Repeat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
        </button>
        <button class="player-btn player-icon-btn" id="player-queue-btn" onclick="toggleQueuePanel()" title="Up Next">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
        </button>
      </div>
      <div class="player-progress">
        <span class="player-time" id="time-elapsed">0:00</span>
        <div class="progress-bar" id="progress-bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <span class="player-time" id="time-total">0:00</span>
      </div>
    </div>
    <!-- Desktop right: tools + volume -->
    <div class="player-volume">
      <button class="player-btn player-icon-btn" id="player-mute-btn" onclick="toggleMute()" title="Mute (m)">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>
      </button>
      <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.01" value="1" aria-label="Volume" title="Volume">
      <button class="player-btn player-icon-btn" id="player-lyrics-btn" onclick="openFullPlayer(true)" title="Lyrics">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="13" height="2.4" rx="1.2"/><rect x="3" y="16.6" width="16" height="2.4" rx="1.2"/></svg>
      </button>
      <button class="player-btn player-icon-btn player-speed" id="player-speed-btn" onclick="openSpeedSheet()" title="Playback speed">1×</button>
      <button class="player-btn player-icon-btn player-timer" id="player-timer-btn" onclick="openTimerSheet()" title="Sleep timer">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3h2v5.3l3.8 2.2-1 1.7L11 13.2Z"/></svg>
      </button>
      <button class="player-btn player-icon-btn" onclick="openFullPlayer()" title="Full screen">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v2H6v4H4Zm10 0h6v6h-2V6h-4ZM4 14h2v4h4v2H4Zm14 0h2v6h-6v-2h4Z"/></svg>
      </button>
    </div>
    <!-- Mobile mini (shown instead on small screens) -->
    <div class="player-mini" id="player-mini" onclick="openFullPlayer()">
      <div class="player-mini-cover" id="player-mini-cover">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="player-mini-text">
        <div class="player-mini-title" id="player-mini-title">—</div>
        <div class="player-mini-artist" id="player-mini-artist">—</div>
      </div>
      <div class="player-mini-progress"><div class="player-mini-progress-fill" id="player-mini-fill"></div></div>
      <button class="player-btn player-btn-play player-mini-play" onclick="event.stopPropagation();togglePlay()" id="player-mini-play-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
    </div>
  `;
  // Inject player into the designated slot (created by layout.js)
  const slot = document.getElementById('wv-player-slot');
  if (slot) {
    slot.appendChild(bar);
  } else {
    // Fallback: append to body if shell not ready
    document.body.appendChild(bar);
  }

  // ── FULL-SCREEN PLAYER (mobile) ──
  const fs = document.createElement('div');
  fs.id = 'player-fullscreen';
  fs.innerHTML = `
    <div class="pfs-bg" id="pfs-bg"></div>
    <canvas id="wv-stars-fs"></canvas>
    <div class="pfs-wrap">
      <div class="pfs-header">
        <button class="pfs-close" onclick="closeFullPlayer()" aria-label="Close">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </button>
        <div class="pfs-head-mid"><div class="pfs-label">Now playing</div><div class="pfs-context" id="pfs-context">wavernrs</div></div>
        <button class="pfs-more" onclick="shareCurrent()" aria-label="Share" title="Share">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.1a2.9 2.9 0 0 0-2 .8l-7.1-4.1a3 3 0 0 0 0-1.6L16 7.1a2.9 2.9 0 1 0-.9-1.5L8 9.7a2.9 2.9 0 1 0 0 4.6l7.1 4.2a2.9 2.9 0 1 0 2.9-2.4Z"/></svg>
        </button>
      </div>
      <div class="pfs-body">
        <div class="pfs-stage">
          <div class="pfs-cover-wrap">
            <div class="pfs-cover" id="pfs-cover" ondblclick="togglePlay()">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          </div>
          <div class="pfs-lyrics" id="pfs-lyrics" hidden>
            <div class="pfs-lyrics-mask"><div class="pfs-lyrics-scroll" id="pfs-lyrics-scroll"></div></div>
            <div class="pfs-lyrics-tools" id="pfs-lyrics-tools" hidden></div>
          </div>
        </div>
        <div class="pfs-right">
          <div class="pfs-info">
            <div class="pfs-info-text">
              <div class="pfs-title" id="pfs-title" onclick="goToCurrentTrack()">—</div>
              <div class="pfs-artist" id="pfs-artist" onclick="goToCurrentArtist()">—</div>
            </div>
            <div class="pfs-info-actions">
              <button class="player-btn player-icon-btn" id="pfs-like-btn" onclick="toggleCurrentLike()" title="Like">${_heartIcon(false)}</button>
              <button class="player-btn player-icon-btn" onclick="addCurrentToPlaylist()" title="Add to playlist">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z"/></svg>
              </button>
            </div>
          </div>
          <div class="pfs-progress">
            <div class="progress-bar pfs-bar" id="pfs-progress-bar"><div class="progress-fill" id="pfs-fill"></div></div>
            <div class="pfs-times"><span id="pfs-elapsed">0:00</span><span id="pfs-total">0:00</span></div>
          </div>
          <div class="pfs-controls">
            <button class="player-btn player-icon-btn pfs-btn" id="pfs-shuffle" onclick="toggleShuffle()" title="Shuffle">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            </button>
            <button class="player-btn player-icon-btn pfs-btn" onclick="skipPrev()" title="Previous">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="player-btn player-btn-play pfs-play-btn" onclick="togglePlay()" id="pfs-play-btn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="player-btn player-icon-btn pfs-btn" onclick="skipNext()" title="Next">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <button class="player-btn player-icon-btn pfs-btn" id="pfs-repeat" onclick="toggleRepeat()" title="Repeat">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            </button>
          </div>
          <div class="pfs-toolbar">
            <button class="pfs-tool" id="pfs-lyrics-btn" onclick="toggleLyricsView()">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="13" height="2.4" rx="1.2"/><rect x="3" y="16.6" width="16" height="2.4" rx="1.2"/></svg><span>Lyrics</span>
            </button>
            <button class="pfs-tool" id="pfs-queue-btn" onclick="toggleQueuePanel()">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg><span>Queue</span>
            </button>
            <button class="pfs-tool" id="pfs-speed-btn" onclick="openSpeedSheet()">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a9 9 0 0 0-7.8 13.5l1.7-1A7 7 0 1 1 18.1 16.5l1.7 1A9 9 0 0 0 12 4Zm0 5-3.2 6.3A2 2 0 1 0 12 17a2 2 0 0 0 .5-.1l3.4-6Z"/></svg><span id="pfs-speed-lbl">1×</span>
            </button>
            <button class="pfs-tool" id="pfs-timer-btn" onclick="openTimerSheet()">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3h2v5.3l3.8 2.2-1 1.7L11 13.2Z"/></svg><span id="pfs-timer-lbl">Timer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(fs);

  // ── UP NEXT QUEUE PANEL ──
  document.getElementById('wv-queue-panel')?.remove();
  const qp = document.createElement('div');
  qp.id = 'wv-queue-panel';
  qp.setAttribute('role', 'dialog');
  qp.setAttribute('aria-label', 'Queue');
  qp.innerHTML = `
    <div class="wv-queue-grab" aria-hidden="true"></div>
    <div class="wv-queue-head">
      <div class="wv-queue-head-t">
        <span class="wv-queue-title">Queue</span>
        <span class="wv-queue-count" id="wv-queue-count"></span>
      </div>
      <button type="button" class="wvq-hbtn" id="wvq-save-btn" onclick="wvQueueSavePrompt()" title="Save as playlist" aria-label="Save queue as a playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h12M3 12h12M3 18h7"/><path d="M18 14v7M14.5 17.5h7"/></svg>
      </button>
      <button type="button" class="wvq-hbtn" onclick="clearUpcomingQueue()" title="Clear upcoming" aria-label="Clear upcoming tracks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
      </button>
      <button type="button" class="wvq-hbtn wv-queue-close" onclick="toggleQueuePanel(false)" aria-label="Close queue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="wvq-save" id="wvq-save" hidden></div>
    <div class="wv-queue-list" id="wv-queue-list"></div>
    <div class="wvq-snack" id="wvq-snack" role="status" aria-live="polite"></div>
  `;
  _injectQueueCss();
  document.body.appendChild(qp);
  _wireQueuePanel(qp);
  _renderQueuePanel();
}

// ── Queue panel ──────────────────────────────────────────────────────────────
// Now playing on top, then what is lined up, then the edits autoplay picked.
// Rows drag to reorder (mouse or touch), swipe left to remove on touch, and
// every removal can be undone for a few seconds.
var _qPastOpen = false;
var _qSuppressClick = 0;
var _qUndo = null, _qSnackTimer = 0;

function _qIcon(name) {
  const P = {
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" opacity=".7"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41ZM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5Zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13Z"/></svg>',
  };
  return P[name] || '';
}

function _qCover(t, px) {
  const seed = (t && t.title) || '';
  const bg = (typeof coverGradient === 'function') ? coverGradient(seed) : 'var(--surface-2)';
  const c = t && (t.cover_url || t._album_cover);
  const img = c ? '<img src="' + _esc(_coverAt(c, px)) + '" data-raw="' + _esc(c) + '" alt="" loading="lazy" decoding="async" onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw;this.dataset.raw=\'\';}else{this.remove()}">' : '';
  return '<span class="wvq-cov" style="background:' + _esc(bg) + '">' + img + '</span>';
}
function _qArtist(t) { return (t && (t.artist_name || t._archive_artist || (t.artists && t.artists.display_name))) || ''; }

function _qRow(t, i, kind) {
  const title = t.title || 'Untitled';
  const artist = _qArtist(t);
  const drag = kind === 'next' || kind === 'ap';
  return '<div class="wvq-row wvq-' + kind + '" data-i="' + i + '" role="button" tabindex="0" aria-label="' + _esc('Play ' + title + (artist ? ' by ' + artist : '')) + '">' +
    (drag ? '<span class="wvq-handle" data-drag="' + i + '" title="Drag to reorder" aria-hidden="true">' + _qIcon('grip') + '</span>' : '') +
    _qCover(t, 112) +
    '<span class="wvq-meta"><span class="wvq-t">' + _esc(title) + '</span><span class="wvq-a">' + _esc(artist) + '</span></span>' +
    (kind !== 'now' ? '<button type="button" class="wvq-x" data-rm="' + i + '" aria-label="' + _esc('Remove ' + title + ' from the queue') + '" title="Remove">' + _qIcon('x') + '</button>' : '') +
    '</div>';
}

function _injectQueueCss() {
  if (document.getElementById('wv-queue2-css')) return;
  const st = document.createElement('style');
  st.id = 'wv-queue2-css';
  st.textContent = `
#wv-queue-panel{position:fixed;right:16px;bottom:96px;top:auto;width:392px;max-height:min(640px,calc(100vh - 176px));max-height:min(640px,calc(100dvh - 176px));display:flex;flex-direction:column;z-index:300;background:var(--elevated);border:1px solid var(--hair);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.45),0 2px 8px rgba(0,0,0,.2);overflow:hidden;opacity:0;visibility:hidden;transform:translateY(10px) scale(.985);transform-origin:bottom right;transition:opacity .18s var(--ease),transform .22s var(--ease),visibility 0s linear .22s;pointer-events:none}
#wv-queue-panel:focus{outline:none}
#wv-queue-panel.open{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition:opacity .18s var(--ease),transform .22s var(--ease),visibility 0s}
.wv-queue-grab{display:none}
#wv-queue-panel .wv-queue-head{display:flex;align-items:center;gap:4px;padding:14px 10px 10px 18px;border-bottom:1px solid var(--hair);flex-shrink:0}
.wv-queue-head-t{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px}
#wv-queue-panel .wv-queue-title{font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--text)}
#wv-queue-panel .wv-queue-count{font-size:12.5px;color:var(--text-3);font-weight:600;flex:0 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvq-hbtn{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:var(--text-2);display:grid;place-items:center;cursor:pointer;flex-shrink:0;transition:background .15s,color .15s}
.wvq-hbtn svg{width:19px;height:19px}
.wvq-hbtn:hover{background:var(--surface-hover,var(--hair));color:var(--text)}
.wvq-hbtn:focus-visible,.wvq-row:focus-visible,.wvq-x:focus-visible,.wvq-btn:focus-visible,.wvq-sw:focus-visible,.wvq-past:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
#wv-queue-panel .wv-queue-list{position:relative;overflow-y:auto;overscroll-behavior:contain;padding:6px 8px 12px;flex:1;min-height:0;scrollbar-width:thin}
.wvq-label{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-3);padding:14px 10px 6px}
.wvq-label .wvq-note{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--text-3);display:inline-flex;align-items:center;gap:4px;margin-left:auto}
.wvq-label .wvq-note svg{width:13px;height:13px}
.wvq-row{position:relative;display:flex;align-items:center;gap:12px;padding:6px 6px 6px 8px;border-radius:10px;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none;background:var(--elevated);transition:background .12s}
.wvq-row:hover{background:var(--surface-hover,var(--hair))}
.wvq-cov{position:relative;width:44px;height:44px;border-radius:6px;overflow:hidden;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.wvq-cov img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.wvq-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.wvq-t{font-size:14px;font-weight:650;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvq-a{font-size:12.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvq-handle{width:22px;height:40px;margin:0 -6px 0 -4px;display:grid;place-items:center;color:var(--text-3);cursor:grab;touch-action:none;flex-shrink:0;opacity:.55;transition:opacity .15s}
.wvq-handle svg{width:16px;height:16px}
.wvq-row:hover .wvq-handle{opacity:1}
.wvq-x{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:var(--text-3);display:grid;place-items:center;cursor:pointer;flex-shrink:0;opacity:0;transition:opacity .15s,background .15s,color .15s}
.wvq-x svg{width:17px;height:17px}
.wvq-row:hover .wvq-x,.wvq-row:focus-within .wvq-x{opacity:1}
.wvq-x:hover{background:var(--hair);color:var(--text)}
.wvq-past-row{opacity:.55}
.wvq-past-row:hover{opacity:.9}
.wvq-nowcard{display:flex;align-items:center;gap:14px;padding:10px;margin:2px 0 0;border-radius:12px;background:var(--brand-bg,var(--hair));cursor:pointer;position:relative;overflow:hidden}
.wvq-nowcard .wvq-cov{width:64px;height:64px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.wvq-nowcard .wvq-t{font-size:16px;font-weight:800;letter-spacing:-.01em}
.wvq-nowcard .wvq-a{font-size:13px;color:var(--text-2)}
.wvq-nowcard .wvq-ctx{font-size:11.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.wvq-eq{display:flex;align-items:flex-end;gap:2px;height:16px;flex-shrink:0;margin-right:6px}
.wvq-eq i{width:3px;height:30%;background:var(--brand);border-radius:1px}
#wv-queue-panel.is-playing .wvq-eq i{animation:wvq-eq 1s ease-in-out infinite}
#wv-queue-panel.is-playing .wvq-eq i:nth-child(2){animation-delay:-.35s}
#wv-queue-panel.is-playing .wvq-eq i:nth-child(3){animation-delay:-.7s}
@keyframes wvq-eq{0%,100%{height:25%}50%{height:100%}}
.wvq-past{display:flex;align-items:center;gap:6px;width:100%;border:0;background:transparent;font:inherit;font-size:12px;font-weight:700;color:var(--text-3);padding:8px 10px;border-radius:8px;cursor:pointer;text-align:left}
.wvq-past:hover{color:var(--text-2);background:var(--hair)}
.wvq-past svg{width:14px;height:14px;transition:transform .2s var(--ease)}
.wvq-past[aria-expanded="true"] svg{transform:rotate(180deg)}
.wvq-ap{display:flex;align-items:center;gap:10px;margin:14px 2px 4px;padding:10px 10px 10px 12px;border-radius:12px;border:1px solid var(--hair)}
.wvq-ap-ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--brand-bg,var(--hair));color:var(--brand);flex-shrink:0}
.wvq-ap-ic svg{width:17px;height:17px}
.wvq-ap-t{flex:1;min-width:0}
.wvq-ap-t b{display:block;font-size:13px;font-weight:750;color:var(--text)}
.wvq-ap-t span{display:block;font-size:11.5px;color:var(--text-3);margin-top:1px}
.wvq-sw{position:relative;width:40px;height:24px;border-radius:12px;border:0;background:var(--hair-strong,var(--surface-3));cursor:pointer;flex-shrink:0;transition:background .18s}
.wvq-sw::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s var(--ease)}
.wvq-sw[aria-checked="true"]{background:var(--brand)}
.wvq-sw[aria-checked="true"]::after{transform:translateX(16px);background:#fff}
.wvq-empty{padding:34px 18px 22px;text-align:center}
.wvq-empty-ic{width:56px;height:56px;margin:0 auto 12px;border-radius:16px;display:grid;place-items:center;background:var(--brand-bg,var(--hair));color:var(--brand)}
.wvq-empty-ic svg{width:26px;height:26px}
.wvq-empty b{display:block;font-size:15px;font-weight:800;color:var(--text)}
.wvq-empty p{margin:4px 0 16px;font-size:13px;color:var(--text-3);line-height:1.45}
.wvq-empty.small{padding:18px 12px 8px}
.wvq-empty.small .wvq-empty-ic{display:none}
.wvq-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.wvq-btn{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 16px;border-radius:999px;border:0;font:inherit;font-size:13px;font-weight:750;cursor:pointer;background:var(--surface-2);color:var(--text);transition:transform .12s,background .15s}
.wvq-btn svg{width:16px;height:16px}
.wvq-btn:hover{background:var(--surface-3)}
.wvq-btn:active{transform:scale(.97)}
.wvq-btn.primary{background:var(--brand);color:var(--on-brand,#fff)}
.wvq-btn.primary:hover{filter:brightness(1.08);background:var(--brand)}
.wvq-line{position:absolute;left:12px;right:12px;height:2px;border-radius:2px;background:var(--brand);box-shadow:0 0 0 3px var(--brand-bg,transparent);pointer-events:none;z-index:3;display:none}
.wvq-line::before{content:'';position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--brand)}
.wvq-row.dragging{z-index:4;background:var(--surface-2);box-shadow:0 12px 30px rgba(0,0,0,.35);cursor:grabbing;transition:none}
.wvq-row.dragging .wvq-handle{cursor:grabbing;opacity:1;color:var(--text)}
#wv-queue-panel.is-dragging .wvq-row:not(.dragging){pointer-events:none}
.wvq-row.swiping{transition:none}
.wvq-row.snap{transition:transform .2s var(--ease)}
.wvq-row.gone{transition:transform .2s var(--ease),opacity .2s;opacity:0}
.wvq-swipe-bg{position:absolute;inset:0;border-radius:10px;background:var(--red,#e5484d);display:flex;align-items:center;justify-content:flex-end;padding-right:18px;color:#fff;font-size:12.5px;font-weight:800;z-index:-1}
.wvq-save{padding:12px 14px;border-bottom:1px solid var(--hair);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.wvq-save[hidden]{display:none}
.wvq-save input{flex:1;min-width:0;height:38px;padding:0 12px;border-radius:8px;border:1px solid var(--hair-strong,var(--border));background:var(--surface);color:var(--text);font:inherit;font-size:14px}
.wvq-save input:focus{outline:2px solid var(--brand);outline-offset:-1px}
.wvq-save .wvq-btn{min-height:38px;padding:0 14px}
.wvq-snack{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 14px;border-radius:10px;background:var(--text);color:var(--page-bg-base);font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:translateY(140%);opacity:0;transition:transform .22s var(--ease),opacity .18s;pointer-events:none;z-index:5}
.wvq-snack.show{transform:none;opacity:1;pointer-events:auto}
.wvq-snack span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvq-snack button{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;padding:6px 10px;border-radius:6px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
@media (hover:none){.wvq-x{opacity:.8}.wvq-handle{opacity:.8}}
@media (max-width:768px){
  #wv-queue-panel{left:0;right:0;bottom:0;width:auto;max-height:min(82vh,calc(100% - 48px));max-height:min(82dvh,calc(100% - 48px));border-radius:18px 18px 0 0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(100%);transform-origin:bottom center;transition:transform .3s var(--ease),opacity .2s,visibility 0s linear .3s}
  #wv-queue-panel.open{transform:none;transition:transform .3s var(--ease),opacity .2s,visibility 0s}
  .wv-queue-grab{display:block;width:40px;height:5px;border-radius:3px;background:var(--hair-strong,var(--text-4));margin:8px auto 0;flex-shrink:0}
  #wv-queue-panel .wv-queue-head{padding-top:8px}
  .wvq-row{min-height:56px}
  .wvq-hbtn{width:40px;height:40px}
}
@media (prefers-reduced-motion:reduce){#wv-queue-panel,#wv-queue-panel.open,.wvq-row.snap,.wvq-row.gone,.wvq-snack{transition:none}#wv-queue-panel.is-playing .wvq-eq i{animation:none;height:70%}}
`;
  document.head.appendChild(st);
}

function toggleQueuePanel(force) {
  const qp = document.getElementById('wv-queue-panel');
  if (!qp) return;
  const open = typeof force === 'boolean' ? force : !qp.classList.contains('open');
  qp.classList.toggle('open', open);
  document.querySelectorAll('#player-queue-btn, #pfs-queue-btn').forEach(b => { b.classList.toggle(b.id === 'pfs-queue-btn' ? 'on' : 'player-icon-active', open); b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  if (open) {
    _renderQueuePanel();
    const list = document.getElementById('wv-queue-list');
    const now = list && list.querySelector('.wvq-nowcard');
    if (list && now) list.scrollTop = Math.max(0, now.offsetTop - 40);
    if (!qp.contains(document.activeElement)) { qp.tabIndex = -1; try { qp.focus({ preventScroll: true }); } catch (_) {} }
  } else {
    const sv = document.getElementById('wvq-save'); if (sv) { sv.hidden = true; sv.innerHTML = ''; }
  }
}

function clearPlayerQueue() {
  _pq = [];
  _pqIdx = -1;
  _setOnChange(null);
  _shuffleBag = [];
  _shuffleStarted = false;
  _renderQueuePanel();
  _saveQueue();
}

// Drop everything after the playing track (earlier tracks stay so Previous
// still works). Undo puts them back.
window.clearUpcomingQueue = function () {
  if (_pqIdx < 0) { if (!_pq.length) return; const all = _pq.slice(); clearPlayerQueue(); _qOfferUndo('cleared the queue', () => { _pq = all; _pqIdx = -1; _renderQueuePanel(); _saveQueue(); }); return; }
  const cut = _pq.slice(_pqIdx + 1);
  if (!cut.length) { if (typeof wvToast === 'function') wvToast('nothing up next to clear'); return; }
  _pq = _pq.slice(0, _pqIdx + 1);
  _shuffleBag = []; _shuffleStarted = false;
  _renderQueuePanel(); _saveQueue();
  const at = _pqIdx;
  _qOfferUndo('cleared ' + cut.length + ' track' + (cut.length === 1 ? '' : 's'), () => {
    _pq = _pq.concat(cut);
    _renderQueuePanel(); _saveQueue();
  });
};

function removeQueueItem(i) {
  if (i < 0 || i >= _pq.length) return;
  _shuffleBag = [];
  const [t] = _pq.splice(i, 1);
  const wasIdx = _pqIdx;
  if (i < _pqIdx) _pqIdx--;
  else if (i === _pqIdx) _pqIdx = Math.min(_pqIdx, _pq.length - 1);
  _renderQueuePanel();
  _saveQueue();
  _qOfferUndo('removed ' + (t && t.title ? '“' + t.title + '”' : 'track'), () => {
    const at = Math.min(i, _pq.length);
    _pq.splice(at, 0, t);
    if (i < wasIdx || (i === wasIdx && at <= _pqIdx)) _pqIdx++;
    _shuffleBag = [];
    _renderQueuePanel(); _saveQueue();
  });
}

function _qOfferUndo(msg, undo) {
  const sn = document.getElementById('wvq-snack');
  _qUndo = undo;
  clearTimeout(_qSnackTimer);
  if (!sn) return;
  sn.innerHTML = '<span>' + _esc(msg) + '</span><button type="button" data-act="undo">Undo</button>';
  sn.classList.add('show');
  _qSnackTimer = setTimeout(() => { sn.classList.remove('show'); _qUndo = null; }, 5000);
}

function _renderQueuePanel() {
  if (typeof window._wvRenderNP === 'function') { try { window._wvRenderNP(); } catch (_) {} }
  try { document.dispatchEvent(new CustomEvent('wv-queue-change')); } catch (_) {}
  const list = document.getElementById('wv-queue-list');
  const count = document.getElementById('wv-queue-count');
  if (!list) return;
  const qp = document.getElementById('wv-queue-panel');
  if (qp) qp.classList.toggle('is-playing', !!(audio && !audio.paused));
  const apOn = !_autoplayOff();
  const idx = _pqIdx;
  const now = idx >= 0 ? _pq[idx] : (currentTrack && !_pq.length ? currentTrack : null);
  const upcoming = [];
  for (let i = idx + 1; i < _pq.length; i++) upcoming.push(i);
  const nextIdx = upcoming.filter(i => !(_pq[i] && _pq[i]._autoplay));
  const apIdx = upcoming.filter(i => _pq[i] && _pq[i]._autoplay);
  if (count) count.textContent = upcoming.length ? upcoming.length + ' up next' : '';

  if (!now && !_pq.length) {
    list.innerHTML = '<div class="wvq-empty"><div class="wvq-empty-ic">' + _qIcon('note') + '</div><b>your queue is empty</b>' +
      '<p>play a comp or a playlist, or let autoplay pick edits for you</p>' +
      '<div class="wvq-btns"><button type="button" class="wvq-btn primary" data-act="start-ap">' + _qIcon('spark') + 'Start autoplay</button>' +
      '<button type="button" class="wvq-btn" data-act="charts">' + _qIcon('chart') + 'Open charts</button></div></div>';
    return;
  }

  let h = '';
  if (idx > 0) {
    h += '<button type="button" class="wvq-past" data-act="past" aria-expanded="' + (_qPastOpen ? 'true' : 'false') + '">' + _qIcon('chev') + 'Played · ' + idx + '</button>';
    if (_qPastOpen) for (let i = 0; i < idx; i++) h += _qRow(_pq[i], i, 'past-row');
  }
  if (now) {
    const ctx = now._album_title ? 'from ' + now._album_title : (now._autoplay ? 'autoplay' : '');
    h += '<div class="wvq-label">Now playing</div>' +
      '<div class="wvq-nowcard" data-act="open-fs" role="button" tabindex="0" aria-label="Open the full player">' + _qCover(now, 160) +
      '<span class="wvq-meta"><span class="wvq-t">' + _esc(now.title || 'Untitled') + '</span><span class="wvq-a">' + _esc(_qArtist(now)) + '</span>' +
      (ctx ? '<span class="wvq-ctx">' + _esc(ctx) + '</span>' : '') + '</span>' +
      '<span class="wvq-eq" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  }
  if (nextIdx.length) {
    h += '<div class="wvq-label">Next up' + (_shuffle ? '<span class="wvq-note">' + _qIcon('shuffle') + 'shuffle picks the order</span>' : '') + '</div>';
    nextIdx.forEach(i => { h += _qRow(_pq[i], i, 'next'); });
  } else if (now) {
    h += '<div class="wvq-empty small"><b>nothing up next</b><p>add tracks with “play next” or “add to queue”' + (apOn ? '...autoplay keeps it going' : '') + '</p>' +
      (apOn && !apIdx.length ? '<div class="wvq-btns"><button type="button" class="wvq-btn" data-act="more-ap">' + _qIcon('spark') + 'Line up more edits</button></div>' : '') + '</div>';
  }
  h += '<div class="wvq-ap"><span class="wvq-ap-ic">' + _qIcon('spark') + '</span><span class="wvq-ap-t"><b>Autoplay' + (apOn && apIdx.length ? ' · more edits' : '') + '</b><span>' +
    (apOn ? 'when your queue ends, similar edits keep playing' : 'playback stops when your queue ends') + '</span></span>' +
    '<button type="button" class="wvq-sw" role="switch" data-act="ap-toggle" aria-checked="' + (apOn ? 'true' : 'false') + '" aria-label="Autoplay"></button></div>';
  if (apOn) apIdx.forEach(i => { h += _qRow(_pq[i], i, 'ap'); });
  h += '<div class="wvq-line" aria-hidden="true"></div>';
  list.innerHTML = h;
}

function _qSyncPlaying() {
  const qp = document.getElementById('wv-queue-panel');
  if (qp) qp.classList.toggle('is-playing', !!(audio && !audio.paused));
}

// Save the queue as a playlist (the two playlist endpoints that already exist).
window.wvQueueSavePrompt = function () {
  const box = document.getElementById('wvq-save');
  if (!box) return;
  if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
  const ids = [];
  _pq.forEach(t => { if (t && t.id && ids.indexOf(t.id) < 0) ids.push(t.id); });
  if (!ids.length && currentTrack && currentTrack.id) ids.push(currentTrack.id);
  if (!ids.length) { if (typeof wvToast === 'function') wvToast('nothing in the queue to save'); return; }
  if (!localStorage.getItem('token')) {
    if (typeof wvToast === 'function') wvToast('log in to save playlists', null, 4000, { onClick: () => location.assign('/login?next=' + encodeURIComponent(location.pathname + location.search)), title: 'log in to save playlists', action: 'Log in' });
    return;
  }
  let d = '';
  try { d = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase(); } catch (_) {}
  box.innerHTML = '<input id="wvq-save-name" maxlength="120" aria-label="Playlist name" value="' + _esc('queue' + (d ? ' · ' + d : '')) + '">' +
    '<button type="button" class="wvq-btn primary" data-act="save-go">Save ' + ids.length + '</button>' +
    '<button type="button" class="wvq-btn" data-act="save-cancel">Cancel</button>';
  box.hidden = false;
  const inp = document.getElementById('wvq-save-name');
  if (inp) { inp.focus(); inp.select(); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); _qSave(); } else if (e.key === 'Escape') { e.stopPropagation(); box.hidden = true; box.innerHTML = ''; } }; }
};
async function _qSave() {
  const box = document.getElementById('wvq-save');
  const inp = document.getElementById('wvq-save-name');
  const btn = box && box.querySelector('[data-act="save-go"]');
  const title = inp ? inp.value.trim() : '';
  if (!title) { if (inp) inp.focus(); return; }
  const ids = [];
  _pq.forEach(t => { if (t && t.id && ids.indexOf(t.id) < 0) ids.push(t.id); });
  if (!ids.length && currentTrack && currentTrack.id) ids.push(currentTrack.id);
  const tok = localStorage.getItem('token');
  const hdr = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok };
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const r = await fetch(API_BASE + '/playlists', { method: 'POST', headers: hdr, body: JSON.stringify({ title }) });
    const pl = await r.json().catch(() => ({}));
    if (!r.ok || !pl || !pl.id) throw new Error((pl && pl.error) || 'couldnt make the playlist');
    const r2 = await fetch(API_BASE + '/playlists/' + encodeURIComponent(pl.id) + '/tracks', { method: 'POST', headers: hdr, body: JSON.stringify({ track_ids: ids }) });
    if (!r2.ok) { const e2 = await r2.json().catch(() => ({})); throw new Error(e2.error || 'the playlist was made but the tracks didnt save'); }
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (typeof window.refreshSidebarLibrary === 'function') { try { window.refreshSidebarLibrary(); } catch (_) {} }
    const open = () => { toggleQueuePanel(false); closeFullPlayer(); if (typeof navigate === 'function') navigate('/playlist?id=' + pl.id); else location.assign('/playlist?id=' + pl.id); };
    if (typeof wvToast === 'function') wvToast('saved', null, 5000, { title: 'saved “' + title + '”', body: ids.length + ' track' + (ids.length === 1 ? '' : 's'), action: 'Open', onClick: open });
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Save ' + ids.length; }
    if (typeof wvToast === 'function') wvToast(String((e && e.message) || 'couldnt save the playlist'), 'error');
  }
}

// Keep a dragged item's autoplay tag in step with where it lands, so the
// sections stay contiguous.
function _qRetag(to) {
  const t = _pq[to]; if (!t) return;
  const prev = to - 1 > _pqIdx ? _pq[to - 1] : null;
  const next = _pq[to + 1];
  if (prev && prev._autoplay) t._autoplay = true;
  else if (!prev && next && next._autoplay && t._autoplay) t._autoplay = true;
  else delete t._autoplay;
}

function _wireQueuePanel(qp) {
  const list = qp.querySelector('#wv-queue-list');
  qp.addEventListener('click', e => {
    const act = e.target.closest && e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'undo') { const u = _qUndo; _qUndo = null; clearTimeout(_qSnackTimer); const sn = document.getElementById('wvq-snack'); if (sn) sn.classList.remove('show'); if (u) u(); return; }
      if (a === 'save-go') return _qSave();
      if (a === 'save-cancel') { const b = document.getElementById('wvq-save'); if (b) { b.hidden = true; b.innerHTML = ''; } return; }
      if (a === 'past') { _qPastOpen = !_qPastOpen; _renderQueuePanel(); return; }
      if (a === 'ap-toggle') { window.setAutoplayEnabled(_autoplayOff()); return; }
      if (a === 'more-ap') { act.disabled = true; act.textContent = 'Finding edits…'; _extendAutoplayQueue().then(ok => { if (!ok) { _renderQueuePanel(); if (typeof wvToast === 'function') wvToast('couldnt find more edits right now'); } }); return; }
      if (a === 'start-ap') { try { localStorage.removeItem('wv_autoplay_off'); } catch (_) {} act.disabled = true; act.textContent = 'Finding an edit…'; _autoplayNext(); return; }
      if (a === 'charts') { toggleQueuePanel(false); closeFullPlayer(); if (typeof navigate === 'function') navigate('/charts'); else location.assign('/charts'); return; }
      if (a === 'open-fs') { toggleQueuePanel(false); openFullPlayer(); return; }
    }
    if (Date.now() < _qSuppressClick) return;
    const rm = e.target.closest && e.target.closest('[data-rm]');
    if (rm) { e.stopPropagation(); removeQueueItem(+rm.dataset.rm); return; }
    const row = e.target.closest && e.target.closest('.wvq-row[data-i]');
    if (row && !e.target.closest('.wvq-handle')) window.playQueueIndex(+row.dataset.i);
  });
  qp.addEventListener('keydown', e => {
    const row = e.target.closest && e.target.closest('.wvq-row[data-i], .wvq-nowcard');
    if (!row || e.target !== row) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); return; }
    const i = +row.dataset.i;
    if (row.classList.contains('wvq-nowcard') || isNaN(i)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); removeQueueItem(i); _qFocusRow(Math.min(i, _pq.length - 1)); return; }
    // Alt+Up/Down moves a track within what is up next.
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault(); e.stopPropagation();
      const to = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (to <= _pqIdx || to >= _pq.length) return;
      window.moveQueueItem(i, to); _qRetag(to); _renderQueuePanel(); _saveQueue(); _qFocusRow(to);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const rows = Array.prototype.slice.call(list.querySelectorAll('.wvq-row[data-i], .wvq-nowcard'));
      const k = rows.indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1);
      if (rows[k]) rows[k].focus();
    }
  });
  function _qFocusRow(i) { const r = list.querySelector('.wvq-row[data-i="' + i + '"]'); if (r) try { r.focus({ preventScroll: false }); } catch (_) {} }

  // Drag to reorder: grab the handle; an insertion line shows where it lands.
  let drag = null;
  list.addEventListener('pointerdown', e => {
    const hd = e.target.closest && e.target.closest('.wvq-handle');
    if (!hd || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const row = hd.closest('.wvq-row');
    if (!row) return;
    e.preventDefault();
    const from = +row.dataset.i;
    const rows = Array.prototype.slice.call(list.querySelectorAll('.wvq-row.wvq-next, .wvq-row.wvq-ap')).filter(r => r !== row);
    drag = { row, from, rows, y0: e.clientY, s0: list.scrollTop, y: e.clientY, target: null, raf: 0, id: e.pointerId, line: list.querySelector('.wvq-line') };
    try { hd.setPointerCapture(e.pointerId); } catch (_) {}
    row.classList.add('dragging');
    qp.classList.add('is-dragging');
    const loop = () => {
      if (!drag) return;
      const r = list.getBoundingClientRect();
      const edge = 44;
      if (drag.y < r.top + edge) list.scrollTop -= Math.ceil((r.top + edge - drag.y) / 4);
      else if (drag.y > r.bottom - edge) list.scrollTop += Math.ceil((drag.y - (r.bottom - edge)) / 4);
      _qDragMove();
      drag.raf = requestAnimationFrame(loop);
    };
    drag.raf = requestAnimationFrame(loop);
  });
  function _qDragMove() {
    if (!drag) return;
    const dy = drag.y - drag.y0 + (list.scrollTop - drag.s0);
    drag.row.style.transform = 'translateY(' + dy + 'px)';
    const lr = list.getBoundingClientRect();
    let before = null;
    for (const r of drag.rows) { const b = r.getBoundingClientRect(); if (drag.y < b.top + b.height / 2) { before = r; break; } }
    drag.target = before;
    if (!drag.line) return;
    const ref = before || drag.rows[drag.rows.length - 1];
    if (!ref) { drag.line.style.display = 'none'; return; }
    const rb = ref.getBoundingClientRect();
    const top = (before ? rb.top - 2 : rb.bottom + 1) - lr.top + list.scrollTop;
    drag.line.style.display = 'block';
    drag.line.style.top = top + 'px';
  }
  list.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { drag.y = e.clientY; } });
  const endDrag = (e, cancel) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    cancelAnimationFrame(d.raf);
    qp.classList.remove('is-dragging');
    d.row.classList.remove('dragging');
    d.row.style.transform = '';
    if (d.line) d.line.style.display = 'none';
    _qSuppressClick = Date.now() + 250;
    if (cancel) return;
    let to;
    if (d.target) { const j = +d.target.dataset.i; to = j > d.from ? j - 1 : j; }
    else { const last = d.rows[d.rows.length - 1]; if (!last) return; const j = +last.dataset.i; to = j > d.from ? j : j + 1; }
    to = Math.max(_pqIdx + 1, Math.min(_pq.length - 1, to));
    if (to === d.from) { _qRetag(to); _renderQueuePanel(); return; }
    window.moveQueueItem(d.from, to);
    _qRetag(to);
    _renderQueuePanel(); _saveQueue();
  };
  list.addEventListener('pointerup', e => endDrag(e, false));
  list.addEventListener('pointercancel', e => endDrag(e, true));
  list.addEventListener('lostpointercapture', e => { if (drag && e.pointerId === drag.id) endDrag(e, false); });

  // Swipe left to remove (touch and pen only; the mouse has the × button).
  let sw = null;
  list.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || drag) return;
    if (e.target.closest && e.target.closest('.wvq-handle, button')) return;
    const row = e.target.closest && e.target.closest('.wvq-row.wvq-next, .wvq-row.wvq-ap, .wvq-row.wvq-past-row');
    if (!row) return;
    sw = { row, x0: e.clientX, y0: e.clientY, dx: 0, on: false, id: e.pointerId };
  });
  list.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
    if (!sw.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        sw.on = true;
        try { sw.row.setPointerCapture(e.pointerId); } catch (_) {}
        sw.row.classList.add('swiping');
        const bg = document.createElement('span'); bg.className = 'wvq-swipe-bg'; bg.textContent = 'Remove';
        sw.bg = bg; sw.row.appendChild(bg);
        sw.row.style.zIndex = '1';
      } else return;
    }
    sw.dx = Math.min(0, dx);
    sw.row.style.transform = 'translateX(' + sw.dx + 'px)';
    if (sw.bg) sw.bg.style.transform = 'translateX(' + (-sw.dx) + 'px)';
  });
  const endSwipe = (e, cancel) => {
    if (!sw || (e && e.pointerId !== sw.id)) return;
    const s = sw; sw = null;
    if (!s.on) return;
    _qSuppressClick = Date.now() + 300;
    s.row.classList.remove('swiping');
    const w = s.row.getBoundingClientRect().width || 300;
    if (!cancel && s.dx < -Math.min(110, w * 0.32)) {
      s.row.classList.add('gone');
      s.row.style.transform = 'translateX(-' + w + 'px)';
      if (s.bg) s.bg.style.transform = 'translateX(' + w + 'px)';
      setTimeout(() => removeQueueItem(+s.row.dataset.i), 180);
    } else {
      s.row.classList.add('snap');
      s.row.style.transform = '';
      if (s.bg) s.bg.style.transform = '';
      setTimeout(() => { s.row.classList.remove('snap'); s.row.style.zIndex = ''; if (s.bg) s.bg.remove(); }, 220);
    }
  };
  list.addEventListener('pointerup', e => endSwipe(e, false));
  list.addEventListener('pointercancel', e => endSwipe(e, true));
}

// Close the panel when clicking outside it (but not on the queue buttons)
document.addEventListener('click', function (e) {
  const qp = document.getElementById('wv-queue-panel');
  if (!qp || !qp.classList.contains('open')) return;
  // Clicking a row re-renders the list, detaching the clicked node before this
  // bubbled handler runs — a detached target means the click was inside the panel.
  if (!e.target.isConnected) return;
  if (qp.contains(e.target)) return;
  const btn = e.target.closest && e.target.closest('#player-queue-btn, #pfs-queue-btn');
  if (btn) return;
  // Toasts (undo, "saved · open") and sheets sit outside the panel on purpose.
  if (e.target.closest && e.target.closest('.wv-toast, #wv-toasts, .wv-sheet, .wv-sheet-overlay')) return;
  toggleQueuePanel(false);
});

let _shuffle = (function () { try { return localStorage.getItem('wv_shuffle') === '1'; } catch (_) { return false; } })();
let _repeat = (function () { try { const v = localStorage.getItem('wv_repeat'); return v === 'one' || v === 'all' ? v : 'off'; } catch (_) { return 'off'; } })();
let _muted = false;
let _shuffleBag = [];

function _syncModeButtons() {
  [document.getElementById('player-shuffle-btn'), document.getElementById('pfs-shuffle')].forEach(b => {
    if (!b) return;
    b.classList.toggle('player-icon-active', _shuffle);
    b.setAttribute('aria-pressed', _shuffle ? 'true' : 'false');
    b.title = _shuffle ? 'Shuffle on' : 'Shuffle';
  });
  [document.getElementById('player-repeat-btn'), document.getElementById('pfs-repeat')].forEach(b => {
    if (!b) return;
    b.classList.toggle('player-icon-active', _repeat !== 'off');
    b.setAttribute('aria-pressed', _repeat !== 'off' ? 'true' : 'false');
    b.title = _repeat === 'one' ? 'Repeat this track' : _repeat === 'all' ? 'Repeat queue' : 'Repeat';
    let dot = b.querySelector('.player-repeat-one');
    if (_repeat === 'one' && !dot) {
      dot = document.createElement('span');
      dot.className = 'player-repeat-one';
      dot.textContent = '1';
      b.appendChild(dot);
    } else if (_repeat !== 'one' && dot) dot.remove();
  });
  const mb = document.getElementById('player-mute-btn');
  if (mb) {
    mb.classList.toggle('player-icon-active', _muted);
    mb.title = _muted ? 'Unmute (m)' : 'Mute (m)';
    mb.innerHTML = _muted
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.6-2.6-1.4-1.4L15.2 10.6 12.6 8l-1.4 1.4 2.6 2.6-2.6 2.6 1.4 1.4 2.6-2.6 2.6 2.6 1.4-1.4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  }
}

function toggleShuffle() {
  _shuffle = !_shuffle;
  try { localStorage.setItem('wv_shuffle', _shuffle ? '1' : '0'); } catch (_) {}
  _shuffleBag = [];
  _shuffleStarted = false;
  _syncModeButtons();
  _renderQueuePanel();
  if (typeof wvToast === 'function') wvToast(_shuffle ? 'Shuffle on' : 'Shuffle off');
}

function toggleRepeat() {
  _repeat = _repeat === 'off' ? 'all' : _repeat === 'all' ? 'one' : 'off';
  try { localStorage.setItem('wv_repeat', _repeat); } catch (_) {}
  if (audio) audio.loop = _repeat === 'one';
  _syncModeButtons();
  if (typeof wvToast === 'function') wvToast(_repeat === 'one' ? 'Repeating this track' : _repeat === 'all' ? 'Repeating the queue' : 'Repeat off');
}

function toggleMute() {
  if (!audio) return;
  _muted = !_muted;
  audio.muted = _muted;
  try { localStorage.setItem('wv_muted', _muted ? '1' : '0'); } catch (_) {}
  _syncModeButtons();
}

function setVolume(v) {
  const val = Math.max(0, Math.min(1, Number(v)));
  if (audio) { audio.volume = val; if (val > 0 && _muted) { _muted = false; audio.muted = false; } }
  try { localStorage.setItem('wv_volume', String(val)); } catch (_) {}
  ['volume-slider', 'pfs-volume'].forEach(id => { const el = document.getElementById(id); if (el && el.value !== String(val)) el.value = String(val); });
  _syncModeButtons();
}

// Shuffle draws without replacement, so a pass plays every queued track once
// before anything repeats. An empty bag means the pass is over: wrap only when
// repeat-all is on, otherwise fall through to autoplay.
let _shuffleStarted = false;
function _refillShuffleBag() {
  const fresh = [];
  for (let i = 0; i < _pq.length; i++) if (i !== _pqIdx) fresh.push(i);
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  _shuffleBag = fresh;
}
function _nextQueueIndex() {
  if (!_pq.length) return -1;
  if (!_shuffle) return _pqIdx < _pq.length - 1 ? _pqIdx + 1 : (_repeat === 'all' ? 0 : -1);
  _shuffleBag = _shuffleBag.filter(i => i >= 0 && i < _pq.length && i !== _pqIdx);
  if (!_shuffleBag.length) {
    if (_shuffleStarted && _repeat !== 'all') { _shuffleStarted = false; return -1; }
    _refillShuffleBag();
    if (!_shuffleBag.length) return _repeat === 'all' ? _pqIdx : -1;
  }
  _shuffleStarted = true;
  return _shuffleBag.shift();
}

function skipPrev() {
  if (_radio) return;
  if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (_pq.length && _pqIdx >= 0) {
    if (_pqIdx > 0) window.playQueueIndex(_pqIdx - 1);
    else if (_repeat === 'all') window.playQueueIndex(_pq.length - 1);
    else if (audio) audio.currentTime = 0;
    return;
  }
  document.dispatchEvent(new CustomEvent('playerSkipPrev'));
}

function skipNext() {
  if (_radio) return;
  if (_pq.length && _pqIdx >= 0) {
    const nxt = _nextQueueIndex();
    if (nxt >= 0) window.playQueueIndex(nxt);
    else _continueAfterQueue();
    return;
  }
  const before = _autoplayTicket;
  document.dispatchEvent(new CustomEvent('playerSkipNext'));
  setTimeout(() => { if (_autoplayTicket === before && (!currentTrack || audio.paused)) window.skipNextOrAutoplay(); }, 400);
}

function openFullPlayer(withLyrics) {
  if (_radio && _radio.lp) {
    if (typeof navigate === 'function') return navigate('/lp?id=' + encodeURIComponent(_radio.slug));
    location.assign('/lp?id=' + encodeURIComponent(_radio.slug)); return;
  }
  if (_radio && _radio.slug) {
    if (typeof window.openStation === 'function' && /\/radio\.html$/.test(location.pathname)) return window.openStation(_radio.slug);
    if (typeof navigate === 'function') return navigate('/radio?s=' + encodeURIComponent(_radio.slug));
    location.assign('/radio?s=' + encodeURIComponent(_radio.slug)); return;
  }
  const fs = document.getElementById('player-fullscreen');
  if (!fs) return;
  fs.classList.add('open'); document.body.style.overflow = 'hidden';
  fs.className = fs.className.replace(/theme-\w+/g, '') + ' ' + (document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dark');
  _paintFsWash();
  if (withLyrics === true && !_lyr.open && typeof toggleLyricsView === 'function') toggleLyricsView();
  else if (_lyr.open && audio) { _lyr.idx = -2; _syncLyrics(audio.currentTime); }
  document.dispatchEvent(new CustomEvent('wv-fullplayer', { detail: { open: true } }));
}
function _paintFsWash() {
  const fs = document.getElementById('player-fullscreen');
  if (!fs || !currentTrack) return;
  const seed = currentTrack.title || '';
  const apply = (c, fromImage) => {
    const light = document.body.classList.contains('theme-light');
    // No real pixels (no cover, or it could not be read): keep the site's
    // own colours rather than paint a hue guessed from the title.
    if (fromImage === false) { ['--wv-wash', '--fs-accent', '--fs-accent-soft'].forEach(v => fs.style.removeProperty(v)); return; }
    fs.style.setProperty('--wv-wash', light ? 'hsl(' + c.h1 + ',' + Math.min(60, c.s1) + '%,82%)' : 'hsl(' + c.h1 + ',' + Math.min(55, c.s1) + '%,26%)');
    // The player's accent follows the cover too: a vivid, readable tint of
    // the dominant hue (kept saturated and bright enough to sit on the wash).
    const sat = Math.max(55, Math.min(85, c.s1 + 15));
    fs.style.setProperty('--fs-accent', light ? 'hsl(' + c.h1 + ',' + sat + '%,38%)' : 'hsl(' + c.h1 + ',' + sat + '%,68%)');
    fs.style.setProperty('--fs-accent-soft', light ? 'hsla(' + c.h1 + ',' + sat + '%,38%,.14)' : 'hsla(' + c.h1 + ',' + sat + '%,68%,.16)');
  };
  if (currentTrack.cover_url && typeof extractCoverHues === 'function') extractCoverHues(currentTrack.cover_url, seed, apply);
  else apply(null, false);
}

function closeFullPlayer() {
  const fs = document.getElementById('player-fullscreen');
  if (fs) { fs.classList.remove('open'); document.body.style.overflow = ''; }
  // The lyric highlighter has nothing to draw while the player is closed.
  if (_lyrTimer) { clearTimeout(_lyrTimer); _lyrTimer = 0; }
  document.dispatchEvent(new CustomEvent('wv-fullplayer', { detail: { open: false } }));
}
function _fsIsOpen() { const f = document.getElementById('player-fullscreen'); return !!(f && f.classList.contains('open')); }

function initPlayer() {
  if (window._playerInited) return;
  window._playerInited = true;
  injectPlayer();

  audio = new Audio();
  let _vol = 1;
  try { const v = parseFloat(localStorage.getItem('wv_volume')); if (!isNaN(v)) _vol = Math.max(0, Math.min(1, v)); } catch (_) {}
  audio.volume = _vol;
  try { _muted = localStorage.getItem('wv_muted') === '1'; } catch (_) {}
  audio.muted = _muted;
  audio.loop = _repeat === 'one';
  audio.preload = 'auto';
  _syncModeButtons();
  ['volume-slider', 'pfs-volume'].forEach(id => { const el = document.getElementById(id); if (el) el.value = String(_vol); });
  _applyRate();
  // Esc closes the top-most thing: a sheet, then the queue, then the full player.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.wv-sheet')) { _closeSheet(); return; }
    const q = document.getElementById('wv-queue-panel');
    if (q && q.classList.contains('open')) { toggleQueuePanel(false); const b = document.getElementById(_fsIsOpen() ? 'pfs-queue-btn' : 'player-queue-btn'); if (b) try { b.focus({ preventScroll: true }); } catch (_) {} return; }
    if (_fsIsOpen()) closeFullPlayer();
  });

  document.addEventListener('touchstart', _unlockIOS, { once: true, passive: true });

  // Resume after the host app paused us in the background (see _wantPlaying).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !_wantPlaying || !audio || !audio.paused || !audio.src || audio.ended) return;
    audio.play().catch(() => {});
  });
  _renderInAppHint();

  // Save playback state before navigating away
  window.addEventListener('pagehide', () => {
    if (audio && currentTrack && audio.src) {
      currentTrack._savedTime = audio.currentTime;
      currentTrack._wasPlaying = !audio.paused;
      localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));
    }
  });

  // Restore saved track UI on page load (always paused — never auto-play)
  const saved = localStorage.getItem(PLAYER_KEY);
  if (saved) {
    try {
      const t = JSON.parse(saved);
      // Clear the wasPlaying flag so it never auto-resumes
      delete t._wasPlaying;
      currentTrack = t;
      _renderAll(t);
      document.getElementById('player')?.classList.remove('hidden');
      if (t.ia_url) {
        audio.src = t.ia_url;
        if (t._savedTime && t._savedTime > 1) {
          _restoreCanplayFn = () => {
            audio.currentTime = t._savedTime;
            _restoreCanplayFn = null;
          };
          audio.addEventListener('canplay', _restoreCanplayFn, { once: true });
        }
        audio.load();
        // Stay paused — user must press play
      }
      localStorage.setItem(PLAYER_KEY, JSON.stringify(t));
    } catch (_) {}
  }

  // Progress bars: click, drag and keyboard. Dragging previews the position
  // and only seeks on release, so scrubbing does not thrash the stream.
  ['progress-bar', 'pfs-progress-bar'].forEach(id => {
    const bar = document.getElementById(id);
    if (!bar) return;
    let dragging = false;
    const ratioAt = clientX => {
      const rect = bar.getBoundingClientRect();
      if (!rect.width) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };
    const preview = r => {
      const pct = (r * 100) + '%';
      bar.style.setProperty('--pct', pct);
      const fill = bar.querySelector('.progress-fill, .pfs-fill, [id$="-fill"]');
      if (fill) fill.style.width = pct;
      const label = document.getElementById(id === 'progress-bar' ? 'time-elapsed' : 'pfs-elapsed');
      if (label && audio.duration) label.textContent = fmtTime(r * audio.duration);
    };
    const commit = r => { if (audio.duration && !_radio) audio.currentTime = r * audio.duration; };
    bar.addEventListener('pointerdown', e => {
      if (!audio.duration || _radio) return;
      dragging = true;
      bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
      preview(ratioAt(e.clientX));
      e.preventDefault();
    });
    bar.addEventListener('pointermove', e => { if (dragging) preview(ratioAt(e.clientX)); });
    const end = e => {
      if (!dragging) return;
      dragging = false;
      commit(ratioAt(e.clientX));
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', () => { dragging = false; _onTimeUpdate(); });
    bar.addEventListener('keydown', e => {
      if (!audio.duration || _radio) return;
      const step = e.shiftKey ? 30 : 5;
      if (e.key === 'ArrowRight') { audio.currentTime = Math.min(audio.duration, audio.currentTime + step); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - step); e.preventDefault(); }
      else if (e.key === 'Home') { audio.currentTime = 0; e.preventDefault(); }
      else if (e.key === 'End') { audio.currentTime = audio.duration; e.preventDefault(); }
    });
  });

  ['volume-slider', 'pfs-volume'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => setVolume(e.target.value));
  });

  // Mini bar gestures: swipe sideways to skip, swipe up to open full screen.
  (function () {
    var mini = document.getElementById('player-mini');
    if (!mini) return;
    var x0 = 0, y0 = 0, t0 = 0, moved = false;
    mini.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); moved = false;
    }, { passive: true });
    mini.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - x0;
      var dy = e.touches[0].clientY - y0;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) < 140) {
        mini.style.transform = 'translateX(' + (dx * 0.35) + 'px)';
        mini.style.opacity = String(1 - Math.min(0.4, Math.abs(dx) / 320));
      }
    }, { passive: true });
    var reset = function () { mini.style.transform = ''; mini.style.opacity = ''; };
    mini.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      reset();
      if (!t || !moved) return;
      var dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
      if (dt > 700) return;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        // A sideways flick is a skip, and it must not also count as a tap.
        e.preventDefault();
        if (dx < 0) skipNext(); else skipPrev();
      } else if (dy < -60 && Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault();
        openFullPlayer();
      }
    });
    mini.addEventListener('touchcancel', reset, { passive: true });
  })();

  // Bring the queue back after a reload or a login round-trip.
  try {
    const rawQ = localStorage.getItem(QUEUE_KEY);
    if (rawQ) {
      const q = JSON.parse(rawQ);
      if (q && Array.isArray(q.list) && q.list.length && Date.now() - (q.at || 0) < 7 * 24 * 3600 * 1000) {
        _pq = q.list;
        _pqIdx = typeof q.idx === 'number' ? q.idx : -1;
        _renderQueuePanel();
      }
    }
  } catch (_) {}

  audio.addEventListener('timeupdate', _onTimeUpdate);
  audio.addEventListener('loadedmetadata', _onTimeUpdate);
  // Speed and vibe survive track changes; live radio always runs at 1×.
  audio.addEventListener('loadedmetadata', () => {
    if (_radio) { try { audio.playbackRate = 1; audio.preservesPitch = true; } catch (_) {} return; }
    _applyRate();
  });
  audio.addEventListener('ended', () => {
    _setPlayBtns(false);
    if (_radio) { const lp = _radio.lp; setTimeout(() => _radioSync(!lp), lp ? 400 : 600); return; }
    // Sleep timer set to "end of this track": stop here, do not advance.
    if (_sleepEndOfTrack) { _sleepEndOfTrack = false; setSleepTimer(0); _wantPlaying = false; if (typeof wvToast === 'function') wvToast('sleep timer...paused at the end of the track'); document.dispatchEvent(new CustomEvent('trackEnded', { detail: currentTrack })); return; }
    // Auto-advance through the same picker as the Next button, so shuffle and
    // repeat-all behave the same whether a track is skipped or finishes.
    const inQueue = _pq.length && _pqIdx >= 0;
    const nxt = inQueue ? _nextQueueIndex() : -1;
    if (nxt < 0 && _autoplayOff()) _wantPlaying = false;
    document.dispatchEvent(new CustomEvent('trackEnded', { detail: currentTrack }));
    // Prefer the global queue; fall back to the legacy event for pages
    // (e.g. resources/tracker) that manage their own list.
    if (inQueue) {
      if (nxt >= 0) window.playQueueIndex(nxt);
      else _continueAfterQueue();
    } else {
      const before = _autoplayTicket;
      document.dispatchEvent(new CustomEvent('playerSkipNext'));
      // Nothing else picked up playback: keep the music going with another edit.
      setTimeout(() => { if (_autoplayTicket === before && audio.paused && audio.ended) window.skipNextOrAutoplay(); }, 900);
    }
  });
  audio.addEventListener('play', () => { _setPlayBtns(true); _lfmOnPlay(); if (_radio) _radioSync(false); _msState('playing'); });
  audio.addEventListener('timeupdate', _lfmOnTick);
  audio.addEventListener('pause', () => { _setPlayBtns(false); if (_baseTitle) document.title = _baseTitle; _msState('paused'); });
  audio.addEventListener('play', () => { if (currentTrack) _setTabTitle(currentTrack); });
  audio.addEventListener('waiting', () => { const b = document.getElementById('player-play-btn'); if (b) b.classList.add('player-buffering'); });
  audio.addEventListener('playing', () => { document.querySelectorAll('.player-buffering').forEach(b => b.classList.remove('player-buffering')); _audioFails = 0; });
  audio.addEventListener('canplay', () => { document.querySelectorAll('.player-buffering').forEach(b => b.classList.remove('player-buffering')); });
  audio.addEventListener('error', () => {
    document.querySelectorAll('.player-buffering').forEach(b => b.classList.remove('player-buffering'));
    if (!audio.src || audio.src === location.href || audio.src.indexOf('data:') === 0) return;
    console.error('Audio error:', audio.src);
    _audioFails++;
    const name = (currentTrack && currentTrack.title) || 'That track';
    if (typeof wvToast === 'function') wvToast(name + ' wont play...its file is missing', 'error');
    _setPlayBtns(false);
    // One dead link should not end the listening session, but a run of them
    // means something wider is wrong, so stop rather than skip the whole queue.
    if (_audioFails <= 3 && _wantPlaying) setTimeout(() => { if (audio.error) skipNext(); }, 900);
    else _wantPlaying = false;
  });
}

var _lastSaveAt = 0;
function _msState(v) { try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = v; } catch (_) {} }
// Pre-warm: in the last seconds of a track, start fetching the next one so
// the skip or natural advance starts without a gap.
var _warm = { url: null, el: null };
function _peekNextTrack() {
  if (!_pq.length || _pqIdx < 0 || _radio) return null;
  if (_repeat === 'one') return null;
  if (_shuffle) {
    const bag = _shuffleBag.filter(i => i >= 0 && i < _pq.length && i !== _pqIdx);
    return bag.length ? _pq[bag[0]] : null;
  }
  if (_pqIdx < _pq.length - 1) return _pq[_pqIdx + 1];
  return _repeat === 'all' ? _pq[0] : null;
}
window.wvPeekNext = _peekNextTrack;
function _prewarmTick() {
  if (!audio || audio.paused || !audio.duration || !isFinite(audio.duration)) return;
  if (audio.duration - audio.currentTime > 15) return;
  const n = _peekNextTrack();
  if (!n || !n.ia_url || n.ia_url === _warm.url || n.ia_url === audio.src) return;
  try {
    if (_warm.el) { _warm.el.removeAttribute('src'); _warm.el.load(); }
    const a = new Audio(); a.preload = 'auto'; a.muted = true; a.src = n.ia_url;
    _warm = { url: n.ia_url, el: a };
  } catch (_) {}
}
function _onTimeUpdate() {
  const pct = audio.duration ? (audio.currentTime / audio.duration * 100) + '%' : '0%';
  const el = document.getElementById('time-elapsed');
  const tot = document.getElementById('time-total');
  const fill = document.getElementById('progress-fill');
  const pfsFill = document.getElementById('pfs-fill');
  const miniFill = document.getElementById('player-mini-fill');
  const pfsEl = document.getElementById('pfs-elapsed');
  const pfsTot = document.getElementById('pfs-total');
  if (fill) fill.style.width = pct;
  if (pfsFill) pfsFill.style.width = pct;
  if (miniFill) miniFill.style.width = pct;
  if (el) el.textContent = fmtTime(audio.currentTime);
  if (tot) tot.textContent = fmtTime(audio.duration);
  if (pfsEl) pfsEl.textContent = fmtTime(audio.currentTime);
  if (pfsTot) pfsTot.textContent = fmtTime(audio.duration);
  if (typeof _syncLyrics === 'function') _syncLyrics(audio.currentTime);
  _playGateTick();
  // Update thumb position — CSS uses --pct on .progress-bar::after
  const pb = document.getElementById('progress-bar');
  const pfsPb = document.getElementById('pfs-progress-bar');
  if (pb) pb.style.setProperty('--pct', pct);
  if (pfsPb) pfsPb.style.setProperty('--pct', pct);
  if (currentTrack) {
    currentTrack._savedTime = audio.currentTime;
    // pagehide writes the exact spot; this is the crash-safe copy, so every
    // few seconds is plenty.
    const now = Date.now();
    if (now - _lastSaveAt > 3000) { _lastSaveAt = now; try { localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack)); } catch (_) {} }
  }
  _prewarmTick();
  if ('mediaSession' in navigator && audio.duration && !_radio) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch (_) {}
  }
}

// Register a stream, debounced per track so re-renders / quick replays of the
// same track don't double-count. Fire-and-forget; failures are silent.
// Comps run long. Remember which track of a comp was last playing so opening
// it again picks up where the listener stopped.
const RESUME_KEY = 'wv_comp_resume';
function _readResume() {
  try { return JSON.parse(localStorage.getItem(RESUME_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function _rememberComp(track) {
  var albumId = track && (track._album_id || track.album_id);
  if (!albumId || !track.id) return;
  try {
    var all = _readResume();
    all[albumId] = { track_id: track.id, at: Date.now() };
    var keys = Object.keys(all);
    if (keys.length > 60) {
      keys.sort(function (a, b) { return (all[a].at || 0) - (all[b].at || 0); });
      keys.slice(0, keys.length - 60).forEach(function (k) { delete all[k]; });
    }
    localStorage.setItem(RESUME_KEY, JSON.stringify(all));
  } catch (_) {}
}
// A running count of what this browser plays, so the site can say "your most
// played" without a server-side history table.
const TALLY_KEY = 'wv_play_tally';
function _tally(entry) {
  if (!entry || !entry.id) return;
  try {
    var all = JSON.parse(localStorage.getItem(TALLY_KEY) || '{}') || {};
    var prev = all[entry.id] || { n: 0 };
    // The same comp playing track after track is one listen, not twenty.
    if (prev.last && Date.now() - prev.last < 4 * 60 * 1000 && prev._type === entry._type) {
      prev.last = Date.now();
    } else {
      prev.n = (prev.n || 0) + 1;
      prev.last = Date.now();
    }
    prev.id = entry.id;
    prev._type = entry._type;
    prev.title = entry.title;
    prev.cover_url = entry.cover_url || prev.cover_url || '';
    prev.artist_name = entry.artist_name || prev.artist_name || '';
    all[entry.id] = prev;
    var keys = Object.keys(all);
    if (keys.length > 400) {
      keys.sort(function (a, b) { return (all[a].last || 0) - (all[b].last || 0); });
      keys.slice(0, keys.length - 400).forEach(function (k) { delete all[k]; });
    }
    localStorage.setItem(TALLY_KEY, JSON.stringify(all));
  } catch (_) {}
}
window.getPlayTally = function (opts) {
  var o = opts || {};
  var all;
  try { all = JSON.parse(localStorage.getItem(TALLY_KEY) || '{}') || {}; } catch (_) { return []; }
  var since = o.days ? Date.now() - o.days * 86400000 : 0;
  return Object.keys(all)
    .map(function (k) { return all[k]; })
    .filter(function (e) { return e && e.n >= (o.min || 2) && (!since || (e.last || 0) >= since); })
    .sort(function (a, b) { return (b.n - a.n) || ((b.last || 0) - (a.last || 0)); })
    .slice(0, o.limit || 12);
};

window.getCompResume = function (albumId) {
  var e = _readResume()[albumId];
  return e && e.track_id ? e : null;
};

var _audioFails = 0;
var _lastPlayRegistered = { id: null, ts: 0 };
var _playGate = { id: null, heard: 0, last: 0, sent: true };
const PLAY_MIN_SECONDS = 30;
function _playGateTick() {
  const g = _playGate;
  if (!g.id || g.sent || !audio || audio.paused) { if (audio) g.last = audio.currentTime; return; }
  const now = audio.currentTime;
  const step = now - g.last;
  g.last = now;
  if (step > 0 && step < 2) g.heard += step;
  const target = Math.min(PLAY_MIN_SECONDS, (audio.duration || PLAY_MIN_SECONDS * 2) / 2);
  if (g.heard >= target) { g.sent = true; registerPlay(g.id); }
}
function registerPlay(trackId) {
  var now = Date.now();
  if (_lastPlayRegistered.id === trackId && now - _lastPlayRegistered.ts < 30000) return;
  _lastPlayRegistered = { id: trackId, ts: now };
  if (typeof api === 'function') {
    api('/tracks/' + trackId + '/play', { method: 'POST' }).catch(function() {});
  }
}

// Last.fm scrobbling: "now playing" when a track starts, one scrobble once half
// the track (or four minutes) has actually been heard.
const _lfm = { key: null, started: 0, heard: 0, last: 0, scrobbled: false, announced: false };
function _lfmEnabled() {
  try { return !!localStorage.getItem('token') && localStorage.getItem('wv_lastfm') === '1'; } catch (_) { return false; }
}
function _lfmRefreshStatus() {
  try {
    if (!localStorage.getItem('token') || typeof api !== 'function') return;
    if (sessionStorage.getItem('wv_lastfm_checked')) return;
    sessionStorage.setItem('wv_lastfm_checked', '1');
    api('/lastfm/status').then(s => { localStorage.setItem('wv_lastfm', s && s.connected ? '1' : '0'); }).catch(() => {});
  } catch (_) {}
}
function _lfmPayload() {
  const t = currentTrack || {};
  const artist = String(t.artist_name || t.archive_artist_name || '').trim();
  const title = String(t.title || '').trim();
  if (!artist || !title) return null;
  return { artist, track: title, album: t._album_title || undefined, duration: audio && isFinite(audio.duration) ? Math.round(audio.duration) : undefined };
}
function _lfmOnPlay() {
  _lfmRefreshStatus();
  if (!currentTrack || !audio) return;
  const key = (currentTrack.id || '') + '|' + (currentTrack.ia_url || '');
  if (_lfm.key !== key) {
    _lfm.key = key; _lfm.started = Math.floor(Date.now() / 1000); _lfm.heard = 0; _lfm.scrobbled = false; _lfm.announced = false;
  }
  _lfm.last = audio.currentTime || 0;
  if (!_lfmEnabled() || _lfm.announced) return;
  const p = _lfmPayload(); if (!p) return;
  _lfm.announced = true;
  api('/lastfm/now-playing', { method: 'POST', body: JSON.stringify(p) }).catch(() => {});
}
function _lfmOnTick() {
  if (!audio || audio.paused || !currentTrack) return;
  const now = audio.currentTime || 0;
  const d = now - _lfm.last;
  if (d > 0 && d < 2.5) _lfm.heard += d;
  _lfm.last = now;
  if (_lfm.scrobbled || !_lfmEnabled()) return;
  const dur = isFinite(audio.duration) ? audio.duration : 0;
  if (dur < 30) return;
  if (_lfm.heard >= Math.min(dur / 2, 240)) {
    const p = _lfmPayload(); if (!p) return;
    _lfm.scrobbled = true;
    api('/lastfm/scrobble', { method: 'POST', body: JSON.stringify({ ...p, timestamp: _lfm.started }) }).catch(() => {});
  }
}
// ---- Radio mode: the station clock drives the player ----
let _radio = null, _radioTimer = null, _radioBusy = false;
function _liveMode(on) {
  document.body.classList.toggle('wv-live', !!on);
  _setPlayBtns(audio && !audio.paused);
}
window.radioTuneIn = async function (slug) {
  _radio = { slug, offset: 0 };
  _liveMode(true);
  clearInterval(_radioTimer); _radioTimer = setInterval(() => _radioSync(false), 8000);
  await _radioSync(true);
};
window.radioStop = function () { const wasLp = _radio && _radio.lp; _radio = null; clearInterval(_radioTimer); _radioTimer = null; _liveMode(false); if (wasLp) document.dispatchEvent(new CustomEvent('lpLeft')); };
window.radioSlug = function () { return _radio && !_radio.lp ? _radio.slug : null; };
// Listening parties ride on the radio sync: the server clock says what is playing and where.
window.lpTuneIn = async function (id) {
  _radio = { slug: id, offset: 0, lp: true, hostPaused: false };
  _liveMode(true);
  clearInterval(_radioTimer); _radioTimer = setInterval(() => _radioSync(false), 3000);
  await _radioSync(true);
};
window.lpId = function () { return _radio && _radio.lp ? _radio.slug : null; };
function _lpCid() {
  try { let c = sessionStorage.getItem('wv_lp_cid'); if (!c) { c = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('wv_lp_cid', c); } return c; } catch (_) { return 'anon'; }
}
async function _radioSync(force) {
  if (!_radio || _radioBusy || typeof api !== 'function') return;
  _radioBusy = true;
  const slug = _radio.slug;
  try {
    // Plain fetch: api() drops responses across page navigations, which would freeze the station clock.
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 20000);
    const isLp = !!_radio.lp;
    let url = API_BASE + '/radio/stations/' + encodeURIComponent(slug) + '/now';
    const headers = {};
    if (isLp) {
      url = API_BASE + '/lp/' + encodeURIComponent(slug) + '/now?c=' + encodeURIComponent(_lpCid());
      if (_radio.dur && _radio.dur.d > 1) { url += '&dur=' + _radio.dur.d.toFixed(2) + '&di=' + encodeURIComponent(_radio.dur.item); _radio.dur = null; }
      try { const tok = localStorage.getItem('token'); if (tok) headers.Authorization = 'Bearer ' + tok; } catch (_) {}
    }
    const r = await fetch(url, { signal: ctrl.signal, headers }).finally(() => clearTimeout(tm));
    const d = await r.json();
    if (!_radio || _radio.slug !== slug) return;
    _radio.offset = Date.parse(d.server_time) - Date.now();
    if (isLp) {
      window._lpLast = d;
      document.dispatchEvent(new CustomEvent('lpState', { detail: d }));
      if (!r.ok || d.status === 'ended') { if (audio && !audio.paused) audio.pause(); window.radioStop(); return; }
    }
    if (_radio.userPaused && !force) return;
    if (!d.now || !d.now.track) { if (audio && !audio.paused) audio.pause(); return; }
    const t = d.now.track;
    const hostPaused = isLp && !!d.now.paused;
    const pos = () => hostPaused ? (d.now.position_sec || 0) : Math.max(0, (Date.now() + _radio.offset - Date.parse(d.now.started_at)) / 1000);
    const ident = isLp ? d.now.item_id : d.now.started_at;
    const same = currentTrack && currentTrack.id === t.id && currentTrack._radio === slug && currentTrack._radioStart === ident;
    const seekNow = () => { try { audio.currentTime = pos(); } catch (_) {} };
    if (!same || force) {
      _fromQueue = false;
      playTrack({ id: t.id, title: t.title, artist_name: t.artist + (isLp ? ' · 🎧 ' : ' · 📻 ') + d.name, ia_url: t.url, cover_url: t.cover_url, _album_title: d.name, _album_id: t.album_id || null, _archive_artist: t.is_archive ? t.artist : null, _radio: slug, _radioStart: ident });
      const ctx = document.getElementById('pfs-context'); if (ctx) ctx.textContent = (isLp ? '🎧 ' : '📻 ') + d.name;
      try { audio.playbackRate = 1; } catch (_) {}
      if (audio.readyState >= 1) seekNow(); else audio.addEventListener('loadedmetadata', seekNow, { once: true });
      if (hostPaused) { _wantPlaying = false; audio.pause(); }
    } else if (isLp) {
      if (hostPaused) {
        if (!audio.paused) { _wantPlaying = false; audio.pause(); }
        if (audio.readyState >= 1 && Math.abs(audio.currentTime - pos()) > 1) seekNow();
      } else if (_radio.hostPaused) {
        seekNow(); _wantPlaying = true; const p = audio.play(); if (p) p.catch(() => {});
      } else if (!audio.paused && audio.readyState >= 1 && Math.abs(audio.currentTime - pos()) > 2.5) seekNow();
    } else if (!audio.paused && audio.readyState >= 1 && Math.abs(audio.currentTime - pos()) > 4) {
      seekNow();
    }
    if (isLp) {
      _radio.hostPaused = hostPaused;
      if (d.now.need_duration && audio.duration && isFinite(audio.duration) && currentTrack && currentTrack._radioStart === d.now.item_id) _radio.dur = { item: d.now.item_id, d: audio.duration };
    }
  } catch (_) {} finally { _radioBusy = false; }
}

// ---- Autoplay: after the last thing you played, keep going with more edits ----
let _autoplayTicket = 0;
const _autoplaySeen = new Set();
async function _autoplayNext() {
  if (typeof api !== 'function') return;
  const my = ++_autoplayTicket;
  try {
    const pool = await api('/trackers/pool?n=24');
    const ids = (pool.ids || []).filter(id => !_autoplaySeen.has(id) && (!currentTrack || currentTrack._album_id !== id));
    if (!ids.length || my !== _autoplayTicket) return;
    let al = null, t = null;
    for (const id of ids.slice(0, 6)) {
      const a = await api('/albums/' + id).catch(() => null);
      if (my !== _autoplayTicket) return;
      if (!a) continue;
      const ts = (a.album_tracks || []).map(x => x.tracks || x).filter(x => x && x.ia_url);
      if (!ts.length) continue;
      al = a; t = ts[Math.floor(Math.random() * ts.length)];
      break;
    }
    if (!al || !t || my !== _autoplayTicket) return;
    _autoplaySeen.add(al.id);
    if (_autoplaySeen.size > 200) _autoplaySeen.clear();
    _fromQueue = false;
    const cr = (typeof wvAlbumCredits === 'function' && wvAlbumCredits(al) || {})[t.id];
    playTrack({ id: t.id, title: cr ? cr.title : t.title, artist_name: cr ? cr.credit : (al.is_archive ? (al.archive_artist_name || 'Archive') : ((al.artists && al.artists.display_name) || 'Unknown')), ia_url: t.ia_url, cover_url: t.cover_url || al.cover_url || null, _album_id: al.id, _album_title: al.title, _album_cover: al.cover_url || null, _archive_artist: al.is_archive ? (al.archive_artist_name || 'Unknown') : null, _autoplay: true });
    const ctx = document.getElementById('pfs-context'); if (ctx) ctx.textContent = 'Autoplay · ' + (al.title || '');
  } catch (_) {}
}

// ---- Autoplay queue: a standalone play seeds a queue of more edits; skipping past the end adds more ----
let _apSeedTicket = 0;
async function _autoplayPicks(n) {
  if (typeof api !== 'function') return [];
  // Autoplay only serves edits and comp edits from the two trackers.
  const pool = [];
  let heard = new Set();
  try { (JSON.parse(localStorage.getItem('recently_played') || '[]') || []).forEach(h => { if (h && h.id) heard.add(h.id); }); (JSON.parse(localStorage.getItem('wv_autoplay_heard') || '[]') || []).forEach(id => heard.add(id)); } catch (_) {}
  try {
    const p = await api('/trackers/pool?n=40');
    const ids = (p.ids || []).filter(id => !heard.has(id) && !_autoplaySeen.has(id)).slice(0, Math.max(n + 4, 14));
    const full = await Promise.all(ids.map(id => api('/albums/' + id).catch(() => null)));
    full.forEach(al => {
      if (!al) return;
      const tracks = (al.album_tracks || []).map(x => x.tracks || x).filter(t => t && t.ia_url && !heard.has(t.id));
      if (!tracks.length) return;
      const t = tracks[Math.floor(Math.random() * tracks.length)];
      const cr = (typeof wvAlbumCredits === 'function' && wvAlbumCredits(al) || {})[t.id];
      pool.push({ id: t.id, title: cr ? cr.title : t.title, artist_name: cr ? cr.credit : (al.is_archive ? (al.archive_artist_name || 'Archive') : ((al.artists && al.artists.display_name) || 'Unknown')), ia_url: t.ia_url, cover_url: t.cover_url || al.cover_url || null, _album_id: al.id, _album_title: al.title, _album_cover: al.cover_url || null, _archive_artist: al.is_archive ? (al.archive_artist_name || 'Unknown') : null, _autoplay: true });
    });
  } catch (_) {}
  const seen = new Set(_pq.map(x => x.id)); if (currentTrack) seen.add(currentTrack.id);
  const uniq = []; const ids2 = new Set();
  for (const t of pool) { if (!ids2.has(t.id) && !seen.has(t.id) && !_autoplaySeen.has(t.id)) { ids2.add(t.id); uniq.push(t); } }
  for (let i = uniq.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [uniq[i], uniq[j]] = [uniq[j], uniq[i]]; }
  return uniq.slice(0, n);
}

async function _seedAutoplayQueue(track) {
  if (_autoplayOff()) return;
  const my = ++_apSeedTicket;
  const picks = await _autoplayPicks(12);
  if (my !== _apSeedTicket || !picks.length) return;
  if (!currentTrack || currentTrack.id !== track.id || _radio || _pq.length > 1 || _autoplayOff()) return;
  _pq = [track].concat(picks); _pqIdx = 0; _setOnChange(null);
  _renderQueuePanel();
  _saveQueue();
}
async function _extendAutoplayQueue() {
  const picks = await _autoplayPicks(10);
  if (!picks.length) return false;
  if (!_pq.length || _pqIdx < 0) { _pq = currentTrack ? [currentTrack] : []; _pqIdx = _pq.length - 1; }
  _pq = _pq.concat(picks); _renderQueuePanel(); _saveQueue();
  return true;
}
function _autoplayOff() { try { return localStorage.getItem('wv_autoplay_off') === '1'; } catch (_) { return false; } }
window.wvAutoplayOn = function () { return !_autoplayOff(); };
window.setAutoplayEnabled = function (on) {
  try { if (on) localStorage.removeItem('wv_autoplay_off'); else localStorage.setItem('wv_autoplay_off', '1'); } catch (_) {}
  // Switching autoplay off drops the edits it had lined up.
  if (!on && _pq.some(t => t && t._autoplay)) {
    const keep = []; let idx = _pqIdx;
    _pq.forEach((t, i) => { if (t && t._autoplay && i !== _pqIdx) { if (i < _pqIdx) idx--; } else keep.push(t); });
    _pq = keep; _pqIdx = Math.min(idx, _pq.length - 1); _shuffleBag = []; _shuffleStarted = false;
    _saveQueue();
  }
  _renderQueuePanel();
  if (typeof wvToast === 'function') wvToast(on ? 'autoplay on...more edits play when the queue ends' : 'autoplay off');
};
// The queue ran out: keep going with more edits unless autoplay is off.
async function _continueAfterQueue() {
  if (_radio) return;
  if (_autoplayOff()) { _wantPlaying = false; if (typeof wvToast === 'function') wvToast('thats the end of the queue'); return; }
  const start = _pq.length;
  if (await _extendAutoplayQueue()) return window.playQueueIndex(Math.min(start, _pq.length - 1));
  return _autoplayNext();
}
window.skipNextOrAutoplay = async function () {
  if (_radio) return;
  if (_pq.length && _pqIdx >= 0 && _pqIdx < _pq.length - 1) return window.playQueueIndex(_pqIdx + 1);
  return _continueAfterQueue();
};

function playTrack(track) {
  const playerEl = document.getElementById('player');
  if (!playerEl || !audio) return;
  if (!track._radio && _radio) window.radioStop();
  try { const h = JSON.parse(localStorage.getItem('wv_autoplay_heard') || '[]'); if (track.id && h.indexOf(track.id) === -1) { h.push(track.id); if (track._album_id && h.indexOf(track._album_id) === -1) h.push(track._album_id); localStorage.setItem('wv_autoplay_heard', JSON.stringify(h.slice(-800))); } } catch (_) {}
  // Seeding costs a pool lookup plus a fetch per candidate comp. Wait until the
  // listener has actually stayed with this track, so a skipped one costs nothing.
  if (!_fromQueue && !track._radio && !_autoplayOff()) setTimeout(() => _seedAutoplayQueue(track), 12000);

  // A standalone play (not driven by the queue) clears any old queue so the OS
  // media controls don't skip back into a comp the user has moved on from.
  if (!_fromQueue) { _pq = []; _pqIdx = -1; _setOnChange(null); _shuffleBag = []; _shuffleStarted = false; _renderQueuePanel(); _saveQueue(); }

  currentTrack = { ...track, _savedTime: 0 };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));
  _setTabTitle(track);

  // recently_played — store the comp when a track comes from one, not the individual track
  const HISTORY_KEY = 'recently_played';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }
  let historyEntry;
  if (track._album_id) {
    historyEntry = {
      _type: 'album',
      id: track._album_id,
      title: track._album_title || track.title,
      cover_url: track._album_cover || track.cover_url || '',
      artist_name: track.artist_name || '',
    };
    history = history.filter(h => h.id !== track._album_id);
  } else {
    historyEntry = {
      _type: 'track',
      id: track.id,
      title: track.title,
      cover_url: track.cover_url || '',
      ia_url: track.ia_url,
      artist_name: track.artist_name || '',
    };
    history = history.filter(h => h.id !== track.id);
  }
  history.unshift(historyEntry);
  if (history.length > 60) history = history.slice(0, 60);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  _tally(historyEntry);
  if (typeof window._sidebarLibRender === 'function') window._sidebarLibRender();

  // Cancel any pending restore-position listener so it doesn't seek this
  // new track to the previous session's position.
  if (_restoreCanplayFn) {
    audio.removeEventListener('canplay', _restoreCanplayFn);
    _restoreCanplayFn = null;
  }
  // If the iOS unlock fires on the same tap, prevent its .then() from
  // restoring the old empty src over the track we're about to play.
  _iosUnlockPending = false;
  // A new track means new words — refresh the panel if it's open.
  if (typeof _lyricsOnTrackChange === 'function') _lyricsOnTrackChange();

  audio.src = track.ia_url;
  if (_warm.el) { const w = _warm.el; _warm = { url: null, el: null }; setTimeout(() => { try { w.removeAttribute('src'); w.load(); } catch (_) {} }, 20000); }
  _wantPlaying = true;
  const p = audio.play();
  if (p) p.catch(() => {});

  // A stream is counted once the track has really been heard (see _playGate
  // in _onTimeUpdate), not the moment it is opened, so skipping past a track
  // never inflates its count.
  _playGate = { id: track.id || null, heard: 0, last: 0, sent: false };
  _rememberComp(track);

  _renderAll(track);
  playerEl.classList.remove('hidden');

  if ('mediaSession' in navigator) {
    _setMediaMeta(track);
    const live = !!track._radio;
    const h = (name, fn) => { try { navigator.mediaSession.setActionHandler(name, fn); } catch (_) {} };
    h('play', () => { if (_radio) { if (audio.paused) togglePlay(); return; } _wantPlaying = true; audio.play(); });
    h('pause', () => { if (_radio) { if (!audio.paused) togglePlay(); return; } _wantPlaying = false; audio.pause(); });
    h('previoustrack', live ? null : () => skipPrev());
    h('nexttrack', live ? null : () => skipNext());
    h('seekbackward', live ? null : e => { audio.currentTime -= e.seekOffset || 10; });
    h('seekforward', live ? null : e => { audio.currentTime += e.seekOffset || 10; });
    h('seekto', live ? null : e => { if (e.seekTime != null && audio.duration) audio.currentTime = e.seekTime; });
    h('stop', () => { if (_radio) _radio.userPaused = true; _wantPlaying = false; audio.pause(); });
    if (live) { try { navigator.mediaSession.setPositionState({ duration: Infinity, playbackRate: 1, position: 0 }); } catch (_) {} }
  }
}

// Lock screen / Control Center card: sized artwork (the resizer serves webp,
// with the original as a last resort) and the comp as the album line.
function _setMediaMeta(track) {
  if (!('mediaSession' in navigator) || !track) return;
  try {
    const c = track.cover_url;
    const art = [];
    if (c) {
      if (typeof wvImg === 'function') [96, 256, 512].forEach(px => { const u = _coverAt(c, px); if (u && u !== c) art.push({ src: u, sizes: px + 'x' + px, type: 'image/webp' }); });
      art.push({ src: c, sizes: '512x512' });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || '',
      artist: track.artist_name || (track.artists && track.artists.display_name) || '',
      album: track._album_title || '',
      artwork: art,
    });
  } catch (_) {}
}
window._wvSetMediaMeta = _setMediaMeta;

// The tab title carries what is playing so a listener can find the tab again.
let _baseTitle = document.title;
function _setTabTitle(track) {
  if (!track || !track.title) return;
  const who = track.artist_name || track._archive_artist || (track.artists && track.artists.display_name) || '';
  document.title = '\u25B6 ' + track.title + (who ? ' — ' + who : '');
}
window._wvRestoreTabTitle = function (t) { _baseTitle = t || _baseTitle; if (!currentTrack || !audio || audio.paused) document.title = _baseTitle; else _setTabTitle(currentTrack); };

function _coverAt(url, px) {
  if (!url) return '';
  try { return typeof wvImg === 'function' ? wvImg(url, px) : url; } catch (_) { return url; }
}
function _renderAll(track) {
  const title = track.title || '—';
  const artist = track.artist_name || track.artists?.display_name || '—';
  const cover = track.cover_url;
  const seed = track.title || '';

  // Gradient cover (design uses color gradients seeded by track title)
  const bg = (typeof coverGradient === 'function') ? coverGradient(seed) : '#333';
  const gloss = '';
  // Small covers go through the image resizer; if it fails, fall back to
  // the original file, then to the gradient.
  const imgAt = px => cover ? `<img src="${_esc(_coverAt(cover, px))}" data-raw="${_esc(cover)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="if(this.dataset.raw&&this.src!==this.dataset.raw){this.src=this.dataset.raw;this.dataset.raw='';}else{this.style.opacity=0}">` : '';
  const coverHtml = `<div style="position:absolute;inset:0;background:${bg};border-radius:inherit;overflow:hidden;">${gloss}${imgAt(112)}</div>`;
  const largeCoverHtml = `<div class="pfs-cover-art" style="position:absolute;inset:0;background:${bg};border-radius:inherit;overflow:hidden;">${imgAt(1000)}</div>`;

  // Desktop bar
  const titleEl = document.getElementById('player-title');
  const artistEl = document.getElementById('player-artist');
  const coverEl = document.getElementById('player-cover');
  if (titleEl) titleEl.textContent = title;
  if (artistEl) artistEl.textContent = artist;
  if (coverEl) { coverEl.style.background = bg; coverEl.style.position = 'relative'; coverEl.innerHTML = coverHtml; }

  // Mobile mini
  const miniTitle = document.getElementById('player-mini-title');
  const miniArtist = document.getElementById('player-mini-artist');
  const miniCover = document.getElementById('player-mini-cover');
  if (miniTitle) miniTitle.textContent = title;
  if (miniArtist) miniArtist.textContent = artist;
  if (miniCover) { miniCover.style.background = bg; miniCover.style.position = 'relative'; miniCover.innerHTML = coverHtml; }

  // Full screen
  const pfsTitle = document.getElementById('pfs-title');
  const pfsArtist = document.getElementById('pfs-artist');
  const pfsCover = document.getElementById('pfs-cover');
  if (pfsTitle) pfsTitle.textContent = title;
  if (pfsArtist) pfsArtist.textContent = artist;
  if (pfsCover) { pfsCover.style.background = bg; pfsCover.style.position = 'relative'; pfsCover.innerHTML = largeCoverHtml; }
  const pfsBg = document.getElementById('pfs-bg');
  if (pfsBg) pfsBg.style.backgroundImage = track.cover_url ? 'url("' + String(track.cover_url).replace(/"/g, '%22') + '")' : 'none';
  const ctx = document.getElementById('pfs-context');
  if (ctx) ctx.textContent = track._album_title ? 'From ' + track._album_title : (artist !== '—' ? artist : 'wavernrs');
  _refreshLike();
  const fsEl = document.getElementById('player-fullscreen');
  if (fsEl && fsEl.classList.contains('open')) _paintFsWash();
  if (typeof window._wvNowPlaying === 'function') {
    try { window._wvNowPlaying({ title, artist, cover, bg, track }); } catch (_) {}
  }
}

// Whether the listener wants sound. In-app browsers (Discord, Instagram,
// Facebook) and some Android WebViews pause media the moment the app leaves
// the foreground and never resume it. When the page comes back and this is
// still true but the element is paused, playback picks up where it stopped.
let _wantPlaying = false;
function togglePlay() {
  if (!audio) return;
  if (_radio) {
    if (audio.paused) {
      _radio.userPaused = false; _wantPlaying = true;
      const go = (n) => { if (!_radio) return; if (_radioBusy && n < 40) return setTimeout(() => go(n + 1), 150); _radioSync(true); };
      go(0);
    }
    else { _radio.userPaused = true; _wantPlaying = false; audio.pause(); }
    return;
  }
  if (audio.paused) { _wantPlaying = true; audio.play().catch(console.error); }
  else { _wantPlaying = false; audio.pause(); }
}

function pausePlayer() {
  _wantPlaying = false;
  if (audio && !audio.paused) audio.pause();
}

function _isInAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|Instagram|Discord|Snapchat|Twitter|Line\/|MicroMessenger/i.test(ua)) return true;
  if (/; wv\)/.test(ua)) return true;                       // Android WebView
  const ios = /iPhone|iPad|iPod/.test(ua);
  return ios && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua); // iOS in-app WKWebView drops the Safari token
}
function _renderInAppHint() {
  if (!_isInAppBrowser() || localStorage.getItem('wv_inapp_hint') === 'off') return;
  const wrap = document.querySelector('.pfs-header');
  if (!wrap || document.getElementById('pfs-inapp')) return;
  const href = location.href;
  const android = /Android/i.test(navigator.userAgent);
  const open = android
    ? 'intent://' + location.host + location.pathname + location.search + '#Intent;scheme=https;action=android.intent.action.VIEW;end'
    : href;
  const el = document.createElement('div');
  el.className = 'pfs-inapp'; el.id = 'pfs-inapp';
  el.innerHTML = '<span>youre in another apps browser so the music stops when you leave. <a href="' + open + '" target="_blank" rel="noopener">open it in your browser</a> to keep it playing in the background.</span>' +
    '<button aria-label="Dismiss" onclick="localStorage.setItem(\'wv_inapp_hint\',\'off\');this.parentNode.remove()">×</button>';
  wrap.insertAdjacentElement('afterend', el);
}

function _setPlayBtns(playing) {
  if (playing && _radio) {
    const sq = n => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
    const b1 = document.getElementById('player-play-btn'), b2 = document.getElementById('player-mini-play-btn'), b3 = document.getElementById('pfs-play-btn');
    if (b1) { b1.innerHTML = sq(18); b1.title = 'Stop'; }
    if (b2) { b2.innerHTML = sq(16); b2.title = 'Stop'; }
    if (b3) { b3.innerHTML = sq(26); b3.title = 'Stop'; }
    return;
  }
  const icon = playing
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const mini = playing
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const pfs = playing
    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
    : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const b1 = document.getElementById('player-play-btn');
  const b2 = document.getElementById('player-mini-play-btn');
  const b3 = document.getElementById('pfs-play-btn');
  _qSyncPlaying();
  [b1, b2, b3].forEach(b => { if (b) b.setAttribute('aria-label', playing ? 'Pause' : 'Play'); });
  if (b1) b1.innerHTML = icon;
  if (b2) b2.innerHTML = mini;
  if (b3) b3.innerHTML = pfs;
}

// Stubs for pages that need skip prev/next (album.html overrides these)
function renderPlayerTrack(track) { _renderAll(track); }
function setPlayBtn(playing) { _setPlayBtns(playing); }
function playIcon() { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; }
function pauseIcon() { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; }

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  // Skip when focus is in a text field or content-editable element
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.tagName === 'SELECT')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!audio) return;
  // Space and the arrows belong to whatever control has focus.
  var onControl = t && t.closest && t.closest('button, a, [role="slider"], [tabindex]:not([tabindex="-1"])');

  if (e.code === 'Space') {
    if (onControl) return;
    e.preventDefault();
    togglePlay();
  } else if ((e.key === 'ArrowRight' || e.key === 'l') && !e.shiftKey && !onControl) {
    e.preventDefault();
    if (_radio) return;
    audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 10);
  } else if ((e.key === 'ArrowLeft' || e.key === 'j') && !e.shiftKey && !onControl) {
    e.preventDefault();
    if (_radio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  } else if (e.key === 'ArrowRight' && e.shiftKey) {
    skipNext();
  } else if (e.key === 'ArrowLeft' && e.shiftKey) {
    skipPrev();
  } else if (e.key === 'm') {
    toggleMute();
  } else if (e.key === 's' && !onControl) {
    toggleShuffle();
  } else if (e.key === 'r' && !onControl) {
    toggleRepeat();
  } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey) {
    e.preventDefault();
    setVolume((audio.volume || 0) + (e.key === 'ArrowUp' ? 0.1 : -0.1));
  } else if (e.key === '?') {
    if (typeof window.wvShortcutsHelp === 'function') window.wvShortcutsHelp();
  }
});


/* =========================================================
   TIMED LYRICS

   Lines are { t, x } — a timestamp and the words shown at it. The
   player highlights whichever line the playhead is inside and
   scrolls it to centre; tapping a line seeks there.

   Artists own the text for their own tracks. Auto-generate
   transcribes the track's own audio as a starting point, and the
   sync tool stamps timings by tapping along with playback, which
   is far quicker than typing timecodes by hand.
   ========================================================= */

var _lyr = { trackId: null, lines: [], canEdit: false, source: null, idx: -1, open: false, mode: 'view' };
var _lyrSyncPos = 0;

function _lyrEl(id) { return document.getElementById(id); }

// Which line is playing: last line whose timestamp has passed.
function _lyrIndexAt(t) {
  var lines = _lyr.lines, lo = 0, hi = lines.length - 1, best = -1;
  while (lo <= hi) {
    var mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best;
}

// Word-by-word highlight. timeupdate only fires a few times a second, so
// while lyrics are open and playing a frame loop moves the highlight across
// the current line's words between those events.
var _lyrTimer = 0, _lyrWordPos = -1, _lyrWordEl = null, _lyrSpans = null;
function _syncWords(t) {
  var i = _lyr.onIdx != null ? _lyr.onIdx : _lyr.idx; if (i < 0) return;
  var line = _lyr.lines[i]; if (!line || !line.w) return;
  var scroll = _lyrEl('pfs-lyrics-scroll'); if (!scroll) return;
  var el = scroll.children[i]; if (!el) return;
  if (el !== _lyrWordEl) { _lyrWordEl = el; _lyrSpans = el.querySelectorAll('.lyr-w'); _lyrWordPos = -1; }
  var spans = _lyrSpans; if (!spans || !spans.length) return;
  var pos = -1;
  for (var k = 0; k < line.w.length; k++) { if (line.w[k].t <= t + 0.08) pos = k; else break; }
  if (pos === _lyrWordPos) return;
  // Only the spans whose state changed get touched: a phone repaints far
  // less when the class flips on one or two words instead of the whole line.
  var from = Math.min(_lyrWordPos, pos), to = Math.max(_lyrWordPos, pos);
  for (var j = Math.max(0, from); j <= to && j < spans.length; j++) {
    spans[j].classList.toggle('past', j < pos); spans[j].classList.toggle('on', j === pos);
  }
  _lyrWordPos = pos;
}
// Ten ticks a second is plenty for word timing and a fraction of the work
// of a per-frame loop, which was enough to make Safari on a phone crash.
function _lyrLoop() {
  if (!_lyr.open || _lyr.mode !== 'view' || !audio || audio.paused || !_fsIsOpen()) { _lyrTimer = 0; return; }
  // Re-arm BEFORE syncing: _syncLyrics calls _lyrStartLoop, and with the
  // timer cleared first every tick spawned a second loop. That doubled
  // each tick and took Safari down within a second of opening lyrics.
  _lyrTimer = setTimeout(_lyrLoop, 100);
  _syncLyrics(audio.currentTime);
  _syncWords(audio.currentTime);
}
function _lyrStartLoop() { if (!_lyrTimer) _lyrTimer = setTimeout(_lyrLoop, 100); }

// A line is "on" only while it is being sung. Before the first word and in
// instrumental gaps nothing is lit; the next line is scrolled into place so
// the listener sees what's coming.
function _lyrState(t) {
  var lines = _lyr.lines, i = _lyrIndexAt(t);
  if (i < 0) return { i: -1, on: -1, scroll: 0 };
  var line = lines[i], next = lines[i + 1];
  var end = line.e != null ? line.e : (next ? next.t : Infinity);
  if (t > end + 1.2 && (!next || next.t - t > 2.5)) return { i: i, on: -1, scroll: next ? i + 1 : i };
  return { i: i, on: i, scroll: i };
}
function _syncLyrics(t) {
  if (!_lyr.open || _lyr.mode !== 'view' || !_lyr.lines.length || !_fsIsOpen()) return;
  _lyrStartLoop();
  var st = _lyrState(t), i = st.i;
  if (i === _lyr.idx && st.on === _lyr.onIdx) { if (st.on >= 0) _syncWords(t); return; }
  _lyrWordPos = -1; _lyrWordEl = null; _lyrSpans = null;
  _lyr.idx = i; _lyr.onIdx = st.on;
  var scroll = _lyrEl('pfs-lyrics-scroll');
  if (!scroll) return;
  scroll.querySelectorAll('.lyr-line').forEach(function (el, n) {
    el.classList.toggle('on', n === st.on);
    el.classList.toggle('past', st.on >= 0 ? n < st.on : n <= i);
  });
  var active = scroll.children[st.scroll];
  if (active) {
    scroll.scrollTo({
      top: active.offsetTop - scroll.clientHeight / 2 + active.clientHeight / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
}

function _renderLyrics() {
  var scroll = _lyrEl('pfs-lyrics-scroll');
  var tools = _lyrEl('pfs-lyrics-tools');
  if (!scroll) return;

  if (_lyr.mode === 'edit') return _renderLyricsEditor();

  if (!_lyr.lines.length) {
    scroll.innerHTML =
      '<div class="lyr-empty">' +
        '<div class="lyr-empty-t">No lyrics yet</div>' +
        '<div class="lyr-empty-d">' +
          (_lyr.canEdit
            ? 'you can make them from the audio...takes about a minute'
            : 'no one made lyrics for this track yet') +
        '</div>' +
      '</div>';
  } else {
    scroll.innerHTML = _lyr.lines.map(function (l, i) {
      var inner = (l.w && l.w.length)
        ? l.w.map(function (w, k) { return '<span class="lyr-w" data-k="' + k + '">' + escHtml(w.x) + '</span>'; }).join(' ')
        : escHtml(l.x);
      return '<div class="lyr-line' + (l.w && l.w.length ? ' has-w' : '') + '" onclick="seekToLyric(' + i + ')">' + inner + '</div>';
    }).join('');
    _lyr.idx = -1;
    _syncLyrics(audio ? audio.currentTime : 0);
  }

  if (tools) {
    var hasWords = _lyr.lines.some(function (l) { return l.w && l.w.length; });
    // Making lyrics needs an account, so signed-out listeners just see the
    // empty state instead of a request that can only fail.
    if (!_lyr.lines.length && _lyr.loaded && !_lyr.generating && _lyr.autoTried !== _lyr.trackId && localStorage.getItem('token')) {
      _lyr.autoTried = _lyr.trackId; _lyr.generating = true;
      tools.hidden = false;
      tools.innerHTML = '<span class="lyr-src">Getting the lyrics…</span>';
      autoGenerateLyrics(null);
    } else if (_lyr.generating) {
      tools.hidden = false;
      tools.innerHTML = '<span class="lyr-src">Getting the lyrics…</span>';
    } else if (!_lyr.lines.length && _lyr.autoFailed === _lyr.trackId) {
      tools.hidden = false;
      tools.innerHTML = '<span class="lyr-src">couldnt get lyrics for this one</span>';
    } else if (_lyr.canEdit && _lyr.lines.length && _lyr.source === 'auto' && !hasWords) {
      tools.hidden = false;
      tools.innerHTML = '<button class="lyr-tool" onclick="autoGenerateLyrics(this)">Get word timing</button>';
    } else {
      tools.hidden = !_lyr.source;
      tools.innerHTML = _lyr.source
        ? '<span class="lyr-src">' + (_lyr.source === 'auto' ? 'auto made...might have mistakes'
            : (_lyr.source === 'embedded' ? 'from the file' : 'from the artist')) + '</span>'
        : '';
    }
    // The artist (or a mod) can fix the words and tap in the timing.
    if (_lyr.canEdit && _lyr.loaded && !_lyr.generating) {
      tools.hidden = false;
      tools.innerHTML += '<button class="lyr-tool" onclick="openLyricsEditor()">' + (_lyr.lines.length ? 'Edit lyrics' : 'Write lyrics') + '</button>';
    }
  }
}

window.seekToLyric = function (i) {
  var l = _lyr.lines[i];
  if (!l || !audio) return;
  audio.currentTime = l.t;
  if (audio.paused) audio.play().catch(function () {});
};

window.toggleLyricsView = function () {
  var panel = _lyrEl('pfs-lyrics');
  var cover = document.querySelector('.pfs-cover-wrap');
  var btn = _lyrEl('pfs-lyrics-btn');
  if (!panel) return;
  _lyr.open = panel.hidden;
  panel.hidden = !_lyr.open;
  if (cover) cover.style.display = _lyr.open ? 'none' : '';
  if (btn) btn.classList.toggle('active', _lyr.open);
  if (_lyr.open) {
    _lyr.mode = 'view';
    loadLyricsForCurrent();
  }
};

function loadLyricsForCurrent() {
  var t = (typeof currentTrack !== 'undefined') ? currentTrack : null;
  if (!t || !t.id) {
    _lyr = { trackId: null, lines: [], canEdit: false, source: null, idx: -1, open: _lyr.open, mode: 'view' };
    return _renderLyrics();
  }
  // Already loaded for this track — don't refetch on every open.
  if (_lyr.trackId === t.id && _lyr.lines.length) return _renderLyrics();

  _lyr.trackId = t.id;
  _lyr.lines = []; _lyr.loaded = false; _lyr.generating = false;
  _lyr.idx = -1;
  var scroll = _lyrEl('pfs-lyrics-scroll');
  if (scroll) scroll.innerHTML = '<div class="lyr-empty"><div class="lyr-empty-d">Loading…</div></div>';

  var headers = {};
  var tok = localStorage.getItem('token');
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  fetch(API_BASE + '/lyrics/' + encodeURIComponent(t.id), { headers: headers })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      _lyr.lines = d.lines || [];
      _lyr.canEdit = !!d.can_edit; _lyr.loaded = true;
      _lyr.source = d.source;
      _renderLyrics();
    })
    .catch(function () { _lyr.loaded = true; _renderLyrics(); });
}

// Reload lyrics when the track changes while the panel is open.
function _lyricsOnTrackChange() {
  if (!_lyr.open) { _lyr.trackId = null; return; }
  _lyr.trackId = null;
  _lyr.mode = 'view';
  loadLyricsForCurrent();
}

/* ── Editor ──────────────────────────────────────────────────
   Two steps, because they're genuinely different jobs: get the
   words right, then stamp when each one lands. */
function _renderLyricsEditor() {
  var scroll = _lyrEl('pfs-lyrics-scroll');
  var tools = _lyrEl('pfs-lyrics-tools');
  var text = _lyr.lines.length ? _lyr.lines.map(function (l) { return l.x; }).join('\n') : (_lyr.plain || '');
  scroll.innerHTML =
    '<div class="lyr-edit">' +
      '<div class="lyr-edit-hint">one lyric line per line. save it, then use <b>Sync</b> to tap in the timing while it plays.</div>' +
      '<textarea id="lyr-text" class="lyr-textarea" placeholder="type or paste the lyrics…">' + escHtml(text) + '</textarea>' +
    '</div>';
  if (tools) {
    tools.hidden = false;
    tools.innerHTML =
      '<button class="lyr-tool primary" onclick="saveLyricsText()">Save</button>' +
      '<button class="lyr-tool" onclick="startLyricsSync()">Sync timings</button>' +
      '<button class="lyr-tool" onclick="cancelLyricsEdit()">Cancel</button>';
  }
}

window.openLyricsEditor = function () { _lyr.mode = 'edit'; _renderLyrics(); };
window.cancelLyricsEdit = function () { _lyr.mode = 'view'; _lyr.trackId = null; loadLyricsForCurrent(); };

function _linesFromTextarea() {
  var ta = _lyrEl('lyr-text');
  if (!ta) return [];
  return ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
}

window.saveLyricsText = function () {
  var texts = _linesFromTextarea();
  // Keep any timings we already have for lines that didn't change position.
  var lines = texts.map(function (x, i) {
    var prev = _lyr.lines[i];
    return { t: prev ? prev.t : i * 4, x: x };
  });
  _persistLyrics(lines, texts.join('\n'));
};

// Tap-to-sync: play the track and hit the button as each line arrives. Far
// faster than typing timecodes, and accurate enough because you're listening.
window.startLyricsSync = function () {
  var texts = _linesFromTextarea();
  if (!texts.length) { alert('add some lines first'); return; }
  _lyr.pending = texts.map(function (x) { return { t: null, x: x }; });
  _lyrSyncPos = 0;
  _lyr.mode = 'sync';
  if (audio) { audio.currentTime = 0; audio.play().catch(function () {}); }
  _renderLyricsSync();
};

function _renderLyricsSync() {
  var scroll = _lyrEl('pfs-lyrics-scroll');
  var tools = _lyrEl('pfs-lyrics-tools');
  scroll.innerHTML = _lyr.pending.map(function (l, i) {
    var cls = 'lyr-line' + (i === _lyrSyncPos ? ' on' : (l.t != null ? ' past' : ''));
    return '<div class="' + cls + '">' + (l.t != null ? '<span class="lyr-stamp">' + fmtTime(l.t) + '</span>' : '') + escHtml(l.x) + '</div>';
  }).join('');
  var active = scroll.children[_lyrSyncPos];
  if (active) scroll.scrollTo({ top: active.offsetTop - scroll.clientHeight / 2, behavior: 'smooth' });
  if (tools) {
    tools.hidden = false;
    tools.innerHTML =
      '<button class="lyr-tool primary" onclick="stampLyricLine()">Stamp line ' + (_lyrSyncPos + 1) + ' / ' + _lyr.pending.length + '</button>' +
      '<button class="lyr-tool" onclick="undoLyricStamp()">Undo</button>' +
      '<button class="lyr-tool" onclick="finishLyricsSync()">Done</button>';
  }
}

window.stampLyricLine = function () {
  if (!_lyr.pending || _lyrSyncPos >= _lyr.pending.length) return;
  _lyr.pending[_lyrSyncPos].t = audio ? audio.currentTime : 0;
  _lyrSyncPos++;
  if (_lyrSyncPos >= _lyr.pending.length) return finishLyricsSync();
  _renderLyricsSync();
};

window.undoLyricStamp = function () {
  if (_lyrSyncPos > 0) {
    _lyrSyncPos--;
    _lyr.pending[_lyrSyncPos].t = null;
    if (audio && _lyrSyncPos > 0 && _lyr.pending[_lyrSyncPos - 1].t != null) {
      audio.currentTime = _lyr.pending[_lyrSyncPos - 1].t;
    }
    _renderLyricsSync();
  }
};

window.finishLyricsSync = function () {
  var lines = (_lyr.pending || []).filter(function (l) { return l.t != null; })
    .map(function (l) { return { t: l.t, x: l.x }; });
  if (!lines.length) { _lyr.mode = 'edit'; return _renderLyrics(); }
  _persistLyrics(lines, (_lyr.pending || []).map(function (l) { return l.x; }).join('\n'));
};

function _persistLyrics(lines, plain) {
  var tok = localStorage.getItem('token');
  if (!tok || !_lyr.trackId) return;
  fetch(API_BASE + '/lyrics/' + encodeURIComponent(_lyr.trackId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
    body: JSON.stringify({ lines: lines, plain: plain }),
  })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (!res.ok) { alert(res.d.error || 'couldnt save the lyrics'); return; }
      _lyr.lines = res.d.lines || lines;
      _lyr.source = 'manual';
      _lyr.mode = 'view';
      _renderLyrics();
    })
    .catch(function () { alert('couldnt save the lyrics'); });
}

window.autoGenerateLyrics = function (btn) {
  var tok = localStorage.getItem('token');
  if (!_lyr.trackId) return;
  var forTrack = _lyr.trackId;
  var hdr = tok ? { 'Authorization': 'Bearer ' + tok } : {};
  if (btn) { btn.disabled = true; btn.textContent = 'Listening…'; }
  var fail = function (msg) { _lyr.generating = false; if (_lyr.trackId === forTrack) { _lyr.autoFailed = forTrack; _renderLyrics(); } if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; if (msg) alert(msg); } };
  fetch(API_BASE + '/lyrics/' + encodeURIComponent(forTrack) + '/auto', { method: 'POST', headers: hdr })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (!res.ok) { fail(btn ? (res.d.error || 'couldnt get lyrics') : null); return; }
      // The file already carried them — nothing to wait for.
      if (res.d.status === 'succeeded') {
        _lyr.generating = false;
        _lyr.lines = res.d.lines || [];
        _lyr.source = 'embedded';
        _lyr.mode = 'view';
        _renderLyrics();
        if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; }
        if (!res.d.synced) {
          alert('found the words in the file but no timing...use Edit → Sync timings to tap them in');
        }
        return;
      }
      var tries = 0;
      var poll = setInterval(function () {
        tries++;
        fetch(API_BASE + '/lyrics/job/' + res.d.id, { headers: hdr })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            if (!j) return;
            if (j.status === 'succeeded') {
              clearInterval(poll);
              _lyr.generating = false;
              if (_lyr.trackId !== forTrack) return;
              _lyr.lines = j.lines || [];
              _lyr.source = 'auto';
              _lyr.mode = 'view';
              _renderLyrics();
              if (btn) { btn.disabled = false; btn.textContent = 'Get word timing'; }
            } else if (j.status === 'failed' || tries > 150) {
              clearInterval(poll);
              fail(btn ? (j.error || 'getting the lyrics took too long') : null);
            }
          })
          .catch(function () {});
      }, 4000);
    })
    .catch(function () { fail(btn ? 'couldnt get lyrics' : null); });
};
