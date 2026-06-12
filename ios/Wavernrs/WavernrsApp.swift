import SwiftUI

@main
struct WavernrsApp: App {
    @StateObject private var player = PlayerManager.shared
    @StateObject private var downloads = DownloadManager.shared
    @StateObject private var auth = AuthManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(player)
                .environmentObject(downloads)
                .environmentObject(auth)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}
