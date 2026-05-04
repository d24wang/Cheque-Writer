# Cheque Writer

A desktop application for writing and printing cheques. Manage banking profiles, define reusable cheque templates, and produce print-ready cheques — all stored locally.

## Tech Stack

- **Electron 41** — desktop shell
- **React 18 + TypeScript** — renderer UI
- **Vite 8** — renderer build tool
- **SQLite3** — local database (stored in `userData`)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This compiles the main process with `tsc`, then starts Vite dev server and Electron concurrently.

### Debug mode

```bash
npm run dev:debug
```

Starts with Node inspector on port `9229` and Chrome DevTools remote debugging on port `9222`.

## Building

### Type-check only (no output)

```bash
npm run typecheck
```

### Production build

```bash
npm run build
```

This runs in order:

1. `vite build` — bundles the renderer to `dist/renderer/`
2. `tsc -p tsconfig.main.json` — compiles the main process to `dist/main/`
3. `electron-builder` — packages the app to `release/`

Build output on macOS:

| File | Description |
|---|---|
| `release/mac-arm64/Cheque Writer.app` | Runnable application |
| `release/Cheque Writer-x.x.x-arm64.dmg` | Distributable DMG |
| `release/Cheque Writer-x.x.x-arm64-mac.zip` | Zip archive |

### Clean all build artifacts

```bash
npm run clean
```

Removes `node_modules/`, `dist/`, `release/`, and `tmp/`.

## Project Structure

```
src/
  main/           # Electron main process
    db/           # SQLite database layer (factory pattern)
      tables/     # CRUD for profiles, templates, checks
    main.ts       # App entry, IPC handlers
    preload.ts    # contextBridge API exposed to renderer
  renderer/       # React UI
    components/   # Shared components (PageHeader, CheckFormAndPreview, …)
    pages/        # Page-level components (ProfilesPage, ProfileDetailPage, CheckWritingPage)
    styles.css    # Global styles
  lib/            # Shared library (CheckImagePreview, InputFieldOverlayEditor)
```

## Features

- **Profiles** — create and manage banking profiles (account holder details)
- **Cheque Templates** — per-profile templates with custom cheque images, field overlays, and print dimensions
- **Write Cheques** — fill in payee, amount, date, and memo; preview before printing
- **Saved Cheques** — save, load, copy, and delete previously written cheques per template
- **Print** — sends the rendered cheque directly to the system print dialog

## License

MIT
