# Achilles Practical Interview

The challenge:

Build ATS syncing

At AchillesHR, we pull in candidates and applications from our clients ATS's to interract with those candidates.

Requirements:

- Jobs will be configured to sync applications from the ats when they have a remoteId populated
- When a job has a remote ID, we should pull applications from the remote ats service and put them into our database
- The sync should pull candidates and applications from the `remoteAtsService` and put the in our database
- If a candidate is already in our database, we should update the candidate with whatever information is in the ats, otherwise we should create the candidate
- We should only pull in candidates and applications that are relevant to jobs we have configured
- sync should be idempotent (we can run the sync many times and it will always be correct after each run)
- We should only pull in applications from after a job was created. For example, if a job was created on 1/1/25, we should only look at applications after that date.

## Issues we've noticed

- We're seeing a lot of duplicate candidates. For some reason we're seeing the same candidate show up many times in the database
- Apart from the duplicates, we're seeing a lot more candidates than we would expect. For example, the candidate Darrin Becker does not have any applications to jobs we have configured but they still exist in our database as a candidate.

## Product improvements we'd like to make

- Right now, we pull in all candidates and applications on every sync. We'd like to do incremental syncs so we only look at changes that have happened since our last sync.

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

# Commands

| Command | What it does |
|---|---|
| `pnpm start` | Boots the NestJS app in watch mode (auto-restarts on changes). API at `:8080/v1`, Swagger at [http://localhost:8080/api](http://localhost:8080/api). |
| `pnpm build` | Compiles TypeScript to `dist/` (production build). |
| `pnpm verify` | Health-checks the environment: tooling, dependencies, Prisma client, and that the database is running and seeded. Starts Postgres if it isn't already. |
| `pnpm pg:seed` | Resets the database to the starting state (wipes the schema and restores `scripts/db_dump.sql`). |
| `pnpm prisma:generate` | Regenerates the Prisma client from `prisma/schema.prisma`. Run after changing the schema. |
| `pnpm prisma:migrate` | Creates and applies a new migration from schema changes, and regenerates the client. |
| `pnpm lint` | Runs ESLint across the source and auto-fixes issues. |
| `pnpm format` | Reformats the source with Prettier. |

**Database connection**

Postgres is available at:

```
postgresql://postgres:postgres@postgres/postgres?sslmode=disable
```

This is already set as `DATABASE_URL` in `.env`. The `postgres` host resolves to
localhost inside the container. To open a `psql` shell:

```bash
psql "postgresql://postgres:postgres@postgres/postgres?sslmode=disable"
```

**Call an endpoint**

With the server running (`pnpm start`), trigger a sync:

```bash
curl -X POST http://localhost:8080/v1/sync
```

# App layout

| Folder | Purpose | Key contents |
|---|---|---|
| `src/prisma/` | Database access layer. | `prisma.service.ts`, `prisma.module.ts` |
| `src/remote-ats/` | Stands in for the external ATS the challenge is about ("the `remoteAtsService`"). Read accessors (`getCandidates`, `getJobs`, `getApplications`, with filters like `createdAfter`) plus write endpoints (`PATCH /v1/remote-ats/candidates/:id` and `/applications/:id`). | `remote-ats.service.ts`, `.controller.ts`, `.module.ts`, `dto/` |
| `src/sync/` | The core challenge, syncs data into local tables. `POST /v1/sync`. | `sync.service.ts`, `.controller.ts`, `.module.ts` |
