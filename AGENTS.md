# Agent Instructions

## Current state

- `README.md` describes the **target** architecture; parts are still aspirational.
  Trust `package.json`, `tsconfig*.json`, CI, and source over its status section.
- Implemented: Zod config, pino logger, `HealthState`/`HealthRegistry`,
  `ServiceRegistry`, and `Bot`/`BotClient` startup and shutdown.
- Not implemented: the health HTTP server (`/healthz`, `/readyz`), scheduling
  (`croner` is not installed), button ids, command registry/router, `deploy/`,
  `test/`, and signal handling/force-exit.
- Both `services/*` packages still export placeholder functions, not `Service`
  implementations, so no concrete service is registered with the bot.
- V1 state is in memory. Do not add a database, PostgreSQL, Drizzle, or
  migrations; `DATABASE.md` is a future sketch only.

## Commands

Requires Node 24 and pnpm 12. Run `pnpm install`; local config lives in `.env`
(copy `.env.example`).

| Command | What it does |
|---|---|
| `pnpm typecheck` | One root `tsc --noEmit` over `apps/`, `packages/`, `services/` |
| `pnpm lint` / `pnpm lint:fix` | ESLint over all `.ts` files |
| `pnpm test` | Vitest unit tests |
| `pnpm build` | Recursive per-package build via each `tsconfig.build.json` |
| `pnpm clean` | Delete `dist/` and `coverage/` |
| `pnpm dev` | `tsx watch` entry point, loads `.env` if present |

Run one test file with `pnpm exec vitest run <path>`; add `-t <name>` to filter.

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → build on Node
24/pnpm 12. README mentions `test:watch`, `test:e2e`, and `deploy:commands`;
those scripts do not exist.

`pnpm dev` passes `--env-file-if-exists=./.env`. Running `tsx` or built output
directly does not load `.env`, so export the variables yourself.

## Architecture and wiring

Intended dependency direction: `apps/bot` → `services/*` → `packages/core`.
`core` must not import discord.js. Today `apps/bot` imports `@binarybot/core`;
the service packages have no workspace dependencies yet.

- Entry point is `apps/bot/src/index.ts`: `parseConfig()` → `new Bot(config)` →
  `start()`.
- `Bot` (`apps/bot/src/bot.ts`) owns the logger, client, `HealthRegistry`, and
  `ServiceRegistry`. `BotClient` is deliberately a thin discord.js adapter
  holding only config/logger; do not move registry wiring back into it.
- `Bot.start()` logs in and registers a one-time `clientReady` handler that
  marks the `client` component ready and calls `services.startAll()` without
  awaiting it. `Bot.stop()` runs `stopAll()`, then `health.markAllNotReady()`,
  then `client.destroy()`.
- `HealthRegistry` is the only `name → health handle` map. `HealthState` is the
  writable leaf; `isReady()` is false when the registry is empty and otherwise
  gates on required components (`required` defaults to true). `markAllNotReady()`
  exists for shutdown.
- `ServiceContext` carries `client`, `config`, `logger`, and `health`;
  `ServiceContextBase` omits `health`. `ServiceRegistry` injects each service's
  handle from `health.for(name)` at start time — do not keep a second handle map.
- Services own their health: they mark themselves ready/not ready. The service
  registry does **not** enforce health state on start or stop; `stop()` is a
  contract that services must honour. Shutdown's `markAllNotReady()` is the
  safety net.
- `ServiceRegistry` starts in registration order and stops in reverse. Per-service
  `start(name)`/`stop(name)` are idempotent and throw for unknown names;
  `startAll()`/`stopAll()` isolate and log failures. `#running` is its only
  lifecycle state.
- `parseConfig` reads `DISCORD_TOKEN` and `DISCORD_GUILD_ID` (required);
  `NODE_ENV` defaults to `development`, `LOG_LEVEL` to `INFO`.

## Layout and build wiring

- Root `tsconfig.json` maps `@binarybot/core` to `packages/core/src/index.ts` and
  type-checks the whole workspace.
- Per-package `tsconfig.json` files extend the root config. `tsconfig.build.json`
  clears `paths`, excludes `*.test.ts`, and emits to `dist/`.
- `packages/core/package.json` points `main`/`types`/`exports` at `dist/`.
  Changing that entry-point wiring can break `pnpm build` even when typecheck
  passes. Builds use the workspace link, not the root `paths` alias.
- Vitest does not read tsconfig paths; `vitest.config.ts` aliases
  `@binarybot/core` to `packages/core/src/index.ts`.
- Tests are colocated as `src/*.test.ts`, run in the `node` environment, and must
  mock Discord objects. `dist/` is ignored build output; do not edit or commit it.

## Conventions and gotchas

- ESM only. Relative imports must include `.js`; the root config uses
  `moduleResolution: node` and will not catch a missing extension.
- TypeScript is strict. Avoid `any` even though ESLint reports it only as a
  warning.
- ESLint enforces single quotes, a final newline, no trailing whitespace, and no
  unused variables.
- discord.js is installed at 14.27.0, which uses `clientReady`; `ready` is
  deprecated.
- `pino-pretty` is a root dev dependency enabled by `createLogger` only when
  `NODE_ENV=development`. Do not enable it in tests or production.
- Never log tokens or point a local `.env` at the production token.
- `.devcontainer/mine/` is local-only and excluded via `.git/info/exclude`.
  Never commit it.

## Commits and change discipline

Use Conventional Commits: `type(scope): lowercase imperative description`, no
trailing period. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
`revert`; scope is the package name (`bot`, `core`).

- One logical change per commit; include the test with the code it covers.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` must pass before starting the
  next change.
- Prefer the smallest change. If an approach is wrong, stop and discuss it
  rather than widening the change.
