# Accounts & Auth Implementation

## Goal

Implement four authentication paths with different privacy tiers, each clearly indicated to users.

## Requirements

### 1. Self-Generated ID + Password

- App generates an opaque account ID (random UUID or cryptographically secure random string)
- User sets a password (no email, no PII)
- Store password hash server-side (Argon2/PBKDF2)
- Privacy tier: **Tier 1 - Zero-knowledge**

### 2. Username + Password

- Standard username-based accounts
- No email required
- Store username + password hash
- Privacy tier: **Tier 2 - Zero-knowledge**

### 3. Passkey (WebAuthn)

- Use ASP.NET Core Identity's native passkey support (.NET 10+)
- Phishing-resistant authentication
- No password to leak
- Handle PRF extension where supported, or store client-generated key separately
- Privacy tier: **Tier 2 - Zero-knowledge**

### 4. Google Login

- OAuth integration with Google
- Explicitly marked as "convenience over purity"
- Google knows the person has an account (disclosed up front)
- Privacy tier: **Tier 3 - Convenience login**

## Zero-Knowledge Sync

- Reading progress/data synced to server must be **end-to-end encrypted client-side** before upload
- Server only stores opaque blob
- Encryption key derivation:
  - Password-based accounts: derive key from password client-side (Argon2/PBKDF2)
  - Passkey: requires PRF extension or separate key storage
  - Google OAuth: requires separate mandatory passphrase for encryption

## Profile & Portability

- Custom preferences and avatars
- Avatars: local-only by default (no PII)
- Library export/import: full account data (progress, tags, shelves, preferences)
- Export is decrypted local copy of synced data

## Privacy Tier Indicator

- Add "privacy tier" indicator in account settings
- Examples: "Zero-knowledge" vs "Convenience login"
- Must be verifiable per-account

## Implementation Notes

- Backend: ASP.NET Core Web API + ASP.NET Core Identity + EF Core + SQLite
- No third-party auth SaaS (Auth0/Clerk/Firebase, Supabase)
- Keep privacy story intact
