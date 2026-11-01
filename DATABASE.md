# Database

> **Status: not implemented, and out of scope.** Nothing described here exists
> yet. V1 stores runtime state in memory; this document is a design sketch to
> revisit only once the bot itself is implemented and the instructions change.
> Do not add PostgreSQL, Drizzle, migrations, or database configuration.

The bot will use PostgreSQL, accessed through Drizzle ORM and migrated with
drizzle-kit. Each environment serves exactly one guild, so tables are not keyed by
`guild_id`; production and each local database are separate.

---

## Tech

| Concern | Choice | Why |
|---|---|---|
| Database | PostgreSQL | Relational model with strong constraints and JSONB values. |
| ORM / migrations | Drizzle ORM + drizzle-kit | Type-safe queries close to SQL; plain-SQL migrations committed to git. |

---

## Configuration

The database connection is provided through an environment variable, validated at
boot with Zod:

```dotenv
DATABASE_URL=postgres://user:pass@host:5432/binarybot_prod
```

The value lives only in the environment (the GitHub `production` Environment in
CI, `.env` locally and on the VPS).

---

## Schema

| Table | Purpose |
|---|---|
| `settings` | Key/value runtime configuration (JSONB values). |
| `groups` | The server's smaller groups. |
| `group_members` | Membership of users in groups. |
| `tickets` | Ticket records created via commands/buttons. |
| `ticket_events` | State transitions and actions taken on tickets. |
| `service_runs` | Outcomes and timing of scheduled service executions. |

---

## Migrations

Drizzle-kit generates SQL migrations into `drizzle/`. These files are committed
and applied as a discrete deploy step, before the new bot container starts.
Migrations must be forward-only and backward-compatible with the running version
so a rollback to the previous image continues to work.

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |

---

## Local development

> Aspirational — `deploy/development/docker-compose.yml` does not exist. Nothing
> in this section is runnable today.

A local Postgres would be started with Docker Compose, and migrations applied
before running the bot:

```bash
docker compose -f deploy/development/docker-compose.yml up -d
pnpm --filter @binarybot/core db:migrate
```

---

## Scheduled services

Services are registered at boot and scheduled in-process. A Postgres advisory
lock prevents overlapping runs, and each run's outcome is written to
`service_runs`.

Today the overlap guard is in-process only (a boolean per job in the scheduler);
there is no advisory lock, because there is no database.
