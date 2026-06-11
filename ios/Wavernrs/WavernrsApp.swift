import SwiftUI

@main
struct WavernrsApp: App {
    @StateObject private var player = PlayerManager.shared
    @StateObject private var downloads = DownloadManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(player)
                .environmentObject(downloads)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}
