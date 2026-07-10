# Roadmap

Planning notes for the comic reader — privacy-first, offline-capable, self-hosted. Core philosophy: **the three D's** — we don't see, we don't know, we don't care.

---

## Accounts & Auth

Goal: let people sync reading progress across devices without forcing a single "correct" way to prove identity. Four supported paths, each with a different privacy tier — and the app should be **honest about which tier each one is**, not just claim privacy across the board.

- **Self-generated ID + password** — app generates an opaque account ID, user sets a password. No email, no PII collected at all.
- **Username + password** — standard account, still no email required.
- **Passkey** — via ASP.NET Core Identity's native passkey/WebAuthn support (.NET 10+). Phishing-resistant, no password to leak.
- **Google login** — explicitly the "convenience over purity" option. Google knows the person has an account here; that's disclosed up front rather than hidden. Refusing to offer this "for people's own good" would just be a different kind of paternalism — it's their trade-off to make, not ours.

### Zero-knowledge sync

- Reading progress/data synced to the server should be **end-to-end encrypted client-side** before upload, so the server only ever stores an opaque blob.
- Encryption key derivation differs by auth method:
  - **Password-based accounts (self-generated ID or username)**: derive the encryption key from the password client-side (Argon2/PBKDF2). Server never sees the key, only a login hash.
  - **Passkey**: no natural secret to derive a key from (that's the point of WebAuthn). Needs the PRF extension where supported, or a client-generated key wrapped/stored separately.
  - **Google OAuth**: no secret at all — Google proves identity but grants nothing private to derive a key from. Requires either a separate mandatory passphrase just for encryption, or accepting that this path is "we still don't see your reading data, but Google necessarily knows you exist."
- Add a **"privacy tier" indicator** in account settings (e.g. "Zero-knowledge" vs. "Convenience login") so the privacy claim is verifiable per-account, not just asserted in a policy page.

### Profile & portability _(new — was missing from the privacy-first roadmap)_

- **Profile management** — custom preferences and avatars. Avatars should be optional/local-only by default given the no-PII stance; treat like the "local-only reading stats, opt-in to sync" pattern below rather than assuming cloud storage.
- **Library portability** — export/import full account data (progress, tags, shelves, preferences) so users are never locked into a single instance. Fits naturally with the zero-knowledge blob model: the export is just the decrypted local copy of what's already being synced.

---

## Hosting / Infra

- Frontend stays on Netlify free tier (static, PWA, works fine as-is).
- Backend (auth + sync API): small self-hosted VPS rather than a serverless/PaaS platform, to avoid cold-start spin-down and keep costs flat and predictable.
  - **Hetzner CX22** (~€3.79/mo) — recommended default. Way more than enough for this workload (ASP.NET Core API + SQLite).
  - **Oracle Cloud Always Free tier** — $0/mo option if budget is the hard constraint. Trade-offs: account verification hassle, occasional reports of idle-instance reclamation.
- Stack: ASP.NET Core Web API + ASP.NET Core Identity + EF Core + SQLite. One language, one codebase, no third-party auth SaaS (keeps the privacy story intact — no data handed to Auth0/Clerk/Firebase, Supabase, or any other auth provider).

---

## Reader Experience

### Continuous scroll & page layout _(merged — bigger, more detailed spec wins)_

One roadmap listed "single/double page + continuous webtoon scroll" as already shipped and separately flagged RTL page order as the top-priority gap; the other roadmap has a fuller technical spec for the same feature set, including the RTL support the other one was missing. Treating this fuller spec as the current target, with prior shipped work as the starting point:

- **Vertical mode (webtoon)**: stack all pages in a single vertical scroll container. Pages load on-demand via `IntersectionObserver` — extract/render pages entering a ~2-viewport prefetch zone above and below the current scroll position. Revoke blob URLs for pages leaving the prefetch zone to manage memory.
- **Horizontal mode (manga/comic)**: horizontal scroll container with `scroll-snap-type: x mandatory`. Supports both LTR (Western comics) and RTL (manga) via a `direction` CSS toggle — this is what satisfies the standalone "RTL page order" requirement, rather than needing a separate flag plumbed through swipe logic.
- **Scroll position tracking**: debounced scroll handler updates `currentPageIndex` based on which page is ≥50% visible, keeping progress sync and the page counter accurate.
- **Mode switching**: switch between single-page (canvas-based), vertical scroll, and horizontal scroll at any time; current position is preserved across mode switches.

### Landscape double-page _(new)_

- Renders two consecutive pages side-by-side when in landscape orientation (auto-detected via `screen.orientation.type` / `matchMedia`, user-overridable). Pairs as `[N, N+1]` in LTR, `[N+1, N]` in RTL.
- Zoom/pan operates on the combined spread in canvas mode (configurable ~8px gutter); flex-row layout in scroll mode.
- Odd page counts: last page renders alone rather than paired with a blank.

### Dynamic ambient backgrounds _(new)_

- On each page view, sample edge-strip colors (top/bottom/left/right, ~5px inward) from an offscreen canvas draw of the current page image; average each strip to a dominant color.
- Blend with a neutral base (e.g. 80% `#000` / 20% sampled) via CSS `color-mix()`, applied as `--ambient-bg` with a transition for cross-page fades.
- Cache the 4-edge color array in IndexedDB (existing `comicPages` store, keyed by `comicId-pageIndex`) after first computation.
- Target < 5ms/sample using the already-decoded `HTMLImageElement`. Skip sampling when image filters are active, since filter colors would skew the result.

### QOL backlog

- [ ] **Tags / custom shelves** — replace rigid reading/completed binary. Auto-suggest tags from ComicInfo.xml metadata where available, rather than fully manual tagging.
- [ ] **Redownload in storage manager** — currently delete-only. Delete-only storage managers make people afraid to free up space, which undercuts the point of an offline-first app.
- [ ] **Drag-and-drop / batch import with reordering** — quality-of-life fix for migrating an existing library in.
- [ ] **Local-only reading stats, opt-in to sync** — streaks, pages read, time spent, computed and stored on-device by default. Cheap to build since it reuses progress-tracking data, and it's a concrete proof point for the "three D's" pitch rather than just copy on a landing page.

### Already shipped / current status

- Single/double page + continuous "webtoon" scroll (basic version — see Continuous Scroll spec above for the enhancement in progress, including RTL)
- Gapless preloading
- Adaptive Light/Dark/System theming, with AMOLED-true dark mode as the default
- ComicInfo.xml parsing (in progress / to be wired up properly)
- Full touch + keyboard support (ctrl+scroll zoom, etc.)
- Color filters: black & white, vintage/sepia, color correction, brightness — doubles as accessibility tooling (light sensitivity, reading fatigue, some color-blindness accommodation), worth naming as "accessibility" in docs, not just "filters"
- PWA support
- File Manager: hierarchical folders, bulk uploads, OS-like navigation
- Deduplication: content-addressable storage (SHA-256) to minimize disk usage
- Universal archive support: client-side extraction for CBZ, CBR, ZIP, RAR
- Enterprise core: centralized logging, global error handling, robust type safety
- Local folder mapping via File System Access API (Chrome-only; known cross-browser limitation, not a gap being tracked)

---

## Custom Filters & Theme Builder

- Filters and themes both move to a **config-driven system**: user-defined filters/themes described by a fixed schema (named parameters — intensity, hue, contrast, color values, spacing, fonts, etc.), not raw CSS/SVG markup.
  - Reasoning: accepting free-form CSS or SVG filter code from users is an injection vector (SVG especially can carry scripts/external references). A typed schema gives full expressiveness without needing to sanitize arbitrary strings.
- Maps naturally onto CSS `filter` properties and SVG filter primitives (`feColorMatrix`, hue-rotate, etc.) under the hood.
- Should govern the Light/Dark/System adaptive modes above, not just per-page filters, so theming and filtering share one schema instead of two systems.
- QOL pairing: keyboard shortcut to cycle filters, and remember filter/zoom preference per-series (or globally) instead of resetting each session.

---

## Search _(new section)_

- **Global search** — unified search bar in the Library to find comics and folders by name.
- **Fuzzy matching** — handle typos and partial titles (candidates: `FlexSearch` or `Fuse.js` for client-side indexing).
- **Metadata filters** — advanced filtering by file size, upload date, reading progress (e.g. "Show Unread").
- **Deep indexing** — fast indexing of local IndexedDB structures for near-instant results.

---

## Import & Storage

- **URL import** — already works (paste a direct download link, client-side fetch, CORS-permitting). Deliberately **not** adding a server-side fetch proxy to work around CORS-blocked links: a server that fetches arbitrary URLs on a user's behalf is an SSRF risk and would create a place where downloads _could_ be logged, even unintentionally. Left as a known, honest limitation rather than "fixed" at the cost of the privacy model.
- **Cloud storage — WebDAV only**: one implementation covers Nextcloud, ownCloud, most NAS boxes (Synology etc.), and Dropbox/Google Drive via WebDAV bridges — instead of three bespoke OAuth integrations (Google Drive API, Dropbox API, FTP client), avoiding API quota limits and app-review processes for a personal project. No native per-provider SDKs.
  - **On-demand streaming** and **auto-sync** (back up the local library database to the WebDAV target) are useful additions on top of this — WebDAV supports streaming/range requests fine.
- **Local folder access**: File System Access API integration already exists (Chrome-only; not persistent/consistent across Firefox/Safari — a known web-app limitation, not a gap to fill right now).

---

## Native Companion Daemon _(advanced / future — gated on demand)_

Everything below requires an actual native companion app, which is a real commitment (cross-platform binary maintenance, code signing, auto-updates) — filed as an advanced roadmap item to revisit only if strong user demand emerges, not near-term work:

- **File associations** — register as default handler for `.cbz`/`.cbr` on supported OSes.
- **Folder watching** — auto-detect new files added to mapped local folders.
- **Direct disk streaming** — read high-resolution comics straight from disk, bypassing IndexedDB storage quotas.

---

## Telemetry _(new section)_

Worth checking against the "three D's" philosophy before committing — an **opt-in** model (like the local-only reading stats above) would be more consistent with "we don't see, we don't know" than an opt-out default, even for anonymized data.

- **Anonymous analytics** — page views and interaction counts (e.g. how often the reader is opened), no PII.
- **Error reporting** — aggregate crashes/global errors to prioritize bug fixes.
- **Performance monitoring** — load times for archive extraction and page processing.
- **Clear opt-out (or better, opt-in) toggle** for zero-telemetry.

---

## Tech Stack Notes

- **Backend/Auth**: ASP.NET Core Web API + ASP.NET Core Identity + EF Core + SQLite — custom, self-hosted, no third-party auth SaaS.
- **Search**: `FlexSearch` or `Fuse.js` for client-side indexing.
- **Cloud**: WebDAV client only.
