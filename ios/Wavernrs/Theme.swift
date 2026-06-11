import SwiftUI

// Dark look matching the site's liquid-glass theme.
enum Theme {
    static let bg = Color(red: 0.05, green: 0.05, blue: 0.07)
    static let card = Color.white.opacity(0.06)
    static let hairline = Color.white.opacity(0.10)
    static let text = Color.white
    static let text2 = Color.white.opacity(0.65)
    static let text3 = Color.white.opacity(0.40)
    static let accent = Color(red: 0.95, green: 0.35, blue: 0.62) // site pink
}

struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Theme.hairline, lineWidth: 1)
            )
    }
}

extension View {
    func wvCard() -> some View { modifier(CardBackground()) }
}

// Square cover artwork that falls back to a placeholder, and prefers a local
// downloaded cover when one exists.
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
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        placeholder
                    }
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
            Theme.card
            Image(systemName: "music.note")
                .foregroundColor(Theme.text3)
        }
    }
}
