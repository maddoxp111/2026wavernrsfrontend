# wavernrs iOS app

Native SwiftUI app (no web wrapper) for **listening only**:

- **Home** — recent + trending from the site
- **Charts** — comps & edits, weekly / all time
- **Archive** — the archived comps
- **Search** — tracks, comps, archived
- **Downloads** — full offline mode: audio + covers are saved to the device and play with no internet
- Background playback + lock screen / Control Center controls
- Sidebar has an **Artists** button that explains artist features (uploading, profiles, dashboard) are web-only and links to wavernrs.com

All source files live in `ios/Wavernrs/`. There is no `.xcodeproj` checked in — you create that on your Mac (steps below).

## Hooking it up to Xcode

1. **Pull this repo onto your Mac** (clone it or `git pull` if you already have it).

2. **Create the project:** open Xcode → **File → New → Project…** → iOS → **App**.
   - Product Name: `Wavernrs`
   - Interface: **SwiftUI**, Language: **Swift**
   - Team: your Apple Developer account
   - Save it anywhere **outside** this repo folder (or inside `ios/` — either works).

3. **Delete the template code:** in the Project Navigator, delete the generated `WavernrsApp.swift` and `ContentView.swift` (Move to Trash). Keep `Assets.xcassets`.

4. **Add the app source:** drag the `ios/Wavernrs` folder from Finder into the Project Navigator (drop it on the yellow `Wavernrs` group).
   - Check **"Copy items if needed"** OFF if you want edits to stay inside the repo (recommended), ON if you want Xcode to own a copy.
   - Make sure **"Add to targets: Wavernrs"** is checked.
   - This README can be excluded.

5. **Enable background audio:** select the project → `Wavernrs` target → **Signing & Capabilities** → **+ Capability** → **Background Modes** → check **"Audio, AirPlay, and Picture in Picture"**. Without this, music stops when the phone locks.

6. **Set the deployment target:** target → General → Minimum Deployments → **iOS 16.0**.

7. **Run it:** pick a simulator or your plugged-in iPhone and hit ⌘R. On a real device the first run needs you to trust your developer certificate (Settings → General → VPN & Device Management).

That's it — no packages/dependencies to install; it's all Apple frameworks (SwiftUI, AVFoundation, MediaPlayer).

## Where things are

| File | What it does |
|---|---|
| `WavernrsApp.swift` | App entry point |
| `ContentView.swift` | Root view, sidebar drawer, Artists alert |
| `BrowseViews.swift` | Home, Charts, Archive, Search + shared tiles/rows |
| `AlbumView.swift` | Comp page with tracklist + per-track/whole-comp download |
| `DownloadsView.swift` | Offline library, grouped by comp |
| `PlayerViews.swift` | Mini player bar + full Now Playing sheet |
| `PlayerManager.swift` | AVPlayer queue, lock-screen controls, offline-first playback |
| `DownloadManager.swift` | Saves audio + covers to Documents, JSON index |
| `API.swift` | Backend client (`2026wavernrs-production.up.railway.app`) |
| `Models.swift` | Codable models matching the backend JSON |
| `Theme.swift` | Dark theme matching the site |

## Shipping to the App Store later

- Set a unique Bundle Identifier (e.g. `com.wavernrs.app`) under Signing & Capabilities.
- Add a 1024×1024 app icon in `Assets.xcassets` → AppIcon.
- Product → Archive → Distribute App → App Store Connect.
