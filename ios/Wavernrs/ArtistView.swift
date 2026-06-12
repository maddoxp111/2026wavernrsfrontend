import SwiftUI

// ── Artist browse: search/discover artists ───────────────────────────────────

struct ArtistsView: View {
    @State private var query = ""
    @State private var results: [Artist] = []
    @State private var searching = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        ScrollView {
            if searching {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
            } else if !results.isEmpty {
                LazyVStack(spacing: 8) {
                    ForEach(results) { artist in
                        NavigationLink(value: NavTarget.artist(artist.id)) {
                            ArtistRow(artist: artist)
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 14)
            } else if query.count >= 2 {
                Text("No artists found for \"\(query)\"")
                    .foregroundColor(Theme.text3)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "person.2")
                        .font(.system(size: 38))
                        .foregroundColor(Theme.text3)
                    Text("Search artists")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Theme.text2)
                    Text("Type a name to find artists on wavernrs")
                        .font(.system(size: 12.5))
                        .foregroundColor(Theme.text3)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 80)
                .padding(.horizontal, 32)
            }
        }
        .background(AppBackground())
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search artists")
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .onChange(of: query) { q in
            searchTask?.cancel()
            guard q.trimmingCharacters(in: .whitespaces).count >= 2 else {
                results = []; searching = false; return
            }
            searchTask = Task {
                try? await Task.sleep(nanoseconds: 350_000_000)
                guard !Task.isCancelled else { return }
                searching = true
                if let r = try? await API.search(q), !Task.isCancelled {
                    results = r.artists ?? []
                }
                searching = false
            }
        }
    }
}

struct ArtistRow: View {
    let artist: Artist

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(url: artist.profileImageUrl, size: 46)
            Text(artist.displayName ?? "Unknown")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text3)
        }
        .padding(12)
        .wvCard()
    }
}

// ── Individual artist profile ────────────────────────────────────────────────

struct ArtistProfileView: View {
    let artistId: String
    @State private var artist: ArtistFull?
    @State private var tracks: [Track] = []
    @State private var albums: [Album] = []
    @State private var error: String?
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ScrollView {
            if let artist {
                VStack(alignment: .leading, spacing: 0) {
                    // Banner / header
                    ArtistHeaderView(artist: artist)

                    VStack(alignment: .leading, spacing: 18) {
                        // Bio
                        if let bio = artist.bio, !bio.isEmpty {
                            Text(bio)
                                .font(.system(size: 13.5))
                                .foregroundColor(Theme.text2)
                                .padding(.horizontal, 18)
                                .padding(.top, 16)
                        }

                        // Stats
                        HStack(spacing: 24) {
                            statBadge(label: "Followers", value: artist.followerCount ?? 0)
                            statBadge(label: "Tracks", value: artist.trackCount ?? 0)
                            if let loc = artist.location, !loc.isEmpty {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(loc)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Theme.text)
                                    Text("Location")
                                        .font(.system(size: 10.5))
                                        .foregroundColor(Theme.text3)
                                }
                            }
                        }
                        .padding(.horizontal, 18)

                        // Tracks
                        if !tracks.isEmpty {
                            SectionHeader("Tracks")
                            ForEach(tracks.prefix(20)) { track in
                                Button {
                                    player.play(queue: tracks.map { PlayableTrack(track: $0) },
                                                startAt: tracks.firstIndex(of: track) ?? 0)
                                } label: {
                                    TrackRow(title: track.title ?? "Untitled",
                                             subtitle: track.artistName,
                                             coverUrl: track.coverUrl,
                                             trackId: track.id,
                                             artistId: nil)
                                }
                                .padding(.horizontal, 14)
                            }
                        }

                        // Comps
                        if !albums.isEmpty {
                            SectionHeader("Comps")
                            let cols = [GridItem(.adaptive(minimum: 150), spacing: 12)]
                            LazyVGrid(columns: cols, spacing: 12) {
                                ForEach(albums) { album in
                                    NavigationLink(value: NavTarget.album(album.id)) {
                                        MediaTile(title: album.title ?? "Untitled",
                                                  subtitle: album.artistName,
                                                  coverUrl: album.coverUrl,
                                                  trackId: nil, artistId: nil)
                                    }
                                }
                            }
                            .padding(.horizontal, 14)
                        }

                        if let web = artist.website, !web.isEmpty, let url = URL(string: web) {
                            Link(destination: url) {
                                Label(web.replacingOccurrences(of: "https://", with: ""), systemImage: "link")
                                    .font(.system(size: 12.5))
                                    .foregroundColor(Theme.accent)
                            }
                            .padding(.horizontal, 18)
                        }
                    }
                    .padding(.bottom, 32)
                }
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

    private func statBadge(label: String, value: Int) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value.formatted())
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.text)
            Text(label)
                .font(.system(size: 10.5))
                .foregroundColor(Theme.text3)
        }
    }

    private func load() async {
        error = nil
        async let a = API.artist(id: artistId)
        async let t = API.artistTracks(id: artistId)
        async let al = API.artistAlbums(id: artistId)
        do {
            let (artistData, tracksData, albumsData) = try await (a, t, al)
            artist = artistData
            tracks = tracksData
            albums = albumsData
        } catch {
            self.error = "Couldn't load this artist."
        }
    }
}

struct ArtistHeaderView: View {
    let artist: ArtistFull

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Banner
            if let bannerUrl = artist.bannerUrl, let url = URL(string: bannerUrl) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable().scaledToFill()
                    } else {
                        bannerPlaceholder
                    }
                }
            } else {
                bannerPlaceholder
            }

            // Gradient overlay so text is always readable
            LinearGradient(
                stops: [.init(color: .clear, location: 0.3),
                        .init(color: Color(red: 0.05, green: 0.05, blue: 0.08), location: 1)],
                startPoint: .top, endPoint: .bottom
            )

            // Avatar + name
            HStack(alignment: .bottom, spacing: 14) {
                AvatarView(url: artist.profileImageUrl, size: 72)
                    .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))
                VStack(alignment: .leading, spacing: 3) {
                    Text(artist.name)
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundColor(.white)
                        .shadow(radius: 4)
                }
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 18)
        }
        .frame(height: 220)
        .clipped()
    }

    private var bannerPlaceholder: some View {
        LinearGradient(
            colors: [Theme.accent.opacity(0.45), Color(red: 0.08, green: 0.06, blue: 0.20)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }
}
