import SwiftUI

// ── Star rating — shows community average, lets a signed-in user rate ────────

struct RatingStarsView: View {
    let entityType: String
    let entityId: String
    @State private var avg: Double?
    @State private var count = 0
    @State private var userRating: Int?
    @State private var saving = false
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        guard auth.isLoggedIn, !saving else { return }
                        Task { await rate(star) }
                    } label: {
                        Image(systemName: starIcon(for: star))
                            .font(.system(size: 20))
                            .foregroundColor(starColor(for: star))
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack(spacing: 4) {
                if let avg {
                    Text(String(format: "%.1f", avg))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Theme.text)
                    Text("· \(count) rating\(count == 1 ? "" : "s")")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.text3)
                } else {
                    Text(auth.isLoggedIn ? "Be the first to rate" : "Sign in to rate")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.text3)
                }
                if let userRating {
                    Text("· you rated \(userRating)")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.accent)
                }
            }
        }
        .task { await load() }
    }

    // The stars show your rating when you've rated; otherwise the average.
    private var displayValue: Double {
        if let userRating { return Double(userRating) }
        return avg ?? 0
    }

    private func starIcon(for star: Int) -> String {
        if displayValue >= Double(star) { return "star.fill" }
        if displayValue >= Double(star) - 0.5 { return "star.leadinghalf.filled" }
        return "star"
    }

    private func starColor(for star: Int) -> Color {
        if userRating != nil { return displayValue >= Double(star) - 0.5 ? Theme.accent : Theme.text3 }
        return displayValue >= Double(star) - 0.5 ? .yellow : Theme.text3
    }

    private func load() async {
        if let r = try? await API.ratings(entityType: entityType, entityId: entityId, token: auth.token) {
            avg = r.avg; count = r.count; userRating = r.userRating
        }
    }

    private func rate(_ value: Int) async {
        guard let token = auth.token else { return }
        saving = true
        if (try? await API.setRating(entityType: entityType, entityId: entityId, rating: value, token: token)) != nil {
            userRating = value
            await load()
        }
        saving = false
    }
}

// ── Comments on a release (comp/album) ───────────────────────────────────────

struct ReleaseCommentsSection: View {
    let albumId: String
    @State private var comments: [ReleaseComment] = []
    @State private var newComment = ""
    @State private var posting = false
    @State private var loadFailed = false
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Comments")
                .font(.system(size: 17, weight: .heavy))
                .foregroundColor(Theme.text)
                .padding(.top, 10)

            // Composer
            if auth.isLoggedIn {
                HStack(spacing: 8) {
                    TextField("Add a comment…", text: $newComment, axis: .vertical)
                        .lineLimit(1...4)
                        .padding(10)
                        .wvCard(corner: 12)
                        .foregroundColor(Theme.text)
                    Button {
                        Task { await post() }
                    } label: {
                        if posting {
                            ProgressView().tint(Theme.accent)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .foregroundColor(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Theme.text3 : Theme.accent)
                        }
                    }
                    .disabled(posting || newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            } else {
                Text("Sign in to join the conversation")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.text3)
            }

            if comments.isEmpty && !loadFailed {
                Text("No comments yet")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.text3)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            } else {
                ForEach(comments) { comment in
                    ReleaseCommentRow(albumId: albumId, comment: comment) { updated in
                        if let i = comments.firstIndex(where: { $0.id == updated.id }) {
                            comments[i] = updated
                        }
                    }
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        do {
            comments = try await API.albumComments(albumId: albumId, token: auth.token)
            loadFailed = false
        } catch { loadFailed = true }
    }

    private func post() async {
        guard let token = auth.token else { return }
        let body = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        posting = true
        if let comment = try? await API.postAlbumComment(albumId: albumId, body: body, token: token) {
            comments.append(comment)
            newComment = ""
        }
        posting = false
    }
}

struct ReleaseCommentRow: View {
    let albumId: String
    let comment: ReleaseComment
    let onUpdate: (ReleaseComment) -> Void
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(comment.username)
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundColor(Theme.accent)
                if let date = relativeDate(comment.createdAt) {
                    Text(date)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.text3)
                }
                Spacer()
            }
            Text(comment.body ?? "")
                .font(.system(size: 13.5))
                .foregroundColor(Theme.text)

            HStack(spacing: 14) {
                voteButton(icon: "arrow.up", active: comment.userVote == 1, vote: 1)
                Text("\(comment.netVotes ?? 0)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Theme.text2)
                voteButton(icon: "arrow.down", active: comment.userVote == -1, vote: -1)
            }
        }
        .padding(12)
        .wvCard()
    }

    private func voteButton(icon: String, active: Bool, vote: Int) -> some View {
        Button {
            guard auth.isLoggedIn else { return }
            Task { await castVote(vote) }
        } label: {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(active ? Theme.accent : Theme.text3)
        }
        .buttonStyle(.plain)
    }

    private func castVote(_ vote: Int) async {
        guard let token = auth.token else { return }
        if let result = try? await API.voteAlbumComment(albumId: albumId, commentId: comment.id, vote: vote, token: token) {
            var updated = comment
            updated.netVotes = result.netVotes ?? comment.netVotes
            updated.userVote = result.userVote ?? 0
            onUpdate(updated)
        }
    }
}

// ── Follow button (artist profile) ───────────────────────────────────────────

struct FollowButton: View {
    let artistId: String
    @State private var following = false
    @State private var followerCount = 0
    @State private var loaded = false
    @State private var working = false
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        Button {
            guard auth.isLoggedIn, !working else { return }
            Task { await toggle() }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: following ? "checkmark" : "plus")
                    .font(.system(size: 12, weight: .bold))
                Text(following ? "Following" : "Follow")
                    .font(.system(size: 13, weight: .bold))
                if loaded && followerCount > 0 {
                    Text("\(followerCount)")
                        .font(.system(size: 12, weight: .semibold))
                        .opacity(0.8)
                }
            }
            .foregroundColor(following ? Theme.text : .white)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(following ? Color.white.opacity(0.14) : Theme.accent)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .opacity(auth.isLoggedIn ? 1 : 0.55)
        .task { await load() }
    }

    private func load() async {
        if let s = try? await API.followStatus(artistId: artistId, token: auth.token) {
            following = s.following
            followerCount = s.followerCount
            loaded = true
        }
    }

    private func toggle() async {
        guard let token = auth.token else { return }
        working = true
        if let s = try? await API.toggleFollow(artistId: artistId, token: token) {
            following = s.following
            followerCount = s.followerCount
        }
        working = false
    }
}

// ── Shared: relative date formatting ─────────────────────────────────────────

func relativeDate(_ iso: String?) -> String? {
    guard let iso else { return nil }
    let withFractions = ISO8601DateFormatter()
    withFractions.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    guard let date = withFractions.date(from: iso) ?? plain.date(from: iso) else { return nil }
    let f = RelativeDateTimeFormatter()
    f.unitsStyle = .abbreviated
    return f.localizedString(for: date, relativeTo: Date())
}
