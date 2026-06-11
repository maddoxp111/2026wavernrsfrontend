import Foundation
import AVFoundation
import MediaPlayer
import UIKit

// Queue-based audio player. Prefers a local download when one exists, so
// anything in Downloads plays fully offline. Publishes state for the mini bar
// and the full Now Playing screen, and drives the lock-screen controls.
@MainActor
final class PlayerManager: ObservableObject {
    static let shared = PlayerManager()

    @Published private(set) var queue: [PlayableTrack] = []
    @Published private(set) var index: Int = 0
    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: Double = 0
    @Published private(set) var duration: Double = 0

    var current: PlayableTrack? {
        queue.indices.contains(index) ? queue[index] : nil
    }

    private let player = AVPlayer()
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?

    private init() {
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
        if isPlaying { player.pause(); isPlaying = false }
        else { player.play(); isPlaying = true }
        updateNowPlayingElapsed()
    }

    func next() {
        guard index + 1 < queue.count else { return }
        index += 1
        loadCurrent(autoplay: true)
    }

    func previous() {
        // Standard behavior: restart the track unless we're near its start.
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

        // Offline copy wins; otherwise stream from IA.
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
        if autoplay { player.play(); isPlaying = true }

        API.reportPlay(trackId: track.id)
        updateNowPlayingInfo(for: track)
    }

    // ── Lock screen / control center ─────────────────────────────────────────

    private func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.togglePlayPause() }; return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
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
        ]
        if let album = track.albumTitle { info[MPMediaItemPropertyAlbumTitle] = album }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        // Artwork loads async (local first, then remote) and patches in after.
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
