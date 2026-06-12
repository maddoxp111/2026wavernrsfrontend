import SwiftUI

enum Page: String, CaseIterable {
    // Declaration order controls allCases order (used in the sidebar).
    // Search is last per design.
    case home = "Home"
    case discover = "Discover"
    case charts = "Charts"
    case archive = "Archive"
    case artists = "Artists"
    case downloads = "Downloads"
    case account = "Account"
    case search = "Search"

    var icon: String {
        switch self {
        case .home: return "house"
        case .discover: return "music.note"
        case .charts: return "chart.bar"
        case .archive: return "archivebox"
        case .artists: return "person.2"
        case .downloads: return "arrow.down.circle"
        case .account: return "person.circle"
        case .search: return "magnifyingglass"
        }
    }

    // Bottom tab bar: sign-in replaces downloads, search is last.
    static let tabPages: [Page] = [.home, .discover, .account, .search]

    // Sidebar: all except account (it lives in the tab bar).
    static let sidebarPages: [Page] = [.home, .discover, .charts, .archive, .artists, .downloads, .search]
}

struct ContentView: View {
    @State private var page: Page = .home
    @State private var drawerOpen = false
    @State private var showFullPlayer = false
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ZStack(alignment: .leading) {
            AppBackground()

            NavigationStack {
                pageView
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button {
                                withAnimation(.easeOut(duration: 0.22)) { drawerOpen = true }
                            } label: {
                                Image(systemName: "line.3.horizontal")
                                    .foregroundColor(Theme.text)
                            }
                        }
                        ToolbarItem(placement: .principal) {
                            Text("wavernrs")
                                .font(.system(size: 17, weight: .heavy))
                                .foregroundColor(Theme.text)
                        }
                    }
                    .safeAreaInset(edge: .bottom) {
                        VStack(spacing: 4) {
                            if player.current != nil {
                                MiniPlayerBar { showFullPlayer = true }
                            }
                            BottomTabBar(page: $page)
                        }
                        // Pull the bar down toward the home indicator.
                        .padding(.bottom, -14)
                    }
                    .toolbarBackground(.visible, for: .navigationBar)
            }
            .disabled(drawerOpen)

            if drawerOpen {
                Color.black.opacity(0.45)
                    .ignoresSafeArea()
                    .onTapGesture { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } }

                SidebarView(page: $page,
                            close: { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } })
                    .transition(.move(edge: .leading))
            }
        }
        .sheet(isPresented: $showFullPlayer) { NowPlayingView() }
    }

    @ViewBuilder
    private var pageView: some View {
        switch page {
        case .home: HomeView()
        case .discover: DiscoverView()
        case .charts: ChartsView()
        case .archive: ArchiveView()
        case .artists: ArtistsView()
        case .downloads: DownloadsView()
        case .account: AccountView()
        case .search: SearchView()
        }
    }
}

// ── Bottom tab bar — floating glass pill ─────────────────────────────────────

struct BottomTabBar: View {
    @Binding var page: Page

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Page.tabPages, id: \.self) { p in
                Button {
                    page = p
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: p.icon)
                            .font(.system(size: 20, weight: .medium))
                        Text(p.rawValue)
                            .font(.system(size: 9.5, weight: .semibold))
                    }
                    .foregroundColor(page == p ? Theme.accent : .white.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
            }
        }
        .padding(.horizontal, 12)
        .glassPill()
        .padding(.horizontal, 24)
        .padding(.bottom, 2)
    }
}

// ── Sidebar (drawer) ─────────────────────────────────────────────────────────

struct SidebarView: View {
    @Binding var page: Page
    let close: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("wavernrs")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(Theme.text)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 14)

            ForEach(Page.sidebarPages, id: \.self) { p in
                Button {
                    page = p
                    close()
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: p.icon)
                            .font(.system(size: 16, weight: .medium))
                            .frame(width: 24)
                        Text(p.rawValue)
                            .font(.system(size: 15, weight: page == p ? .bold : .regular))
                        Spacer()
                    }
                    .foregroundColor(page == p ? Theme.accent : Theme.text)
                    .padding(.vertical, 11)
                    .padding(.horizontal, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .wvCard(corner: 12)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 10)
            }

            Spacer()

            // Open wavernrs.com — upload / profile management
            Link(destination: URL(string: "https://wavernrs.com")!) {
                HStack(spacing: 10) {
                    Image(systemName: "globe")
                        .font(.system(size: 14))
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Upload & manage")
                            .font(.system(size: 13, weight: .semibold))
                        Text("wavernrs.com")
                            .font(.system(size: 11))
                            .opacity(0.7)
                    }
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 12, weight: .semibold))
                        .opacity(0.7)
                }
                .foregroundColor(Theme.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .wvCard(corner: 12)
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 16)
        }
        .frame(width: 270, alignment: .leading)
        .frame(maxHeight: .infinity)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
        )
    }
}
