# binarybot

A single-guild Discord bot written in TypeScript on Node.js 24 LTS. It runs as
one outbound-only process: a discord.js gateway connection, in-process cron
services, and a localhost-only health endpoint.

---

## Status

> **Scaffold only.** The repository currently contains the workspace skeleton and
> placeholder modules; no bot behaviour is implemented yet. The design below is
> the target. [AGENTS.md](./AGENTS.md) holds the working agreement for agents.
>
> The database layer is out of scope; [DATABASE.md](./DATABASE.md) holds future
> design notes only.

---

## Table of contents

- [Target architecture](#target-architecture)
- [What goes where](#what-goes-where)
- [Repository layout](#repository-layout)
- [Tech stack](#tech-stack)
- [Commands](#commands)
- [Local development](#local-development)
- [Observability](#observability)
- [Testing](#testing)
- [CI](#ci)

---

## Target architecture

Three layers, with dependencies pointing one way: **`apps/bot` → `services/*` →
`packages/core`**.

```
apps/bot          Discord adapter: client, commands, buttons, router, boot/shutdown
   |
services/*        self-scheduling jobs implementing Service
   |
packages/core     platform primitives, no Discord business logic
                  config - logger - health - scheduler - service registry - custom-id
```

| Layer | Responsibility |
|---|---|
| `packages/core` | Environment validation, structured logging, health state and HTTP server, cron scheduling with an overlap guard, the service registry, and the versioned button `custom_id` codec. |
| `services/*` | Background jobs that own their own schedule. Each exposes a pure function for testing plus a factory returning a `Service`. |
| `apps/bot` | Discord client, guild-scoped slash commands, button handlers, a single interaction router, and the composition root that wires everything and owns shutdown. |

Boot flow: load `.env` if needed → validate env with Zod → create logger and
health state → start the health server → create the client and registries →
log in → start services on `ClientReady`.

Shutdown flow: mark not ready → stop services in reverse order → close the
health server → destroy the client → force-exit after `SHUTDOWN_TIMEOUT_MS`.

V1 keeps runtime state in memory. There is no database.

---

## What goes where

The three source directories answer different questions. Choose by the code's
job, not by its topic:

| Directory | What belongs there | Lifecycle |
|---|---|---|
| `apps/*` | Runnable composition roots: load config, create the client, build registries, mount services, own shutdown. | Owns the process. |
| `services/*` | In-process background jobs that implement `Service` and are mounted by an app. | Started and stopped by an app. |
| `packages/*` | Reusable libraries and platform primitives with no entry point. | Imported, never started. |

A quick test:

- If it has an entry point and could be run on its own, it is an **app**.
- If it has `start`/`stop` and a schedule but no entry point, it is a **service**.
- If it is code that other modules import, it is a **package**.

Some examples:

- A new slash command or button handler → `apps/bot`, next to the router that
  dispatches it.
- A new recurring job → a new `services/<name>/` package.
- A helper shared by several services, or a new platform capability →
  `packages/core` (or a new package if it is large and independent).
- A second executable, such as a command-deployment CLI → a new `apps/<name>/`.

Imports follow the same split:

- `packages/core` imports no other workspace package and never imports
  discord.js.
- `services/*` may import `@binarybot/core` and reach Discord through the
  `client` in `ServiceContext`.
- `apps/bot` imports both and is the only place that wires them together.

---

## Repository layout

```
binarybot/
├── apps/
│   └── bot/                  # discord.js client, commands, button handlers
├── packages/
│   └── core/                 # config, logger, health, scheduler, service registry
├── services/
│   ├── presence-rotation/    # rotates the bot's activity
│   └── health-snapshot/      # records a heartbeat
├── deploy/                   # production Dockerfile and compose file
├── test/                     # shared test helpers
├── .github/workflows/        # CI
├── AGENTS.md                 # agent instructions and working agreement
├── DATABASE.md               # future database design (not implemented)
└── .env.example
```

Workspace packages are scoped `@binarybot/*` and linked with `workspace:*`.

---

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 24 LTS, ESM |
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces |
| Discord | discord.js 14 |
| Scheduling | croner |
| Validation | Zod |
| Logging | pino |
| Testing | Vitest |
| Containers | Docker + Docker Compose |
| CI | GitHub Actions |

---

## Commands

Currently available:

| Command | Description |
|---|---|
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm build` | Build all packages |

Planned:

| Command | Description |
|---|---|
| `pnpm dev` | Run the bot in watch mode (`tsx`) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | E2E placeholder against the development guild (local only) |
| `pnpm deploy:commands` | Register guild slash commands |

---

## Local development

Prerequisites: Node.js 24 LTS and pnpm 12. A dev container is available under
`.devcontainer/`.

```bash
pnpm install
cp .env.example .env        # fill DISCORD_TOKEN, DISCORD_GUILD_ID
pnpm dev                    # runs once the bot entry point exists
```

Each developer supplies their own token and guild id. Never point a local `.env`
at the production token.

---

## Observability

Structured JSON logs through pino, and a localhost-only health endpoint
(`GET /healthz` for liveness, `GET /readyz` for readiness) used by the container
healthcheck. Neither is exposed publicly.

---

## Testing

| Layer | Scope | Where |
|---|---|---|
| Unit | Config, codecs, scheduler, registry, commands, services — Discord objects mocked | CI |
| E2E | Commands and buttons against the development guild | Local only |

E2E tests never touch production.

---

## CI

`.github/workflows/ci.yml` runs install, typecheck, lint, and unit tests on pull
requests and pushes to `main`. The production image build and any deploy job are
not implemented yet.
