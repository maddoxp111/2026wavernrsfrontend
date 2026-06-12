import SwiftUI

// ── Account: sign-in or profile + playlists ───────────────────────────────────

struct AccountView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        ScrollView {
            if auth.isLoggedIn {
                ProfileView()
            } else {
                LoginForm()
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
    }
}

// ── Login form ────────────────────────────────────────────────────────────────

struct LoginForm: View {
    @EnvironmentObject var auth: AuthManager
    @State private var username = ""
    @State private var password = ""
    @FocusState private var focused: Field?
    enum Field { case username, password }

    var body: some View {
        VStack(spacing: 28) {
            VStack(spacing: 6) {
                Image(systemName: "waveform")
                    .font(.system(size: 44, weight: .light))
                    .foregroundColor(Theme.accent)
                Text("wavernrs")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundColor(Theme.text)
                Text("Sign in to access your playlists")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.text2)
            }
            .padding(.top, 48)

            VStack(spacing: 14) {
                TextField("Username", text: $username)
                    .focused($focused, equals: .username)
                    .textContentType(.username)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .padding(14)
                    .wvCard(corner: 12)
                    .foregroundColor(Theme.text)

                SecureField("Password", text: $password)
                    .focused($focused, equals: .password)
                    .textContentType(.password)
                    .padding(14)
                    .wvCard(corner: 12)
                    .foregroundColor(Theme.text)

                if let err = auth.loginError {
                    Text(err)
                        .font(.system(size: 12.5))
                        .foregroundColor(.red.opacity(0.85))
                }

                Button {
                    focused = nil
                    Task { await auth.login(username: username, password: password) }
                } label: {
                    Group {
                        if auth.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Sign In")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .disabled(auth.isLoading)
            }
            .padding(.horizontal, 24)

            Link("Don't have an account? Join at wavernrs.com",
                 destination: URL(string: "https://wavernrs.com")!)
                .font(.system(size: 13))
                .foregroundColor(Theme.accent)

            Spacer()
        }
    }
}

// ── Logged-in profile ─────────────────────────────────────────────────────────

struct ProfileView: View {
    @EnvironmentObject var auth: AuthManager
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 14) {
                if let artist = auth.user?.artist {
                    AvatarView(url: artist.profileImageUrl, size: 60)
                } else {
                    Circle()
                        .fill(Theme.accent.opacity(0.25))
                        .frame(width: 60, height: 60)
                        .overlay(Image(systemName: "person.fill").foregroundColor(Theme.accent))
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(auth.user?.username ?? "")
                        .font(.system(size: 18, weight: .heavy))
                        .foregroundColor(Theme.text)
                    if let artist = auth.user?.artist {
                        NavigationLink(value: NavTarget.artist(artist.id)) {
                            Text("View artist profile")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.accent)
                        }
                    }
                }
                Spacer()
                Button("Sign Out") { auth.logout() }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.text3)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 20)

            Divider().background(Theme.hairline).padding(.horizontal, 18)

            // Playlists
            if auth.playlists.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 32))
                        .foregroundColor(Theme.text3)
                    Text("No playlists yet")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Theme.text2)
                    Text("Create playlists at wavernrs.com to see them here.")
                        .font(.system(size: 12.5))
                        .foregroundColor(Theme.text3)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 60)
                .padding(.horizontal, 32)
            } else {
                SectionHeader("My Playlists")
                    .padding(.top, 18)
                LazyVStack(spacing: 8) {
                    ForEach(auth.playlists) { playlist in
                        NavigationLink(value: NavTarget.playlist(playlist.id)) {
                            PlaylistRow(playlist: playlist)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 10)
            }
        }
    }
}

struct PlaylistRow: View {
    let playlist: PlaylistSummary
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Theme.accent.opacity(0.18))
                    .frame(width: 46, height: 46)
                Image(systemName: "music.note.list")
                    .foregroundColor(Theme.accent)
                    .font(.system(size: 18))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(playlist.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text).lineLimit(1)
                Text("\(playlist.trackCount ?? 0) track\(playlist.trackCount == 1 ? "" : "s")")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.text2)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text3)
        }
        .padding(10)
        .wvCard()
    }
}

// ── Playlist detail ───────────────────────────────────────────────────────────

struct PlaylistDetailView: View {
    let playlistId: String
    @State private var detail: PlaylistDetail?
    @State private var error: String?
    @EnvironmentObject var player: PlayerManager
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        ScrollView {
            if let detail {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    VStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Theme.accent.opacity(0.2))
                                .frame(width: 160, height: 160)
                            Image(systemName: "music.note.list")
                                .font(.system(size: 60, weight: .light))
                                .foregroundColor(Theme.accent)
                        }
                        Text(detail.title)
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)
                        if let tracks = detail.tracks, !tracks.isEmpty {
                            Button {
                                player.play(queue: tracks.map { $0.toPlayable() })
                            } label: {
                                Label("Play All", systemImage: "play.fill")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 28)
                                    .padding(.vertical, 12)
                                    .background(Theme.accent)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)

                    // Tracks
                    let tracks = detail.tracks ?? []
                    if tracks.isEmpty {
                        Text("No tracks yet")
                            .foregroundColor(Theme.text3)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 40)
                    } else {
                        ForEach(Array(tracks.enumerated()), id: \.element.id) { i, entry in
                            Button {
                                player.play(queue: tracks.map { $0.toPlayable() }, startAt: i)
                            } label: {
                                TrackRow(title: entry.title ?? "Untitled",
                                         subtitle: entry.artistName ?? "Unknown",
                                         coverUrl: entry.coverUrl,
                                         trackId: entry.id,
                                         artistId: nil)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 6)
                        }
                    }
                }
                .padding(.bottom, 32)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 100)
            }
        }
        .background(AppBackground())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
    }

    private func load() async {
        do { detail = try await API.playlist(id: playlistId, token: auth.token) }
        catch { self.error = "Couldn't load playlist." }
    }
}
