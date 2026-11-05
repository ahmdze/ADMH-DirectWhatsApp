<div align="center">

<img src="public/icons/icon-192.png" width="96" alt="Direct WhatsApp logo" />

# Direct WhatsApp
### WhatsApp chats, without saving the number

A number, a username, or a link — open the chat in seconds, and keep your destinations, messages, and tools on your device.

[**Use the web version**](https://ahmdze.github.io/ADMH-DirectWhatsApp/)　·　[**Download the Android app**](https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest)　·　[Explore the project](#for-developers)

<br />

<a href="https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/tag/v2.4.3"><img src="docs/badges/version-2.4.3.svg" height="28" alt="Version 2.4.3" /></a>
&nbsp; <img src="docs/badges/platform.svg" height="28" alt="PWA and Android APK" />
&nbsp; <img src="docs/badges/app-langs.svg" height="28" alt="Four languages" />

<p>Language: <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=ar">العربية</a> · <strong>English</strong> · <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=ckb">کوردی</a> · <a href="https://ahmdze.github.io/ADMH-DirectWhatsApp/guide/?lang=fa">فارسی</a></p>

</div>

---

> **Your privacy comes first:** no account and no app server. Your data is stored locally, and the app never sends messages automatically; you review the chat and send it yourself.

## At a glance

**💬 Open a chat**　local or international number, `@username`, or a WhatsApp link.  
**📇 Organize your contacts**　destinations, templates, and chat history in separate workspaces.  
**🔳 Create and share**　QR codes, contact cards, stickers, and session attachments.

## See the app

<p align="center">
<a href="docs/screenshots/compose-dark.png"><img src="docs/screenshots/compose-dark.png" width="190" alt="Sending screen in dark mode" /></a>
<a href="docs/screenshots/targets-dark.png"><img src="docs/screenshots/targets-dark.png" width="190" alt="Destinations list" /></a>
<a href="docs/screenshots/qr-dark.png"><img src="docs/screenshots/qr-dark.png" width="190" alt="QR code tool" /></a>
</p>

<p align="center"><sub>Sending　·　Destinations　·　QR tools</sub></p>

<details>
<summary>See more screenshots — light mode, languages, reminders, and data transfer</summary>

<p align="center">
<a href="docs/screenshots/compose-light.png"><img src="docs/screenshots/compose-light.png" width="170" alt="Sending screen in light mode" /></a>
<a href="docs/screenshots/settings-dark.png"><img src="docs/screenshots/settings-dark.png" width="170" alt="Settings" /></a>
<a href="docs/screenshots/reminders-v24-ar.png"><img src="docs/screenshots/reminders-v24-ar.png" width="170" alt="Reminders (Arabic interface)" /></a>
</p>
<p align="center"><sub>Light mode　·　Settings　·　Reminders</sub></p>

<p align="center">
<a href="docs/screenshots/compose-kurdish.png"><img src="docs/screenshots/compose-kurdish.png" width="170" alt="Kurdish interface" /></a>
<a href="docs/screenshots/compose-persian.png"><img src="docs/screenshots/compose-persian.png" width="170" alt="Persian interface" /></a>
<a href="docs/screenshots/transfer-v23.png"><img src="docs/screenshots/transfer-v23.png" width="170" alt="Data transfer" /></a>
</p>
<p align="center"><sub>Kurdish　·　Persian　·　Data transfer</sub></p>

> Screenshots generated from the development build with demo data (`?demo=1`).

</details>

## Designed for daily use

### Type and open

- Automatic number formatting with country selection and detection.
- Write an optional message, use a template, then review the preview before opening WhatsApp.
- Open the chat, copy its link, or share it from your device.

### Save and organize

- Keep destinations with names, tags, notes, and favorites.
- Create templates with customizable messages and variables such as `{الاسم}` and `{التاريخ}`.
- Separate work data from personal use through workspaces.

### Practical tools

- Create QR codes and read them with the camera or from an image.
- Design a share card or vCard, and QR stickers for A4 printing.
- Create follow-up reminders, and transfer your data or export a backup.

### Works in your language and on your device

Arabic, English, کوردی (Sorani), فارسی — with the right direction and font for each language. Use it as a progressive web app (PWA), or install the APK on Android.

## Web or Android?

### 🌐 Web version (PWA)

- [Open the app](https://ahmdze.github.io/ADMH-DirectWhatsApp/) and install it from the browser menu if you like.
- After the first load, the interface and local data are available offline.
- Reminders appear when the app opens, depending on browser support.
- Data is stored in IndexedDB within the browser profile.
- The app asks for your approval before applying a PWA update.

### 🤖 Android app (APK)

- [Download the latest release](https://github.com/ahmdze/ADMH-DirectWhatsApp/releases/latest) and install it directly.
- The app interface and data are local; an internet connection is needed to complete the chat in WhatsApp.
- Supports scheduled local notifications, even when the app is closed.
- Its data is separate from the PWA; use backup or the transfer tool to move it.
- Check for updates manually; download and install start only with your approval.

## Privacy and data

- No account, no app server, and no built-in analytics; your data stays on your device.
- Messages are not sent automatically. The app opens a WhatsApp destination so you can complete sending yourself.
- The camera runs only with explicit permission, and stops when you leave the scanning screen.
- When checking for an Android update, the app contacts GitHub Releases. It downloads an APK only after your approval.
- Images and numbers are not sent to an external QR service.
- PWA storage and Android storage are separate. Use backup or data transfer to move between them.

<details>
<summary>All features in detail</summary>

### Basics & sending

> A version badge appears at the start of each feature for easy scanning and to show when it was added.

- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Local/international number entry, or `@username`, or a WhatsApp link, with automatic formatting and country detection.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Autocomplete for saved destinations while typing.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Arabic country picker (60+ countries) with search, and a saveable default country.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Optional message with a character counter (2000 characters), and quick templates.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Open the chat, copy the link, and share via the Web Share API.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Smart history of recent chats, and saved destinations with names, tags, notes, and favorites.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Message templates that can be created and edited, with `{الاسم}` `{الجهة}` `{التاريخ}` variables.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;QR generation (PNG/SVG) and QR reading with the camera or from an image (with a jsQR fallback).
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;High-resolution PNG share card, and a vCard contact card.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Dark/light/auto appearance + accent color picker.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Onboarding tour on first launch and a “What's New” screen after every update.
- <img src="docs/badges/v2.2.0.svg" alt="Version v2.2.0" height="18" align="absmiddle" />&nbsp;Four languages: Arabic (default), English, کوردی, فارسی — with the Kurdish/Persian dictionaries loaded only on demand.
- <img src="docs/badges/v2.2.0.svg" alt="Version v2.2.0" height="18" align="absmiddle" />&nbsp;Automatic font suited to each language: Cairo for Arabic, Vazirmatn for Persian, Noto Naskh for Kurdish, with the option to set a font manually.
- <img src="docs/badges/v2.3.3.svg" alt="Version v2.3.3" height="18" align="absmiddle" />&nbsp;Smart paste from the native clipboard on Android, and number extraction from pasted text.
- <img src="docs/badges/v2.3.4.svg" alt="Version v2.3.4" height="18" align="absmiddle" />&nbsp;A “Share the app” button with two choices: share the PWA web app or the APK download link.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Local session attachments**: images, files, and vCards are shared through the system share sheet and are not stored in the app, with WebP image compression and a download fallback.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Preview before sending** in WhatsApp style, plus a share card and a QR sticker — all local, without fetching links.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Quick Schedule** for a reminder from Compose with the current destination and message.

### Mobile experience (PWA)

- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Bottom navigation bar, bottom sheets, subtle animations, haptics, and designed empty/loading/error states.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;PWA install, full offline operation, and updates approved by the user.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Share Target to receive text/links from another app.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Receive a **shared QR image** from another app and scan it automatically (Android).
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;App icon shortcuts: “Quick send” and “Scan QR”.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Optional lock with a PIN or biometrics (WebAuthn).
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Biometrics as the primary unlock method, with the PIN remaining as a fallback.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Local notifications for follow-up reminders when the app opens.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Smarter install banner (shown on mobile only, after a delay, and hidden once installed).
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Preview screens in the manifest and `handle_links`/`launch_handler` to open links inside the installed app.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;A polished error screen with an option to repair the app version.
- <img src="docs/badges/v2.1.0.svg" alt="Version v2.1.0" height="18" align="absmiddle" />&nbsp;Persistent storage request and a warning when space is running low.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;JSON backup/restore, and CSV export.
- <img src="docs/badges/v2.3.0.svg" alt="Version v2.3.0" height="18" align="absmiddle" />&nbsp;Data transfer between two devices via file or QR, data check and repair, and device diagnostics.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;A **“Check for updates”** button, manual only, in Settings: there is no automatic background check, to protect privacy and reduce requests.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;A **Reminders button** in the bottom navigation bar for one-tap access.

### Tools & data

- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;QR stickers for A4 printing (2×4 or 3×8 grid) — suitable for shops and restaurants.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Local statistics (last 7 days, most used).
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Workspaces (personal/work) with full data separation.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Number-list campaigns: open chats sequentially with manual “Sent/Skipped” tracking — **no automatic sending**.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Follow-up reminders that appear when the app opens.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Recurring reminders** (daily/weekly/monthly) with local notifications and scheduling on Android, and Compose opens from the notification.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Automatic backup before an upgrade**, downloadable from Settings.
- <img src="docs/badges/v2.0.0.svg" alt="Version v2.0.0" height="18" align="absmiddle" />&nbsp;Import contacts from CSV/vCard or the Contact Picker.
- <img src="docs/badges/v2.3.0.svg" alt="Version v2.3.0" height="18" align="absmiddle" />&nbsp;**Data transfer** between two devices via file or QR code, with no server.
- <img src="docs/badges/v2.3.0.svg" alt="Version v2.3.0" height="18" align="absmiddle" />&nbsp;**Local data check and repair** (duplicates, corrupt numbers, orphaned records) with a preview before repairing.
- <img src="docs/badges/v2.4.0.svg" alt="Version v2.4.0" height="18" align="absmiddle" />&nbsp;**Automatic log cleanup and Trash**: old chat history is cleaned up automatically, and a Trash bin keeps removed items restorable for up to 30 days.
- <img src="docs/badges/v2.3.0.svg" alt="Version v2.3.0" height="18" align="absmiddle" />&nbsp;**Device diagnostics** (browser/camera/notifications/storage capabilities) and report export, plus a [device test matrix](docs/DEVICE-TEST-MATRIX.md).
- <img src="docs/badges/v2.3.3.svg" alt="Version v2.3.3" height="18" align="absmiddle" />&nbsp;**Send to developer** from Diagnostics: opens WhatsApp with the full report.
- <img src="docs/badges/v2.3.0.svg" alt="Version v2.3.0" height="18" align="absmiddle" />&nbsp;**Native Android app (APK)** that runs alongside the PWA, with background scheduled notifications and a native badge/icon.
- <img src="docs/badges/v2.3.2.svg" alt="Version v2.3.2" height="18" align="absmiddle" />&nbsp;**Native biometric lock** on Android, with PIN always available as a fallback.
- <img src="docs/badges/v2.3.3.svg" alt="Version v2.3.3" height="18" align="absmiddle" />&nbsp;**APK update checker** inside the app, with an in-app download with a progress bar and then an Install button.
- <img src="docs/badges/v2.4.3.svg" alt="Version v2.4.3" height="18" align="absmiddle" />&nbsp;**Native Share Target in the APK** to receive text, links, or images straight from the Android share sheet.
- <img src="docs/badges/v2.4.3.svg" alt="Version v2.4.3" height="18" align="absmiddle" />&nbsp;**App icon shortcuts**: “Quick send”, “Scan QR”, and “Reminders”.
- <img src="docs/badges/v2.4.3.svg" alt="Version v2.4.3" height="18" align="absmiddle" />&nbsp;**Android launcher name** follows the in-app language (the icon stays the same).

---

</details>

## For developers

### Requirements and running

Requires Node.js 22+ and pnpm 9+.

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173
pnpm test       # unit tests
pnpm typecheck  # type checking
pnpm build      # build dist/
pnpm preview    # production preview
```

To load demo data in development mode, open `http://127.0.0.1:5173/?demo=1`.

### Tech stack

| Area | Tools |
|---|---|
| UI | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, Aurora Glass design system |
| Data | IndexedDB via Dexie |
| PWA | vite-plugin-pwa, Workbox, custom Service Worker |
| Android | Capacitor 8 and its native plugins |
| QR | `qrcode` for generation, `jsqr` and `BarcodeDetector` for reading |
| Tests | Vitest |

### Project layout

```text
src/
├─ App.tsx                # shell, navigation, lock, and update
├─ components/            # shared UI components
├─ features/              # compose, targets, templates, tools, settings
├─ lib/                   # storage, QR, numbers, backup, updates
├─ hooks/                 # Dexie queries
└─ styles/                # design system
android/                  # Capacitor Android project
tests/                    # Vitest tests
docs/                     # documentation and screenshots
```

### Deployment and building the APK

- Deployment to GitHub Pages runs via `.github/workflows/deploy.yml` on push to `main` after type checking, tests, and build.
- The APK build runs via `.github/workflows/android.yml` on push to `main`. Release signing needs Android keystore secrets in the repository settings.
- The workflow uploads a signed APK as an artifact for **14 days**. Downloading an artifact differs from downloading a published release on the Releases page.
- For a local signed build, use JDK 21 and the Android SDK, and set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` before `./gradlew assembleRelease`.
- A stable signing key is essential to install an APK update over the current version while keeping its data.

### Tests

Unit tests cover number parsing, WhatsApp links, template variables, CSV/vCard, backup, migration, and reminder and update scheduling. A [manual test matrix](docs/DEVICE-TEST-MATRIX.md) is also available.

## Changelog

| Version | Highlights |
|---|---|
| **2.4.3** | Native Share Target, app shortcuts, in-app locale app name, and a multilingual guide page |
| **2.4.2** | Opening the location via Capacitor Geolocation and more precise error messages |
| **2.4.1** | Restored the Tools button in the navigation bar and improved update checks |
| **2.4.0** | Recurring reminders, attachments and preview, log cleanup and Trash |
| **2.3.0** | Data transfer, data check, device diagnostics, and the APK launch |
| **2.2.0** | Persian language, suitable fonts, and multilingual documentation |
| **2.1.0** | Kurdish, autocomplete, the onboarding tour, and reminder notifications |
| **2.0.0** | Rebuild with React and PWA, local storage, and workspaces |
| **1.0.0** | First stable release |

For detailed changes, see [CHANGELOG.md](CHANGELOG.md).

## Documentation and licenses

- [Specifications and build plan](SPEC.md) · [Development contract](docs/DEV-CONTRACT.md) · [Device matrix](docs/DEVICE-TEST-MATRIX.md)
- The Cairo, Vazirmatn, and Noto Naskh Arabic fonts are OFL licensed. Dependency license details are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Developer

<div align="center">

**ADMH - Ahmed Zeyad**

[GitHub](https://github.com/ahmdze) · [WhatsApp](https://wa.me/9647723064622)

<sub>Developed using Deepseek HARNESS · Technical and engineering review by Qwen</sub>

<sub>
All rights reserved 2026<br />
Developed using<br />
<strong>Deepseek-V4.1-Flash 1017</strong><br />
<strong>Deepseek-V4.1-Pro</strong><br />
<img src="docs/logos/deepseek-harness.svg" height="30" alt="DeepSeek HARNESS" /><br />
<strong>Qwen 3.8-Max</strong><br />
<img src="docs/logos/qwen.svg" height="30" alt="Qwen" /><br />
<a href="docs/screenshots/usage-dashboard.jpg"><strong>Usage and Cost</strong></a>
</sub>

</div>
