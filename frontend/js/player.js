// ── PLAYER ──
// Persists current track in localStorage so it survives page navigation.

const PLAYER_KEY = 'player_current';

let audio = null;
let currentTrack = null;

function initPlayer() {
  const playerEl = document.getElementById('player');
  if (!playerEl) return;

  audio = new Audio();
  audio.volume = 0.8;

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

  audio.addEventListener('ended', () => setPlayBtn(false));
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

  audio.src = track.ia_url;
  audio.currentTime = 0;
  audio.play().catch(console.error);

  renderPlayerTrack(track);
  playerEl.classList.remove('hidden');
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
