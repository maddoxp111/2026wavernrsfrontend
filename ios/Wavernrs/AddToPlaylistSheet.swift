import SwiftUI

struct AddToPlaylistSheet: View {
    let trackId: String
    let trackTitle: String
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var adding: String?
    @State private var added: Set<String> = []
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground().ignoresSafeArea()
                Group {
                    if !auth.isLoggedIn {
                        VStack(spacing: 16) {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 40))
                                .foregroundColor(Theme.text3)
                            Text("Sign in to add tracks to playlists")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.text2)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding()
                    } else if auth.playlists.isEmpty {
                        VStack(spacing: 14) {
                            Image(systemName: "music.note.list")
                                .font(.system(size: 40))
                                .foregroundColor(Theme.text3)
                            Text("No playlists yet")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(Theme.text2)
                            Text("Create playlists at wavernrs.com")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.text3)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding()
                    } else {
                        ScrollView {
                            VStack(spacing: 8) {
                                if let errorMessage {
                                    Text(errorMessage)
                                        .font(.system(size: 12.5))
                                        .foregroundColor(.red.opacity(0.85))
                                        .padding(.horizontal, 16)
                                        .padding(.top, 8)
                                }
                                ForEach(auth.playlists) { playlist in
                                    Button {
                                        guard adding == nil else { return }
                                        Task { await add(to: playlist) }
                                    } label: {
                                        HStack(spacing: 14) {
                                            ZStack {
                                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                                    .fill(Theme.accent.opacity(0.18))
                                                    .frame(width: 44, height: 44)
                                                Image(systemName: "music.note.list")
                                                    .foregroundColor(Theme.accent)
                                                    .font(.system(size: 18))
                                            }
                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(playlist.title)
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundColor(Theme.text)
                                                    .lineLimit(1)
                                                Text("\(playlist.trackCount ?? 0) track\(playlist.trackCount == 1 ? "" : "s")")
                                                    .font(.system(size: 12))
                                                    .foregroundColor(Theme.text2)
                                            }
                                            Spacer()
                                            if adding == playlist.id {
                                                ProgressView().tint(Theme.accent)
                                            } else if added.contains(playlist.id) {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(Theme.accent)
                                                    .font(.system(size: 18))
                                            }
                                        }
                                        .padding(12)
                                        .wvCard()
                                    }
                                    .buttonStyle(.plain)
                                    .padding(.horizontal, 16)
                                }
                            }
                            .padding(.vertical, 12)
                        }
                    }
                }
            }
            .navigationTitle("Add to Playlist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Theme.accent)
                }
            }
        }
    }

    private func add(to playlist: PlaylistSummary) async {
        guard let token = auth.token else { return }
        adding = playlist.id
        errorMessage = nil
        do {
            try await API.addTrackToPlaylist(playlistId: playlist.id, trackId: trackId, token: token)
            added.insert(playlist.id)
        } catch {
            errorMessage = "Couldn't add to \"\(playlist.title)\". Try again."
        }
        adding = nil
    }
}
