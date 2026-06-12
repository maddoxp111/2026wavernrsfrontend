import Foundation
import Combine
import AVFoundation
import MediaPlayer
import UIKit

@MainActor
final class PlayerManager: ObservableObject {
    static let shared = PlayerManager()

    @Published private(set) var queue: [PlayableTrack] = []
    @Published private(set) var index: Int = 0
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: Double = 0
    @Published private(set) var duration: Double = 0
    // Last 4 unique tracks played — persisted across launches.
    @Published private(set) var recentlyPlayed: [PlayableTrack] = []

    var current: PlayableTrack? {
        queue.indices.contains(index) ? queue[index] : nil
    }

    private let player = AVPlayer()
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private let recentKey = "wv_recently_played"

    private init() {
        // Restore recently played list.
        if let data = UserDefaults.standard.data(forKey: recentKey),
           let saved = try? JSONDecoder().decode([PlayableTrack].self, from: data) {
            recentlyPlayed = saved
        }

        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)

        timeObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main
        ) { [weak self] time in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.currentTime = time.seconds
                if let d = self.player.currentItem?.duration.seconds, d.isFinite {
                    self.duration = d
                }
                self.updateNowPlayingElapsed()
            }
        }

        setupRemoteCommands()
    }

    // ── Public controls ──────────────────────────────────────────────────────

    func play(queue tracks: [PlayableTrack], startAt: Int = 0) {
        guard !tracks.isEmpty else { return }
        queue = tracks
        index = min(max(0, startAt), tracks.count - 1)
        loadCurrent(autoplay: true)
    }

    func togglePlayPause() {
        if isPlaying { pause() } else { resume() }
    }

    func resume() {
        try? AVAudioSession.sharedInstance().setActive(true)
        player.play(); isPlaying = true
        updateNowPlayingElapsed()
    }

    func pause() {
        player.pause(); isPlaying = false
        updateNowPlayingElapsed()
    }

    func next() {
        guard index + 1 < queue.count else { return }
        index += 1
        loadCurrent(autoplay: true)
    }

    func previous() {
        if currentTime > 3 || index == 0 {
            seek(to: 0)
        } else {
            index -= 1
            loadCurrent(autoplay: true)
        }
    }

    func seek(to seconds: Double) {
        player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600))
        currentTime = seconds
        updateNowPlayingElapsed()
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private func loadCurrent(autoplay: Bool) {
        guard let track = current else { return }

        let url: URL
        if let local = DownloadManager.shared.localAudioURL(trackId: track.id) {
            url = local
        } else if let remote = track.remoteAudioUrl.flatMap(URL.init(string:)) {
            url = remote
        } else {
            return
        }

        if let old = endObserver { NotificationCenter.default.removeObserver(old) }
        let item = AVPlayerItem(url: url)
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if self.index + 1 < self.queue.count { self.next() }
                else { self.isPlaying = false; self.seek(to: 0); self.player.pause() }
            }
        }

        player.replaceCurrentItem(with: item)
        currentTime = 0
        duration = 0
        if autoplay {
            // Ensure the session is live so iOS hands us the now-playing slot.
            try? AVAudioSession.sharedInstance().setActive(true)
            player.play(); isPlaying = true
        }

        addToRecentlyPlayed(track)
        API.reportPlay(trackId: track.id)
        updateNowPlayingInfo(for: track)
    }

    private func addToRecentlyPlayed(_ track: PlayableTrack) {
        var updated = recentlyPlayed.filter { $0.id != track.id }
        updated.insert(track, at: 0)
        recentlyPlayed = Array(updated.prefix(4))
        if let data = try? JSONEncoder().encode(recentlyPlayed) {
            UserDefaults.standard.set(data, forKey: recentKey)
        }
    }

    // ── Lock screen / control center ─────────────────────────────────────────

    private func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()

        // Commands iOS should surface in Control Center / lock screen.
        center.playCommand.isEnabled = true
        center.pauseCommand.isEnabled = true
        center.nextTrackCommand.isEnabled = true
        center.previousTrackCommand.isEnabled = true
        center.changePlaybackPositionCommand.isEnabled = true
        // Disable the ones we don't handle so they don't take over the UI.
        center.seekForwardCommand.isEnabled = false
        center.seekBackwardCommand.isEnabled = false
        center.skipForwardCommand.isEnabled = false
        center.skipBackwardCommand.isEnabled = false

        center.playCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.resume() }; return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.pause() }; return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.togglePlayPause() }; return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.next() }; return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.previous() }; return .success
        }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            if let e = event as? MPChangePlaybackPositionCommandEvent {
                Task { @MainActor in self?.seek(to: e.positionTime) }
            }
            return .success
        }
    }

    private func updateNowPlayingInfo(for track: PlayableTrack) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: track.title,
            MPMediaItemPropertyArtist: track.artistName,
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: 1.0,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: currentTime,
        ]
        if let album = track.albumTitle { info[MPMediaItemPropertyAlbumTitle] = album }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        Task { [weak self] in
            guard let self else { return }
            var image = DownloadManager.shared.localCoverImage(trackId: track.id)
            if image == nil, let s = track.remoteCoverUrl, let url = URL(string: s),
               let (data, _) = try? await URLSession.shared.data(from: url) {
                image = UIImage(data: data)
            }
            guard let img = image, self.current?.id == track.id else { return }
            var current = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
            current[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: img.size) { _ in img }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = current
        }
    }

    private func updateNowPlayingElapsed() {
        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPMediaItemPropertyPlaybackDuration] = duration
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
}
