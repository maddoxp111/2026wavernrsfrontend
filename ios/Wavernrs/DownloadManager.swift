import Foundation
import Combine
import UIKit

// Local downloads — like other streaming services' offline mode. Audio files
// and covers are stored in Documents (backed up, survives app restarts) and a
// JSON index carries the metadata so everything plays with no network at all.
@MainActor
final class DownloadManager: ObservableObject {
    static let shared = DownloadManager()

    @Published private(set) var items: [PlayableTrack] = []
    @Published private(set) var progress: [String: Double] = [:]   // trackId → 0…1
    @Published private(set) var queued: Set<String> = []

    private let fm = FileManager.default
    private var coverCache: [String: UIImage] = [:]

    private var docs: URL { fm.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    private var audioDir: URL { docs.appendingPathComponent("Downloads", isDirectory: true) }
    private var coverDir: URL { docs.appendingPathComponent("Covers", isDirectory: true) }
    private var indexFile: URL { docs.appendingPathComponent("downloads.json") }

    private init() {
        try? fm.createDirectory(at: audioDir, withIntermediateDirectories: true)
        try? fm.createDirectory(at: coverDir, withIntermediateDirectories: true)
        loadIndex()
    }

    // ── Index persistence ────────────────────────────────────────────────────

    private func loadIndex() {
        guard let data = try? Data(contentsOf: indexFile),
              let saved = try? JSONDecoder().decode([PlayableTrack].self, from: data) else { return }
        // Older builds saved audio as "<id>.audio", which AVPlayer can't sniff
        // a format from — rename those to the track's real extension.
        for item in saved {
            let legacy = audioDir.appendingPathComponent(item.id + ".audio")
            if fm.fileExists(atPath: legacy.path) {
                let fixed = audioFile(for: item.id, remoteUrl: item.remoteAudioUrl)
                try? fm.moveItem(at: legacy, to: fixed)
            }
        }
        // Drop entries whose audio file went missing.
        items = saved.filter { localAudioURL(trackId: $0.id) != nil }
    }

    private func saveIndex() {
        if let data = try? JSONEncoder().encode(items) {
            try? data.write(to: indexFile, options: .atomic)
        }
    }

    // ── Paths / lookups ──────────────────────────────────────────────────────

    // AVPlayer infers the audio format from the file extension, so files are
    // stored with the extension of the source URL (falling back to mp3).
    private func audioFile(for trackId: String, remoteUrl: String?) -> URL {
        var ext = (remoteUrl.flatMap(URL.init(string:))?.pathExtension ?? "").lowercased()
        if ext.isEmpty || ext.count > 5 { ext = "mp3" }
        return audioDir.appendingPathComponent(trackId + "." + ext)
    }

    private func coverFile(for trackId: String) -> URL {
        coverDir.appendingPathComponent(trackId + ".img")
    }

    func isDownloaded(trackId: String) -> Bool {
        items.contains { $0.id == trackId }
    }

    func isBusy(trackId: String) -> Bool {
        queued.contains(trackId) || progress[trackId] != nil
    }

    func localAudioURL(trackId: String) -> URL? {
        let names = (try? fm.contentsOfDirectory(atPath: audioDir.path)) ?? []
        guard let match = names.first(where: { $0.hasPrefix(trackId + ".") }) else { return nil }
        return audioDir.appendingPathComponent(match)
    }

    // Cheap synchronous read used by CoverArt (always called from view bodies,
    // which run on the main actor); cached after first load.
    func localCoverImage(trackId: String) -> UIImage? {
        if let cached = coverCache[trackId] { return cached }
        let f = coverFile(for: trackId)
        guard let data = try? Data(contentsOf: f), let img = UIImage(data: data) else { return nil }
        coverCache[trackId] = img
        return img
    }

    // Downloads grouped by comp for the Downloads screen.
    var grouped: [(key: String, title: String, tracks: [PlayableTrack])] {
        var buckets: [String: [PlayableTrack]] = [:]
        for item in items {
            buckets[item.albumId ?? "singles", default: []].append(item)
        }
        return buckets.map { key, tracks in
            let sorted = tracks.sorted { $0.position < $1.position }
            let title = key == "singles" ? "Singles" : (sorted.first?.albumTitle ?? "Comp")
            return (key: key, title: title, tracks: sorted)
        }.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    // ── Downloading ──────────────────────────────────────────────────────────

    func download(_ playable: PlayableTrack) {
        guard !isDownloaded(trackId: playable.id), !isBusy(trackId: playable.id),
              let audioStr = playable.remoteAudioUrl, let audioUrl = URL(string: audioStr) else { return }
        queued.insert(playable.id)
        Task {
            await self.run(playable, audioUrl: audioUrl)
        }
    }

    func downloadAlbum(_ album: Album) {
        for track in album.sortedTracks {
            download(PlayableTrack(track: track, album: album))
        }
    }

    private func run(_ playable: PlayableTrack, audioUrl: URL) async {
        progress[playable.id] = 0
        queued.remove(playable.id)
        defer { progress[playable.id] = nil }

        do {
            // Audio — streamed to a temp file by URLSession, then moved in place.
            let (tmp, resp) = try await URLSession.shared.download(from: audioUrl, delegate: nil)
            if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                throw URLError(.badServerResponse)
            }
            let dest = audioFile(for: playable.id, remoteUrl: playable.remoteAudioUrl)
            try? fm.removeItem(at: dest)
            try fm.moveItem(at: tmp, to: dest)
            progress[playable.id] = 0.9

            // Cover — best effort; playback works without it.
            if let coverStr = playable.remoteCoverUrl, let coverUrl = URL(string: coverStr),
               let (data, _) = try? await URLSession.shared.data(from: coverUrl) {
                try? data.write(to: coverFile(for: playable.id), options: .atomic)
            }

            if !items.contains(where: { $0.id == playable.id }) {
                items.append(playable)
                saveIndex()
            }
        } catch {
            // Leave nothing half-written.
            if let f = localAudioURL(trackId: playable.id) { try? fm.removeItem(at: f) }
        }
    }

    // ── Deletion ─────────────────────────────────────────────────────────────

    func delete(trackId: String) {
        if let f = localAudioURL(trackId: trackId) { try? fm.removeItem(at: f) }
        try? fm.removeItem(at: coverFile(for: trackId))
        coverCache[trackId] = nil
        items.removeAll { $0.id == trackId }
        saveIndex()
    }

    func deleteGroup(albumKey: String) {
        let ids = items.filter { ($0.albumId ?? "singles") == albumKey }.map(\.id)
        for id in ids { delete(trackId: id) }
    }
}
