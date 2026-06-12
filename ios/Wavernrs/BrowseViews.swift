import SwiftUI

// Navigation targets used across all browse views.
enum NavTarget: Hashable {
    case album(String)
    case artist(String)
    case track(String)
}

// ── Home ─────────────────────────────────────────────────────────────────────

struct HomeView: View {
    @State private var featured: Album?
    @State private var newReleases: [Album] = []
    @State private var trending: [Track] = []
    @State private var error: String?
    @State private var loading = true
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 80)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                VStack(alignment: .leading, spacing: 22) {

                    // Featured Comp — hero tile
                    if let featured {
                        SectionHeader("Featured Comp")
                        NavigationLink(value: NavTarget.album(featured.id)) {
                            FeaturedHeroTile(album: featured)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                    }

                    // Continue Listening — shows when something is queued
                    if let current = player.current {
                        SectionHeader("Continue Listening")
                        Button { player.togglePlayPause() } label: {
                            TrackRow(title: current.title,
                                     subtitle: current.artistName,
                                     coverUrl: current.remoteCoverUrl,
                                     trackId: current.id,
                                     artistId: nil)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                    }

                    // Trending edits — horizontal scroll
                    if !trending.isEmpty {
                        SectionHeader("Trending")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(trending) { track in
                                    NavigationLink(value: NavTarget.track(track.id)) {
                                        MediaTile(title: track.title ?? "Untitled",
                                                  subtitle: track.artistName,
                                                  coverUrl: track.coverUrl,
                                                  trackId: track.id,
                                                  artistId: track.artists?.id,
                                                  isExclusive: track.isExclusive == true)
                                            .frame(width: 140)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }

                    // New Releases — comp grid
                    if !newReleases.isEmpty {
                        SectionHeader("New Releases")
                        let cols = [GridItem(.adaptive(minimum: 150), spacing: 14)]
                        LazyVGrid(columns: cols, spacing: 14) {
                            ForEach(newReleases) { album in
                                NavigationLink(value: NavTarget.album(album.id)) {
                                    MediaTile(title: album.title ?? "Untitled",
                                              subtitle: album.artistName,
                                              coverUrl: album.coverUrl,
                                              trackId: nil,
                                              artistId: album.artists?.id,
                                              isExclusive: album.isExclusive == true,
                                              isHighlighted: album.isHighlighted == true)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 14)
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = newReleases.isEmpty; error = nil
        do {
            let d = try await API.discover()
            let albums = d.recent.compactMap { item -> Album? in
                if case .album(let a) = item { return a } else { return nil }
            }
            featured = albums.first
            newReleases = albums.isEmpty ? [] : Array(albums.dropFirst())
            trending = d.trending ?? []
        } catch {
            self.error = "Couldn't load — Downloads still work offline."
        }
        loading = false
    }
}

// Wide hero banner for the featured comp
struct FeaturedHeroTile: View {
    let album: Album

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Cover rendered as overlay so scaledToFill can't expand layout.
            Rectangle()
                .fill(Theme.card)
                .overlay(
                    Group {
                        if let s = album.coverUrl, let url = URL(string: s) {
                            AsyncImage(url: url) { phase in
                                if let img = phase.image {
                                    img.resizable().scaledToFill()
                                } else {
                                    Color.clear
                                }
                            }
                        }
                    }
                )
                .clipped()

            LinearGradient(
                stops: [.init(color: .clear, location: 0.3),
                        .init(color: .black.opacity(0.82), location: 1)],
                startPoint: .top, endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    if album.isHighlighted == true {
                        badgeLabel("Highlighted by wavernrs", icon: "star.fill", color: Theme.accent)
                    }
                    if album.isExclusive == true {
                        badgeLabel("Exclusive", icon: "lock.fill", color: .purple)
                    }
                }
                Text(album.title ?? "Untitled")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text(album.artistName)
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(16)
        }
        .frame(height: 210)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func badgeLabel(_ text: String, icon: String, color: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.system(size: 9.5, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color)
            .clipShape(Capsule())
    }
}

// ── Discover ─────────────────────────────────────────────────────────────────

struct DiscoverView: View {
    @State private var topComps: [ChartsItem] = []
    @State private var topTracks: [ChartsItem] = []
    @State private var trending: [Track] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 80)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                VStack(alignment: .leading, spacing: 22) {
                    if !topComps.isEmpty {
                        SectionHeader("Top Comps This Week")
                        ForEach(Array(topComps.prefix(5).enumerated()), id: \.element.id) { i, item in
                            ChartRow(rank: i + 1, item: item, isAlbum: true)
                                .padding(.horizontal, 16)
                        }
                    }

                    if !topTracks.isEmpty {
                        SectionHeader("Top Edits This Week")
                        ForEach(Array(topTracks.prefix(5).enumerated()), id: \.element.id) { i, item in
                            ChartRow(rank: i + 1, item: item, isAlbum: false)
                                .padding(.horizontal, 16)
                        }
                    }

                    if !trending.isEmpty {
                        SectionHeader("Trending Edits")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(trending) { track in
                                    NavigationLink(value: NavTarget.track(track.id)) {
                                        MediaTile(title: track.title ?? "Untitled",
                                                  subtitle: track.artistName,
                                                  coverUrl: track.coverUrl,
                                                  trackId: track.id,
                                                  artistId: track.artists?.id,
                                                  isExclusive: track.isExclusive == true)
                                            .frame(width: 140)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.vertical, 14)
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = true; error = nil
        do {
            async let charts = API.charts()
            async let discover = API.discover()
            let (c, d) = try await (charts, discover)
            topComps = (c.comps?.weekly ?? [])
                .sorted { ($0.wavernrsScore ?? 0) > ($1.wavernrsScore ?? 0) }
            topTracks = (c.edits?.weekly ?? [])
                .sorted { ($0.wavernrsScore ?? 0) > ($1.wavernrsScore ?? 0) }
            trending = d.trending ?? []
        } catch {
            self.error = "Couldn't load."
        }
        loading = false
    }
}

// ── Charts ───────────────────────────────────────────────────────────────────

struct ChartsView: View {
    enum Universe: String, CaseIterable { case comps = "Comps", edits = "Edits" }
    enum Window: String, CaseIterable { case weekly = "This Week", alltime = "All Time" }

    @State private var universe: Universe = .comps
    @State private var window: Window = .weekly
    @State private var data: ChartsResponse?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Picker("", selection: $universe) {
                    ForEach(Universe.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }.pickerStyle(.segmented)
                Picker("", selection: $window) {
                    ForEach(Window.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }.pickerStyle(.segmented)

                if let error {
                    ErrorRetryView(message: error) { await load() }
                } else if let items = currentItems {
                    ForEach(Array(items.prefix(50).enumerated()), id: \.element.id) { rank, item in
                        ChartRow(rank: rank + 1, item: item, isAlbum: universe == .comps)
                    }
                } else {
                    ProgressView().padding(.top, 60)
                }
            }
            .padding(16)
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
    }

    private var currentItems: [ChartsItem]? {
        guard let data else { return nil }
        let bucket = universe == .comps ? data.comps : data.edits
        let list = window == .weekly ? bucket?.weekly : bucket?.alltime
        return list?.sorted { ($0.wavernrsScore ?? 0) > ($1.wavernrsScore ?? 0) }
    }

    private func load() async {
        error = nil
        do { data = try await API.charts() }
        catch { self.error = "Couldn't load charts." }
    }
}

struct ChartRow: View {
    let rank: Int
    let item: ChartsItem
    let isAlbum: Bool

    var body: some View {
        if isAlbum {
            NavigationLink(value: NavTarget.album(item.id)) { row }
        } else {
            NavigationLink(value: NavTarget.track(item.id)) { row }
        }
    }

    private var row: some View {
        HStack(spacing: 12) {
            Text("\(rank)")
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(rank <= 3 ? Theme.accent : Theme.text3)
                .frame(width: 28)
            CoverArt(trackId: isAlbum ? nil : item.id, remoteUrl: item.coverUrl)
                .frame(width: 46, height: 46)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title ?? "Untitled")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text).lineLimit(1)
                Text(item.artistName)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.text2).lineLimit(1)
            }
            Spacer()
            Text("\(item.playCount ?? 0) plays")
                .font(.system(size: 11)).foregroundColor(Theme.text3)
        }
        .padding(10)
        .wvCard()
    }
}

// ── Archive ──────────────────────────────────────────────────────────────────

struct ArchiveView: View {
    @State private var albums: [Album] = []
    @State private var error: String?
    @State private var loading = true

    private let cols = [GridItem(.adaptive(minimum: 150), spacing: 14)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Comps preserved by the wavernrs and yzyplayer's team — not by artists on the site, but too good to be lost.")
                    .font(.system(size: 12.5)).foregroundColor(Theme.text2)
                    .padding(.horizontal, 16)

                if loading {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 60)
                } else if let error {
                    ErrorRetryView(message: error) { await load() }
                } else {
                    LazyVGrid(columns: cols, spacing: 14) {
                        ForEach(albums) { album in
                            NavigationLink(value: NavTarget.album(album.id)) {
                                MediaTile(title: album.title ?? "Untitled",
                                          subtitle: album.artistName,
                                          coverUrl: album.coverUrl,
                                          trackId: nil, artistId: nil)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.vertical, 14)
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = albums.isEmpty; error = nil
        do { albums = try await API.archive() }
        catch { self.error = "Couldn't load the archive." }
        loading = false
    }
}

// ── Search ───────────────────────────────────────────────────────────────────

struct SearchView: View {
    @State private var query = ""
    @State private var results: SearchResponse?
    @State private var searching = false
    @State private var searchTask: Task<Void, Never>?
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if searching {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                } else if let r = results {
                    if let tracks = r.tracks, !tracks.isEmpty {
                        SectionHeader("Tracks")
                        ForEach(tracks) { track in
                            NavigationLink(value: NavTarget.track(track.id)) {
                                TrackRow(title: track.title ?? "Untitled",
                                         subtitle: track.artistName,
                                         coverUrl: track.coverUrl,
                                         trackId: track.id,
                                         artistId: track.artists?.id,
                                         isExclusive: track.isExclusive == true)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 16)
                        }
                    }
                    if let albums = r.albums, !albums.isEmpty {
                        SectionHeader("Comps")
                        albumRows(albums)
                    }
                    if let archived = r.archived, !archived.isEmpty {
                        SectionHeader("Archived")
                        albumRows(archived)
                    }
                    if let artists = r.artists, !artists.isEmpty {
                        SectionHeader("Artists")
                        ForEach(artists) { artist in
                            NavigationLink(value: NavTarget.artist(artist.id)) {
                                ArtistRow(artist: artist)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 16)
                        }
                    }
                    if (r.tracks ?? []).isEmpty && (r.albums ?? []).isEmpty &&
                       (r.archived ?? []).isEmpty && (r.artists ?? []).isEmpty {
                        Text("No results for \"\(query)\"")
                            .foregroundColor(Theme.text3)
                            .frame(maxWidth: .infinity).padding(.top, 40)
                    }
                } else {
                    Text("Search tracks, comps, artists, and the archive")
                        .foregroundColor(Theme.text3)
                        .frame(maxWidth: .infinity).padding(.top, 60)
                }
            }
            .padding(.vertical, 14)
        }
        .background(AppBackground())
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search")
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .onChange(of: query) { q in
            searchTask?.cancel()
            guard q.trimmingCharacters(in: .whitespaces).count >= 2 else {
                results = nil; searching = false; return
            }
            searchTask = Task {
                try? await Task.sleep(nanoseconds: 350_000_000)
                guard !Task.isCancelled else { return }
                searching = results == nil
                if let r = try? await API.search(q), !Task.isCancelled { results = r }
                searching = false
            }
        }
    }

    @ViewBuilder
    private func albumRows(_ albums: [Album]) -> some View {
        ForEach(albums) { album in
            NavigationLink(value: NavTarget.album(album.id)) {
                TrackRow(title: album.title ?? "Untitled",
                         subtitle: album.artistName,
                         coverUrl: album.coverUrl,
                         trackId: nil, artistId: album.artists?.id)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
        }
    }
}

// ── Track detail page ─────────────────────────────────────────────────────────

struct TrackDetailView: View {
    let trackId: String
    @State private var track: Track?
    @State private var error: String?
    @EnvironmentObject var player: PlayerManager
    @EnvironmentObject var downloads: DownloadManager

    var body: some View {
        ScrollView {
            if let track {
                VStack(spacing: 28) {
                    CoverArt(trackId: track.id, remoteUrl: track.coverUrl, corner: 18)
                        .frame(width: 260, height: 260)
                        .shadow(color: .black.opacity(0.45), radius: 24, y: 10)
                        .padding(.top, 24)

                    VStack(spacing: 8) {
                        HStack(spacing: 6) {
                            if track.isExclusive == true {
                                Label("wavernrs exclusive", systemImage: "lock.fill")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.purple)
                                    .clipShape(Capsule())
                            }
                        }
                        Text(track.title ?? "Untitled")
                            .font(.system(size: 22, weight: .heavy))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)
                            .lineLimit(3)

                        if let artistId = track.artists?.id {
                            NavigationLink(value: NavTarget.artist(artistId)) {
                                HStack(spacing: 4) {
                                    Text(track.artistName)
                                        .font(.system(size: 15))
                                        .foregroundColor(Theme.accent)
                                    if track.artists?.isVerified == true {
                                        Image(systemName: "checkmark.seal.fill")
                                            .font(.system(size: 12))
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        } else {
                            Text(track.artistName)
                                .font(.system(size: 15))
                                .foregroundColor(Theme.text2)
                        }
                    }
                    .padding(.horizontal, 24)

                    // Play button
                    Button {
                        player.play(queue: [PlayableTrack(track: track)])
                    } label: {
                        Label("Play", systemImage: "play.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Theme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .padding(.horizontal, 24)

                    // Download / offline status
                    let playable = PlayableTrack(track: track)
                    if downloads.isDownloaded(trackId: track.id) {
                        Label("Available offline", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Theme.accent)
                    } else if downloads.isBusy(trackId: track.id) {
                        Label("Downloading…", systemImage: "arrow.down.circle")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text3)
                    } else if track.iaUrl != nil {
                        Button { downloads.download(playable) } label: {
                            Label("Download for offline", systemImage: "arrow.down.circle")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Theme.text2)
                        }
                    }

                    // Link to the parent comp if this track is part of one
                    if let albumId = track.albumId {
                        NavigationLink(value: NavTarget.album(albumId)) {
                            Label("View Comp", systemImage: "music.note.list")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Theme.accent)
                        }
                    }
                }
                .padding(.bottom, 40)
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
        do { track = try await API.track(id: trackId) }
        catch { self.error = "Couldn't load this track." }
    }
}

// ── Shared components ────────────────────────────────────────────────────────

struct SectionHeader: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text)
            .font(.system(size: 11.5, weight: .bold)).textCase(.uppercase)
            .foregroundColor(Theme.text3).padding(.horizontal, 16)
    }
}

// Tile used in grids — cover + title + tappable artist name + optional badges
struct MediaTile: View {
    let title: String
    let subtitle: String
    let coverUrl: String?
    let trackId: String?
    let artistId: String?
    var isExclusive: Bool = false
    var isHighlighted: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topTrailing) {
                CoverArt(trackId: trackId, remoteUrl: coverUrl, corner: 12)
                if isExclusive {
                    Text("EXC")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.purple)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .padding(5)
                }
            }
            HStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.text).lineLimit(1)
                if isHighlighted {
                    Image(systemName: "star.fill")
                        .font(.system(size: 9))
                        .foregroundColor(Theme.accent)
                }
            }
            if let artistId {
                NavigationLink(value: NavTarget.artist(artistId)) {
                    Text(subtitle)
                        .font(.system(size: 11.5))
                        .foregroundColor(Theme.accent).lineLimit(1)
                }
                .buttonStyle(.plain)
            } else {
                Text(subtitle)
                    .font(.system(size: 11.5))
                    .foregroundColor(Theme.text2).lineLimit(1)
            }
        }
    }
}

// Row used in lists — cover + title/subtitle + optional badges
struct TrackRow: View {
    let title: String
    let subtitle: String
    let coverUrl: String?
    let trackId: String?
    let artistId: String?
    var isExclusive: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .topTrailing) {
                CoverArt(trackId: trackId, remoteUrl: coverUrl)
                    .frame(width: 46, height: 46)
                if isExclusive {
                    Text("EXC")
                        .font(.system(size: 7, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 3)
                        .padding(.vertical, 1)
                        .background(Color.purple)
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                        .offset(x: 4, y: -4)
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text).lineLimit(1)
                if let artistId {
                    NavigationLink(value: NavTarget.artist(artistId)) {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundColor(Theme.accent).lineLimit(1)
                    }
                    .buttonStyle(.plain)
                } else {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.text2).lineLimit(1)
                }
            }
            Spacer()
        }
        .padding(10)
        .wvCard()
    }
}

struct ErrorRetryView: View {
    let message: String
    let retry: () async -> Void
    var body: some View {
        VStack(spacing: 12) {
            Text(message)
                .font(.system(size: 13.5)).foregroundColor(Theme.text2)
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await retry() } }.buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity).padding(.top, 60).padding(.horizontal, 24)
    }
}

// ── Shared NavigationStack destination handler ────────────────────────────────
@ViewBuilder
func navDestination(_ target: NavTarget) -> some View {
    switch target {
    case .album(let id):
        AlbumView(albumId: id)
    case .artist(let id):
        ArtistProfileView(artistId: id)
    case .track(let id):
        TrackDetailView(trackId: id)
    }
}
