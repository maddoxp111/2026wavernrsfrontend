import SwiftUI

// Offline library — everything here plays with no internet connection.
struct DownloadsView: View {
    @EnvironmentObject var downloads: DownloadManager
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if downloads.items.isEmpty && downloads.progress.isEmpty && downloads.queued.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "arrow.down.circle")
                            .font(.system(size: 40))
                            .foregroundColor(Theme.text3)
                        Text("No downloads yet")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.text2)
                        Text("Download comps or tracks to listen offline — they'll show up here.")
                            .font(.system(size: 12.5))
                            .foregroundColor(Theme.text3)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 100)
                    .padding(.horizontal, 32)
                } else {
                    if !downloads.progress.isEmpty || !downloads.queued.isEmpty {
                        SectionHeader("Downloading…")
                        Text("\(downloads.progress.count + downloads.queued.count) track(s) in progress")
                            .font(.system(size: 12.5))
                            .foregroundColor(Theme.text3)
                            .padding(.horizontal, 16)
                    }

                    ForEach(downloads.grouped, id: \.key) { group in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                SectionHeader(group.title)
                                Spacer()
                                Button {
                                    player.play(queue: group.tracks)
                                } label: {
                                    Image(systemName: "play.circle.fill")
                                        .font(.system(size: 22))
                                        .foregroundColor(Theme.accent)
                                }
                                Button(role: .destructive) {
                                    downloads.deleteGroup(albumKey: group.key)
                                } label: {
                                    Image(systemName: "trash")
                                        .font(.system(size: 15))
                                        .foregroundColor(Theme.text3)
                                }
                                .padding(.trailing, 16)
                            }

                            ForEach(Array(group.tracks.enumerated()), id: \.element.id) { i, item in
                                Button {
                                    player.play(queue: group.tracks, startAt: i)
                                } label: {
                                    TrackRow(title: item.title,
                                             subtitle: item.artistName,
                                             coverUrl: item.remoteCoverUrl,
                                             trackId: item.id)
                                }
                                .padding(.horizontal, 16)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        downloads.delete(trackId: item.id)
                                    } label: {
                                        Label("Remove download", systemImage: "trash")
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.vertical, 14)
        }
        .background(Theme.bg)
    }
}
