import Foundation

enum API {
    static let base = URL(string: "https://2026wavernrs-production.up.railway.app/api")!

    enum APIError: LocalizedError {
        case badStatus(Int)
        var errorDescription: String? {
            switch self { case .badStatus(let c): return "Server returned \(c)" }
        }
    }

    private static func get<T: Decodable>(_ path: String,
                                           query: [URLQueryItem] = [],
                                           token: String? = nil) async throws -> T {
        var comps = URLComponents(url: base.appendingPathComponent(path),
                                  resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        var req = URLRequest(url: comps.url!)
        if let t = token { req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }
        let (data, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.badStatus(http.statusCode)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func post<T: Decodable>(_ path: String,
                                            body: [String: String]) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONEncoder().encode(body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.badStatus(http.statusCode)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // Authenticated POST with an arbitrary JSON body. Pass `Empty.self`-style
    // throwaway decoding by decoding into the expected response type.
    private static func authedPost<T: Decodable>(_ path: String,
                                                  body: [String: Any] = [:],
                                                  token: String) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if !body.isEmpty {
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        let (data, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.badStatus(http.statusCode)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // ── Discover ──────────────────────────────────────────────────────────────

    static func discover() async throws -> DiscoverResponse {
        try await get("discover")
    }

    static func discoverTrending() async throws -> [Track] {
        try await get("discover/trending")
    }

    static func discoverHighlighted() async throws -> [FeedItem] {
        try await get("discover/highlighted")
    }

    static func discoverEra(id: String) async throws -> [FeedItem] {
        try await get("discover/era/\(id)")
    }

    static func eraTags() async throws -> [EraTag] {
        try await get("eratags")
    }

    // ── Content ───────────────────────────────────────────────────────────────

    static func charts() async throws -> ChartsResponse {
        try await get("charts")
    }

    static func archive() async throws -> [Album] {
        try await get("archive")
    }

    static func album(id: String, token: String? = nil) async throws -> Album {
        try await get("albums/\(id)", token: token)
    }

    static func track(id: String) async throws -> Track {
        try await get("tracks/\(id)")
    }

    static func search(_ q: String) async throws -> SearchResponse {
        try await get("search", query: [URLQueryItem(name: "q", value: q)])
    }

    static func artist(id: String) async throws -> ArtistFull {
        try await get("artists/\(id)")
    }

    static func artistTracks(id: String) async throws -> [Track] {
        try await get("artists/\(id)/tracks")
    }

    static func artistAlbums(id: String) async throws -> [Album] {
        try await get("albums/by-artist/\(id)")
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    static func login(username: String, password: String) async throws -> LoginResponse {
        try await post("auth/login", body: ["username": username, "password": password])
    }

    static func me(token: String) async throws -> UserProfile {
        try await get("auth/me", token: token)
    }

    // ── Playlists ─────────────────────────────────────────────────────────────

    static func myPlaylists(token: String) async throws -> [PlaylistSummary] {
        try await get("playlists/mine", token: token)
    }

    static func playlist(id: String, token: String? = nil) async throws -> PlaylistDetail {
        try await get("playlists/\(id)", token: token)
    }

    static func addTrackToPlaylist(playlistId: String, trackId: String, token: String) async throws {
        var req = URLRequest(url: base.appendingPathComponent("playlists/\(playlistId)/tracks"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONEncoder().encode(["track_id": trackId])
        let (_, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.badStatus(http.statusCode)
        }
    }

    // ── Social: follows, likes, ratings ───────────────────────────────────────

    static func followStatus(artistId: String, token: String?) async throws -> FollowStatus {
        try await get("artists/\(artistId)/follow", token: token)
    }

    static func toggleFollow(artistId: String, token: String) async throws -> FollowStatus {
        try await authedPost("artists/\(artistId)/follow", token: token)
    }

    static func toggleAlbumLike(albumId: String, token: String) async throws -> LikeStatus {
        try await authedPost("albums/\(albumId)/like", token: token)
    }

    static func ratings(entityType: String, entityId: String, token: String?) async throws -> RatingSummary {
        try await get("ratings/\(entityType)/\(entityId)", token: token)
    }

    static func setRating(entityType: String, entityId: String, rating: Int, token: String) async throws {
        struct OK: Decodable { let ok: Bool? }
        let _: OK = try await authedPost(
            "ratings",
            body: ["entity_id": entityId, "entity_type": entityType, "rating": rating],
            token: token
        )
    }

    // ── Release (album) comments ──────────────────────────────────────────────

    static func albumComments(albumId: String, token: String?) async throws -> [ReleaseComment] {
        try await get("albums/\(albumId)/comments", token: token)
    }

    static func postAlbumComment(albumId: String, body: String, token: String) async throws -> ReleaseComment {
        try await authedPost("albums/\(albumId)/comments", body: ["body": body], token: token)
    }

    static func voteAlbumComment(albumId: String, commentId: String, vote: Int, token: String) async throws -> VoteResult {
        try await authedPost("albums/\(albumId)/comments/\(commentId)/vote", body: ["vote": vote], token: token)
    }

    // ── Community ─────────────────────────────────────────────────────────────

    static func communityPosts(token: String?) async throws -> [CommunityPost] {
        try await get("community/posts", token: token)
    }

    static func communityPost(id: String, token: String?) async throws -> CommunityPostDetail {
        try await get("community/posts/\(id)", token: token)
    }

    static func createCommunityPost(title: String, body: String, token: String) async throws -> CommunityPost {
        try await authedPost("community/posts", body: ["title": title, "body": body], token: token)
    }

    static func voteCommunityPost(id: String, vote: Int, token: String) async throws -> VoteResult {
        try await authedPost("community/posts/\(id)/vote", body: ["vote": vote], token: token)
    }

    static func postCommunityComment(postId: String, body: String, parentId: String? = nil, token: String) async throws -> CommunityComment {
        var payload: [String: Any] = ["body": body]
        if let parentId { payload["parent_id"] = parentId }
        return try await authedPost("community/posts/\(postId)/comments", body: payload, token: token)
    }

    static func voteCommunityComment(commentId: String, vote: Int, token: String) async throws -> VoteResult {
        try await authedPost("community/comments/\(commentId)/vote", body: ["vote": vote], token: token)
    }

    // ── Fire-and-forget ───────────────────────────────────────────────────────

    static func reportPlay(trackId: String) {
        var req = URLRequest(url: base.appendingPathComponent("tracks/\(trackId)/play"))
        req.httpMethod = "POST"
        URLSession.shared.dataTask(with: req).resume()
    }
}
