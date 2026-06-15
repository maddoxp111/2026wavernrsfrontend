import Foundation

// ── API models ────────────────────────────────────────────────────────────────

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
    let likeCount: Int?
    let userLiked: Bool?
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
        case likeCount = "like_count"
        case userLiked = "user_liked"
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
    let likeCount: Int?
    let userLiked: Bool?
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
        case likeCount = "like_count"
        case userLiked = "user_liked"
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

// ── Era tags ─────────────────────────────────────────────────────────────────

struct EraTag: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let position: Int?
}

// ── Auth & user ──────────────────────────────────────────────────────────────

struct LoginResponse: Codable {
    let token: String
    let user: LoginUser

    struct LoginUser: Codable {
        let id: String
        let username: String
    }
}

struct UserProfile: Codable, Identifiable {
    let id: String
    let username: String
    let artist: ArtistFull?
}

// ── Playlists ────────────────────────────────────────────────────────────────

struct PlaylistSummary: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let trackCount: Int?
    let isPublic: Bool?

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case trackCount = "track_count"
        case isPublic = "is_public"
    }
}

struct PlaylistDetail: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let isPublic: Bool?
    let tracks: [PlaylistTrackEntry]?
}

struct PlaylistTrackEntry: Codable, Identifiable {
    let id: String
    let title: String?
    let coverUrl: String?
    let iaUrl: String?
    let artistName: String?
    let position: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, position
        case coverUrl = "cover_url"
        case iaUrl = "ia_url"
        case artistName = "artist_name"
    }

    func toPlayable() -> PlayableTrack {
        PlayableTrack(id: id, title: title ?? "Untitled",
                      artistName: artistName ?? "Unknown", artistId: nil,
                      remoteAudioUrl: iaUrl, remoteCoverUrl: coverUrl,
                      albumId: nil, albumTitle: nil, position: position ?? 0)
    }
}

// ── Playback / downloads ─────────────────────────────────────────────────────

struct PlayableTrack: Identifiable, Hashable, Codable {
    let id: String
    let title: String
    let artistName: String
    let artistId: String?
    let remoteAudioUrl: String?
    let remoteCoverUrl: String?
    let albumId: String?
    let albumTitle: String?
    let position: Int

    init(track: Track, album: Album? = nil) {
        self.id = track.id
        self.title = track.title ?? "Untitled"
        self.artistName = album?.artistName ?? track.artistName
        self.artistId = track.artists?.id
        self.remoteAudioUrl = track.iaUrl
        self.remoteCoverUrl = track.coverUrl ?? album?.coverUrl
        self.albumId = album?.id ?? track.albumId
        self.albumTitle = album?.title
        self.position = track.trackPosition ?? 0
    }

    init(id: String, title: String, artistName: String, artistId: String?,
         remoteAudioUrl: String?, remoteCoverUrl: String?,
         albumId: String?, albumTitle: String?, position: Int) {
        self.id = id
        self.title = title
        self.artistName = artistName
        self.artistId = artistId
        self.remoteAudioUrl = remoteAudioUrl
        self.remoteCoverUrl = remoteCoverUrl
        self.albumId = albumId
        self.albumTitle = albumTitle
        self.position = position
    }
}

struct IdentifiableString: Identifiable {
    let value: String
    var id: String { value }
}

// ── Social: follows, likes, ratings ──────────────────────────────────────────

struct FollowStatus: Codable {
    let following: Bool
    let followerCount: Int

    enum CodingKeys: String, CodingKey {
        case following
        case followerCount = "follower_count"
    }
}

struct LikeStatus: Codable {
    let liked: Bool
}

struct RatingSummary: Codable {
    let avg: Double?
    let count: Int
    let userRating: Int?

    enum CodingKeys: String, CodingKey {
        case avg, count
        case userRating = "user_rating"
    }
}

// ── Release (album) comments ─────────────────────────────────────────────────

struct ReleaseComment: Codable, Identifiable {
    let id: String
    let body: String?
    let createdAt: String?
    let userId: String?
    let parentId: String?
    var netVotes: Int?
    var userVote: Int?
    let users: CommentUser?

    struct CommentUser: Codable {
        let username: String?
    }

    enum CodingKeys: String, CodingKey {
        case id, body, users
        case createdAt = "created_at"
        case userId = "user_id"
        case parentId = "parent_id"
        case netVotes = "net_votes"
        case userVote = "user_vote"
    }

    var username: String { users?.username ?? "unknown" }
}

// ── Community ────────────────────────────────────────────────────────────────

struct CommunityPost: Codable, Identifiable {
    let id: String
    let title: String?
    let body: String?
    let username: String?
    let artistId: String?
    let profileImageUrl: String?
    let createdAt: String?
    let userId: String?
    var netVotes: Int?
    let commentCount: Int?
    var userVote: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, body, username
        case artistId = "artist_id"
        case profileImageUrl = "profile_image_url"
        case createdAt = "created_at"
        case userId = "user_id"
        case netVotes = "net_votes"
        case commentCount = "comment_count"
        case userVote = "user_vote"
    }
}

struct CommunityComment: Codable, Identifiable {
    let id: String
    let postId: String?
    let parentId: String?
    let body: String?
    let username: String?
    let artistId: String?
    let profileImageUrl: String?
    let createdAt: String?
    let userId: String?
    var netVotes: Int?
    var userVote: Int?

    enum CodingKeys: String, CodingKey {
        case id, body, username
        case postId = "post_id"
        case parentId = "parent_id"
        case artistId = "artist_id"
        case profileImageUrl = "profile_image_url"
        case createdAt = "created_at"
        case userId = "user_id"
        case netVotes = "net_votes"
        case userVote = "user_vote"
    }
}

struct CommunityPostDetail: Codable {
    let post: CommunityPost
    let comments: [CommunityComment]
}

struct VoteResult: Codable {
    let netVotes: Int?
    let userVote: Int?

    enum CodingKeys: String, CodingKey {
        case netVotes = "net_votes"
        case userVote = "user_vote"
    }
}
