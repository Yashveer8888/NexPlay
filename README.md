# NexPlay

**NexPlay** is a React Native video player and local media library for Android. It scans videos stored on the device, organizes them by folders, and provides playback controls, media information, playback history, and a PIN-based private vault.

> **Project status:** In development. The JASSI AI assistant screen currently describes planned functionality and is explicitly marked as reserved for future updates.

[![React Native](https://img.shields.io/badge/React%20Native-0.87.1-61DAFB?logo=react)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android-brightgreen?logo=android)](https://developer.android.com/)
[![License](https://img.shields.io/badge/License-Not%20specified-lightgrey)](#license)

## Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Setup and Installation](#setup-and-installation)
- [Available Commands](#available-commands)
- [Permissions](#permissions)
- [Data and Privacy](#data-and-privacy)
- [Project Structure](#project-structure)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

### Media library

- Scan the device's media library for local videos.
- Browse videos by folder or view all videos in one list.
- Search by filename, folder, and media type.
- Sort media by name, date, duration, or file size.
- Switch between list and grid layouts where supported.
- Select multiple videos or folders for supported bulk actions.
- View media metadata such as duration, dimensions, file size, and format.
- Generate and display video thumbnails through a native Android module.

### Video player

- Custom native Android video-player view.
- Play and pause, seek, and move between videos in a playlist.
- Resume playback from a saved position and track playback history.
- Adjust playback speed, volume, and screen brightness.
- Change video resize/aspect mode and zoom using gestures.
- Select available audio and subtitle tracks when supported by the media.
- Lock player controls to reduce accidental touches.

### Private Vault

- Move selected videos into a separate vault location.
- Restore videos to their original paths or delete vault items.
- PIN setup and unlock flow.
- Store vault and media-library metadata in a local SQLite database.

**Security note:** The current code stores the vault PIN in the local SQLite database as a value, rather than demonstrating a secure password-hashing or encryption scheme. Treat the PIN as an app-level gate, not as strong cryptographic protection for sensitive files. Do not store highly sensitive content in the vault until its security design has been reviewed and improved.

### Themes and settings

- Dark and light color palettes.
- Media rescan from Settings.
- Centralized theme colors, spacing, and typography.

### JASSI AI Assistant — planned

The app includes a JASSI AI Assistant preview screen and a playback-command dispatcher interface. The screen itself labels AI features as future updates. Voice recognition, natural-language search, smart equalization, and a complete AI assistant should therefore be considered **planned, not fully implemented end-to-end** in this version.

## Technology Stack

| Area | Technology |
|---|---|
| Mobile framework | React Native CLI `0.87.1` |
| Language | TypeScript |
| UI navigation | React Navigation 7 (native stack and bottom tabs) |
| State management | Zustand 5 |
| Local database | `@op-engineering/op-sqlite` (SQLite) |
| Gestures and animation | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` |
| SVG icons and graphics | `react-native-svg` |
| Android native code | Kotlin native modules and views |
| Tests | Jest and React Native test preset |
| Code quality | ESLint and Prettier |

No remote backend or cloud database is configured in the inspected project files. The media library and playback metadata are designed around local device storage and a local SQLite database.

## Architecture

NexPlay combines a TypeScript/React Native UI with custom Kotlin Android modules for media operations.

- **Screens and navigation:** Own the user-facing library, player, settings, permission, and vault flows.
- **Zustand stores:** Keep library, permission, and theme state available across screens.
- **Native bridges:** Call Android code for media scanning, thumbnails, file operations, and system/player interactions.
- **SQLite layer:** Persists scanned video metadata, playback state, playlists, bookmarks, and vault records/settings.
- **JASSI dispatcher:** Defines a controller interface for playback actions; the AI/voice experience is not yet complete.

## Requirements

For Android development, install and configure:

- Node.js **22.11.0 or newer** (the `package.json` engine requirement is `>= 22.11.0`).
- npm, which is included with Node.js, or another package manager compatible with the lockfile you use.
- JDK and Android SDK versions compatible with the React Native 0.87.1 Android setup.
- Android Studio and an Android emulator, or a USB-connected Android device with developer options enabled.
- The React Native environment setup prerequisites: [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

The repository contains an Android native project and Kotlin modules. **Android is the primary target.** Although an `ios` script exists in `package.json`, the custom native modules shown in this repository are Android-specific and iOS support has not been verified.

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/Yashveer8888/NexPlay.git
cd NexPlay
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Metro

Open a terminal in the project root and run:

```bash
npm start
```

Keep Metro running while you build or launch the app.

### 4. Run on Android

Open a second terminal in the project root:

```bash
npm run android
```

Ensure an emulator is running or an Android device is connected and recognized by ADB. If the build fails, verify the Java/Android SDK setup against the React Native environment guide linked above.

## Available Commands

These scripts are defined in the repository's `package.json`:

| Command | Purpose |
|---|---|
| `npm start` | Start the Metro development server. |
| `npm run android` | Build and launch the Android app. |
| `npm run ios` | Attempt to build and launch for iOS; support is not verified. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Jest tests. |

## Permissions

NexPlay requests Android media/storage access so it can discover and manage local video files. Depending on Android version and the action being performed, the project includes permissions for reading media, managing files, notifications, wake locks, and foreground media playback.

- Grant media/storage access when prompted if you want to scan local videos.
- Only grant broad file-management access if you understand why the app needs it and the Android version requires it for the requested operation.
- Denying permission can prevent scanning, moving, restoring, or deleting media from working as expected.

## Data and Privacy

- The project uses a local SQLite database named `nexplay.db` for media metadata and app state.
- Scanned video records can include file paths, names, size, duration, dimensions, and playback position/history.
- File-management features can move or delete files on the device; review confirmations and selected items carefully.
- The inspected project does not configure a remote API/backend for media uploads.
- A local database is not automatically encrypted. Review the Private Vault security note above before relying on it for confidential files.

## Project Structure

```text
NexPlay/
├── App.tsx
├── android/
│   └── app/src/main/java/com/nexplay/
│       ├── filemanager/       # Native file and vault operations
│       ├── player/            # Native player view and system controls
│       ├── scanner/            # Native media scan and permission handling
│       └── thumbnail/          # Native thumbnail generation
├── src/
│   ├── components/
│   │   ├── common/             # Header, video cards, sorting, progress UI
│   │   └── player/             # React Native wrapper for native player
│   ├── navigation/             # Root stack and bottom-tab navigation
│   ├── screens/
│   │   ├── Folders/
│   │   ├── Future/             # JASSI assistant preview
│   │   ├── Home/
│   │   ├── Media/
│   │   ├── Permission/
│   │   ├── Player/
│   │   ├── Settings/
│   │   ├── Splash/
│   │   ├── Vault/
│   │   └── Videos/
│   ├── services/
│   │   ├── ai/                 # Playback command dispatcher interface
│   │   ├── database/            # SQLite schema and persistence functions
│   │   ├── native/              # Bridges to Kotlin modules
│   │   └── system/              # System-level helpers
│   ├── store/                   # Zustand state stores
│   ├── theme/                   # Colors, typography, spacing
│   └── types/                   # Video, permission, and navigation types
├── __tests__/
├── package.json
└── README.md
```

## Current Limitations

- JASSI is currently a preview/planned feature; a complete voice/AI pipeline is not present in the inspected implementation.
- Native file, scanner, thumbnail, and player functionality relies on custom Android code, so it should be tested on real Android versions and devices.
- The Private Vault PIN is stored locally without a secure hashing scheme visible in the current database layer; file encryption at rest is not established by the inspected code.
- iOS compatibility has not been verified.
- A license has not been identified in the supplied repository snapshot.

## Roadmap

Potential next steps for the project:

- [ ] Add screenshots and a short demo video to the repository.
- [ ] Add tests for scanning, sorting, playback-state persistence, and vault operations.
- [ ] Improve vault security with a reviewed encryption and key-management design.
- [ ] Complete JASSI with a real speech-to-text flow, command parsing, and clear permission/privacy controls.
- [ ] Verify Android version compatibility and document known device-specific issues.
- [ ] Add a license if the project is intended for public reuse.

## Contributing

Contributions and bug reports are welcome.

1. Fork the repository.
2. Create a branch for your change:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Make your changes and run the relevant checks:

   ```bash
   npm run lint
   npm test
   ```

4. Commit your changes and push the branch.
5. Open a Pull Request describing the change and the tests performed.

For large changes, open an issue first to discuss the proposal. Please do not include private files, credentials, or personal media in bug reports.

## License

No license file or confirmed license was identified in the supplied repository snapshot. Until a license is added, do not assume that the project is licensed for reuse or redistribution.

## Maintainer

**GitHub:** [@Yashveer8888](https://github.com/Yashveer8888)  
**Repository:** [Yashveer8888/NexPlay](https://github.com/Yashveer8888/NexPlay)
