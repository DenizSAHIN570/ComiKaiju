# Telemetry Implementation

## Feature Overview

Anonymous, opt-in telemetry system consistent with "three D's" philosophy.

## Requirements

### Anonymous Analytics

- Track page views and interaction counts
- Examples:
  - How often the reader is opened
  - Feature usage statistics
- **NO PII** - no personal information collected
- Aggregate data only

### Error Reporting

- Aggregate crashes/global errors
- Prioritize bug fixes based on frequency
- No user-specific error details
- Stack traces stripped of identifying info

### Performance Monitoring

- Load times for archive extraction
- Page processing times
- User experience metrics
- No PII in performance data

### Clear Opt-In Toggle

- **Opt-in model** (not opt-out)
- Consistent with "we don't see, we don't know" philosophy
- Zero-telemetry mode available
- Clear indicator when telemetry is active/inactive

## Technical Implementation

- Implement analytics collector
- Aggregate metrics locally before upload
- Strip all PII from collected data
- Provide toggle in settings
- Document what data is collected

## Privacy Notes

- Check against "three D's" philosophy
- Opt-in required (not opt-out default)
- Even for anonymized data
- Make it a proof point for privacy-first approach

## Data Retention

- Define retention policies
- Allow user to clear telemetry data
- No indefinite storage
