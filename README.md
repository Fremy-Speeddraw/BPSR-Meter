# BPSR Meter

BPSR Meter is yet another fork of [NeRooNx's BPSR Meter](https://github.com/NeRooNx/BPSR-Meter) which is a fork of [MrSnakke](https://github.com/mrsnakke/BPSR-Meter) BPSR-Meter which is a customized version of [Dimole's Star Resonance counter](https://github.com/dmlgzs/StarResonanceDamageCounter). I've converted it to using electron vite + tailwind + reack 19 because that's what easier to work with and doesnt hog performance with dom updates, and it also includes typescript support.

## Quick start (Users)

Requirements:
- On Windows, you need to download [Npcap](https://npcap.com/#download)

Using a packaged installer (recommended):

1. Download the installer from releases
2. Run the installer.
3. The application will automatically launch after installation.

Using the source (advanced users):

1. Clone the repo and install dependencies:

   ```cmd
   git clone <repo-url>
   cd BPSR-Meter
   npm install
   ```

2. Build and run the packaged preview app (this builds renderer and main outputs):

   ```cmd
   npm run preview or npm run start
   ```

3. By default the server listens on port 8989. If you run the server from the command line you can pass a custom port as the first argument. The app will print the local URL, e.g. `http://localhost:8989/index.html`.

## Developer guide

This project uses Electron + Vite for the renderer and an Express server for backend APIs and socket.io for realtime events.

Prerequisites
- Node.js v22.x
- npm (or another Node package manager)
- For native sniffing (development) on Windows you'll need the appropriate WinPcap/Npcap driver and dev headers for the `cap` module. For most users, installing Npcap from [Npcap](https://npcap.com/) is sufficient.

Install dependencies

```cmd
npm install
```

Useful npm scripts (from `package.json`)
- `npm run dev` — Start electron-vite in development mode (hot reload for renderer).
- `npm run build` — Build the renderer and related assets using electron-vite.
- `npm run build:server` — Transpile `src/main/server.ts` into `dist/server` (used for packaging the standalone server binary).
- `npm run build:all` — Run `build` and `build:server` together.
- `npm run preview` — Launch the built app in preview mode.
- `npm run dist` — Build everything and produce a Windows installer via `electron-builder`.
- `npm run lint:prettier` — Format source files with Prettier.

Development notes and architecture
- `src/main/` — Electron main process entry (`index.ts`) and `server.ts` (backend sniffer + API server).
- `src/renderer/` — Renderer (web UI) source and public assets.
- `src/server/` — Express API wiring (`api.ts`), data manager and sniffer integration.
- `algo/` — Packet parsing and protobuf utilities.
- `translations/` — Localization JSON files.

Contributing
- Please open issues or PRs against the `main` branch. Run `npm run lint:prettier` before submitting changes.

Contact
- Author: Fremy-Speeddraw
