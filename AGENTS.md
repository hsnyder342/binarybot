# Agent Instructions

## Current state

- The repo is still a **scaffold**. The only real behavior in `apps/bot/src/index.ts`
  creates a discord.js `Client` and logs in; `packages/core` and both services
  export placeholder functions.
- `README.md` describes the **target** architecture, not shipped features.
  `deploy/`, `test/`, and most of the design do not exist yet.
- `@binarybot/bot` and `@binarybot/core` are scoped; the two services are still
  named `health-snapshot` and `presence-rotation`. `bot` links core with
  `workspace:*`.
- `dist/` is ignored build output. Do not edit or commit it.

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

Run one test file with `pnpm exec vitest run <path>`.

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test on Node 24/pnpm 12;
it does **not** build. README mentions `test:watch`, `test:e2e`, and
`deploy:commands`, but those scripts do not exist yet.

## Layout and build wiring

Dependencies point one way: `apps/bot` → `services/*` → `packages/core`.
`core` must not import discord.js.

- Root `tsconfig.json` maps `@binarybot/core` to `packages/core/src/index.ts` and
  type-checks the whole workspace.
- Per-package `tsconfig.json` files extend the root config. `tsconfig.build.json`
  clears `paths`, excludes `*.test.ts`, and emits to `dist/`.
- Tests are colocated as `src/*.test.ts`; Discord objects must be mocked.
  Vitest uses the `node` environment.
- Builds rely on the workspace link for `@binarybot/core`, not the root `paths`
  alias.

## Target design to follow when implementing

- `Service` is `{ name, start(context), stop() }`; `ServiceContext` carries
  `client`, `config`, `logger`, and `health`. The registry rejects duplicate
  names, starts in registration order, stops in reverse, and isolates failures.
- Scheduling uses `croner` behind an overlap guard.
- Button ids are `v1:<namespace>:<action>[:<id>]`, validated on encode and
  decode, capped at Discord's 100 characters.
- Health is localhost-only: `GET /healthz` for liveness, `GET /readyz` for
  readiness (503 until ready).
- Boot: validate env with Zod → create logger/health → start health server →
  create client/registries → login → start services on `ClientReady`. Shutdown
  reverses this and force-exits after `SHUTDOWN_TIMEOUT_MS`.
- `zod`, `pino`, and `croner` are not installed yet; add them when needed.

## Conventions and gotchas

- ESM only. Relative imports must include `.js`; the root config uses
  `moduleResolution: node` and will not catch a missing extension.
- TypeScript is strict. Avoid `any` even though ESLint reports it only as a
  warning.
- ESLint enforces single quotes, a final newline, and no trailing whitespace.
- Never log tokens or point a local `.env` at the production token.
- V1 state is in memory. Do not add a database, PostgreSQL, Drizzle, or
  migrations; `DATABASE.md` is a future sketch only.
- Keep the health server bound to localhost.
- discord.js is locked to 14.27.0, which uses `clientReady`; `ready` is
  deprecated.
- `.devcontainer/mine/` is local-only and git-excluded. Never commit it.

## Commits and change discipline

Use Conventional Commits: `type(scope): lowercase imperative description`, no
trailing period. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`,
`revert`; scope is the package name (`bot`, `core`).

- One logical change per commit; include the test with the code it covers.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` must pass before starting the
  next change.
- Prefer the smallest change. If an approach is wrong, stop and discuss it
  rather than widening the change.
