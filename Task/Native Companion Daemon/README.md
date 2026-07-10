# Native Companion Daemon Implementation

## Feature Overview

Advanced features requiring a native companion app (future item).

## Requirements

### File Associations

- Register as default handler for `.cbz` and `.cbr` files
- Platform-specific implementation:
  - Windows: AppManifest.xml / .reg files
  - macOS: Info.plist / LSApplicationCategoryType
  - Linux: desktop file association
- Handle OS-specific file handler registration

### Folder Watching

- Auto-detect new files added to mapped local folders
- Platform-specific file system watchers:
  - Windows: ReadDirectoryChangesW
  - macOS: FSEventStream
  - Linux: inotify (via libinotify or similar)
- Trigger import when new files detected
- Respect user preferences for auto-import

### Direct Disk Streaming

- Read high-resolution comics straight from disk
- Bypass IndexedDB storage quotas
- Implement streaming reader:
  - Read pages directly from file
  - Use memory-mapped files for performance
  - Handle large files without loading into memory

## Technical Considerations

- Cross-platform binary maintenance required
- Code signing for app store distribution
- Auto-update mechanism needed
- Gated on demand (not near-term work)
- Requires native development (C#, C++, etc.)

## Implementation Notes

- This is an advanced roadmap item
- Only pursue if strong user demand emerges
- Not near-term work
- Consider PWA alternatives first
