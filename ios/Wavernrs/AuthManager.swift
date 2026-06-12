import Foundation
import Combine

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var user: UserProfile?
    @Published private(set) var playlists: [PlaylistSummary] = []
    @Published var isLoading = false
    @Published var loginError: String?

    private let tokenKey = "wavernrs_jwt_token"

    var token: String? {
        get { UserDefaults.standard.string(forKey: tokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: tokenKey) }
    }

    var isLoggedIn: Bool { user != nil }

    private init() {
        Task { await tryRestoreSession() }
    }

    // Silently restores session on cold launch if a saved token exists.
    private func tryRestoreSession() async {
        guard let t = token else { return }
        do {
            user = try await API.me(token: t)
            await loadPlaylists()
        } catch {
            token = nil // token expired or invalid
        }
    }

    func login(username: String, password: String) async {
        guard !username.isEmpty, !password.isEmpty else {
            loginError = "Please enter your username and password."; return
        }
        isLoading = true; loginError = nil
        do {
            let result = try await API.login(username: username, password: password)
            token = result.token
            user = try await API.me(token: result.token)
            await loadPlaylists()
        } catch {
            loginError = "Incorrect username or password."
        }
        isLoading = false
    }

    func logout() {
        token = nil; user = nil; playlists = []
    }

    func loadPlaylists() async {
        guard let t = token else { return }
        playlists = (try? await API.myPlaylists(token: t)) ?? []
    }
}
