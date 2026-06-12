import SwiftUI

// ── Community: post feed ─────────────────────────────────────────────────────

struct CommunityView: View {
    @State private var posts: [CommunityPost] = []
    @State private var error: String?
    @State private var loading = true
    @State private var showComposer = false
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 80)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else if posts.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 38))
                        .foregroundColor(Theme.text3)
                    Text("No posts yet")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Theme.text2)
                    Text("Start the first conversation")
                        .font(.system(size: 12.5))
                        .foregroundColor(Theme.text3)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 80)
            } else {
                LazyVStack(spacing: 10) {
                    ForEach(posts) { post in
                        NavigationLink(value: NavTarget.communityPost(post.id)) {
                            CommunityPostRow(post: post) { updated in
                                if let i = posts.firstIndex(where: { $0.id == updated.id }) {
                                    posts[i] = updated
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 14)
            }
        }
        .background(AppBackground())
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .overlay(alignment: .bottomTrailing) {
            if auth.isLoggedIn {
                Button {
                    showComposer = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 52, height: 52)
                        .background(Theme.accent)
                        .clipShape(Circle())
                        .shadow(radius: 8)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 16)
            }
        }
        .sheet(isPresented: $showComposer) {
            NewPostSheet { post in
                posts.insert(post, at: 0)
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        loading = posts.isEmpty; error = nil
        do { posts = try await API.communityPosts(token: auth.token) }
        catch { self.error = "Couldn't load community posts." }
        loading = false
    }
}

struct CommunityPostRow: View {
    let post: CommunityPost
    let onUpdate: (CommunityPost) -> Void
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                AvatarView(url: post.profileImageUrl, size: 28)
                Text(post.username ?? "unknown")
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundColor(Theme.accent)
                if let date = relativeDate(post.createdAt) {
                    Text(date)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.text3)
                }
                Spacer()
            }

            Text(post.title ?? "")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(Theme.text)
                .multilineTextAlignment(.leading)

            if let body = post.body, !body.isEmpty {
                Text(body)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.text2)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }

            HStack(spacing: 16) {
                HStack(spacing: 10) {
                    voteButton(icon: "arrow.up", active: post.userVote == 1, vote: 1)
                    Text("\(post.netVotes ?? 0)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundColor(Theme.text2)
                    voteButton(icon: "arrow.down", active: post.userVote == -1, vote: -1)
                }
                HStack(spacing: 5) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 12))
                    Text("\(post.commentCount ?? 0)")
                        .font(.system(size: 12.5, weight: .semibold))
                }
                .foregroundColor(Theme.text3)
                Spacer()
            }
        }
        .padding(14)
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
        if let result = try? await API.voteCommunityPost(id: post.id, vote: vote, token: token) {
            var updated = post
            updated.netVotes = result.netVotes ?? post.netVotes
            updated.userVote = result.userVote ?? 0
            onUpdate(updated)
        }
    }
}

// ── New post composer ────────────────────────────────────────────────────────

struct NewPostSheet: View {
    let onPosted: (CommunityPost) -> Void
    @State private var title = ""
    @State private var body_ = ""
    @State private var posting = false
    @State private var errorMessage: String?
    @EnvironmentObject var auth: AuthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppBackground().ignoresSafeArea()
                VStack(spacing: 14) {
                    TextField("Title", text: $title)
                        .padding(12)
                        .wvCard(corner: 12)
                        .foregroundColor(Theme.text)

                    TextField("Say something… (optional)", text: $body_, axis: .vertical)
                        .lineLimit(5...12)
                        .padding(12)
                        .wvCard(corner: 12)
                        .foregroundColor(Theme.text)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 12.5))
                            .foregroundColor(.red.opacity(0.85))
                    }

                    Spacer()
                }
                .padding(16)
            }
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Theme.text2)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await post() }
                    } label: {
                        if posting { ProgressView() } else { Text("Post").bold() }
                    }
                    .foregroundColor(Theme.accent)
                    .disabled(posting || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func post() async {
        guard let token = auth.token else { return }
        posting = true
        errorMessage = nil
        do {
            let post = try await API.createCommunityPost(
                title: title.trimmingCharacters(in: .whitespaces),
                body: body_.trimmingCharacters(in: .whitespacesAndNewlines),
                token: token
            )
            onPosted(post)
            dismiss()
        } catch {
            errorMessage = "Couldn't post. Try again."
        }
        posting = false
    }
}

// ── Post detail with comments ────────────────────────────────────────────────

struct CommunityPostView: View {
    let postId: String
    @State private var detail: CommunityPostDetail?
    @State private var error: String?
    @State private var newComment = ""
    @State private var posting = false
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        ScrollView {
            if let detail {
                VStack(alignment: .leading, spacing: 14) {
                    CommunityPostRow(post: detail.post) { updated in
                        self.detail = CommunityPostDetail(post: updated, comments: detail.comments)
                    }
                    .padding(.horizontal, 16)

                    Text("Comments")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(Theme.text)
                        .padding(.horizontal, 16)

                    if auth.isLoggedIn {
                        HStack(spacing: 8) {
                            TextField("Add a comment…", text: $newComment, axis: .vertical)
                                .lineLimit(1...4)
                                .padding(10)
                                .wvCard(corner: 12)
                                .foregroundColor(Theme.text)
                            Button {
                                Task { await postComment() }
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
                        .padding(.horizontal, 16)
                    } else {
                        Text("Sign in to join the conversation")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text3)
                            .padding(.horizontal, 16)
                    }

                    if detail.comments.isEmpty {
                        Text("No comments yet")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text3)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        ForEach(detail.comments) { comment in
                            CommunityCommentRow(comment: comment) { updated in
                                guard let d = self.detail else { return }
                                var comments = d.comments
                                if let i = comments.firstIndex(where: { $0.id == updated.id }) {
                                    comments[i] = updated
                                }
                                self.detail = CommunityPostDetail(post: d.post, comments: comments)
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.vertical, 14)
                .padding(.bottom, 24)
            } else if let error {
                ErrorRetryView(message: error) { await load() }
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 100)
            }
        }
        .background(AppBackground())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: NavTarget.self) { target in navDestination(target) }
        .task { await load() }
    }

    private func load() async {
        error = nil
        do { detail = try await API.communityPost(id: postId, token: auth.token) }
        catch { self.error = "Couldn't load this post." }
    }

    private func postComment() async {
        guard let token = auth.token, let d = detail else { return }
        let body = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        posting = true
        if let comment = try? await API.postCommunityComment(postId: postId, body: body, token: token) {
            detail = CommunityPostDetail(post: d.post, comments: d.comments + [comment])
            newComment = ""
        }
        posting = false
    }
}

struct CommunityCommentRow: View {
    let comment: CommunityComment
    let onUpdate: (CommunityComment) -> Void
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                AvatarView(url: comment.profileImageUrl, size: 24)
                Text(comment.username ?? "unknown")
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

            HStack(spacing: 10) {
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
        if let result = try? await API.voteCommunityComment(commentId: comment.id, vote: vote, token: token) {
            var updated = comment
            updated.netVotes = result.netVotes ?? comment.netVotes
            updated.userVote = result.userVote ?? 0
            onUpdate(updated)
        }
    }
}
