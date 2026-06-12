import SwiftUI

// ── Mini player bar (bottom of every page) ──────────────────────────────────

struct MiniPlayerBar: View {
    let expand: () -> Void
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        if let track = player.current {
            HStack(spacing: 12) {
                CoverArt(trackId: track.id, remoteUrl: track.remoteCoverUrl, corner: 8)
                    .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 1) {
                    Text(track.title)
                        .font(.system(size: 13.5, weight: .semibold))
                        .foregroundColor(Theme.text).lineLimit(1)
                    Text(track.artistName)
                        .font(.system(size: 11.5))
                        .foregroundColor(Theme.text2).lineLimit(1)
                }
                Spacer()
                Button { player.togglePlayPause() } label: {
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 18)).foregroundColor(Theme.text)
                        .frame(width: 38, height: 38)
                }
                Button { player.next() } label: {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 15)).foregroundColor(Theme.text2)
                        .frame(width: 34, height: 38)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .wvCard(corner: 14)
            .padding(.horizontal, 10)
            .padding(.bottom, 4)
            .contentShape(Rectangle())
            .onTapGesture { expand() }
        }
    }
}

// ── Full Now Playing sheet ───────────────────────────────────────────────────

struct NowPlayingView: View {
    @EnvironmentObject var player: PlayerManager
    @EnvironmentObject var downloads: DownloadManager
    @Environment(\.dismiss) private var dismiss
    @State private var scrubbing = false
    @State private var scrubValue: Double = 0

    var body: some View {
        // NavigationStack so the artist name link pushes to ArtistProfileView
        // without dismissing the sheet.
        NavigationStack {
            VStack(spacing: 24) {
                Capsule()
                    .fill(Theme.text3)
                    .frame(width: 36, height: 5)
                    .padding(.top, 10)

                Spacer()

                if let track = player.current {
                    CoverArt(trackId: track.id, remoteUrl: track.remoteCoverUrl, corner: 20)
                        .frame(maxWidth: 320)
                        .padding(.horizontal, 28)
                        .shadow(color: .black.opacity(0.5), radius: 30, y: 12)

                    VStack(spacing: 6) {
                        Text(track.title)
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center).lineLimit(2)

                        // Artist name — tappable if we have an artist id.
                        if let artistId = track.artistId {
                            NavigationLink(value: NavTarget.artist(artistId)) {
                                HStack(spacing: 4) {
                                    Text(track.artistName)
                                        .font(.system(size: 14.5))
                                        .foregroundColor(Theme.accent)
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 11))
                                        .foregroundColor(Theme.accent.opacity(0.7))
                                }
                            }
                        } else {
                            Text(track.artistName)
                                .font(.system(size: 14.5)).foregroundColor(Theme.text2)
                        }

                        if let albumTitle = track.albumTitle {
                            Text(albumTitle)
                                .font(.system(size: 12.5)).foregroundColor(Theme.text3)
                        }
                    }
                    .padding(.horizontal, 24)

                    // Scrubber
                    VStack(spacing: 4) {
                        Slider(
                            value: Binding(
                                get: { scrubbing ? scrubValue : player.currentTime },
                                set: { scrubValue = $0 }
                            ),
                            in: 0...max(player.duration, 1),
                            onEditingChanged: { editing in
                                if editing { scrubValue = player.currentTime }
                                else { player.seek(to: scrubValue) }
                                scrubbing = editing
                            }
                        )
                        HStack {
                            Text(fmt(scrubbing ? scrubValue : player.currentTime))
                            Spacer()
                            Text(fmt(player.duration))
                        }
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Theme.text3)
                    }
                    .padding(.horizontal, 28)

                    // Transport
                    HStack(spacing: 44) {
                        Button { player.previous() } label: {
                            Image(systemName: "backward.fill").font(.system(size: 26))
                        }
                        Button { player.togglePlayPause() } label: {
                            Image(systemName: player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 66))
                        }
                        Button { player.next() } label: {
                            Image(systemName: "forward.fill").font(.system(size: 26))
                        }
                    }
                    .foregroundColor(Theme.text)

                    // Download toggle
                    if downloads.isDownloaded(trackId: track.id) {
                        Label("Available offline", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 12.5, weight: .semibold)).foregroundColor(Theme.accent)
                    } else if downloads.isBusy(trackId: track.id) {
                        Label("Downloading…", systemImage: "arrow.down.circle")
                            .font(.system(size: 12.5)).foregroundColor(Theme.text3)
                    } else if track.remoteAudioUrl != nil {
                        Button { downloads.download(track) } label: {
                            Label("Download for offline", systemImage: "arrow.down.circle")
                                .font(.system(size: 12.5, weight: .semibold)).foregroundColor(Theme.text2)
                        }
                    }
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppBackground())
            .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        }
        .presentationDragIndicator(.hidden)
    }

    private func fmt(_ t: Double) -> String {
        guard t.isFinite, t > 0 else { return "0:00" }
        let s = Int(t)
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}
