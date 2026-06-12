import SwiftUI

// Navigation values used across all browse views:
//   String           → album ID (opens AlbumView)
//   "artist:<id>"    → artist ID (opens ArtistProfileView)
// Using a wrapper enum keeps NavigationStack from conflating the two.
enum NavTarget: Hashable {
    case album(String)
    case artist(String)
}

// ── Home: recent feed ────────────────────────────────────────────────────────

struct HomeView: View {
    @State private var feed: [FeedItem] = []
    @State private var trending: [Track] = []
    @State private var error: String?
    @State private var loading = true
    @EnvironmentObject var player: PlayerManager

    private let cols = [GridItem(.adaptive(minimum: 150), spacing: 14)]

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 80)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                VStack(alignment: .leading, spacing: 18) {
                    if !trending.isEmpty {
                        SectionHeader("Trending")
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(trending) { track in
                                    Button {
                                        player.play(queue: trending.map { PlayableTrack(track: $0) },
                                                    startAt: trending.firstIndex(of: track) ?? 0)
                                    } label: {
                                        MediaTile(title: track.title ?? "Untitled",
                                                  subtitle: track.artistName,
                                                  coverUrl: track.coverUrl,
                                                  trackId: track.id,
                                                  artistId: track.artists?.id)
                                            .frame(width: 140)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }

                    SectionHeader("Recent")
                    LazyVGrid(columns: cols, spacing: 14) {
                        ForEach(feed) { item in
                            switch item {
                            case .album(let album):
                                NavigationLink(value: NavTarget.album(album.id)) {
                                    MediaTile(title: album.title ?? "Untitled",
                                              subtitle: album.artistName,
                                              coverUrl: album.coverUrl,
                                              trackId: nil,
                                              artistId: album.artists?.id)
                                }
                            case .track(let track):
                                Button {
                                    player.play(queue: [PlayableTrack(track: track)])
                                } label: {
                                    MediaTile(title: track.title ?? "Untitled",
                                              subtitle: track.artistName,
                                              coverUrl: track.coverUrl,
                                              trackId: track.id,
                                              artistId: track.artists?.id)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.vertical, 14)
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in
            navDestination(target)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = feed.isEmpty; error = nil
        do {
            let d = try await API.discover()
            feed = d.recent; trending = d.trending ?? []
        } catch { self.error = "Couldn't load — Downloads still work offline." }
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
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        Group {
            if isAlbum {
                NavigationLink(value: NavTarget.album(item.id)) { row }
            } else {
                Button { Task { await playTrack() } } label: { row }
            }
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

    private func playTrack() async {
        guard let track = try? await API.track(id: item.id) else { return }
        player.play(queue: [PlayableTrack(track: track)])
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
                            Button { player.play(queue: [PlayableTrack(track: track)]) } label: {
                                TrackRow(title: track.title ?? "Untitled",
                                         subtitle: track.artistName,
                                         coverUrl: track.coverUrl,
                                         trackId: track.id,
                                         artistId: track.artists?.id)
                            }
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
                    // Artists from search
                    if let artists = r.artists, !artists.isEmpty {
                        SectionHeader("Artists")
                        ForEach(artists) { artist in
                            NavigationLink(value: NavTarget.artist(artist.id)) {
                                ArtistRow(artist: artist)
                            }
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
            .padding(.horizontal, 16)
        }
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

// Tile used in grids — cover + title + tappable artist name
struct MediaTile: View {
    let title: String
    let subtitle: String
    let coverUrl: String?
    let trackId: String?
    let artistId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            CoverArt(trackId: trackId, remoteUrl: coverUrl, corner: 12)
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.text).lineLimit(1)
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

// Row used in lists — cover + title/subtitle + tappable artist
struct TrackRow: View {
    let title: String
    let subtitle: String
    let coverUrl: String?
    let trackId: String?
    let artistId: String?

    var body: some View {
        HStack(spacing: 12) {
            CoverArt(trackId: trackId, remoteUrl: coverUrl)
                .frame(width: 46, height: 46)
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
// Every top-level view registers the same .navigationDestination; this helper
// keeps them consistent.
@ViewBuilder
func navDestination(_ target: NavTarget) -> some View {
    switch target {
    case .album(let id):
        AlbumView(albumId: id)
    case .artist(let id):
        ArtistProfileView(artistId: id)
    }
}
