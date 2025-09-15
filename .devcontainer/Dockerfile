# Base image with Node.js 20 and TypeScript toolchain
FROM mcr.microsoft.com/devcontainers/typescript-node:20

RUN apt-get update || true && \
    apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*
