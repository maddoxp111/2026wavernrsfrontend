// ── PLAYER ──
// Persists current track in localStorage so it survives page navigation.

const PLAYER_KEY = 'player_current';

let audio = null;
let currentTrack = null;

// iOS audio unlock: play a silent sound on first touch to unlock audio
let _iosUnlocked = false;
function _unlockIOS() {
  if (_iosUnlocked) return;
  _iosUnlocked = true;
  if (!audio) return;
  const savedSrc = audio.src;
  const savedTime = audio.currentTime;
  const wasPaused = audio.paused;
  audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  audio.volume = 0;
  audio.play().then(() => {
    audio.pause();
    audio.src = savedSrc;
    audio.currentTime = savedTime;
    audio.volume = 0.8;
    if (!wasPaused && savedSrc) audio.play().catch(() => {});
  }).catch(() => {
    audio.src = savedSrc;
    audio.currentTime = savedTime;
    audio.volume = 0.8;
  });
  document.removeEventListener('touchstart', _unlockIOS);
  document.removeEventListener('touchend', _unlockIOS);
}

function initPlayer() {
  const playerEl = document.getElementById('player');
  if (!playerEl) return;

  audio = new Audio();
  audio.volume = 0.8;

  // iOS unlock on first touch
  document.addEventListener('touchstart', _unlockIOS, { once: true, passive: true });
  document.addEventListener('touchend', _unlockIOS, { once: true, passive: true });

  // Restore track from localStorage (page navigation)
  const saved = localStorage.getItem(PLAYER_KEY);
  if (saved) {
    try {
      const t = JSON.parse(saved);
      currentTrack = t;
      renderPlayerTrack(t);
      audio.src = t.ia_url;
      audio.currentTime = t._savedTime || 0;
      playerEl.classList.remove('hidden');
    } catch (_) {}
  }

  // Progress bar click
  const bar = document.getElementById('progress-bar');
  bar?.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  // Volume slider
  const vol = document.getElementById('volume-slider');
  vol?.addEventListener('input', () => { audio.volume = vol.value; });

  // Audio events
  audio.addEventListener('timeupdate', () => {
    const fill = document.getElementById('progress-fill');
    const elapsed = document.getElementById('time-elapsed');
    const total = document.getElementById('time-total');
    if (fill && audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    if (elapsed) elapsed.textContent = fmtTime(audio.currentTime);
    if (total) total.textContent = fmtTime(audio.duration);
    // Save position periodically
    if (currentTrack) {
      currentTrack._savedTime = audio.currentTime;
      localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));
    }
  });

  audio.addEventListener('ended', () => {
    setPlayBtn(false);
    // Fire custom event so album pages can auto-advance
    document.dispatchEvent(new CustomEvent('trackEnded', { detail: currentTrack }));
  });
  audio.addEventListener('play', () => setPlayBtn(true));
  audio.addEventListener('pause', () => setPlayBtn(false));
  audio.addEventListener('error', () => {
    console.error('Audio error for:', audio.src);
  });
}

function playTrack(track) {
  const playerEl = document.getElementById('player');
  if (!playerEl || !audio) return;

  currentTrack = { ...track, _savedTime: 0 };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(currentTrack));

  // Maintain recently_played list (max 8, no duplicates)
  const HISTORY_KEY = 'recently_played';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }
  history = history.filter(h => h.id !== track.id);
  history.unshift({ ...track, _savedTime: undefined });
  if (history.length > 8) history = history.slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  audio.src = track.ia_url;
  audio.currentTime = 0;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      if (err.name === 'NotAllowedError') {
        // Show tap-to-play overlay
        _showTapToPlay();
      } else {
        console.error(err);
      }
    });
  }

  renderPlayerTrack(track);
  playerEl.classList.remove('hidden');
}

function _showTapToPlay() {
  let overlay = document.getElementById('tap-to-play-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tap-to-play-overlay';
    overlay.style.cssText = 'position:fixed;bottom:calc(var(--player-height) + 12px);left:50%;transform:translateX(-50%);background:var(--purple);color:white;padding:10px 20px;border-radius:24px;font-size:14px;font-weight:600;cursor:pointer;z-index:250;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
    overlay.textContent = 'Tap to play';
    overlay.addEventListener('click', () => {
      togglePlay();
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }
}

function renderPlayerTrack(track) {
  const titleEl = document.getElementById('player-title');
  const artistEl = document.getElementById('player-artist');
  const coverEl = document.getElementById('player-cover');

  if (titleEl) titleEl.textContent = track.title || 'Unknown';
  if (artistEl) artistEl.textContent = track.artist_name || track.artists?.display_name || 'Unknown Artist';
  if (coverEl) {
    coverEl.innerHTML = track.cover_url
      ? `<img src="${track.cover_url}" alt="cover">`
      : '🎵';
  }
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) audio.play().catch(console.error);
  else audio.pause();
}

function setPlayBtn(playing) {
  const btn = document.getElementById('player-play-btn');
  if (btn) btn.innerHTML = playing ? pauseIcon() : playIcon();
}

function playIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
}

function pauseIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
}
