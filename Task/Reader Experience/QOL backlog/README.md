# QOL Backlog Implementation

## Feature Overview

Quality-of-life improvements for the comic reader.

## Requirements

### Tags / Custom Shelves

- Replace rigid reading/completed binary states
- Allow custom tags and shelves for organizing comics
- Auto-suggest tags from ComicInfo.xml metadata where available
- Implement tag management UI
- Support tag filtering in library view

### Redownload in Storage Manager

- Currently storage manager is delete-only
- Add redownload functionality for deleted comics
- Check original source (upload location, WebDAV, etc.)
- Restore to storage if source still available
- Update storage manager UI with redownload option

### Drag-and-Drop / Batch Import with Reordering

- Implement drag-and-drop file upload
- Support batch import of multiple files
- Allow reordering of imported files during import
- Show progress for batch operations
- Handle duplicate detection during import

### Local-Only Reading Stats, Opt-In Sync

- Compute and store reading stats on-device by default:
  - Pages read
  - Time spent reading
  - Reading streaks
- Provide opt-in to sync stats
- Reuse existing progress-tracking data
- Make this a concrete proof point for "three D's" pitch

## Technical Notes

- Tag system should integrate with existing metadata
- Storage manager needs source tracking for redownload
- Import UI should show progress and duplicates
- Stats computation should be efficient and non-intrusive
