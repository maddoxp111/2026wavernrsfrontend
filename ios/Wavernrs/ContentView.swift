import SwiftUI

enum Page: String, CaseIterable {
    // Declaration order controls allCases order (used in the sidebar).
    // Search is last per design.
    case home = "Home"
    case discover = "Discover"
    case charts = "Charts"
    case archive = "Archive"
    case artists = "Artists"
    case community = "Community"
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
        case .community: return "bubble.left.and.bubble.right"
        case .downloads: return "arrow.down.circle"
        case .account: return "person.circle"
        case .search: return "magnifyingglass"
        }
    }

    // Bottom tab bar: sign-in replaces downloads, search is last.
    static let tabPages: [Page] = [.home, .discover, .account, .search]

    // Sidebar: all except account (it lives in the tab bar).
    static let sidebarPages: [Page] = [.home, .discover, .charts, .archive, .artists, .community, .downloads, .search]
}

struct ContentView: View {
    @State private var page: Page = .home
    @State private var drawerOpen = false
    @State private var showFullPlayer = false
    // Programmatic path for the Home tab — drawer-only pages push onto it.
    @State private var homePath = NavigationPath()
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                glassLayout
            } else {
                legacyLayout
            }
        }
        .sheet(isPresented: $showFullPlayer) { NowPlayingView() }
    }

    // ── iOS 26+: native Liquid Glass tab bar with the mini player docked as a
    // bottom accessory (Apple Music style). The bar minimizes on scroll and the
    // search tab floats separately, all provided by the system.
    @available(iOS 26.0, *)
    private var glassLayout: some View {
        ZStack(alignment: .leading) {
            TabView(selection: $page) {
                Tab(Page.home.rawValue, systemImage: Page.home.icon, value: Page.home) {
                    // Home owns a programmatic path so the drawer can push
                    // its pages while the tab bar and mini player stay up.
                    NavigationStack(path: $homePath) {
                        pageView(for: .home)
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar { navToolbar }
                    }
                }
                Tab(Page.discover.rawValue, systemImage: Page.discover.icon, value: Page.discover) {
                    pageNav(.discover)
                }
                Tab(Page.account.rawValue, systemImage: Page.account.icon, value: Page.account) {
                    pageNav(.account)
                }
                Tab(Page.search.rawValue, systemImage: Page.search.icon, value: Page.search, role: .search) {
                    pageNav(.search)
                }
            }
            .tabBarMinimizeBehavior(.onScrollDown)
            .tabViewBottomAccessory {
                MiniPlayerAccessory { showFullPlayer = true }
            }
            .disabled(drawerOpen)

            if drawerOpen { drawerOverlay }
        }
    }

    // ── Pre-iOS 26: custom glass pill bar + mini player in a safe-area inset ──
    private var legacyLayout: some View {
        ZStack(alignment: .leading) {
            AppBackground()

            NavigationStack {
                pageView(for: page)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { navToolbar }
                    .toolbarBackground(.visible, for: .navigationBar)
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 4) {
                    MiniPlayerBar { showFullPlayer = true }
                    BottomTabBar(page: $page)
                }
                // Pull the bar down toward the home indicator.
                .padding(.bottom, -14)
            }
            .disabled(drawerOpen)

            if drawerOpen { drawerOverlay }
        }
    }

    // ── Shared pieces ─────────────────────────────────────────────────────────

    @ViewBuilder
    private var drawerOverlay: some View {
        Color.black.opacity(0.45)
            .ignoresSafeArea()
            .onTapGesture { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } }

        SidebarView(current: page,
                    select: { selectSidebarPage($0) },
                    close: { withAnimation(.easeOut(duration: 0.22)) { drawerOpen = false } })
            .transition(.move(edge: .leading))
    }

    private func selectSidebarPage(_ p: Page) {
        if #available(iOS 26.0, *), !Page.tabPages.contains(p) {
            // Drawer-only pages aren't tabs in the native bar — push them on
            // the Home stack so the tab bar and mini player stay visible.
            page = .home
            homePath.append(NavTarget.page(p))
        } else {
            page = p
        }
    }

    @ToolbarContentBuilder
    private var navToolbar: some ToolbarContent {
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

    private func pageNav(_ p: Page) -> some View {
        NavigationStack {
            pageView(for: p)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { navToolbar }
        }
    }

    @ViewBuilder
    private func pageView(for p: Page) -> some View {
        switch p {
        case .home: HomeView()
        case .discover: DiscoverView()
        case .charts: ChartsView()
        case .archive: ArchiveView()
        case .artists: ArtistsView()
        case .community: CommunityView()
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
    let current: Page
    let select: (Page) -> Void
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
                    select(p)
                    close()
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: p.icon)
                            .font(.system(size: 16, weight: .medium))
                            .frame(width: 24)
                        Text(p.rawValue)
                            .font(.system(size: 15, weight: current == p ? .bold : .regular))
                        Spacer()
                    }
                    .foregroundColor(current == p ? Theme.accent : Theme.text)
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
