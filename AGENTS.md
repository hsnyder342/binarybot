# Agent Instructions

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>

[optional body]
```

| Type | Meaning |
|------|---------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Maintenance, dependencies, tooling |
| `docs` | Documentation-only changes |
| `refactor` | Code change with no behavior change |
| `test` | Adding or updating tests |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

Rules:
- Lowercase description, no period at end.
- Scope is the package name (e.g., `bot`, `core`) when applicable.
- Use imperative mood: "add" not "added" or "adding".

## Current State

The repository is a **clean scaffold** at commit `2848dfb`. Nothing is
implemented yet:

- Workspace packages are still named `bot`, `core`, `health-snapshot`, and
  `presence-rotation`; they are not yet scoped `@binarybot/*`.
- `tsconfig.json` is a single flat config with `moduleResolution: node`.
- `zod`, `pino`, `croner`, and `tsx` are not installed; the lockfile has no
  entries for them.
- `node_modules/` and every `dist/` directory have been removed.
- `apps/bot/src/index.ts` and the three package `src/index.ts` files are
  placeholders.

The bot is built incrementally; see the working agreement below.

## Working Agreement

This project is built **incrementally**. A previous attempt implemented the whole
system in one pass and had to be discarded.

- One logical change per commit. Do not bundle unrelated work.
- `pnpm typecheck` and `pnpm test` must pass before starting the next change.
- Add the test alongside the code it covers, in the same commit.
- Prefer the smallest change that satisfies the requirement; resist adding
  infrastructure it does not need.
- If an approach turns out to be wrong, stop and discuss it rather than widening
  the change.

## Target Architecture

Three layers, dependencies pointing one way: `apps/bot` → `services/*` →
`packages/core`. `core` must not import discord.js.

```
apps/bot/          # Discord client, slash commands, button handlers, router, boot
packages/core/     # Config, logger, health server, scheduler, service registry, custom-id
services/          # Self-scheduling service modules (presence-rotation, health-snapshot)
deploy/            # Production Dockerfile and compose file
test/              # Shared test helpers
```

- **`Service`** — `{ name, start(context), stop() }`. `ServiceContext` carries
  `client`, `config`, `logger`, and `health`. The registry rejects duplicate
  names, starts in registration order, stops in reverse, and isolates a failing
  service so it cannot take down the others.
- **Scheduling** — in-process via `croner`. Every job runs behind an overlap
  guard that skips and logs when the previous run is still in progress.
- **Custom ids** — buttons encode intent as `v1:<namespace>:<action>[:<id>]`,
  validated on both encode and decode, capped at Discord's 100 characters.
- **Health** — `GET /healthz` (liveness) and `GET /readyz` (readiness, 503 until
  `ClientReady`) on a localhost-bound server.
- **Boot** — load `.env` if present, validate env with Zod, create logger and
  health state, start the health server, create the client and registries, log
  in, then start services on `ClientReady`.
- **Shutdown** — mark not ready, stop services, close the health server, destroy
  the client, force-exit after `SHUTDOWN_TIMEOUT_MS`.
- **V1 state is in memory.** There is no database.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm build` | Build all packages |
| `pnpm dev` | Run the bot in watch mode (`tsx`) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | E2E placeholder, local only |
| `pnpm deploy:commands` | Register guild slash commands |

## Conventions

- **ESM only** — no CommonJS. Relative imports use `.js` specifiers (NodeNext).
- **TypeScript strict** — no `any`; use `unknown` with narrowing.
- **Zod validation** at boot for all environment variables.
- **Pino** for structured JSON logging; never log tokens.
- **Vitest** for tests; Discord objects are mocked. Unit tests run in CI, E2E
  local only.
- **Health endpoint** is localhost-only for container healthchecks.
- **Commands** are guild-scoped and deployed with `pnpm deploy:commands`.
- **Services** are registered at boot, run under an overlap guard, and log
  outcomes.

## Pitfalls

- Never point a local `.env` at the production Discord token.
- Deployment rollbacks must remain compatible with the previous image.
- Do not bind the health server to a public interface.
- Do not add a database until these instructions change. See
  [DATABASE.md](./DATABASE.md) for future design notes only.
- `.devcontainer/mine/` is deliberately git-excluded (`.git/info/exclude`); it
  holds local-only agent tooling and must not be committed.
