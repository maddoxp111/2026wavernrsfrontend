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
};

window.playQueueIndex = function (idx) {
  if (idx < 0 || idx >= _pq.length) return false;
  _pqIdx = idx;
  _fromQueue = true;
  playTrack(_pq[idx]);
  _fromQueue = false;
  if (_pqOnChange) { try { _pqOnChange(idx); } catch (_) {} }
  return true;
};

let _iosUnlocked = false;
function _unlockIOS() {
  if (_iosUnlocked || !audio) return;
  _iosUnlocked = true;
  const s = audio.src, t = audio.currentTime, p = audio.paused;
  audio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZFRlYW0gQ3JlYXRpdmUgQ29tbW9ucyBBdHRyaWJ1dGlvbgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//MUxAAKAdABQAAAAP//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  audio.volume = 0;
  audio.play().then(() => { audio.pause(); audio.src = s; audio.currentTime = t; audio.volume = 0.8; if (!p && s) audio.play().catch(()=>{}); }).catch(() => { audio.src = s; audio.currentTime = t; audio.volume = 0.8; });
  document.removeEventListener('touchstart', _unlockIOS);
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
      <div class="player-cover" id="player-cover">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="player-track-text">
        <div class="player-title" id="player-title">—</div>
        <div class="player-artist" id="player-artist">—</div>
      </div>
    </div>
    <!-- Desktop center: controls + progress -->
    <div class="player-center">
      <div class="player-controls">
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
      </div>
      <div class="player-progress">
        <span class="player-time" id="time-elapsed">0:00</span>
        <div class="progress-bar" id="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <span class="player-time" id="time-total">0:00</span>
      </div>
    </div>
    <!-- Desktop right: volume -->
    <div class="player-volume">
      <button class="player-btn player-icon-btn" onclick="toggleMute()" id="vol-icon-btn" title="Volume">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      </button>
      <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.02" value="0.8">
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
    <div class="pfs-header">
      <button class="pfs-close" onclick="closeFullPlayer()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
      </button>
      <span class="pfs-label">Now Playing</span>
      <div style="width:40px;"></div>
    </div>
    <div class="pfs-cover-wrap">
      <div class="pfs-cover" id="pfs-cover">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
    </div>
    <div class="pfs-info">
      <div class="pfs-title" id="pfs-title">—</div>
      <div class="pfs-artist" id="pfs-artist">—</div>
    </div>
    <div class="pfs-progress">
      <div class="progress-bar pfs-bar" id="pfs-progress-bar">
        <div class="progress-fill" id="pfs-fill"></div>
      </div>
      <div class="pfs-times">
        <span id="pfs-elapsed">0:00</span>
        <span id="pfs-total">0:00</span>
      </div>
    </div>
    <div class="pfs-controls">
      <button class="player-btn player-icon-btn pfs-btn" id="pfs-shuffle" onclick="toggleShuffle()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
      </button>
      <button class="player-btn player-icon-btn pfs-btn" onclick="skipPrev()">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button class="player-btn player-btn-play pfs-play-btn" onclick="togglePlay()" id="pfs-play-btn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="player-btn player-icon-btn pfs-btn" onclick="skipNext()">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
      <button class="player-btn player-icon-btn pfs-btn" id="pfs-repeat" onclick="toggleRepeat()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
      </button>
    </div>
    <div class="pfs-volume">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5zm11-1.5v3c.51-.37.89-.86 1.1-1.5-.21-.64-.59-1.13-1.1-1.5z"/></svg>
      <input type="range" class="volume-slider pfs-vol-slider" id="pfs-volume" min="0" max="1" step="0.02" value="0.8">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-tertiary)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
    </div>
  `;
  document.body.appendChild(fs);
}

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

function openFullPlayer() {
  const fs = document.getElementById('player-fullscreen');
  if (fs) { fs.classList.add('open'); document.body.style.overflow = 'hidden'; }
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

  document.addEventListener('touchstart', _unlockIOS, { once: true, passive: true });

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
  audio.addEventListener('ended', () => {
    _setPlayBtns(false);
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
  if (!_fromQueue) { _pq = []; _pqIdx = -1; _pqOnChange = null; }

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
  if (history.length > 8) history = history.slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  // Cancel any pending restore-position listener so it doesn't seek this
  // new track to the previous session's position.
  if (_restoreCanplayFn) {
    audio.removeEventListener('canplay', _restoreCanplayFn);
    _restoreCanplayFn = null;
  }
  audio.src = track.ia_url;
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
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
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
  const gloss = '<div aria-hidden style="position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 20%,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 45%),radial-gradient(80% 80% at 80% 90%,rgba(0,0,0,0.28) 0%,rgba(0,0,0,0) 60%);pointer-events:none;border-radius:inherit;"></div>';
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
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) audio.play().catch(console.error);
  else audio.pause();
}

function pausePlayer() {
  if (audio && !audio.paused) audio.pause();
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
