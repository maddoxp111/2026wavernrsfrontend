import SwiftUI

enum Page: String, CaseIterable {
    case home = "Home"
    case charts = "Charts"
    case archive = "Archive"
    case search = "Search"
    case downloads = "Downloads"

    var icon: String {
        switch self {
        case .home: return "house"
        case .charts: return "chart.bar"
        case .archive: return "archivebox"
        case .search: return "magnifyingglass"
        case .downloads: return "arrow.down.circle"
        }
    }
}

struct ContentView: View {
    @State private var page: Page = .home
    @State private var drawerOpen = false
    @State private var showArtistsAlert = false
    @State private var showFullPlayer = false
    @EnvironmentObject var player: PlayerManager

    var body: some View {
        ZStack(alignment: .leading) {
            // ── Main content ──
            NavigationStack {
                pageView
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button { withAnimation(.easeOut(duration: 0.2)) { drawerOpen = true } } label: {
                                Image(systemName: "line.3.horizontal")
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
                    .background(Theme.bg.ignoresSafeArea())
            }
            .disabled(drawerOpen)

            // ── Drawer overlay ──
            if drawerOpen {
                Color.black.opacity(0.5)
                    .ignoresSafeArea()
                    .onTapGesture { withAnimation(.easeOut(duration: 0.2)) { drawerOpen = false } }

                SidebarView(
                    page: $page,
                    close: { withAnimation(.easeOut(duration: 0.2)) { drawerOpen = false } },
                    artistsTapped: { showArtistsAlert = true }
                )
                .transition(.move(edge: .leading))
            }
        }
        .sheet(isPresented: $showFullPlayer) {
            NowPlayingView()
        }
        .alert("Artists live on the web", isPresented: $showArtistsAlert) {
            Button("Open wavernrs.com") {
                if let url = URL(string: "https://www.wavernrs.com") {
                    UIApplication.shared.open(url)
                }
            }
            Button("OK", role: .cancel) {}
        } message: {
            Text("Everything artist-related — uploading, artist profiles, your dashboard — is only available on the web at www.wavernrs.com. The app is for listening.")
        }
    }

    @ViewBuilder
    private var pageView: some View {
        switch page {
        case .home: HomeView()
        case .charts: ChartsView()
        case .archive: ArchiveView()
        case .search: SearchView()
        case .downloads: DownloadsView()
        }
    }
}

// ── Sidebar (drawer) ─────────────────────────────────────────────────────────

struct SidebarView: View {
    @Binding var page: Page
    let close: () -> Void
    let artistsTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("wavernrs")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(Theme.text)
                .padding(.horizontal, 18)
                .padding(.top, 24)
                .padding(.bottom, 16)

            ForEach(Page.allCases, id: \.self) { p in
                Button {
                    page = p
                    close()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: p.icon).frame(width: 22)
                        Text(p.rawValue)
                        Spacer()
                    }
                    .font(.system(size: 15, weight: page == p ? .bold : .regular))
                    .foregroundColor(page == p ? Theme.accent : Theme.text)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 18)
                    .background(page == p ? Theme.card : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.horizontal, 8)
            }

            Divider().background(Theme.hairline).padding(.vertical, 10)

            // Artists — listening-only app, so this just points at the web.
            Button {
                close()
                artistsTapped()
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.2").frame(width: 22)
                        Text("Artists")
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text3)
                    }
                    .font(.system(size: 15))
                    .foregroundColor(Theme.text)
                    Text("Artist features are web-only")
                        .font(.system(size: 11.5))
                        .foregroundColor(Theme.text3)
                        .padding(.leading, 34)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 18)
            }
            .padding(.horizontal, 8)

            Spacer()

            Text("listening-only app · everything else at wavernrs.com")
                .font(.system(size: 11))
                .foregroundColor(Theme.text3)
                .padding(18)
        }
        .frame(width: 280, alignment: .leading)
        .frame(maxHeight: .infinity)
        .background(Color(red: 0.08, green: 0.08, blue: 0.10))
        .ignoresSafeArea()
    }
}
