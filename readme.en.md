<div align="center">

<img src="public/icons/icon-192.png" width="88" alt="Direct WhatsApp logo" />

<h1>Direct WhatsApp <sub>ADMH Direct WhatsApp</sub></h1>

<p>
Open a WhatsApp chat directly <strong>without saving the number</strong> — destinations, templates, QR codes, cards, and stickers,<br />
everything local on your device: no server, no account, and no automatic sending.
</p>

<p>
<a href="https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/tag/v2.4.0-beta.3"><img src="docs/badges/version-2.4.0-beta.3.svg" height="30" alt="Version 2.4.0-beta.3" /></a>
&nbsp;
<img src="docs/badges/app-langs.svg" height="30" alt="Four languages: Arabic, English, Kurdish, Persian" />
&nbsp;
<img src="docs/badges/platform.svg" height="30" alt="PWA and Android APK" />
</p>

<p>
<a href="https://github.com/ahmdze"><strong>ADMH - Ahmed Zeyad</strong></a><br />
<sub>
Developed using<br />
<strong>Deepseek-V4.1-Flash 1017 in Deepseek HARNESS</strong><br />
<strong>Deepseek-V4.1-Pro in Deepseek HARNESS</strong><br />
<img src="docs/logos/deepseek-harness.svg" height="30" alt="DeepSeek HARNESS" /><br />
Technical and engineering review by<br />
<strong>Qwen 3.8-Max</strong><br />
<img src="docs/logos/qwen.svg" height="30" alt="Qwen" />
</sub>
</p>

<p><strong>This file is available in four languages:</strong></p>

<table>
  <tr>
    <td align="center"><a href="readme.md"><img src="docs/badges/lang-ar.svg" height="58" alt="العربية" /></a></td>
    <td align="center"><a href="readme.en.md"><img src="docs/badges/lang-en.svg" height="58" alt="English" /></a></td>
    <td align="center"><a href="readme.ckb.md"><img src="docs/badges/lang-ckb.svg" height="58" alt="کوردی" /></a></td>
    <td align="center"><a href="readme.fa.md"><img src="docs/badges/lang-fa.svg" height="58" alt="فارسی" /></a></td>
  </tr>
</table>

</div>

---

## Contents

| Start | Explore | Technical | More |
|---|---|---|---|
| [About the app](#about-the-app) | [Features](#features) | [Tech stack](#tech-stack) | [Privacy](#privacy) |
| [Get started](#get-started) | [Screenshots](#screenshots) | [Running locally](#running-locally) | [Changelog](#changelog) |
| [Android app](#building-the-android-app-apk) | [Languages & fonts](#languages--fonts) | [Building the APK](#building-the-android-app-apk) | [Documentation](#documentation) |

---

## About the app

**Direct WhatsApp** is an Arabic (RTL), mobile-first progressive web app (PWA), with a native Android version built with Capacitor:

- Opens a WhatsApp chat instantly with a local/international number, or `@username`, or a `wa.me` link.
- Saves destinations, templates, and chat history in separate workspaces.
- Generates QR codes and reads them from the camera or from an image, and makes share cards and printable stickers.
- Works fully offline after the first load, with its data in IndexedDB on your device.

> [!IMPORTANT]
> The latest release is **2.4.0-beta.3** (an internal Beta for testing). The Android app installs directly from a signed APK file, not through a store.
> Anyone who installed the old v1 version needs to delete it and install v2 once; v1 data migrates automatically.

> [!NOTE]
> There is no automatic sending of messages or opening of chats in the background. The app is a shortcut and direct-open tool, and you are the one who sends.

---

## Get started

| 🌐 Web version (PWA) | 🤖 Android version (APK) |
|---|---|
| [Open the app in the browser](https://ahmdze.github.io/ADMH-DirectWhatsApp/) | [Download the latest APK](https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest) |
| Runs on Android, iOS, and desktop, and installs from the browser menu. | A signed file for direct distribution; it runs alongside the PWA and its updates are in-app. |

---

## Features

> The version number in which each feature was added appears as a colored badge at the end of each line.

### Basics & sending

- Local/international number entry, or `@username`, or a WhatsApp link, with automatic formatting and country detection. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Autocomplete for saved destinations while typing. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Arabic country picker (60+ countries) with search, and a saveable default country. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Optional message with a character counter (2000 characters), and quick templates. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Open the chat, copy the link, and share via the Web Share API. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Smart history of recent chats, and saved destinations with names, tags, notes, and favorites. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Message templates that can be created and edited, with `{الاسم}` `{الجهة}` `{التاريخ}` variables. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- QR generation (PNG/SVG) and QR reading with the camera or from an image (with a jsQR fallback). <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- High-resolution PNG share card, and a vCard contact card. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Dark/light/auto appearance + accent color picker. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Onboarding tour on first launch and a “What's New” screen after every update. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Four languages: Arabic (default), English, کوردی, فارسی — with the Kurdish/Persian dictionaries loaded only on demand. <img src="docs/badges/v2.2.0.svg" alt="v2.2.0" height="19" />
- Automatic font suited to each language: Cairo for Arabic, Vazirmatn for Persian, Noto Naskh for Kurdish, with the option to set a font manually. <img src="docs/badges/v2.2.0.svg" alt="v2.2.0" height="19" />
- Smart paste from the native clipboard on Android, and number extraction from pasted text. <img src="docs/badges/v2.3.3.svg" alt="v2.3.3" height="19" />
- A “Share the app” button with two choices: share the PWA web app or the APK download link. <img src="docs/badges/v2.3.4.svg" alt="v2.3.4" height="19" />
- **Local session attachments**: images, files, and vCards are shared through the system share sheet and are not stored in the app, with WebP image compression and a download fallback. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- **Preview before sending** in WhatsApp style, plus a share card and a QR sticker — all local, without fetching links. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- **Quick Schedule** for a reminder from Compose with the current destination and message. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />

### Mobile experience (PWA)

- Bottom navigation bar, bottom sheets, subtle animations, haptics, and designed empty/loading/error states. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- PWA install, full offline operation, and updates approved by the user. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Share Target to receive text/links from another app. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Receive a **shared QR image** from another app and scan it automatically (Android). <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- App icon shortcuts: “Quick send” and “Scan QR”. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Optional lock with a PIN or biometrics (WebAuthn). <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Biometrics as the primary unlock method, with the PIN remaining as a fallback. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Local notifications for follow-up reminders when the app opens. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Smarter install banner (shown on mobile only, after a delay, and hidden once installed). <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Preview screens in the manifest and `handle_links`/`launch_handler` to open links inside the installed app. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- A polished error screen with an option to repair the app version. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- Persistent storage request and a warning when space is running low. <img src="docs/badges/v2.1.0.svg" alt="v2.1.0" height="19" />
- JSON backup/restore, and CSV export. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Data transfer between two devices via file or QR, data check and repair, and device diagnostics. <img src="docs/badges/v2.3.0.svg" alt="v2.3.0" height="19" />
- A **“Check for updates”** button, manual only, in Settings: there is no automatic background check, to protect privacy and reduce requests. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- A **Reminders button** in the bottom navigation bar for one-tap access. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />

### Tools & data

- QR stickers for A4 printing (2×4 or 3×8 grid) — suitable for shops and restaurants. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Local statistics (last 7 days, most used). <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Workspaces (personal/work) with full data separation. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Number-list campaigns: open chats sequentially with manual “Sent/Skipped” tracking — **no automatic sending**. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- Follow-up reminders that appear when the app opens. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- **Recurring reminders** (daily/weekly/monthly) with local notifications and scheduling on Android, and Compose opens from the notification. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- **Automatic backup before an upgrade**, downloadable from Settings. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- Import contacts from CSV/vCard or the Contact Picker. <img src="docs/badges/v2.0.0.svg" alt="v2.0.0" height="19" />
- **Data transfer** between two devices via file or QR code, with no server. <img src="docs/badges/v2.3.0.svg" alt="v2.3.0" height="19" />
- **Local data check and repair** (duplicates, corrupt numbers, orphaned records) with a preview before repairing. <img src="docs/badges/v2.3.0.svg" alt="v2.3.0" height="19" />
- **Automatic log cleanup and Trash**: old chat history is cleaned up automatically, and a Trash bin keeps removed items restorable for up to 30 days. <img src="docs/badges/v2.4.0.svg" alt="v2.4.0" height="19" />
- **Device diagnostics** (browser/camera/notifications/storage capabilities) and report export, plus a [device test matrix](docs/DEVICE-TEST-MATRIX.md). <img src="docs/badges/v2.3.0.svg" alt="v2.3.0" height="19" />
- **Send to developer** from Diagnostics: opens WhatsApp with the full report. <img src="docs/badges/v2.3.3.svg" alt="v2.3.3" height="19" />
- **Native Android app (APK)** that runs alongside the PWA, with background scheduled notifications and a native badge/icon. <img src="docs/badges/v2.3.0.svg" alt="v2.3.0" height="19" />
- **Native biometric lock** on Android, with PIN always available as a fallback. <img src="docs/badges/v2.3.2.svg" alt="v2.3.2" height="19" />
- **APK update checker** inside the app, with an in-app download with a progress bar and then an Install button. <img src="docs/badges/v2.3.3.svg" alt="v2.3.3" height="19" />

---

## Languages & fonts

| Language | Direction | Recommended font |
|---|---|---|
| Arabic | RTL | Cairo |
| English | LTR | Cairo |
| کوردی (Sorani) | RTL | Noto Naskh Arabic |
| فارسی | RTL | Vazirmatn |

The default font is **“Automatic per language”**, and it can be changed manually from: **Settings → Font**. These fonts were designed to display Kurdish and Persian letters (ڕ، ڵ، ێ، ۆ، پ، چ، ژ، گ) correctly instead of a single Arabic font that does not cover them.

---

## Screenshots

| Sending — dark | Destinations |
|---|---|
| ![Sending screen](docs/screenshots/compose-dark.png) | ![Destinations](docs/screenshots/targets-dark.png) |

| QR generation | Settings |
|---|---|
| ![QR generation](docs/screenshots/qr-dark.png) | ![Settings](docs/screenshots/settings-dark.png) |

| Tools | Sending — light |
|---|---|
| ![Tools](docs/screenshots/tools-dark.png) | ![Light mode](docs/screenshots/compose-light.png) |

| Onboarding tour | What's New |
|---|---|
| ![Onboarding tour](docs/screenshots/onboarding-dark.png) | ![What's New](docs/screenshots/whatsnew-dark.png) |

| Sending in Kurdish | About the app |
|---|---|
| ![Kurdish interface](docs/screenshots/compose-kurdish.png) | ![About the app](docs/screenshots/about-2.1.png) |

| Sending in Persian | Font — Persian |
|---|---|
| ![Persian interface](docs/screenshots/compose-persian.png) | ![Font settings](docs/screenshots/settings-font-persian.png) |

| Data transfer | Data check |
|---|---|
| ![Data transfer](docs/screenshots/transfer-v23.png) | ![Data check](docs/screenshots/health-v23.png) |

> Screenshots generated from the development build with demo data (`?demo=1`).

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 4 + Aurora Glass design system |
| Fonts | Cairo (Arabic/English), Vazirmatn (Persian), Noto Naskh Arabic (Kurdish) — bundled locally |
| Storage | IndexedDB via Dexie |
| QR | `qrcode` for generation + `jsqr` for reading (with `BarcodeDetector` when available) |
| PWA | `vite-plugin-pwa` (injectManifest) + Workbox: precache, Share Target, notifications |
| Android | Capacitor 8 + LocalNotifications/Camera/Clipboard/FileTransfer/FileOpener/Biometric/Share/Filesystem plugins |
| Languages | Custom i18n (ar/en/ckb/fa) + Kurdish and Persian dictionaries loaded on demand |
| Tests | Vitest |

---

## Running locally

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173
pnpm test       # unit tests
pnpm typecheck  # type checking
pnpm build      # build dist/
pnpm preview    # production preview
```

> Requires Node 22+ and pnpm 9+.
> In development mode you can load demo data by opening `http://127.0.0.1:5173/?demo=1` (not included in the production build).

---

## Structure

```
src/
├─ App.tsx                # shell, navigation, lock, update/install
├─ main.tsx
├─ components/            # shared components (ui, icons, nav, banners)
├─ features/
│  ├─ compose/            # sending screen
│  ├─ targets/            # destinations and history
│  ├─ templates/          # templates
│  ├─ tools/              # QR, cards, stickers, backup, diagnostics…
│  └─ settings/           # settings and lock
├─ lib/                   # phone, whatsapp, db, qr, scan, backup, i18n, update…
├─ hooks/                 # live Dexie queries
└─ styles/                # design system
tests/                    # Vitest
docs/                     # specs and previews
android/                  # Capacitor Android project
```

---

## Deploying to GitHub Pages

1. Push the project to GitHub.
2. In **Settings → Pages**, choose **Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (type checking + tests + build + deploy).

The project uses `base: './'` and hash routes, so it works under a repository path without extra configuration.

---

## Building the Android app (APK)

- Locally (requires JDK 21 + Android SDK): `pnpm android:sync`, then open `android/` in Android Studio, or run `cd android && ./gradlew assembleRelease` with the keystore environment variables.
- Automatically: every push to `main` runs `.github/workflows/android.yml`, builds a signed `app-release.apk`, and uploads it as an artifact — **with no store or account**.
- The current APK is a **Release build signed with a stable key** (kept outside the repository); updates therefore install over the current version without deleting data.
- Android data is separate from the PWA; use the **Data transfer** screen or a backup.

---

## Privacy

- No server, no account, no analytics, and your data is not sent anywhere. The Android build contacts GitHub Releases only to check for and download updates with your approval.
- Numbers, messages, templates, and generated images stay on your device.
- The camera only runs after an explicit request and stops when you leave the screen.
- No number or image is sent to an external QR service.

---

## Tests

- Unit tests for number normalization and parsing, WhatsApp link building, template variables, CSV and vCard, and update version comparison.
- Manual test matrix: Android Chrome, iOS Safari, Samsung Internet, desktop.
- Lighthouse check (Performance/Accessibility ≥ 95 and PWA installable) after deployment.

---

## Changelog

| Version | Highlights |
|---|---|
| **2.4.0-beta.3** | Automatic log cleanup, and a Trash bin with restore for up to 30 days |
| **2.4.0-beta.2** | WhatsApp/card/sticker preview, a Reminders button, and manual-only update checks |
| **2.4.0-beta.1** | Session attachments, WhatsApp preview, and Quick Schedule |
| **2.4.0-alpha.1** | Recurring reminders and local notifications, and a backup before upgrading |
| **2.3.5** | Manual “Check for updates” button in Settings on the web and in Android |
| **2.3.4** | “Share the app” button: a PWA share option and an APK download-link option |
| **2.3.3** | Native clipboard/paste, correct persistent-storage status, sending the report to the developer via WhatsApp, and APK download with a progress bar and an install button |
| **2.3.2** | Native Android biometric lock with PIN fallback, and an in-app APK update checker |
| **2.3.1** | Android fixes: native app diagnostics, native sharing, and stable APK signing |
| **2.3.0** | Data transfer via file/QR, data check and repair, diagnostics and device test matrix, Android APK app (Capacitor) |
| **2.2.0** | Persian language, a font per language (Cairo/Vazirmatn/Noto Naskh), multilingual README |
| **2.1.0** | Developer link, autocomplete, onboarding tour and “What's New”, QR from a shared image, reminder notifications, biometrics first, PWA screens, storage protection, Sorani Kurdish |
| **2.0.0** | Full rebuild: React + PWA, Aurora Glass, Cairo, serverless, Share Target, offline, backup, workspaces |
| **1.0.0** | First stable release (HTML/JS) |

---

## Documentation

- [Specifications and build plan](SPEC.md)
- [Development contract](docs/DEV-CONTRACT.md)
- [Device test matrix](docs/DEVICE-TEST-MATRIX.md)
- [Visual direction preview](docs/mockups/design-directions.png)

---

## Third party

The Cairo, Vazirmatn, and Noto Naskh Arabic fonts (OFL) — `qrcode` (MIT) — `jsQR` (Apache-2.0) — React/Vite/Dexie/Tailwind (MIT) — Capacitor and its plugins (MIT) — `@capgo/capacitor-native-biometric` (MPL-2.0). Details in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

---

## Developer

<div align="center">

**ADMH - Ahmed Zeyad**

[GitHub](https://github.com/ahmdze) · [WhatsApp](https://wa.me/9647723064622)

<sub>
All rights reserved 2026<br />
Developed using<br />
<strong>Deepseek-V4.1-Flash 1017 in Deepseek HARNESS</strong><br />
<strong>Deepseek-V4.1-Pro in Deepseek HARNESS</strong><br />
Technical and engineering review by<br />
<strong>Qwen 3.8-Max</strong>
</sub>

</div>
