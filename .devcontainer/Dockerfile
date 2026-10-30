# syntax=docker/dockerfile:1

# Base image: Node.js 24 LTS (bookworm)
FROM node:24-bookworm

# System dependencies: git, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI is installed for `docker compose` commands (uses host socket).
COPY --from=docker:27-bookworm /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker:27-bookworm /usr/local/bin/docker-compose /usr/local/bin/docker-compose

# Install pnpm globally.
RUN npm install -g pnpm@latest

# pnpm workspace configuration.
ENV PNPM_HOME="/usr/local/bin" \
    YARN_HOME="/usr/local/bin" \
    PATH="$PNPM_HOME:$YARN_HOME:$PATH"

# Workspace root.
WORKDIR /workspace
