import SwiftUI

struct AlbumView: View {
    let albumId: String
    @State private var album: Album?
    @State private var error: String?
    @State private var addToPlaylistTrack: PlayableTrack?
    @EnvironmentObject var player: PlayerManager
    @EnvironmentObject var downloads: DownloadManager

    var body: some View {
        ScrollView {
            if let album {
                VStack(spacing: 16) {
                    CoverArt(trackId: album.sortedTracks.first?.id, remoteUrl: album.coverUrl, corner: 16)
                        .frame(width: 220, height: 220)
                        .padding(.top, 16)

                    VStack(spacing: 4) {
                        Text(album.title ?? "Untitled")
                            .font(.system(size: 21, weight: .heavy))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)
                        if let artistId = album.artists?.id {
                            NavigationLink(value: NavTarget.artist(artistId)) {
                                Text(album.artistName)
                                    .font(.system(size: 14))
                                    .foregroundColor(Theme.accent)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Text(album.artistName)
                                .font(.system(size: 14))
                                .foregroundColor(Theme.text2)
                        }
                        if album.isArchive == true {
                            Text("ARCHIVE")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundColor(Theme.accent)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Theme.accent.opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }

                    HStack(spacing: 10) {
                        Button {
                            let q = album.sortedTracks.map { PlayableTrack(track: $0, album: album) }
                            player.play(queue: q)
                        } label: {
                            Label("Play", systemImage: "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .padding(.horizontal, 22).padding(.vertical, 10)
                                .background(Theme.accent)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }

                        Button {
                            downloads.downloadAlbum(album)
                        } label: {
                            Label(allDownloaded(album) ? "Downloaded" : "Download",
                                  systemImage: allDownloaded(album) ? "checkmark.circle.fill" : "arrow.down.circle")
                                .font(.system(size: 14, weight: .semibold))
                                .padding(.horizontal, 18).padding(.vertical, 10)
                                .background(Theme.card)
                                .foregroundColor(allDownloaded(album) ? Theme.accent : Theme.text)
                                .clipShape(Capsule())
                        }
                        .disabled(allDownloaded(album))
                    }

                    if let desc = album.description, !desc.isEmpty {
                        Text(desc)
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text2)
                            .padding(.horizontal, 20)
                    }

                    // Tracklist
                    VStack(spacing: 6) {
                        ForEach(Array(album.sortedTracks.enumerated()), id: \.element.id) { i, track in
                            AlbumTrackRow(album: album, track: track, index: i) {
                                addToPlaylistTrack = PlayableTrack(track: track, album: album)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 24)
                }
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                ProgressView().padding(.top, 100)
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .sheet(item: $addToPlaylistTrack) { track in
            AddToPlaylistSheet(trackId: track.id, trackTitle: track.title)
        }
        .task { await load() }
    }

    private func allDownloaded(_ album: Album) -> Bool {
        let tracks = album.sortedTracks
        return !tracks.isEmpty && tracks.allSatisfy { downloads.isDownloaded(trackId: $0.id) }
    }

    private func load() async {
        error = nil
        do { album = try await API.album(id: albumId) }
        catch { self.error = "Couldn't load this comp." }
    }
}

struct AlbumTrackRow: View {
    let album: Album
    let track: Track
    let index: Int
    var onAddToPlaylist: (() -> Void)? = nil
    @EnvironmentObject var player: PlayerManager
    @EnvironmentObject var downloads: DownloadManager

    var body: some View {
        HStack(spacing: 12) {
            Button {
                let q = album.sortedTracks.map { PlayableTrack(track: $0, album: album) }
                player.play(queue: q, startAt: index)
            } label: {
                HStack(spacing: 12) {
                    Text("\(index + 1)")
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundColor(isCurrent ? Theme.accent : Theme.text3)
                        .frame(width: 24)
                    Text(track.title ?? "Untitled")
                        .font(.system(size: 14, weight: isCurrent ? .bold : .regular))
                        .foregroundColor(isCurrent ? Theme.accent : Theme.text)
                        .lineLimit(1)
                    Spacer()
                }
            }

            // Per-track download state
            if downloads.isDownloaded(trackId: track.id) {
                Image(systemName: "arrow.down.circle.fill")
                    .foregroundColor(Theme.accent)
                    .font(.system(size: 16))
            } else if let p = downloads.progress[track.id] {
                ProgressView(value: p).frame(width: 22)
            } else if downloads.queued.contains(track.id) {
                Image(systemName: "clock")
                    .foregroundColor(Theme.text3)
                    .font(.system(size: 14))
            } else {
                Button {
                    downloads.download(PlayableTrack(track: track, album: album))
                } label: {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(Theme.text3)
                        .font(.system(size: 16))
                }
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(isCurrent ? Theme.card : .clear)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .contextMenu {
            Button {
                let q = album.sortedTracks.map { PlayableTrack(track: $0, album: album) }
                player.play(queue: q, startAt: index)
            } label: {
                Label("Play", systemImage: "play.fill")
            }
            if let onAddToPlaylist {
                Button { onAddToPlaylist() } label: {
                    Label("Add to Playlist", systemImage: "plus")
                }
            }
            Button {
                downloads.download(PlayableTrack(track: track, album: album))
            } label: {
                Label("Download", systemImage: "arrow.down.circle")
            }
            .disabled(downloads.isDownloaded(trackId: track.id))
        }
    }

    private var isCurrent: Bool { player.current?.id == track.id }
}
