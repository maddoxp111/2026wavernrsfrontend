import SwiftUI

// ── Palette (dark base that makes glass pop) ─────────────────────────────────
enum Theme {
    static let bg = Color(red: 0.05, green: 0.05, blue: 0.08)
    // iOS 26 glass replaces these at runtime; kept as fallbacks for older builds.
    static let card = Color.white.opacity(0.07)
    static let hairline = Color.white.opacity(0.10)
    static let text = Color.white
    static let text2 = Color.white.opacity(0.65)
    static let text3 = Color.white.opacity(0.40)
    static let accent = Color(red: 0.95, green: 0.35, blue: 0.62)
}

// ── Liquid Glass card modifier ────────────────────────────────────────────────
// On iOS 26+ uses the native .glassEffect(). On older builds falls back to the
// manual frosted-card look so the project still compiles on Xcode < 26.
struct GlassCard: ViewModifier {
    var corner: CGFloat = 14
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: corner, style: .continuous))
        } else {
            content
                .background(Theme.card)
                .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: corner, style: .continuous)
                        .stroke(Theme.hairline, lineWidth: 1)
                )
        }
    }
}

extension View {
    func wvCard(corner: CGFloat = 14) -> some View { modifier(GlassCard(corner: corner)) }
    func glassPill() -> some View { modifier(GlassPill()) }
}

// ── Floating pill modifier for the bottom tab bar ─────────────────────────────
struct GlassPill: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.glassEffect(.regular, in: Capsule())
        } else {
            content
                .background(Capsule().fill(.ultraThinMaterial))
                .overlay(Capsule().stroke(Color.white.opacity(0.12), lineWidth: 1))
        }
    }
}

// ── App background gradient ───────────────────────────────────────────────────
// A rich dark gradient gives glass something interesting to refract.
struct AppBackground: View {
    var body: some View {
        ZStack {
            Theme.bg
            LinearGradient(
                stops: [
                    .init(color: Color(red: 0.25, green: 0.05, blue: 0.35).opacity(0.55), location: 0),
                    .init(color: Color.clear, location: 0.5),
                    .init(color: Color(red: 0.05, green: 0.10, blue: 0.30).opacity(0.45), location: 1),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .ignoresSafeArea()
    }
}

// ── Square cover art ──────────────────────────────────────────────────────────
struct CoverArt: View {
    let trackId: String?
    let remoteUrl: String?
    var corner: CGFloat = 10

    var body: some View {
        Group {
            if let tid = trackId, let img = DownloadManager.shared.localCoverImage(trackId: tid) {
                Image(uiImage: img).resizable().scaledToFill()
            } else if let s = remoteUrl, let url = URL(string: s) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() }
                    else { placeholder }
                }
            } else {
                placeholder
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(colors: [Color.white.opacity(0.07), Color.white.opacity(0.03)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            Image(systemName: "music.note").foregroundColor(Theme.text3)
        }
    }
}

// ── Round avatar (for artist profile images) ──────────────────────────────────
struct AvatarView: View {
    let url: String?
    var size: CGFloat = 44

    var body: some View {
        Group {
            if let s = url, let u = URL(string: s) {
                AsyncImage(url: u) { phase in
                    if let img = phase.image { img.resizable().scaledToFill() }
                    else { placeholder }
                }
            } else { placeholder }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var placeholder: some View {
        ZStack {
            Circle().fill(Theme.accent.opacity(0.25))
            Image(systemName: "person.fill").foregroundColor(Theme.accent)
        }
    }
}
