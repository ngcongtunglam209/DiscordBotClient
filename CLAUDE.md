# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron app that runs the real Discord web client while logged in with a **bot token**. Default branch: `electron-v3`. Node 24+.

## Commands

```sh
npm run requirement     # npm install + clone Equicord (with VencordDBCPlugin) and discohook into ./Equicord, ./discohook
npm run build:deps      # build Equicord -> ./EquicordExtension, discohook -> ./assets/editor
npm run build:ts        # tsc + tsc-alias -> ./build
npm start               # electron . (runs build/index.js)
npm test                # = build:ts + start (no automated test suite exists)
npm run lint            # eslint src (CI runs this + test:typescript)
npm run test:typescript # tsc --noEmit
npm run build           # deps + ts + electron-builder -> ./dist
npm run core:update     # refresh assets/snapshot (Discord HTML + experiments) from discord.com
```

`Equicord/`, `EquicordExtension/`, `discohook/`, `assets/editor/`, `build/` and `dist/` are gitignored and generated. The app won't start without `EquicordExtension/` (it's loaded as a Chrome extension in `sessionPatch`).

## Architecture

**Request flow.** In `src/AppCore/index.ts` (`DiscordBotClient`), the app starts an HTTPS Express server on a random port with a self-signed cert (`APIServer.ts`). It then uses the Chromium switch `host-rules MAP discord.com 127.0.0.1:<port>` together with `ignore-certificate-errors`, so the window loads `https://discord.com` and every request to discord.com reaches the local server. The server works as follows:
1. Strips cookies/origin/etc. and rewrites `Authorization` to `Bot <token>` with the bot user agent.
2. Runs file-based route overrides (below), mounted under `/api/v10`, `/api/v9`, `/api` and the root.
3. Returns 403 for paths in `Constants.BlacklistRoutes` (endpoints bots can't use).
4. Sends `assets/snapshot/index.html` for `/`, `/app`, `/login` and `/channels/*`. This pins the Discord build version; `core:update` refreshes it.
5. Otherwise proxies to `https://canary.discord.com` through `Util.proxy` (Electron `net`).

**Route overrides** (`src/AppCore/routes/`): `src/AppUtils/RegisterRoutes.ts` maps the file path to an Express path. `#id` becomes `:id`, `!` becomes `?`, and `index` maps to the directory. Static segments are registered before `#param` ones. Each file must `export default` an `express.Router({ mergeParams: true })`. Routes either fake responses for user-only endpoints (e.g. `relationships` returns `[]`) or call the real API with `net.fetch` and patch the result to look like a user account (profiles, badges, Nitro data from `src/AppUtils/`). To change how an endpoint behaves for the client, add or edit a file here; any endpoint without a file falls through to the proxy. Use `Util.getDataFromRequest` when a route needs the request body (there is no global body parser, because bodies are piped through to the proxy).

**Renderer side.** `ElectronPreload.ts` exposes `BotClientNative`, `ipcRender` and `protoAPI` through `contextBridge`. The bot-specific client patches live in the external **VencordDBCPlugin** repo (cloned into `Equicord/src/userplugins/botClient`), not in this repo.

**IPC.** Channel names are the static strings in `IPCEvents.ts`. Main-process handlers are in `IPCManager.ts`. The renderer stores user settings protos and DMs in IndexedDB (Dexie). Main process and renderer fetch and set them over IPC.

**Secondary windows:**
- Config editor: Monaco, `assets/config/index.html` + `ConfigEditorPreload.ts`. It edits `config.ini` in userData through `Config.ts`, and unknown keys are dropped on validation.
- Beta message editor: the discohook build served by `MessageEditorServer.ts` on plain HTTP. It talks to the main window over a `MessageChannelMain` port pair.

`globalThis.botClient` is the `DiscordBotClient` singleton (typed in `src/overrides.d.ts`). Routes use it, e.g. `botClient.app.getVersion()`.

## Conventions

- Every `src` file must start with the header `/* Copyright Elysia © <year>. All rights reserved */`. ESLint enforces this (`simple-header`, template in `assets/header.txt`).
- Imports use the `src/*` path alias (rewritten by `tsc-alias`), and imports are auto-sorted (`simple-import-sort`). `any` is an error.
- Formatting: 4-space indent, double quotes, trailing commas, 120 columns (`npm run format`). ESLint also enforces `space-before-function-paren`, which is why declarations look like `function foo ()`.
- Use the logger from `scope(...)` in `electron-log` rather than bare `console` in main-process modules. `console` is proxied to the log anyway.
