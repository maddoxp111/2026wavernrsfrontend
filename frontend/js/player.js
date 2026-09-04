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
let _fromQueue = false; // guard so queue-driven plays don't reset the queue

window.setPlayerQueue = function (list, idx, onChange) {
  _pq = Array.isArray(list) ? list : [];
  _pqIdx = (typeof idx === 'number') ? idx : -1;
  _pqOnChange = (typeof onChange === 'function') ? onChange : null;
  _renderQueuePanel();
};

window.playQueueIndex = function (idx) {
  if (idx < 0 || idx >= _pq.length) return false;
  _pqIdx = idx;
  _fromQueue = true;
  playTrack(_pq[idx]);
  _fromQueue = false;
  if (_pqOnChange) { try { _pqOnChange(idx); } catch (_) {} }
  _renderQueuePanel();
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
      audio.src = s; audio.currentTime = t; audio.volume = 0.8;
      if (!p && s) audio.play().catch(() => {});
    }
  }).catch(() => {
    if (_iosUnlockPending) {
      _iosUnlockPending = false;
      audio.src = s; audio.currentTime = t; audio.volume = 0.8;
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
  if (!localStorage.getItem('token')) { location.assign('/login.html?next=' + encodeURIComponent(location.pathname + location.search)); return; }
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
  navigate(currentTrack._album_id ? '/album.html?id=' + currentTrack._album_id : '/track.html?id=' + currentTrack.id);
}
function goToCurrentArtist() {
  if (!currentTrack) return;
  const aid = currentTrack.artist_id || (currentTrack.artists && currentTrack.artists.id);
  if (!aid) return goToCurrentTrack();
  closeFullPlayer(); navigate('/artist.html?id=' + aid);
}
function shareCurrent() {
  if (!currentTrack || !currentTrack.id) return;
  const url = location.origin + (currentTrack._album_id ? '/album.html?id=' + currentTrack._album_id : '/track.html?id=' + currentTrack.id);
  if (navigator.share) navigator.share({ title: currentTrack.title, url }).catch(() => {});
  else navigator.clipboard.writeText(url).then(() => { if (typeof showAlert === 'function') showAlert('Link copied', 'success'); }).catch(() => {});
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
function _closeSheet() { document.querySelectorAll('.wv-sheet, .wv-sheet-overlay').forEach(el => el.remove()); }
function _sheet(title, opts, current, onPick) {
  _closeSheet();
  const ov = document.createElement('div'); ov.className = 'wv-sheet-overlay'; ov.onclick = _closeSheet;
  const sh = document.createElement('div'); sh.className = 'wv-sheet';
  sh.innerHTML = '<div class="wv-sheet-title">' + title + '</div><div class="wv-sheet-opts">' +
    opts.map(o => '<button class="' + (o.v === current ? 'on' : '') + '" data-v="' + o.v + '">' + o.l + '</button>').join('') + '</div>';
  sh.querySelectorAll('button').forEach(b => b.onclick = () => { onPick(b.dataset.v); _closeSheet(); });
  document.body.appendChild(ov); document.body.appendChild(sh);
}
function setPlaybackSpeed(v) {
  v = parseFloat(v) || 1;
  if (audio) audio.playbackRate = v;
  localStorage.setItem('wv_speed', String(v));
  document.querySelectorAll('#player-speed-btn, #pfs-speed-lbl').forEach(el => { el.textContent = v + '×'; });
  document.querySelectorAll('#player-speed-btn, #pfs-speed-btn').forEach(el => el.classList.toggle('on', v !== 1));
}
function openSpeedSheet() {
  const cur = audio ? audio.playbackRate : 1;
  _sheet('Playback speed', SPEEDS.map(v => ({ v, l: v + '×' })), cur, setPlaybackSpeed);
}
var _sleepAt = 0, _sleepTimer = null;
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
  min = parseInt(min, 10) || 0;
  clearInterval(_sleepTimer); _sleepTimer = null;
  document.querySelectorAll('#player-timer-btn, #pfs-timer-btn').forEach(el => el.classList.toggle('on', min > 0));
  if (!min) { _sleepAt = 0; const b = document.getElementById('player-timer-badge'); if (b) { b.textContent = ''; b.style.display = 'none'; } const l = document.getElementById('pfs-timer-lbl'); if (l) l.textContent = 'Timer'; return; }
  _sleepAt = Date.now() + min * 60000;
  _sleepTimer = setInterval(_tickSleep, 5000); _tickSleep();
}
function openTimerSheet() {
  const left = _sleepAt ? Math.ceil((_sleepAt - Date.now()) / 60000) : 0;
  _sheet('Sleep timer' + (left ? ' · ' + left + ' min left' : ''),
    [{ v: 0, l: 'Off' }, { v: 15, l: '15 min' }, { v: 30, l: '30 min' }, { v: 45, l: '45 min' }, { v: 60, l: '1 hour' }, { v: 90, l: '1.5 hours' }],
    left ? null : 0, setSleepTimer);
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
        <div class="progress-bar" id="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <span class="player-time" id="time-total">0:00</span>
      </div>
    </div>
    <!-- Desktop right: tools + volume -->
    <div class="player-volume">
      <button class="player-btn player-icon-btn" id="player-lyrics-btn" onclick="openFullPlayer(true)" title="Lyrics">
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="2.4" rx="1.2"/><rect x="3" y="10.8" width="13" height="2.4" rx="1.2"/><rect x="3" y="16.6" width="16" height="2.4" rx="1.2"/></svg>
      </button>
      <button class="player-btn player-icon-btn player-speed" id="player-speed-btn" onclick="openSpeedSheet()" title="Playback speed">1×</button>
      <button class="player-btn player-icon-btn player-timer" id="player-timer-btn" onclick="openTimerSheet()" title="Sleep timer">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3h2v5.3l3.8 2.2-1 1.7L11 13.2Z"/></svg>
      </button>
      <button class="player-btn player-icon-btn" onclick="toggleMute()" id="vol-icon-btn" title="Volume">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      </button>
      <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.02" value="0.8">
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
            <div class="pfs-lyrics-scroll" id="pfs-lyrics-scroll"></div>
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
          <div class="pfs-volume">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
            <input type="range" class="volume-slider pfs-vol-slider" id="pfs-volume" min="0" max="1" step="0.02" value="0.8">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
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
  qp.innerHTML = `
    <div class="wv-queue-head">
      <span class="wv-queue-title">Up Next</span>
      <span class="wv-queue-count" id="wv-queue-count"></span>
      <button class="wv-queue-clear" onclick="clearPlayerQueue()">Clear</button>
      <button class="wv-queue-close" onclick="toggleQueuePanel()" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
    <div class="wv-queue-list" id="wv-queue-list"></div>
  `;
  document.body.appendChild(qp);
  _renderQueuePanel();
}

// ── Up Next queue panel ──────────────────────────────────────────────────────
function toggleQueuePanel() {
  const qp = document.getElementById('wv-queue-panel');
  if (!qp) return;
  const open = qp.classList.toggle('open');
  const btn = document.getElementById('player-queue-btn');
  if (btn) btn.classList.toggle('player-icon-active', open);
  if (open) _renderQueuePanel();
}

function clearPlayerQueue() {
  _pq = [];
  _pqIdx = -1;
  _pqOnChange = null;
  _renderQueuePanel();
}

function removeQueueItem(i) {
  if (i < 0 || i >= _pq.length) return;
  _pq.splice(i, 1);
  if (i < _pqIdx) _pqIdx--;
  else if (i === _pqIdx) _pqIdx = Math.min(_pqIdx, _pq.length - 1); // keep playing current audio
  _renderQueuePanel();
}

function _renderQueuePanel() {
  const list = document.getElementById('wv-queue-list');
  const count = document.getElementById('wv-queue-count');
  if (!list) return;
  if (count) count.textContent = _pq.length ? _pq.length + (_pq.length === 1 ? ' track' : ' tracks') : '';

  if (!_pq.length) {
    list.innerHTML = '<div class="wv-queue-empty">Queue is empty — play a comp or playlist.</div>';
    return;
  }

  list.innerHTML = _pq.map((t, i) => {
    const isNow = i === _pqIdx;
    const cover = t.cover_url
      ? `<img src="${_esc(t.cover_url)}" alt="" loading="lazy">`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    const artist = t.artist_name || (t.artists && t.artists.display_name) || '';
    return `<div class="wv-queue-row${isNow ? ' now' : ''}" onclick="playQueueIndex(${i})">
      <div class="wv-queue-cover">${cover}</div>
      <div class="wv-queue-meta">
        <div class="wv-queue-row-title">${_esc(t.title || '—')}</div>
        <div class="wv-queue-row-artist">${_esc(artist)}</div>
      </div>
      ${isNow
        ? '<span class="wv-queue-now-dot" title="Now playing"></span>'
        : `<button class="wv-queue-remove" onclick="event.stopPropagation();removeQueueItem(${i})" aria-label="Remove from queue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>`}
    </div>`;
  }).join('');

  // Keep the now-playing row in view when the panel is open
  const qp = document.getElementById('wv-queue-panel');
  if (qp && qp.classList.contains('open')) {
    const nowRow = list.querySelector('.wv-queue-row.now');
    if (nowRow) nowRow.scrollIntoView({ block: 'nearest' });
  }
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
  qp.classList.remove('open');
  const qbtn = document.getElementById('player-queue-btn');
  if (qbtn) qbtn.classList.remove('player-icon-active');
});

let _shuffle = false;
let _repeat = false;
let _muted = false;

function toggleShuffle() {
  _shuffle = !_shuffle;
  const btns = [document.getElementById('player-shuffle-btn'), document.getElementById('pfs-shuffle')];
  btns.forEach(b => b && b.classList.toggle('player-icon-active', _shuffle));
}

function toggleRepeat() {
  _repeat = !_repeat;
  const btns = [document.getElementById('player-repeat-btn'), document.getElementById('pfs-repeat')];
  btns.forEach(b => b && b.classList.toggle('player-icon-active', _repeat));
  if (audio) audio.loop = _repeat;
}

function toggleMute() {
  if (!audio) return;
  _muted = !_muted;
  audio.muted = _muted;
}

function skipPrev() {
  if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (_pq.length && _pqIdx >= 0) {
    if (_pqIdx > 0) window.playQueueIndex(_pqIdx - 1);
    return;
  }
  document.dispatchEvent(new CustomEvent('playerSkipPrev'));
}

function skipNext() {
  if (_pq.length && _pqIdx >= 0) {
    if (_pqIdx < _pq.length - 1) window.playQueueIndex(_pqIdx + 1);
    return;
  }
  document.dispatchEvent(new CustomEvent('playerSkipNext'));
}

function openFullPlayer(withLyrics) {
  const fs = document.getElementById('player-fullscreen');
  if (!fs) return;
  fs.classList.add('open'); document.body.style.overflow = 'hidden';
  fs.className = fs.className.replace(/theme-\w+/g, '') + ' ' + (document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dark');
  _paintFsWash();
  if (withLyrics === true && !_lyr.open && typeof toggleLyricsView === 'function') toggleLyricsView();
}
function _paintFsWash() {
  const fs = document.getElementById('player-fullscreen');
  if (!fs || !currentTrack) return;
  const seed = currentTrack.title || '';
  const apply = c => {
    const light = document.body.classList.contains('theme-light');
    fs.style.setProperty('--wv-wash', light ? 'hsl(' + c.h1 + ',' + Math.min(60, c.s1) + '%,82%)' : 'hsl(' + c.h1 + ',' + Math.min(55, c.s1) + '%,26%)');
  };
  if (currentTrack.cover_url && typeof extractCoverHues === 'function') extractCoverHues(currentTrack.cover_url, seed, apply);
  else if (typeof coverHues === 'function') apply(coverHues(seed));
}

function closeFullPlayer() {
  const fs = document.getElementById('player-fullscreen');
  if (fs) { fs.classList.remove('open'); document.body.style.overflow = ''; }
}

function initPlayer() {
  if (window._playerInited) return;
  window._playerInited = true;
  injectPlayer();

  audio = new Audio();
  audio.volume = 0.8;
  audio.loop = _repeat;
  setPlaybackSpeed(parseFloat(localStorage.getItem('wv_speed')) || 1);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { _closeSheet(); const f = document.getElementById('player-fullscreen'); if (f && f.classList.contains('open')) closeFullPlayer(); } });

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

  // Progress bar interactions
  ['progress-bar', 'pfs-progress-bar'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = document.getElementById(id).getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  });

  // Volume sliders
  ['volume-slider', 'pfs-volume'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => {
      audio.volume = parseFloat(e.target.value);
      // Sync both sliders
      ['volume-slider', 'pfs-volume'].forEach(sid => {
        const el = document.getElementById(sid);
        if (el) el.value = e.target.value;
      });
    });
  });

  audio.addEventListener('timeupdate', _onTimeUpdate);
  audio.addEventListener('loadedmetadata', _onTimeUpdate);
  audio.addEventListener('ended', () => {
    _setPlayBtns(false);
    if (!(_pq.length && _pqIdx >= 0 && _pqIdx < _pq.length - 1)) _wantPlaying = false;
    document.dispatchEvent(new CustomEvent('trackEnded', { detail: currentTrack }));
    // Auto-advance: prefer the global queue; fall back to the legacy event for
    // pages (e.g. resources/tracker) that manage their own list.
    if (_pq.length && _pqIdx >= 0) {
      if (_pqIdx < _pq.length - 1) window.playQueueIndex(_pqIdx + 1);
    } else {
      document.dispatchEvent(new CustomEvent('playerSkipNext'));
    }
  });
  audio.addEventListener('play', () => _setPlayBtns(true));
  audio.addEventListener('pause', () => _setPlayBtns(false));
  audio.addEventListener('error', () => console.error('Audio error:', audio.src));
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
  // Update thumb position — CSS uses --pct on .progress-bar::after
  const pb = document.getElementById('progress-bar');
  const pfsPb = document.getElementById('pfs-progress-bar');
  if (pb) pb.style.setProperty('--pct', pct);
  if (pfsPb) pfsPb.style.setProperty('--pct', pct);
  if (currentTrack) {
    currentTrack._savedTime = audio.currentTime;
    localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));
  }
  if ('mediaSession' in navigator && audio.duration) {
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
var _lastPlayRegistered = { id: null, ts: 0 };
function registerPlay(trackId) {
  var now = Date.now();
  if (_lastPlayRegistered.id === trackId && now - _lastPlayRegistered.ts < 30000) return;
  _lastPlayRegistered = { id: trackId, ts: now };
  if (typeof api === 'function') {
    api('/tracks/' + trackId + '/play', { method: 'POST' }).catch(function() {});
  }
}

function playTrack(track) {
  const playerEl = document.getElementById('player');
  if (!playerEl || !audio) return;

  // A standalone play (not driven by the queue) clears any old queue so the OS
  // media controls don't skip back into a comp the user has moved on from.
  if (!_fromQueue) { _pq = []; _pqIdx = -1; _pqOnChange = null; _renderQueuePanel(); }

  currentTrack = { ...track, _savedTime: 0 };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));

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
  if (history.length > 30) history = history.slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
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
  _wantPlaying = true;
  const p = audio.play();
  if (p) p.catch(() => {});

  // Register the stream. This is what actually counts a play — opening a
  // detail page no longer inflates the count, so comps and album tracks
  // accumulate real streams when listened to (here, not on page view).
  if (track.id) registerPlay(track.id);

  _renderAll(track);
  playerEl.classList.remove('hidden');

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || '',
      artist: track.artist_name || track.artists?.display_name || '',
      artwork: track.cover_url ? [{ src: track.cover_url, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => { _wantPlaying = true; audio.play(); });
    navigator.mediaSession.setActionHandler('pause', () => { _wantPlaying = false; audio.pause(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => skipPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => skipNext());
    navigator.mediaSession.setActionHandler('seekbackward', e => { audio.currentTime -= e.seekOffset || 10; });
    navigator.mediaSession.setActionHandler('seekforward', e => { audio.currentTime += e.seekOffset || 10; });
  }
}

function _renderAll(track) {
  const title = track.title || '—';
  const artist = track.artist_name || track.artists?.display_name || '—';
  const cover = track.cover_url;
  const seed = track.title || '';

  // Gradient cover (design uses color gradients seeded by track title)
  const bg = (typeof coverGradient === 'function') ? coverGradient(seed) : '#333';
  const gloss = '';
  const imgOver = cover ? `<img src="${_esc(cover)}" alt="cover" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.style.opacity=0">` : '';
  const coverHtml = `<div style="position:absolute;inset:0;background:${bg};border-radius:inherit;overflow:hidden;">${gloss}${imgOver}</div>`;
  const largeCoverHtml = coverHtml;

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
  const ctx = document.getElementById('pfs-context');
  if (ctx) ctx.textContent = track._album_title ? 'From ' + track._album_title : (artist !== '—' ? artist : 'wavernrs');
  _refreshLike();
  const fsEl = document.getElementById('player-fullscreen');
  if (fsEl && fsEl.classList.contains('open')) _paintFsWash();
}

// Whether the listener wants sound. In-app browsers (Discord, Instagram,
// Facebook) and some Android WebViews pause media the moment the app leaves
// the foreground and never resume it. When the page comes back and this is
// still true but the element is paused, playback picks up where it stopped.
let _wantPlaying = false;
function togglePlay() {
  if (!audio) return;
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
  el.innerHTML = '<span>You\'re in another app\'s browser, which stops music when you switch away. <a href="' + open + '" target="_blank" rel="noopener">Open in your browser</a> to keep playing in the background.</span>' +
    '<button aria-label="Dismiss" onclick="localStorage.setItem(\'wv_inapp_hint\',\'off\');this.parentNode.remove()">×</button>';
  wrap.insertAdjacentElement('afterend', el);
}

function _setPlayBtns(playing) {
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
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (!audio) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if ((e.key === 'ArrowRight' || e.key === 'l') && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 10);
  } else if ((e.key === 'ArrowLeft' || e.key === 'j') && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  } else if (e.key === 'ArrowRight' && e.shiftKey) {
    skipNext();
  } else if (e.key === 'ArrowLeft' && e.shiftKey) {
    skipPrev();
  } else if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
    toggleMute();
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

function _syncLyrics(t) {
  if (!_lyr.open || _lyr.mode !== 'view' || !_lyr.lines.length) return;
  var i = _lyrIndexAt(t);
  if (i === _lyr.idx) return;
  _lyr.idx = i;
  var scroll = _lyrEl('pfs-lyrics-scroll');
  if (!scroll) return;
  scroll.querySelectorAll('.lyr-line').forEach(function (el, n) {
    el.classList.toggle('on', n === i);
    el.classList.toggle('past', n < i);
  });
  var active = scroll.children[i];
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
            ? 'Generate them from the audio — it takes about a minute.'
            : 'Lyrics haven\'t been generated for this track yet.') +
        '</div>' +
      '</div>';
  } else {
    scroll.innerHTML = _lyr.lines.map(function (l, i) {
      return '<div class="lyr-line" onclick="seekToLyric(' + i + ')">' + escHtml(l.x) + '</div>';
    }).join('');
    _lyr.idx = -1;
    _syncLyrics(audio ? audio.currentTime : 0);
  }

  if (tools) {
    if (_lyr.canEdit) {
      tools.hidden = false;
      tools.innerHTML =
        '<button class="lyr-tool" onclick="autoGenerateLyrics(this)">' + (_lyr.lines.length ? 'Regenerate' : 'Get lyrics') + '</button>' +
        (_lyr.source ? '<span class="lyr-src">' + (_lyr.source === 'auto' ? 'auto-generated' : 'artist-provided') + '</span>' : '');
    } else {
      tools.hidden = !_lyr.source;
      tools.innerHTML = _lyr.source
        ? '<span class="lyr-src">' + (_lyr.source === 'auto' ? 'auto-generated — may contain mistakes'
            : (_lyr.source === 'embedded' ? 'from the file' : 'artist-provided')) + '</span>'
        : '';
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
  _lyr.lines = [];
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
      _lyr.canEdit = !!d.can_edit;
      _lyr.source = d.source;
      _renderLyrics();
    })
    .catch(function () { _renderLyrics(); });
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
      '<div class="lyr-edit-hint">One line per line. Save, then use <b>Sync</b> to tap the timings in as it plays.</div>' +
      '<textarea id="lyr-text" class="lyr-textarea" placeholder="Type or paste the lyrics…">' + escHtml(text) + '</textarea>' +
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
  if (!texts.length) { alert('Add some lines first.'); return; }
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
      if (!res.ok) { alert(res.d.error || 'Could not save lyrics'); return; }
      _lyr.lines = res.d.lines || lines;
      _lyr.source = 'manual';
      _lyr.mode = 'view';
      _renderLyrics();
    })
    .catch(function () { alert('Could not save lyrics'); });
}

window.autoGenerateLyrics = function (btn) {
  var tok = localStorage.getItem('token');
  if (!tok || !_lyr.trackId) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Listening…'; }
  fetch(API_BASE + '/lyrics/' + encodeURIComponent(_lyr.trackId) + '/auto', {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + tok },
  })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (!res.ok) {
        alert(res.d.error || 'Could not get lyrics');
        if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; }
        return;
      }
      // The file already carried them — nothing to wait for.
      if (res.d.status === 'succeeded') {
        _lyr.lines = res.d.lines || [];
        _lyr.source = 'embedded';
        _lyr.mode = 'view';
        _renderLyrics();
        if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; }
        if (!res.d.synced) {
          alert('Found the words saved inside the file, but no timings — use Edit → Sync timings to tap them in.');
        }
        return;
      }
      var tries = 0;
      var poll = setInterval(function () {
        tries++;
        fetch(API_BASE + '/lyrics/job/' + res.d.id, { headers: { 'Authorization': 'Bearer ' + tok } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            if (!j) return;
            if (j.status === 'succeeded') {
              clearInterval(poll);
              _lyr.lines = j.lines || [];
              _lyr.source = 'auto';
              _lyr.mode = 'view';
              _renderLyrics();
            } else if (j.status === 'failed' || tries > 150) {
              clearInterval(poll);
              alert(j.error || 'Transcription timed out');
              if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; }
            }
          })
          .catch(function () {});
      }, 4000);
    })
    .catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Get lyrics'; }
    });
};
