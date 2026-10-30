# binarybot

A single-guild Discord bot written in TypeScript on Node.js 24 LTS. It runs in
production on a Hetzner VPS and can be run locally for development. The bot
handles slash commands and button interactions, and runs a set of self-scheduled
services.

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Deployment topology](#deployment-topology)
- [Repository layout](#repository-layout)
- [Services](#services)
- [Configuration](#configuration)
- [Commands and interactions](#commands-and-interactions)
- [CI/CD](#cicd)
- [Testing](#testing)
- [Observability](#observability)
- [Local development](#local-development)
- [Footnotes](#footnotes)

---

## Architecture overview

The bot is an outbound-only process. It opens a gateway connection to Discord and
never needs a publicly reachable port.

```
                        +---------------------------+
                        |        Discord            |
                        +-------------+-------------+
                                      ^
                                      | outbound only
                +---------------------+---------------------+
                |                                           |
    +-----------v-----------+                   +-----------v-----------+
    |  bot (production)     |                   |  bot (local dev)      |
    |  Hetzner VPS          |                   |  developer machine    |
    |  Docker Compose       |                   |  pnpm dev             |
    |  discord.js           |                   |  discord.js           |
    |  cron services        |                   |  cron services        |
    +-----------------------+                   +-----------------------+
```

Production runs on the VPS; developers run the bot locally with a separate Discord
application. Scheduling happens in-process, with no external queue.

---

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 24 LTS, ESM |
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces |
| Discord | discord.js 14.27 |
| Scheduling | croner |
| Validation | Zod |
| Logging | pino |
| Testing | Vitest |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Deployment topology

There is one deployed environment, **production**, on a single Hetzner VPS.
Development happens locally on each developer's machine.

| Environment | How it runs |
|---|---|
| `production` | Docker Compose on the VPS, deployed by CI |
| `local` | `pnpm dev` on a developer machine |

Production makes only outbound connections. Each developer supplies their own
token and guild id through `.env`.

---

## Repository layout

```
binarybot/
├── apps/
│   └── bot/                  # discord.js client and handlers
├── packages/
│   └── core/                 # config, logger, service registry, health server
├── services/                 # self-scheduling service modules
├── deploy/                   # Dockerfile and production compose file
├── .github/workflows/        # CI + CD pipelines
├── .env.example
└── README.md
```

---

## Services

Services are modules that run on their own cron schedules and are registered at
boot.

| Service | Purpose |
|---|---|
| `presence-rotation` | Rotate the bot's activity status. |
| `health-snapshot` | Record a heartbeat. |

---

## Configuration

Secrets and wiring are supplied through environment variables, which are
validated at boot.

---

## Commands and interactions

Commands are defined with discord.js builders and registered to the guild on
deploy. Interaction handlers validate their payloads before executing. Buttons
encode their intent in a `custom_id`, which the handler parses to load the
relevant record.

---

## CI/CD

Trunk-based development. Pull requests run lint, typecheck, unit tests, and a
build. Merges to `main` also build and push the image. Production deploys are
manual, require approval, and finish with a smoke test; a failed deploy rolls
back.

| Trigger | Result |
|---|---|
| Pull request | checks only |
| Push to `main` | checks + image build |
| Release tag | approval-gated production deploy |

---

## Testing

| Layer | Scope |
|---|---|
| Unit | Commands, services, config, helpers |
| E2E | Commands and buttons against the development bot |

CI runs unit tests on every pull request. E2E tests run locally and never touch
production.

---

## Observability

Structured JSON logs, plus a localhost-only health endpoint for container
healthchecks and deploys.

---

## Local development

Prerequisites: Node.js 24 LTS, pnpm.

```bash
pnpm install
cp .env.example .env        # fill DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID
pnpm --filter @binarybot/bot dev
```

Each developer supplies their own token and guild id. Never point a local `.env`
at the production token.

| Command | Description |
|---|---|
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E against the development guild |
| `pnpm build` | Build all packages |

---

## Footnotes

The database layer is not yet implemented. Its intended design is documented in
[DATABASE.md](./DATABASE.md) and will be added later.
