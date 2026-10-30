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

## Project Overview

Single-guild Discord bot (`discord.js` 14) on Node.js 24 LTS, ESM modules, TypeScript strict. Workspace layout:

```
apps/bot/          # Discord client, slash commands, button handlers
packages/core/     # Config, logger, service registry, health server
services/          # Self-scheduling service modules (presence-rotation, health-snapshot)
deploy/            # Production Dockerfile and compose
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E against the development guild |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate a Drizzle migration |
| `pnpm db:migrate` | Apply pending migrations |

## Architecture

- Outbound-only process; no public port needed.
- Production runs on a Hetzner VPS via Docker Compose; CI/CD via GitHub Actions.
- Scheduling is in-process via `croner`; no external queue.
- Database: PostgreSQL with Drizzle ORM (not yet implemented; see [DATABASE.md](./DATABASE.md)).
- Each environment serves exactly one guild — tables are not keyed by `guild_id`.

## Conventions

- **ESM only** — no CommonJS.
- **TypeScript strict** — no `any`; use `unknown` with narrowing.
- **Zod validation** at boot for all environment variables.
- **Pino** for structured JSON logging.
- **Vitest** for tests; unit tests in CI, E2E local only.
- **Migrations** are forward-only, backward-compatible SQL files in `drizzle/`.
- **Health endpoint** is localhost-only for container healthchecks.

## Pitfalls

- Never point a local `.env` at the production Discord token.
- Advisory locks prevent overlapping service runs; document concurrency assumptions.
- Rollback deploys require migrations to be forward-compatible with the previous image.
