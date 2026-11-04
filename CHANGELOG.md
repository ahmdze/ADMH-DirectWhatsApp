# Changelog

All notable changes to **ADMH Direct WhatsApp** are documented here. The app is local-first: no server, no account, no telemetry, and no automatic sending.

## v2.4.1 — Maintenance (2026-11-05)

### Fixed

- Restored the **Tools** tab in the bottom navigation; the five-item bar now uses equal-width columns so all tabs remain visible on phones.
- Manual update checks now bypass intermediary caches (`?t=…`) and always fetch the latest GitHub release immediately. No automatic checks were reintroduced.

## v2.4.0 — Stable (2026-11-05)

### Added

- **Recurring reminders**: daily (interval), weekly (multiple weekdays), monthly (day of month, clamped for short months), optional end date, and a three-occurrence local preview.
- **Native Android notifications** for reminders with a 100-scheduled-notification budget and automatic re-sync.
- **Open Compose from a notification**: workspace, target, and message/template are pre-filled; no message is sent automatically.
- **Workspace-aware reminder editor** with title, date/time, message (2000 chars), template picker, recurrence, and next-occurrence preview.
- **Reminder list**: search, workspace/status filters, recurrence and workspace badges, missed state, open/edit/complete/delete, snooze one hour, ignore, and pagination.
- **Session-only media attachments**: images, PDF/Office/text/CSV files and vCard `.vcf` contacts. Images are compressed locally to WebP (max 1600px, quality 0.85, 2MB target, JPEG fallback). Attachments are never stored in Dexie or backups.
- **System share-sheet media flow** with download/copy fallback, plus a clear explanation that WhatsApp cannot pre-select a chat for media.
- **Local preview sheet** with three tabs: WhatsApp-style message, share card, and QR label. No link fetching or tracking.
- **Quick Schedule from Compose**, pre-filled with the current target and message.
- **Pre-upgrade backup**: the first v2.4 launch stores a full JSON snapshot in a separate IndexedDB database, shows a one-time toast, and exposes a download row in Settings.
- **Safe history retention and trash**: configurable age/keep-latest policy, favorite-target exclusion, a restorable 30-day trash, and a dedicated Trash screen.
- **Reminders tab** in the bottom navigation for one-tap access.
- **README and translations** updated across Arabic, English, Sorani Kurdish, and Persian, including the DeepSeek HARNESS and Qwen logos and the full developer/reviewer attribution.

### Changed

- APK update checks are now **manual only** from Settings. There is no automatic check on launch or reconnect.
- Reminder notification sync is idempotent: unchanged notifications are not rescheduled, while stale/done reminders are cancelled.
- Backup includes the trash table and retention settings.

### Privacy and security

- All data stays in the browser/app IndexedDB; no new network telemetry or third-party runtime dependency was added.
- Media files are session-only and shared through the operating system share sheet.
- The app still never sends messages automatically; the user sends from WhatsApp.
- No cloud sync, account, short links, or tracking.

### Known constraints

- WhatsApp Click-to-Chat can only pre-fill text; media sharing opens the system share sheet and the user selects WhatsApp and the chat manually.
- The Location action appends a maps link to the message; it is not a file attachment.
- Image compression is browser-dependent and is not covered by a Canvas unit test; manual attachment flow is tested.
- No automated Playwright E2E suite (skipped by request); unit, migration, retention, backup, i18n and preview-model tests are included.

### Versions in this cycle

| Version | Code | Highlights |
|---|---|---|
| `2.4.0-alpha.1` | 240 | Recurring schedule, notification action → Compose, pre-upgrade backup, Dexie v2 |
| `2.4.0-beta.1` | 241 | Session media, WhatsApp preview, Quick Schedule |
| `2.4.0-beta.2` | 242 | Preview tabs (WhatsApp/card/label), reminder nav, manual-only update checks, README redesign |
| `2.4.0-beta.3` | 243 | Retention settings, safe history cleanup, 30-day trash and restore |
| `2.4.0` | 244 | Stable release |

## Previous releases

- **2.3.5** — Manual update-check button on PWA and Android; redesigned bilingual README and version badges.
- **2.3.4** — Share-app sheet offers the PWA link or APK download link.
- **2.3.3** — Native clipboard, correct persistent-storage status, developer report via WhatsApp, in-app APK download/install.
- **2.3.2** — Native Android biometric lock with PIN fallback and in-app update checker.
- **2.3.1** — Native diagnostics, native sharing, stable APK signing.
- **2.3.0** — File/QR data transfer, data health check, diagnostics and test matrix, native Capacitor APK.
- **2.2.0** — Persian language, per-language fonts, multilingual READMEs.
- **2.1.0** — Developer link, autocomplete, onboarding/What's New, QR from shared image, reminders notifications, biometrics-first, PWA screens, storage protection, Sorani.
- **2.0.0** — Complete React/PWA rebuild with Aurora Glass, Cairo, offline support, Share Target, backups, workspaces.
- **1.0.0** — First static HTML/JS release.

## Verification for this release

- TypeScript: 0 errors.
- Vitest: 71/71 tests (recurrence, migrations, backup roundtrip, media validation, preview models, retention/trash, i18n dictionaries, app update parsing).
- Production web build: successful.
- Android signed release APK built by GitHub Actions with the stable keystore; versionCode 244.
- Real-device test: completed by the project owner on v2.4.0-beta.3 (notifications, scheduling, trash/restore, favorites exclusion, README rendering, performance and UI).
