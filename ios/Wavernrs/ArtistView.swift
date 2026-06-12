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
                        .buttonStyle(.plain)
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
            HStack(spacing: 5) {
                Text(artist.displayName ?? "Unknown")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text)
                if artist.isVerified == true {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                }
            }
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
    @State private var albums: [Album] = []
    @State private var error: String?

    private let cols = [GridItem(.adaptive(minimum: 150), spacing: 12)]

    var body: some View {
        ScrollView {
            if let artist {
                VStack(alignment: .leading, spacing: 0) {
                    ArtistHeaderView(artist: artist)

                    if albums.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "tray")
                                .font(.system(size: 30))
                                .foregroundColor(Theme.text3)
                            Text("No uploads yet")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.text2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 60)
                    } else {
                        LazyVGrid(columns: cols, spacing: 12) {
                            ForEach(albums) { album in
                                NavigationLink(value: NavTarget.album(album.id)) {
                                    MediaTile(title: album.title ?? "Untitled",
                                              subtitle: album.artistName,
                                              coverUrl: album.coverUrl,
                                              trackId: nil, artistId: nil,
                                              isExclusive: album.isExclusive == true,
                                              isHighlighted: album.isHighlighted == true)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(14)
                    }
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

    private func load() async {
        error = nil
        async let a = API.artist(id: artistId)
        async let al = API.artistAlbums(id: artistId)
        do {
            let (artistData, albumsData) = try await (a, al)
            artist = artistData
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
            // Banner — rendered as an overlay on a fixed-size base so the
            // scaledToFill image can never expand the page layout sideways.
            Rectangle()
                .fill(Color.clear)
                .overlay(
                    Group {
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
                    }
                )
                .clipped()

            LinearGradient(
                stops: [.init(color: .clear, location: 0.3),
                        .init(color: Color(red: 0.05, green: 0.05, blue: 0.08), location: 1)],
                startPoint: .top, endPoint: .bottom
            )

            HStack(alignment: .bottom, spacing: 14) {
                AvatarView(url: artist.profileImageUrl, size: 72)
                    .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(artist.name)
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(.white)
                            .shadow(radius: 4)
                        if artist.isVerified == true {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 17))
                                .foregroundColor(.blue)
                                .shadow(radius: 4)
                        }
                    }
                    if let loc = artist.location, !loc.isEmpty {
                        Text(loc)
                            .font(.system(size: 11.5))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 18)
        }
        .frame(height: 220)
        .frame(maxWidth: .infinity)
        .clipped()
    }

    private var bannerPlaceholder: some View {
        LinearGradient(
            colors: [Theme.accent.opacity(0.45), Color(red: 0.08, green: 0.06, blue: 0.20)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }
}
