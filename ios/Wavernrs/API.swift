import Foundation

// Thin async client for the wavernrs backend. Listening-only — no auth needed
// for any of the endpoints the app uses.
enum API {
    static let base = URL(string: "https://2026wavernrs-production.up.railway.app/api")!

    enum APIError: LocalizedError {
        case badStatus(Int)
        var errorDescription: String? {
            switch self {
            case .badStatus(let code): return "Server returned \(code)"
            }
        }
    }

    private static func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        var comps = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        let (data, resp) = try await URLSession.shared.data(from: comps.url!)
        if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.badStatus(http.statusCode)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func discover() async throws -> DiscoverResponse {
        try await get("discover")
    }

    static func charts() async throws -> ChartsResponse {
        try await get("charts")
    }

    static func archive() async throws -> [Album] {
        try await get("archive")
    }

    static func album(id: String) async throws -> Album {
        try await get("albums/\(id)")
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

    // Fire-and-forget stream count. Failures (e.g. offline) are ignored.
    static func reportPlay(trackId: String) {
        var req = URLRequest(url: base.appendingPathComponent("tracks/\(trackId)/play"))
        req.httpMethod = "POST"
        URLSession.shared.dataTask(with: req).resume()
    }
}
