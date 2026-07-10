# Import & Storage Implementation

## Feature Overview

Implement various import methods and storage options while maintaining privacy-first approach.

## Requirements

### URL Import (Already Works)

- Paste direct download link
- Client-side fetch (no server proxy)
- CORS-permitting URLs only
- **Deliberately NOT adding server-side fetch proxy**
  - SSRF risk
  - Downloads could be logged
  - Left as honest limitation

### Cloud Storage — WebDAV Only

- One implementation covering:
  - Nextcloud
  - ownCloud
  - Most NAS boxes (Synology, etc.)
  - Dropbox/Google Drive via WebDAV bridges
- **Instead of three bespoke OAuth integrations**
  - Avoid API quota limits
  - Avoid app-review processes
  - Keep privacy model intact

### On-Demand Streaming & Auto-Sync

- WebDAV supports streaming/range requests
- Implement on-demand streaming for large files
- Auto-sync: back up local library database to WebDAV target
- Useful additions on top of basic WebDAV

### Local Folder Access

- File System Access API integration
- Already exists (Chrome-only)
- **Not persistent/consistent across Firefox/Safari**
  - Known web-app limitation
  - Not a gap to fill right now

## Technical Implementation

- Implement WebDAV client
- Add folder browsing UI
- Implement drag-and-drop to WebDAV
- Handle connection errors gracefully
- Cache WebDAV credentials securely

## Privacy Notes

- No server-side URL fetching
- WebDAV credentials stored locally
- No third-party cloud SDKs
