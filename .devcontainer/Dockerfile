FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# The lifecycle scripts use sudo (to start the Postgres cluster and edit
# /etc/hosts). The node user has no password set, so guarantee passwordless
# sudo — otherwise post-create.sh stalls on a "[sudo] password for node:" prompt.
RUN echo 'node ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/99-node-nopasswd \
    && chmod 0440 /etc/sudoers.d/99-node-nopasswd

# Install PostgreSQL 16 (server + client) from the PGDG apt repo so the
# database runs inside the same image as the Node app. The base image already
# provides the "node" user, git, sudo and corepack, so nothing else is needed.
RUN install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
       https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16 postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/lib/postgresql/16/bin:${PATH}"

# The project is pnpm-based (see README + scripts). Activate it via corepack.
RUN corepack enable && corepack prepare pnpm@latest --activate
