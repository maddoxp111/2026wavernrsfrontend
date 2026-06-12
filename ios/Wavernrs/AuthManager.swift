import Foundation
import Combine
import AuthenticationServices
import UIKit

@MainActor
final class AuthManager: NSObject, ObservableObject {
    static let shared = AuthManager()

    @Published private(set) var user: UserProfile?
    @Published private(set) var playlists: [PlaylistSummary] = []
    @Published var isLoading = false
    @Published var loginError: String?

    private let tokenKey = "wavernrs_jwt_token"
    private var webAuthSession: ASWebAuthenticationSession?

    var token: String? {
        get { UserDefaults.standard.string(forKey: tokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: tokenKey) }
    }

    var isLoggedIn: Bool { user != nil }

    private override init() {
        super.init()
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

    // ── OAuth (Google / Discord) ─────────────────────────────────────────────
    // Opens the provider's page in a secure system sheet; the backend finishes
    // the flow and redirects to wavernrs://auth-callback?token=… which the
    // session intercepts. No URL scheme registration needed for this API.

    enum OAuthProvider: String {
        case google, discord
        var label: String { rawValue.capitalized }
    }

    func loginWithOAuth(_ provider: OAuthProvider) {
        loginError = nil
        let url = API.base.appendingPathComponent("oauth/\(provider.rawValue)")
        var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "app", value: "1")]

        let session = ASWebAuthenticationSession(
            url: comps.url!,
            callbackURLScheme: "wavernrs"
        ) { [weak self] callbackURL, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if error != nil { return } // user cancelled — not an error state
                guard let cb = callbackURL,
                      let items = URLComponents(url: cb, resolvingAgainstBaseURL: false)?.queryItems,
                      let token = items.first(where: { $0.name == "token" })?.value, !token.isEmpty else {
                    self.loginError = "Sign-in with \(provider.label) failed. Try again."
                    return
                }
                await self.completeOAuth(token: token)
            }
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        webAuthSession = session
        session.start()
    }

    private func completeOAuth(token jwt: String) async {
        isLoading = true
        do {
            token = jwt
            user = try await API.me(token: jwt)
            await loadPlaylists()
        } catch {
            token = nil
            loginError = "Couldn't finish signing in. Try again."
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

// Presentation anchor for the OAuth sheet.
extension AuthManager: ASWebAuthenticationPresentationContextProviding {
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated { keyWindow() ?? ASPresentationAnchor() }
    }

    @MainActor
    private func keyWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
    }
}
