FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 (via NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL 16 (via PGDG repo for a specific version)
RUN install -d /usr/share/postgresql-common/pgdg \
    && curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
       https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y postgresql-16 \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/lib/postgresql/16/bin:${PATH}"

# Start postgres and keep container running (adjust to your needs)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# # Base image with Node.js 20 and TypeScript toolchain
# FROM mcr.microsoft.com/devcontainers/typescript-node:20

# RUN apt-get update || true && \
#     apt-get install -y --no-install-recommends wget gnupg lsb-release && \
#     echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
#       > /etc/apt/sources.list.d/pgdg.list && \
#     wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
#     apt-get update && \
#     apt-get install -y --no-install-recommends postgresql-client-16 && \
#     update-alternatives --install /usr/bin/psql psql /usr/lib/postgresql/16/bin/psql 160 && \
#     update-alternatives --install /usr/bin/pg_dump pg_dump /usr/lib/postgresql/16/bin/pg_dump 160 && \
#     update-alternatives --install /usr/bin/pg_restore pg_restore /usr/lib/postgresql/16/bin/pg_restore 160 && \
#     update-alternatives --install /usr/bin/pg_basebackup pg_basebackup /usr/lib/postgresql/16/bin/pg_basebackup 160 && \
#     rm -rf /var/lib/apt/lists/*

