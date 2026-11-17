# Setup

This project runs entirely in a **dev container** — a single image with
Node.js 22 and PostgreSQL 16 wired together. Open it either way:

- **GitHub Codespaces:** click **Code → Codespaces → Create codespace**.
- **Locally:** install [Docker](https://docs.docker.com/desktop/setup/install/mac-install/)
  and the VS Code [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
  extension, then **Reopen in Container**.

There's nothing to install by hand. On first create, the container automatically
starts PostgreSQL, installs dependencies, generates the Prisma client, and seeds
the database from `scripts/db_dump.sql`.

Once it finishes, confirm everything is wired up correctly:

```bash
pnpm verify
```

This checks tooling, dependencies, the Prisma client, and that the database is
reachable and seeded. It should report all checks passing.

## Commands

| Command | What it does |
|---|---|
| `pnpm start` | Boots the NestJS app in watch mode (auto-restarts on changes). API at `:8080/v1`, Swagger at [http://localhost:8080/api](http://localhost:8080/api). |
| `pnpm build` | Compiles TypeScript to `dist/` (production build). |
| `pnpm verify` | Health-checks the environment: tooling, dependencies, Prisma client, and that the database is running and seeded. Starts Postgres if it isn't already. |
| `pnpm pg:seed` | Resets the database to the starting state (wipes the schema and restores `scripts/db_dump.sql`). |
| `pnpm prisma:generate` | Regenerates the Prisma client from `prisma/schema.prisma`. Run after changing the schema. |
| `pnpm prisma:migrate` | Creates and applies a new migration from schema changes, and regenerates the client. |
| `pnpm lint` | Runs ESLint across the source and auto-fixes issues. |
| `pnpm test` | Runs the tests (`src/**/*.spec.ts`) with Jest, against the dev database. See `src/sms/sms-provider.spec.ts` for an example. |
| `pnpm format` | Reformats the source with Prettier. |
| `pnpm interviews:sample` | Creates a few interviews, relative to now, through `POST /v1/interviews`. The app must be running. |

## Database connection

Postgres is available at:

```
postgresql://postgres:postgres@postgres/postgres?sslmode=disable
```

This is already set as `DATABASE_URL` in `.env`. The `postgres` host resolves to
localhost inside the container. To open a `psql` shell:

```bash
psql "postgresql://postgres:postgres@postgres/postgres?sslmode=disable"
```

The schema is in `prisma/schema.prisma`.

## App layout

| Folder | Purpose | Key contents |
|---|---|---|
| `src/prisma/` | Database access layer. | `prisma.service.ts`, `prisma.module.ts` |
| `src/candidates/` | Candidate-facing endpoints: `POST /v1/interviews` creates an interview; `POST /v1/events` receives opt-out events. | `candidates.service.ts`, `.controller.ts`, `.module.ts`, `dto/` |
| `src/sms/` | The SMS provider (`send`, `getStatus`). | `sms-provider.ts`, `sms.module.ts`, `sms-provider.spec.ts` |
| `src/remote-ats/` | Stands in for the external ATS ("the `remoteAtsService`"). Read accessors (`getCandidates`, `getJobs`, `getApplications`, with filters like `createdAfter`) plus write endpoints (`PATCH /v1/remote-ats/candidates/:id` and `/applications/:id`). | `remote-ats.service.ts`, `.controller.ts`, `.module.ts`, `dto/` |
| `src/sync/` | Syncs ATS data into local tables. `POST /v1/sync`. | `sync.service.ts`, `.controller.ts`, `.module.ts` |
| `scripts/` | Database seed and dump, environment check, sample interviews. | `db_dump.sql`, `seed_db`, `verify.py`, `create_sample_interviews.ts` |
