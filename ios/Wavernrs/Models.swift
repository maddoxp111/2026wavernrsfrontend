import Foundation

// ── API models ────────────────────────────────────────────────────────────────
// Field names mirror the backend JSON (Supabase snake_case) via CodingKeys.

struct Artist: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String?
    let profileImageUrl: String?
    let isVerified: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case profileImageUrl = "profile_image_url"
        case isVerified = "is_verified"
    }
}

struct ArtistFull: Codable, Identifiable, Hashable {
    let id: String
    let displayName: String?
    let bio: String?
    let profileImageUrl: String?
    let bannerUrl: String?
    let location: String?
    let website: String?
    let trackCount: Int?
    let followerCount: Int?
    let isVerified: Bool?

    enum CodingKeys: String, CodingKey {
        case id, bio, location, website
        case displayName = "display_name"
        case profileImageUrl = "profile_image_url"
        case bannerUrl = "banner_url"
        case trackCount = "track_count"
        case followerCount = "follower_count"
        case isVerified = "is_verified"
    }

    var name: String { displayName ?? "Unknown" }
}

struct Track: Codable, Identifiable, Hashable {
    let id: String
    let title: String?
    let iaUrl: String?
    let coverUrl: String?
    let playCount: Int?
    let createdAt: String?
    let albumId: String?
    let trackPosition: Int?
    let isArchive: Bool?
    let isExclusive: Bool?
    let artists: Artist?

    enum CodingKeys: String, CodingKey {
        case id, title, artists
        case iaUrl = "ia_url"
        case coverUrl = "cover_url"
        case playCount = "play_count"
        case createdAt = "created_at"
        case albumId = "album_id"
        case trackPosition = "track_position"
        case isArchive = "is_archive"
        case isExclusive = "is_exclusive"
    }

    var artistName: String { artists?.displayName ?? "Unknown" }
}

struct AlbumTrackEntry: Codable, Identifiable, Hashable {
    let id: String
    let position: Int?
    let tracks: Track?
}

struct Album: Codable, Identifiable, Hashable {
    let id: String
    let title: String?
    let coverUrl: String?
    let description: String?
    let playCount: Int?
    let createdAt: String?
    let isArchive: Bool?
    let archiveArtistName: String?
    let sourceUrl: String?
    let isHighlighted: Bool?
    let isExclusive: Bool?
    let artists: Artist?
    let albumTracks: [AlbumTrackEntry]?

    enum CodingKeys: String, CodingKey {
        case id, title, description, artists
        case coverUrl = "cover_url"
        case playCount = "play_count"
        case createdAt = "created_at"
        case isArchive = "is_archive"
        case archiveArtistName = "archive_artist_name"
        case sourceUrl = "source_url"
        case isHighlighted = "is_highlighted"
        case isExclusive = "is_exclusive"
        case albumTracks = "album_tracks"
    }

    var artistName: String {
        if isArchive == true, let n = archiveArtistName, !n.isEmpty { return n }
        return artists?.displayName ?? "Unknown"
    }

    var sortedTracks: [Track] {
        (albumTracks ?? [])
            .sorted { ($0.position ?? 0) < ($1.position ?? 0) }
            .compactMap { $0.tracks }
    }
}

// Discover returns a mixed feed where each item carries `_type`.
enum FeedItem: Codable, Identifiable, Hashable {
    case track(Track)
    case album(Album)

    var id: String {
        switch self {
        case .track(let t): return "t-" + t.id
        case .album(let a): return "a-" + a.id
        }
    }

    private enum TypeKeys: String, CodingKey { case type = "_type" }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: TypeKeys.self)
        let kind = (try? c.decode(String.self, forKey: .type)) ?? "track"
        if kind == "album" {
            self = .album(try Album(from: decoder))
        } else {
            self = .track(try Track(from: decoder))
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .track(let t): try t.encode(to: encoder)
        case .album(let a): try a.encode(to: encoder)
        }
    }
}

struct DiscoverResponse: Codable {
    let recent: [FeedItem]
    let trending: [Track]?
}

struct ChartsBucket: Codable {
    let alltime: [ChartsItem]?
    let weekly: [ChartsItem]?
}

// Charts items are tracks or albums enriched with score fields.
struct ChartsItem: Codable, Identifiable, Hashable {
    let id: String
    let title: String?
    let coverUrl: String?
    let playCount: Int?
    let likeCount: Int?
    let wavernrsScore: Double?
    let albumId: String?
    let artists: Artist?
    let archiveArtistName: String?

    enum CodingKeys: String, CodingKey {
        case id, title, artists
        case coverUrl = "cover_url"
        case playCount = "play_count"
        case likeCount = "like_count"
        case wavernrsScore = "wavernrs_score"
        case albumId = "album_id"
        case archiveArtistName = "archive_artist_name"
    }

    var artistName: String { artists?.displayName ?? archiveArtistName ?? "Unknown" }
}

struct ChartsResponse: Codable {
    let edits: ChartsBucket?
    let comps: ChartsBucket?
}

struct SearchResponse: Codable {
    let tracks: [Track]?
    let artists: [Artist]?
    let albums: [Album]?
    let archived: [Album]?
}

// ── Playback / downloads ─────────────────────────────────────────────────────

// The unit the player and download manager work with — built either from an
// online Track or from a saved download.
struct PlayableTrack: Identifiable, Hashable, Codable {
    let id: String
    let title: String
    let artistName: String
    let remoteAudioUrl: String?
    let remoteCoverUrl: String?
    let albumId: String?
    let albumTitle: String?
    let position: Int

    init(track: Track, album: Album? = nil) {
        self.id = track.id
        self.title = track.title ?? "Untitled"
        self.artistName = album?.artistName ?? track.artistName
        self.remoteAudioUrl = track.iaUrl
        self.remoteCoverUrl = track.coverUrl ?? album?.coverUrl
        self.albumId = album?.id ?? track.albumId
        self.albumTitle = album?.title
        self.position = track.trackPosition ?? 0
    }

    init(id: String, title: String, artistName: String, remoteAudioUrl: String?,
         remoteCoverUrl: String?, albumId: String?, albumTitle: String?, position: Int) {
        self.id = id
        self.title = title
        self.artistName = artistName
        self.remoteAudioUrl = remoteAudioUrl
        self.remoteCoverUrl = remoteCoverUrl
        self.albumId = albumId
        self.albumTitle = albumTitle
        self.position = position
    }
}
