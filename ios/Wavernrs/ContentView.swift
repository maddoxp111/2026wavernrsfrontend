import SwiftUI

enum Page: String, CaseIterable {
    case home = "Home"
    case charts = "Charts"
    case archive = "Archive"
    case artists = "Artists"
    case search = "Search"
    case downloads = "Downloads"

    var icon: String {
        switch self {
        case .home: return "house"
        case .charts: return "chart.bar"
        case .archive: return "archivebox"
        case .artists: return "person.2"
        case .search: return "magnifyingglass"
        case .downloads: return "arrow.down.circle"
        }
    }
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
                        if player.current != nil {
                            MiniPlayerBar { showFullPlayer = true }
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
        case .charts: ChartsView()
        case .archive: ArchiveView()
        case .artists: ArtistsView()
        case .search: SearchView()
        case .downloads: DownloadsView()
        }
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
                .padding(.top, 28)
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

            // Bottom note — Artist management is web-only (uploading/profiles)
            VStack(alignment: .leading, spacing: 6) {
                Divider().background(Theme.hairline)
                HStack(spacing: 8) {
                    Image(systemName: "globe")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.text3)
                    Text("Upload & manage at wavernrs.com")
                        .font(.system(size: 11.5))
                        .foregroundColor(Theme.text3)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .frame(width: 270, alignment: .leading)
        .frame(maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .ignoresSafeArea()
    }
}
