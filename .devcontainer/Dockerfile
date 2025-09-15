# Base image with Node.js 20 and TypeScript toolchain
FROM mcr.microsoft.com/devcontainers/typescript-node:20

RUN apt-get update || true && \
    apt-get install -y --no-install-recommends wget gnupg lsb-release && \
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client-16 && \
    update-alternatives --install /usr/bin/psql psql /usr/lib/postgresql/16/bin/psql 160 && \
    update-alternatives --install /usr/bin/pg_dump pg_dump /usr/lib/postgresql/16/bin/pg_dump 160 && \
    update-alternatives --install /usr/bin/pg_restore pg_restore /usr/lib/postgresql/16/bin/pg_restore 160 && \
    update-alternatives --install /usr/bin/pg_basebackup pg_basebackup /usr/lib/postgresql/16/bin/pg_basebackup 160 && \
    rm -rf /var/lib/apt/lists/*
