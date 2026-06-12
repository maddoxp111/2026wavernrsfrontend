import SwiftUI

enum Page: String, CaseIterable {
    case home = "Home"
    case discover = "Discover"
    case charts = "Charts"
    case archive = "Archive"
    case artists = "Artists"
    case search = "Search"
    case downloads = "Downloads"

    var icon: String {
        switch self {
        case .home: return "house"
        case .discover: return "sparkles"
        case .charts: return "chart.bar"
        case .archive: return "archivebox"
        case .artists: return "person.2"
        case .search: return "magnifyingglass"
        case .downloads: return "arrow.down.circle"
        }
    }

    // The pages that get a slot in the bottom tab bar.
    static let tabPages: [Page] = [.home, .discover, .search, .downloads]
}

struct ContentView: View {
    @State private var page: Page = .home
    @State private var drawerOpen = false
    @State private var showFullPlayer = false
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ZStack(alignment: .leading) {
            // ── Background ──
            AppBackground()

            // ── Main content ──
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
                        VStack(spacing: 0) {
                            if player.current != nil {
                                MiniPlayerBar { showFullPlayer = true }
                            }
                            BottomTabBar(page: $page)
                        }
                    }
                    .toolbarBackground(.visible, for: .navigationBar)
            }
            .disabled(drawerOpen)

            // ── Drawer overlay ──
            if drawerOpen {
                Color.black.opacity(0.45)
                    .ignoresSafeArea()
                    .onTapGesture { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } }

                SidebarView(
                    page: $page,
                    close: { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } }
                )
                .transition(.move(edge: .leading))
            }
        }
        .sheet(isPresented: $showFullPlayer) {
            NowPlayingView()
        }
    }

    @ViewBuilder
    private var pageView: some View {
        switch page {
        case .home: HomeView()
        case .discover: DiscoverView()
        case .charts: ChartsView()
        case .archive: ArchiveView()
        case .artists: ArtistsView()
        case .search: SearchView()
        case .downloads: DownloadsView()
        }
    }
}

// ── Bottom tab bar ───────────────────────────────────────────────────────────

struct BottomTabBar: View {
    @Binding var page: Page

    var body: some View {
        HStack {
            ForEach(Page.tabPages, id: \.self) { p in
                Button {
                    page = p
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: p.icon)
                            .font(.system(size: 19, weight: .medium))
                        Text(p.rawValue)
                            .font(.system(size: 9.5, weight: .semibold))
                    }
                    .foregroundColor(page == p ? Theme.accent : Theme.text3)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 4)
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .overlay(Rectangle().fill(Theme.hairline).frame(height: 0.5), alignment: .top)
                .ignoresSafeArea(edges: .bottom)
        )
    }
}

// ── Sidebar (drawer) ─────────────────────────────────────────────────────────

struct SidebarView: View {
    @Binding var page: Page
    let close: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("wavernrs")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(Theme.text)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 18)

            ForEach(Page.allCases, id: \.self) { p in
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
                    .padding(.horizontal, 16)
                    .background(page == p ? Theme.accent.opacity(0.12) : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.horizontal, 10)
            }

            Spacer()

            // Web link — uploading/managing happens on wavernrs.com
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
        // Background extends behind safe areas; the content above respects them.
        .background(
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
        )
    }
}
